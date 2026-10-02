import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react";
import { Dialog } from "radix-ui";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  MessageSquare,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { danhSachCauHoiGanDay, type CauHoiGanDay } from "@/lib/admin-data";
import "./recent-questions.css";

// Match the article-card spring already approved on the main search page.
const cardSpring = {
  type: "spring",
  stiffness: 190,
  damping: 25,
  mass: 0.85,
} as const;
const fade = { duration: 0.16 };

function QuestionSummary({
  item,
  index,
  detail = false,
  shared = true,
}: {
  item: CauHoiGanDay;
  index: number;
  detail?: boolean;
  shared?: boolean;
}) {
  return (
    <motion.span
      className="cl-question-summary"
      layout="position"
      layoutId={shared ? `question-summary-${item.ma_tin_nhan}` : undefined}
      transition={cardSpring}
    >
      <span
        className={`cl-comment-avatar ${index % 3 === 1 ? "user-alt-1" : index % 3 === 2 ? "user-alt-2" : ""}`}
        aria-hidden="true"
      >
        {item.avatar}
      </span>
      <span className="cl-question-summary-text">
        <span className="cl-question-byline">
          <span className="cl-comment-author">{item.nguoi_gui}</span>
          <span className="cl-comment-time">{item.thoi_gian}</span>
        </span>
        <span className="cl-comment-role">{item.vai_tro}</span>
        <span className={`cl-question-title ${detail ? "is-detail" : ""}`}>
          {item.cau_hoi}
        </span>
        <span className="cl-question-meta">
          <span className="cl-comment-badge">
            <CheckCircle2 size={12} aria-hidden="true" />
            {item.dieu_khoan_trich_dan}
          </span>
          {!detail && (
            <span className="cl-question-open-hint">
              Xem phản hồi <ChevronRight size={14} aria-hidden="true" />
            </span>
          )}
        </span>
      </span>
    </motion.span>
  );
}

function QuestionDetail({
  item,
  index,
  instant,
  trigger,
  onClose,
}: {
  item: CauHoiGanDay;
  index: number;
  instant: boolean;
  trigger: HTMLButtonElement | null;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const gentle = reduced || instant;
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  async function copyAnswer() {
    try {
      await navigator.clipboard.writeText(item.tra_loi_ai);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyState("idle"), 2500);
  }

  return (
    <Dialog.Portal forceMount>
      <Dialog.Overlay forceMount asChild>
        <motion.div
          className="cl-question-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={gentle ? fade : { duration: 0.35 }}
        />
      </Dialog.Overlay>
      <motion.div className="cl-question-dialog-frame" layoutRoot>
        <Dialog.Content
          forceMount
          asChild
          aria-describedby={`question-description-${item.ma_tin_nhan}`}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger?.focus({ preventScroll: true });
          }}
        >
          <motion.section
            className="cl-question-dialog"
            layoutId={gentle ? undefined : `question-card-${item.ma_tin_nhan}`}
            style={{ borderRadius: 20 }}
            initial={gentle ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            exit={gentle ? { opacity: 0 } : undefined}
            transition={instant ? { duration: 0 } : gentle ? fade : cardSpring}
          >
            <div className="cl-question-dialog-heading">
              <div>
                <Dialog.Title className="cl-question-eyebrow">
                  CHI TIẾT HỎI ĐÁP
                </Dialog.Title>
                <Dialog.Description
                  id={`question-description-${item.ma_tin_nhan}`}
                  className="cl-question-demo-note"
                >
                  Dữ liệu minh họa giao diện
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="cl-question-close"
                  aria-label="Đóng chi tiết hỏi đáp"
                >
                  <X size={20} />
                </button>
              </Dialog.Close>
            </div>
            <motion.div className="cl-question-dialog-scroll" layoutScroll>
              <QuestionSummary
                item={item}
                index={index}
                detail
                shared={!gentle}
              />
              <motion.div
                className="cl-question-detail-body"
                initial={{
                  opacity: 0,
                  transform: gentle ? "none" : "translateY(8px)",
                }}
                animate={{
                  opacity: 1,
                  transform: gentle ? "none" : "translateY(0px)",
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: instant ? 0 : 0.1 },
                }}
                transition={
                  instant
                    ? { duration: 0 }
                    : gentle
                      ? fade
                      : { duration: 0.3, delay: 0.16, ease: [0.23, 1, 0.32, 1] }
                }
              >
                <section className="cl-comment-ai-box" aria-label="Phản hồi AI">
                  <div className="cl-ai-box-header">
                    <h4 className="cl-ai-box-title">
                      <Sparkles size={15} />
                      Phản hồi của Trợ lý AI
                    </h4>
                    <div className="cl-ai-box-badges">
                      <span
                        className="cl-ai-badge-confidence"
                        title={
                          item.confidence_note ??
                          "Điểm bằng chứng truy hồi, không phải độ chính xác pháp lý"
                        }
                      >
                        <ShieldCheck size={12} />
                        Độ tin cậy: {item.do_tin_cay}
                      </span>
                      <span className="cl-ai-badge-time">
                        <Clock size={12} />
                        {item.thoi_gian_xu_ly}
                      </span>
                    </div>
                  </div>
                  <p className="cl-ai-box-text">{item.tra_loi_ai}</p>
                </section>
                <section
                  className="cl-comment-legal-box"
                  aria-label="Căn cứ pháp lý"
                >
                  <div className="cl-legal-box-header">
                    <h4 className="cl-legal-box-title">
                      <Scale size={15} />
                      Căn cứ pháp lý
                      <span className="cl-legal-tag">{item.loai_quy_dinh}</span>
                    </h4>
                  </div>
                  <blockquote className="cl-legal-quote">
                    {item.trich_doan_luat}
                  </blockquote>
                  {item.muc_phat && (
                    <div className="cl-legal-penalty">
                      <ShieldAlert size={15} />
                      <span>
                        <strong>Chế tài & Xử lý:</strong> {item.muc_phat}
                      </span>
                    </div>
                  )}
                </section>
                <div className="cl-question-actions">
                  <button
                    type="button"
                    className="cl-question-action"
                    onClick={copyAnswer}
                  >
                    {copyState === "copied" ? (
                      <Check size={15} />
                    ) : (
                      <Copy size={15} />
                    )}
                    <span aria-live="polite">
                      {copyState === "copied"
                        ? "Đã sao chép"
                        : copyState === "error"
                          ? "Chưa sao chép được"
                          : "Sao chép phản hồi"}
                    </span>
                  </button>
                  <Link
                    to="/library"
                    className="cl-question-action is-primary"
                    onClick={onClose}
                  >
                    <BookOpen size={15} />
                    Mở thư viện pháp luật
                    <ArrowUpRight size={15} />
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          </motion.section>
        </Dialog.Content>
      </motion.div>
    </Dialog.Portal>
  );
}

