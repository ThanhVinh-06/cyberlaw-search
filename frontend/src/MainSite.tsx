import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  FileText,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";
import { articles, source } from "./lib/articles";
import { useAuth } from "./lib/auth-context";
import { ArticleDialog } from "./components/ArticleDialog";
import { ChatPopover } from "./components/ChatPopover";
import { ResultReveal } from "./components/ResultReveal";
import { Brand } from "./components/Brand";
import { AdminTabReveal } from "./components/admin/AdminTabReveal";
import { publicNavigation, historyNavigation } from "./lib/navigation";
import { motion, AnimatePresence } from "motion/react";

type Article = (typeof articles)[number];
type Filters = {
  query: string;
  mode: string;
  category: string;
  from: string;
  to: string;
};
type Message = { text: string; kind: "user" | "assistant"; article?: Article };
const emptyFilters: Filters = {
  query: "",
  mode: "all",
  category: "all",
  from: "",
  to: "",
};
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

function ArticleContent({
  article,
  sharedTitle = false,
}: {
  article: Article;
  sharedTitle?: boolean;
}) {
  return (
    <>
      <p className="cl-document-meta">
        LUẬT SỐ 116/2025/QH15 · NGUYÊN VĂN TRÍCH ĐOẠN
      </p>
      <motion.h2
        layoutId={sharedTitle ? `article-title-${article.id}` : undefined}
      >
        {article.title}
      </motion.h2>
      {article.text.split("\n\n").map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <p className="cl-document-meta">{article.note}</p>
      <a href={source} target="_blank" rel="noopener noreferrer">
        Đối chiếu văn bản trên Cổng thông tin Chính phủ ↗
      </a>
    </>
  );
}

export default function MainSite() {
  const { currentUser, isAuthenticated, isAdmin, logout } = useAuth();
  const { pathname } = useLocation();
  const view = pathname === "/" ? "/search" : pathname;
  const nav = isAuthenticated
    ? [...publicNavigation, historyNavigation]
    : publicNavigation;
  const [filters, setFilters] = useState<Filters>({
    ...emptyFilters,
    query: "an ninh mạng",
  });
  const [results, setResults] = useState(articles);
  const [resultEntrance, setResultEntrance] = useState({
    run: 0,
    instant: true,
  });
  const searchInstantRef = useRef(false);
  const [error, setError] = useState("");
  const [libraryArticle, setLibraryArticle] = useState(articles[0]);
  const [selectedArticle, setSelectedArticle] = useState<{
    article: Article;
    trigger: HTMLElement;
    origin: HTMLElement;
    instant: boolean;
  } | null>(null);
  const closeArticle = useCallback(() => setSelectedArticle(null), []);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInstant, setChatInstant] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const currentTitle =
    nav.find((item) => item.to === view)?.label ?? "Về dự án";

  useEffect(() => {
    setMessages([]);
    setQuestion("");
    setChatOpen(false);
  }, [currentUser?.ma_nguoi_dung]);

  useEffect(() => {
    document.title = `${currentTitle} — CyberLaw`;
    mainRef.current?.focus({ preventScroll: true });
  }, [view, currentTitle]);
  useEffect(() => {
    if (chatOpen) chatInputRef.current?.focus();
  }, [chatOpen]);
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, chatOpen]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !selectedArticle && chatOpen) {
        setChatInstant(true);
        setChatOpen(false);
        requestAnimationFrame(() =>
          launcherRef.current?.focus({ preventScroll: true }),
        );
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [chatOpen, selectedArticle]);

  function search(next = filters) {
    if (next.from && next.to && next.from > next.to) {
      setError("Ngày bắt đầu cần trước hoặc bằng ngày kết thúc.");
      return;
    }
    setError("");
    setResultEntrance((previous) => ({
      run: previous.run + 1,
      instant: searchInstantRef.current,
    }));
    const q = normalize(next.query.trim());
    setResults(
      articles.filter((article) => {
        if (next.category !== "all" && article.category !== next.category)
          return false;
        if (
          (next.from && "2025-12-10" < next.from) ||
          (next.to && "2025-12-10" > next.to)
        )
          return false;
        if (!q) return true;
        if (next.mode === "article")
          return article.id === q.replace(/dieu\s*/, "").trim();
        const target = normalize(
          next.mode === "title"
            ? article.title
            : [
                article.title,
                article.text,
                article.summary,
                article.label,
              ].join(" "),
        );
        return (
          target.includes(q) ||
          (/^dieu\s*\d+$/.test(q) && article.id === q.replace(/dieu\s*/, ""))
        );
      }),
    );
  }
  function suggest(query: string) {
    const next = { ...filters, query, mode: "all", category: "all" };
    setFilters(next);
    search(next);
  }
  function openArticle(
    article: Article,
    trigger: HTMLElement,
    instant: boolean,
  ) {
    setSelectedArticle({
      article,
      trigger,
      instant,
      origin: trigger.closest<HTMLElement>(".cl-result, .cl-term-card") ?? trigger,
    });
  }
  const closeChat = useCallback((instant = false, restoreFocus = true) => {
    setChatInstant(instant);
    setChatOpen(false);
    if (restoreFocus)
      requestAnimationFrame(() =>
        launcherRef.current?.focus({ preventScroll: true }),
      );
  }, []);
  function openChat(instant = false) {
    setChatInstant(instant);
    setChatOpen(true);
  }
  function sendChat(value = question) {
    const text = value.trim();
    if (!text) return;
    const q = normalize(text);
    let response: Message = {
      kind: "assistant",
      text: "Đây là bản xem thử giao diện, chưa kết nối mô hình AI. Bạn có thể thử “Luật có hiệu lực từ khi nào?” hoặc “An ninh mạng là gì?” để xem cách hiển thị câu trả lời và căn cứ.",
    };
    if (q.includes("hieu luc"))
      response = {
        kind: "assistant",
        text: "Phản hồi mẫu: Luật số 116/2025/QH15 có hiệu lực từ ngày 01/07/2026. Căn cứ: khoản 1 Điều 44.",
        article: articles[2],
      };
    else if (q.includes("an ninh mang la gi"))
      response = {
        kind: "assistant",
        text: "Phản hồi mẫu: Khái niệm an ninh mạng được nêu tại khoản 1 Điều 2. Bạn có thể mở nguyên văn bên dưới để đọc đầy đủ.",
        article: articles[1],
      };
    setMessages((previous) => [...previous, { kind: "user", text }, response]);
    setQuestion("");
    chatInputRef.current?.focus();
  }
  const articleButton = (article: Article, label = "Xem điều khoản") => (
    <button
      className="cl-link-button"
      onClick={(event) =>
        openArticle(article, event.currentTarget, event.detail === 0)
      }
    >
      {label}
      <ArrowRight aria-hidden="true" />
    </button>
  );

  return (
    <div className="cl-site">
      <a className="cl-skip" href="#cl-main">
        Đến nội dung chính
      </a>
      <aside className="cl-sidebar" aria-label="Điều hướng chính">
        <div className="site-sidebar-header">
          <Brand />
        </div>
        <div className="cl-nav-label">KHÔNG GIAN TRA CỨU</div>
        <nav>
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={`cl-nav-item${view === to ? " cl-selected" : ""}`}
              aria-current={view === to ? "page" : undefined}
            >
              <Icon size={19} aria-hidden="true" />
              {label}
            </NavLink>
          ))}

          {/* CHỈ hiển thị Quản trị hệ thống trên menubar khi người dùng là Admin */}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={`cl-nav-item${view === "/admin" ? " cl-selected" : ""}`}
              style={{ color: "#800020", fontWeight: 600 }}
            >
              <ShieldCheck aria-hidden="true" />
              Quản trị hệ thống
            </NavLink>
          )}

          <button
            className="cl-nav-item"
            onClick={(event) => openChat(event.detail === 0)}
          >
            <MessageCircle aria-hidden="true" />
            Hỏi đáp cùng AI<span className="cl-tiny-ai">AI</span>
          </button>
        </nav>
        <div className="cl-sidebar-scope">
          <span className="cl-scope-line" />
          <div className="cl-nav-label">PHẠM VI KIẾN THỨC</div>
          <strong>Luật An ninh mạng</strong>
          <p>Luật số 116/2025/QH15</p>
          <span className="cl-scope-tag">Văn bản năm 2025</span>
        </div>
        <div className="cl-sidebar-bottom">
          <span className="cl-project-mark">ĐỒ ÁN TRÍ TUỆ NHÂN TẠO</span>
          <p>
            Tra cứu kiến thức pháp luật
            <br />
            có dẫn chiếu nguồn văn bản.
          </p>

          {!isAuthenticated ? (
            <div className="cl-sidebar-account" aria-label="Tài khoản">
              <Link to="/login" className="cl-primary">
                Đăng nhập
              </Link>
              <Link to="/register">Đăng ký</Link>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e7e1dd",
                borderRadius: "8px",
                padding: "10px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    backgroundColor: isAdmin ? "#800020" : "#4a3e40",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {currentUser?.ho_ten
                    .split(" ")
                    .map((n) => n[0])
                    .slice(-2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div style={{ overflow: "hidden", lineHeight: 1.25 }}>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#21181d",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {currentUser?.ho_ten}
                  </div>
                  <div
                    style={{
                      fontSize: "10.5px",
                      color: isAdmin ? "#800020" : "#6e6466",
                      fontWeight: 500,
                    }}
                  >
                    {isAdmin ? "Quản trị viên" : "Người dùng"}
                  </div>
                </div>
              </div>

              {/* CHỈ hiển thị liên kết vào trang Quản trị khi là Admin */}
              {isAdmin && (
                <Link
                  to="/admin"
                  style={{
                    fontSize: "12px",
                    color: "#800020",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "6px 8px",
                    backgroundColor: "#fbf2f3",
                    border: "1px solid #eed2d7",
                    borderRadius: "6px",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  <ShieldCheck size={14} />
                  <span>Khu vực Quản trị →</span>
                </Link>
              )}

              <button
                onClick={logout}
                style={{
                  fontSize: "11.5px",
                  color: "#716667",
                  background: "none",
                  border: "none",
                  padding: "2px",
                  cursor: "pointer",
                  textAlign: "center",
                  textDecoration: "underline",
                }}
              >
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </aside>
      <div className="cl-workspace">
        <header className="cl-masthead">
          <div>
            <div className="cl-masthead-eyebrow">
              HỆ THỐNG TRA CỨU KIẾN THỨC PHÁP LUẬT
            </div>
            <p>LUẬT AN NINH MẠNG</p>
          </div>
          <div className="cl-header-seal">
            <BookOpen aria-hidden="true" />
            <span>
              Hiểu luật
              <br />
              <strong>Vững kiến thức</strong>
            </span>
          </div>
        </header>
        <div className="cl-context-bar">
          <span>
            CyberLaw <span className="cl-separator">/</span> {currentTitle}
          </span>
          <span className="cl-context-meta">Nguồn: Luật số 116/2025/QH15</span>
        </div>
        <main id="cl-main" ref={mainRef} tabIndex={-1}>
          {view === "/search" && <section className="cl-view">
            <AdminTabReveal tab={view} instant={false} duration={950} className="cl-public-reveal">
            <div className="cl-page-heading" data-admin-reveal="0">
              <div>
                <span className="cl-eyebrow">TRA CỨU KIẾN THỨC</span>
                <h1>Tìm kiếm quy định pháp luật</h1>
                <p>Tìm theo từ khóa, điều khoản hoặc câu hỏi của bạn.</p>
              </div>
              <span className="cl-section-number">
                01 <span>/ TRA CỨU</span>
              </span>
            </div>
            <form
              className="cl-search-card"
              data-admin-reveal="80"
              onPointerDownCapture={() => {
                searchInstantRef.current = false;
              }}
              onKeyDownCapture={() => {
                searchInstantRef.current = true;
              }}
              onSubmit={(event) => {
                event.preventDefault();
                search();
              }}
            >
              <div className="cl-search-primary">
                <label>
                  Tìm kiếm theo
                  <select
                    value={filters.mode}
                    onChange={(event) =>
                      setFilters({ ...filters, mode: event.target.value })
                    }
                  >
                    <option value="all">Nội dung &amp; tiêu đề</option>
                    <option value="title">Tiêu đề điều luật</option>
                    <option value="article">Số điều</option>
                  </select>
                </label>
                <label className="cl-query-label">
                  Từ khóa hoặc câu hỏi
                  <div className="cl-input-icon">
                    <Search aria-hidden="true" />
                    <input
                      value={filters.query}
                      onChange={(event) =>
                        setFilters({ ...filters, query: event.target.value })
                      }
                      onKeyDown={(event) => {
                        if (event.ctrlKey && event.key === "Enter") {
                          event.preventDefault();
                          search();
                        }
                      }}
                      placeholder="Ví dụ: an ninh mạng là gì?"
                      maxLength={1000}
                    />
                  </div>
                </label>
              </div>
              <div className="cl-search-secondary">
                <div>
                  <span className="cl-field-label">Văn bản</span>
                  <div className="cl-readonly-field">116/2025/QH15</div>
                </div>
                <label>
                  Loại nội dung
                  <select
                    value={filters.category}
                    onChange={(event) =>
                      setFilters({ ...filters, category: event.target.value })
                    }
                  >
                    <option value="all">Tất cả nội dung</option>
                    <option value="general">Quy định chung</option>
                    <option value="definition">Khái niệm</option>
                    <option value="effect">Hiệu lực thi hành</option>
                  </select>
                </label>
                <label>
                  Ban hành từ ngày
                  <input
                    type="date"
                    value={filters.from}
                    aria-invalid={!!error}
                    aria-describedby={error ? "cl-search-error" : undefined}
                    onChange={(event) =>
                      setFilters({ ...filters, from: event.target.value })
                    }
                  />
                </label>
                <label>
                  Đến ngày
                  <input
                    type="date"
                    value={filters.to}
                    aria-invalid={!!error}
                    aria-describedby={error ? "cl-search-error" : undefined}
                    onChange={(event) =>
                      setFilters({ ...filters, to: event.target.value })
                    }
                  />
                </label>
              </div>
              <div className="cl-search-bottom">
                <div className="cl-suggestions">
                  <span>Gợi ý:</span>
                  <button type="button" onClick={() => suggest("khái niệm")}>
                    Khái niệm
                  </button>
                  <button type="button" onClick={() => suggest("Điều 44")}>
                    Hiệu lực thi hành
                  </button>
                </div>
                <div className="cl-form-actions">
                  <button
                    type="button"
                    className="cl-text-button"
                    onClick={() => {
                      setFilters(emptyFilters);
                      setError("");
                      setResults(articles);
                      setResultEntrance((previous) => ({
                        run: previous.run + 1,
                        instant: searchInstantRef.current,
                      }));
                    }}
                  >
                    Đặt lại
                  </button>
                  <button className="cl-primary" type="submit">
                    <Search aria-hidden="true" />
                    Tìm kiếm
                  </button>
                </div>
              </div>
              {error && (
                <p className="cl-validation" id="cl-search-error" role="alert">
                  {error}
                </p>
              )}
            </form>
            <div className="cl-results-heading" data-admin-reveal="160">
              <h2 aria-live="polite">
                Tìm thấy <strong>{results.length} kết quả</strong>
              </h2>
              <span>Dữ liệu minh họa · 3 điều luật</span>
            </div>
            <div data-admin-reveal="240">
              {results.map((article, index) => (
                <ResultReveal
                  key={article.id}
                  run={resultEntrance.run}
                  instant={resultEntrance.instant}
                  index={index}
                >
                  <motion.article
                    layoutId={`article-card-${article.id}`}
                    // Measure for dialog transitions, not while the entrance wrapper moves.
                    layoutDependency={
                      selectedArticle?.article.id === article.id
                    }
                    className="cl-result"
                    transition={{
                      type: "spring",
                      stiffness: 190,
                      damping: 25,
                      mass: 0.85,
                    }}
                  >
                    <div className="cl-result-icon">
                      <FileText aria-hidden="true" />
                    </div>
                    <div className="cl-result-body">
                      <div className="cl-result-top">
                        <span className="cl-result-category">
                          {article.label.toUpperCase()}
                        </span>
                        <span className="cl-result-doc">
                          · &nbsp;116/2025/QH15
                        </span>
                      </div>
                      <motion.h3
                        layoutId={`article-title-${article.id}`}
                        layoutDependency={
                          selectedArticle?.article.id === article.id
                        }
                      >
                        {article.title}
                      </motion.h3>
                      <p>{article.summary}</p>
                      <span className="cl-result-meta">
                        Ban hành: 10/12/2025 &nbsp;·&nbsp; Quốc hội
                      </span>
                    </div>
                    <div className="cl-result-bottom">
                      {articleButton(article)}
                    </div>
                  </motion.article>
                </ResultReveal>
              ))}
              {!results.length && (
                <div className="cl-empty-state">
                  <h3>Chưa tìm thấy kết quả phù hợp</h3>
                  <p>
                    Thử từ khóa “an ninh mạng”, “khái niệm” hoặc “Điều 44”.
                    <br />
                    Bản giao diện hiện minh họa 3 điều luật.
                  </p>
                </div>
              )}
            </div>
            <div className="cl-source-note" data-admin-reveal="320">
              <BookOpen aria-hidden="true" />
              <span>
                Mỗi kết quả liên kết đến điều khoản và nguồn văn bản để bạn đối
                chiếu.
              </span>
            </div>
            </AdminTabReveal>
          </section>}
          {view === "/library" && <section className="cl-view">
            <AdminTabReveal tab={view} instant={false} duration={950} className="cl-public-reveal">
            <div className="cl-page-heading" data-admin-reveal="0">
              <div>
                <span className="cl-eyebrow">THƯ VIỆN VĂN BẢN</span>
                <h1>Luật An ninh mạng</h1>
                <p>Luật số 116/2025/QH15 · Ban hành ngày 10/12/2025</p>
              </div>
            </div>
            <div className="cl-library-layout">
              <div className="cl-article-nav" data-admin-reveal="80">
                <h2>Mục lục minh họa</h2>
                {articles.map((article) => (
                  <button
                    key={article.id}
                    aria-current={
                      libraryArticle.id === article.id ? "true" : undefined
                    }
                    onClick={() => setLibraryArticle(article)}
                  >
                    Điều {article.id} ·{" "}
                    {article.id === "1"
                      ? "Phạm vi điều chỉnh"
                      : article.id === "2"
                        ? "Giải thích từ ngữ"
                        : "Hiệu lực thi hành"}
                  </button>
                ))}
              </div>
              <article className="cl-document-card" data-admin-reveal="160">
                <ArticleContent article={libraryArticle} />
              </article>
            </div>
            </AdminTabReveal>
          </section>}
          {view === "/terms" && <section className="cl-view">
            <AdminTabReveal tab={view} instant={false} duration={950} className="cl-public-reveal">
            <div className="cl-page-heading" data-admin-reveal="0">
              <div>
                <span className="cl-eyebrow">TỪ ĐIỂN KIẾN THỨC</span>
                <h1>Từ điển thuật ngữ</h1>
                <p>Cụm từ và cách diễn đạt thường dùng khi tra cứu.</p>
              </div>
            </div>
            <div data-admin-reveal="80">
            <motion.div className="cl-term-card" layoutId="article-card-2"
              layoutDependency={selectedArticle?.article.id === "2"}
              transition={{type: "spring", stiffness: 190, damping: 25, mass: 0.85}}>
              <span className="cl-result-category">KHÁI NIỆM</span>
              <h2>An ninh mạng</h2>
              <p>Biến thể tìm kiếm: “an ninh mang”, “an ninh mạng là gì”.</p>
              {articleButton(articles[1], "Xem khoản 1 Điều 2")}
            </motion.div>
            </div>
            <div className="cl-term-card" data-admin-reveal="160">
              <span className="cl-result-category">ỨNG VIÊN KEYPHRASE</span>
              <h2>Tấn công mạng</h2>
              <p>Truy vấn tình huống: “bị tấn công hệ thống”.</p>
              <p className="cl-muted">
                Cần duyệt liên kết điều khoản trước khi đưa vào bộ tìm kiếm.
              </p>
            </div>
            </AdminTabReveal>
          </section>}
          {view === historyNavigation.to && isAuthenticated && (
            <section className="cl-view cl-history-view">
              <AdminTabReveal
                tab="history"
                duration={950}
                instant={document.documentElement.dataset.input === "keyboard"}
              >
                <div className="cl-page-heading" data-admin-reveal="0">
                  <div>
                    <span className="cl-eyebrow">KHÔNG GIAN CỦA BẠN</span>
                    <h1>{historyNavigation.label}</h1>
                    <p>
                      Các trao đổi dùng thử trong lần mở trang này. Lịch sử chưa
                      được lưu lên hệ thống.
                    </p>
                  </div>
                </div>
                {messages.length === 0 ? (
                  <div
                    className="cl-document-card cl-history-empty"
                    data-admin-reveal="50"
                  >
                    <historyNavigation.icon size={28} aria-hidden="true" />
                    <h2>Bạn chưa có cuộc hỏi đáp nào</h2>
                    <p>
                      Bắt đầu một câu hỏi để xem phản hồi và căn cứ pháp lý minh
                      họa.
                    </p>
                    <button
                      className="cl-primary"
                      onClick={(event) => openChat(event.detail === 0)}
                    >
                      <MessageCircle aria-hidden="true" /> Hỏi đáp cùng AI
                    </button>
                  </div>
                ) : (
                  messages
                    .filter((message) => message.kind === "user")
                    .map((message, index) => {
                      const response = messages[index * 2 + 1];
                      return (
                        <article
                          className="cl-document-card cl-history-item"
                          key={index}
                          data-admin-reveal={50 + Math.min(index, 5) * 50}
                        >
                          <span className="cl-eyebrow">
                            CÂU HỎI {index + 1}
                          </span>
                          <h2>{message.text}</h2>
                          <p>{response?.text}</p>
                          {response?.article && articleButton(response.article)}
                        </article>
                      );
                    })
                )}
              </AdminTabReveal>
            </section>
          )}
          {!nav.some((item) => item.to === view) && (
            <section className="cl-document-card">
              <h1>
                {view === "/help"
                  ? "Về dự án CyberLaw"
                  : "Không tìm thấy trang"}
              </h1>
              <p>
                Đồ án Trí tuệ nhân tạo: tra cứu kiến thức Luật An ninh mạng có
                dẫn chiếu nguồn văn bản.
              </p>
              <p>
                Giao diện dùng dữ liệu minh họa. Tài khoản và mô hình AI chưa
                kết nối backend.
              </p>
              <Link to="/search">Về trang tra cứu →</Link>
            </section>
          )}
          <footer className="cl-page-footer">
            <strong>CyberLaw</strong>
            <span>Đồ án môn Trí tuệ nhân tạo</span>
            <span>Giao diện mẫu · Chưa kết nối AI</span>
          </footer>
        </main>
      </div>
      <ChatPopover
        open={chatOpen}
        instant={chatInstant}
        articleOpen={!!selectedArticle}
        launcherRef={launcherRef}
        onOpen={openChat}
        onClose={closeChat}
      >
        <div
          className="cl-chat-messages"
          ref={logRef}
          role="log"
          aria-live="polite"
        >
          <div className="cl-chat-date">TRÒ CHUYỆN MỚI</div>
          <div className="cl-message cl-assistant">
            <strong>Xin chào, tôi là trợ lý CyberLaw.</strong>
            <p>Bạn muốn tìm hiểu quy định nào về Luật An ninh mạng?</p>
          </div>
          <div className="cl-chat-prompts">
            {["Luật có hiệu lực từ khi nào?", "An ninh mạng là gì?"].map(
              (prompt) => (
                <button key={prompt} onClick={() => sendChat(prompt)}>
                  {prompt}
                </button>
              ),
            )}
          </div>
          {messages.map((message, index) => (
            <div key={index} className={`cl-message cl-${message.kind}`}>
              {message.text}
              {message.article && (
                <p>
                  {articleButton(
                    message.article,
                    `Mở Điều ${message.article.id}`,
                  )}
                </p>
              )}
            </div>
          ))}
        </div>
        <form
          id="cl-chat-form"
          onSubmit={(event) => {
            event.preventDefault();
            sendChat();
          }}
        >
          <label className="cl-sr-only" htmlFor="cl-chat-input">
            Câu hỏi cho trợ lý AI
          </label>
          <input
            id="cl-chat-input"
            ref={chatInputRef}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Nhập câu hỏi của bạn…"
            maxLength={1000}
            required
          />
          <button type="submit" aria-label="Gửi câu hỏi">
            <Send aria-hidden="true" />
          </button>
        </form>
        <div className="cl-chat-disclaimer">
          Bản xem thử giao diện · Phản hồi mẫu
        </div>
      </ChatPopover>
      <AnimatePresence>
        {selectedArticle && (
          <ArticleDialog
            key={selectedArticle.article.id}
            article={selectedArticle.article}
            trigger={selectedArticle.trigger}
            origin={selectedArticle.origin}
            instant={selectedArticle.instant}
            onClose={closeArticle}
          >
            <ArticleContent article={selectedArticle.article} sharedTitle />
          </ArticleDialog>
        )}
      </AnimatePresence>
    </div>
  );
}
