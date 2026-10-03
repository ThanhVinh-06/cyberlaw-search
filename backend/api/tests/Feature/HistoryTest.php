<?php

namespace Tests\Feature;

use App\Models\NguoiDung;
use App\Support\PasswordSession;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Tests\Support\AccountSchema;
use Tests\TestCase;

final class HistoryTest extends TestCase
{
    private NguoiDung $a;
    private NguoiDung $b;
    private int $aThread;
    private int $bThread;
    private int $guestThread;

    protected function setUp(): void
    {
        parent::setUp(); AccountSchema::create();
        $this->app->bind(ValidateCsrfToken::class, HistoryRealCsrf::class);
        foreach (['application','audit','security'] as $channel) config(['logging.channels.'.$channel => config('logging.channels.null')]);
        Schema::create('hoi_thoai', function (Blueprint $t) { $t->id('ma_hoi_thoai'); $t->unsignedBigInteger('ma_nguoi_dung')->nullable(); $t->string('tieu_de'); $t->dateTime('ngay_tao'); $t->dateTime('ngay_cap_nhat'); });
        Schema::create('tin_nhan', function (Blueprint $t) { $t->id('ma_tin_nhan'); $t->foreignId('ma_hoi_thoai')->constrained('hoi_thoai', 'ma_hoi_thoai')->cascadeOnDelete(); $t->string('nguoi_gui'); $t->text('noi_dung'); $t->string('trang_thai_tra_loi')->nullable(); $t->decimal('do_tin_cay',5,2)->nullable(); $t->integer('thoi_gian_xu_ly_ms')->nullable(); $t->dateTime('ngay_tao'); $t->dateTime('ngay_cap_nhat'); });
        Schema::create('trich_dan', function (Blueprint $t) { $t->id('ma_trich_dan'); $t->foreignId('ma_tin_nhan')->constrained('tin_nhan', 'ma_tin_nhan')->cascadeOnDelete(); $t->unsignedBigInteger('ma_dieu_khoan')->nullable(); $t->unsignedSmallInteger('thu_tu_trich_dan'); $t->string('so_hieu'); $t->string('tieu_de_van_ban'); $t->unsignedInteger('phien_ban_noi_dung'); $t->string('so_dieu'); $t->string('so_khoan')->default(''); $t->string('ky_hieu_diem')->default(''); $t->text('noi_dung_trich_dan'); $t->string('lien_ket_nguon')->nullable(); $t->unsignedSmallInteger('trang_nguon')->nullable(); $t->dateTime('ngay_tao'); });
        $this->a=$this->account('a'); $this->b=$this->account('b'); $now=now();
        $this->aThread=(int) DB::table('hoi_thoai')->insertGetId(['ma_nguoi_dung'=>$this->a->getKey(),'tieu_de'=>'Câu hỏi riêng A','ngay_tao'=>$now,'ngay_cap_nhat'=>$now]);
        $this->bThread=(int) DB::table('hoi_thoai')->insertGetId(['ma_nguoi_dung'=>$this->b->getKey(),'tieu_de'=>'Câu hỏi riêng B','ngay_tao'=>$now,'ngay_cap_nhat'=>$now]);
        // Guest conversations have no owner (ma_nguoi_dung IS NULL) and must never be listed back.
        $this->guestThread=(int) DB::table('hoi_thoai')->insertGetId(['ma_nguoi_dung'=>null,'tieu_de'=>'Câu hỏi của khách vãng lai','ngay_tao'=>$now,'ngay_cap_nhat'=>$now]);
        $message=(int) DB::table('tin_nhan')->insertGetId(['ma_hoi_thoai'=>$this->aThread,'nguoi_gui'=>'assistant','noi_dung'=>'<script>alert(1)</script> Căn cứ','trang_thai_tra_loi'=>'answered','ngay_tao'=>$now,'ngay_cap_nhat'=>$now]);
        DB::table('trich_dan')->insert(['ma_tin_nhan'=>$message,'thu_tu_trich_dan'=>1,'so_hieu'=>'116/2025/QH15','tieu_de_van_ban'=>'Luật thử','phien_ban_noi_dung'=>1,'so_dieu'=>'2','so_khoan'=>'1','ky_hieu_diem'=>'','noi_dung_trich_dan'=>'Nội dung căn cứ','lien_ket_nguon'=>'javascript:alert(1)','ngay_tao'=>$now]);
    }
    private function account(string $name): NguoiDung { $u=new NguoiDung(['ho_ten'=>$name,'thu_dien_tu'=>$name.'@example.test','mat_khau'=>'Password!123']);$u->vai_tro='user';$u->trang_thai='active';$u->save();$u->duoc_mien_xac_minh_email=true;$u->save();return $u; }
    private function login(NguoiDung $u): void { $this->actingAs($u)->withSession(['_token'=>'history-csrf','auth_password_fingerprint'=>PasswordSession::fingerprint($u)]); }
    public function test_owner_can_read_history_but_cannot_read_or_delete_another_users_thread(): void
    {
        $this->getJson('/api/history')->assertUnauthorized(); $this->login($this->a);
        $response=$this->getJson('/api/history')->assertOk()->assertJsonPath('items.0.title','Câu hỏi riêng A');
        $response->assertJsonMissing(['title'=>'Câu hỏi riêng B']);
        $response->assertJsonMissing(['title'=>'Câu hỏi của khách vãng lai']);
        $this->getJson('/api/history/'.$this->bThread)->assertNotFound();
        $this->deleteJson('/api/history/'.$this->bThread,[],['X-CSRF-TOKEN'=>'history-csrf'])->assertNotFound();
        $this->getJson('/api/history/'.$this->aThread)->assertOk()->assertJsonPath('messages.0.citations.0.source','');
        $this->assertDatabaseHas('hoi_thoai',['ma_hoi_thoai'=>$this->bThread]);
    }
    public function test_delete_requires_csrf_and_cascades_owned_thread(): void
    {
        $this->login($this->a); $this->deleteJson('/api/history/'.$this->aThread)->assertStatus(419);
        $this->deleteJson('/api/history/'.$this->aThread,[],['X-CSRF-TOKEN'=>'history-csrf'])->assertOk()->assertJsonPath('deleted',true);
        $this->assertDatabaseMissing('hoi_thoai',['ma_hoi_thoai'=>$this->aThread]);
        $this->assertDatabaseCount('tin_nhan', 0);
        $this->assertDatabaseCount('trich_dan', 0);
        $this->assertDatabaseHas('hoi_thoai',['ma_hoi_thoai'=>$this->bThread]);
    }
    public function test_admin_has_no_ownership_bypass_and_blocked_account_is_rejected(): void
    {
        $this->a->vai_tro='admin'; $this->a->save(); $this->login($this->a);
        $this->getJson('/api/history/'.$this->bThread)->assertNotFound();
        $this->deleteJson('/api/history/'.$this->bThread, [], ['X-CSRF-TOKEN'=>'history-csrf'])->assertNotFound();
        $this->assertDatabaseCount('hoi_thoai', 3);
        $this->a->trang_thai='blocked'; $this->a->save();
        $this->getJson('/api/history')->assertUnauthorized();
    }

