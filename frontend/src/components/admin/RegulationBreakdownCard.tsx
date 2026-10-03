import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { motion, useMotionValue } from "motion/react";
import { Pin, Scale } from "lucide-react";
import type { NhomQuyDinhSparkline } from "@/lib/admin-data";
import "./regulation-breakdown.css";

const PLOT = {
  width: 300,
  height: 96,
  left: 30,
  right: 291,
  top: 17,
  bottom: 72,
};

function getTooltipTransform(
  element: HTMLDivElement,
  tooltip: HTMLDivElement | null,
  anchor: { x: number; y: number },
) {
  const bounds = element.getBoundingClientRect();
  const tooltipWidth = tooltip?.offsetWidth ?? 128;
  const tooltipHeight = tooltip?.offsetHeight ?? 54;
  const x = Math.max(
    0,
    Math.min(
      bounds.width - tooltipWidth,
      anchor.x * bounds.width - tooltipWidth / 2,
    ),
  );
  const cardTop =
    element.closest(".cl-reg-card")?.getBoundingClientRect().top ?? bounds.top;
  const y = Math.max(
    8 - bounds.top,
    cardTop + 12 - bounds.top,
    anchor.y * bounds.height - tooltipHeight - 10,
  );
  return `translate3d(${x}px, ${y}px, 0px)`;
}

function getChart(values: number[]) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum || 1;
  const points = values.map((value, index) => ({
    x:
      PLOT.left +
      (index / Math.max(1, values.length - 1)) * (PLOT.right - PLOT.left),
    y: PLOT.bottom - ((value - minimum) / range) * (PLOT.bottom - PLOT.top),
  }));
  const line = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const midpoint = (previous.x + point.x) / 2;
    return `${path} C ${midpoint} ${previous.y}, ${midpoint} ${point.y}, ${point.x} ${point.y}`;
  }, "");

  return {
    points,
    line,
    area: `${line} L ${PLOT.right} ${PLOT.bottom + 3} L ${PLOT.left} ${PLOT.bottom + 3} Z`,
    minimum,
    maximum,
  };
}

