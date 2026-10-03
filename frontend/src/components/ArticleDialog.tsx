import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";
import { X } from "lucide-react";
import "./article-dialog.css";

/** Minimal shape the dialog renders; both lib/articles and chat-built articles satisfy it. */
type DialogArticle = { id: string; title: string; label: string; text: string };

// Exit animation can overlap the next dialog. Restore scrolling only after
// the last mounted dialog releases its lock.
let scrollLocks = 0;
let savedOverflow = "";
let savedPadding = "";

type Props = {
  article: DialogArticle;
  trigger: HTMLElement;
  origin: HTMLElement;
  instant?: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function ArticleDialog({
  article,
  trigger,
  origin,
  instant = false,
  onClose,
  children,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();
  const isReducedOrInstant = reducedMotion || instant;

  // Lock body scroll while open and restore on unmount
  useLayoutEffect(() => {
    if (scrollLocks === 0) {
      savedOverflow = document.body.style.overflow;
      savedPadding = document.body.style.paddingRight;
    }
    scrollLocks++;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbar > 0) {
      document.body.style.paddingRight = `${scrollbar}px`;
    }

    return () => {
      scrollLocks--;
      if (scrollLocks === 0) {
        document.body.style.overflow = savedOverflow;
        document.body.style.paddingRight = savedPadding;
      }
      if (scrollLocks === 0 && trigger && trigger.isConnected) {
        trigger.focus({ preventScroll: true });
      }
    };
  }, [trigger]);

  // Trap focus and handle Escape key for accessibility
  useEffect(() => {
    closeButtonRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const focusables = dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );

        if (!focusables.length) {
          event.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (event.shiftKey) {
          if (
            document.activeElement === first ||
            document.activeElement === dialog
          ) {
            event.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Spring transition modeled after Emil Kowalski's animations.dev philosophy
  const springTransition: Transition = isReducedOrInstant
    ? { duration: 0.16, ease: "easeOut" }
    : {
        type: "spring",
        stiffness: 190,
        damping: 25,
        mass: 0.85,
      };

  // Check if opening from an on-screen search card
  const isFromSearchCard = origin && origin.matches(".cl-result, .cl-term-card");

  return (
    <div className="cl-article-dialog-root">
      {/* Fullscreen blurred backdrop */}
      <motion.div
        className="cl-article-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: isReducedOrInstant ? 0.16 : 0.45,
          ease: [0.16, 1, 0.3, 1],
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centered modal container */}
      <div
        className="cl-article-dialog-container"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <motion.div
          ref={dialogRef}
          id="cl-article-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Căn cứ pháp lý"
          tabIndex={-1}
          layoutId={
            !isReducedOrInstant && isFromSearchCard
              ? `article-card-${article.id}`
              : undefined
          }
          initial={
            isReducedOrInstant
              ? { opacity: 0 }
              : isFromSearchCard
                ? undefined
                : { opacity: 0, scale: 0.94, y: 18 }
          }
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={
            isReducedOrInstant
              ? { opacity: 0 }
              : isFromSearchCard
                ? undefined
                : { opacity: 0, scale: 0.96, y: 12 }
          }
          transition={springTransition}
          className="cl-article-modal"
          onClick={(event) => event.stopPropagation()}
        >
          {/* Header with category badge & tactile close button */}
          <header className="cl-modal-header">
            <div className="cl-modal-meta-row">
              <span className="cl-eyebrow">CĂN CỨ PHÁP LÝ</span>
              <span className="cl-result-category">
                {article.label.toUpperCase()} · 116/2025/QH15
              </span>
            </div>
            <button
              ref={closeButtonRef}
              className="cl-icon-button"
              aria-label="Đóng căn cứ"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" />
            </button>
          </header>

          {/* Scrollable legal text body with staggered silky fade-up */}
          <div className="cl-modal-scroll-area">
            <motion.div
              className="cl-modal-content-wrapper"
              initial={
                isReducedOrInstant ? { opacity: 1 } : { opacity: 0, y: 14 }
              }
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                delay: isReducedOrInstant ? 0 : 0.12,
                duration: isReducedOrInstant ? 0.16 : 0.4,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <article id="cl-article-content">{children}</article>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
