import { ReactNode, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  ShieldCheck,
  Users,
  ShieldAlert,
  BarChart3,
  FileText,
  ArrowLeft,
  Menu,
  X,
  Database,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import "@/admin.css";

interface AdminLayoutProps {
  children: ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function AdminLayout({
  children,
  activeTab = "users",
  onTabChange,
}: AdminLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    {
      id: "users",
      label: "Người dùng & Phân quyền",
      icon: Users,
    },
    {
      id: "matrix",
      label: "Ma trận quyền hạn",
      icon: ShieldCheck,
    },
    {
      id: "stats",
      label: "Thống kê & Báo cáo",
      icon: BarChart3,
    },
    {
      id: "documents",
      label: "Văn bản & Tri thức",
      icon: FileText,
    },
  ];

  return (
    <div className="cl-admin-shell">
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="cl-admin-modal-overlay"
          style={{ zIndex: 60 }}
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="cl-admin-sidebar"
            style={{
              display: "flex",
              position: "fixed",
              left: 0,
              top: 0,
              bottom: 0,
              width: "280px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cl-admin-sidebar-header">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div className="cl-admin-brand">
                  <div className="cl-admin-brand-icon">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="cl-admin-brand-title">
                    <strong>
                      Cyber<span>Law</span>
                    </strong>
                    <small>BẢNG ĐIỀU KHIỂN QUẢN TRỊ</small>
                  </div>
                </div>
                <button
                  className="cl-admin-action-btn"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Đóng menu"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="cl-admin-sidebar-nav">
              <div className="cl-admin-nav-group-title">QUẢN TRỊ HỆ THỐNG</div>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    className={`cl-admin-nav-item ${isActive ? "active" : ""}`}
                    onClick={() => {
                      if (onTabChange) onTabChange(item.id);
                      setMobileOpen(false);
                    }}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="cl-admin-sidebar-footer">
              <Link to="/search" className="cl-admin-back-btn">
                <ArrowLeft size={16} />
                <span>Về trang tra cứu</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="cl-admin-sidebar" aria-label="Điều hướng quản trị">
        <div className="cl-admin-sidebar-header">
          <Link to="/admin" className="cl-admin-brand">
            <div className="cl-admin-brand-icon">
              <ShieldCheck size={20} />
            </div>
            <div className="cl-admin-brand-title">
              <strong>
                Cyber<span>Law</span> Admin
              </strong>
              <small>HỆ THỐNG QUẢN TRỊ & PHÂN QUYỀN</small>
            </div>
          </Link>
        </div>

        <div className="cl-admin-sidebar-nav">
          <div className="cl-admin-nav-group-title">QUẢN TRỊ HỆ THỐNG</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`cl-admin-nav-item ${isActive ? "active" : ""}`}
                onClick={() => onTabChange && onTabChange(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div
            className="cl-admin-nav-group-title"
            style={{ marginTop: "14px" }}
          >
            LIÊN KẾT HỆ THỐNG
          </div>
          <Link to="/search" className="cl-admin-nav-item" target="_blank">
            <ExternalLink size={16} />
            <span>Xem trang tra cứu</span>
          </Link>
          <Link to="/library" className="cl-admin-nav-item" target="_blank">
            <FileText size={16} />
            <span>Thư viện văn bản</span>
          </Link>
        </div>

        <div className="cl-admin-sidebar-footer">
          <div className="cl-admin-user-card">
            <div className="cl-admin-user-avatar">AD</div>
            <div className="cl-admin-user-info">
              <span className="cl-admin-user-name">Quản trị viên Hệ thống</span>
              <span className="cl-admin-user-role">admin@cyberlaw.vn</span>
            </div>
          </div>
          <Link to="/search" className="cl-admin-back-btn">
            <ArrowLeft size={16} />
            <span>Quay lại trang tra cứu</span>
          </Link>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="cl-admin-workspace">
        <header className="cl-admin-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              className="cl-admin-action-btn"
              style={{ display: "none" }}
              id="cl-admin-mobile-toggle"
              onClick={() => setMobileOpen(true)}
              aria-label="Mở menu quản trị"
            >
              <Menu size={18} />
            </button>
            <div className="cl-admin-breadcrumb">
              <Link to="/search">CyberLaw</Link>
              <span>/</span>
              <span>Khu vực Quản trị</span>
              <span>/</span>
              <span className="cl-admin-breadcrumb-active">
                {activeTab === "users" && "Phân quyền & Quản lý người dùng"}
                {activeTab === "matrix" && "Ma trận quyền hạn"}
                {activeTab === "stats" && "Báo cáo thống kê"}
                {activeTab === "documents" && "Văn bản & Tri thức"}
              </span>
            </div>
          </div>

          <div className="cl-admin-topbar-actions">
            <div className="cl-admin-status-pill">
              <Database size={13} style={{ color: "#800020" }} />
              <span>MySQL 8.0</span>
              <span className="cl-admin-status-dot" />
            </div>
            <Link to="/search" className="cl-admin-btn-outline">
              <ArrowLeft size={14} />
              <span>Giao diện Tra cứu</span>
            </Link>
          </div>
        </header>

        <main className="cl-admin-content">{children}</main>
      </div>
    </div>
  );
}
