import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { History, RefreshCw } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { AdminTabReveal } from './admin/AdminTabReveal';
import { historyApi, HistoryError, type HistoryPage, type HistoryDetail } from '../lib/history-api';

const date=(value:string|null)=>value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString('vi-VN') : '';
const message=(error:unknown)=>error instanceof Error ? error.message : 'Không thể tải lịch sử. Bạn thử lại nhé.';
type Article = (typeof import('../lib/articles').articles)[number];
export function HistoryView({articleButton,onOpenChat,revision=0}:{articleButton?:(article:Article,label?:string)=>ReactNode; onOpenChat?:()=>void; revision?:number}) {
  const shouldReduceMotion = useReducedMotion();
  const [request,setRequest]=useState({page:1,run:0});
  const [data,setData]=useState<HistoryPage|null>(null);
  const [selected,setSelected]=useState({id:'',page:1,run:0});
  const [detail,setDetail]=useState<HistoryDetail|null>(null);
  const [loading,setLoading]=useState(true), [detailLoading,setDetailLoading]=useState(false);
  const [error,setError]=useState(''), [detailError,setDetailError]=useState('');
  const [expired,setExpired]=useState(false);
  const [confirm,setConfirm]=useState(false), [deleting,setDeleting]=useState(false);
  const deletion=useRef<AbortController|null>(null);
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>()=>deletion.current?.abort(),[]);
  const expire=()=>{setExpired(true);setData(null);setDetail(null);setSelected({id:'',page:1,run:0});};
  useEffect(()=>{
    const controller=new AbortController(); setLoading(true);setError('');setData(null);
    historyApi.list(request.page,controller.signal).then(result=>{
      if(!controller.signal.aborted) {
        if(!result.items.length && request.page>1) setRequest(prev=>({...prev,page:prev.page-1}));
        else setData(result);
      }
    }).catch(reason=>{if(!controller.signal.aborted) {if(reason instanceof HistoryError && reason.status===401) expire();setError(message(reason));}})
      .finally(()=>{if(!controller.signal.aborted) setLoading(false);});
    return ()=>controller.abort();
  },[request,revision]);
  useEffect(()=>{
    setDetail(null);setDetailError('');setConfirm(false);
    if(!selected.id) {setDetailLoading(false);return;}
    const controller=new AbortController();setDetailLoading(true);
    historyApi.detail(selected.id,selected.page,controller.signal).then(result=>{if(!controller.signal.aborted) setDetail(result);})
      .catch(reason=>{if(!controller.signal.aborted) {if(reason instanceof HistoryError && reason.status===401) expire();setDetailError(message(reason));}})
      .finally(()=>{if(!controller.signal.aborted) setDetailLoading(false);});
    return ()=>controller.abort();
  },[selected]);
  async function remove() {
    if(deleting || !detail) return;
    const controller=new AbortController();deletion.current=controller;setDeleting(true);setDetailError('');
    try {
      await historyApi.remove(detail.id,controller.signal);
      if(!controller.signal.aborted) {setSelected({id:'',page:1,run:0});setDetail(null);setConfirm(false);setRequest(prev=>({...prev,run:prev.run+1}));heading.current?.focus();}
    } catch(reason) {if(!controller.signal.aborted) {if(reason instanceof HistoryError && reason.status===401) expire();setDetailError(message(reason));}}
    finally {if(!controller.signal.aborted) setDeleting(false);}
  }
  return <section className="cl-view cl-history-view">
    <AdminTabReveal tab="history" duration={950} instant={false} className="cl-public-reveal">
      <div className="cl-page-heading" data-admin-reveal="0"><div><span className="cl-eyebrow">KHÔNG GIAN CỦA BẠN</span>
        <h1 ref={heading} tabIndex={-1}>Lịch sử hỏi đáp</h1><p>Các hội thoại đã lưu của riêng bạn, cùng căn cứ tại thời điểm trả lời.</p>
      </div></div>
      <div data-admin-reveal="80" className="cl-history-toolbar">
        <button
          type="button"
          className="cl-admin-btn-outline cl-history-reload-btn"
          disabled={loading || deleting || expired}
          onClick={() => {
            setSelected({ id: '', page: 1, run: 0 });
            setRequest(prev => ({ ...prev, run: prev.run + 1 }));
          }}
          title="Tải lại dữ liệu"
          aria-label="Tải lại dữ liệu"
        >
          <RefreshCw size={14} className={loading ? "cl-spin" : ""} aria-hidden="true" />
          <span>Tải lại dữ liệu</span>
        </button>
        {expired && <Link to="/login" className="cl-history-relogin-link">Đăng nhập lại</Link>}
      </div>
      <div className="cl-history-layout" data-admin-reveal="160">
        <div className="cl-document-card" aria-busy={loading}>
          {error && <p role="alert">{error}</p>}
          {loading ? <p role="status">Đang tải lịch sử…</p> : data && <>
            {!data.items.length ? <div className="cl-history-empty"><History size={28}/><h2>Bạn chưa có cuộc hỏi đáp nào</h2><p>Khi bạn hỏi đáp cùng trợ lý AI, các cuộc trao đổi sẽ tự động được lưu tại đây.</p>{onOpenChat && <button className="cl-primary" onClick={onOpenChat}>Hỏi đáp cùng AI</button>}</div> : <>
              <h2>Hội thoại của bạn</h2>
              <nav className="cl-history-list" aria-label="Danh sách hội thoại">{data.items.map((item, index)=><motion.button disabled={deleting} className="cl-history-select" key={item.id} aria-current={selected.id===item.id?'true':undefined} onClick={()=>setSelected({id:item.id,page:1,run:selected.run+1})} initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: shouldReduceMotion ? 0.16 : 0.85, delay: shouldReduceMotion ? 0 : Math.min(index * 0.07, 0.42), ease: [0.16, 1, 0.3, 1] }}>
                <strong>{item.title}</strong><time>{date(item.updated_at)}</time>
              </motion.button>)}</nav>
              {data.total>12 && <nav className="cl-history-pages" aria-label="Phân trang hội thoại"><button disabled={request.page===1||deleting} onClick={()=>{setSelected({id:'',page:1,run:0});setRequest({...request,page:request.page-1});}}>Trước</button><span>Trang {data.page} / {Math.ceil(data.total/12)}</span><button disabled={request.page*12>=data.total||deleting} onClick={()=>{setSelected({id:'',page:1,run:0});setRequest({...request,page:request.page+1});}}>Sau</button></nav>}
            </>}
          </>}
        </div>
        {selected.id && <article className="cl-document-card cl-history-detail" aria-busy={detailLoading}>
          {detailError && <p role="alert">{detailError}</p>}
          {detailLoading ? <p role="status">Đang tải hội thoại…</p> : detail ? <>
            <h2>{detail.title}</h2>
            {detail.messages.length===0 && <p>Hội thoại chưa có tin nhắn.</p>}
            {detail.messages.map(m=><section className="cl-history-message" key={m.id}>
              <h3>{m.role==='user'?'Bạn':'Trợ lý AI'}</h3><time>{date(m.created_at)}</time><p>{m.text}</p>
              {m.status==='no_basis' && <small>Chưa tìm được căn cứ phù hợp.</small>}{m.status==='error' && <small>Phản hồi gặp lỗi tại thời điểm xử lý.</small>}
              {m.citations.map(c=><details className="cl-history-citation" key={c.id}><summary>Căn cứ: {c.clause && `Khoản ${c.clause} `}Điều {c.article}{c.point && `, điểm ${c.point}`}</summary>
                <p>{c.text}</p><small>{c.title} · {c.law} · Phiên bản {c.version}{c.page && ` · Trang ${c.page}`}. Bản lưu tại thời điểm trả lời.</small>
                {c.source && <p><a href={c.source} target="_blank" rel="noopener noreferrer">Đối chiếu nguồn ↗</a></p>}
              </details>)}
            </section>)}
            {detail.total>20 && <nav className="cl-history-pages" aria-label="Phân trang tin nhắn"><button disabled={selected.page===1||deleting} onClick={()=>setSelected({...selected,page:selected.page-1})}>Tin nhắn trước</button><span>Trang {detail.page} / {Math.ceil(detail.total/20)}</span><button disabled={selected.page*20>=detail.total||deleting} onClick={()=>setSelected({...selected,page:selected.page+1})}>Tin nhắn sau</button></nav>}
            {confirm ? <div className="cl-history-confirm" role="group" aria-label="Xác nhận xóa hội thoại"><p>Xóa hội thoại này cùng tin nhắn và căn cứ đã lưu? Bạn không thể khôi phục sau khi xóa.</p><button disabled={deleting} onClick={()=>setConfirm(false)}>Hủy</button><button disabled={deleting} onClick={remove}>{deleting?'Đang xóa…':'Xác nhận xóa'}</button></div> : <button className="cl-text-button" onClick={()=>setConfirm(true)}>Xóa hội thoại</button>}
          </> : !expired && <button onClick={()=>setSelected({...selected,run:selected.run+1})}>Thử lại</button>}
        </article>}
      </div>
    </AdminTabReveal>
  </section>;
}
