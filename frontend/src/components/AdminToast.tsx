import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Lock,
  Unlock,
  Eye,
  Trash2,
  Edit2,
  X,
} from "lucide-react";

export type ToastType =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "lock"
  | "unlock"
  | "delete"
  | "view";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
}

interface AdminToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function AdminToastContainer({ toasts, onDismiss }: AdminToastProps) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        pointerEvents: "none",
        maxWidth: "380px",
        width: "calc(100vw - 48px)",
      }}
      aria-live="polite"
      aria-label="Thông báo hệ thống"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const {
            icon: Icon,
            iconBg,
            iconColor,
            borderColor,
          } = getToastStyles(toast.type);

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{
                opacity: 0,
                scale: 0.9,
                y: 12,
                transition: { duration: 0.18, ease: [0.32, 0, 0.67, 0] },
              }}
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 28,
                mass: 0.8,
              }}
              style={{
                pointerEvents: "auto",
                backgroundColor: "#ffffff",
                borderRadius: "14px",
                border: `1px solid ${borderColor}`,
                padding: "13px 16px",
                boxShadow:
                  "0 12px 32px -4px rgba(33, 24, 29, 0.12), 0 4px 12px -2px rgba(33, 24, 29, 0.06)",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                backdropFilter: "blur(8px)",
                position: "relative",
                overflow: "hidden",
              }}
              role="alert"
            >
              {/* Icon Container */}
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: iconBg,
                  color: iconColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "1px",
                }}
              >
                <Icon size={16} strokeWidth={2.2} />
              </div>

              {/* Text content */}
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                <div
                  style={{
                    fontSize: "13.5px",
                    fontWeight: 600,
                    color: "#21181d",
                    lineHeight: 1.35,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {toast.title}
                </div>
                {toast.description && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6e6466",
                      lineHeight: 1.4,
                      wordBreak: "break-word",
                    }}
                  >
                    {toast.description}
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="Đóng thông báo"
                style={{
                  background: "none",
                  border: "none",
                  color: "#9c9190",
                  padding: "4px",
                  cursor: "pointer",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                  marginLeft: "2px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#21181d";
                  e.currentTarget.style.backgroundColor = "#f3efe9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#9c9190";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function getToastStyles(type: ToastType) {
  switch (type) {
    case "success":
      return {
        icon: CheckCircle2,
        iconBg: "#ecfdf5",
        iconColor: "#059669",
        borderColor: "#a7f3d0",
      };
    case "lock":
      return {
        icon: Lock,
        iconBg: "#fffbeb",
        iconColor: "#d97706",
        borderColor: "#fde68a",
      };
    case "unlock":
      return {
        icon: Unlock,
        iconBg: "#ecfdf5",
        iconColor: "#059669",
        borderColor: "#a7f3d0",
      };
    case "delete":
      return {
        icon: Trash2,
        iconBg: "#fef2f2",
        iconColor: "#dc2626",
        borderColor: "#fecaca",
      };
    case "view":
      return {
        icon: Eye,
        iconBg: "#fbf2f3",
        iconColor: "#800020",
        borderColor: "#eed2d7",
      };
    case "warning":
      return {
        icon: AlertTriangle,
        iconBg: "#fffbeb",
        iconColor: "#d97706",
        borderColor: "#fde68a",
      };
    case "error":
      return {
        icon: AlertTriangle,
        iconBg: "#fef2f2",
        iconColor: "#dc2626",
        borderColor: "#fecaca",
      };
    case "info":
    default:
      return {
        icon: Info,
        iconBg: "#eff6ff",
        iconColor: "#2563eb",
        borderColor: "#bfdbfe",
      };
  }
}
