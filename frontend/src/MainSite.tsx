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
import { HistoryView } from "./components/HistoryView";
import { TermsView } from "./components/TermsView";
import { LibraryView } from "./components/LibraryView";
import { publicSearchApi } from "./lib/public-search-api";
import { ask, AnswerError, type AnswerCitation, type AnswerInput } from "./lib/answer-api";

type Article = (typeof articles)[number] & {
  source?: string;
  so_dieu?: string;
  so_khoan?: string;
  ngay_ban_hanh?: string | null;
  co_quan_ban_hanh?: string | null;
};
type Filters = {
  query: string;
  mode: string;
  category: string;
  from: string;
  to: string;
};
type Message = { text: string; kind: "user" | "assistant"; article?: Article; citations?: AnswerCitation[] };
const emptyFilters: Filters = {
  query: "",
  mode: "all",
  category: "all",
  from: "",
  to: "",
};

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
      {(article.source || !article.so_dieu) && <a href={article.source || source} target="_blank" rel="noopener noreferrer">
        Đối chiếu văn bản nguồn ↗
      </a>}
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
  const [results, setResults] = useState<Article[]>([]);
  const [resultEntrance, setResultEntrance] = useState({
    run: 0,
    instant: true,
  });
  const searchInstantRef = useRef(false);
  const [error, setError] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRequestRef = useRef(0);
  const [pagination, setPagination] = useState({ page: 1, total: 0 });
  const appliedFilters = useRef(filters);
  const [detailError, setDetailError] = useState("");
  const detailRequestRef = useRef(0);
  const [selectedArticle, setSelectedArticle] = useState<{
    article: Article;
    trigger: HTMLElement;
    origin: HTMLElement;
    instant: boolean;
  } | null>(null);
  const closeArticle = useCallback(() => {
    detailRequestRef.current++;
    setDetailError("");
    setSelectedArticle(null);
  }, []);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInstant, setChatInstant] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [pendingQuestion, setPendingQuestion] = useState<AnswerInput | null>(null);
  const chatRequest = useRef<AbortController | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const currentTitle =
    nav.find((item) => item.to === view)?.label ?? "Về dự án";

  useEffect(() => {
    chatRequest.current?.abort();
    chatRequest.current = null;
    setMessages([]);
    setQuestion("");
    setChatBusy(false);
    setChatError("");
    setConversationId(null);
    setPendingQuestion(null);
    setChatOpen(false);
    return () => chatRequest.current?.abort();
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

  async function search(next = filters, initial = false, page = 1) {
    detailRequestRef.current++;
    setDetailError("");
    const requestNumber = ++searchRequestRef.current;
    if (next.from && next.to && next.from > next.to) {
      setSearchLoading(false);
      setError("Ngày bắt đầu cần trước hoặc bằng ngày kết thúc.");
      return;
    }
    setError("");
    setSearchLoading(true);
    const instant = initial || searchInstantRef.current;
    try {
      const response = await publicSearchApi.search({ ...next, q: next.query, page });
      if (requestNumber !== searchRequestRef.current) return;
      setResults(response.items);
      appliedFilters.current = next;
      setPagination({ page: response.page, total: response.total });
      setResultEntrance((previous) => ({ run: previous.run + 1, instant }));
    } catch (caught) {
      if (requestNumber !== searchRequestRef.current) return;
      setResults([]);
      setPagination({ page: 1, total: 0 });
      setError(caught instanceof Error ? caught.message : "Không thể tải dữ liệu tra cứu.");
    } finally {
      if (requestNumber === searchRequestRef.current) setSearchLoading(false);
    }
  }
  useEffect(() => {
    if (view === "/search") void search({ ...filters }, true);
    return () => {
      searchRequestRef.current++;
      detailRequestRef.current++;
    };
    // Route change is the deliberate fetch boundary; typing does not call the API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);
  function suggest(query: string) {
    const next = {
      ...filters,
      query: query === "khái niệm" ? "" : query,
      mode: query === "Điều 44" ? "article" : "all",
      category: query === "khái niệm" ? "definition" : "all",
    };
    setFilters(next);
    void search(next);
  }
  function openArticle(
    article: Article,
    trigger: HTMLElement,
    instant: boolean,
  ) {
    const requestNumber = ++detailRequestRef.current;
    setDetailError("");
    const origin =
      trigger.closest<HTMLElement>(".cl-result, .cl-term-card") ?? trigger;
    const focusTarget = trigger.matches("button, a, [tabindex]")
      ? trigger
      : origin.querySelector<HTMLElement>(".cl-link-button, button, a") ?? trigger;
    const selection = {
      article,
      trigger: focusTarget,
      instant,
      origin,
    };
    setSelectedArticle(selection);

    if (article.so_dieu) {
      void publicSearchApi.detail(article.id).then((fresh) => {
        if (requestNumber === detailRequestRef.current && trigger.isConnected) {
          setSelectedArticle((prev) => (prev && prev.article.id === fresh.id ? { ...prev, article: fresh } : prev));
        }
      }).catch(() => {
        if (requestNumber === detailRequestRef.current && trigger.isConnected) {
          setDetailError("Không thể tải điều khoản. Nội dung có thể đã ngừng công bố; bạn đóng cửa sổ và tìm lại nhé.");
          setSelectedArticle((prev) => (prev && prev.article.id === article.id ? { ...prev, article: { ...article, text: "", note: "" } } : prev));
        }
      });
    }
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
  async function sendChat(value = question, retry = false) {
    if (chatRequest.current && !chatRequest.current.signal.aborted) return;
    const text = value.trim();
    if (!text && !retry) return;
    // Anonymous visitors keep the existing UI preview. Durable, grounded
    // answers are only requested after the server-authenticated session check.
    if (!isAuthenticated) {
      const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const article = lower.includes("hieu luc") ? articles[2] : lower.includes("an ninh mang") ? articles[1] : undefined;
      setMessages((previous) => [...previous, { kind: "user", text }, {
        kind: "assistant",
        text: article ? `Phản hồi mẫu: Căn cứ liên quan nằm tại Điều ${article.id}. Đăng nhập để lưu lịch sử và nhận truy hồi từ dữ liệu đã duyệt.` : "Đây là bản xem thử giao diện. Bạn đăng nhập để hỏi đáp với kho căn cứ đã duyệt.",
        article,
      }]);
      setQuestion("");
      return;
    }
    const input: AnswerInput = retry && pendingQuestion
      ? pendingQuestion
      : { question: text, request_id: crypto.randomUUID(), ...(conversationId ? { conversation_id: conversationId } : {}) };
    const controller = new AbortController();
    chatRequest.current = controller;
    setChatBusy(true); setChatError(""); setPendingQuestion(input);
    if (!retry) { setMessages(previous => [...previous, { kind: "user", text }]); setQuestion(""); }
    try {
      const result = await ask(input, controller.signal);
      if (!controller.signal.aborted) {
        setConversationId(result.conversation_id); setPendingQuestion(null);
        setHistoryRevision(previous => previous + 1);
        const citedArticle = result.citations[0] && articles.find((article) => article.id === result.citations[0].article);
        setMessages(previous => [...previous, { kind: "assistant", text: result.answer, citations: result.citations, article: citedArticle }]);
      }
    } catch (reason) {
      if (!controller.signal.aborted) {
        setChatError(reason instanceof AnswerError ? (reason.status === 401 ? "LOGIN_REQUIRED" : reason.message) : "CONNECTION_ERROR");
        if (reason instanceof AnswerError && [403, 404, 409, 422].includes(reason.status)) {
          setPendingQuestion(null);
          setQuestion(input.question);
          if (reason.status === 404) setConversationId(null);
        }
      }
    } finally {
      if (!controller.signal.aborted) { setChatBusy(false); chatRequest.current = null; chatInputRef.current?.focus(); }
    }
  }
  const articleButton = (article: Article, label = "Xem điều khoản") => (
    <button
      type="button"
      className="cl-link-button"
      onClick={(event) => {
        event.stopPropagation();
        openArticle(article, event.currentTarget, event.detail === 0);
      }}
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
                <p>Tìm theo từ khóa, tiêu đề hoặc số điều của Luật An ninh mạng.</p>
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
                void search();
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
                          void search();
                        }
                      }}
                      placeholder="Ví dụ: an ninh mạng hoặc Điều 2"
                      maxLength={120}
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
                    <option value="general">Quy định khác</option>
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
                      void search(emptyFilters);
                    }}
                  >
                    Đặt lại
                  </button>
                  <button className="cl-primary" type="submit">
                    <Search aria-hidden="true" />
                    {searchLoading ? "Đang tìm…" : "Tìm kiếm"}
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
                Tìm thấy <strong>{pagination.total} kết quả</strong>
              </h2>
              <span>Dữ liệu đã công bố · Luật số 116/2025/QH15</span>
            </div>
            <div data-admin-reveal="240">
              <div className="cl-search-status" role="status">{searchLoading ? "Đang tải kết quả…" : null}</div>
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
                    onClick={(event) => {
                      const selection = window.getSelection()?.toString();
                      if (selection && selection.trim().length > 0) return;
                      openArticle(
                        article,
                        event.currentTarget,
                        event.detail === 0,
                      );
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
                        {article.ngay_ban_hanh ? `Ban hành: ${article.ngay_ban_hanh.split("-").reverse().join("/")}` : "Luật số 116/2025/QH15"} {article.co_quan_ban_hanh ? ` · ${article.co_quan_ban_hanh}` : ""}
                      </span>
                    </div>
                    <div className="cl-result-bottom">
                      {articleButton(article)}
                    </div>
                  </motion.article>
                </ResultReveal>
              ))}
              {!results.length && !searchLoading && !error && (
                <div className="cl-empty-state">
                  <h3>Chưa tìm thấy kết quả phù hợp</h3>
                  <p>
                    Thử từ khóa “an ninh mạng”, “khái niệm” hoặc “Điều 44”.
                    <br />
                    Chỉ nội dung đã được duyệt và công bố mới xuất hiện trong kết quả.
                  </p>
                </div>
              )}
            </div>
            {pagination.total > 30 && <nav aria-label="Phân trang kết quả" className="cl-search-pagination">
              <button className="cl-text-button" disabled={searchLoading || pagination.page <= 1} onClick={(event) => { searchInstantRef.current = event.detail === 0; void search(appliedFilters.current, false, pagination.page - 1); }}>Trang trước</button>
              <span>Trang {pagination.page} / {Math.ceil(pagination.total / 30)}</span>
              <button className="cl-text-button" disabled={searchLoading || pagination.page >= Math.ceil(pagination.total / 30)} onClick={(event) => { searchInstantRef.current = event.detail === 0; void search(appliedFilters.current, false, pagination.page + 1); }}>Trang sau</button>
            </nav>}
            <div className="cl-source-note" data-admin-reveal="320">
              <BookOpen aria-hidden="true" />
              <span>
                Mỗi kết quả liên kết đến điều khoản và nguồn văn bản để bạn đối
                chiếu.
              </span>
            </div>
            </AdminTabReveal>
          </section>}
          {view === "/library" && <LibraryView />}
          {view === "/terms" && <TermsView selectedId={selectedArticle?.article.id} articleButton={articleButton} onOpenArticle={openArticle} />}
          {view === historyNavigation.to && isAuthenticated && <HistoryView key={currentUser?.ma_nguoi_dung} revision={historyRevision} previewMessages={messages} articleButton={articleButton} onOpenChat={() => openChat(false)} />}
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
                Tài khoản và tra cứu đã kết nối hệ thống. Hỏi đáp đang thử nghiệm
                truy hồi căn cứ cục bộ từ văn bản đã công bố.
              </p>
              <Link to="/search">Về trang tra cứu →</Link>
            </section>
          )}
          <footer className="cl-page-footer">
            <strong>CyberLaw</strong>
            <span>Đồ án môn Trí tuệ nhân tạo</span>
            <span>Hỏi đáp · Truy hồi căn cứ cục bộ</span>
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
          {conversationId && <button className="cl-text-button" disabled={chatBusy || !!pendingQuestion} onClick={() => { setMessages([]); setConversationId(null); setChatError(""); }}>Cuộc trò chuyện mới</button>}
          <div className="cl-message cl-assistant">
            <strong>Xin chào, tôi là trợ lý CyberLaw.</strong>
            <p>Bạn muốn tìm hiểu quy định nào về Luật An ninh mạng?</p>
          </div>
          <div className="cl-chat-prompts">
            {["Luật có hiệu lực từ khi nào?", "An ninh mạng là gì?"].map(
              (prompt) => (
                <button key={prompt} disabled={chatBusy || !!pendingQuestion} onClick={() => sendChat(prompt)}>
                  {prompt}
                </button>
              ),
            )}
          </div>
          {messages.map((message, index) => (
            <div key={index} className={`cl-message cl-${message.kind}`}>
              {message.text}
              {message.citations?.map((citation) => (
                <details key={citation.id} className="cl-chat-citation">
                  <summary>Căn cứ: Điều {citation.article}{citation.clause && ` khoản ${citation.clause}`}{citation.point && ` điểm ${citation.point}`}</summary>
                  <p>{citation.text}</p>
                  <small>{citation.law} · Phiên bản {citation.version}{citation.page ? ` · Trang ${citation.page}` : ""}</small>
                  {citation.source && <p><a href={citation.source} target="_blank" rel="noopener noreferrer">Đối chiếu nguồn ↗</a></p>}
                </details>
              ))}
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
        {chatBusy && <p role="status" className="cl-chat-status">Đang đối chiếu căn cứ…</p>}
        {chatError && <div role="alert" className="cl-chat-status">{chatError === "LOGIN_REQUIRED" ? <Link to="/login">Đăng nhập để hỏi đáp và lưu lịch sử</Link> : <>{chatError === "CONNECTION_ERROR" ? "Mất kết nối. Bạn thử lại cùng yêu cầu để tránh lưu trùng nhé." : chatError}{pendingQuestion && <button disabled={chatBusy} onClick={() => sendChat("", true)}>Thử lại</button>}</>}</div>}
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
            minLength={3}
            disabled={chatBusy || !!pendingQuestion}
            required
          />
          <button type="submit" aria-label="Gửi câu hỏi" disabled={chatBusy || !!pendingQuestion}>
            <Send aria-hidden="true" />
          </button>
        </form>
        <div className="cl-chat-disclaimer">
          Truy hồi cục bộ · Căn cứ từ Luật 116/2025/QH15
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
            {detailError ? <p role="alert">{detailError}</p> : <ArticleContent article={selectedArticle.article} sharedTitle />}
          </ArticleDialog>
        )}
      </AnimatePresence>
    </div>
  );
}
