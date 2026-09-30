import type { Page, BrowserContext } from '@playwright/test';
import { initialNguoiDungList, maTranPhanQuyen } from '../src/lib/admin-data';

// Synthetic UI fixtures. Real permissions and writes are covered by Laravel/HTTP tests.
export async function mockAdminUsers(target: Page | BrowserContext) {
  let users = initialNguoiDungList.map(user => ({...user, mat_khau: undefined, ma_ghi_nho: undefined, revision: '1'.repeat(64), ngay_xac_minh_email: null, duoc_mien_xac_minh_email: true}));
  await target.route('**/api/admin/users**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'GET') {
      const query = (url.searchParams.get('q') || '').toLowerCase();
      const role = url.searchParams.get('role');
      const status = url.searchParams.get('status');
      const filtered = users.filter(u => (!role || u.vai_tro === role) && (!status || u.trang_thai === status) && `${u.ho_ten} ${u.thu_dien_tu}`.toLowerCase().includes(query)).sort((a, b) => a.ma_nguoi_dung - b.ma_nguoi_dung);
      const page = Math.min(Number(url.searchParams.get('page') || 1), Math.max(1, Math.ceil(filtered.length / 10)));
      return route.fulfill({json: {users: filtered.slice((page-1)*10,page*10), total: filtered.length, page, stats: {total: users.length, adminCount: users.filter(u=>u.vai_tro==='admin').length, activeCount: users.filter(u=>u.trang_thai==='active').length, blockedCount: users.filter(u=>u.trang_thai==='blocked').length}}});
    }
    const id = Number(url.pathname.split('/')[4]);
    const body = request.postDataJSON();
    if (request.method() === 'DELETE') users = users.filter(u=>u.ma_nguoi_dung !== id);
    else if (id) users = users.map(u=>u.ma_nguoi_dung === id ? {...u,...body,mat_khau:undefined} : u);
    else users.unshift({...body, ma_nguoi_dung: Math.max(...users.map(u=>u.ma_nguoi_dung))+1, mat_khau:undefined, ngay_tao:'2026-09-30', ngay_cap_nhat:'2026-09-30', revision:'1'.repeat(64),duoc_mien_xac_minh_email:false,ngay_xac_minh_email:null});
    return route.fulfill({json: {message:'Đã lưu tài khoản.'}});
  });
  // Keep the shared admin dialog tests isolated from a running backend when
  // they switch to the knowledge tab after exercising account dialogs.
  await target.route('**/api/admin/knowledge**', async route => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'GET' && url.pathname.endsWith('/knowledge')) {
      return route.fulfill({json: {van_ban: [], dieu_khoan: [], tu_khoa: [], quy_dinh: [], dieu_khoan_tu_khoa: [], revision: '1'.repeat(64)}});
    }
    if (route.request().method() === 'GET') {
      return route.fulfill({json: {items: [], total: 0, page: 1, revision: '1'.repeat(64)}});
    }
    return route.fulfill({json: {van_ban: [], dieu_khoan: [], tu_khoa: [], quy_dinh: [], dieu_khoan_tu_khoa: [], revision: '1'.repeat(64)}});
  });
  await target.route('**/api/admin/permission-matrix**', async route => {
    return route.fulfill({json: {version: '2026-09-30', roles: ['khach', 'user', 'admin'], rules: maTranPhanQuyen}});
  });
}
