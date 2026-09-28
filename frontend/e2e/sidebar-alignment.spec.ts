import { test, expect, type Page } from "@playwright/test";

async function menuGeometry(page: Page) {
  return page.locator("aside:visible").evaluate((sidebar) => {
    const rect = (element: Element | Range) => {
      const box = element.getBoundingClientRect();
      return [box.x, box.y, box.width, box.height];
    };
    const label = sidebar.querySelector(".nav-group-label, .cl-nav-label")!;
    const style = getComputedStyle(label);
    return {
      label: {
        rect: rect(label),
        font: style.font,
        color: style.color,
        spacing: style.letterSpacing,
        padding: style.padding,
      },
      links: ["/search", "/library", "/terms"].map((to) => {
        const link = sidebar.querySelector(`a[href="${to}"]:not(.brand)`)!;
        const text = Array.from(link.childNodes).find(
          (node) =>
            node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
        )!;
        const range = document.createRange();
        range.selectNodeContents(text);
        return {
          item: rect(link),
          icon: rect(link.querySelector("svg")!),
          text: rect(range),
        };
      }),
    };
  });
}

test("sidebar labels, icons and text keep their geometry across account and public routes", async ({
  page,
}) => {
  for (const width of [901, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1080 });
    await page.goto("/login");
    await page.evaluate(() => document.fonts.ready);
    const reference = await menuGeometry(page);
    const personal = await page
      .locator(".sidebar .personal-label")
      .evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          font: style.font,
          color: style.color,
          spacing: style.letterSpacing,
          padding: style.padding,
        };
      });
    expect(personal).toEqual({
      font: reference.label.font,
      color: reference.label.color,
      spacing: reference.label.spacing,
      padding: reference.label.padding,
    });
    for (const [label, route] of [
      ["Thư viện văn bản", "/library"],
      ["Từ điển thuật ngữ", "/terms"],
      ["Tra cứu pháp luật", "/search"],
    ]) {
      await page
        .locator("aside:visible")
        .getByRole("link", { name: label, exact: true })
        .click();
      await expect(page).toHaveURL(new RegExp(`${route}$`));
      await expect(page.locator(".cl-sidebar > .cl-nav-label")).toBeVisible();
      expect(await menuGeometry(page)).toEqual(reference);
    }
    await page.getByRole("link", { name: "Đăng nhập", exact: true }).click();
    await expect(
      page.locator(".sidebar .nav-group-label").first(),
    ).toBeVisible();
    expect(await menuGeometry(page)).toEqual(reference);
    await page
      .locator(".auth-switch")
      .getByRole("link", { name: "Đăng ký", exact: true })
      .click();
    await expect(page).toHaveURL(/\/register$/);
    expect(await menuGeometry(page)).toEqual(reference);
    if (width === 1440) {
      await page
        .locator("aside")
        .screenshot({ path: "test-results/sidebar-account.png" });
      await page
        .locator("aside")
        .getByRole("link", { name: "Tra cứu pháp luật", exact: true })
        .click();
      await expect(page.locator(".cl-sidebar > .cl-nav-label")).toBeVisible();
      await page
        .locator("aside")
        .screenshot({ path: "test-results/sidebar-public.png" });
    }
  }
});
