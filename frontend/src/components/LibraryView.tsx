import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { AdminTabReveal } from './admin/AdminTabReveal';
import { libraryApi, LibraryError, type LibraryIndex, type LibraryArticle } from '../lib/library-api';

const date = (value: string | null) => value ? value.split('-').reverse().join('/') : 'Chưa cập nhật';
const message = (error: unknown) => error instanceof LibraryError ? error.message : 'Không thể kết nối thư viện. Bạn thử lại nhé.';

export function LibraryView() {
  const [index, setIndex] = useState<LibraryIndex | null>(null);
  const [article, setArticle] = useState<LibraryArticle | null>(null);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [error, setError] = useState('');
  const [articleError, setArticleError] = useState('');
  const [revision, setRevision] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const detailRequest = useRef<AbortController | null>(null);
  const document = article?.document ?? index?.document;

  useEffect(() => {
    const controller = new AbortController();
    detailRequest.current?.abort();
    setLoading(true); setLoadingArticle(false); setIndex(null); setArticle(null); setSelected(''); setError(''); setArticleError('');
    libraryApi.index(controller.signal).then(data => {
      if (controller.signal.aborted) return;
      setIndex(data); setSelected(data.articles[0]?.so_dieu ?? '');
    }).catch(reason => {
      if (!controller.signal.aborted) setError(message(reason));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    detailRequest.current = controller;
    setLoadingArticle(true); setArticleError(''); setArticle(null);
    libraryApi.article(selected, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      if (data.document.phien_ban_noi_dung !== index?.document?.phien_ban_noi_dung) {
        setArticleError('Văn bản vừa được cập nhật. Bạn tải lại mục lục nhé.');
        return;
      }
      setArticle(data);
    }).catch(reason => {
      if (!controller.signal.aborted) setArticleError(message(reason));
    }).finally(() => { if (!controller.signal.aborted) setLoadingArticle(false); });
    return () => controller.abort();
  }, [selected, attempt, index]);

  return <section className="cl-view cl-library-view">
    <AdminTabReveal tab="/library" instant={false} duration={950} className="cl-public-reveal">
      <div className="cl-page-heading" data-admin-reveal="0">
        <div><span className="cl-eyebrow">THƯ VIỆN VĂN BẢN</span>
          <h1>{document?.tieu_de ?? 'Luật An ninh mạng'}</h1>
          <p>{document ? `Luật số ${document.so_hieu} · Ban hành ngày ${date(document.ngay_ban_hanh)}` : 'Văn bản đã công bố trong kho tri thức'}</p>
        </div>
      </div>
      <div className="cl-library-layout">
        <nav className="cl-article-nav" data-admin-reveal="80" aria-label="Mục lục văn bản" aria-busy={loading}>
          <div className="cl-library-toc-header">
            <h2>Mục lục văn bản</h2>
            <button
              type="button"
              className="cl-admin-btn-outline cl-library-reload-btn"
              disabled={loading}
              onClick={() => setRevision(value => value + 1)}
              title="Tải lại dữ liệu"
              aria-label="Tải lại dữ liệu"
            >
              <RefreshCw size={14} className={loading ? "cl-spin" : ""} aria-hidden="true" />
              <span>Tải lại dữ liệu</span>
            </button>
          </div>
          <div className="cl-library-toc">
            {index?.articles.map((item, i, items) => <div key={item.so_dieu}>
              {(i === 0 || items[i - 1].chuong !== item.chuong) && item.chuong && <h3>{item.chuong}</h3>}
              <button
                type="button"
                aria-current={selected === item.so_dieu ? 'true' : undefined}
                onClick={() => {
                  if (selected === item.so_dieu && article) return;
                  detailRequest.current?.abort();
                  setArticle(null);
                  setLoadingArticle(true);
                  setArticleError('');
                  setSelected(item.so_dieu);
                  setAttempt(value => value + 1);
                }}
              >
                Điều {item.so_dieu} · {item.tieu_de}
              </button>
            </div>)}
          </div>
        </nav>
        {/* Keep this exact node mounted: data arriving must not replace the reveal target. */}
        <article className="cl-document-card cl-library-content" data-admin-reveal="160" aria-busy={loading || loadingArticle}>
          {loading ? <p role="status">Đang tải thư viện…</p> : error ? <p role="alert">{error}</p> : !index?.document || !index.articles.length ? <p role="status">Chưa có văn bản được công bố.</p> : <>
            {loadingArticle && <p role="status">Đang tải điều khoản…</p>}
            {articleError && <div><p role="alert">{articleError}</p><button className="cl-text-button" onClick={() => setAttempt(value => value + 1)}>Thử lại điều khoản</button></div>}
            {!loadingArticle && article && (
              <motion.div
                key={article.so_dieu}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
                className="cl-library-article-body"
              >
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
                >
                  <p className="cl-document-meta">Luật số {article.document.so_hieu} · {article.document.co_quan_ban_hanh}</p>
                  <h2>Điều {article.so_dieu}. {article.tieu_de}</h2>
                  <p className="cl-document-meta">Có hiệu lực từ {date(article.document.ngay_hieu_luc)} · Phiên bản {article.document.phien_ban_noi_dung}</p>
                </motion.div>
                {article.units.map((unit, unitIndex) => (
                  <motion.section
                    className="cl-library-unit"
                    key={unit.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.95,
                      delay: Math.min(unitIndex * 0.05, 0.3),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    {(unit.so_khoan || unit.ky_hieu_diem) && <h3>{unit.so_khoan && `Khoản ${unit.so_khoan}`}{unit.ky_hieu_diem && ` · Điểm ${unit.ky_hieu_diem}`}</h3>}
                    <p className="cl-library-text">{unit.noi_dung}</p>
                    {unit.trang_nguon && <small>Trang nguồn: {unit.trang_nguon}</small>}
                  </motion.section>
                ))}
                <motion.div
                  className="cl-library-sources"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.95,
                    delay: Math.min(article.units.length * 0.05, 0.35),
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  {article.document.source && <a href={article.document.source} target="_blank" rel="noopener noreferrer">Đối chiếu văn bản nguồn ↗</a>}
                  {article.document.pdf && <a href="/api/library/pdf" download>Tải PDF nguồn</a>}
                </motion.div>
              </motion.div>
            )}
          </>}
        </article>
      </div>
    </AdminTabReveal>
  </section>;
}
