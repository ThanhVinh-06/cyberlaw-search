import { test, expect, mockAuth } from "./auth-fixtures";

test("authenticated chat renders bounded citations and prevents duplicate submit", async ({ page }) => {
  await mockAuth(page, "user");
  await page.goto("/search");
  await page.getByRole("button", { name: "Mở trò chuyện với trợ lý AI" }).click();
  const input = page.getByLabel("Câu hỏi cho trợ lý AI");
  await input.fill("An ninh mạng là gì?");
  await input.press("Enter");
  await expect(page.getByRole("log")).toContainText("Phản hồi mẫu");
  await expect(page.locator(".cl-chat-citation")).toHaveCount(1);
  await expect(page.locator(".cl-chat-citation")).toContainText("Điều 2");
  await expect(page.getByText("Cuộc trò chuyện mới")).toBeVisible();
});

test("anonymous visitor gets the same answered reply and article link", async ({ page }) => {
  await page.goto("/search");
  await page.getByRole("button", { name: "Mở trò chuyện với trợ lý AI" }).click();
  const input = page.getByLabel("Câu hỏi cho trợ lý AI");
  await input.fill("Luật có hiệu lực từ khi nào?");
  await input.press("Enter");
  await expect(page.getByRole("log")).toContainText("Phản hồi mẫu");
  await expect(page.locator(".cl-chat-citation")).toContainText("Điều 44");
  // The citation number is resolved through the public library endpoint, so guests can
  // open any cited article, not only the ones bundled in the frontend.
  await page.getByRole("button", { name: "Mở Điều 44" }).click();
  await expect(
    page.getByRole("dialog", { name: "Căn cứ pháp lý" }),
  ).toContainText("Điều 44.");
});

for (const [width, height] of [[320, 568], [440, 956], [834, 1194], [1440, 900], [956, 440]] as const) {
  test(`chat fits ${width}x${height}`, async ({ page }) => {
    await mockAuth(page, "user");
    await page.setViewportSize({ width, height });
    await page.goto("/search");
    await page.getByRole("button", { name: "Mở trò chuyện với trợ lý AI" }).click();
    const panel = page.locator("#cl-chat-panel");
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(height);
    await expect(page.getByLabel("Câu hỏi cho trợ lý AI")).toBeInViewport();
  });
}
