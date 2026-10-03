<?php

namespace App\Services;

use App\Models\DieuKhoan;
use App\Models\HoiThoai;
use App\Models\NguoiDung;
use App\Models\TinNhan;
use App\Models\TrichDan;
use App\Models\VanBan;
use App\Support\PasswordSession;
use App\Support\SafeLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LocalAnswer
{
    /**
     * Guest identity is the browser session itself: no account row, no PII. The session keeps
     * the ids of the threads this browser created so a guest can continue its own thread but
     * never open someone else's (see owned()/replay()).
     */
    private const SESSION_KEY = 'guest_chat_threads';

    private const SESSION_CAP = 20;

    public function __construct(private LocalRetriever $retriever, private KnowledgeAdmin $knowledge) {}

    private function snapshot(): array
    {
        $doc = VanBan::where('so_hieu', PublicKnowledgeSearch::LAW_NUMBER)->where('trang_thai', 'published')->first();
        abort_unless($doc, 409, 'Kho luật chưa có văn bản được công bố. Bạn thử lại sau nhé.');
        $query = DieuKhoan::where('ma_van_ban', $doc->getKey());
        abort_if((clone $query)->count() > 5000 || (int) (clone $query)->selectRaw('SUM(LENGTH(noi_dung)) AS bytes')->value('bytes') > 6*1024*1024, 503);
        $rows = $query->orderBy('thu_tu')->orderBy('ma_dieu_khoan')->get();
        abort_if($rows->isEmpty(), 409, 'Kho luật chưa có nội dung để trả lời.');
        $chunks = $rows->map(fn ($r) => ['id'=>(string) $r->getKey(), 'title'=>$r->tieu_de, 'text'=>$r->noi_dung,
            'article'=>(string) $r->so_dieu, 'clause'=>(string) $r->so_khoan, 'point'=>(string) $r->ky_hieu_diem])->all();
        return ['doc'=>$doc, 'rows'=>$rows->keyBy('ma_dieu_khoan'), 'chunks'=>$chunks,
            'digest'=>hash('sha256', json_encode([$doc->toArray(), $chunks], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE))];
    }

    /** The caller: a signed-in account, or an anonymous visitor bound to this browser session. */
    private function actor(Request $request): ?NguoiDung
    {
        $user = $request->user();

        return $user instanceof NguoiDung ? $user : null;
    }

    /** Thread ids this guest session created, newest first. Empty for signed-in accounts. */
    private function guestThreadIds(Request $request): array
    {
        if ($this->actor($request) !== null) {
            return [];
        }
        $grant = $request->session()->get(self::SESSION_KEY, []);
        if (!is_array($grant) || !is_array($grant['ids'] ?? null)
            || count($grant['ids']) > self::SESSION_CAP || !is_string($grant['mac'] ?? null)) {
            return [];
        }
        $ids = $grant['ids'];
        foreach ($ids as $id) {
            if (!is_string($id) || !preg_match('/^[1-9][0-9]{0,17}$/D', $id)) return [];
        }
        return hash_equals($this->guestSignature($request, $ids), $grant['mac']) ? array_values($ids) : [];
    }

    private function guestSignature(Request $request, array $ids): string
    {
        return hash_hmac('sha256', json_encode(['guest-threads-v1', $request->session()->getId(), $ids], JSON_THROW_ON_ERROR), (string) config('app.key'));
    }

    private function rememberGuestThread(Request $request, int $id): void
    {
        if ($this->actor($request) !== null) {
            return;
        }
        $ids = array_values(array_diff($this->guestThreadIds($request), [(string) $id]));
        array_unshift($ids, (string) $id);
        // Keep only the most recent threads; older ones degrade to a 404 on continue.
        $ids = array_slice($ids, 0, self::SESSION_CAP);
        $request->session()->put(self::SESSION_KEY, ['ids' => $ids, 'mac' => $this->guestSignature($request, $ids)]);
    }

    /** A guest may only open a thread with no owner that this very session created. */
    private function owned(Request $request, string $id)
    {
        $user = $this->actor($request);
        $query = $user !== null
            ? HoiThoai::where('ma_nguoi_dung', $user->getKey())
            : HoiThoai::whereNull('ma_nguoi_dung')->whereIn('ma_hoi_thoai', $this->guestThreadIds($request));

        return $query->whereKey($id)->firstOrFail();
    }

    /** Composed summary + citation from the approved snapshot row; never invents legal text. */
    private function composeAnswer(DieuKhoan $row): string
    {
        $label = 'Điều '.$row->so_dieu
            .($row->so_khoan !== '' ? ' khoản '.$row->so_khoan : '')
            .($row->ky_hieu_diem !== '' ? ' điểm '.$row->ky_hieu_diem : '');
        $title = $row->tieu_de !== '' ? ' ('.$row->tieu_de.')' : '';
        // One plain-text block: the chat bubble renders the string directly (no pre-line).
        $excerpt = Str::limit((string) preg_replace('/\s+/u', ' ', trim((string) $row->noi_dung)), 220, '…');
        return "Theo Luật 116/2025/QH15, nội dung bạn hỏi được quy định tại {$label}{$title}: "
            ."“{$excerpt}” — Các căn cứ nguyên văn được liệt kê bên dưới. Bạn cần đọc cả điều kiện, "
            ."ngoại lệ và văn bản được dẫn chiếu trước khi áp dụng.";
    }

    private function result(Request $request, int $threadId, int $messageId): array
    {
        $this->owned($request, (string) $threadId);
        $message = TinNhan::where('ma_hoi_thoai', $threadId)->whereKey($messageId)->firstOrFail();
        $citations = TrichDan::where('ma_tin_nhan', $messageId)->orderBy('thu_tu_trich_dan')->get();
        return ['conversation_id'=>(string) $threadId, 'message_id'=>(string) $messageId,
            'status'=>$message->trang_thai_tra_loi, 'answer'=>$message->noi_dung, 'engine'=>'local-extractive-v1',
            'citations'=>$citations->map(fn ($c)=>[
                'id'=>(string) $c->getKey(), 'law'=>$c->so_hieu, 'article'=>$c->so_dieu, 'clause'=>$c->so_khoan,
                'point'=>$c->ky_hieu_diem, 'text'=>$c->noi_dung_trich_dan, 'version'=>(int) $c->phien_ban_noi_dung,
                'page'=>$c->trang_nguon, 'source'=>(string) $c->lien_ket_nguon,
            ])->all()];
    }

    private function replay(Request $request, array $input, string $digest): ?array
    {
        $user = $this->actor($request);
        // Explicit whereNull for guests: never rely on the implicit where($col, null) behaviour.
        $event = $user !== null
            ? DB::table('nhat_ky_quan_tri')->where('hanh_dong', 'ai.answer.completed')
                ->where('ma_nguoi_thuc_hien', $user->getKey())->where('ma_yeu_cau', $input['request_id'])->first()
            : DB::table('nhat_ky_quan_tri')->where('hanh_dong', 'ai.answer.completed')
                ->whereNull('ma_nguoi_thuc_hien')->whereIn('ma_doi_tuong', $this->guestThreadIds($request))
                ->where('ma_yeu_cau', $input['request_id'])->first();
        if (!$event) return null;
        $metadata=json_decode($event->du_lieu_them,true,32,JSON_THROW_ON_ERROR);
        abort_unless(hash_equals($metadata['request_digest'],$digest),409,'Mã yêu cầu đã được dùng cho câu hỏi khác.');
        return $this->result($request,(int) $event->ma_doi_tuong,(int) $metadata['message_id']);
    }

    public function answer(Request $request): array
    {
        $input=$request->validate(['question'=>'required|string|min:3|max:1000','request_id'=>'required|uuid',
            'conversation_id'=>['nullable','string','regex:/^[1-9][0-9]{0,17}$/']]);
        $question=trim($input['question']);
        abort_if(mb_strlen($question)<3,422,'Bạn nhập câu hỏi cụ thể hơn nhé.');
        $digest=hash_hmac('sha256',json_encode([$question,$input['conversation_id']??null]),config('app.key'));
        $user=$this->actor($request);
        $actorId=$user?->getKey();
        // One in-flight job per account, and one per guest session; never queue unbounded model jobs.
        $lockKey = $user !== null
            ? 'ai-account:'.$user->getKey()
            : 'ai-guest:'.hash_hmac('sha256', (string) $request->session()->getId(), config('app.key'));
        $lock=Cache::lock($lockKey,30);
        abort_unless($lock->get(),429,'Bạn chờ câu trả lời hiện tại hoàn tất nhé.');
        $started = hrtime(true);
        $logContext = ['request_id' => $request->attributes->get('request_id'), 'actor_id' => $actorId, 'route' => 'ai.answer'];
        SafeLog::write('application', 'ai.answer.started', 'started', $logContext);
        try {
            $replay=$this->knowledge->serialized(fn ()=>$this->replay($request,$input,$digest));
            if($replay) {
                SafeLog::write('application', 'ai.answer.replayed', 'success', $logContext);
                return $replay;
            }
            if(!empty($input['conversation_id'])) $this->owned($request,$input['conversation_id']);
            $snapshot=$this->knowledge->serialized(fn ()=>$this->snapshot());
            $retrieved=$this->retriever->retrieve($question,$snapshot['chunks']);
            $ids=$retrieved['ids'];
            abort_unless(count(array_unique($ids))===count($ids),503);
            foreach($ids as $id) abort_unless($snapshot['rows']->has($id),503);
            $result=$this->knowledge->serialized(function () use ($request,$input,$digest,$snapshot,$retrieved,$ids,$question,$started,$user) {
                // Recheck after computation; never save citations from an old/draft revision.
                $fresh=$this->snapshot();
                abort_unless(hash_equals($snapshot['digest'],$fresh['digest']),409,'Văn bản vừa được cập nhật. Bạn gửi lại câu hỏi nhé.');
                // Guests have no account state to re-verify; accounts keep the full check.
                if($user!==null) {
                    $current=$user->fresh();
                    abort_unless($current && $current->trang_thai==='active' && $current->canUseAccount()
                        && hash_equals(PasswordSession::fingerprint($current),(string)$request->session()->get('auth_password_fingerprint')),401);
                }
                if($replay=$this->replay($request,$input,$digest)) return $replay;
                $thread=!empty($input['conversation_id']) ? $this->owned($request,$input['conversation_id'])
                    : HoiThoai::create(['ma_nguoi_dung'=>$user?->getKey(),'tieu_de'=>Str::limit($question,120)]);
                // Session writes only persist when the response completes normally: if the
                // transaction rolls back, no orphan thread id is left in the guest session.
                if($user===null) $this->rememberGuestThread($request,$thread->getKey());
                $text=$retrieved['status']==='no_basis'
                    ? 'Chưa đủ căn cứ trong nguyên bản Luật 116/2025/QH15 để trả lời câu hỏi này. Bạn nêu rõ vấn đề hoặc số điều/khoản; hệ thống không tự suy ra mức phạt hay tình trạng pháp luật hiện hành.'
                    : $this->composeAnswer($snapshot['rows']->get($ids[0]));
                $elapsed=(int) ((hrtime(true) - $started) / 1_000_000);
                TinNhan::create(['ma_hoi_thoai'=>$thread->getKey(),'nguoi_gui'=>'user','noi_dung'=>$question]);
                $message=TinNhan::create(['ma_hoi_thoai'=>$thread->getKey(),'nguoi_gui'=>'assistant','noi_dung'=>$text,
                    'trang_thai_tra_loi'=>$retrieved['status'],
                    'do_tin_cay'=>$retrieved['status']==='answered' ? (float) ($retrieved['confidence'] ?? 0) : null,
                    'thoi_gian_xu_ly_ms'=>$elapsed]);
                $doc=$snapshot['doc'];
                $source=(string)$doc->lien_ket_nguon;
                if(!preg_match('~^https?://~i',$source)||!filter_var($source,FILTER_VALIDATE_URL)) $source='';
                foreach($ids as $order=>$id) {
                    $row=$snapshot['rows']->get($id);
                    TrichDan::create(['ma_tin_nhan'=>$message->getKey(),'ma_dieu_khoan'=>$row->getKey(),'thu_tu_trich_dan'=>$order+1,
                        'so_hieu'=>$doc->so_hieu,'tieu_de_van_ban'=>$doc->tieu_de,'phien_ban_noi_dung'=>$doc->phien_ban_noi_dung,
                        'so_dieu'=>$row->so_dieu,'so_khoan'=>$row->so_khoan,'ky_hieu_diem'=>$row->ky_hieu_diem,
                        'noi_dung_trich_dan'=>$row->noi_dung,'lien_ket_nguon'=>$source,'trang_nguon'=>$row->trang_nguon]);
                }
                $thread->touch();
                // Durable request deduplication + audit, same transaction as the answer.
                DB::table('nhat_ky_quan_tri')->insert(['ma_nguoi_thuc_hien'=>$user?->getKey(),'hanh_dong'=>'ai.answer.completed',
                    'loai_doi_tuong'=>'hoi_thoai','ma_doi_tuong'=>$thread->getKey(),'ma_yeu_cau'=>$input['request_id'],
                    'du_lieu_them'=>json_encode(['request_digest'=>$digest,'message_id'=>$message->getKey()]),'ngay_tao'=>now()]);
                return $this->result($request,$thread->getKey(),$message->getKey());
            });
            SafeLog::write('application','ai.answer.completed','success',['request_id'=>$request->attributes->get('request_id'),
                'actor_id'=>$actorId,'route'=>'ai.answer', 'duration_ms' => (int) ((hrtime(true) - $started) / 1000000)]);
            return $result;
        } catch (\Throwable $error) {
            SafeLog::write('application', 'ai.answer.failed', 'failure', [...$logContext,
                'status' => $error instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface ? $error->getStatusCode() : 500,
                'duration_ms' => (int) ((hrtime(true) - $started) / 1000000)]);
            throw $error;
        } finally { $lock->release(); }
    }
}
