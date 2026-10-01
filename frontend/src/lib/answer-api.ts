export type AnswerCitation = {id:string;law:string;article:string;clause:string;point:string;text:string;source:string;version:number;page:number|null};
export type Answer = {conversation_id:string;message_id:string;status:'answered'|'no_basis';answer:string;engine:string;citations:AnswerCitation[]};
export type AnswerInput = {question:string; request_id:string; conversation_id?:string};
export class AnswerError extends Error { constructor(public status:number,message:string){super(message);} }
export async function ask(input:AnswerInput,signal:AbortSignal):Promise<Answer> {
  signal=AbortSignal.any([signal,AbortSignal.timeout(25000)]);
  const csrf=await fetch('/api/auth/csrf',{credentials:'same-origin',cache:'no-store',signal});
  const token=await csrf.json();
  if(!csrf.ok || typeof token.csrf_token!=='string') throw new AnswerError(csrf.status,'Không thể xác nhận phiên đăng nhập. Bạn tải lại trang nhé.');
  const response=await fetch('/api/answer',{method:'POST',credentials:'same-origin',cache:'no-store',signal:AbortSignal.any([signal,AbortSignal.timeout(25000)]),headers:{Accept:'application/json','Content-Type':'application/json','X-CSRF-TOKEN':token.csrf_token},body:JSON.stringify(input)});
  const data=await response.json().catch(()=>null);
  if(!response.ok) throw new AnswerError(response.status,response.status===401?'Bạn đăng nhập để hỏi đáp và lưu lịch sử nhé.': response.status===429?'Bạn chờ một phút rồi thử lại nhé.':response.status===409?'Kho luật hoặc hội thoại vừa thay đổi. Bạn tải lại và thử lại nhé.':'Chưa nhận được câu trả lời. Bạn có thể thử lại cùng yêu cầu.');
  if(!data || typeof data.answer!=='string' || typeof data.conversation_id!=='string' || typeof data.message_id!=='string' || !['answered','no_basis'].includes(data.status) || !Array.isArray(data.citations) || data.citations.length>4) throw new AnswerError(502,'Phản hồi không hợp lệ. Bạn thử lại nhé.');
  for(const c of data.citations){
    if(!c || !['id','law','article','clause','point','text','source'].every(k=>typeof c[k]==='string') || !Number.isInteger(c.version)) throw new AnswerError(502,'Căn cứ không hợp lệ.');
    if(!/^https?:\/\//i.test(c.source)) c.source='';
  }
  return data;
}
