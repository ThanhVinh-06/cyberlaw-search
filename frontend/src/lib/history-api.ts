export type HistoryItem = {id:string; title:string; updated_at:string|null};
export type Citation = {id:string; law:string; title:string; version:number; article:string; clause:string; point:string; text:string; source:string; page:number|null};
export type HistoryMessage = {id:string; role:'user'|'assistant'; text:string; status:string|null; created_at:string|null; citations:Citation[]};
export type HistoryPage = {items:HistoryItem[]; total:number; page:number; per_page:number};
export type HistoryDetail = {id:string; title:string; messages:HistoryMessage[]; total:number; page:number; per_page:number};
export class HistoryError extends Error {
  constructor(public status:number, message:string) {super(message);}
}
const invalid = () => new HistoryError(502,'Dữ liệu lịch sử không hợp lệ. Bạn tải lại nhé.');
function row(value:unknown):Record<string,unknown> {
  if (!value || typeof value!=='object' || Array.isArray(value)) throw invalid();
  return value as Record<string,unknown>;
}
function str(value:unknown):string {if(typeof value!=='string') throw invalid(); return value;}
function count(value:unknown):number {if(typeof value!=='number' || !Number.isSafeInteger(value) || value<0) throw invalid(); return value;}
function list(value:unknown):unknown[] {if(!Array.isArray(value)) throw invalid(); return value;}
function nullable(value:unknown) {return value===null ? null : str(value);}
function paging(data:Record<string,unknown>) {
  const total=count(data.total), page=count(data.page), per_page=count(data.per_page);
  if(!page || !per_page) throw invalid();
  return {total,page,per_page};
}
async function call(path:string, signal:AbortSignal, init:RequestInit={}) {
  let response:Response;
  try {response=await fetch(path,{...init,credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json',...init.headers},signal:AbortSignal.any([signal,AbortSignal.timeout(15000)])});}
  catch {throw new HistoryError(0,'Chưa xác định được kết quả do mất kết nối. Bạn tải lại lịch sử để kiểm tra nhé.');}
  if(!response.ok) throw new HistoryError(response.status,response.status===401 ? 'Phiên đăng nhập đã hết hạn. Bạn đăng nhập lại nhé.' : response.status===404 ? 'Hội thoại không còn tồn tại hoặc bạn không có quyền truy cập.' : response.status===429 ? 'Bạn thao tác quá nhanh. Vui lòng chờ một phút rồi thử lại.' : 'Không thể xử lý lịch sử. Bạn tải lại và thử lại nhé.');
  return row(await response.json());
}
export const historyApi = {
  async list(page:number,signal:AbortSignal):Promise<HistoryPage> {
    const data=await call(`/api/history?page=${page}`,signal);
    return {...paging(data),items:list(data.items).map(value=>{const item=row(value);return {id:str(item.id),title:str(item.title),updated_at:nullable(item.updated_at)};})};
  },
  async detail(id:string,page:number,signal:AbortSignal):Promise<HistoryDetail> {
    const data=await call(`/api/history/${encodeURIComponent(id)}?page=${page}`,signal);
    if(data.id!==id) throw invalid();
    return {...paging(data),id:str(data.id),title:str(data.title),messages:list(data.messages).map(value=>{
      const m=row(value); if(m.role!=='user' && m.role!=='assistant') throw invalid();
      return {id:str(m.id),role:m.role,text:str(m.text),status:nullable(m.status),created_at:nullable(m.created_at),citations:list(m.citations).map(value=>{
        const c=row(value), source=str(c.source);
        return {id:str(c.id),law:str(c.law),title:str(c.title),version:count(c.version),article:str(c.article),clause:str(c.clause),point:str(c.point),text:str(c.text),source:/^https?:\/\//i.test(source)?source:'',page:c.page===null?null:count(c.page)};
      })};
    })};
  },
  async remove(id:string,signal:AbortSignal) {
    const csrf=await call('/api/auth/csrf',signal);
    const data=await call(`/api/history/${encodeURIComponent(id)}`,signal,{method:'DELETE',headers:{'X-CSRF-TOKEN':str(csrf.csrf_token)}});
    if(data.deleted!==true) throw invalid();
  },
};
