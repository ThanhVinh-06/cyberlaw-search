import { test, expect, type Page } from "@playwright/test";

async function openAdmin(page: Page, route = "/admin") {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      "cyberlaw_current_user",
      JSON.stringify({
        ma_nguoi_dung: 1,
        ho_ten: "Demo",
        thu_dien_tu: "admin@example.test",
        vai_tro: "admin",
        trang_thai: "active",
      }),
    );
    const state = window as typeof window & {
      fieldEntrances: {
        id: string;
        duration: number;
        delay: number;
        translate: boolean;
      }[];
    };
    state.fieldEntrances = [];
    const original = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (this.matches(".cl-admin-form-group")) {
        const timing = typeof options === "object" ? options : {};
        state.fieldEntrances.push({
          id: this.querySelector("input, select, textarea")?.id ?? "",
          duration: Number(timing?.duration),
          delay: Number(timing?.delay),
          translate: JSON.stringify(frames).includes("translate"),
        });
      }
      return original.call(this, frames, options);
    };
  });
  await page.goto(route);
  await page.evaluate(() => document.fonts.ready);
}
async function fieldCalls(page: Page) {
  return page.evaluate(
    () =>
      (
        window as typeof window & {
          fieldEntrances: {
            id: string;
            duration: number;
            delay: number;
            translate: boolean;
          }[];
        }
      ).fieldEntrances,
  );
}
async function closeDialog(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("pointer-events", "none");
}

