export type LibraryDocument = {
  so_hieu: string; tieu_de: string; co_quan_ban_hanh: string;
  ngay_ban_hanh: string | null; ngay_hieu_luc: string | null;
  phien_ban_noi_dung: number; source: string; pdf: boolean;
};
export type LibraryEntry = { so_dieu: string; chuong: string; tieu_de: string };
export type LibraryIndex = { document: LibraryDocument | null; articles: LibraryEntry[] };
export type LibraryArticle = {
  document: LibraryDocument; so_dieu: string; tieu_de: string;
  units: { id: string; so_khoan: string; ky_hieu_diem: string; noi_dung: string; trang_nguon: number | null }[];
};
export class LibraryError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const invalid = () => new LibraryError(502, "Dữ liệu thư viện không hợp lệ. Bạn thử tải lại nhé.");
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid();
  return value as Record<string, unknown>;
}
function text(row: Record<string, unknown>, key: string): string {
  if (typeof row[key] !== "string") throw invalid();
  return row[key];
}
function document(value: unknown): LibraryDocument {
  const row = object(value);
  for (const key of ['ngay_ban_hanh', 'ngay_hieu_luc']) {
    if (row[key] !== null && (typeof row[key] !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row[key]))) throw invalid();
  }
  if (typeof row.pdf !== 'boolean' || !Number.isInteger(row.phien_ban_noi_dung)) throw invalid();
  const source = text(row, 'source');
  return {
    so_hieu: text(row, 'so_hieu'), tieu_de: text(row, 'tieu_de'), co_quan_ban_hanh: text(row, 'co_quan_ban_hanh'),
    ngay_ban_hanh: row.ngay_ban_hanh as string | null, ngay_hieu_luc: row.ngay_hieu_luc as string | null,
    phien_ban_noi_dung: row.phien_ban_noi_dung as number, pdf: row.pdf,
    source: /^https?:\/\//i.test(source) ? source : '',
  };
}
async function read(path: string, signal: AbortSignal) {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store',
    headers: { Accept: 'application/json' }, signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
  if (!response.ok) throw new LibraryError(response.status, response.status === 404
    ? 'Nội dung không còn được công bố. Bạn tải lại mục lục nhé.'
    : response.status === 429 ? 'Bạn thao tác quá nhanh. Vui lòng chờ một phút rồi thử lại.'
    : 'Không thể tải thư viện. Bạn thử lại nhé.');
  return object(await response.json());
}
export const libraryApi = {
  async index(signal: AbortSignal): Promise<LibraryIndex> {
    const data = await read('/api/library', signal);
    if (!Array.isArray(data.articles)) throw invalid();
    return { document: data.document === null ? null : document(data.document), articles: data.articles.map(value => {
      const row = object(value);
      return { so_dieu: text(row, 'so_dieu'), chuong: text(row, 'chuong'), tieu_de: text(row, 'tieu_de') };
    }) };
  },
  async article(number: string, signal: AbortSignal): Promise<LibraryArticle> {
    const data = await read(`/api/library/articles/${encodeURIComponent(number)}`, signal);
    if (!Array.isArray(data.units) || data.so_dieu !== number) throw invalid();
    return { document: document(data.document), so_dieu: text(data, 'so_dieu'), tieu_de: text(data, 'tieu_de'),
      units: data.units.map(value => {
        const row = object(value);
        if (row.trang_nguon !== null && (typeof row.trang_nguon !== 'number' || !Number.isInteger(row.trang_nguon))) throw invalid();
        return { id: text(row, 'id'), so_khoan: text(row, 'so_khoan'), ky_hieu_diem: text(row, 'ky_hieu_diem'),
          noi_dung: text(row, 'noi_dung'), trang_nguon: row.trang_nguon as number | null };
      }),
    };
  },
};