export function RecentQuestionsCard({ items = danhSachCauHoiGanDay }: { items?: CauHoiGanDay[] }) {
  const [selected, setSelected] = useState<CauHoiGanDay | null>(null);
  const [instant, setInstant] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const reduced = useReducedMotion();
  const shared = !reduced && !instant;

  return (
    <section
      className="cl-stats-card cl-recent-questions"
      data-admin-reveal="300"
      aria-labelledby="recent-questions-heading"
    >
      <div className="cl-stats-card-header">
        <div>
          <h3 id="recent-questions-heading">
            <MessageSquare size={17} color="#800020" />
            Hỏi đáp AI & Căn cứ Pháp lý gần đây
          </h3>
          <p>
            Chọn câu hỏi để xem phản hồi và căn cứ trích dẫn trong phạm vi được phép
          </p>
        </div>
      </div>
      <LayoutGroup id="admin-recent-questions">
        <Dialog.Root
          open={selected !== null}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
        >
          <div className="cl-comments-list">
            {items.length === 0 ? (
              <div className="cl-question-empty-wrapper">
                <MessageSquare size={26} className="cl-question-empty-icon" aria-hidden="true" />
                <p className="cl-question-empty">Chưa có câu hỏi trong khoảng thời gian này.</p>
                <span className="cl-question-empty-hint">
                  Các câu hỏi mới trao đổi với trợ lý AI sẽ tự động xuất hiện tại đây cùng căn cứ pháp lý được trích dẫn.
                </span>
              </div>
            ) : items.map((item, index) => (
              <motion.button
                type="button"
                key={item.ma_tin_nhan}
                className="cl-question-card"
                aria-haspopup="dialog"
                aria-label={`Xem hỏi đáp của ${item.nguoi_gui}: ${item.cau_hoi}`}
                layoutId={
                  shared ? `question-card-${item.ma_tin_nhan}` : undefined
                }
                layoutDependency={selected?.ma_tin_nhan === item.ma_tin_nhan}
                transition={
                  instant ? { duration: 0 } : reduced ? fade : cardSpring
                }
                style={{ borderRadius: 20 }}
                onClick={(event) => {
                  trigger.current = event.currentTarget;
                  setInstant(event.detail === 0);
                  setSelected(item);
                }}
              >
                <QuestionSummary item={item} index={index} shared={shared} />
              </motion.button>
            ))}
          </div>
          <AnimatePresence
            initial={false}
            onExitComplete={() => setInstant(false)}
          >
            {selected && (
              <QuestionDetail
                key={selected.ma_tin_nhan}
                item={selected}
                index={items.indexOf(selected)}
                instant={instant}
                trigger={trigger.current}
                onClose={() => setSelected(null)}
              />
            )}
          </AnimatePresence>
        </Dialog.Root>
      </LayoutGroup>
    </section>
  );
}
