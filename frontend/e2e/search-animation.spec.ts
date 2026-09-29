import { test, expect } from "./auth-fixtures";

test("repeated searches keep card contents aligned throughout the entrance", async ({
  page,
}) => {
  await page.goto("/search");
  await page.evaluate(() => document.fonts.ready);
  const drifts = await page.evaluate(async () => {
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>(".cl-result"),
    );
    const offsets = () =>
      cards.map((card) => {
        const box = card.getBoundingClientRect();
        const title = card.querySelector("h3")!.getBoundingClientRect();
        const body = card.querySelector("p")!.getBoundingClientRect();
        return [
          title.x - box.x,
          title.y - box.y,
          body.y - box.y,
          box.width,
          box.height,
        ];
      });
    const baseline = offsets();
    const drift = [0, 0, 0, 0];
    const search = document.querySelector<HTMLButtonElement>(
      '.cl-search-card button[type="submit"]',
    )!;
    const reset = document.querySelector<HTMLButtonElement>(
      ".cl-form-actions .cl-text-button",
    )!;
    for (let run = 0; run < drift.length; run++) {
      (run === 2 ? reset : search).click();
      const start = performance.now();
      let repeated = false;
      while (performance.now() - start < 950) {
        await new Promise(requestAnimationFrame);
        if (run > 0 && !repeated && performance.now() - start > 120) {
          (run === 3 ? reset : search).click();
          repeated = true;
        }
        offsets().forEach((values, index) =>
          values.forEach((value, metric) => {
            drift[run] = Math.max(
              drift[run],
              Math.abs(value - baseline[index][metric]),
            );
          }),
        );
      }
    }
    return drift;
  });
  for (const drift of drifts) expect(drift).toBeLessThan(0.75);
});

test("search results rise in order, replay and still open article dialogs", async ({
  page,
}) => {
  // Pause only the new entrances so their visible progress can be sampled reliably.
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const animation = animate.call(this, frames, options);
      if (this.classList.contains("cl-result-reveal")) animation.pause();
      return animation;
    };
  });
  await page.goto("/search");
  const cards = page.locator(".cl-result-reveal");
  const search = page.getByRole("button", { name: "Tìm kiếm", exact: true });
  expect(
    await cards.evaluateAll((elements) =>
      elements.every((element) => element.getAnimations().length === 0),
    ),
  ).toBe(true);
  await search.click();
  const progress = await cards.evaluateAll((elements) =>
    elements.map((element) => {
      const animation = element.getAnimations()[0];
      animation.currentTime = 100;
      const style = getComputedStyle(element);
      return {
        opacity: Number(style.opacity),
        y: new DOMMatrixReadOnly(style.transform).m42,
      };
    }),
  );
  expect(progress).toHaveLength(3);
  expect(progress[0].opacity).toBeGreaterThan(progress[1].opacity);
  expect(progress[1].opacity).toBeGreaterThan(progress[2].opacity);
  expect(progress[0].y).toBeGreaterThan(0);
  expect(progress[0].y).toBeLessThan(progress[1].y);
  expect(progress[1].y).toBeLessThan(progress[2].y);
  await cards.evaluateAll((elements) =>
    elements.forEach((element) =>
      element.getAnimations().forEach((animation) => animation.finish()),
    ),
  );
  await expect(cards.first()).toHaveCSS("transform", "none");
  await expect(cards.last()).toHaveCSS("opacity", "1");

  // Repeating the same search replays the entrance without remounting the cards.
  const first = await page.locator(".cl-result").first().elementHandle();
  await search.click();
  expect(
    await cards.evaluateAll((elements) =>
      elements.every((element) => element.getAnimations().length === 1),
    ),
  ).toBe(true);
  expect(await first!.evaluate((element) => element.isConnected)).toBe(true);
  await cards.evaluateAll((elements) =>
    elements.forEach((element) =>
      element.getAnimations().forEach((animation) => animation.finish()),
    ),
  );
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(page.getByLabel("Từ khóa hoặc câu hỏi")).toHaveValue("");
  expect(
    await cards.evaluateAll((elements) =>
      elements.every((element) => element.getAnimations().length === 1),
    ),
  ).toBe(true);
  const resetProgress = await cards.evaluateAll((elements) =>
    elements.map((element) => {
      element.getAnimations()[0].currentTime = 120;
      const style = getComputedStyle(element);
      return {
        opacity: Number(style.opacity),
        y: new DOMMatrixReadOnly(style.transform).m42,
      };
    }),
  );
  expect(resetProgress[0].opacity).toBeGreaterThan(resetProgress[1].opacity);
  expect(resetProgress[1].opacity).toBeGreaterThan(resetProgress[2].opacity);
  expect(resetProgress[0].y).toBeGreaterThan(0);
  await cards.evaluateAll((elements) =>
    elements.forEach((element) =>
      element.getAnimations().forEach((animation) => animation.finish()),
    ),
  );
  const trigger = page
    .getByRole("button", { name: "Xem điều khoản", exact: true })
    .first();
  await trigger.click();
  await expect(
    page.getByRole("dialog", { name: "Căn cứ pháp lý" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("search handles rapid repeats, reduced motion and keyboard on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/search");
  const query = page.getByLabel("Từ khóa hoặc câu hỏi");
  const search = page.getByRole("button", { name: "Tìm kiếm", exact: true });
  const cards = page.locator(".cl-result-reveal");
  await search.dblclick({ delay: 80 });
  await expect(cards.last()).toHaveCSS("transform", "none");
  await expect(cards.last()).toHaveCSS("opacity", "1");
  await expect(page.locator(".cl-result")).toHaveCount(3);

  await query.fill("khong-co-ket-qua-xyz");
  await search.click();
  await expect(page.getByText("Chưa tìm thấy kết quả phù hợp")).toBeVisible();
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(cards).toHaveCount(3);
  await expect(cards.last()).toHaveCSS("transform", "none");
  await expect(cards.last()).toHaveCSS("opacity", "1");
  expect(
    await cards.evaluateAll((elements) =>
      elements.every((element) => element.getAnimations().length === 0),
    ),
  ).toBe(true);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await search.click();
  expect(
    await cards.evaluateAll((elements) =>
      elements.every(
        (element) => getComputedStyle(element).transform === "none",
      ),
    ),
  ).toBe(true);
  await expect(cards.last()).toHaveCSS("opacity", "1");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await query.press("Enter");
  expect(
    await cards.evaluateAll((elements) =>
      elements.every((element) => element.getAnimations().length === 0),
    ),
  ).toBe(true);
  await query.fill("Điều 44");
  await query.press("Control+Enter");
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText("Hiệu lực thi hành");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
