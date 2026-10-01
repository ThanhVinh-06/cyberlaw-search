import { article, type PublicArticle } from './public-search-api';

export type Term = { id: string; cum_tu: string; bien_the: string[]; dinh_nghia: string; article: PublicArticle };
export async function fetchTerms(q: string, page: number, signal: AbortSignal): Promise<{items:Term[]; total:number; page:number}> {
  const response = await fetch(`/api/terms?${new URLSearchParams({q,page:String(page)})}`, {
    credentials:'same-origin', cache:'no-store', headers:{Accept:'application/json'},
    signal:AbortSignal.any([signal,AbortSignal.timeout(15000)]),
  });
  if (!response.ok) throw new Error(response.status===429 ? 'Bạn thao tác quá nhanh. Vui lòng chờ một phút rồi thử lại.' : 'Không thể tải thuật ngữ. Bạn thử lại nhé.');
  const data = await response.json();
  if (!Array.isArray(data?.items) || !Number.isInteger(data.total) || !Number.isInteger(data.page)) throw new Error('Dữ liệu thuật ngữ không hợp lệ.');
  return {...data,items:data.items.map((row:Term) => {
    if (!row || typeof row.id!=='string' || typeof row.cum_tu!=='string' || typeof row.dinh_nghia!=='string' || !Array.isArray(row.bien_the) || !row.bien_the.every(v=>typeof v==='string')) throw new Error('Dữ liệu thuật ngữ không hợp lệ.');
    return {...row,article:article(row.article)};
  })};
}
