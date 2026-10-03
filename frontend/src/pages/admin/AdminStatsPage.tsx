import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  FileText,
  BookOpen,
  Scale,
  CheckCircle2,
  MessageSquare,
  TrendingUp,
  ShieldCheck,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Database,
  HelpCircle,
  AlertCircle,
  ExternalLink,
  Bot,
  Search,
  RefreshCw,
} from "lucide-react";
import "@/admin-stats.css";
import { RecentQuestionsCard } from "@/components/admin/RecentQuestionsCard";
import { RegulationBreakdownCard } from "@/components/admin/RegulationBreakdownCard";
import { loadAdminStatistics, type AdminStatistics } from "@/lib/admin-statistics-api";
import {
  thongKeTheoThangData,
  thongKeTheo6ThangData,
  thongKeTheo30NgayData,
} from "@/lib/admin-data";
import { useAuth } from "@/lib/auth-context";

interface AdminStatsPageProps {
  onNavigateTab?: (tab: string) => void;
}

// Khung mờ chờ load dữ liệu từ database cho các phần chỉ số và danh sách,
// giữ nguyên kích thước để không làm gián đoạn hay vỡ giao diện.
const SKELETON_USERS = [0, 1, 2, 3];
const SKELETON_CITATIONS = [0, 1, 2];

function StatValuesSkeleton({ subRows = 1 }: { subRows?: number }) {
  return (
    <>
      <span className="cl-skeleton-block cl-skeleton-line is-stat-value" />
      {Array.from({ length: subRows }, (_, index) => (
        <span key={index} className="cl-skeleton-block cl-skeleton-line is-stat-sub" />
      ))}
    </>
  );
}

const soLuong = (val?: number | null) =>
  val !== undefined && val !== null ? val.toLocaleString("vi-VN") : "—";

