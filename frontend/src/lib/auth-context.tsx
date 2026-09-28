import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { NguoiDung, initialNguoiDungList } from "./admin-data";

interface AuthContextType {
  currentUser: NguoiDung | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isUser: boolean;
  login: (
    email: string,
    password: string,
  ) => { success: boolean; user?: NguoiDung; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "cyberlaw_current_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<NguoiDung | null>(() => {
    try {
      const saved = sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore storage errors
    }
    return null;
  });

  const login = (email: string, password: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    // Tìm người dùng trong danh sách
    const matchedUser = initialNguoiDungList.find(
      (u) => u.thu_dien_tu.toLowerCase() === trimmedEmail,
    );

    if (!matchedUser) {
      return {
        success: false,
        error: "Email hoặc mật khẩu không chính xác.",
      };
    }

    // Kiểm tra tài khoản bị khóa
    if (matchedUser.trang_thai === "blocked") {
      return {
        success: false,
        error:
          "Tài khoản này đang bị tạm khóa. Vui lòng liên hệ Quản trị viên để được hỗ trợ.",
      };
    }

    // Mật khẩu mẫu:
    // Admin: "admin12345"
    // User: "user12345"
    // Hoặc mật khẩu đã gán trong đối tượng (nếu có)
    const expectedPassword =
      matchedUser.mat_khau ||
      (matchedUser.vai_tro === "admin" ? "admin12345" : "user12345");

    if (trimmedPassword !== expectedPassword) {
      return {
        success: false,
        error: "Mật khẩu không chính xác. Vui lòng thử lại.",
      };
    }

    // Đăng nhập thành công
    setCurrentUser(matchedUser);
    try {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(matchedUser));
    } catch {
      // Ignore storage error
    }

    return {
      success: true,
      user: matchedUser,
    };
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  const isAuthenticated = currentUser !== null;
  const isAdmin = currentUser?.vai_tro === "admin";
  const isUser = currentUser?.vai_tro === "user";

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isAdmin,
        isUser,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
