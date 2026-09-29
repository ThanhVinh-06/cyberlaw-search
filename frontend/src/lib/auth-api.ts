import type { NguoiDung } from "./admin-data";

export type SessionUser = Omit<NguoiDung, "mat_khau" | "ma_ghi_nho">;
export type EmailVerificationStatus = {
  email: string;
  expires_in: number;
  resend_after: number;
  locked: boolean;
};

export class AuthApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
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
      409:
        path === "register" && data?.code === "already_authenticated"
          ? "Bạn hãy đăng xuất trước khi tạo tài khoản mới."
          : "Không thể đăng ký với email này. Bạn hãy thử đăng nhập hoặc dùng email khác.",
      419: "Phiên bảo vệ đã hết hạn. Bạn hãy thử lại.",
      422:
        path === "register"
          ? "Bạn hãy kiểm tra lại thông tin đăng ký."
          : "Bạn hãy kiểm tra lại email và mật khẩu.",
      429: "Bạn đã thử quá nhiều lần. Vui lòng chờ một phút rồi thử lại.",
    };
    throw new AuthApiError(
      response.status,
      data?.code === "email_unverified"
        ? "Bạn hãy xác minh email trước khi đăng nhập."
        : path.startsWith("email/")
          ? response.status === 401
            ? "Phiên xác minh đã hết hạn. Bạn hãy đăng nhập lại để tiếp tục xác minh email."
            : response.status === 429
              ? "Bạn đã gửi hoặc thử nhiều lần. Bạn hãy chờ rồi thử lại."
              : response.status === 422
                ? data?.code === "verification_locked"
                  ? "Mã đã hết lượt thử. Bạn hãy gửi lại mã."
                  : "Mã chưa đúng hoặc đã hết hạn. Bạn hãy kiểm tra lại hoặc gửi mã mới."
                : response.status === 419
                  ? "Phiên bảo vệ đã hết hạn. Bạn hãy thử lại."
                  : "Chưa gửi được email. Bạn hãy thử gửi lại mã sau ít phút."
          : path.startsWith("password/") && [422, 429].includes(response.status)
            ? data?.code === "reset_locked"
              ? "Mã đã hết lượt thử. Bạn hãy gửi lại mã."
              : data?.code === "reset_invalid"
                ? "Mã không hợp lệ hoặc đã hết hạn. Bạn hãy kiểm tra lại hoặc gửi mã mới."
                : data?.code === "reset_cooldown"
                  ? "Bạn hãy chờ 30 giây trước khi gửi lại mã."
                  : response.status === 429
                    ? "Bạn đã thử nhiều lần. Bạn hãy chờ rồi thử lại sau."
                    : "Bạn hãy kiểm tra lại thông tin đã nhập."
            : (messages[response.status] ??
              "Dịch vụ tài khoản tạm thời gián đoạn. Bạn hãy thử lại sau."),
      data?.code,
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
  emailVerificationStatus: (): Promise<EmailVerificationStatus> =>
    request("email/status"),
  sendEmailVerification: (): Promise<EmailVerificationStatus> =>
    mutate("email/send"),
  verifyEmail: (code: string): Promise<void> =>
    mutate("email/verify", { code }),
  requestPasswordReset: (
    email: string,
  ): Promise<{ message: string; expires_in: number; resend_after: number }> =>
    mutate("password/request", { email }),
  verifyPasswordReset: (
    email: string,
    code: string,
  ): Promise<{ message: string }> => mutate("password/verify", { email, code }),
  completePasswordReset: (
    email: string,
    password: string,
    confirmation: string,
  ): Promise<void> =>
    mutate("password/complete", {
      email,
      password,
      password_confirmation: confirmation,
    }),
  register: async (
    name: string,
    email: string,
    password: string,
    confirmation: string,
  ): Promise<{ verification_required: boolean; mail_sent: boolean }> => {
    return mutate("register", {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      password_confirmation: confirmation,
    });
  },
  me: async (): Promise<SessionUser> => (await request("me")).user,
  login: async (email: string, password: string): Promise<SessionUser> =>
    (await mutate("login", { email: email.trim().toLowerCase(), password }))
      .user,
  logout: async () => {
    await mutate("logout");
  },
};
