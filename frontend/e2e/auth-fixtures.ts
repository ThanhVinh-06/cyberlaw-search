import {
  test as base,
  expect,
  type Page,
  type BrowserContext,
} from "@playwright/test";
import {mockAdminUsers} from './admin-user-fixtures';

// UI-only fixtures. Real cookie/CSRF integration has its own config and never imports this file.
export async function mockAuth(
  target: Page | BrowserContext,
  role: "admin" | "user" | null = null,
) {
  if (role === 'admin') await mockAdminUsers(target);
  let currentRole = role;
  let resetAttempts = 0;
  let verificationEmail = "verify@example.test";
  let verificationAttempts = 0;
  const user = () => ({
    ma_nguoi_dung: currentRole === "admin" ? 1 : 2,
    ho_ten: "Tài khoản kiểm thử",
    thu_dien_tu: `${currentRole}@example.test`,
    vai_tro: currentRole,
    trang_thai: "active",
    ngay_tao: "2026-01-01",
    ngay_cap_nhat: "2026-01-01",
  });
  await target.route("**/api/auth/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let status = 200;
    let body: object = {};
    if (path.endsWith("/csrf")) body = { csrf_token: "ui-fixture-csrf" };
    else if (path.endsWith("/email/status") || path.endsWith("/email/send")) {
      if (path.endsWith("/email/send")) verificationAttempts = 0;
      body = {
        email: verificationEmail,
        expires_in: 300,
        resend_after: 30,
        locked: verificationAttempts >= 5,
      };
    } else if (path.endsWith("/email/verify")) {
      if (route.request().postDataJSON().code !== "654321") {
        verificationAttempts++;
        status = 422;
        body = {
          code:
            verificationAttempts >= 5
              ? "verification_locked"
              : "verification_invalid",
        };
      } else body = { message: "Verified" };
    } else if (path.endsWith("/password/request")) {
      resetAttempts = 0;
      status = 202;
      body = {
        message:
          "Nếu email thuộc tài khoản đang hoạt động, bạn sẽ nhận được mã xác nhận.",
        expires_in: 300,
        resend_after: 30,
      };
    } else if (path.endsWith("/password/verify")) {
      if (route.request().postDataJSON().code !== "123456") {
        resetAttempts++;
        status = 422;
        body = { code: resetAttempts >= 5 ? "reset_locked" : "reset_invalid" };
      } else
        body = { message: "Đã xác nhận mã. Bạn có thể nhập mật khẩu mới." };
    } else if (path.endsWith("/password/complete")) {
      currentRole = null;
      body = { message: "Đổi mật khẩu thành công." };
    } else if (path.endsWith("/register")) {
      verificationEmail = route.request().postDataJSON().email;
      status = 201;
      body = {
        message: "Created",
        verification_required: true,
        mail_sent: true,
      };
    } else if (path.endsWith("/logout")) {
      currentRole = null;
      body = { message: "OK" };
    } else if (path.endsWith("/login")) {
      const { email, password } = route.request().postDataJSON();
      if (
        ["admin@example.test", "user@example.test"].includes(email) &&
        password === "UI-fixture-only!123"
      ) {
        currentRole = email.startsWith("admin") ? "admin" : "user";
        body = { user: user() };
      } else {
        status = 401;
        body = { message: "Email hoặc mật khẩu không chính xác." };
      }
    } else if (currentRole) body = { user: user() };
    else {
      status = 401;
      body = { message: "Unauthenticated" };
    }
    await route.fulfill({ status, json: body });
  });
  // Public-search UI tests use a small approved fixture. The real HTTP contract
  // is covered by backend tests and never falls back to this data in the app.
  const publicArticles = [
    { id: "1", category: "general", label: "Quy định chung", title: "Điều 1. Phạm vi điều chỉnh và đối tượng áp dụng", summary: "Quy định về an ninh mạng.", text: "Luật này quy định về an ninh mạng.", note: "Luật số 116/2025/QH15.", source: "https://example.test/source", so_dieu: "1", so_khoan: "1" },
    { id: "2", category: "definition", label: "Khái niệm", title: "Điều 2. Giải thích từ ngữ", summary: "Khái niệm an ninh mạng.", text: "An ninh mạng là sự ổn định của không gian mạng.", note: "Luật số 116/2025/QH15.", source: "https://example.test/source", so_dieu: "2", so_khoan: "1" },
    { id: "44", category: "effect", label: "Hiệu lực thi hành", title: "Điều 44. Hiệu lực thi hành", summary: "Thời điểm Luật An ninh mạng có hiệu lực.", text: "Luật An ninh mạng có hiệu lực từ ngày 01 tháng 7 năm 2026.", note: "Luật số 116/2025/QH15.", source: "https://example.test/source", so_dieu: "44", so_khoan: "1" },
  ];
  await target.route(/\/api\/search(?:\?|\/|$)/, async (route) => {
    const url = new URL(route.request().url());
    const id = url.pathname.match(/\/api\/search\/(\d+)$/)?.[1];
    if (id) {
      const article = publicArticles.find((item) => item.id === id);
      await route.fulfill({ status: article ? 200 : 404, json: article ?? { message: "Not found" } });
      return;
    }
    const norm = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
    const q = norm(url.searchParams.get("q") ?? "");
    const mode = url.searchParams.get("mode") ?? "all";
    const category = url.searchParams.get("category") ?? "all";
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    const items = publicArticles.filter((article) => {
      if (category !== "all" && article.category !== category) return false;
      if (from > "2025-12-10" || (to && to < "2025-12-10")) return false;
      if (!q) return true;
      if (mode === "article" || /^dieu\s*\d+$/.test(q)) return article.id === q.replace(/dieu\s*/, "").trim();
      const target = norm(`${article.title} ${article.text}`);
      return target.includes(q);
    });
    await route.fulfill({ status: 200, json: { items, total: items.length, page: 1, per_page: 30, law: "116/2025/QH15" } });
  });
  await target.route("**/api/library", async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        document: {
          id: "1",
          so_hieu: "116/2025/QH15",
          tieu_de: "Luật An ninh mạng",
          co_quan_ban_hanh: "Quốc hội",
          ngay_ban_hanh: "2025-12-10",
          ngay_hieu_luc: "2026-07-01",
          source: "https://example.test/source",
          pdf: false,
          phien_ban_noi_dung: 1,
        },
        articles: publicArticles.map((item) => ({ ...item, chuong: "Chương I", tieu_de: item.title.replace(/^Điều\s+\d+\.\s*/, "") })),
        total: publicArticles.length,
        law: "116/2025/QH15",
      },
    });
  });
  // Signed-in history is stateful so tests can ask a question and then find it stored.
  // Guests keep getting 401: they may chat, but they can never list their threads back.
  const conversations: {
    id: string;
    title: string;
    updated_at: string;
    messages: { id: string; role: "user" | "assistant"; text: string; status: string; created_at: string; citations: object[] }[];
  }[] = [];
  await target.route("**/api/history**", async (route) => {
    if (!currentRole) {
      await route.fulfill({ status: 401, json: { message: "Unauthenticated" } });
      return;
    }
    const url = new URL(route.request().url());
    const id = url.pathname.match(/\/api\/history\/([^/]+)$/)?.[1];
    if (route.request().method() === "DELETE") {
      const index = conversations.findIndex((item) => item.id === id);
      if (index >= 0) conversations.splice(index, 1);
      await route.fulfill({ status: 200, json: { deleted: true } });
      return;
    }
    if (id) {
      const conversation = conversations.find((item) => item.id === id);
      await route.fulfill({
        status: conversation ? 200 : 404,
        json: conversation
          ? { id: conversation.id, title: conversation.title, page: 1, total: conversation.messages.length, per_page: 20, messages: conversation.messages }
          : { message: "Not found" },
      });
      return;
    }
    await route.fulfill({
      status: 200,
      json: { items: conversations.map(({ id, title, updated_at }) => ({ id, title, updated_at })), total: conversations.length, page: 1, per_page: 12 },
    });
  });
  // The browser suite is UI-only. Keep the AI transport deterministic here;
  // the real Laravel route is covered by LocalAnswerTest. Guests get the same
  // 200 as signed-in users: the assistant is open to anonymous visitors.
  await target.route("**/api/answer", async (route) => {
    const input = route.request().postDataJSON() as { question?: string; request_id?: string };
    const question = input.question ?? "";
    // Mirror the real retriever: the citation follows the question, so a test that asks
    // about the effective date gets Điều 44 and everything else gets Điều 2.
    const article = /hiệu lực/i.test(question) ? publicArticles[2] : publicArticles[1];
    const answer = "Phản hồi mẫu từ căn cứ đã được duyệt.";
    const citation = {
      id: "ui-fixture-citation", law: "116/2025/QH15", title: "Luật An ninh mạng", article: article.so_dieu,
      clause: "1", point: "", text: article.text, source: "https://example.test/source", version: 1, page: 1,
    };
    // A signed-in question shows up in the history list, exactly like the real backend.
    if (currentRole) {
      let conversation = conversations[0];
      if (!conversation) {
        conversation = { id: "ui-fixture-conversation", title: question.slice(0, 80), updated_at: "2026-10-02T10:00:00Z", messages: [] };
        conversations.unshift(conversation);
      }
      conversation.messages.push(
        { id: `ui-fixture-q-${conversation.messages.length}`, role: "user", text: question, status: "answered", created_at: "2026-10-02T10:00:00Z", citations: [] },
        { id: `ui-fixture-a-${conversation.messages.length}`, role: "assistant", text: answer, status: "answered", created_at: "2026-10-02T10:00:01Z", citations: [citation] },
      );
    }
    await route.fulfill({
      status: 200,
      json: {
        conversation_id: "ui-fixture-conversation",
        message_id: input.request_id ?? "ui-fixture-message",
        status: "answered",
        answer,
        engine: "fixture",
        citations: [citation],
      },
    });
  });
  await target.route("**/api/terms*", async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        items: [
          {
            id: "1",
            cum_tu: "An ninh mạng",
            bien_the: ["an ninh mang"],
            dinh_nghia: "Sự ổn định của không gian mạng.",
            article: publicArticles[1],
          },
        ],
        total: 1,
        page: 1,
        per_page: 12,
      },
    });
  });
  await target.route("**/api/library/articles/*", async (route) => {
    const number = new URL(route.request().url()).pathname.split("/").pop() ?? "1";
    const article = publicArticles.find((item) => item.so_dieu === number);
    if (!article) {
      await route.fulfill({ status: 404, json: { message: "Not found" } });
      return;
    }
    await route.fulfill({
      status: 200,
      json: {
        document: {
          so_hieu: "116/2025/QH15", tieu_de: "Luật An ninh mạng", co_quan_ban_hanh: "Quốc hội",
          ngay_ban_hanh: "2025-12-10", ngay_hieu_luc: "2026-07-01", phien_ban_noi_dung: 1,
          source: "https://example.test/source", pdf: false,
        },
        so_dieu: article.so_dieu,
        tieu_de: article.title.replace(/^Điều\s+\d+\.\s*/, ""),
        units: [{ id: article.id, so_khoan: article.so_khoan, ky_hieu_diem: "", noi_dung: article.text, trang_nguon: 1 }],
      },
    });
  });
}

export async function fillLogin(page: Page, role: "admin" | "user") {
  await page.getByLabel("Địa chỉ email").fill(`${role}@example.test`);
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("UI-fixture-only!123");
}

export const test = base.extend<{ authFixture: void }>({
  authFixture: [
    async ({ context }, use) => {
      await mockAuth(context);
      await use();
    },
    { auto: true },
  ],
});
export { expect };
export type { Page };
