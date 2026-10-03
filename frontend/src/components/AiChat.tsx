import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Send } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { articles, source } from "../lib/articles";
import { ask, AnswerError, type AnswerCitation, type AnswerInput } from "../lib/answer-api";
import { libraryApi } from "../lib/library-api";
import { ArticleDialog } from "./ArticleDialog";
import { ChatPopover } from "./ChatPopover";

/** Same article shape the search results use, plus fields only the chat path needs. */
export type ChatArticle = (typeof articles)[number] & {
  source?: string;
  so_dieu?: string;
  so_khoan?: string;
  ngay_ban_hanh?: string | null;
  co_quan_ban_hanh?: string | null;
  /** Built from the public library endpoint: id is the article number, so never refetch by id. */
  skipDetail?: boolean;
};

type Message = {
  text: string;
  kind: "user" | "assistant";
  article?: ChatArticle;
  citations?: AnswerCitation[];
};

type Props = {
  className?: string;
  /** Raised after a stored answer, so the history view can refresh. */
  onAnswered?: () => void;
};

/** Lets the site chrome (sidebar entry point) open the panel owned by AiChat. */
export type AiChatHandle = { open: (instant?: boolean) => void };

/**
 * The AI assistant, shared by the public site and the account pages. It always calls the
 * real endpoint: anonymous visitors get the same grounded answers as signed-in users,
 * their threads are stored with a null owner and are never listed back to them.
 */
export const AiChat = forwardRef<AiChatHandle, Props>(function AiChat({ className = "", onAnswered }, ref) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInstant, setChatInstant] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<AnswerInput | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<{
    article: ChatArticle;
    trigger: HTMLElement;
    origin: HTMLElement;
    instant: boolean;
  } | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const chatRequest = useRef<AbortController | null>(null);

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
  useEffect(() => () => chatRequest.current?.abort(), []);

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
  // No dependency array: the handle is rebuilt each render so `open` is never stale.
  useImperativeHandle(ref, () => ({ open: openChat }));
  const closeArticle = useCallback(() => setSelectedArticle(null), []);

  /**
   * Citations only carry an article number. Resolve it through the public library endpoint
   * so every article gets an "open" button, not just the ones hardcoded in lib/articles.
   * The dialog is not refetched (skipDetail) because id is the article number, not ma_dieu_khoan.
   */
  async function resolveArticle(citation: AnswerCitation, signal: AbortSignal): Promise<ChatArticle | undefined> {
    const fallback = articles.find((article) => article.id === citation.article);
    try {
      const detail = await libraryApi.article(citation.article, signal);
      if (signal.aborted) return fallback;
      return {
        id: citation.article,
        category: "general",
        label: `Điều ${citation.article}`,
        title: `Điều ${citation.article}. ${detail.tieu_de}`,
        summary: "",
        text: detail.units.map((unit) => unit.noi_dung).join("\n\n"),
        note: `Luật số ${detail.document.so_hieu} · Phiên bản ${detail.document.phien_ban_noi_dung}`,
        source: detail.document.source || source,
        so_dieu: citation.article,
        skipDetail: true,
      };
    } catch {
      return fallback;
    }
  }

  function openArticle(article: ChatArticle, trigger: HTMLElement, instant: boolean) {
    const origin = trigger.closest<HTMLElement>(".cl-result, .cl-term-card") ?? trigger;
    const focusTarget = trigger.matches("button, a, [tabindex]")
      ? trigger
      : origin.querySelector<HTMLElement>(".cl-link-button, button, a") ?? trigger;
    setSelectedArticle({ article, trigger: focusTarget, instant, origin });
  }

  async function sendChat(value = question, retry = false) {
    if (chatRequest.current && !chatRequest.current.signal.aborted) return;
    const text = value.trim();
    if (!text && !retry) return;
    const input: AnswerInput = retry && pendingQuestion
      ? pendingQuestion
      : { question: text, request_id: crypto.randomUUID(), ...(conversationId ? { conversation_id: conversationId } : {}) };
    const controller = new AbortController();
    chatRequest.current = controller;
    setChatBusy(true); setChatError(""); setPendingQuestion(input);
    if (!retry) { setMessages(previous => [...previous, { kind: "user", text }]); setQuestion(""); }
    try {
      const result = await ask(input, controller.signal);
      if (controller.signal.aborted) return;
      setConversationId(result.conversation_id); setPendingQuestion(null);
      onAnswered?.();
      setMessages(previous => [...previous, { kind: "assistant", text: result.answer, citations: result.citations }]);
      const resolved = await Promise.all(result.citations.map((citation) => resolveArticle(citation, controller.signal)));
      if (controller.signal.aborted) return;
      setMessages(previous => {
        const last = previous[previous.length - 1];
        if (!last || last.kind !== "assistant" || last.citations !== result.citations) return previous;
        return [...previous.slice(0, -1), { ...last, article: resolved.find(Boolean) }];
      });
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

  return (
    <>
      <ChatPopover
        className={className}
        open={chatOpen}
        instant={chatInstant}
        articleOpen={!!selectedArticle}
        launcherRef={launcherRef}
        onOpen={openChat}
        onClose={closeChat}
      >
        <div className="cl-chat-messages" ref={logRef} role="log" aria-live="polite">
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
                  <button
                    type="button"
                    className="cl-link-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openArticle(message.article!, event.currentTarget, event.detail === 0);
                    }}
                  >
                    Mở Điều {message.article.so_dieu ?? message.article.id}
                    <ArrowRight aria-hidden="true" />
                  </button>
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
            <ArticleBody article={selectedArticle.article} />
          </ArticleDialog>
        )}
      </AnimatePresence>
    </>
  );
});

/** Mirrors the search-result body so the dialog looks the same from chat and from results. */
function ArticleBody({ article }: { article: ChatArticle }) {
  return (
    <>
      <p className="cl-document-meta">
        LUẬT SỐ 116/2025/QH15 · NGUYÊN VĂN TRÍCH ĐOẠN
      </p>
      <h2>{article.title}</h2>
      {article.text.split("\n\n").map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <p className="cl-document-meta">{article.note}</p>
      {(article.source || !article.so_dieu) && (
        <a href={article.source || source} target="_blank" rel="noopener noreferrer">
          Đối chiếu văn bản nguồn ↗
        </a>
      )}
    </>
  );
}
