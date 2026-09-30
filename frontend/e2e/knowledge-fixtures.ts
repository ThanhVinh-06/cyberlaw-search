import type { Page } from "@playwright/test";
import {
  createDemoKnowledge,
  deleteKnowledge,
  saveKnowledge,
  recordId,
  normalizeSearch,
  clauseLabel,
  type KnowledgeTab,
} from "../src/lib/knowledge-data";

// UI fixtures only. Authorization, validation and durable writes are tested against Laravel separately.
export async function mockKnowledge(page: Page) {
  let data = createDemoKnowledge();
  let version = 1;
  const revision = () => String(version).padStart(64, "0");
  await page.route("**/api/admin/knowledge**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const parts = url.pathname.split("/").filter(Boolean).slice(3);
    if (request.method() === "GET") {
      if (parts[0] === "list") {
        const tab = parts[1] as KnowledgeTab;
        const q = normalizeSearch(url.searchParams.get("q") || "");
        const doc = Number(url.searchParams.get("document"));
        const type = url.searchParams.get("type");
        const items = data[tab].filter((row) => {
          const clauseIds =
            "ma_tu_khoa" in row
              ? [
                  ...data.dieu_khoan_tu_khoa
                    .filter((l) => l.ma_tu_khoa === row.ma_tu_khoa)
                    .map((l) => l.ma_dieu_khoan),
                  row.ma_dieu_khoan_dinh_nghia,
                ]
              : "ma_dieu_khoan" in row
                ? [row.ma_dieu_khoan]
                : [];
          const docIds =
            "ma_van_ban" in row
              ? [row.ma_van_ban]
              : data.dieu_khoan
                  .filter((c) => clauseIds.includes(c.ma_dieu_khoan))
                  .map((c) => c.ma_van_ban);
          if (doc && !docIds.includes(doc)) return false;
          if (type && "trang_thai" in row && row.trang_thai !== type)
            return false;
          if (type && "loai_quy_dinh" in row && row.loai_quy_dinh !== type)
            return false;
          if (
            type &&
            "dinh_nghia" in row &&
            (type === "defined") !== !!row.dinh_nghia
          )
            return false;
          return normalizeSearch(
            `${Object.values(row).join(" ")} ${data.van_ban
              .filter((d) => docIds.includes(d.ma_van_ban))
              .map((d) => `${d.so_hieu} ${d.tieu_de}`)
              .join(" ")} ${"so_dieu" in row ? clauseLabel(row) : ""}`,
          ).includes(q);
        });
        const current = Math.min(
          Number(url.searchParams.get("page") || 1),
          Math.max(1, Math.ceil(items.length / 6)),
        );
        return route.fulfill({
          json: {
            items: items.slice((current - 1) * 6, current * 6),
            total: items.length,
            page: current,
            revision: revision(),
          },
        });
      }
      return route.fulfill({ json: { ...data, revision: revision() } });
    }
    let body: Record<string, unknown>;
    if (request.headers()["content-type"]?.startsWith("multipart/")) {
      body = {};
      const boundary = request.headers()["content-type"].split("boundary=")[1];
      for (const part of (
        request.postDataBuffer()?.toString("utf8") || ""
      ).split(`--${boundary}`)) {
        const name = part.match(/name="([^"]+)"/);
        if (name)
          body[name[1]] = part.split("\r\n\r\n")[1]?.replace(/\r\n$/, "") || "";
      }
      body.duong_dan_tep = "knowledge/fixture.pdf";
    } else body = request.postDataJSON();
    if (body.revision !== revision())
      return route.fulfill({
        status: 409,
        json: { message: "Dữ liệu đã thay đổi." },
      });
    const tab = parts[0] as KnowledgeTab;
    const id = Number(parts[1]) || undefined;
    if (parts[2] === "status")
      data.van_ban = data.van_ban.map((d) =>
        d.ma_van_ban === id
          ? { ...d, trang_thai: body.trang_thai as typeof d.trang_thai }
          : d,
      );
    else if (request.method() === "DELETE")
      data = deleteKnowledge(data, { tab, id: id! });
    else {
      const form = Object.fromEntries(
        Object.entries(body).map(([key, value]) => [
          key,
          Array.isArray(value) ? value.join(",") : String(value ?? ""),
        ]),
      );
      data = saveKnowledge(data, tab, form, id);
      if (tab === "van_ban" && body.duong_dan_tep)
        data.van_ban.find(
          (d) =>
            recordId(d) === (id || Math.max(...data.van_ban.map(recordId))),
        )!.duong_dan_tep = String(body.duong_dan_tep);
    }
    version++;
    return route.fulfill({ json: { ...data, revision: revision() } });
  });
}
