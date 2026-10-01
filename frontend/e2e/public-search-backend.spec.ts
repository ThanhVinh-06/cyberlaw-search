import { test, expect } from "@playwright/test";

test("guest searches published law via real Laravel and opens a responsive citation", async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(120000);
  const csrf = async () =>
    (await (await context.request.get("/api/auth/csrf")).json()).csrf_token;
  expect(
    (
      await context.request.post("/api/auth/login", {
        headers: { "X-CSRF-TOKEN": await csrf() },
        data: { email: "admin@example.test", password: "Browser-fixture!123" },
      })
    ).status(),
  ).toBe(200);
  const mutate = async (path: string, data: object) => {
    const snapshot = await (
      await context.request.get("/api/admin/knowledge")
    ).json();
    const response = await context.request.post(
      `/api/admin/knowledge/${path}`,
      {
        headers: { "X-CSRF-TOKEN": await csrf() },
        data: { ...data, revision: snapshot.revision },
      },
    );
    expect(response.ok()).toBeTruthy();
    return response.json();
  };
  const snapshot = await mutate("van_ban", {
    so_hieu: "116/2025/QH15",
    tieu_de: "Luật An ninh mạng — fixture",
    ngay_ban_hanh: "2025-12-10",
    ngay_hieu_luc: "2026-07-01",
    lien_ket_nguon: "https://example.test/law",
  });
  const document = snapshot.van_ban.find(
    (v: { so_hieu: string }) => v.so_hieu === "116/2025/QH15",
  );
  const clauses = await mutate("dieu_khoan", {
    ma_van_ban: document.ma_van_ban,
    so_dieu: "2",
    so_khoan: "1",
    ky_hieu_diem: "",
    tieu_de: "Giải thích từ ngữ",
    noi_dung:
      "An ninh mạng: nội dung giả chỉ dành cho kiểm thử. <script>alert(1)</script>",
    trang_nguon: 1,
    thu_tu: 1,
  });
  const clause = clauses.dieu_khoan.find(
    (d: { ma_van_ban: number }) => d.ma_van_ban === document.ma_van_ban,
  );
  const guest = await browser.newContext({ baseURL: "http://127.0.0.1:5174" });
  try {
    expect((await (await guest.request.get("/api/search")).json()).total).toBe(
      0,
    );
    expect(
      (await guest.request.get(`/api/search/${clause.ma_dieu_khoan}`)).status(),
    ).toBe(404);
    await mutate(`van_ban/${document.ma_van_ban}/status`, {
      trang_thai: "published",
      da_doi_chieu: true,
    });
    await context.request.post("/api/auth/logout", {
      headers: { "X-CSRF-TOKEN": await csrf() },
    });
    for (const [width, height] of [
      [320, 956],
      [440, 956],
      [834, 1000],
      [956, 440],
      [1440, 1000],
    ]) {
      await page.setViewportSize({ width, height });
      await page.goto("/search");
      await expect(page.locator(".cl-result")).toHaveCount(1);
      await page.getByLabel("Từ khóa hoặc câu hỏi").fill("an ninh mang");
      await page.getByLabel("Từ khóa hoặc câu hỏi").press("Enter");
      await expect(
        page.getByRole("button", { name: "Tìm kiếm", exact: true }),
      ).toBeVisible();
      await expect(page.locator(".cl-result")).toContainText("Điều 2 khoản 1");
      await page
        .getByRole("button", { name: "Xem điều khoản", exact: true })
        .click();
      const dialog = page.getByRole("dialog", { name: "Căn cứ pháp lý" });
      await expect(dialog).toContainText("<script>alert(1)</script>");
      await expect(dialog.locator("script")).toHaveCount(0);
      await expect(dialog).toHaveCSS("transform", "none");
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      const bounds = (await dialog.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
      expect(bounds.height).toBeLessThanOrEqual(height);
      await expect(
        dialog.getByRole("link", { name: /Đối chiếu/ }),
      ).toHaveAttribute("href", "https://example.test/law");
      await page.screenshot({ path: `test-results/search-http-${width}.png` });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
    }
  } finally {
    await guest.close();
  }
});
