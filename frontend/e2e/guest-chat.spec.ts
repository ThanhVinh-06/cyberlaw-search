import { test, expect, mockAuth, type Page } from "./auth-fixtures";

/**
 * Anonymous visitors use the same assistant as signed-in users (components/AiChat.tsx).
 * These tests pin the parts that are easy to regress: the answer really arrives, the
 * article dialog opens with the identical animation, and no history is exposed.
 */

type Frame = { t: number; transform: string; opacity: string };

async function ask(page: Page, question: string) {
  await page.getByRole("button", { name: "Mở trò chuyện với trợ lý AI" }).click();
  const input = page.getByLabel("Câu hỏi cho trợ lý AI");
  await input.fill(question);
  await input.press("Enter");
  await expect(page.getByRole("log")).toContainText("Phản hồi mẫu");
}

/**
 * Samples the dialog's computed transform/opacity every frame. Timestamps are relative to
 * the first frame the dialog exists in, so the click's actionability wait cannot skew the
 * recording window.
 */
async function startRecording(page: Page) {
  await page.evaluate(() => {
    const frames: Frame[] = [];
    (window as any).__dialogFrames = frames;
    (window as any).__dialogStop = false;
    let start: number | null = null;
    const sample = () => {
      const dialog = document.querySelector("#cl-article-dialog");
      if (dialog) {
        if (start === null) start = performance.now();
        const style = getComputedStyle(dialog);
        frames.push({
          t: performance.now() - start,
          transform: style.transform,
          opacity: style.opacity,
        });
      }
      if (!(window as any).__dialogStop) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

/** Waits until the whole open sequence has settled, then returns the samples. */
async function stopRecording(page: Page): Promise<Frame[]> {
  await page.waitForFunction(() => {
    const frames = (window as any).__dialogFrames as Frame[];
    const last = frames[frames.length - 1];
    // Long enough to cover the spring, and no longer changing.
    return (
      frames.length > 4 &&
      last.t > 700 &&
      frames[frames.length - 2]?.transform === last.transform &&
      last.opacity === "1"
    );
  });
  await page.evaluate(() => {
    (window as any).__dialogStop = true;
  });
  return page.evaluate(() => (window as any).__dialogFrames as Frame[]);
}

/** matrix(a, b, c, d, tx, ty) -> the numbers, so two runs can be compared numerically. */
function matrix(transform: string): number[] {
  const values = transform.match(/-?[\d.]+(?:e-?\d+)?/g);
  return values ? values.map(Number) : [];
}

/**
 * The dialog is rendered from a `position: fixed` dock on every page. Asserting only
 * `toBeVisible()` misses the case where the CSS never loaded: an unstyled block still has a
 * non-empty box, so Playwright calls it visible while it sits off-screen behind the page.
 * The modal itself is a flex child of the fixed container, so the fixed position is
 * asserted on the overlay root and the backdrop.
 */
async function expectDialogUsable(page: Page, width: number, height: number) {
  const dialog = page.getByRole("dialog", { name: "Căn cứ pháp lý" });
  await expect(dialog).toBeVisible();
  await expect(page.locator(".cl-article-dialog-root")).toHaveCSS("position", "fixed");
  await expect(page.locator(".cl-article-backdrop")).toHaveCSS("position", "fixed");
  // Wait out the opening spring: an animating element is not clickable for Playwright and
  // its box is still moving, which would make the bounds below meaningless.
  await expect.poll(() => dialog.evaluate((el) => getComputedStyle(el).transform)).toBe("none");
  const box = (await dialog.boundingBox())!;
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(0);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
  // pointer-events must be real: a click on the close button has to work.
  await dialog.getByRole("button", { name: "Đóng căn cứ" }).click();
  await expect(dialog).toHaveCount(0);
}

test("guest asks, gets a grounded answer and opens the cited article", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/search");
  await ask(page, "An ninh mạng là gì?");
  const citation = page.locator(".cl-chat-citation");
  await expect(citation).toHaveCount(1);
  await expect(citation).toContainText("Điều 2");
  await expect(page.getByText("Cuộc trò chuyện mới")).toBeVisible();
  await page.getByRole("button", { name: "Mở Điều 2" }).click();
  await expectDialogUsable(page, page.viewportSize()!.width, page.viewportSize()!.height);
  // Closing the article must leave the conversation open and focused.
  await expect(page.getByLabel("Câu hỏi cho trợ lý AI")).toBeVisible();
  expect(errors).toEqual([]);
});

test("the cited-article animation is identical for guests and signed-in users", async ({
  page,
}) => {
  const open = async (role: "user" | null) => {
    await mockAuth(page, role);
    await page.goto("/search");
    await ask(page, "An ninh mạng là gì?");
    await startRecording(page);
    await page.getByRole("button", { name: "Mở Điều 2" }).click();
    const samples = await stopRecording(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Căn cứ pháp lý" })).toHaveCount(0);
    return samples;
  };

  const guest = await open(null);
  const user = await open("user");

  // Both runs start from the same non-identity state: shrunk and below the final position.
  const start = (samples: Frame[]) => {
    const moving = samples.find((frame) => frame.transform !== "none");
    expect(moving).toBeDefined();
    const values = matrix(moving!.transform);
    expect(values).toHaveLength(6);
    return values;
  };
  const guestStart = start(guest);
  const userStart = start(user);
  expect(guestStart[0]).toBeGreaterThan(0.85);
  expect(guestStart[0]).toBeLessThan(1);
  expect(guestStart[5]).toBeGreaterThan(0);
  expect(userStart[0]).toBeCloseTo(guestStart[0], 2);
  expect(userStart[5]).toBeCloseTo(guestStart[5], 0);

  for (const samples of [guest, user]) {
    // Settles on the final state, with intermediate frames rather than snapping open.
    const last = samples[samples.length - 1];
    expect(last.transform).toBe("none");
    expect(Number(last.opacity)).toBe(1);
    expect(
      samples.filter(
        (frame) =>
          frame.transform !== "none" &&
          frame.transform !== samples.find((item) => item.transform !== "none")!.transform,
      ).length,
    ).toBeGreaterThan(3);
  }

  // The open sequence settles in about the same time in both modes.
  const settle = (samples: Frame[]) =>
    samples.find((frame) => frame.transform === "none")?.t ?? Infinity;
  expect(settle(guest)).toBeGreaterThan(50);
  expect(Math.abs(settle(guest) - settle(user))).toBeLessThan(120);
});

test("guest never sees stored history", async ({ page }) => {
  await page.goto("/search");
  await expect(
    page.getByRole("link", { name: "Lịch sử hỏi đáp", exact: true }),
  ).toHaveCount(0);
  await ask(page, "An ninh mạng là gì?");
  await page.keyboard.press("Escape");
  // The answer was stored server-side, but a guest has no way to list it back.
  await page.goto("/history");
  await expect(page).toHaveURL(/\/login\?next=history$/);
});

test("the account-page assistant answers guests and opens the cited article", async ({
  page,
}) => {
  await page.goto("/login");
  await ask(page, "Luật có hiệu lực từ khi nào?");
  await expect(page.locator(".cl-chat-citation")).toContainText("Điều 44");
  await page.getByRole("button", { name: "Mở Điều 44" }).click();
  await expect(
    page.getByRole("dialog", { name: "Căn cứ pháp lý" }),
  ).toContainText("Điều 44.");
  // The account pages are outside the public .cl-site scope, so this is where an
  // unscoped dialog stylesheet matters.
  await expectDialogUsable(
    page,
    page.viewportSize()!.width,
    page.viewportSize()!.height,
  );
});

// The dialog is rendered from the chat on both the public pages and the account pages,
// so its geometry is checked at every representative size in both hosts.
for (const [width, height] of [
  [320, 568],
  [440, 956],
  [834, 1194],
  [1440, 900],
  [956, 440],
] as const) {
  test(`guest chat and article dialog fit ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/search");
    await ask(page, "An ninh mạng là gì?");
    const panel = page.locator("#cl-chat-panel");
    const panelBox = await panel.boundingBox();
    expect(panelBox!.x).toBeGreaterThanOrEqual(0);
    expect(panelBox!.y).toBeGreaterThanOrEqual(0);
    expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(width);
    expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(height);
    await expect(page.getByLabel("Câu hỏi cho trợ lý AI")).toBeInViewport();
    await page.getByRole("button", { name: "Mở Điều 2" }).click();
    await expectDialogUsable(page, width, height);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  });

  test(`account-page chat dialog fits ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/login");
    await ask(page, "An ninh mạng là gì?");
    await page.getByRole("button", { name: "Mở Điều 2" }).click();
    await expectDialogUsable(page, width, height);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  });
}

test("guest chat respects reduced motion and keyboard-only opening", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/search");
  const launcher = page.getByRole("button", {
    name: "Mở trò chuyện với trợ lý AI",
  });
  await launcher.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#cl-chat-panel")).toHaveCSS("transform", "none");
  await expect(page.getByLabel("Câu hỏi cho trợ lý AI")).toBeFocused();
  await page.getByRole("button", { name: "An ninh mạng là gì?" }).click();
  await expect(page.getByRole("log")).toContainText("Phản hồi mẫu");
  await page.keyboard.press("Escape");
  await expect(launcher).toBeFocused();
});
