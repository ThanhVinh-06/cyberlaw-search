import { Link, useNavigate } from "react-router-dom";
import {
  LockKeyhole,
  ShieldAlert,
  ArrowLeft,
  LogIn,
  LogOut,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function AdminAccessDenied({
  reason,
}: {
  reason: "unauthenticated" | "forbidden";
}) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--background, #f8f7f4)",
        padding: "24px",
        fontFamily: '"Be Vietnam Pro", sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e7e1dd",
          boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
          padding: "36px 32px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "18px",
        }}
      >
        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            backgroundColor:
              reason === "unauthenticated" ? "#fbf2f3" : "#fef2f2",
            color: reason === "unauthenticated" ? "#800020" : "#dc2626",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {reason === "unauthenticated" ? (
            <LockKeyhole size={28} />
          ) : (
            <ShieldAlert size={28} />
          )}
        </div>

        <div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: reason === "unauthenticated" ? "#800020" : "#dc2626",
              textTransform: "uppercase",
              display: "block",
              marginBottom: "6px",
            }}
          >
            {reason === "unauthenticated"
              ? "BẢO MẬT HỆ THỐNG"
              : "LỖI PHÂN QUYỀN (403)"}
          </span>
          <h2
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "#21181d",
              margin: "0 0 8px",
            }}
          >
            {reason === "unauthenticated"
              ? "Yêu cầu đăng nhập Quản trị viên"
              : "Từ chối quyền truy cập"}
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "#6b6062",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {reason === "unauthenticated" ? (
              <>
                Khu vực Quản trị hệ thống và phân quyền người dùng chỉ dành
                riêng cho tài khoản có vai trò{" "}
                <strong>Quản trị viên (Admin)</strong>. Vui lòng đăng nhập để
                tiếp tục.
              </>
            ) : (
              <>
                Bạn đang đăng nhập với tài khoản{" "}
                <strong>{currentUser?.ho_ten}</strong> (vai trò{" "}
                <em>Người dùng</em>). Tài khoản của bạn không có quyền truy cập
                vào Khu vực Quản trị viên.
              </>
            )}
          </p>
        </div>

        {reason === "unauthenticated" && (
          <div
            style={{
              width: "100%",
              backgroundColor: "#faf8f6",
              border: "1px solid #ebd3d7",
              borderRadius: "8px",
              padding: "12px 14px",
              fontSize: "12.5px",
              textAlign: "left",
              color: "#5c4d50",
            }}
          >
            <strong
              style={{
                color: "#800020",
                display: "block",
                marginBottom: "4px",
              }}
            >
              Tài khoản Quản trị viên mẫu để kiểm tra:
            </strong>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "2px",
              }}
            >
              <span>Email:</span>
              <code style={{ fontWeight: 600, color: "#21181d" }}>
                admin@cyberlaw.vn
              </code>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Mật khẩu:</span>
              <code style={{ fontWeight: 600, color: "#21181d" }}>
                admin12345
              </code>
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            width: "100%",
            marginTop: "6px",
          }}
        >
          {reason === "unauthenticated" ? (
            <Link
              to="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "11px 20px",
                backgroundColor: "var(--primary)",
                color: "#ffffff",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
                boxShadow: "0 2px 6px rgba(128,0,32,0.2)",
              }}
            >
              <LogIn size={16} />
              <span>Đăng nhập Quản trị viên</span>
            </Link>
          ) : (
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "11px 20px",
                backgroundColor: "var(--primary)",
                color: "#ffffff",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              <LogOut size={16} />
              <span>Đăng xuất & Đổi tài khoản Admin</span>
            </button>
          )}

          <Link
            to="/search"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px 18px",
              backgroundColor: "#ffffff",
              color: "#4a3e40",
              border: "1px solid #d9d2cd",
              borderRadius: "8px",
              fontSize: "13.5px",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={15} />
            <span>Quay lại trang Tra cứu</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
