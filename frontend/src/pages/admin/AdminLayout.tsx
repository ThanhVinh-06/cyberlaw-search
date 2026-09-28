import { ReactNode, useRef, useState } from "react";
import { Dialog } from "radix-ui";
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
  Library,
} from "lucide-react";
import { Brand } from "@/components/Brand";
import "@/admin.css";

interface AdminLayoutProps {
  children: ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string, instant?: boolean) => void;
}

export default function AdminLayout({
  children,
  activeTab = "users",
  onTabChange,
}: AdminLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
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
  const currentTabLabel =
    activeTab === "users"
      ? "Phân quyền & Quản lý người dùng"
      : activeTab === "stats"
        ? "Báo cáo thống kê"
        : (navItems.find((item) => item.id === activeTab)?.label ?? "Quản trị");

  return (
    <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
      <div className="cl-admin-shell">
        {/* Mobile Drawer Overlay */}
        <Dialog.Portal>
          <Dialog.Overlay className="cl-admin-mobile-backdrop" />
          <Dialog.Content
            className="cl-admin-sidebar cl-admin-mobile-drawer"
            aria-describedby={undefined}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              menuTrigger.current?.focus({ preventScroll: true });
            }}
          >
            <Dialog.Title className="sr-only">Điều hướng quản trị</Dialog.Title>
            <div className="site-sidebar-header">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Brand onClick={() => setMobileOpen(false)} />
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
                    title={item.label}
                    onClick={(event) => {
                      if (onTabChange) onTabChange(item.id, event.detail === 0);
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
          </Dialog.Content>
        </Dialog.Portal>

        {/* Desktop Sidebar */}
        <aside className="cl-admin-sidebar" aria-label="Điều hướng quản trị">
          <div className="site-sidebar-header">
            <Brand />
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
                  title={item.label}
                  onClick={(event) =>
                    onTabChange?.(item.id, event.detail === 0)
                  }
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
              <Library size={19} />
              <span>Thư viện văn bản</span>
            </Link>
          </div>

          <div className="cl-admin-sidebar-footer">
            <div className="cl-admin-user-card">
              <div className="cl-admin-user-avatar">AD</div>
              <div className="cl-admin-user-info">
                <span className="cl-admin-user-name">
                  Quản trị viên Hệ thống
                </span>
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
            <div className="cl-admin-topbar-leading">
              <button
                ref={menuTrigger}
                className="cl-admin-action-btn"
                id="cl-admin-mobile-toggle"
                onClick={() => setMobileOpen(true)}
                aria-label="Mở menu quản trị"
                aria-expanded={mobileOpen}
                aria-haspopup="dialog"
              >
                <Menu size={18} />
              </button>
              <div className="cl-admin-breadcrumb">
                <Link className="cl-admin-breadcrumb-parent" to="/search">
                  CyberLaw
                </Link>
                <span className="cl-admin-breadcrumb-parent" aria-hidden="true">
                  /
                </span>
                <span className="cl-admin-breadcrumb-parent">
                  Khu vực Quản trị
                </span>
                <span className="cl-admin-breadcrumb-parent" aria-hidden="true">
                  /
                </span>
                <span
                  className="cl-admin-breadcrumb-active"
                  title={currentTabLabel}
                >
                  {currentTabLabel}
                </span>
              </div>
            </div>

            <div className="cl-admin-topbar-actions">
              <div className="cl-admin-status-pill cl-admin-database-status">
                <Database size={13} style={{ color: "#800020" }} />
                <span>
                  {activeTab === "documents" ? "Bản minh họa" : "MySQL 8.0"}
                </span>
                {activeTab !== "documents" && (
                  <span className="cl-admin-status-dot" />
                )}
              </div>
              <Link
                to="/search"
                className="cl-admin-btn-outline cl-admin-search-link"
                aria-label="Giao diện Tra cứu"
                title="Giao diện Tra cứu"
              >
                <ArrowLeft size={14} />
                <span>Giao diện Tra cứu</span>
              </Link>
            </div>
          </header>

          <main className="cl-admin-content">{children}</main>
        </div>
      </div>
    </Dialog.Root>
  );
}
