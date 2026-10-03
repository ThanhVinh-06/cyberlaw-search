<?php

namespace Tests\Feature;

use App\Models\NguoiDung;
use App\Support\PasswordSession;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\Support\KnowledgeSchema;
use Tests\TestCase;

final class AdminStatisticsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp(); KnowledgeSchema::create();
        Schema::create('hoi_thoai', function (Blueprint $t) { $t->id('ma_hoi_thoai'); $t->foreignId('ma_nguoi_dung')->nullable()->constrained('nguoi_dung', 'ma_nguoi_dung'); $t->string('tieu_de'); $t->dateTime('ngay_tao'); $t->dateTime('ngay_cap_nhat'); });
        Schema::create('tin_nhan', function (Blueprint $t) { $t->id('ma_tin_nhan'); $t->foreignId('ma_hoi_thoai')->constrained('hoi_thoai', 'ma_hoi_thoai'); $t->string('nguoi_gui'); $t->text('noi_dung'); $t->string('trang_thai_tra_loi')->nullable(); $t->decimal('do_tin_cay', 5, 2)->nullable(); $t->unsignedInteger('thoi_gian_xu_ly_ms')->nullable(); $t->dateTime('ngay_tao'); $t->dateTime('ngay_cap_nhat'); });
        Schema::create('trich_dan', function (Blueprint $t) { $t->id('ma_trich_dan'); $t->foreignId('ma_tin_nhan')->constrained('tin_nhan', 'ma_tin_nhan'); $t->unsignedBigInteger('ma_dieu_khoan')->nullable(); $t->unsignedSmallInteger('thu_tu_trich_dan'); $t->string('so_hieu'); $t->string('tieu_de_van_ban'); $t->unsignedInteger('phien_ban_noi_dung'); $t->string('so_dieu'); $t->string('so_khoan')->default(''); $t->string('ky_hieu_diem')->default(''); $t->text('noi_dung_trich_dan'); $t->string('lien_ket_nguon')->nullable(); $t->unsignedSmallInteger('trang_nguon')->nullable(); $t->dateTime('ngay_tao'); });
        $now = now(); $admin = new NguoiDung(['ho_ten' => 'Admin', 'thu_dien_tu' => 'stats@example.test', 'mat_khau' => 'Password!123']); $admin->vai_tro = 'admin'; $admin->trang_thai = 'active'; $admin->duoc_mien_xac_minh_email = true; $admin->save(); $this->actingAs($admin)->withSession(['auth_password_fingerprint' => PasswordSession::fingerprint($admin)]);
        DB::table('van_ban')->insert(['so_hieu' => '116/2025/QH15', 'tieu_de' => 'Luat', 'trang_thai' => 'published', 'phien_ban_noi_dung' => 1, 'ngay_tao' => $now, 'ngay_cap_nhat' => $now]);
        DB::table('van_ban')->insert(['so_hieu' => '116/2025/QH15-DRAFT', 'tieu_de' => 'Ban nhap', 'trang_thai' => 'draft', 'phien_ban_noi_dung' => 1, 'ngay_tao' => $now, 'ngay_cap_nhat' => $now]);
        DB::table('dieu_khoan')->insert(['ma_van_ban' => 1, 'so_dieu' => '2', 'so_khoan' => '1', 'noi_dung' => 'Noi dung', 'thu_tu' => 1, 'ngay_tao' => $now, 'ngay_cap_nhat' => $now]);
        DB::table('dieu_khoan')->insert(['ma_van_ban' => 2, 'so_dieu' => '99', 'so_khoan' => '1', 'noi_dung' => 'Ban nhap', 'thu_tu' => 1, 'ngay_tao' => $now, 'ngay_cap_nhat' => $now]);
        DB::table('quy_dinh')->insert(['ma_dieu_khoan' => 1, 'loai_quy_dinh' => 'right', 'hanh_vi' => 'Hanh vi', 'trich_nguyen_van' => 'Noi dung', 'ngay_tao' => $now, 'ngay_cap_nhat' => $now]);
        DB::table('quy_dinh')->insert(['ma_dieu_khoan' => 2, 'loai_quy_dinh' => 'prohibition', 'hanh_vi' => 'Ban nhap', 'trich_nguyen_van' => 'Ban nhap', 'ngay_tao' => $now, 'ngay_cap_nhat' => $now]);
        $thread = DB::table('hoi_thoai')->insertGetId(['ma_nguoi_dung' => $admin->getKey(), 'tieu_de' => 'Hoi', 'ngay_tao' => $now, 'ngay_cap_nhat' => $now]);
        DB::table('tin_nhan')->insert(['ma_hoi_thoai' => $thread, 'nguoi_gui' => 'user', 'noi_dung' => 'Cau hoi', 'ngay_tao' => $now, 'ngay_cap_nhat' => $now]);
        $message = DB::table('tin_nhan')->insertGetId(['ma_hoi_thoai' => $thread, 'nguoi_gui' => 'assistant', 'noi_dung' => 'Tra loi', 'trang_thai_tra_loi' => 'answered', 'do_tin_cay' => 95, 'thoi_gian_xu_ly_ms' => 740, 'ngay_tao' => $now, 'ngay_cap_nhat' => $now]);
        DB::table('trich_dan')->insert(['ma_tin_nhan' => $message, 'thu_tu_trich_dan' => 1, 'so_hieu' => '116/2025/QH15', 'tieu_de_van_ban' => 'Luat', 'phien_ban_noi_dung' => 1, 'so_dieu' => '2', 'noi_dung_trich_dan' => 'Noi dung', 'ngay_tao' => $now]);
    }

    public function test_admin_receives_database_backed_statistics(): void
    {
        $response = $this->getJson('/api/admin/statistics')->assertOk()
            ->assertJsonPath('overview.tong_van_ban', 1)
            ->assertJsonPath('overview.tong_dieu_khoan', 1)
            ->assertJsonPath('overview.tong_quy_dinh', 1)
            ->assertJsonPath('overview.tong_cuoc_hoi_dap', 1)
            ->assertJsonFragment(['ma_loai' => 'right'])
            ->assertJsonPath('recent_questions.0.cau_hoi', 'Cau hoi');
        $this->assertGreaterThanOrEqual(1, $response->json('overview.so_bang'));
    }

    public function test_recent_questions_expose_stored_confidence_and_duration(): void
    {
        $this->getJson('/api/admin/statistics')->assertOk()
            ->assertJsonPath('recent_questions.0.do_tin_cay', '95%')
            ->assertJsonPath('recent_questions.0.thoi_gian_xu_ly', '0.74s')
            ->assertJsonPath('recent_questions.0.confidence_note', 'Điểm bằng chứng truy hồi, không phải độ chính xác pháp lý');
    }

    public function test_missing_confidence_and_duration_show_placeholders(): void
    {
        $now = now();
        $thread = DB::table('hoi_thoai')->insertGetId(['ma_nguoi_dung' => auth()->user()->getKey(), 'tieu_de' => 'Hoi 2', 'ngay_tao' => $now, 'ngay_cap_nhat' => $now]);
        DB::table('tin_nhan')->insert(['ma_hoi_thoai' => $thread, 'nguoi_gui' => 'user', 'noi_dung' => 'Cau hoi 2', 'ngay_tao' => $now, 'ngay_cap_nhat' => $now]);
        DB::table('tin_nhan')->insert(['ma_hoi_thoai' => $thread, 'nguoi_gui' => 'assistant', 'noi_dung' => 'Chua du can cu', 'trang_thai_tra_loi' => 'no_basis', 'do_tin_cay' => null, 'thoi_gian_xu_ly_ms' => null, 'ngay_tao' => $now, 'ngay_cap_nhat' => $now]);
        $this->getJson('/api/admin/statistics')->assertOk()
            ->assertJsonPath('recent_questions.0.do_tin_cay', 'Chưa đánh giá')
            ->assertJsonPath('recent_questions.0.thoi_gian_xu_ly', 'Chưa ghi nhận');
    }

    public function test_guest_conversations_appear_with_guest_label(): void
    {
        $now = now();
        $thread = DB::table('hoi_thoai')->insertGetId(['ma_nguoi_dung' => null, 'tieu_de' => 'Khach hoi', 'ngay_tao' => $now, 'ngay_cap_nhat' => $now]);
        DB::table('tin_nhan')->insert(['ma_hoi_thoai' => $thread, 'nguoi_gui' => 'user', 'noi_dung' => 'Cau hoi cua khach', 'ngay_tao' => $now, 'ngay_cap_nhat' => $now]);
        $message = DB::table('tin_nhan')->insertGetId(['ma_hoi_thoai' => $thread, 'nguoi_gui' => 'assistant', 'noi_dung' => 'Tra loi cho khach', 'trang_thai_tra_loi' => 'answered', 'do_tin_cay' => 88, 'thoi_gian_xu_ly_ms' => 500, 'ngay_tao' => $now, 'ngay_cap_nhat' => $now]);
        DB::table('trich_dan')->insert(['ma_tin_nhan' => $message, 'thu_tu_trich_dan' => 1, 'so_hieu' => '116/2025/QH15', 'tieu_de_van_ban' => 'Luat', 'phien_ban_noi_dung' => 1, 'so_dieu' => '2', 'noi_dung_trich_dan' => 'Noi dung', 'ngay_tao' => $now]);

        $response = $this->getJson('/api/admin/statistics')->assertOk()
            ->assertJsonPath('recent_questions.0.nguoi_gui', 'Khách vãng lai')
            ->assertJsonPath('recent_questions.0.avatar', 'KV')
            ->assertJsonPath('recent_questions.0.vai_tro', 'Không đăng nhập')
            ->assertJsonPath('recent_questions.0.cau_hoi', 'Cau hoi cua khach')
            ->assertJsonPath('recent_questions.0.do_tin_cay', '88%');
        $this->assertGreaterThanOrEqual(1, $response->json('overview.hoi_dap_khach'));
        $this->assertSame('Khách vãng lai', collect($response->json('top_users'))->firstWhere('ma_nguoi_dung', 0)['ho_ten']);
        $this->assertSame('Không đăng nhập', collect($response->json('top_users'))->firstWhere('ma_nguoi_dung', 0)['vai_tro_nhan']);
        // Guests are not accounts: the account counter must not include them.
        $this->assertSame(1, $response->json('overview.tong_nguoi_dung'));
    }

    public function test_non_admin_cannot_read_statistics(): void
    {
        auth()->logout(); $this->getJson('/api/admin/statistics')->assertUnauthorized();
    }

    public function test_period_is_validated_and_draft_knowledge_is_excluded(): void
    {
        $year = $this->getJson('/api/admin/statistics?period=year')->assertOk();
        $year->assertJsonCount(6, 'months');
        $this->assertSame(['T01-02', 'T03-04', 'T05-06', 'T07-08', 'T09-10', 'T11-12'], array_column($year->json('months'), 'thang'));

        $sixMonths = $this->getJson('/api/admin/statistics?period=6m')->assertOk();
        $sixMonths->assertJsonCount(3, 'months');

        $thirtyDays = $this->getJson('/api/admin/statistics?period=30d')->assertOk()
            ->assertJsonPath('period', '30d')->assertJsonPath('overview.tong_van_ban', 1)
            ->assertJsonPath('overview.tong_dieu_khoan', 1)->assertJsonPath('overview.tong_quy_dinh', 1);
        $thirtyDays->assertJsonCount(4, 'months');
        $this->assertSame(['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'], array_column($thirtyDays->json('months'), 'thang'));

        $this->getJson('/api/admin/statistics?period=invalid')->assertStatus(422);
    }

    public function test_search_counts_come_from_the_hourly_counter(): void
    {
        $hour = \Carbon\CarbonImmutable::now('UTC')->startOfHour();
        DB::table('thong_ke_tra_cuu')->insert([
            ['gio' => $hour, 'so_luot' => 7, 'ngay_tao' => $hour, 'ngay_cap_nhat' => $hour],
            // Ngoài kỳ hiện tại: không được cộng vào tổng năm.
            ['gio' => $hour->subYears(5), 'so_luot' => 99, 'ngay_tao' => $hour, 'ngay_cap_nhat' => $hour],
        ]);
        $startMonth = intdiv($hour->month - 1, 2) * 2 + 1;
        $label = sprintf('T%02d-%02d', $startMonth, $startMonth + 1);

        $response = $this->getJson('/api/admin/statistics?period=year')->assertOk()
            ->assertJsonPath('search_available', true)
            ->assertJsonPath('overview.tong_tra_cuu', 7);
        $months = collect($response->json('months'));
        // Mọi kỳ đều trả số (không còn null "chưa thu thập").
        $this->assertTrue($months->every(fn ($m) => is_int($m['tra_cuu'])));
        // Chỉ kỳ chứa giờ hiện tại có lượt; các kỳ khác bằng 0.
        $this->assertSame(7, $months->firstWhere('thang', $label)['tra_cuu']);
        $this->assertSame(7, $months->sum(fn ($m) => $m['tra_cuu']));
    }
}