    public function test_guest_cannot_read_or_delete_any_history(): void
    {
        // A guest is a browser session: no account, CSRF token only. Their conversations are
        // stored (see LocalAnswerTest) but the history endpoints must stay closed to them.
        auth()->logout();
        $this->flushSession();
        $this->withSession(['_token' => 'history-csrf']);
        $this->getJson('/api/history')->assertUnauthorized();
        $this->getJson('/api/history/'.$this->guestThread)->assertUnauthorized();
        $this->getJson('/api/history/'.$this->aThread)->assertUnauthorized();
        $this->deleteJson('/api/history/'.$this->guestThread, [], ['X-CSRF-TOKEN' => 'history-csrf'])->assertUnauthorized();
        $this->deleteJson('/api/history/'.$this->aThread, [], ['X-CSRF-TOKEN' => 'history-csrf'])->assertUnauthorized();
        // The stored guest conversation survives; a guest just has no way back to it.
        $this->assertDatabaseHas('hoi_thoai', ['ma_hoi_thoai' => $this->guestThread]);
        $this->assertDatabaseCount('hoi_thoai', 3);
    }

    public function test_input_origin_pagination_and_rate_limit(): void
    {
        $this->login($this->a);
        $this->getJson('/api/history?page=0')->assertUnprocessable();
        $this->getJson('/api/history/'.$this->aThread.'?page=10001')->assertUnprocessable();
        $this->getJson('/api/history/999999999999999999999')->assertNotFound();
        $this->deleteJson('/api/history/'.$this->aThread, [], ['Origin'=>'https://evil.test', 'X-CSRF-TOKEN'=>'history-csrf'])->assertForbidden();
        $this->assertDatabaseCount('hoi_thoai', 3);
        $this->getJson('/api/history/'.$this->aThread.'?page=2')->assertOk()->assertJsonPath('messages', [])->assertJsonPath('total', 1);
        for ($i=0; $i<57; $i++) $this->getJson('/api/history')->assertOk();
        $this->getJson('/api/history')->assertStatus(429);
    }

    public function test_logs_correlate_without_private_contents(): void
    {
        $file=storage_path('framework/testing/history-'.bin2hex(random_bytes(6)).'.log');
        foreach (['application','audit'] as $channel) {
            config(['logging.channels.'.$channel=>['driver'=>'single','path'=>$file]]);
            Log::forgetChannel($channel);
        }
        try {
            $this->login($this->a);
            $response=$this->getJson('/api/history/'.$this->aThread)->assertOk();
            $this->deleteJson('/api/history/'.$this->aThread,[],['X-CSRF-TOKEN'=>'history-csrf'])->assertOk();
            $log=file_get_contents($file);
            $this->assertStringContainsString('history.viewed',$log);
            $this->assertStringContainsString('history.deleted',$log);
            $this->assertStringContainsString($response->headers->get('X-Request-ID'),$log);
            foreach (['Câu hỏi riêng','alert(1)','Nội dung căn cứ','history-csrf'] as $private) $this->assertStringNotContainsString($private,$log);
        } finally {
            foreach (['application','audit'] as $channel) Log::forgetChannel($channel);
            if (is_file($file)) unlink($file);
        }
    }
}

final class HistoryRealCsrf extends ValidateCsrfToken
{
    protected function runningUnitTests() { return false; }
}
