import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { AdminTabReveal } from './admin/AdminTabReveal';
import { fetchTerms, type Term } from '../lib/terms-api';
import type { PublicArticle } from '../lib/public-search-api';

export function TermsView({selectedId,articleButton}:{selectedId?:string; articleButton:(article:PublicArticle,label:string)=>ReactNode}) {
  const [query,setQuery]=useState('');
  const [request,setRequest]=useState({q:'',page:1,run:0});
  const [items,setItems]=useState<Term[]>([]);
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{
    const controller=new AbortController();
    setLoading(true); setError(''); setItems([]);
    fetchTerms(request.q,request.page,controller.signal).then(data=>{
      if (!controller.signal.aborted) {setItems(data.items);setTotal(data.total);}
    }).catch(reason=>{
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không thể tải thuật ngữ. Bạn thử lại nhé.');
    }).finally(()=>{if (!controller.signal.aborted) setLoading(false);});
    return ()=>controller.abort();
  },[request]);
  return <section className="cl-view cl-terms-view">
    <AdminTabReveal tab="/terms" instant={false} duration={950} className="cl-public-reveal">
      <div className="cl-page-heading" data-admin-reveal="0"><div>
        <span className="cl-eyebrow">TỪ ĐIỂN KIẾN THỨC</span><h1>Từ điển thuật ngữ</h1>
        <p>Cụm từ và cách diễn đạt thường dùng khi tra cứu.</p>
      </div></div>
      <form className="cl-terms-search" data-admin-reveal="80" onSubmit={event=>{event.preventDefault();setRequest({q:query,page:1,run:request.run+1});}}>
        <label htmlFor="terms-query">Tìm thuật ngữ</label>
        <input id="terms-query" value={query} maxLength={120} onChange={event=>setQuery(event.target.value)} placeholder="Nhập thuật ngữ hoặc biến thể…" />
        <button className="cl-primary" type="submit">Tìm kiếm</button>
        <button className="cl-text-button" type="button" onClick={()=>setRequest({...request,run:request.run+1})}>Tải lại dữ liệu</button>
      </form>
      <div data-admin-reveal="160" aria-busy={loading}>
        {loading ? <p role="status">Đang tải thuật ngữ…</p> : error ? <p role="alert">{error}</p> : <>
          <p role="status">{total ? `${total} thuật ngữ có căn cứ pháp lý` : 'Không có thuật ngữ phù hợp đã được công bố.'}</p>
          {items.map(term=><motion.div key={term.id} className="cl-term-card" layoutId={`article-card-${term.article.id}`}
            layoutDependency={selectedId===term.article.id} transition={{type:'spring',stiffness:190,damping:25,mass:0.85}}>
            <span className="cl-result-category">KHÁI NIỆM</span><h2>{term.cum_tu}</h2>
            {term.dinh_nghia && <p>{term.dinh_nghia}</p>}
            {term.bien_the.length>0 && <p>Biến thể tìm kiếm: {term.bien_the.join(', ')}.</p>}
            {articleButton(term.article,`Xem ${term.article.so_khoan ? `khoản ${term.article.so_khoan} ` : ''}Điều ${term.article.so_dieu}`)}
          </motion.div>)}
          {total>12 && <nav className="cl-terms-pagination" aria-label="Phân trang thuật ngữ">
            <button disabled={request.page===1} onClick={()=>setRequest({...request,page:request.page-1})}>Trang trước</button>
            <span>Trang {request.page} / {Math.ceil(total/12)}</span>
            <button disabled={request.page*12>=total} onClick={()=>setRequest({...request,page:request.page+1})}>Trang sau</button>
          </nav>}
        </>}
      </div>
    </AdminTabReveal>
  </section>;
}
