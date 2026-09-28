import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import { Tabs } from "radix-ui";
import { MotionConfig } from "motion/react";
import {
  Archive,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  FileText,
  Info,
  Plus,
  RotateCcw,
  Scale,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { AdminTabReveal } from "@/components/admin/AdminTabReveal";
import { AdminToastContainer, type ToastItem } from "@/components/AdminToast";
import { KnowledgeDialog } from "@/components/admin/KnowledgeDialog";
import { KnowledgeForm } from "@/components/admin/KnowledgeForm";
import { KnowledgeDetail } from "@/components/admin/KnowledgeDetail";
import {
  clauseLabel,
  createDemoKnowledge,
  deleteKnowledge,
  deletionBlock,
  findRecord,
  formFor,
  formatDate,
  normalizeSearch,
  recordId,
  recordTitle,
  ruleLabels,
  saveKnowledge,
  statusLabels,
  validateKnowledge,
  type DocumentStatus,
  type KnowledgeForm as FormValues,
  type KnowledgeRecord,
  type KnowledgeTab,
  type RecordSelection,
} from "@/lib/knowledge-data";
import "@/components/admin/knowledge.css";

const tabs = [
  {
    id: "van_ban",
    label: "Văn bản",
    short: "Văn bản",
    singular: "văn bản",
    icon: FileText,
    color: "burgundy",
    description: "Quản lý nguồn tài liệu và trạng thái công bố.",
  },
  {
    id: "dieu_khoan",
    label: "Điều khoản",
    short: "Điều khoản",
    singular: "điều khoản",
    icon: BookOpen,
    color: "blue",
    description: "Nội dung điều, khoản, điểm và vị trí trong tài liệu nguồn.",
  },
  {
    id: "tu_khoa",
    label: "Từ khóa & Khái niệm",
    short: "Từ khóa",
    singular: "từ khóa",
    icon: Tag,
    color: "emerald",
    description: "Kết nối cụm từ, định nghĩa và những điều khoản liên quan.",
  },
  {
    id: "quy_dinh",
    label: "Quy định",
    short: "Quy định",
    singular: "quy định",
    icon: Scale,
    color: "amber",
    description: "Biểu diễn kiến thức theo chủ thể, hành vi và căn cứ nguồn.",
  },
] as const;
type Modal = {
  mode: "view" | "edit" | "add" | "delete" | "status";
  tab: KnowledgeTab;
  id?: number;
  status?: DocumentStatus;
};
const pageSize = 6;

export default function AdminDocumentsPage({
  instant = false,
}: {
  instant?: boolean;
}) {
  const [data, setData] = useState(createDemoKnowledge);
  const [tab, setTab] = useState<KnowledgeTab>("van_ban");
  const [instantTab, setInstantTab] = useState(instant);
  const [query, setQuery] = useState("");
  const [documentFilter, setDocumentFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<Modal>({ mode: "add", tab: "van_ban" });
  const [open, setOpen] = useState(false);
  const [instantAction, setInstantAction] = useState(false);
  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fileError, setFileError] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null | undefined>();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const trigger = useRef<HTMLElement | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const tabInput = useRef(false);
  const urls = useRef(new Map<number, string>());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(
    () => () => {
      urls.current.forEach((url) => URL.revokeObjectURL(url));
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  function notify(title: string, description: string) {
    const id = crypto.randomUUID();
    setToasts((previous) => [
      ...previous.slice(-2),
      { id, title, description, type: "success" },
    ]);
    timers.current.push(
      setTimeout(
        () =>
          setToasts((previous) => previous.filter((item) => item.id !== id)),
        4000,
      ),
    );
  }
  function changeTab(value: KnowledgeTab, isInstant = false, docId?: number) {
    setInstantTab(isInstant);
    setTab(value);
    setQuery("");
    setTypeFilter("all");
    setDocumentFilter(docId ? String(docId) : "all");
    setPage(1);
  }
  function resetFilters() {
    setQuery("");
    setDocumentFilter("all");
    setTypeFilter("all");
    setPage(1);
  }
  function showModal(next: Modal, event?: MouseEvent<HTMLButtonElement>) {
    // A footer button can become a submit button after switching to edit mode.
    // Cancel the original click's default action so it cannot submit the new form.
    event?.preventDefault();
    if (!open)
      trigger.current =
        event?.currentTarget ?? (document.activeElement as HTMLElement);
    setInstantAction(event ? event.detail === 0 : true);
    setModal(next);
    setErrors({});
    setFileError("");
    setPendingFile(undefined);
    setValues(
      formFor(
        data,
        next.tab,
        next.id ? findRecord(data, { tab: next.tab, id: next.id }) : undefined,
      ),
    );
    setOpen(true);
  }
  function close() {
    setOpen(false);
  }
  function updateField(key: string, value: string) {
    setValues((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }
  function chooseFile(file: File | null) {
    if (
      file &&
      (!file.name.toLowerCase().endsWith(".pdf") ||
        (file.type && file.type !== "application/pdf"))
    ) {
      setFileError("Bạn chọn tệp PDF nhé.");
      return;
    }
    if (file && file.size > 20 * 1024 * 1024) {
      setFileError("Tệp vượt quá 20 MB. Bạn chọn tệp nhỏ hơn nhé.");
      return;
    }
    setPendingFile(file);
    setFileError("");
    updateField("duong_dan_tep", file?.name ?? "");
  }
  function save(event: FormEvent) {
    event.preventDefault();
    const validation = validateKnowledge(data, modal.tab, values, modal.id);
    setErrors(validation);
    if (Object.keys(validation).length) {
      requestAnimationFrame(() =>
        document
          .getElementById(`knowledge-${Object.keys(validation)[0]}`)
          ?.focus(),
      );
      return;
    }
    const next = saveKnowledge(data, modal.tab, values, modal.id);
    if (modal.tab === "van_ban" && pendingFile !== undefined) {
      const id =
        modal.id ?? Math.max(...next.van_ban.map((doc) => doc.ma_van_ban));
      const previous = urls.current.get(id);
      if (previous) URL.revokeObjectURL(previous);
      if (pendingFile) urls.current.set(id, URL.createObjectURL(pendingFile));
      else urls.current.delete(id);
    }
    setData(next);
    resetFilters();
    close();
    notify(
      modal.mode === "add"
        ? "Đã thêm vào bản dùng thử"
        : "Đã cập nhật bản dùng thử",
      "Thay đổi chỉ giữ trong lần mở trang này. Văn bản liên quan được đưa về nháp nếu đang công bố.",
    );
  }
  function confirmAction() {
    if (!modal.id) return;
    if (modal.mode === "delete") {
      const selection = { tab: modal.tab, id: modal.id };
      if (deletionBlock(data, selection)) return;
      setData((previous) => deleteKnowledge(previous, selection));
      if (modal.tab === "van_ban") {
        const url = urls.current.get(modal.id);
        if (url) URL.revokeObjectURL(url);
        urls.current.delete(modal.id);
      }
      notify(
        "Đã xóa khỏi bản dùng thử",
        "Dữ liệu trên máy chủ không bị thay đổi.",
      );
    } else if (modal.status) {
      if (
        modal.status === "published" &&
        !data.dieu_khoan.some((clause) => clause.ma_van_ban === modal.id)
      )
        return;
      setData((previous) => ({
        ...previous,
        van_ban: previous.van_ban.map((doc) =>
          doc.ma_van_ban === modal.id
            ? {
                ...doc,
                trang_thai: modal.status!,
                ngay_cap_nhat: new Date().toISOString(),
              }
            : doc,
        ),
      }));
      notify(
        "Đã đổi trạng thái minh họa",
        "Chưa công bố dữ liệu thật hoặc cập nhật kho AI.",
      );
    }
    close();
  }
  function sourceDocIds(item: KnowledgeRecord): number[] {
    if ("ma_quy_dinh" in item)
      return data.dieu_khoan
        .filter((clause) => clause.ma_dieu_khoan === item.ma_dieu_khoan)
        .map((clause) => clause.ma_van_ban);
    if ("ma_tu_khoa" in item) {
      const ids = [
        ...data.dieu_khoan_tu_khoa
          .filter((link) => link.ma_tu_khoa === item.ma_tu_khoa)
          .map((link) => link.ma_dieu_khoan),
        item.ma_dieu_khoan_dinh_nghia,
      ];
      return data.dieu_khoan
        .filter((clause) => ids.includes(clause.ma_dieu_khoan))
        .map((clause) => clause.ma_van_ban);
    }
    return [item.ma_van_ban];
  }
  const filtered = data[tab].filter((item) => {
    const docIds = sourceDocIds(item);
    if (documentFilter !== "all" && !docIds.includes(Number(documentFilter)))
      return false;
    if (typeFilter !== "all") {
      if ("trang_thai" in item && item.trang_thai !== typeFilter) return false;
      if ("loai_quy_dinh" in item && item.loai_quy_dinh !== typeFilter)
        return false;
      if (
        "dinh_nghia" in item &&
        (typeFilter === "defined") !== !!item.dinh_nghia
      )
        return false;
    }
    const sourceText = data.van_ban
      .filter((doc) => docIds.includes(doc.ma_van_ban))
      .map((doc) => `${doc.so_hieu} ${doc.tieu_de}`)
      .join(" ");
    const locationText =
      "so_dieu" in item
        ? clauseLabel(item)
        : "ma_quy_dinh" in item
          ? ruleLabels[item.loai_quy_dinh]
          : "";
    return normalizeSearch(
      `${Object.values(item).join(" ")} ${sourceText} ${locationText}`,
    ).includes(normalizeSearch(query.trim()));
  });
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const config = tabs.find((item) => item.id === tab)!;
  const modalConfig = tabs.find((item) => item.id === modal.tab)!;
  const selected = modal.id
    ? findRecord(data, { tab: modal.tab, id: modal.id })
    : undefined;
  const blocked = modal.id
    ? deletionBlock(data, { tab: modal.tab, id: modal.id })
    : "";
  const emptyPublish =
    modal.mode === "status" &&
    modal.status === "published" &&
    !data.dieu_khoan.some((clause) => clause.ma_van_ban === modal.id);
  const statusAction =
    modal.status === "published"
      ? "Công bố"
      : modal.status === "archived"
        ? "Lưu trữ"
        : "Chuyển về nháp";
  const modalTitle =
    modal.mode === "add"
      ? `Thêm ${modalConfig.singular}`
      : modal.mode === "edit"
        ? `Chỉnh sửa ${modalConfig.singular}`
        : modal.mode === "view"
          ? `Chi tiết ${modalConfig.singular}`
          : modal.mode === "delete"
            ? `Xóa ${modalConfig.singular}`
            : `${statusAction} văn bản`;
  const hasFilters =
    !!query || typeFilter !== "all" || documentFilter !== "all";

  function sourceMeta(item: KnowledgeRecord) {
    const ids = sourceDocIds(item);
    return (
      data.van_ban
        .filter((doc) => ids.includes(doc.ma_van_ban))
        .map((doc) => doc.so_hieu)
        .join(" · ") || "Chưa gắn văn bản"
    );
  }
  function recordBadge(item: KnowledgeRecord) {
    if ("trang_thai" in item)
      return (
        <span className={`cl-knowledge-badge ${item.trang_thai}`}>
          {statusLabels[item.trang_thai]}
        </span>
      );
    if ("loai_quy_dinh" in item)
      return (
        <span className={`cl-knowledge-badge rule-${item.loai_quy_dinh}`}>
          {ruleLabels[item.loai_quy_dinh]}
        </span>
      );
    if ("dinh_nghia" in item)
      return (
        <span
          className={`cl-knowledge-badge ${item.dinh_nghia ? "keyword" : "neutral"}`}
        >
          {item.dinh_nghia ? "Có định nghĩa" : "Từ khóa"}
        </span>
      );
    return (
      <span className="cl-knowledge-badge neutral">
        {item.chuong || "Chưa ghi chương"}
      </span>
    );
  }
  function actions(item: KnowledgeRecord) {
    const id = recordId(item);
    return (
      <div className="cl-knowledge-row-actions">
        <button
          className="cl-knowledge-icon-button"
          title="Xem chi tiết"
          aria-label={`Xem ${recordTitle(item) || ("so_dieu" in item ? clauseLabel(item) : "chi tiết")}`}
          onClick={(event) => showModal({ mode: "view", tab, id }, event)}
        >
          <Eye size={17} />
        </button>
        <button
          className="cl-knowledge-icon-button"
          title="Chỉnh sửa"
          aria-label={`Sửa ${recordTitle(item) || "điều khoản"}`}
          onClick={(event) => showModal({ mode: "edit", tab, id }, event)}
        >
          <Edit2 size={16} />
        </button>
        {"trang_thai" in item ? (
          <button
            className="cl-knowledge-icon-button"
            title={
              item.trang_thai === "archived" ? "Khôi phục về nháp" : "Lưu trữ"
            }
            aria-label={`${item.trang_thai === "archived" ? "Khôi phục" : "Lưu trữ"} ${item.tieu_de}`}
            onClick={(event) =>
              showModal(
                {
                  mode: "status",
                  tab,
                  id,
                  status: item.trang_thai === "archived" ? "draft" : "archived",
                },
                event,
              )
            }
          >
            {item.trang_thai === "archived" ? (
              <RotateCcw size={16} />
            ) : (
              <Archive size={17} />
            )}
          </button>
        ) : (
          <button
            className="cl-knowledge-icon-button is-danger"
            title="Xóa"
            aria-label={`Xóa ${recordTitle(item) || "điều khoản"}`}
            onClick={(event) => showModal({ mode: "delete", tab, id }, event)}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    );
  }
  function titleCell(item: KnowledgeRecord) {
    const Icon = config.icon;
    return (
      <div className="cl-knowledge-record-title">
        <span className={`cl-knowledge-record-icon ${config.color}`}>
          <Icon size={20} />
        </span>
        <div>
          <button
            className="cl-knowledge-title-button"
            onClick={(event) =>
              showModal({ mode: "view", tab, id: recordId(item) }, event)
            }
          >
            {recordTitle(item) ||
              ("so_dieu" in item ? clauseLabel(item) : "Chưa có tiêu đề")}
          </button>
          <small>
            {"trang_thai" in item
              ? `${item.so_hieu} · Phiên bản ${item.phien_ban_noi_dung}`
              : "so_dieu" in item
                ? `${clauseLabel(item)} · ${sourceMeta(item)}`
                : "cum_tu" in item
                  ? item.bien_the.join(" · ") || "Chưa có biến thể"
                  : sourceMeta(item)}
          </small>
        </div>
      </div>
    );
  }
  function detailsCell(item: KnowledgeRecord) {
    if ("trang_thai" in item)
      return (
        <div className="cl-knowledge-cell-stack">
          <span>{item.co_quan_ban_hanh || "Chưa ghi cơ quan"}</span>
          <small>Ban hành: {formatDate(item.ngay_ban_hanh)}</small>
          <small>Hiệu lực từ: {formatDate(item.ngay_hieu_luc)}</small>
        </div>
      );
    if ("so_dieu" in item)
      return <p className="cl-knowledge-excerpt">{item.noi_dung}</p>;
    if ("cum_tu" in item)
      return (
        <p className="cl-knowledge-excerpt">
          {item.dinh_nghia || "Từ khóa tìm kiếm, chưa bổ sung định nghĩa."}
        </p>
      );
    return (
      <div className="cl-knowledge-cell-stack">
        <span>{item.chu_the || "Chưa ghi chủ thể"}</span>
        <small>
          {data.dieu_khoan.find(
            (clause) => clause.ma_dieu_khoan === item.ma_dieu_khoan,
          )
            ? clauseLabel(
                data.dieu_khoan.find(
                  (clause) => clause.ma_dieu_khoan === item.ma_dieu_khoan,
                )!,
              )
            : "Chưa có căn cứ"}
        </small>
      </div>
    );
  }
  function countCell(item: KnowledgeRecord) {
    if ("trang_thai" in item)
      return (
        <button
          className="cl-knowledge-text-button"
          onClick={(event) =>
            changeTab("dieu_khoan", event.detail === 0, item.ma_van_ban)
          }
        >
          {
            data.dieu_khoan.filter(
              (clause) => clause.ma_van_ban === item.ma_van_ban,
            ).length
          }{" "}
          điều khoản <ArrowRight size={13} />
        </button>
      );
    if ("so_dieu" in item)
      return (
        <span>
          {item.trang_nguon ? `Trang ${item.trang_nguon}` : "Chưa ghi trang"}
        </span>
      );
    if ("cum_tu" in item)
      return (
        <span>
          {
            data.dieu_khoan_tu_khoa.filter(
              (link) => link.ma_tu_khoa === item.ma_tu_khoa,
            ).length
          }{" "}
          liên kết
        </span>
      );
    return (
      <span className="cl-knowledge-excerpt">
        {item.dieu_kien || "Chưa ghi điều kiện"}
      </span>
    );
  }

  return (
    <MotionConfig reducedMotion={instantAction ? "always" : "user"}>
      <Tabs.Root
        value={tab}
        onValueChange={(value) =>
          changeTab(value as KnowledgeTab, tabInput.current)
        }
        className="cl-knowledge-page"
      >
        <AdminTabReveal tab="documents" instant={instant}>
          <header className="cl-admin-page-header" data-admin-reveal="0">
            <div className="cl-admin-page-title">
              <h1 title="Văn bản & Tri thức">Văn bản & Tri thức</h1>
              <p>
                Quản lý nguồn luật và kiến thức phục vụ tra cứu, hỏi đáp AI.
              </p>
            </div>
            <button
              data-knowledge-add
              className="cl-admin-btn-primary"
              onClick={(event) => showModal({ mode: "add", tab }, event)}
            >
              <Plus size={17} />
              <span>Thêm {config.singular}</span>
            </button>
          </header>
          <div className="cl-admin-stats-grid cl-knowledge-stats">
            {tabs.map((item, i) => (
              <div
                className="cl-admin-stat-card"
                key={item.id}
                data-admin-reveal={50 + i * 50}
              >
                <div className={`cl-admin-stat-icon ${item.color}`}>
                  <item.icon size={22} />
                </div>
                <div className="cl-admin-stat-content">
                  <span className="cl-admin-stat-label" title={item.label}>
                    {item.label}
                  </span>
                  <span className="cl-admin-stat-value">
                    {data[item.id].length}
                  </span>
                  <span className="cl-knowledge-stat-hint">
                    {item.id === "van_ban"
                      ? `${data.van_ban.filter((doc) => doc.trang_thai === "published").length} đã công bố`
                      : item.id === "dieu_khoan"
                        ? "Đơn vị điều / khoản / điểm"
                        : item.id === "tu_khoa"
                          ? `${data.tu_khoa.filter((word) => word.dinh_nghia).length} có định nghĩa`
                          : "8 loại quy định"}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="cl-knowledge-demo" data-admin-reveal="225">
            <Info size={17} />
            <p>
              <strong>Dữ liệu minh họa.</strong> Nội dung mẫu không phải căn cứ
              pháp lý. Thay đổi sẽ đặt lại khi rời trang hoặc tải lại.
            </p>
          </div>
        </AdminTabReveal>
        <Tabs.List
          className="cl-knowledge-tabs"
          aria-label="Các phần của kho tri thức"
          onPointerDownCapture={() => {
            tabInput.current = false;
          }}
          onKeyDownCapture={() => {
            tabInput.current = true;
          }}
        >
          {tabs.map((item) => (
            <Tabs.Trigger
              key={item.id}
              value={item.id}
              className="cl-knowledge-tab"
              aria-label={item.label}
              title={item.label}
            >
              <item.icon size={17} />
              <span className="cl-knowledge-tab-full">{item.label}</span>
              <span className="cl-knowledge-tab-short" aria-hidden="true">
                {item.short}
              </span>
              <small>{data[item.id].length}</small>
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value={tab} className="cl-knowledge-tab-panel">
          <AdminTabReveal tab={tab} instant={instantTab} duration={450}>
            <div
              className="cl-admin-toolbar cl-knowledge-toolbar"
              data-admin-reveal="0"
            >
              <div className="cl-admin-toolbar-search">
                <div className="cl-admin-search-input-wrapper">
                  <Search size={17} className="cl-search-icon" />
                  <input
                    ref={searchInput}
                    aria-label={`Tìm kiếm ${config.singular}`}
                    placeholder={
                      tab === "van_ban"
                        ? "Tìm tên văn bản, số hiệu…"
                        : tab === "dieu_khoan"
                          ? "Tìm nội dung, số điều…"
                          : tab === "tu_khoa"
                            ? "Tìm cụm từ, biến thể…"
                            : "Tìm hành vi, chủ thể, căn cứ…"
                    }
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                {query && (
                  <button
                    className="cl-knowledge-icon-button"
                    aria-label="Xóa từ khóa tìm kiếm"
                    onClick={() => {
                      setQuery("");
                      setPage(1);
                      searchInput.current?.focus();
                    }}
                  >
                    <X size={17} />
                  </button>
                )}
              </div>
              <div className="cl-admin-toolbar-filters">
                {tab !== "van_ban" && (
                  <select
                    className="cl-admin-filter-select"
                    aria-label="Lọc theo văn bản"
                    value={documentFilter}
                    onChange={(event) => {
                      setDocumentFilter(event.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">Tất cả văn bản</option>
                    {data.van_ban.map((doc) => (
                      <option value={doc.ma_van_ban} key={doc.ma_van_ban}>
                        {doc.so_hieu}
                      </option>
                    ))}
                  </select>
                )}
                {tab !== "dieu_khoan" && (
                  <select
                    className="cl-admin-filter-select"
                    aria-label={
                      tab === "van_ban" ? "Lọc trạng thái" : "Lọc loại nội dung"
                    }
                    value={typeFilter}
                    onChange={(event) => {
                      setTypeFilter(event.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">
                      {tab === "van_ban" ? "Tất cả trạng thái" : "Tất cả loại"}
                    </option>
                    {Object.entries(
                      tab === "van_ban"
                        ? statusLabels
                        : tab === "quy_dinh"
                          ? ruleLabels
                          : {
                              defined: "Có định nghĩa",
                              keyword: "Chỉ có từ khóa",
                            },
                    ).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                )}
                {hasFilters && (
                  <button
                    className="cl-knowledge-icon-button"
                    title="Đặt lại bộ lọc"
                    aria-label="Đặt lại bộ lọc"
                    onClick={resetFilters}
                  >
                    <RotateCcw size={17} />
                  </button>
                )}
              </div>
            </div>
            <section
              className="cl-knowledge-list-card"
              data-admin-reveal="50"
              aria-label={`Danh sách ${config.singular}`}
            >
              <div className="cl-knowledge-list-header">
                <div>
                  <h2>
                    {config.label} <span>{filtered.length}</span>
                  </h2>
                  <p>{config.description}</p>
                </div>
                <span className="cl-knowledge-caption">Kho minh họa</span>
              </div>
              {visible.length ? (
                <>
                  <div className="cl-admin-table-responsive cl-knowledge-desktop-list">
                    <table className="cl-admin-table cl-knowledge-table">
                      <thead>
                        <tr>
                          <th>
                            {tab === "van_ban"
                              ? "Văn bản"
                              : tab === "dieu_khoan"
                                ? "Điều khoản"
                                : tab === "tu_khoa"
                                  ? "Cụm từ"
                                  : "Hành vi"}
                          </th>
                          <th>
                            {tab === "van_ban"
                              ? "Ban hành & hiệu lực"
                              : tab === "quy_dinh"
                                ? "Chủ thể & căn cứ"
                                : "Nội dung"}
                          </th>
                          <th>
                            {tab === "van_ban"
                              ? "Kho tri thức"
                              : tab === "quy_dinh"
                                ? "Điều kiện"
                                : "Liên kết nguồn"}
                          </th>
                          <th>
                            {tab === "van_ban" ? "Trạng thái" : "Phân loại"}
                          </th>
                          <th>
                            <span className="sr-only">Thao tác</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {visible.map((item) => (
                          <tr key={recordId(item)}>
                            <td>{titleCell(item)}</td>
                            <td>{detailsCell(item)}</td>
                            <td>{countCell(item)}</td>
                            <td>{recordBadge(item)}</td>
                            <td>{actions(item)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="cl-knowledge-mobile-list">
                    {visible.map((item) => (
                      <article
                        className="cl-knowledge-mobile-card"
                        key={recordId(item)}
                      >
                        {titleCell(item)}
                        {detailsCell(item)}
                        <div className="cl-knowledge-mobile-meta">
                          {recordBadge(item)}
                          {countCell(item)}
                        </div>
                        <div className="cl-knowledge-mobile-actions">
                          <button
                            className="cl-knowledge-text-button"
                            onClick={(event) =>
                              showModal(
                                { mode: "view", tab, id: recordId(item) },
                                event,
                              )
                            }
                          >
                            Xem chi tiết <ArrowRight size={14} />
                          </button>
                          {actions(item)}
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <div className="cl-admin-empty">
                  <div className="cl-admin-empty-icon">
                    <Search size={25} />
                  </div>
                  <h4>
                    {hasFilters
                      ? "Không tìm thấy nội dung phù hợp"
                      : `Chưa có ${config.singular}`}
                  </h4>
                  <p>
                    {hasFilters
                      ? "Thử từ khóa khác hoặc đặt lại bộ lọc để xem toàn bộ danh sách."
                      : `Thêm ${config.singular} đầu tiên để bắt đầu xây dựng kho tri thức.`}
                  </p>
                  <button
                    className="cl-admin-btn-outline"
                    onClick={(event) =>
                      hasFilters
                        ? resetFilters()
                        : showModal({ mode: "add", tab }, event)
                    }
                  >
                    {hasFilters ? "Đặt lại bộ lọc" : `Thêm ${config.singular}`}
                  </button>
                </div>
              )}
              <footer className="cl-knowledge-list-footer">
                <span role="status" aria-live="polite">
                  {filtered.length
                    ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} trong ${filtered.length} mục`
                    : "0 mục"}
                </span>
                <nav aria-label="Phân trang">
                  <button
                    className="cl-knowledge-icon-button"
                    aria-label="Trang trước"
                    disabled={currentPage === 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <span>
                    {currentPage} / {pages}
                  </span>
                  <button
                    className="cl-knowledge-icon-button"
                    aria-label="Trang sau"
                    disabled={currentPage === pages}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    <ChevronRight size={17} />
                  </button>
                </nav>
              </footer>
            </section>
            {tab === "van_ban" && (
              <div className="cl-knowledge-workflow" data-admin-reveal="100">
                <span>TỪ VĂN BẢN ĐẾN TRI THỨC</span>
                <ol>
                  {[
                    "Thêm văn bản",
                    "Nhập điều khoản",
                    "Gắn tri thức",
                    "Kiểm tra & công bố",
                  ].map((label, i) => (
                    <li key={label}>
                      <span>{i + 1}</span>
                      {label}
                      {i < 3 && <ChevronRight size={14} />}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </AdminTabReveal>
        </Tabs.Content>
      </Tabs.Root>
      <AdminToastContainer
        toasts={toasts}
        onDismiss={(id) =>
          setToasts((previous) => previous.filter((item) => item.id !== id))
        }
      />
      <KnowledgeDialog
        open={open}
        revealKey={`${modal.mode}-${modal.tab}-${modal.id ?? "new"}`}
        title={modalTitle}
        description={
          modal.mode === "view"
            ? "Kho kiến thức · Dữ liệu minh họa giao diện"
            : "Thao tác trên bản dùng thử của kho tri thức"
        }
        instant={instantAction}
        trigger={trigger.current}
        onClose={close}
        wide={modal.mode !== "delete" && modal.mode !== "status"}
        footer={
          <>
            {modal.mode === "view" && selected ? (
              <>
                <div className="cl-knowledge-footer-secondary">
                  {"trang_thai" in selected && (
                    <>
                      <button
                        className="cl-knowledge-icon-button is-danger"
                        title="Xóa văn bản"
                        aria-label="Xóa văn bản"
                        onClick={(event) =>
                          showModal(
                            {
                              mode: "delete",
                              tab: "van_ban",
                              id: selected.ma_van_ban,
                            },
                            event,
                          )
                        }
                      >
                        <Trash2 size={17} />
                      </button>
                      <button
                        className="cl-admin-btn-outline"
                        onClick={(event) =>
                          showModal(
                            {
                              mode: "status",
                              tab: "van_ban",
                              id: selected.ma_van_ban,
                              status:
                                selected.trang_thai === "draft"
                                  ? "published"
                                  : "draft",
                            },
                            event,
                          )
                        }
                      >
                        {selected.trang_thai === "draft" ? (
                          <Check size={16} />
                        ) : (
                          <RotateCcw size={16} />
                        )}
                        {selected.trang_thai === "draft"
                          ? "Công bố"
                          : "Về bản nháp"}
                      </button>
                    </>
                  )}
                </div>
                <button
                  className="cl-admin-btn-primary"
                  onClick={(event) =>
                    showModal(
                      { mode: "edit", tab: modal.tab, id: modal.id },
                      event,
                    )
                  }
                >
                  <Edit2 size={16} />
                  Chỉnh sửa
                </button>
              </>
            ) : (
              <>
                <button className="cl-admin-btn-outline" onClick={close}>
                  Hủy
                </button>
                {modal.mode === "edit" || modal.mode === "add" ? (
                  <button
                    className="cl-admin-btn-primary"
                    type="submit"
                    form="knowledge-editor"
                  >
                    <Check size={16} />
                    Lưu {modal.tab === "van_ban" ? "bản nháp" : "thay đổi"}
                  </button>
                ) : modal.mode === "delete" && blocked ? (
                  modal.tab === "van_ban" && (
                    <button
                      className="cl-admin-btn-primary"
                      onClick={(event) =>
                        showModal(
                          { ...modal, mode: "status", status: "archived" },
                          event,
                        )
                      }
                    >
                      <Archive size={16} />
                      Lưu trữ thay thế
                    </button>
                  )
                ) : (
                  <button
                    disabled={emptyPublish}
                    className="cl-admin-btn-primary"
                    onClick={confirmAction}
                  >
                    {modal.mode === "delete" ? "Xác nhận xóa" : statusAction}
                  </button>
                )}
              </>
            )}
          </>
        }
      >
        {modal.mode === "add" || modal.mode === "edit" ? (
          <KnowledgeForm
            tab={modal.tab}
            data={data}
            values={values}
            errors={errors}
            onChange={updateField}
            onSubmit={save}
            onFile={chooseFile}
            fileError={fileError}
          />
        ) : modal.mode === "view" && selected ? (
          <KnowledgeDetail
            item={selected}
            data={data}
            onOpen={(selection: RecordSelection) =>
              showModal({ mode: "view", ...selection })
            }
            onClauses={(id) => {
              close();
              changeTab("dieu_khoan", true, id);
            }}
            pdfUrl={
              modal.tab === "van_ban" ? urls.current.get(modal.id!) : undefined
            }
          />
        ) : (
          <div className="cl-knowledge-confirm">
            <span className="cl-knowledge-confirm-icon">
              {modal.mode === "delete" ? (
                <Trash2 size={26} />
              ) : modal.status === "published" ? (
                <Check size={26} />
              ) : (
                <Archive size={26} />
              )}
            </span>
            <h3>{selected && recordTitle(selected)}</h3>
            <p>
              {modal.mode === "delete"
                ? blocked ||
                  "Mục này sẽ được xóa khỏi dữ liệu dùng thử. Các liên kết từ khóa của mục cũng được gỡ."
                : emptyPublish
                  ? "Văn bản chưa có điều khoản. Bạn bổ sung nội dung trước khi thử công bố nhé."
                  : modal.status === "published"
                    ? "Mô phỏng công bố văn bản sau khi đã kiểm tra nội dung và căn cứ. Thao tác này chưa đưa dữ liệu lên hệ thống tra cứu hoặc AI."
                    : modal.status === "archived"
                      ? "Văn bản và các điều khoản vẫn được giữ lại để đối chiếu. Trạng thái này chỉ áp dụng trên bản dùng thử."
                      : "Đưa văn bản về bản nháp để tiếp tục chỉnh sửa và kiểm tra."}
            </p>
          </div>
        )}
      </KnowledgeDialog>
    </MotionConfig>
  );
}
