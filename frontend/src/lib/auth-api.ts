import type { NguoiDung } from "./admin-data";

export type SessionUser = Omit<NguoiDung, "mat_khau" | "ma_ghi_nho">;

export class AuthApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request(path: string, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(`/api/auth/${path}`, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json", ...init?.headers },
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new AuthApiError(
      0,
      "Không thể kết nối dịch vụ tài khoản. Bạn kiểm tra kết nối rồi thử lại nhé.",
    );
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    const messages: Record<number, string> = {
      401:
        path === "login"
          ? "Email hoặc mật khẩu không chính xác."
          : "Phiên đăng nhập đã hết hạn. Bạn hãy đăng nhập lại.",
      403: "Bạn không có quyền thực hiện thao tác này.",
      419: "Phiên bảo vệ đã hết hạn. Bạn hãy thử lại.",
      422: "Bạn hãy kiểm tra lại email và mật khẩu.",
      429: "Bạn đã thử quá nhiều lần. Vui lòng chờ một phút rồi thử lại.",
    };
    throw new AuthApiError(
      response.status,
      messages[response.status] ??
        "Dịch vụ tài khoản tạm thời gián đoạn. Bạn hãy thử lại sau.",
    );
  }
  return data;
}

async function mutate(path: string, data: object = {}) {
  const { csrf_token } = await request("csrf");
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": csrf_token },
    body: JSON.stringify(data),
  });
}

export const authApi = {
  me: async (): Promise<SessionUser> => (await request("me")).user,
  login: async (email: string, password: string): Promise<SessionUser> =>
    (await mutate("login", { email: email.trim().toLowerCase(), password }))
      .user,
  logout: async () => {
    await mutate("logout");
  },
};
