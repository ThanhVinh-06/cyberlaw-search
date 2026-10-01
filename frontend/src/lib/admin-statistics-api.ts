import type { CauHoiGanDay, DuLieuThang, NguoiDungNoiBat, NhomQuyDinhSparkline, ThongKeTongQuan, TyLeTrichDanPhapLy } from './admin-data';

export type AdminStatistics = { period: 'year'|'6m'|'30d'; range: string; year: number; search_available: boolean; overview: ThongKeTongQuan; months: DuLieuThang[]; regulations: NhomQuyDinhSparkline[]; recent_questions: CauHoiGanDay[]; top_users: NguoiDungNoiBat[]; citation_rates: TyLeTrichDanPhapLy[] };
export async function loadAdminStatistics(period: 'year'|'6m'|'30d', signal?: AbortSignal): Promise<AdminStatistics> {
  const response = await fetch(`/api/admin/statistics?period=${period}`, { credentials: 'same-origin', cache: 'no-store', signal });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.overview) throw new Error(data?.message || 'Không thể tải báo cáo thống kê.');
  return data as AdminStatistics;
}
