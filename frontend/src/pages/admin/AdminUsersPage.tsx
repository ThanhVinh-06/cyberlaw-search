import { useState, useMemo, useRef } from "react";
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  Search,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Eye,
  X,
  AlertTriangle,
  CheckCircle2,
  Info,
  Calendar,
  Clock,
  Sparkles,
  Filter,
  RefreshCw,
  Mail,
  KeyRound,
  Shield,
  Layers,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import AdminStatsPage from "./AdminStatsPage";
import { AdminTabReveal } from "@/components/admin/AdminTabReveal";
import {
  AdminToastContainer,
  ToastItem,
  ToastType,
} from "@/components/AdminToast";
import {
  NguoiDung,
  VaiTro,
  TrangThai,
  initialNguoiDungList,
  maTranPhanQuyen,
} from "@/lib/admin-data";

export default function AdminUsersPage() {
  const location = useLocation();
  const getInitialTab = () => {
    if (location.pathname === "/admin/stats") return "stats";
    if (location.pathname === "/admin/matrix") return "matrix";
    return "users";
  };
  const [activeTab, setActiveTab] = useState<string>(getInitialTab);
  const [instantTabReveal, setInstantTabReveal] = useState(false);
  const changeTab = (tab: string, instant = false) => {
    if (tab === activeTab) return;
    setInstantTabReveal(instant);
    setActiveTab(tab);
  };
  const [users, setUsers] = useState<NguoiDung[]>(initialNguoiDungList);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleClearSearch = () => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<NguoiDung | null>(null);
  const [viewingUser, setViewingUser] = useState<NguoiDung | null>(null);
  const [deletingUser, setDeletingUser] = useState<NguoiDung | null>(null);
  const [statusToggleUser, setStatusToggleUser] = useState<NguoiDung | null>(
    null,
  );

  // Smooth Toast stack state (animations.dev style)
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (
    title: string,
    description?: string,
    type: ToastType = "success",
  ) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastItem = { id, title, description, type };
    setToasts((prev) => [newToast, ...prev.slice(0, 3)]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Form states for Add / Edit
  const [formData, setFormData] = useState({
    ho_ten: "",
    thu_dien_tu: "",
    mat_khau: "",
    vai_tro: "user" as VaiTro,
    trang_thai: "active" as TrangThai,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Reset Add Form
  const resetForm = () => {
    setFormData({
      ho_ten: "",
      thu_dien_tu: "",
      mat_khau: "",
      vai_tro: "user",
      trang_thai: "active",
    });
    setFormErrors({});
  };

  // Quick stats calculation
  const stats = useMemo(() => {
    const total = users.length;
    const adminCount = users.filter((u) => u.vai_tro === "admin").length;
    const activeCount = users.filter((u) => u.trang_thai === "active").length;
    const blockedCount = users.filter((u) => u.trang_thai === "blocked").length;
    return { total, adminCount, activeCount, blockedCount };
  }, [users]);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    const normalize = (text: string) =>
      text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d");

    const query = normalize(searchQuery.trim());

    return users.filter((u) => {
      // Role filter
      if (roleFilter !== "all" && u.vai_tro !== roleFilter) return false;
      // Status filter
      if (statusFilter !== "all" && u.trang_thai !== statusFilter) return false;
      // Search query
      if (!query) return true;
      const nameNorm = normalize(u.ho_ten);
      const emailNorm = normalize(u.thu_dien_tu);
      return nameNorm.includes(query) || emailNorm.includes(query);
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Validate form
  const validateForm = (isEdit = false) => {
    const errors: Record<string, string> = {};
    if (!formData.ho_ten.trim()) {
      errors.ho_ten = "Họ và tên không được để trống";
    } else if (formData.ho_ten.trim().length < 2) {
      errors.ho_ten = "Họ tên phải có ít nhất 2 ký tự";
    } else if (formData.ho_ten.trim().length > 100) {
      errors.ho_ten = "Họ tên không được vượt quá 100 ký tự";
    }

    if (!formData.thu_dien_tu.trim()) {
      errors.thu_dien_tu = "Địa chỉ email không được để trống";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.thu_dien_tu.trim())
    ) {
      errors.thu_dien_tu = "Địa chỉ email không đúng định dạng";
    } else {
      // Check duplicate email (excluding current editing user)
      const duplicate = users.find(
        (u) =>
          u.thu_dien_tu.toLowerCase() ===
            formData.thu_dien_tu.trim().toLowerCase() &&
          (!isEdit || u.ma_nguoi_dung !== editingUser?.ma_nguoi_dung),
      );
      if (duplicate) {
        errors.thu_dien_tu = "Địa chỉ email này đã tồn tại trong hệ thống";
      }
    }

    if (!isEdit) {
      if (!formData.mat_khau) {
        errors.mat_khau = "Vui lòng nhập mật khẩu khởi tạo";
      } else if (formData.mat_khau.length < 8) {
        errors.mat_khau = "Mật khẩu phải có ít nhất 8 ký tự";
      }
    } else if (formData.mat_khau && formData.mat_khau.length < 8) {
      errors.mat_khau = "Mật khẩu mới phải có ít nhất 8 ký tự nếu muốn đổi";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Add User
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(false)) return;

    const now = new Date()
      .toISOString()
      .replace("T", " ")
      .replace(/\.\d+Z$/, "");

    const newId =
      users.length > 0 ? Math.max(...users.map((u) => u.ma_nguoi_dung)) + 1 : 1;

    const newUser: NguoiDung = {
      ma_nguoi_dung: newId,
      ho_ten: formData.ho_ten.trim(),
      thu_dien_tu: formData.thu_dien_tu.trim(),
      vai_tro: formData.vai_tro,
      trang_thai: formData.trang_thai,
      ma_ghi_nho: null,
      ngay_tao: now,
      ngay_cap_nhat: now,
      so_hoi_thoai: 0,
      lan_dang_nhap_cuoi: "Chưa đăng nhập",
    };

    setUsers([newUser, ...users]);
    setIsAddModalOpen(false);
    resetForm();
    addToast(
      "Tạo tài khoản thành công",
      `Đã thêm "${newUser.ho_ten}" với quyền ${newUser.vai_tro === "admin" ? "Quản trị viên" : "Người dùng"}.`,
      "success",
    );
  };

  // Open Edit Modal
  const openEditModal = (user: NguoiDung) => {
    setEditingUser(user);
    setFormData({
      ho_ten: user.ho_ten,
      thu_dien_tu: user.thu_dien_tu,
      mat_khau: "",
      vai_tro: user.vai_tro,
      trang_thai: user.trang_thai,
    });
    setFormErrors({});
  };

  // Handle Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!validateForm(true)) return;

    // Safety rule: Cannot downgrade the only active admin
    if (
      editingUser.vai_tro === "admin" &&
      formData.vai_tro === "user" &&
      stats.adminCount <= 1
    ) {
      addToast(
        "Thao tác bị từ chối",
        "Không thể hạ quyền Quản trị viên hoạt động duy nhất của hệ thống!",
        "error",
      );
      return;
    }

    const now = new Date()
      .toISOString()
      .replace("T", " ")
      .replace(/\.\d+Z$/, "");

    setUsers((prev) =>
      prev.map((u) => {
        if (u.ma_nguoi_dung === editingUser.ma_nguoi_dung) {
          return {
            ...u,
            ho_ten: formData.ho_ten.trim(),
            thu_dien_tu: formData.thu_dien_tu.trim(),
            vai_tro: formData.vai_tro,
            trang_thai: formData.trang_thai,
            ngay_cap_nhat: now,
          };
        }
        return u;
      }),
    );

    setEditingUser(null);
    resetForm();
    addToast(
      "Cập nhật thành công",
      `Thông tin và phân quyền của "${formData.ho_ten}" đã được lưu.`,
      "success",
    );
  };

  // Handle Toggle Status (Active / Blocked)
  const handleConfirmToggleStatus = () => {
    if (!statusToggleUser) return;

    // Safety rule: Cannot block admin #1 (System Admin) or only admin
    if (
      statusToggleUser.ma_nguoi_dung === 1 &&
      statusToggleUser.trang_thai === "active"
    ) {
      addToast(
        "Thao tác bị từ chối",
        "Không được phép khóa Quản trị viên Hệ thống chính!",
        "error",
      );
      setStatusToggleUser(null);
      return;
    }

    if (
      statusToggleUser.vai_tro === "admin" &&
      statusToggleUser.trang_thai === "active" &&
      stats.adminCount <= 1
    ) {
      addToast(
        "Thao tác bị từ chối",
        "Không thể khóa Quản trị viên duy nhất đang hoạt động!",
        "error",
      );
      setStatusToggleUser(null);
      return;
    }

    const newStatus: TrangThai =
      statusToggleUser.trang_thai === "active" ? "blocked" : "active";

    const now = new Date()
      .toISOString()
      .replace("T", " ")
      .replace(/\.\d+Z$/, "");

    setUsers((prev) =>
      prev.map((u) => {
        if (u.ma_nguoi_dung === statusToggleUser.ma_nguoi_dung) {
          return {
            ...u,
            trang_thai: newStatus,
            ngay_cap_nhat: now,
          };
        }
        return u;
      }),
    );

    if (newStatus === "active") {
      addToast(
        "Đã mở khóa tài khoản",
        `Người dùng "${statusToggleUser.ho_ten}" đã có thể đăng nhập bình thường.`,
        "unlock",
      );
    } else {
      addToast(
        "Đã tạm khóa tài khoản",
        `Tài khoản "${statusToggleUser.ho_ten}" đã bị tạm ngừng quyền truy cập.`,
        "lock",
      );
    }
    setStatusToggleUser(null);
  };

  // Handle Delete User
  const handleConfirmDelete = () => {
    if (!deletingUser) return;

    if (deletingUser.ma_nguoi_dung === 1) {
      addToast(
        "Thao tác bị từ chối",
        "Không được phép xóa Quản trị viên Hệ thống chính!",
        "error",
      );
      setDeletingUser(null);
      return;
    }

    if (deletingUser.vai_tro === "admin" && stats.adminCount <= 1) {
      addToast(
        "Thao tác bị từ chối",
        "Không thể xóa Quản trị viên duy nhất trong hệ thống!",
        "error",
      );
      setDeletingUser(null);
      return;
    }

    setUsers((prev) =>
      prev.filter((u) => u.ma_nguoi_dung !== deletingUser.ma_nguoi_dung),
    );
    addToast(
      "Đã xóa vĩnh viễn",
      `Tài khoản "${deletingUser.ho_ten}" đã được gỡ khỏi cơ sở dữ liệu.`,
      "delete",
    );
    setDeletingUser(null);
  };

  return (
    <AdminLayout activeTab={activeTab} onTabChange={changeTab}>
      {/* Modern Smooth Toast Notifications (animations.dev style) */}
      <AdminToastContainer toasts={toasts} onDismiss={dismissToast} />

      {activeTab === "stats" ? (
        <AdminStatsPage onNavigateTab={changeTab} />
      ) : (
        <AdminTabReveal tab={activeTab} instant={instantTabReveal}>
          {/* Page Title & Add Button */}
          <div className="cl-admin-page-header" data-admin-reveal="0">
            <div className="cl-admin-page-title">
              <h1>Phân quyền & Quản lý người dùng</h1>
              <p>
                Theo dõi, phân quyền (Role-Based Access Control) và quản lý tài
                khoản trong bảng <code>nguoi_dung</code>
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="cl-admin-btn-primary"
                onClick={() => {
                  resetForm();
                  setIsAddModalOpen(true);
                }}
              >
                <Plus size={16} />
                <span>Thêm tài khoản & Phân quyền</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="cl-admin-stats-grid">
            <div className="cl-admin-stat-card" data-admin-reveal="50">
              <div className="cl-admin-stat-icon burgundy">
                <Users size={22} />
              </div>
              <div className="cl-admin-stat-content">
                <span className="cl-admin-stat-label">Tổng tài khoản</span>
                <span className="cl-admin-stat-value">{stats.total}</span>
              </div>
            </div>

            <div className="cl-admin-stat-card" data-admin-reveal="100">
              <div className="cl-admin-stat-icon burgundy">
                <ShieldCheck size={22} />
              </div>
              <div className="cl-admin-stat-content">
                <span className="cl-admin-stat-label">
                  Quản trị viên (admin)
                </span>
                <span className="cl-admin-stat-value">{stats.adminCount}</span>
              </div>
            </div>

            <div className="cl-admin-stat-card" data-admin-reveal="150">
              <div className="cl-admin-stat-icon emerald">
                <UserCheck size={22} />
              </div>
              <div className="cl-admin-stat-content">
                <span className="cl-admin-stat-label">
                  Đang hoạt động (active)
                </span>
                <span className="cl-admin-stat-value">{stats.activeCount}</span>
              </div>
            </div>

            <div className="cl-admin-stat-card" data-admin-reveal="200">
              <div className="cl-admin-stat-icon rose">
                <UserX size={22} />
              </div>
              <div className="cl-admin-stat-content">
                <span className="cl-admin-stat-label">
                  Bị tạm khóa (blocked)
                </span>
                <span className="cl-admin-stat-value">
                  {stats.blockedCount}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs Switcher: Users CRUD vs Permission Matrix */}
          <div className="cl-admin-tabs" data-admin-reveal="225">
            <button
              className={`cl-admin-tab-btn ${activeTab === "users" ? "active" : ""}`}
              onClick={(event) => changeTab("users", event.detail === 0)}
            >
              <Users size={16} />
              <span>Danh sách tài khoản ({filteredUsers.length})</span>
            </button>
            <button
              className={`cl-admin-tab-btn ${activeTab === "matrix" ? "active" : ""}`}
              onClick={(event) => changeTab("matrix", event.detail === 0)}
            >
              <Shield size={16} />
              <span>Ma trận quyền hạn</span>
            </button>
          </div>

          {activeTab === "users" && (
            <>
              {/* Toolbar: Search & Filters */}
              <div className="cl-admin-toolbar" data-admin-reveal="250">
                <div className="cl-admin-toolbar-search">
                  <div className="cl-admin-search-input-wrapper">
                    <Search size={16} className="cl-search-icon" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Tìm theo họ tên hoặc email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  {searchQuery && (
                    <button
                      type="button"
                      className="cl-admin-search-clear-btn"
                      onClick={handleClearSearch}
                      title="Xóa tìm kiếm"
                      aria-label="Xóa nội dung tìm kiếm"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="cl-admin-toolbar-filters">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Filter size={14} style={{ color: "#716667" }} />
                    <span style={{ fontSize: "12.5px", color: "#716667" }}>
                      Vai trò:
                    </span>
                    <select
                      className="cl-admin-filter-select"
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                    >
                      <option value="all">Tất cả vai trò</option>
                      <option value="admin">Quản trị viên (admin)</option>
                      <option value="user">Người dùng (user)</option>
                    </select>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span style={{ fontSize: "12.5px", color: "#716667" }}>
                      Trạng thái:
                    </span>
                    <select
                      className="cl-admin-filter-select"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">Tất cả trạng thái</option>
                      <option value="active">Đang hoạt động</option>
                      <option value="blocked">Đã bị khóa</option>
                    </select>
                  </div>

                  {(searchQuery ||
                    roleFilter !== "all" ||
                    statusFilter !== "all") && (
                    <button
                      className="cl-admin-btn-outline"
                      style={{ padding: "7px 12px", fontSize: "12.5px" }}
                      onClick={() => {
                        setSearchQuery("");
                        setRoleFilter("all");
                        setStatusFilter("all");
                      }}
                    >
                      <RefreshCw size={13} />
                      <span>Đặt lại lọc</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Table Card */}
              <div className="cl-admin-table-card" data-admin-reveal="300">
                {filteredUsers.length === 0 ? (
                  <div className="cl-admin-empty">
                    <div className="cl-admin-empty-icon">
                      <Search size={28} />
                    </div>
                    <h4>Không tìm thấy người dùng nào</h4>
                    <p>
                      Thử tìm kiếm với từ khóa khác hoặc xóa bớt các điều kiện
                      lọc vai trò, trạng thái.
                    </p>
                    <button
                      className="cl-admin-btn-outline"
                      onClick={() => {
                        setSearchQuery("");
                        setRoleFilter("all");
                        setStatusFilter("all");
                      }}
                    >
                      Xóa bộ lọc
                    </button>
                  </div>
                ) : (
                  <div className="cl-admin-table-responsive">
                    <table className="cl-admin-table">
                      <thead>
                        <tr>
                          <th style={{ width: "70px" }}>#ID</th>
                          <th>Người dùng</th>
                          <th>Thư điện tử (Email)</th>
                          <th>Vai trò (Phân quyền)</th>
                          <th style={{ width: "130px", minWidth: "130px" }}>
                            Trạng thái
                          </th>
                          <th>Ngày tham gia</th>
                          <th style={{ textAlign: "right" }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user) => {
                          const initials = user.ho_ten
                            .split(" ")
                            .map((n) => n[0])
                            .slice(-2)
                            .join("")
                            .toUpperCase();

                          return (
                            <tr key={user.ma_nguoi_dung}>
                              <td style={{ fontWeight: 600, color: "#8c8280" }}>
                                #{user.ma_nguoi_dung}
                              </td>
                              <td>
                                <div className="cl-admin-user-cell">
                                  <div
                                    className={`cl-admin-avatar-small ${user.vai_tro}`}
                                  >
                                    {initials}
                                  </div>
                                  <div className="cl-admin-user-cell-meta">
                                    <span className="cl-admin-user-cell-name">
                                      {user.ho_ten}
                                    </span>
                                    <span className="cl-admin-user-cell-id">
                                      {user.so_hoi_thoai ?? 0} cuộc hỏi đáp AI
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td
                                style={{
                                  color: "#453b3d",
                                  fontFamily: "monospace",
                                }}
                              >
                                {user.thu_dien_tu}
                              </td>
                              <td>
                                {user.vai_tro === "admin" ? (
                                  <span className="cl-admin-role-badge admin">
                                    <ShieldCheck size={13} />
                                    Quản trị viên
                                  </span>
                                ) : (
                                  <span className="cl-admin-role-badge user">
                                    <Users size={13} />
                                    Người dùng
                                  </span>
                                )}
                              </td>
                              <td>
                                {user.trang_thai === "active" ? (
                                  <span className="cl-admin-status-badge active">
                                    <span className="cl-admin-status-dot-active" />
                                    <span className="cl-admin-status-text">
                                      Đang hoạt
                                      <br />
                                      động
                                    </span>
                                  </span>
                                ) : (
                                  <span className="cl-admin-status-badge blocked">
                                    <span className="cl-admin-status-dot-blocked" />
                                    <span className="cl-admin-status-text">
                                      Đã bị
                                      <br />
                                      khóa
                                    </span>
                                  </span>
                                )}
                              </td>
                              <td
                                style={{ color: "#716667", fontSize: "13px" }}
                              >
                                {user.ngay_tao.split(" ")[0]}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <div
                                  className="cl-admin-actions-cell"
                                  style={{ justifyContent: "flex-end" }}
                                >
                                  <button
                                    className="cl-admin-action-btn view"
                                    title="Xem chi tiết tài khoản"
                                    onClick={() => {
                                      setViewingUser(user);
                                      addToast(
                                        "Chi tiết người dùng",
                                        `Đang xem hồ sơ #${user.ma_nguoi_dung} - ${user.ho_ten}`,
                                        "view",
                                      );
                                    }}
                                  >
                                    <Eye size={15} />
                                  </button>
                                  <button
                                    className="cl-admin-action-btn edit"
                                    title="Chỉnh sửa thông tin & phân quyền"
                                    onClick={() => openEditModal(user)}
                                  >
                                    <Edit2 size={15} />
                                  </button>
                                  <button
                                    className="cl-admin-action-btn block"
                                    title={
                                      user.trang_thai === "active"
                                        ? "Khóa tài khoản"
                                        : "Mở khóa tài khoản"
                                    }
                                    onClick={() => setStatusToggleUser(user)}
                                  >
                                    {user.trang_thai === "active" ? (
                                      <Lock size={15} />
                                    ) : (
                                      <Unlock size={15} color="#059669" />
                                    )}
                                  </button>
                                  <button
                                    className="cl-admin-action-btn delete"
                                    title="Xóa tài khoản vĩnh viễn"
                                    onClick={() => setDeletingUser(user)}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Tab: Permission Matrix (Ma trận phân quyền) */}
          {activeTab === "matrix" && (
            <div className="cl-admin-matrix-card" data-admin-reveal="250">
              <div className="cl-admin-matrix-header">
                <div>
                  <h3>Ma trận quyền hạn hệ thống</h3>
                  <p>
                    Chi tiết quyền hạn được thiết kế theo tài liệu kiến trúc{" "}
                    <code>docs/requirements/02-tai-khoan-phan-quyen.md</code>
                  </p>
                </div>
                <div className="cl-admin-status-pill">
                  <ShieldCheck size={14} color="#800020" />
                  <span>Chính sách quyền tối thiểu</span>
                </div>
              </div>

              <div className="cl-admin-table-responsive">
                <table className="cl-admin-table">
                  <thead>
                    <tr>
                      <th>Chức năng & Nghiệp vụ</th>
                      <th>Phạm vi / Mục đích</th>
                      <th style={{ textAlign: "center", width: "120px" }}>
                        Khách vãng lai
                      </th>
                      <th style={{ textAlign: "center", width: "120px" }}>
                        Người dùng (user)
                      </th>
                      <th style={{ textAlign: "center", width: "140px" }}>
                        Quản trị viên (admin)
                      </th>
                      <th>Ghi chú chính sách</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maTranPhanQuyen.map((rule) => (
                      <tr key={rule.ma_chuc_nang}>
                        <td>
                          <strong style={{ color: "#261c1e" }}>
                            {rule.ten_chuc_nang}
                          </strong>
                        </td>
                        <td style={{ color: "#615759" }}>{rule.mo_ta}</td>
                        <td style={{ textAlign: "center" }}>
                          {rule.khach ? (
                            <span
                              style={{
                                color: "#059669",
                                fontWeight: 600,
                                fontSize: "12px",
                              }}
                            >
                              ✓ Được phép
                            </span>
                          ) : (
                            <span
                              style={{
                                color: "#9c9190",
                                fontSize: "12px",
                              }}
                            >
                              ✕ Không
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {rule.user ? (
                            <span
                              style={{
                                color: "#059669",
                                fontWeight: 600,
                                fontSize: "12px",
                              }}
                            >
                              ✓ Được phép
                            </span>
                          ) : (
                            <span
                              style={{
                                color: "#dc2626",
                                fontWeight: 500,
                                fontSize: "12px",
                              }}
                            >
                              ✕ Bị chặn (403)
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {rule.admin ? (
                            <span className="cl-admin-role-badge admin">
                              <ShieldCheck size={12} />
                              Toàn quyền
                            </span>
                          ) : (
                            <span style={{ color: "#9c9190" }}>✕</span>
                          )}
                        </td>
                        <td style={{ fontSize: "12.5px", color: "#7a6f71" }}>
                          {rule.ghi_chu || "Áp dụng theo vai trò đăng nhập"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </AdminTabReveal>
      )}

      {/* Modal: Thêm người dùng mới (Create) */}
      {isAddModalOpen && (
        <div
          className="cl-admin-modal-overlay"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="cl-admin-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cl-admin-modal-header">
              <h3>Thêm người dùng & Gán quyền mới</h3>
              <button
                className="cl-admin-modal-close"
                onClick={() => setIsAddModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="cl-admin-modal-body">
                <div className="cl-admin-form-group">
                  <label htmlFor="add_ho_ten">
                    Họ và tên <span className="required">*</span>
                  </label>
                  <input
                    id="add_ho_ten"
                    type="text"
                    className="cl-admin-form-input"
                    placeholder="Ví dụ: Nguyễn Văn An"
                    value={formData.ho_ten}
                    onChange={(e) =>
                      setFormData({ ...formData, ho_ten: e.target.value })
                    }
                  />
                  {formErrors.ho_ten && (
                    <span className="cl-admin-form-error">
                      <AlertTriangle size={13} />
                      {formErrors.ho_ten}
                    </span>
                  )}
                </div>

                <div className="cl-admin-form-group">
                  <label htmlFor="add_thu_dien_tu">
                    Thư điện tử (Email) <span className="required">*</span>
                  </label>
                  <input
                    id="add_thu_dien_tu"
                    type="email"
                    className="cl-admin-form-input"
                    placeholder="nguoidung@example.com"
                    value={formData.thu_dien_tu}
                    onChange={(e) =>
                      setFormData({ ...formData, thu_dien_tu: e.target.value })
                    }
                  />
                  {formErrors.thu_dien_tu && (
                    <span className="cl-admin-form-error">
                      <AlertTriangle size={13} />
                      {formErrors.thu_dien_tu}
                    </span>
                  )}
                  <span className="cl-admin-form-hint">
                    Email duy nhất dùng để đăng nhập vào CyberLaw Search
                  </span>
                </div>

                <div className="cl-admin-form-group">
                  <label htmlFor="add_mat_khau">
                    Mật khẩu khởi tạo <span className="required">*</span>
                  </label>
                  <input
                    id="add_mat_khau"
                    type="password"
                    className="cl-admin-form-input"
                    placeholder="Tối thiểu 8 ký tự"
                    value={formData.mat_khau}
                    onChange={(e) =>
                      setFormData({ ...formData, mat_khau: e.target.value })
                    }
                  />
                  {formErrors.mat_khau && (
                    <span className="cl-admin-form-error">
                      <AlertTriangle size={13} />
                      {formErrors.mat_khau}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "14px",
                  }}
                >
                  <div className="cl-admin-form-group">
                    <label htmlFor="add_vai_tro">
                      Vai trò (Phân quyền) <span className="required">*</span>
                    </label>
                    <select
                      id="add_vai_tro"
                      className="cl-admin-form-select"
                      value={formData.vai_tro}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          vai_tro: e.target.value as VaiTro,
                        })
                      }
                    >
                      <option value="user">Người dùng (user)</option>
                      <option value="admin">Quản trị viên (admin)</option>
                    </select>
                  </div>

                  <div className="cl-admin-form-group">
                    <label htmlFor="add_trang_thai">
                      Trạng thái tài khoản <span className="required">*</span>
                    </label>
                    <select
                      id="add_trang_thai"
                      className="cl-admin-form-select"
                      value={formData.trang_thai}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          trang_thai: e.target.value as TrangThai,
                        })
                      }
                    >
                      <option value="active">Đang hoạt động</option>
                      <option value="blocked">Đã bị khóa</option>
                    </select>
                  </div>
                </div>

                <div
                  style={{
                    background: "#fbf5f5",
                    border: "1px solid #eedad7",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontSize: "12.5px",
                    color: "#6b2c3a",
                    display: "flex",
                    gap: "8px",
                  }}
                >
                  <Info size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    {formData.vai_tro === "admin" ? (
                      <span>
                        <strong>Quyền Quản trị viên:</strong> Có toàn quyền quản
                        trị người dùng, cập nhật văn bản pháp luật, duyệt tri
                        thức vector và đồng bộ hệ thống.
                      </span>
                    ) : (
                      <span>
                        <strong>Quyền Người dùng:</strong> Được phép tra cứu
                        luật, hỏi đáp AI và lưu lịch sử các phiên hỏi đáp của
                        chính mình.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="cl-admin-modal-footer">
                <button
                  type="button"
                  className="cl-admin-btn-outline"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Hủy bỏ
                </button>
                <button type="submit" className="cl-admin-btn-primary">
                  <Plus size={16} />
                  <span>Lưu tài khoản</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Chỉnh sửa người dùng & Phân quyền (Update) */}
      {editingUser && (
        <div
          className="cl-admin-modal-overlay"
          onClick={() => setEditingUser(null)}
        >
          <div
            className="cl-admin-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cl-admin-modal-header">
              <h3>
                Chỉnh sửa tài khoản #{editingUser.ma_nguoi_dung} & Phân quyền
              </h3>
              <button
                className="cl-admin-modal-close"
                onClick={() => setEditingUser(null)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="cl-admin-modal-body">
                <div className="cl-admin-form-group">
                  <label htmlFor="edit_ho_ten">
                    Họ và tên <span className="required">*</span>
                  </label>
                  <input
                    id="edit_ho_ten"
                    type="text"
                    className="cl-admin-form-input"
                    value={formData.ho_ten}
                    onChange={(e) =>
                      setFormData({ ...formData, ho_ten: e.target.value })
                    }
                  />
                  {formErrors.ho_ten && (
                    <span className="cl-admin-form-error">
                      <AlertTriangle size={13} />
                      {formErrors.ho_ten}
                    </span>
                  )}
                </div>

                <div className="cl-admin-form-group">
                  <label htmlFor="edit_thu_dien_tu">
                    Thư điện tử (Email) <span className="required">*</span>
                  </label>
                  <input
                    id="edit_thu_dien_tu"
                    type="email"
                    className="cl-admin-form-input"
                    value={formData.thu_dien_tu}
                    onChange={(e) =>
                      setFormData({ ...formData, thu_dien_tu: e.target.value })
                    }
                  />
                  {formErrors.thu_dien_tu && (
                    <span className="cl-admin-form-error">
                      <AlertTriangle size={13} />
                      {formErrors.thu_dien_tu}
                    </span>
                  )}
                </div>

                <div className="cl-admin-form-group">
                  <label htmlFor="edit_mat_khau">Đặt lại mật khẩu mới</label>
                  <input
                    id="edit_mat_khau"
                    type="password"
                    className="cl-admin-form-input"
                    placeholder="Để trống nếu không muốn thay đổi mật khẩu"
                    value={formData.mat_khau}
                    onChange={(e) =>
                      setFormData({ ...formData, mat_khau: e.target.value })
                    }
                  />
                  {formErrors.mat_khau && (
                    <span className="cl-admin-form-error">
                      <AlertTriangle size={13} />
                      {formErrors.mat_khau}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "14px",
                  }}
                >
                  <div className="cl-admin-form-group">
                    <label htmlFor="edit_vai_tro">
                      Vai trò (Phân quyền) <span className="required">*</span>
                    </label>
                    <select
                      id="edit_vai_tro"
                      className="cl-admin-form-select"
                      value={formData.vai_tro}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          vai_tro: e.target.value as VaiTro,
                        })
                      }
                      disabled={
                        editingUser.ma_nguoi_dung === 1 &&
                        editingUser.vai_tro === "admin"
                      }
                    >
                      <option value="user">Người dùng (user)</option>
                      <option value="admin">Quản trị viên (admin)</option>
                    </select>
                  </div>

                  <div className="cl-admin-form-group">
                    <label htmlFor="edit_trang_thai">
                      Trạng thái tài khoản <span className="required">*</span>
                    </label>
                    <select
                      id="edit_trang_thai"
                      className="cl-admin-form-select"
                      value={formData.trang_thai}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          trang_thai: e.target.value as TrangThai,
                        })
                      }
                      disabled={editingUser.ma_nguoi_dung === 1}
                    >
                      <option value="active">Đang hoạt động</option>
                      <option value="blocked">Đã bị khóa</option>
                    </select>
                  </div>
                </div>

                {editingUser.ma_nguoi_dung === 1 && (
                  <div
                    style={{
                      background: "#fef3c7",
                      border: "1px solid #fde68a",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      fontSize: "12px",
                      color: "#92400e",
                      display: "flex",
                      gap: "6px",
                    }}
                  >
                    <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                    <span>
                      Tài khoản Quản trị viên Hệ thống chính được bảo vệ, không
                      thể thay đổi vai trò hoặc chuyển sang bị khóa.
                    </span>
                  </div>
                )}
              </div>

              <div className="cl-admin-modal-footer">
                <button
                  type="button"
                  className="cl-admin-btn-outline"
                  onClick={() => setEditingUser(null)}
                >
                  Hủy
                </button>
                <button type="submit" className="cl-admin-btn-primary">
                  <CheckCircle2 size={16} />
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xem chi tiết tài khoản (View Detail) */}
      {viewingUser && (
        <div
          className="cl-admin-modal-overlay"
          onClick={() => setViewingUser(null)}
        >
          <div
            className="cl-admin-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cl-admin-modal-header">
              <h3>Thông tin tài khoản #{viewingUser.ma_nguoi_dung}</h3>
              <button
                className="cl-admin-modal-close"
                onClick={() => setViewingUser(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="cl-admin-modal-body">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "12px",
                  background: "#faf8f6",
                  borderRadius: "10px",
                  border: "1px solid #e7e1dd",
                }}
              >
                <div
                  className={`cl-admin-avatar-small ${viewingUser.vai_tro}`}
                  style={{ width: "48px", height: "48px", fontSize: "18px" }}
                >
                  {viewingUser.ho_ten
                    .split(" ")
                    .map((n) => n[0])
                    .slice(-2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div>
                  <h4
                    style={{
                      margin: "0 0 2px",
                      fontSize: "16px",
                      color: "#21181d",
                    }}
                  >
                    {viewingUser.ho_ten}
                  </h4>
                  <span style={{ fontSize: "13px", color: "#6e6466" }}>
                    {viewingUser.thu_dien_tu}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  fontSize: "13px",
                }}
              >
                <div>
                  <strong style={{ color: "#7a6f71", display: "block" }}>
                    Vai trò hiện tại:
                  </strong>
                  <span style={{ marginTop: "4px", display: "inline-block" }}>
                    {viewingUser.vai_tro === "admin" ? (
                      <span className="cl-admin-role-badge admin">
                        <ShieldCheck size={13} />
                        Quản trị viên (admin)
                      </span>
                    ) : (
                      <span className="cl-admin-role-badge user">
                        <Users size={13} />
                        Người dùng (user)
                      </span>
                    )}
                  </span>
                </div>

                <div>
                  <strong style={{ color: "#7a6f71", display: "block" }}>
                    Trạng thái:
                  </strong>
                  <span style={{ marginTop: "4px", display: "inline-block" }}>
                    {viewingUser.trang_thai === "active" ? (
                      <span className="cl-admin-status-badge active">
                        <span className="cl-admin-status-dot-active" />
                        <span className="cl-admin-status-text">
                          Đang hoạt
                          <br />
                          động
                        </span>
                      </span>
                    ) : (
                      <span className="cl-admin-status-badge blocked">
                        <span className="cl-admin-status-dot-blocked" />
                        <span className="cl-admin-status-text">
                          Đã bị
                          <br />
                          khóa
                        </span>
                      </span>
                    )}
                  </span>
                </div>

                <div>
                  <strong style={{ color: "#7a6f71", display: "block" }}>
                    Ngày tạo tài khoản:
                  </strong>
                  <span style={{ color: "#30292b" }}>
                    {viewingUser.ngay_tao}
                  </span>
                </div>

                <div>
                  <strong style={{ color: "#7a6f71", display: "block" }}>
                    Cập nhật lần cuối:
                  </strong>
                  <span style={{ color: "#30292b" }}>
                    {viewingUser.ngay_cap_nhat}
                  </span>
                </div>

                <div>
                  <strong style={{ color: "#7a6f71", display: "block" }}>
                    Số cuộc hội thoại AI:
                  </strong>
                  <span style={{ color: "#30292b", fontWeight: 600 }}>
                    {viewingUser.so_hoi_thoai ?? 0} cuộc trò chuyện
                  </span>
                </div>

                <div>
                  <strong style={{ color: "#7a6f71", display: "block" }}>
                    Hoạt động gần nhất:
                  </strong>
                  <span style={{ color: "#30292b" }}>
                    {viewingUser.lan_dang_nhap_cuoi ?? "Chưa ghi nhận"}
                  </span>
                </div>
              </div>

              <div
                style={{
                  borderTop: "1px solid #f0eae5",
                  paddingTop: "12px",
                  fontSize: "12.5px",
                }}
              >
                <strong
                  style={{
                    color: "#21181d",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Phạm vi quyền hạn được gán:
                </strong>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: "18px",
                    color: "#524749",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <li>
                    ✓ Tra cứu toàn văn Luật An ninh mạng và các điều khoản
                  </li>
                  <li>✓ Đặt câu hỏi và nhận câu trả lời đối chiếu từ AI</li>
                  <li>✓ Quản lý lịch sử hỏi đáp của chính tài khoản mình</li>
                  {viewingUser.vai_tro === "admin" && (
                    <>
                      <li style={{ color: "#800020", fontWeight: 600 }}>
                        ✓ Quản lý văn bản, điều khoản và từ khóa pháp luật
                      </li>
                      <li style={{ color: "#800020", fontWeight: 600 }}>
                        ✓ Quản lý danh sách tài khoản và phân quyền người dùng
                      </li>
                      <li style={{ color: "#800020", fontWeight: 600 }}>
                        ✓ Quyền truy cập Bảng điều khiển Quản trị CyberLaw Admin
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
            <div className="cl-admin-modal-footer">
              <button
                className="cl-admin-btn-outline"
                onClick={() => setViewingUser(null)}
              >
                Đóng
              </button>
              <button
                className="cl-admin-btn-primary"
                onClick={() => {
                  const userToEdit = viewingUser;
                  setViewingUser(null);
                  openEditModal(userToEdit);
                }}
              >
                <Edit2 size={15} />
                <span>Chỉnh sửa tài khoản</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Xác nhận Khóa / Mở khóa tài khoản */}
      {statusToggleUser && (
        <div
          className="cl-admin-modal-overlay"
          onClick={() => setStatusToggleUser(null)}
        >
          <div
            className="cl-admin-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cl-admin-modal-header">
              <h3>
                {statusToggleUser.trang_thai === "active"
                  ? "Xác nhận khóa tài khoản"
                  : "Xác nhận mở khóa tài khoản"}
              </h3>
              <button
                className="cl-admin-modal-close"
                onClick={() => setStatusToggleUser(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="cl-admin-modal-body">
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background:
                      statusToggleUser.trang_thai === "active"
                        ? "#fef2f2"
                        : "#ecfdf5",
                    color:
                      statusToggleUser.trang_thai === "active"
                        ? "#dc2626"
                        : "#059669",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {statusToggleUser.trang_thai === "active" ? (
                    <Lock size={20} />
                  ) : (
                    <Unlock size={20} />
                  )}
                </div>
                <div>
                  <p
                    style={{
                      margin: "0 0 8px",
                      fontSize: "14px",
                      color: "#21181d",
                    }}
                  >
                    Bạn có chắc chắn muốn{" "}
                    <strong>
                      {statusToggleUser.trang_thai === "active"
                        ? "khóa tài khoản"
                        : "mở khóa lại cho"}
                    </strong>{" "}
                    người dùng <strong>{statusToggleUser.ho_ten}</strong> (
                    <code>{statusToggleUser.thu_dien_tu}</code>)?
                  </p>
                  <p
                    style={{ margin: 0, fontSize: "12.5px", color: "#7a6f71" }}
                  >
                    {statusToggleUser.trang_thai === "active"
                      ? "Khi bị khóa, người dùng sẽ không thể đăng nhập hoặc thực hiện hỏi đáp AI cho đến khi được quản trị viên mở lại."
                      : "Người dùng sẽ có thể đăng nhập bình thường sau khi mở khóa."}
                  </p>
                </div>
              </div>
            </div>
            <div className="cl-admin-modal-footer">
              <button
                className="cl-admin-btn-outline"
                onClick={() => setStatusToggleUser(null)}
              >
                Hủy bỏ
              </button>
              <button
                className="cl-admin-btn-primary"
                style={{
                  background:
                    statusToggleUser.trang_thai === "active"
                      ? "#dc2626"
                      : "#059669",
                }}
                onClick={handleConfirmToggleStatus}
              >
                {statusToggleUser.trang_thai === "active" ? (
                  <>
                    <Lock size={15} />
                    <span>Xác nhận khóa</span>
                  </>
                ) : (
                  <>
                    <Unlock size={15} />
                    <span>Mở khóa tài khoản</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Xác nhận Xóa tài khoản vĩnh viễn */}
      {deletingUser && (
        <div
          className="cl-admin-modal-overlay"
          onClick={() => setDeletingUser(null)}
        >
          <div
            className="cl-admin-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cl-admin-modal-header">
              <h3 style={{ color: "#dc2626" }}>Xóa tài khoản người dùng</h3>
              <button
                className="cl-admin-modal-close"
                onClick={() => setDeletingUser(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="cl-admin-modal-body">
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: "#fef2f2",
                    color: "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <p
                    style={{
                      margin: "0 0 8px",
                      fontSize: "14px",
                      color: "#21181d",
                    }}
                  >
                    Thao tác này sẽ xóa vĩnh viễn tài khoản{" "}
                    <strong>{deletingUser.ho_ten}</strong> (
                    <code>{deletingUser.thu_dien_tu}</code>) khỏi bảng{" "}
                    <code>nguoi_dung</code> trong cơ sở dữ liệu.
                  </p>
                  <p
                    style={{ margin: 0, fontSize: "12.5px", color: "#b91c1c" }}
                  >
                    Cảnh báo: Toàn bộ dữ liệu hội thoại (<code>hoi_thoai</code>)
                    và lịch sử liên quan sẽ bị xóa theo ràng buộc CASCADE. Thao
                    tác này không thể hoàn tác.
                  </p>
                </div>
              </div>
            </div>
            <div className="cl-admin-modal-footer">
              <button
                className="cl-admin-btn-outline"
                onClick={() => setDeletingUser(null)}
              >
                Hủy bỏ
              </button>
              <button
                className="cl-admin-btn-primary"
                style={{ background: "#dc2626" }}
                onClick={handleConfirmDelete}
              >
                <Trash2 size={15} />
                <span>Xác nhận xóa vĩnh viễn</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
