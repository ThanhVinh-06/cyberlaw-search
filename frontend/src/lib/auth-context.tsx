import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { authApi, AuthApiError, type SessionUser } from "./auth-api";

interface AuthContextType {
  currentUser: SessionUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isUser: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; user?: SessionUser; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const generation = useRef(0);
  const mutating = useRef(false);

  useEffect(() => {
    let disposed = false;
    // Legacy demo storage is never an authentication source.
    try {
      sessionStorage.removeItem("cyberlaw_current_user");
    } catch {
      /* storage disabled */
    }
    const refresh = async () => {
      if (mutating.current) return;
      const version = generation.current;
      try {
        const user = await authApi.me();
        if (!disposed && version === generation.current) {
          setCurrentUser(user);
          setSessionError("");
        }
      } catch (error) {
        if (!disposed && version === generation.current) {
          if (error instanceof AuthApiError && error.status === 401)
            setCurrentUser(null);
          else
            setSessionError(
              "Không thể kiểm tra phiên đăng nhập. Bạn kiểm tra kết nối rồi tải lại trang nhé.",
            );
        }
      } finally {
        if (!disposed) setLoading(false);
      }
    };
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const login: AuthContextType["login"] = async (email, password) => {
    generation.current++;
    mutating.current = true;
    setSessionError("");
    try {
      const user = await authApi.login(email, password);
      setCurrentUser(user);
      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Không thể đăng nhập. Bạn hãy thử lại.",
      };
    } finally {
      mutating.current = false;
    }
  };

  const logout = async () => {
    if (mutating.current) return;
    generation.current++;
    mutating.current = true;
    try {
      await authApi.logout();
      setCurrentUser(null);
      setSessionError("");
    } catch {
      setSessionError(
        "Chưa đăng xuất được vì kết nối gián đoạn. Bạn hãy thử đăng xuất lại.",
      );
    } finally {
      mutating.current = false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        isAuthenticated: currentUser !== null,
        isAdmin:
          currentUser?.vai_tro === "admin" &&
          currentUser.trang_thai === "active",
        isUser:
          currentUser?.vai_tro === "user" &&
          currentUser.trang_thai === "active",
        login,
        logout,
      }}
    >
      {children}
      {sessionError && (
        <div className="auth-session-alert" role="alert">
          {sessionError}
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => setSessionError("")}
          >
            ×
          </button>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
