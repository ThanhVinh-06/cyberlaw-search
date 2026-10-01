export type PublicArticle = {
  id: string;
  category: string;
  label: string;
  title: string;
  summary: string;
  text: string;
  note: string;
  source: string;
  so_dieu: string;
  so_khoan: string;
  ngay_ban_hanh?: string | null;
  co_quan_ban_hanh?: string | null;
};

export class PublicSearchError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call(path: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new PublicSearchError(
      0,
      "Không thể kết nối kho dữ liệu tra cứu. Bạn thử lại nhé.",
    );
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data)
    throw new PublicSearchError(
      response.status,
      response.status === 429
        ? "Bạn tìm kiếm quá nhanh. Vui lòng chờ một phút rồi thử lại nhé."
        : response.status === 422
          ? "Bạn kiểm tra lại từ khóa và bộ lọc nhé."
          : "Không thể tải dữ liệu tra cứu. Bạn thử lại nhé.",
    );
  return data;
}

function article(value: unknown): PublicArticle {
  const row = value as PublicArticle;
  if (
    !row ||
    ![
      "id",
      "category",
      "label",
      "title",
      "summary",
      "text",
      "note",
      "source",
      "so_dieu",
      "so_khoan",
    ].every(
      (key) =>
        typeof (row as unknown as Record<string, unknown>)[key] === "string",
    )
  )
    throw new PublicSearchError(502, "Dữ liệu điều khoản không hợp lệ.");
  return { ...row, source: /^https?:\/\//i.test(row.source) ? row.source : "" };
}

export const publicSearchApi = {
  detail: async (id: string): Promise<PublicArticle> => {
    return article(await call(`/api/search/${encodeURIComponent(id)}`));
  },
  search: async (params: {
    q: string;
    mode: string;
    category: string;
    from: string;
    to: string;
    page?: number;
  }): Promise<{
    items: PublicArticle[];
    total: number;
    page: number;
    law: string;
  }> => {
    const query = new URLSearchParams({
      q: params.q,
      mode: params.mode,
      category: params.category,
      page: String(params.page ?? 1),
      per_page: "30",
    });
    if (params.from) query.set("from", params.from);
    if (params.to) query.set("to", params.to);
    const data = (await call(`/api/search?${query}`)) as Record<
      string,
      unknown
    >;
    if (
      !Array.isArray(data.items) ||
      typeof data.total !== "number" ||
      typeof data.page !== "number" ||
      typeof data.law !== "string"
    )
      throw new PublicSearchError(
        502,
        "Dữ liệu tra cứu từ máy chủ không hợp lệ.",
      );
    return {
      items: data.items.map(article),
      total: data.total,
      page: data.page,
      law: data.law,
    };
  },
};