test("user modal grows like the glossary and fields stagger without replaying on input", async ({
  page,
}) => {
  await openAdmin(page);
  const trigger = page.locator("[data-admin-user-add]");
  const before = await page.locator(".cl-admin-topbar").boundingBox();
  // Start at the actual click, so setup/autowait time cannot exhaust the sampler.
  await trigger.evaluate((button) => {
    button.addEventListener(
      "click",
      () => {
        const state = window as typeof window & {
          dialogFrames: { width: number; opacity: number }[];
          samplingDone: boolean;
        };
        state.dialogFrames = [];
        state.samplingDone = false;
        const start = performance.now();
        function sample() {
          const dialog = document.querySelector(".cl-admin-dialog-surface");
          if (dialog)
            state.dialogFrames.push({
              width: dialog.getBoundingClientRect().width,
              opacity: Number(getComputedStyle(dialog).opacity),
            });
          if (performance.now() - start < 900) requestAnimationFrame(sample);
          else state.samplingDone = true;
        }
        requestAnimationFrame(sample);
      },
      { once: true },
    );
  });
  await trigger.click();
  const dialog = page.getByRole("dialog", {
    name: "Thêm người dùng & Gán quyền mới",
  });
  await expect(dialog).toBeVisible();
  await page.waitForFunction(
    () => (window as typeof window & { samplingDone: boolean }).samplingDone,
  );
  const frames = await page.evaluate(
    () =>
      (
        window as typeof window & {
          dialogFrames: { width: number; opacity: number }[];
        }
      ).dialogFrames,
  );
  const finalWidth = (await dialog.boundingBox())!.width;
  expect(Math.min(...frames.map((frame) => frame.width))).toBeLessThan(
    finalWidth * 0.985,
  );
  expect(Math.max(...frames.map((frame) => frame.width))).toBeLessThanOrEqual(
    finalWidth * 1.01,
  );
  expect(
    frames.some(
      (frame) =>
        frame.width > finalWidth * 0.965 && frame.width < finalWidth * 0.995,
    ),
  ).toBe(true);
  await expect(page.locator(".cl-admin-dialog-backdrop")).toHaveCSS(
    "backdrop-filter",
    "blur(14px) saturate(1.8)",
  );
  expect(
    (await page.locator(".cl-admin-topbar").boundingBox())!.width,
  ).toBeCloseTo(before!.width, 0);
  const entrances = await fieldCalls(page);
  // React StrictMode mounts effects twice in development; the first set is cancelled.
  expect(new Set(entrances.map((item) => item.id)).size).toBe(5);
  expect(entrances.slice(-5).map((item) => item.delay)).toEqual([
    120, 170, 220, 270, 320,
  ]);
  expect(
    entrances.every((item) => item.duration === 400 && item.translate),
  ).toBe(true);
  await page.screenshot({ path: "test-results/admin-user-dialog-desktop.png" });
  await dialog.getByLabel("Họ và tên").fill("Người dùng thử");
  await dialog.getByLabel("Vai trò (Phân quyền)").selectOption("admin");
  await dialog
    .getByRole("button", { name: "Lưu tài khoản", exact: true })
    .click();
  await expect(
    dialog.getByText("Địa chỉ email không được để trống"),
  ).toBeVisible();
  expect(await fieldCalls(page)).toHaveLength(entrances.length);
  await page.keyboard.press("Tab");
  expect(
    await dialog.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await closeDialog(page);
  await expect(trigger).toBeFocused();
  // Dismiss during entrance; no stale backdrop or locked body afterwards.
  await trigger.click();
  await closeDialog(page);
  await trigger.click();
  await page.mouse.click(3, 3);
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("all account modal modes preserve CRUD and view-to-edit does not submit automatically", async ({
  page,
}) => {
  await openAdmin(page);
  await page.locator("[data-admin-user-add]").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Họ và tên").fill("Tài khoản thử animation");
  await dialog
    .getByLabel("Thư điện tử (Email)")
    .fill("motion.test@example.test");
  await dialog.getByLabel("Mật khẩu khởi tạo").fill("example-only-123");
  await dialog
    .getByRole("button", { name: "Lưu tài khoản", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  const row = page
    .locator("tbody tr")
    .filter({ hasText: "motion.test@example.test" });
  await expect(row).toBeVisible();
  await row.getByTitle("Xem chi tiết tài khoản").click();
  await expect(dialog).toHaveAccessibleName(/Thông tin tài khoản/);
  await dialog
    .getByRole("button", { name: "Chỉnh sửa tài khoản", exact: true })
    .click();
  await expect(dialog).toHaveAccessibleName(/Chỉnh sửa tài khoản/);
  await dialog.getByLabel("Họ và tên").fill("Tài khoản đã sửa");
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: "Lưu thay đổi", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(row).toContainText("Tài khoản đã sửa");
  await row.getByTitle("Chỉnh sửa thông tin & phân quyền").click();
  await closeDialog(page);
  await expect(
    row.getByTitle("Chỉnh sửa thông tin & phân quyền"),
  ).toBeFocused();
  await row.getByTitle("Khóa tài khoản", { exact: true }).click();
  await expect(dialog).toHaveAccessibleName("Xác nhận khóa tài khoản");
  await dialog
    .getByRole("button", { name: "Xác nhận khóa", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await row.getByTitle("Mở khóa tài khoản", { exact: true }).click();
  await dialog
    .getByRole("button", { name: "Mở khóa tài khoản", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await row.getByTitle("Xóa tài khoản vĩnh viễn").click();
  await dialog
    .getByRole("button", { name: "Xác nhận xóa vĩnh viễn", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(row).toHaveCount(0);
  await expect(page.locator("[data-admin-user-add]")).toBeFocused();
});

for (const width of [320, 440, 834]) {
  test(`account dialogs fit ${width}px and keep the footer in view`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 956 });
    await openAdmin(page);
    await page.locator("[data-admin-user-add]").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toHaveCSS("opacity", "1");
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await expect(
      dialog.getByRole("button", { name: "Lưu tài khoản", exact: true }),
    ).toBeInViewport();
    await dialog.getByLabel("Trạng thái tài khoản").scrollIntoViewIfNeeded();
    await expect(dialog.getByLabel("Trạng thái tài khoản")).toBeInViewport();
    if (width === 440)
      await page.screenshot({
        path: "test-results/admin-user-dialog-mobile.png",
      });
    await closeDialog(page);
    await expect(page.locator("[data-admin-user-add]")).toBeFocused();
  });
}

test("keyboard and reduced motion skip scale and stagger; knowledge uses the same modal", async ({
  page,
}) => {
  await openAdmin(page);
  const add = page.locator("[data-admin-user-add]");
  await add.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveCSS("transform", "none");
  expect(await fieldCalls(page)).toHaveLength(0);
  await closeDialog(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await add.click();
  await expect(dialog).toHaveCSS("transform", "none");
  const calls = await fieldCalls(page);
  expect(new Set(calls.map((item) => item.id)).size).toBe(5);
  expect(
    calls.every(
      (call) => call.duration === 160 && call.delay === 0 && !call.translate,
    ),
  ).toBe(true);
  await closeDialog(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/admin/documents");
  await page.locator("[data-knowledge-add]").click();
  await expect(dialog).toHaveClass(/cl-admin-dialog-surface/);
  await expect(dialog).toHaveCSS("opacity", "1");
  expect((await fieldCalls(page)).length).toBeGreaterThan(5);
  await dialog.getByLabel("Tên văn bản").fill("Nhập trong lúc mở popup");
  const count = (await fieldCalls(page)).length;
  await dialog.getByLabel("Tên văn bản").pressSequentially(" thử");
  expect(await fieldCalls(page)).toHaveLength(count);
  await closeDialog(page);
});
