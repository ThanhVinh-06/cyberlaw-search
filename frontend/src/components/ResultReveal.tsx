import { useLayoutEffect, useRef, type ReactNode } from "react";

type Props = {
  run: number;
  index: number;
  instant: boolean;
  children: ReactNode;
};

// Keep the entrance on a wrapper so the article's shared layout animation
// remains free to expand into its dialog.
export function ResultReveal({ run, index, instant, children }: Props) {
  const elementRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const previous = animationRef.current;
    const interrupted = previous?.playState === "running";
    const current = interrupted ? getComputedStyle(element) : null;
    const from = {
      opacity: current?.opacity ?? "0",
      transform: reduced ? "none" : (current?.transform ?? "translateY(16px)"),
    };
    previous?.cancel();
    animationRef.current = null;
    if (!run || instant) return;

    const animation = element.animate(
      reduced
        ? [{ opacity: from.opacity }, { opacity: 1 }]
        : [from, { opacity: 1, transform: "none" }],
      {
        // Leave a little more time to follow the cards, as requested.
        duration: reduced ? 160 : 950,
        delay: reduced || interrupted ? 0 : Math.min(index, 5) * 80,
        easing: getComputedStyle(element).getPropertyValue("--ease-out").trim(),
        fill: "backwards",
      },
    );
    animationRef.current = animation;
    animation.onfinish = () => {
      if (animationRef.current === animation) animationRef.current = null;
    };
  }, [run, index, instant]);

  useLayoutEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => {
      if (preference.matches) animationRef.current?.cancel();
    };
    preference.addEventListener("change", changed);
    return () => {
      preference.removeEventListener("change", changed);
      animationRef.current?.cancel();
    };
  }, []);

  function settle() {
    animationRef.current?.cancel();
    animationRef.current = null;
  }

  return (
    <div
      ref={elementRef}
      className="cl-result-reveal"
      onClickCapture={settle}
      onKeyDownCapture={settle}
      onFocusCapture={(event) => {
        if (event.target.matches(":focus-visible")) settle();
      }}
    >
      {children}
    </div>
  );
}
