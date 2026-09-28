import {
  useId,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Dialog } from "radix-ui";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import "./admin-dialog.css";

// Match the centered ArticleDialog entrance used by the legal glossary.
const articleSpring = {
  type: "spring",
  stiffness: 190,
  damping: 25,
  mass: 0.85,
} as const;

const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotionPreference(callback: () => void) {
  const preference = matchMedia(motionQuery);
  preference.addEventListener("change", callback);
  return () => preference.removeEventListener("change", callback);
}
const getMotionPreference = () => matchMedia(motionQuery).matches;

function DialogFields({
  children,
  revealKey,
  instant,
}: {
  children: ReactNode;
  revealKey: string;
  instant: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const animations = useRef<Animation[]>([]);
  function settle() {
    animations.current.forEach((animation) => animation.cancel());
    animations.current = [];
  }

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const selected = Array.from(
      element.querySelectorAll<HTMLElement>(
        ".cl-admin-form-group, [data-dialog-reveal]",
      ),
    );
    const targets = selected.length
      ? selected.filter(
          (target) =>
            !selected.some(
              (parent) => parent !== target && parent.contains(target),
            ),
        )
      : Array.from(
          element.querySelectorAll<HTMLElement>(
            ".cl-admin-modal-body > *, .cl-knowledge-detail > *, .cl-knowledge-confirm > *",
          ),
        );
    settle();
    if (!instant) {
      const easing = getComputedStyle(element)
        .getPropertyValue("--ease-out")
        .trim();
      animations.current = targets.map((target, index) =>
        target.animate(
          reduced
            ? [{ opacity: 0 }, { opacity: 1 }]
            : [
                { opacity: 0, translate: "0 14px" },
                { opacity: 1, translate: "0 0" },
              ],
          {
            duration: reduced ? 160 : 400,
            delay: reduced ? 0 : 120 + Math.min(index, 6) * 50,
            easing,
            fill: "backwards",
          },
        ),
      );
    }
    // Only opening/mode changes replay the entrance, never typing or validation.
    return settle;
  }, [revealKey, instant]);

  useLayoutEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => {
      if (preference.matches) settle();
    };
    preference.addEventListener("change", changed);
    return () => {
      preference.removeEventListener("change", changed);
      settle();
    };
  }, []);

  return (
    <div
      className="cl-admin-dialog-content"
      ref={root}
      onPointerDownCapture={settle}
      onKeyDownCapture={settle}
      onFocusCapture={(event) => {
        if (event.target.matches(":focus-visible")) settle();
      }}
    >
      {children}
    </div>
  );
}

export function AdminDialog({
  open,
  title,
  description,
  instant = false,
  trigger,
  onClose,
  children,
  className = "cl-admin-modal-container",
  revealKey,
  titleClassName,
}: {
  open: boolean;
  title: ReactNode;
  description?: string;
  instant?: boolean;
  trigger: HTMLElement | null;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  revealKey: string;
  titleClassName?: string;
}) {
  const reduced = useSyncExternalStore(
    subscribeMotionPreference,
    getMotionPreference,
    () => false,
  );
  const gentle = reduced || instant;
  const closeButton = useRef<HTMLButtonElement>(null);
  const descriptionId = useId();
  const transition = instant
    ? { duration: 0 }
    : reduced
      ? { duration: 0.16 }
      : articleSpring;
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay forceMount asChild>
              <motion.div
                className="cl-admin-dialog-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: instant ? 0 : reduced ? 0.16 : 0.45,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />
            </Dialog.Overlay>
            <div className="cl-admin-dialog-frame">
              <Dialog.Content
                forceMount
                asChild
                aria-describedby={description ? descriptionId : undefined}
                onOpenAutoFocus={(event) => {
                  event.preventDefault();
                  closeButton.current?.focus({ preventScroll: true });
                }}
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  if (trigger?.isConnected)
                    trigger.focus({ preventScroll: true });
                  else
                    document
                      .querySelector<HTMLElement>(
                        "[data-admin-user-add], [data-knowledge-add]",
                      )
                      ?.focus({ preventScroll: true });
                }}
              >
                <motion.section
                  className={`cl-admin-dialog-surface ${className}`}
                  initial={{
                    opacity: 0,
                    transform: gentle ? "none" : "translateY(18px) scale(0.94)",
                  }}
                  animate={{
                    opacity: 1,
                    transform: gentle ? "none" : "translateY(0px) scale(1)",
                  }}
                  exit={{
                    opacity: 0,
                    transform: gentle ? "none" : "translateY(12px) scale(0.96)",
                  }}
                  transition={transition}
                >
                  <header className="cl-admin-dialog-header">
                    <div>
                      <Dialog.Title className={titleClassName}>
                        {title}
                      </Dialog.Title>
                      {description && (
                        <Dialog.Description id={descriptionId}>
                          {description}
                        </Dialog.Description>
                      )}
                    </div>
                    <Dialog.Close asChild>
                      <button
                        ref={closeButton}
                        type="button"
                        className="cl-admin-dialog-close"
                        aria-label="Đóng hộp thoại"
                      >
                        <X size={20} />
                      </button>
                    </Dialog.Close>
                  </header>
                  <DialogFields revealKey={revealKey} instant={instant}>
                    {children}
                  </DialogFields>
                </motion.section>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
