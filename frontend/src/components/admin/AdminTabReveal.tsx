import { useLayoutEffect, useRef, type ReactNode } from "react";

export function AdminTabReveal({
  tab,
  instant,
  duration = 350,
  children,
}: {
  tab: string;
  instant: boolean;
  duration?: number;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const animations = useRef(new Map<HTMLElement, Animation>());

  function settle() {
    animations.current.forEach((animation) => animation.cancel());
    animations.current.clear();
  }

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = Array.from(
      root.querySelectorAll<HTMLElement>("[data-admin-reveal]"),
    );
    // On rapid tab changes, retained sections continue from their current frame.
    const starts = targets.map((element) => {
      const interrupted =
        animations.current.get(element)?.playState === "running";
      const style = getComputedStyle(element);
      return {
        element,
        interrupted,
        opacity: interrupted ? style.opacity : "0",
        translate: interrupted ? style.translate : "0 14px",
      };
    });
    settle();
    if (instant) return;
    const easing = getComputedStyle(root).getPropertyValue("--ease-out").trim();
    starts.forEach(({ element, interrupted, opacity, translate }) => {
      const animation = element.animate(
        reduced
          ? [{ opacity }, { opacity: 1 }]
          : [
              { opacity, translate },
              { opacity: 1, translate: "0 0" },
            ],
        {
          duration: reduced ? 160 : duration,
          delay:
            reduced || interrupted ? 0 : Number(element.dataset.adminReveal),
          easing,
          fill: "backwards",
        },
      );
      // Independent translate leaves existing hover transforms unchanged.
      animations.current.set(element, animation);
      animation.onfinish = () => {
        if (animations.current.get(element) === animation)
          animations.current.delete(element);
      };
    });
  }, [tab, instant, duration]);

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
      ref={rootRef}
      className="cl-admin-tab-content"
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