function RegulationSparkline({ group }: { group: NhomQuyDinhSparkline }) {
  const id = useId();
  const chartRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const lastIndex = useRef(group.sparkline.length - 1);
  const tooltipAnchor = useRef({ x: 1, y: 0.5 });
  const tooltipTransform = useMotionValue("translate3d(0px, 0px, 0px)");
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  const [keyboardInput, setKeyboardInput] = useState(false);
  const [animatePoint, setAnimatePoint] = useState(false);
  const { points, line, area, minimum, maximum } = getChart(group.sparkline);
  const selectedIndex = pinnedIndex ?? previewIndex;
  const hasSelection = selectedIndex !== null;
  // Keep the last location during exit instead of jumping to the final point.
  const valueIndex = selectedIndex ?? lastIndex.current;
  const point = points[valueIndex];
  const value = group.sparkline[valueIndex];

  function showPoint(
    index: number,
    element: HTMLDivElement,
    anchor = {
      x: points[index].x / PLOT.width,
      y: points[index].y / PLOT.height,
    },
  ) {
    lastIndex.current = index;
    tooltipAnchor.current = anchor;
    // Falcon's tooltip follows the pointer directly; only the axis marker eases.
    tooltipTransform.set(
      getTooltipTransform(element, tooltipRef.current, anchor),
    );
    setAnimatePoint(hasSelection);
    setPreviewIndex(index);
  }

  useEffect(() => {
    const element = chartRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      tooltipTransform.set(
        getTooltipTransform(element, tooltipRef.current, tooltipAnchor.current),
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [tooltipTransform]);

  function indexFromPointer(event: MouseEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * PLOT.width;
    return Math.max(
      0,
      Math.min(
        group.sparkline.length - 1,
        Math.round(
          ((x - PLOT.left) / (PLOT.right - PLOT.left)) *
            (group.sparkline.length - 1),
        ),
      ),
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = selectedIndex ?? group.sparkline.length - 1;
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight" || event.key === "ArrowUp")
      nextIndex = Math.min(currentIndex + 1, group.sparkline.length - 1);
    if (event.key === "ArrowLeft" || event.key === "ArrowDown")
      nextIndex = Math.max(currentIndex - 1, 0);
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = group.sparkline.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      setKeyboardInput(true);
      setPinnedIndex(nextIndex);
      showPoint(nextIndex, event.currentTarget);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setKeyboardInput(true);
      setPinnedIndex(pinnedIndex === null ? currentIndex : null);
      if (pinnedIndex === null) showPoint(currentIndex, event.currentTarget);
      else setPreviewIndex(null);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setKeyboardInput(true);
      setPinnedIndex(null);
      setPreviewIndex(null);
    }
  }

  return (
    <li className="cl-reg-item">
      <div className="cl-reg-heading">
        <span className="cl-reg-name" id={`${id}-name`}>
          <span
            className="cl-reg-dot"
            style={{ backgroundColor: group.mau_sac }}
          />
          {group.ten_loai}
        </span>
        <strong>{group.so_luong}</strong>
      </div>
      <div
        ref={chartRef}
        className="cl-reg-chart"
        role="slider"
        tabIndex={0}
        aria-labelledby={`${id}-name`}
        aria-describedby={`${id}-instructions`}
        aria-orientation="horizontal"
        aria-valuemin={1}
        aria-valuemax={group.sparkline.length}
        aria-valuenow={valueIndex + 1}
        aria-valuetext={`Mốc ${valueIndex + 1}: ${value} quy định. Dữ liệu minh họa.${pinnedIndex !== null ? " Đã ghim điểm." : ""}`}
        data-active={hasSelection}
        data-keyboard={keyboardInput}
        data-animate-point={animatePoint}
        onPointerMove={(event) => {
          if (event.pointerType === "touch" || pinnedIndex !== null) return;
          setKeyboardInput(false);
          const bounds = event.currentTarget.getBoundingClientRect();
          showPoint(indexFromPointer(event), event.currentTarget, {
            x: (event.clientX - bounds.left) / bounds.width,
            y: (event.clientY - bounds.top) / bounds.height,
          });
        }}
        onPointerLeave={() => {
          if (pinnedIndex === null) setPreviewIndex(null);
        }}
        onClick={(event) => {
          setKeyboardInput(false);
          const index = indexFromPointer(event);
          const shouldUnpin = pinnedIndex === index;
          setPinnedIndex(shouldUnpin ? null : index);
          if (shouldUnpin) setPreviewIndex(null);
          else showPoint(index, event.currentTarget);
        }}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) {
            setKeyboardInput(true);
            showPoint(
              pinnedIndex ?? group.sparkline.length - 1,
              event.currentTarget,
            );
          }
        }}
        onBlur={() => {
          setPreviewIndex(null);
          setKeyboardInput(false);
        }}
        onKeyDown={handleKeyDown}
      >
        <svg
          viewBox={`0 0 ${PLOT.width} ${PLOT.height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`${id}-gradient`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={group.mau_sac} stopOpacity="0.18" />
              <stop
                offset="100%"
                stopColor={group.mau_sac}
                stopOpacity="0.015"
              />
            </linearGradient>
          </defs>
          <g className="cl-reg-chart-details cl-reg-axes">
            {[minimum, maximum].map((tick, index) => {
              const y = index === 0 ? PLOT.bottom : PLOT.top;
              return (
                <g key={`${tick}-${index}`}>
                  <line x1={PLOT.left} x2={PLOT.right} y1={y} y2={y} />
                  <text x={PLOT.left - 7} y={y + 3} textAnchor="end">
                    {tick}
                  </text>
                </g>
              );
            })}
            <line
              x1={PLOT.left}
              x2={PLOT.left}
              y1={PLOT.top}
              y2={PLOT.bottom}
            />
            {points.map((item, index) => (
              <text
                key={index}
                x={item.x}
                y={90}
                textAnchor="middle"
                className={
                  valueIndex === index ? "cl-reg-tick-selected" : undefined
                }
              >
                {index + 1}
              </text>
            ))}
          </g>
          <path d={area} fill={`url(#${id}-gradient)`} />
          <path
            d={line}
            fill="none"
            stroke={group.mau_sac}
            strokeWidth="2.4"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <g
            className="cl-reg-chart-details cl-reg-crosshair"
            style={{ color: group.mau_sac }}
          >
            <g
              className="cl-reg-guide-x"
              style={{ transform: `translateX(${point.x}px)` }}
            >
              <line x1="0" x2="0" y1={PLOT.top - 5} y2={PLOT.bottom + 2} />
            </g>
            <g
              className="cl-reg-guide-y"
              style={{ transform: `translateY(${point.y}px)` }}
            >
              <line x1={PLOT.left} x2={PLOT.right} y1="0" y2="0" />
            </g>
            <g
              className="cl-reg-marker"
              style={{ transform: `translate(${point.x}px, ${point.y}px)` }}
            >
              <circle
                cx="0"
                cy="0"
                r="6"
                fill={group.mau_sac}
                fillOpacity="0.12"
                stroke="none"
              />
              <circle
                cx="0"
                cy="0"
                r="3.5"
                fill="white"
                stroke={group.mau_sac}
                strokeWidth="2"
              />
            </g>
          </g>
        </svg>
        <motion.div
          ref={tooltipRef}
          className="cl-reg-tooltip cl-reg-chart-details"
          aria-hidden="true"
          style={{ transform: tooltipTransform }}
        >
          <span className="cl-reg-tooltip-label">
            Mốc {valueIndex + 1}
            {pinnedIndex !== null && <Pin size={10} />}
          </span>
          <span className="cl-reg-tooltip-value">
            <i style={{ backgroundColor: group.mau_sac }} />
            <strong>{value}</strong> quy định
          </span>
        </motion.div>
      </div>
      <span id={`${id}-instructions`} className="cl-reg-sr-only">
        Biểu đồ 7 mốc minh họa. Dùng phím mũi tên để chọn mốc, Home hoặc End để
        đến đầu hoặc cuối, Enter để ghim hoặc bỏ ghim, Escape để ẩn chi tiết.
      </span>
    </li>
  );
}

const SKELETON_REGULATIONS = [0, 1, 2, 3];

export function RegulationBreakdownCard({
  items = [],
  loading = false,
}: {
  items?: NhomQuyDinhSparkline[];
  loading?: boolean;
}) {
  const headingId = useId();
  return (
    <section className="cl-reg-card" data-admin-reveal="340" aria-labelledby={headingId}>
      <header className="cl-reg-header">
        <h3 id={headingId}>
          <Scale size={18} aria-hidden="true" />
          Phân loại Quy định
        </h3>
        <p>Nhóm quy định trong kho tri thức</p>
      </header>
      {loading ? (
        <>
          <ul className="cl-reg-list" aria-busy="true">
            {SKELETON_REGULATIONS.map((index) => (
              <li key={index} className="cl-reg-item" aria-hidden="true">
                <div className="cl-reg-heading">
                  <span className="cl-skeleton-block cl-skeleton-line is-reg-name" />
                  <span className="cl-skeleton-block cl-skeleton-line is-reg-count" />
                </div>
                <span className="cl-skeleton-block cl-skeleton-reg-chart" />
              </li>
            ))}
          </ul>
          <span
            className="cl-skeleton-block cl-skeleton-line is-reg-hint"
            aria-hidden="true"
          />
          <span
            className="cl-skeleton-block cl-skeleton-line is-reg-demo"
            aria-hidden="true"
          />
        </>
      ) : items.length === 0 ? (
        <div className="cl-reg-empty">Chưa có dữ liệu phân loại quy định.</div>
      ) : (
        <>
          <ul className="cl-reg-list">
            {items.map((group) => (
              <RegulationSparkline key={group.ma_loai} group={group} />
            ))}
          </ul>
          <p className="cl-reg-hint">Chạm vào biểu đồ để ghim một mốc.</p>
          <span className="cl-reg-demo-label">Dữ liệu đã công bố · 7 mốc gần nhất</span>
        </>
      )}
    </section>
  );
}