export default function AdminStatsPage({ onNavigateTab }: AdminStatsPageProps) {
  const { currentUser } = useAuth();

  // Period filter state
  const [filterPeriod, setFilterPeriod] = useState<"year" | "6m" | "30d">(
    "year",
  );
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [selectedDonutSegment, setSelectedDonutSegment] = useState<
    number | null
  >(null);
  const [statistics, setStatistics] = useState<AdminStatistics | null>(null);
  const [statisticsError, setStatisticsError] = useState("");
  const [statisticsLoading, setStatisticsLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatisticsLoading(true);
    setStatisticsError("");
    loadAdminStatistics(filterPeriod, controller.signal)
      .then(data => {
        if (!controller.signal.aborted) {
          setStatistics(data);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setStatistics(null);
          setStatisticsError(error instanceof Error ? error.message : "Không thể tải báo cáo.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setStatisticsLoading(false);
      });
    return () => controller.abort();
  }, [filterPeriod, reload]);

  const overview = statistics?.overview;
  const defaultMonths =
    filterPeriod === "30d"
      ? thongKeTheo30NgayData
      : filterPeriod === "6m"
        ? thongKeTheo6ThangData
        : thongKeTheoThangData;
  const currentMonths = statistics?.months ?? (statisticsLoading ? defaultMonths : []);
  const topUsers = statistics?.top_users ?? [];
  const citationRates = statistics?.citation_rates ?? [];

  // Filter months data based on active period
  const maxVal = Math.max(
    ...currentMonths.map((m) => Math.max(m.hoi_dap, m.tra_cuu ?? 0)),
    100,
  );

  // SVG Donut calculation
  // Radius = 62, Circumference = 2 * PI * 62 = ~389.55
  const donutRadius = 60;
  const circumference = 2 * Math.PI * donutRadius;
  let accumulatedPercent = 0;

  return (
    <div className="cl-admin-stats-dashboard" aria-busy={statisticsLoading}>
      <div className="cl-stats-data-status">
        <button
          className="cl-admin-btn-outline"
          disabled={statisticsLoading}
          onClick={() => setReload(value => value + 1)}
          title="Tải lại dữ liệu"
        >
          <RefreshCw size={14} className={statisticsLoading ? "cl-spin" : ""} aria-hidden="true" />
          <span>Tải lại dữ liệu</span>
        </button>
        <span role="status">
          {statistics?.range ?? (filterPeriod === "30d" ? "30 ngày qua" : filterPeriod === "6m" ? "6 tháng gần nhất" : "Năm 2026")}
        </span>
      </div>
      {statisticsError && <p role="alert" className="cl-stats-load-error">{statisticsError}</p>}
      {/* Header with Title and Filter Tabs */}
      <div className="cl-stats-header" data-admin-reveal="0">
        <div className="cl-stats-title-group">
          <h1 title="Tổng quan Thống kê & Báo cáo Tri thức">
            Tổng quan Thống kê & Báo cáo Tri thức
          </h1>
          <p>
            Phân tích số liệu tra cứu, quy định pháp luật và hoạt động hỏi đáp
            AI theo CSDL <code>cyberlaw_search</code> (MySQL 8.0)
          </p>
        </div>

        <div className="cl-stats-filter-pills" role="tablist">
          <button
            className={`cl-stats-pill-btn ${filterPeriod === "year" ? "active" : ""}`}
            onClick={() => setFilterPeriod("year")}
          >
            Năm 2026
          </button>
          <button
            className={`cl-stats-pill-btn ${filterPeriod === "6m" ? "active" : ""}`}
            onClick={() => setFilterPeriod("6m")}
          >
            6 tháng gần nhất
          </button>
          <button
            className={`cl-stats-pill-btn ${filterPeriod === "30d" ? "active" : ""}`}
            onClick={() => setFilterPeriod("30d")}
          >
            30 ngày qua
          </button>
        </div>
      </div>

      {/* Row 1: Top 4 Stat Cards (Mazer Profile Statistics Theme) */}
      <div className="cl-stats-cards-grid">
        <motion.div
          className="cl-stat-box"
          initial={false} data-admin-reveal="50"
        >
          <div className="cl-stat-icon-wrapper burgundy">
            <Users size={24} />
          </div>
          <div className="cl-stat-info">
            <span className="cl-stat-info-label">Người dùng hệ thống</span>
            {statisticsLoading ? (
              <StatValuesSkeleton />
            ) : (
              <>
                <span className="cl-stat-info-value">
                  {statistics ? soLuong(overview?.tong_nguoi_dung) : "—"}
                </span>
                <span className="cl-stat-info-sub">
                  {statistics && overview?.tang_truong_nguoi_dung ? (
                    <>
                      <TrendingUp size={13} />
                      {overview.tang_truong_nguoi_dung}
                    </>
                  ) : (
                    <span className="cl-stats-empty-inline">Chưa có dữ liệu</span>
                  )}
                </span>
              </>
            )}
          </div>
        </motion.div>

        <motion.div
          className="cl-stat-box"
          initial={false} data-admin-reveal="90"
        >
          <div className="cl-stat-icon-wrapper sky">
            <BookOpen size={24} />
          </div>
          <div className="cl-stat-info">
            <span className="cl-stat-info-label">Văn bản & Điều khoản</span>
            {statisticsLoading ? (
              <StatValuesSkeleton />
            ) : (
              <>
                <span className="cl-stat-info-value">
                  {statistics ? `${overview?.tong_dieu_khoan ?? 0} điều` : "—"}
                </span>
                <span className="cl-stat-info-sub" style={{ color: "#0284c7" }}>
                  {statistics && overview?.tong_van_ban !== undefined ? (
                    <>
                      <FileText size={13} />
                      {overview.tong_van_ban} văn bản đã công bố
                    </>
                  ) : (
                    <span className="cl-stats-empty-inline">Chưa có dữ liệu</span>
                  )}
                </span>
              </>
            )}
          </div>
        </motion.div>

        <motion.div
          className="cl-stat-box"
          initial={false} data-admin-reveal="130"
        >
          <div className="cl-stat-icon-wrapper emerald">
            <Scale size={24} />
          </div>
          <div className="cl-stat-info">
            <span className="cl-stat-info-label">Quy định bóc tách</span>
            {statisticsLoading ? (
              <StatValuesSkeleton />
            ) : (
              <>
                <span className="cl-stat-info-value">
                  {statistics ? `${overview?.tong_quy_dinh ?? 0} quy định` : "—"}
                </span>
                <span className="cl-stat-info-sub">
                  {statistics && overview?.tang_truong_quy_dinh ? (
                    <>
                      <CheckCircle2 size={13} />
                      {overview.tang_truong_quy_dinh}
                    </>
                  ) : (
                    <span className="cl-stats-empty-inline">Chưa có dữ liệu</span>
                  )}
                </span>
              </>
            )}
          </div>
        </motion.div>

        <motion.div
          className="cl-stat-box"
          initial={false} data-admin-reveal="170"
        >
          <div className="cl-stat-icon-wrapper amber">
            <MessageSquare size={24} />
          </div>
          <div className="cl-stat-info">
            <span className="cl-stat-info-label">Lượt hỏi đáp AI</span>
            {statisticsLoading ? (
              <StatValuesSkeleton subRows={3} />
            ) : (
              <>
                <span className="cl-stat-info-value">
                  {statistics ? soLuong(overview?.tong_cuoc_hoi_dap) : "—"}
                </span>
                {statistics && overview?.tang_truong_hoi_dap ? (
                  <span className="cl-stat-info-sub" style={{ color: "#d97706" }}>
                    <Sparkles size={13} />
                    {overview.tang_truong_hoi_dap}
                  </span>
                ) : (
                  <span className="cl-stat-info-sub">
                    <span className="cl-stats-empty-inline">Chưa có dữ liệu</span>
                  </span>
                )}
                {statistics && (
                  <>
                    <span className="cl-stat-info-sub" style={{ color: "#71747e" }}>
                      <Bot size={13} />
                      {soLuong(overview?.hoi_dap_khach ?? 0)} lượt từ khách vãng lai
                    </span>
                    <span className="cl-stat-info-sub" style={{ color: "#0284c7" }}>
                      <Search size={13} />
                      {soLuong(overview?.tong_tra_cuu ?? 0)} lượt tra cứu
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Main 2-Column Content */}
      <div className="cl-stats-main-grid">
        {/* Left Column (8 cols): Big Chart + Sparklines & Comments */}
        <div className="cl-stats-left-col">
          {/* Big Chart: Profile Visit / Tần suất truy vấn & hỏi đáp */}
          <motion.div
            className="cl-stats-card"
            data-admin-reveal="180"
            initial={false}
          >
            <div className="cl-stats-card-header">
              <div>
                <h2>
                  <TrendingUp size={18} color="#800020" />
                  Xu hướng Hỏi đáp AI & Tra cứu Pháp luật
                </h2>
                <p>
                  {filterPeriod === "30d"
                    ? "Thống kê lưu lượng truy vấn trợ lý ảo và tra cứu điều khoản trong 30 ngày qua"
                    : filterPeriod === "6m"
                      ? "Thống kê lưu lượng truy vấn trợ lý ảo và tra cứu điều khoản trong 6 tháng gần nhất"
                      : "Thống kê lưu lượng truy vấn trợ lý ảo và tra cứu điều khoản trong năm 2026"}
                </p>
              </div>

              <div className="cl-barchart-legend">
                <div className="cl-legend-item">
                  <span className="cl-legend-dot burgundy" />
                  <span>Hỏi đáp Trợ lý AI</span>
                </div>
                <div className="cl-legend-item">
                  <span className="cl-legend-dot sky" />
                  <span>Tra cứu Điều khoản</span>
                </div>
              </div>
            </div>

            {/* Interactive Bar Chart with Mazer Wave Animation & Separated Y-Axis */}
            <div className="cl-barchart-container">
              <div className="cl-barchart-layout">
                {/* Y-Axis Column (Left, dedicated, completely separated from bars) */}
                <div className="cl-barchart-yaxis">
                  <span className="cl-barchart-yaxis-label">{maxVal}</span>
                  <span className="cl-barchart-yaxis-label">{Math.round(maxVal * 0.75)}</span>
                  <span className="cl-barchart-yaxis-label">{Math.round(maxVal * 0.5)}</span>
                  <span className="cl-barchart-yaxis-label">{Math.round(maxVal * 0.25)}</span>
                  <span className="cl-barchart-yaxis-label">0</span>
                </div>

                {/* Plot Area (Right of Y-Axis) */}
                <div className="cl-barchart-plot-area">
                  {/* Horizontal Grid Lines */}
                  <div className="cl-barchart-grid-lines">
                    <div className="cl-barchart-grid-line" />
                    <div className="cl-barchart-grid-line" />
                    <div className="cl-barchart-grid-line" />
                    <div className="cl-barchart-grid-line" />
                    <div className="cl-barchart-grid-line zero" />
                  </div>

                  {/* Columns of Animated Bars with Wave Effect */}
                  {!statisticsLoading && currentMonths.length === 0 ? (
                    <div className="cl-stats-empty-notice">Chưa có dữ liệu truy vấn</div>
                  ) : (
                    <div
                      key={statistics?.period ?? filterPeriod}
                      className={`cl-barchart-columns-wrapper ${statisticsLoading && filterPeriod !== statistics?.period ? "is-period-changing" : ""}`}
                    >
                      {currentMonths.map((item, index) => {
                        const isHovered = hoveredBarIndex === index;
                        const hHoiDap = Math.round((item.hoi_dap / maxVal) * 190);
                        const hTraCuu = Math.round(((item.tra_cuu ?? 0) / maxVal) * 190);

                        return (
                          <div
                            key={item.thang}
                            className="cl-barchart-col"
                            onMouseEnter={() => setHoveredBarIndex(index)}
                            onMouseLeave={() => setHoveredBarIndex(null)}
                          >
                            {/* Floating Tooltip with Smooth Fade In */}
                            <AnimatePresence>
                              {isHovered && (
                                <motion.div
                                  className="cl-barchart-tooltip"
                                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 4, scale: 0.95 }}
                                  transition={{ duration: 0.16 }}
                                >
                                  <strong
                                    style={{
                                      display: "block",
                                      marginBottom: 4,
                                      fontSize: 12,
                                    }}
                                  >
                                    {item.ten_thang}
                                  </strong>
                                  <div style={{ color: "#f87171" }}>
                                    💬 Hỏi đáp AI: {item.hoi_dap} lượt
                                  </div>
                                  <div style={{ color: "#38bdf8" }}>
                                    📖 Tra cứu: {(item.tra_cuu ?? 0).toLocaleString("vi-VN")} lượt
                                  </div>
                                  <div
                                    style={{
                                      color: "#4ade80",
                                      fontSize: 11,
                                      marginTop: 2,
                                    }}
                                  >
                                    ⚖️ Trích dẫn: {item.trich_dan} căn cứ
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Bars with Staggered Liquid Wave Animation */}
                            <div className="cl-barchart-col-bars">
                              <motion.div
                                className="cl-bar-single burgundy"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{
                                  height: `${Math.max(hHoiDap, 6)}px`,
                                  opacity: 1,
                                }}
                                transition={{
                                  duration: 0.6,
                                  delay: 0.08 + index * 0.045,
                                  ease: [0.34, 1.45, 0.64, 1],
                                }}
                                title={`Hỏi đáp: ${item.hoi_dap}`}
                              />
                              <motion.div
                                className="cl-bar-single sky"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{
                                  height: `${Math.max(hTraCuu, 6)}px`,
                                  opacity: 1,
                                }}
                                transition={{
                                  duration: 0.6,
                                  delay: 0.11 + index * 0.045,
                                  ease: [0.34, 1.45, 0.64, 1],
                                }}
                                title={`Tra cứu: ${(item.tra_cuu ?? 0).toLocaleString("vi-VN")}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Month X-Labels below the zero line */}
                  <div className="cl-barchart-x-labels">
                    {currentMonths.map((item, index) => (
                      <span
                        key={item.thang}
                        className={`cl-barchart-x-label ${hoveredBarIndex === index ? "active" : ""}`}
                      >
                        {item.thang}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Bottom Row: 2 Cards (Sparklines & Recent Comments) */}
          <RecentQuestionsCard items={statistics?.recent_questions ?? []} loading={statisticsLoading} />
        </div>

        {/* Right Column (4 cols): Profile Card + Active Users + Donut Chart */}
        <div className="cl-stats-right-col">
          {/* Widget 1: Profile Card (Mazer Style) */}
          <motion.div
            className="cl-stats-card cl-profile-card"
            initial={false} data-admin-reveal="220"
          >
            <div className="cl-profile-avatar-large">
              {currentUser?.ho_ten
                ? currentUser.ho_ten.trim().split(/\s+/).slice(-2).map((w: string) => w[0]?.toUpperCase()).join("")
                : "QT"}
            </div>
            <h3 className="cl-profile-name">{currentUser?.ho_ten || "Tài khoản Quản trị"}</h3>
            <div className="cl-profile-role-badge">
              <ShieldCheck size={13} />
              <span>{currentUser?.vai_tro === "admin" ? "Quản trị viên • Toàn quyền" : "Tài khoản hệ thống"}</span>
            </div>

            <div className="cl-profile-system-status">
              <span style={{ display: "flex", alignItems: "center" }}>
                <span className="cl-status-live-dot" />
                Hệ thống CSDL
              </span>
              <strong style={{ color: "#211618" }}>
                MySQL 8.0 • {overview?.so_bang ?? 13} bảng
              </strong>
            </div>
          </motion.div>

          {/* Widget 2: Recent Messages in Mazer -> Người dùng hỏi đáp tích cực */}
          <motion.div
            className="cl-stats-card"
            initial={false} data-admin-reveal="260"
          >
            <div className="cl-stats-card-header">
              <div>
                <h3>
                  <Users size={17} color="#800020" />
                  Người dùng hỏi đáp nhiều
                </h3>
                <p>Top tài khoản hoạt động tích cực</p>
              </div>
            </div>

            <div className="cl-active-users-list">
              {statisticsLoading ? (
                SKELETON_USERS.map((index) => (
                  <div key={index} className="cl-active-user-item">
                    <span className="cl-skeleton-block cl-skeleton-avatar-sm" />
                    <span className="cl-skeleton-stack">
                      <span className="cl-skeleton-block cl-skeleton-line is-user-name" />
                      <span className="cl-skeleton-block cl-skeleton-line is-user-handle" />
                    </span>
                  </div>
                ))
              ) : topUsers.length === 0 ? (
                <div className="cl-stats-empty-notice" style={{ minHeight: "130px" }}>
                  Chưa có dữ liệu người dùng hoạt động
                </div>
              ) : (
                topUsers.map((u) => (
                  <div key={u.ma_nguoi_dung} className="cl-active-user-item">
                    <div className="cl-active-user-avatar-wrap">
                      <div className="cl-active-user-avatar">{u.avatar}</div>
                      <span
                        className={`cl-active-status-badge ${u.trang_thai}`}
                      />
                    </div>
                    <div className="cl-active-user-meta">
                      <div className="cl-active-user-name">{u.ho_ten}</div>
                      <div className="cl-active-user-handle">
                        {u.vai_tro_nhan}
                      </div>
                    </div>
                    <span className="cl-active-user-stat">
                      {u.so_cuoc_hoi} câu
                    </span>
                  </div>
                ))
              )}
            </div>

            <button
              className="cl-stats-action-btn-full"
              onClick={() => onNavigateTab && onNavigateTab("users")}
            >
              <span>Quản lý danh sách tài khoản</span>
              <ArrowUpRight size={15} />
            </button>
          </motion.div>

          {/* Widget 3: Visitors Profile in Mazer -> Donut Chart: Tỷ lệ căn cứ pháp lý */}
          <motion.div
            className="cl-stats-card"
            initial={false} data-admin-reveal="300"
          >
            <div className="cl-stats-card-header">
              <div>
                <h3>
                  <Sparkles size={17} color="#800020" />
                  Độ chính xác Căn cứ AI
                </h3>
                <p>
                  Tỷ lệ trích dẫn theo bảng <code>trich_dan</code>
                </p>
              </div>
            </div>

            <div className="cl-donut-container">
              {statisticsLoading ? (
                <>
                  <span className="cl-skeleton-block cl-skeleton-donut" />
                  <div className="cl-donut-legend-list">
                    {SKELETON_CITATIONS.map((index) => (
                      <span
                        key={index}
                        className="cl-skeleton-block cl-skeleton-legend-bar"
                      />
                    ))}
                  </div>
                </>
              ) : citationRates.length === 0 ? (
                <div className="cl-stats-empty-notice" style={{ minHeight: "160px" }}>
                  Chưa có dữ liệu trích dẫn
                </div>
              ) : (
                <>
                  {/* SVG Donut */}
                  <div className="cl-donut-svg-wrap">
                    <svg
                      viewBox="0 0 160 160"
                      width="160"
                      height="160"
                      style={{ transform: "rotate(-90deg)" }}
                    >
                      {citationRates.map((item, index) => {
                        const strokeDasharray = `${(item.ti_le / 100) * circumference} ${circumference}`;
                        const strokeDashoffset = `${-(accumulatedPercent / 100) * circumference}`;
                        accumulatedPercent += item.ti_le;

                        const isSelected = selectedDonutSegment === index;

                        return (
                          <circle
                            key={item.nhom}
                            cx="80"
                            cy="80"
                            r={donutRadius}
                            fill="transparent"
                            stroke={item.mau_sac}
                            strokeWidth={isSelected ? 18 : 14}
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            style={{
                              transition: "all 0.3s ease",
                              cursor: "pointer",
                            }}
                            onMouseEnter={() => setSelectedDonutSegment(index)}
                            onMouseLeave={() => setSelectedDonutSegment(null)}
                          />
                        );
                      })}
                    </svg>

                    <div className="cl-donut-center-label">
                      <div className="cl-donut-center-pct">
                        {selectedDonutSegment !== null
                          ? `${citationRates[selectedDonutSegment].ti_le}%`
                          : citationRates[0] ? `${citationRates[0].ti_le}%` : "—"}
                      </div>
                      <div className="cl-donut-center-text">
                        {selectedDonutSegment !== null ? "Phần trăm" : "Tin cậy"}
                      </div>
                    </div>
                  </div>

                  {/* Legend List */}
                  <div className="cl-donut-legend-list">
                    {citationRates.map((item, index) => (
                      <div
                        key={item.nhom}
                        className="cl-donut-legend-item"
                        onMouseEnter={() => setSelectedDonutSegment(index)}
                        onMouseLeave={() => setSelectedDonutSegment(null)}
                        style={{
                          opacity:
                            selectedDonutSegment === null ||
                            selectedDonutSegment === index
                              ? 1
                              : 0.5,
                          cursor: "pointer",
                        }}
                      >
                        <div className="cl-donut-legend-label-wrap">
                          <span
                            className="cl-donut-legend-color-dot"
                            style={{ background: item.mau_sac }}
                          />
                          <span>{item.nhom}</span>
                        </div>
                        <span className="cl-donut-legend-pct">{item.ti_le}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
          <RegulationBreakdownCard items={statistics?.regulations ?? []} loading={statisticsLoading} />
        </div>
      </div>
    </div>
  );
}
