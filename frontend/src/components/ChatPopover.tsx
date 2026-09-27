import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useIsPresent,
  usePresenceData,
  useReducedMotion,
  type Transition,
} from "motion/react";
import { X } from "lucide-react";
import "./ChatPopover.css";

type Props = {
  className?: string;
  open: boolean;
  instant: boolean;
  articleOpen: boolean;
  launcherRef: RefObject<HTMLButtonElement | null>;
  onOpen: (instant: boolean) => void;
  onClose: (instant?: boolean, restoreFocus?: boolean) => void;
  children: ReactNode;
};

const spring: Transition = { type: "spring", duration: 0.5, bounce: 0.1 };
const easeOut = [0.23, 1, 0.32, 1] as const;

function ChatPanel({
  instant,
  reduced,
  onClose,
  children,
}: {
  instant: boolean;
  reduced: boolean;
  onClose: Props["onClose"];
  children: ReactNode;
}) {
  const present = useIsPresent();
  const exitInstant = usePresenceData() as boolean;
  const skip = instant || (!present && exitInstant);
  const gentle = skip || reduced;
  const fade = skip ? 0 : reduced ? 0.16 : 0.2;
  return (
    <motion.section
      id="cl-chat-panel"
      className="cl-chat-panel"
      role="dialog"
      aria-label="Trò chuyện với trợ lý CyberLaw"
      aria-modal="false"
      aria-hidden={!present || undefined}
      inert={!present}
      layoutId={gentle ? undefined : "chat-surface"}
      style={{ borderRadius: 20, pointerEvents: present ? "auto" : "none" }}
      initial={gentle ? { opacity: skip ? 1 : 0 } : undefined}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        layout: gentle ? { duration: 0 } : spring,
        opacity: { duration: fade, ease: easeOut },
      }}
    >
      <motion.header
        className="cl-chat-header"
        layout={gentle ? false : "position"}
      >
        <motion.span
          className="cl-chat-avatar"
          layoutId={gentle ? undefined : "chat-avatar"}
          style={{ borderRadius: 999 }}
          transition={gentle ? { duration: 0 } : spring}
        >
          <img src="/assets/ai-assistant.png" alt="" width="51" height="51" />
        </motion.span>
        <motion.div
          className="cl-chat-heading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: fade, delay: gentle ? 0 : 0.08 }}
        >
          <strong>Trợ lý CyberLaw</strong>
          <span>Hỗ trợ tra cứu pháp luật</span>
        </motion.div>
        <button
          className="cl-icon-button"
          type="button"
          aria-label="Đóng trò chuyện"
          onClick={(event) => onClose(event.detail === 0)}
        >
          <X aria-hidden="true" />
        </button>
      </motion.header>
      <motion.div
        className="cl-chat-content"
        layout={gentle ? false : "position"}
        initial={{
          opacity: skip ? 1 : 0,
          transform: gentle ? "none" : "translateY(8px)",
        }}
        animate={{ opacity: 1, transform: "none" }}
        exit={{
          opacity: 0,
          transform: gentle ? "none" : "translateY(8px)",
          transition: { duration: skip ? 0 : 0.12 },
        }}
        transition={{ duration: fade, delay: gentle ? 0 : 0.12, ease: easeOut }}
      >
        {children}
      </motion.div>
    </motion.section>
  );
}

export function ChatPopover({
  className = "",
  open,
  instant,
  articleOpen,
  launcherRef,
  onOpen,
  onClose,
  children,
}: Props) {
  const id = useId();
  const dockRef = useRef<HTMLDivElement>(null);
  const reduced = !!useReducedMotion();
  const gentle = instant || reduced;
  useEffect(() => {
    if (!open || articleOpen) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Element;
      if (
        !dockRef.current?.contains(target) &&
        !target.closest(".cl-article-dialog-root")
      )
        onClose(false, false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, articleOpen, onClose]);

  return (
    <LayoutGroup id={id}>
      <motion.div
        className={`cl-chat-dock ${className}`}
        data-open={open}
        ref={dockRef}
        layoutRoot
      >
        <motion.button
          className="cl-chat-launcher"
          ref={launcherRef}
          type="button"
          aria-label="Mở trò chuyện với trợ lý AI"
          aria-expanded={open}
          aria-controls={open ? "cl-chat-panel" : undefined}
          aria-hidden={open || undefined}
          inert={open}
          tabIndex={open ? -1 : 0}
          layoutId={gentle ? undefined : "chat-surface"}
          style={{ borderRadius: 24, pointerEvents: open ? "none" : "auto" }}
          initial={false}
          animate={{ opacity: open ? 0 : 1 }}
          transition={{
            layout: gentle ? { duration: 0 } : spring,
            opacity: { duration: instant ? 0 : 0.16 },
          }}
          onClick={(event) => onOpen(event.detail === 0)}
        >
          <motion.span
            className="cl-launcher-label"
            layout={gentle ? false : "position"}
          >
            Hỏi trợ lý AI <small>Tìm hiểu luật dễ dàng hơn</small>
          </motion.span>
          <motion.span
            className="cl-avatar-wrap"
            layoutId={gentle ? undefined : "chat-avatar"}
            style={{ borderRadius: 999 }}
            transition={gentle ? { duration: 0 } : spring}
          >
            <img src="/assets/ai-assistant.png" alt="" width="96" height="96" />
          </motion.span>
        </motion.button>
        <AnimatePresence initial={false} custom={instant}>
          {open && (
            <ChatPanel
              key="chat-panel"
              instant={instant}
              reduced={reduced}
              onClose={onClose}
            >
              {children}
            </ChatPanel>
          )}
        </AnimatePresence>
      </motion.div>
    </LayoutGroup>
  );
}
