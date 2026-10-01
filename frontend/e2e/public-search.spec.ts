import { test, expect } from "./auth-fixtures";

const row = (id: number) => ({
  id: String(id),
  category: "general",
  label: "Quy định",
  title: `Điều ${id}. Nội dung kiểm thử`,
  summary: "Nội dung an ninh mạng",
  text: "Nguyên văn kiểm thử",
  note: "Trang 1",
  source: "https://example.test/law",
  so_dieu: String(id),
  so_khoan: "1",
});

test("pagination uses applied filters, failed search has no demo fallback, detail revocation is visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 440, height: 956 });
  const requests: URL[] = [];
  await page.route(/\/api\/search(?:\?|\/|$)/, async (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    if (/\/search\/\d+$/.test(url.pathname))
      return route.fulfill({ status: 404, json: { message: "Removed" } });
    if (url.searchParams.get("q") === "fail")
      return route.fulfill({
        status: 500,
        json: { message: "Internal error" },
      });
    const current = Number(url.searchParams.get("page") || 1);
    await route.fulfill({
      json: {
        items:
          current === 1
            ? Array.from({ length: 30 }, (_, i) => row(i + 1))
            : [row(31)],
        total: 31,
        page: current,
        law: "116/2025/QH15",
      },
    });
  });
  await page.goto("/search");
  await expect(page.locator(".cl-result")).toHaveCount(30);
  await page.getByLabel("Từ khóa hoặc câu hỏi").fill("unsent");
  await page.getByRole("button", { name: "Trang sau" }).click();
  await expect(page.locator(".cl-result")).toHaveCount(1);
  expect(requests.at(-1)?.searchParams.get("q")).toBe("an ninh mạng");
  await expect(page.getByRole("button", { name: "Trang sau" })).toBeDisabled();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(440);
  await page
    .getByRole("button", { name: "Xem điều khoản", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Không thể tải điều khoản",
  );
  await expect(page.getByRole("dialog")).not.toContainText(
    "Nguyên văn kiểm thử",
  );
  await page.keyboard.press("Escape");
  await page.getByLabel("Từ khóa hoặc câu hỏi").fill("fail");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Không thể tải dữ liệu");
  await expect(page.locator(".cl-result")).toHaveCount(0);
});

test("late response cannot replace newer results and typing never replays entrances", async ({
  page,
}) => {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/api\/search\?/, async (route) => {
    const q = new URL(route.request().url()).searchParams.get("q");
    if (q === "slow") await held;
    await route.fulfill({
      json: {
        items: [row(q === "slow" ? 1 : 2)],
        total: 1,
        page: 1,
        law: "116/2025/QH15",
      },
    });
  });
  await page.goto("/search");
  await expect(page.locator(".cl-result")).toHaveCount(1);
  const input = page.getByLabel("Từ khóa hoặc câu hỏi");
  await input.fill("slow");
  await input.press("Enter");
  await input.fill("new");
  await input.press("Enter");
  await expect(page.locator(".cl-result")).toContainText("Điều 2.");
  const oldResponse = page.waitForResponse((r) => r.url().includes("q=slow"));
  release();
  await oldResponse;
  await expect(page.locator(".cl-result")).toContainText("Điều 2.");
  await expect(page.locator(".cl-result-reveal")).toHaveCSS(
    "transform",
    "none",
  );
});
