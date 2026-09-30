import type {
  KnowledgeForm,
  KnowledgeRecord,
  KnowledgeStore,
  KnowledgeTab,
} from "./knowledge-data";

export type KnowledgeSnapshot = KnowledgeStore & { revision: string };
export const emptyKnowledge: KnowledgeSnapshot = {
  van_ban: [],
  dieu_khoan: [],
  tu_khoa: [],
  quy_dinh: [],
  dieu_khoan_tu_khoa: [],
  revision: "",
};
export class KnowledgeApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: Record<string, string> = {},
  ) {
    super(message);
  }
}
async function call(url: string, init: RequestInit = {}) {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json", ...init.headers },
      signal: AbortSignal.timeout(45000),
    });
  } catch {
    throw new KnowledgeApiError(
      0,
      "Chưa xác định được kết quả do mất kết nối. Bạn tải lại dữ liệu trước khi gửi lại thao tác nhé.",
    );
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    const errors = Object.fromEntries(
      Object.entries(data?.errors ?? {}).map(([key, value]) => [
        key,
        Array.isArray(value) ? String(value[0]) : String(value),
      ]),
    );
    throw new KnowledgeApiError(
      response.status,
      data?.message || "Không thể tải kho tri thức. Bạn thử tải lại nhé.",
      errors,
    );
  }
  return data;
}
function snapshot(data: KnowledgeSnapshot): KnowledgeSnapshot {
  if (
    typeof data.revision !== "string" ||
    ![
      "van_ban",
      "dieu_khoan",
      "tu_khoa",
      "quy_dinh",
      "dieu_khoan_tu_khoa",
    ].every((key) => Array.isArray(data[key as keyof KnowledgeStore]))
  )
    throw new KnowledgeApiError(
      502,
      "Dữ liệu máy chủ không hợp lệ. Bạn tải lại nhé.",
    );
  return data;
}
async function mutate(
  path: string,
  method: string,
  values: Record<string, unknown>,
  file?: File | null,
) {
  const csrf = await call("/api/auth/csrf");
  if (typeof csrf.csrf_token !== "string")
    throw new KnowledgeApiError(
      419,
      "Phiên bảo vệ chưa sẵn sàng. Bạn tải lại trang nhé.",
    );
  let body: BodyInit;
  const headers: Record<string, string> = { "X-CSRF-TOKEN": csrf.csrf_token };
  if (file) {
    const form = new FormData();
    Object.entries(values).forEach(([key, value]) =>
      form.append(key, value == null ? "" : String(value)),
    );
    form.append("tep", file);
    body = form;
  } else {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({
      ...values,
      ...(file === null ? { xoa_tep: true } : {}),
    });
  }
  return snapshot(
    await call(`/api/admin/knowledge${path}`, { method, headers, body }),
  );
}
export const knowledgeApi = {
  page: (
    tab: KnowledgeTab,
    query: string,
    document: string,
    type: string,
    page: number,
  ): Promise<{
    items: KnowledgeRecord[];
    total: number;
    page: number;
    revision: string;
  }> => {
    const params = new URLSearchParams({ q: query, page: String(page) });
    if (document !== "all") params.set("document", document);
    if (type !== "all") params.set("type", type);
    return call(`/api/admin/knowledge/list/${tab}?${params}`);
  },
  list: async (): Promise<KnowledgeSnapshot> =>
    snapshot(await call("/api/admin/knowledge")),
  save: (
    tab: KnowledgeTab,
    values: KnowledgeForm,
    revision: string,
    id?: number,
    file?: File | null,
  ) => {
    const fields: Record<KnowledgeTab, string[]> = {
      van_ban: [
        "so_hieu",
        "tieu_de",
        "co_quan_ban_hanh",
        "ngay_ban_hanh",
        "ngay_hieu_luc",
        "ngay_het_hieu_luc",
        "lien_ket_nguon",
      ],
      dieu_khoan: [
        "ma_van_ban",
        "chuong",
        "so_dieu",
        "so_khoan",
        "ky_hieu_diem",
        "tieu_de",
        "noi_dung",
        "trang_nguon",
        "thu_tu",
      ],
      tu_khoa: ["cum_tu", "dinh_nghia", "ma_dieu_khoan_dinh_nghia"],
      quy_dinh: [
        "ma_dieu_khoan",
        "loai_quy_dinh",
        "chu_the",
        "hanh_vi",
        "doi_tuong",
        "dieu_kien",
        "ngoai_le",
        "trich_nguyen_van",
      ],
    };
    const body: Record<string, unknown> = Object.fromEntries(
      fields[tab].map((key) => [key, values[key]?.trim() || null]),
    );
    body.revision = revision;
    if (tab === "tu_khoa") {
      body.bien_the = [
        ...new Set(
          (values.bien_the || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ];
      body.lien_ket = [
        ...new Set(
          (values.lien_ket || "").split(",").filter(Boolean).map(Number),
        ),
      ];
    }
    return mutate(`/${tab}${id ? `/${id}` : ""}`, "POST", body, file);
  },
  remove: (tab: KnowledgeTab, id: number, revision: string) =>
    mutate(`/${tab}/${id}`, "DELETE", { revision }),
  status: (
    id: number,
    trang_thai: string,
    revision: string,
    da_doi_chieu: boolean,
  ) =>
    mutate(`/van_ban/${id}/status`, "POST", {
      revision,
      trang_thai,
      da_doi_chieu,
    }),
};
