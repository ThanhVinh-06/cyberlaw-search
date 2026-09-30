import type { NguoiDung, VaiTro, TrangThai } from './admin-data';

export type AdminUser = NguoiDung & {revision: string; ngay_xac_minh_email: string | null; duoc_mien_xac_minh_email: boolean};
export type UserForm = {ho_ten: string; thu_dien_tu: string; mat_khau: string; vai_tro: VaiTro; trang_thai: TrangThai};
export type UserPage = {users: AdminUser[]; total: number; page: number; stats: {total: number; adminCount: number; activeCount: number; blockedCount: number}};
export class AdminUserError extends Error {
  constructor(public status: number, message: string, public fields: Record<string, string> = {}) {super(message);}
}
async function request(path: string, init: RequestInit = {}) {
  let response: Response;
  try {
    response = await fetch(path, {...init, credentials: 'same-origin', cache: 'no-store', headers: {Accept: 'application/json', ...init.headers}, signal: AbortSignal.timeout(15000)});
  } catch {
    throw new AdminUserError(0, 'Chưa xác định được kết quả do mất kết nối. Bạn tải lại danh sách trước khi gửi lại thao tác nhé.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new AdminUserError(response.status, data?.message || 'Không thể kết nối dịch vụ quản trị.', Object.fromEntries(Object.entries(data?.errors ?? {}).map(([key, value]) => [key, Array.isArray(value) ? String(value[0]) : String(value)])));
  return data;
}
async function mutate(path: string, method: string, data: unknown) {
  const csrf = await request('/api/auth/csrf');
  if (typeof csrf.csrf_token !== 'string') throw new AdminUserError(419, 'Phiên bảo vệ không hợp lệ. Bạn tải lại nhé.');
  return request(`/api/admin/users${path}`, {method, headers: {'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf.csrf_token}, body: JSON.stringify(data)});
}
export const adminUsersApi = {
  list: (q: string, role: string, status: string, page: number): Promise<UserPage> => {
    const params = new URLSearchParams({q, page: String(page)});
    if (role !== 'all') params.set('role', role);
    if (status !== 'all') params.set('status', status);
    return request(`/api/admin/users?${params}`);
  },
  save: (form: UserForm, user?: AdminUser) => mutate(user ? `/${user.ma_nguoi_dung}` : '', 'POST', {...form, mat_khau: form.mat_khau || null, ...(user ? {revision: user.revision} : {})}),
  status: (user: AdminUser) => mutate(`/${user.ma_nguoi_dung}/status`, 'POST', {revision: user.revision, trang_thai: user.trang_thai === 'active' ? 'blocked' : 'active'}),
  remove: (user: AdminUser) => mutate(`/${user.ma_nguoi_dung}`, 'DELETE', {revision: user.revision}),
};
