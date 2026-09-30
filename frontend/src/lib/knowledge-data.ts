// Frontend demo only. These records are deliberately fictional, not legal sources.
export type KnowledgeTab = "van_ban" | "dieu_khoan" | "tu_khoa" | "quy_dinh";
export type DocumentStatus = "draft" | "published" | "archived";
export const statusLabels: Record<DocumentStatus, string> = {
  draft: "Nháp",
  published: "Đã công bố",
  archived: "Lưu trữ",
};
export const ruleLabels = {
  prohibition: "Nghiêm cấm",
  right: "Quyền",
  obligation: "Nghĩa vụ",
  authority: "Thẩm quyền",
  measure: "Biện pháp",
  procedure: "Thủ tục",
  effectiveness: "Hiệu lực",
  other: "Khác",
} as const;
export type RuleType = keyof typeof ruleLabels;
type Dated = { ngay_tao: string; ngay_cap_nhat: string };
export interface VanBan extends Dated {
  ma_van_ban: number;
  so_hieu: string;
  tieu_de: string;
  co_quan_ban_hanh: string;
  ngay_ban_hanh: string;
  ngay_hieu_luc: string;
  ngay_het_hieu_luc: string;
  lien_ket_nguon: string;
  duong_dan_tep: string;
  phien_ban_noi_dung: number;
  trang_thai: DocumentStatus;
}
export interface DieuKhoan extends Dated {
  ma_dieu_khoan: number;
  ma_van_ban: number;
  chuong: string;
  so_dieu: string;
  so_khoan: string;
  ky_hieu_diem: string;
  tieu_de: string;
  noi_dung: string;
  trang_nguon: number | null;
  thu_tu: number;
}
export interface TuKhoa extends Dated {
  ma_tu_khoa: number;
  cum_tu: string;
  bien_the: string[];
  dinh_nghia: string;
  ma_dieu_khoan_dinh_nghia: number | null;
}
export interface QuyDinh extends Dated {
  ma_quy_dinh: number;
  ma_dieu_khoan: number;
  loai_quy_dinh: RuleType;
  chu_the: string;
  hanh_vi: string;
  doi_tuong: string;
  dieu_kien: string;
  ngoai_le: string;
  trich_nguyen_van: string;
}
export interface KnowledgeStore {
  van_ban: VanBan[];
  dieu_khoan: DieuKhoan[];
  tu_khoa: TuKhoa[];
  quy_dinh: QuyDinh[];
  dieu_khoan_tu_khoa: { ma_dieu_khoan: number; ma_tu_khoa: number }[];
}
export type KnowledgeRecord = VanBan | DieuKhoan | TuKhoa | QuyDinh;
export type RecordSelection = { tab: KnowledgeTab; id: number };
export type KnowledgeForm = Record<string, string>;
export const idKeys = {
  van_ban: "ma_van_ban",
  dieu_khoan: "ma_dieu_khoan",
  tu_khoa: "ma_tu_khoa",
  quy_dinh: "ma_quy_dinh",
} as const;
export function recordId(item: KnowledgeRecord): number {
  if ("ma_quy_dinh" in item) return item.ma_quy_dinh;
  if ("ma_tu_khoa" in item) return item.ma_tu_khoa;
  if ("ma_dieu_khoan" in item) return item.ma_dieu_khoan;
  return item.ma_van_ban;
}
export function recordTitle(item: KnowledgeRecord) {
  return "cum_tu" in item
    ? item.cum_tu
    : "hanh_vi" in item
      ? item.hanh_vi
      : item.tieu_de;
}
export function findRecord(data: KnowledgeStore, selection: RecordSelection) {
  return data[selection.tab].find((item) => recordId(item) === selection.id);
}
export function clauseLabel(item: DieuKhoan) {
  return `Điều ${item.so_dieu}${item.so_khoan ? ` · Khoản ${item.so_khoan}` : ""}${item.ky_hieu_diem ? ` · Điểm ${item.ky_hieu_diem}` : ""}`;
}
export function normalizeSearch(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}
export function formatDate(value: string) {
  if (!value) return "Chưa ghi nhận";
  return new Intl.DateTimeFormat("vi-VN").format(new Date(value));
}
const dates = {
  ngay_tao: "2026-09-28T08:00:00",
  ngay_cap_nhat: "2026-09-28T08:00:00",
};
export function createDemoKnowledge(): KnowledgeStore {
  const titles = [
    "Phạm vi và đối tượng áp dụng",
    "Giải thích thuật ngữ",
    "Bảo vệ thông tin trên không gian mạng",
    "Trách nhiệm của tổ chức, cá nhân",
    "Biện pháp bảo vệ hệ thống",
    "Tiếp nhận và xử lý thông tin",
  ];
  const clauses: DieuKhoan[] = titles.map((tieu_de, index) => ({
    ...dates,
    ma_dieu_khoan: index + 1,
    ma_van_ban: index < 4 ? 1 : 2,
    chuong: index < 2 ? "Chương I" : "Chương II",
    so_dieu: String(index + 1),
    so_khoan: "",
    ky_hieu_diem: "",
    tieu_de,
    trang_nguon: index + 2,
    thu_tu: index + 1,
    noi_dung: `Nội dung mẫu cho mục “${tieu_de}”. Đây là đoạn minh họa cách quản lý điều khoản, không phải nguyên văn pháp luật. Khi nhập dữ liệu thật, thay đoạn này bằng nội dung đã đối chiếu với tài liệu nguồn, giữ đầy đủ câu dẫn, điều kiện và ngoại lệ.`,
  }));
  return {
    van_ban: [
      {
        ...dates,
        ma_van_ban: 1,
        so_hieu: "VB-MAU-01",
        tieu_de: "An ninh mạng — văn bản minh họa",
        co_quan_ban_hanh: "Cơ quan ban hành mẫu",
        ngay_ban_hanh: "",
        ngay_hieu_luc: "",
        ngay_het_hieu_luc: "",
        lien_ket_nguon: "",
        duong_dan_tep: "",
        phien_ban_noi_dung: 1,
        trang_thai: "published",
      },
      {
        ...dates,
        ma_van_ban: 2,
        so_hieu: "VB-MAU-02",
        tieu_de: "Bảo vệ hệ thống thông tin — bản nháp mẫu",
        co_quan_ban_hanh: "Cơ quan ban hành mẫu",
        ngay_ban_hanh: "",
        ngay_hieu_luc: "",
        ngay_het_hieu_luc: "",
        lien_ket_nguon: "",
        duong_dan_tep: "",
        phien_ban_noi_dung: 1,
        trang_thai: "draft",
      },
      {
        ...dates,
        ma_van_ban: 3,
        so_hieu: "VB-MAU-03",
        tieu_de: "Tài liệu tham khảo — mẫu lưu trữ",
        co_quan_ban_hanh: "Cơ quan ban hành mẫu",
        ngay_ban_hanh: "",
        ngay_hieu_luc: "",
        ngay_het_hieu_luc: "",
        lien_ket_nguon: "",
        duong_dan_tep: "",
        phien_ban_noi_dung: 1,
        trang_thai: "archived",
      },
    ],
    dieu_khoan: clauses,
    tu_khoa: [
      "An ninh mạng",
      "Không gian mạng",
      "Hệ thống thông tin",
      "Thông tin cá nhân",
    ].map((cum_tu, i) => ({
      ...dates,
      ma_tu_khoa: i + 1,
      cum_tu,
      bien_the: [normalizeSearch(cum_tu)],
      dinh_nghia:
        i < 2
          ? "Định nghĩa minh họa để trình bày giao diện. Cần thay bằng nội dung được kiểm chứng từ điều khoản nguồn."
          : "",
      ma_dieu_khoan_dinh_nghia: i < 2 ? 2 : null,
    })),
    dieu_khoan_tu_khoa: [
      { ma_dieu_khoan: 1, ma_tu_khoa: 1 },
      { ma_dieu_khoan: 2, ma_tu_khoa: 1 },
      { ma_dieu_khoan: 2, ma_tu_khoa: 2 },
      { ma_dieu_khoan: 3, ma_tu_khoa: 4 },
      { ma_dieu_khoan: 5, ma_tu_khoa: 3 },
    ],
    quy_dinh: (
      ["prohibition", "right", "obligation", "measure"] as RuleType[]
    ).map((loai_quy_dinh, i) => ({
      ...dates,
      ma_quy_dinh: i + 1,
      ma_dieu_khoan: i + 3,
      loai_quy_dinh,
      chu_the: "Tổ chức, cá nhân (minh họa)",
      hanh_vi: [
        "Hành vi cần kiểm soát trên không gian mạng",
        "Bảo vệ thông tin và quyền lợi hợp pháp",
        "Trách nhiệm bảo vệ hệ thống thông tin",
        "Biện pháp tiếp nhận, xử lý thông tin",
      ][i],
      doi_tuong: "Thông tin, hệ thống trong ví dụ",
      dieu_kien: "Điều kiện áp dụng trong ví dụ minh họa.",
      ngoai_le: "",
      trich_nguyen_van: clauses[i + 2].noi_dung,
    })),
  };
}

export function formFor(
  data: KnowledgeStore,
  tab: KnowledgeTab,
  item?: KnowledgeRecord,
): KnowledgeForm {
  const result: KnowledgeForm = {};
  if (item)
    Object.entries(item).forEach(([key, value]) => {
      result[key] = Array.isArray(value)
        ? value.join(", ")
        : String(value ?? "");
    });
  if (!item)
    Object.assign(result, {
      ma_van_ban: String(data.van_ban[0]?.ma_van_ban ?? ""),
      ma_dieu_khoan: String(data.dieu_khoan[0]?.ma_dieu_khoan ?? ""),
      loai_quy_dinh: "prohibition",
      thu_tu: "0",
    });
  if (tab === "tu_khoa")
    result.lien_ket = item
      ? data.dieu_khoan_tu_khoa
          .filter((link) => link.ma_tu_khoa === recordId(item))
          .map((link) => link.ma_dieu_khoan)
          .join(",")
      : "";
  return result;
}

export function validateKnowledge(
  data: KnowledgeStore,
  tab: KnowledgeTab,
  form: KnowledgeForm,
  id?: number,
) {
  const errors: Record<string, string> = {};
  const value = (key: string) => (form[key] ?? "").trim();
  const required =
    tab === "van_ban"
      ? ["so_hieu", "tieu_de"]
      : tab === "dieu_khoan"
        ? ["ma_van_ban", "so_dieu", "noi_dung"]
        : tab === "tu_khoa"
          ? ["cum_tu"]
          : ["ma_dieu_khoan", "loai_quy_dinh", "hanh_vi", "trich_nguyen_van"];
  required.forEach((key) => {
    if (!value(key)) errors[key] = "Bạn điền thông tin này nhé.";
  });
  if (tab === "van_ban") {
    if (
      data.van_ban.some(
        (item) =>
          item.ma_van_ban !== id &&
          normalizeSearch(item.so_hieu) === normalizeSearch(value("so_hieu")),
      )
    )
      errors.so_hieu = "Số hiệu này đã có trong danh sách.";
    if (value("lien_ket_nguon") && !safeSourceUrl(value("lien_ket_nguon")))
      errors.lien_ket_nguon = "Nhập liên kết http:// hoặc https:// hợp lệ.";
    if (
      value("ngay_hieu_luc") &&
      value("ngay_het_hieu_luc") &&
      value("ngay_het_hieu_luc") < value("ngay_hieu_luc")
    )
      errors.ngay_het_hieu_luc =
        "Ngày kết thúc phải từ ngày có hiệu lực trở đi.";
  }
  if (tab === "dieu_khoan") {
    if (
      !data.van_ban.some(
        (item) => item.ma_van_ban === Number(value("ma_van_ban")),
      )
    )
      errors.ma_van_ban = "Chọn một văn bản trong danh sách.";
    if (
      data.dieu_khoan.some(
        (item) =>
          item.ma_dieu_khoan !== id &&
          item.ma_van_ban === Number(value("ma_van_ban")) &&
          normalizeSearch(item.so_dieu) === normalizeSearch(value("so_dieu")) &&
          normalizeSearch(item.so_khoan) ===
            normalizeSearch(value("so_khoan")) &&
          item.ky_hieu_diem.normalize("NFC").toLocaleLowerCase("vi") ===
            value("ky_hieu_diem").normalize("NFC").toLocaleLowerCase("vi"),
      )
    )
      errors.so_dieu = "Vị trí điều/khoản/điểm này đã tồn tại trong văn bản.";
    if (value("ky_hieu_diem") && !value("so_khoan"))
      errors.so_khoan = "Cần nhập khoản khi có điểm.";
    if (
      value("trang_nguon") &&
      (!Number.isInteger(Number(value("trang_nguon"))) ||
        Number(value("trang_nguon")) < 1)
    )
      errors.trang_nguon = "Trang nguồn phải là số nguyên từ 1.";
    if (
      !Number.isInteger(Number(value("thu_tu"))) ||
      Number(value("thu_tu")) < 0
    )
      errors.thu_tu = "Thứ tự phải là số nguyên từ 0.";
  }
  if (tab === "tu_khoa") {
    if (
      data.tu_khoa.some(
        (item) =>
          item.ma_tu_khoa !== id &&
          item.cum_tu.normalize("NFC").toLocaleLowerCase("vi") ===
            value("cum_tu").normalize("NFC").toLocaleLowerCase("vi"),
      )
    )
      errors.cum_tu = "Cụm từ này đã có trong kho.";
    if (
      value("dinh_nghia") &&
      !data.dieu_khoan.some(
        (item) =>
          item.ma_dieu_khoan === Number(value("ma_dieu_khoan_dinh_nghia")),
      )
    )
      errors.ma_dieu_khoan_dinh_nghia =
        "Chọn điều khoản làm căn cứ cho định nghĩa.";
  }
  if (tab === "quy_dinh") {
    const source = data.dieu_khoan.find(
      (item) => item.ma_dieu_khoan === Number(value("ma_dieu_khoan")),
    );
    if (!source) errors.ma_dieu_khoan = "Chọn điều khoản làm căn cứ.";
    else if (
      value("trich_nguyen_van") &&
      !source.noi_dung.includes(value("trich_nguyen_van"))
    )
      errors.trich_nguyen_van =
        "Đoạn trích phải khớp nguyên văn trong điều khoản đã chọn.";
    if (!(value("loai_quy_dinh") in ruleLabels))
      errors.loai_quy_dinh = "Chọn loại quy định hợp lệ.";
  }
  return errors;
}
export function safeSourceUrl(value: string) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

// Changing knowledge returns affected published documents to draft for review.
function touchDocuments(data: KnowledgeStore, ids: number[]) {
  return {
    ...data,
    van_ban: data.van_ban.map((doc) =>
      ids.includes(doc.ma_van_ban)
        ? {
            ...doc,
            trang_thai:
              doc.trang_thai === "published"
                ? ("draft" as const)
                : doc.trang_thai,
            phien_ban_noi_dung: doc.phien_ban_noi_dung + 1,
            ngay_cap_nhat: new Date().toISOString(),
          }
        : doc,
    ),
  };
}
function relatedDocumentIds(
  data: KnowledgeStore,
  tab: KnowledgeTab,
  id: number,
) {
  if (tab === "van_ban") return [id];
  let clauseIds: number[] = [];
  if (tab === "dieu_khoan") clauseIds = [id];
  if (tab === "quy_dinh")
    clauseIds = data.quy_dinh
      .filter((item) => item.ma_quy_dinh === id)
      .map((item) => item.ma_dieu_khoan);
  if (tab === "tu_khoa")
    clauseIds = [
      ...data.dieu_khoan_tu_khoa
        .filter((item) => item.ma_tu_khoa === id)
        .map((item) => item.ma_dieu_khoan),
      data.tu_khoa.find((item) => item.ma_tu_khoa === id)
        ?.ma_dieu_khoan_dinh_nghia ?? 0,
    ];
  return data.dieu_khoan
    .filter((item) => clauseIds.includes(item.ma_dieu_khoan))
    .map((item) => item.ma_van_ban);
}
export function saveKnowledge(
  data: KnowledgeStore,
  tab: KnowledgeTab,
  form: KnowledgeForm,
  id?: number,
): KnowledgeStore {
  const v = (key: string) => (form[key] ?? "").trim();
  const old = id ? findRecord(data, { tab, id }) : undefined;
  const nextId = id ?? Math.max(0, ...data[tab].map(recordId)) + 1;
  const stamp = {
    ngay_tao: old?.ngay_tao ?? new Date().toISOString(),
    ngay_cap_nhat: new Date().toISOString(),
  };
  let next = { ...data };
  const replace = <T extends KnowledgeRecord>(list: T[], item: T) =>
    old
      ? list.map((row) => (recordId(row) === nextId ? item : row))
      : [...list, item];
  if (tab === "van_ban")
    next.van_ban = replace(data.van_ban, {
      ...stamp,
      ma_van_ban: nextId,
      so_hieu: v("so_hieu"),
      tieu_de: v("tieu_de"),
      co_quan_ban_hanh: v("co_quan_ban_hanh"),
      ngay_ban_hanh: v("ngay_ban_hanh"),
      ngay_hieu_luc: v("ngay_hieu_luc"),
      ngay_het_hieu_luc: v("ngay_het_hieu_luc"),
      lien_ket_nguon: v("lien_ket_nguon"),
      duong_dan_tep: v("duong_dan_tep"),
      trang_thai: "draft",
      phien_ban_noi_dung:
        old && "phien_ban_noi_dung" in old ? old.phien_ban_noi_dung + 1 : 1,
    });
  if (tab === "dieu_khoan")
    next.dieu_khoan = replace(data.dieu_khoan, {
      ...stamp,
      ma_dieu_khoan: nextId,
      ma_van_ban: Number(v("ma_van_ban")),
      chuong: v("chuong"),
      so_dieu: v("so_dieu"),
      so_khoan: v("so_khoan"),
      ky_hieu_diem: v("ky_hieu_diem"),
      tieu_de: v("tieu_de"),
      noi_dung: v("noi_dung"),
      trang_nguon: v("trang_nguon") ? Number(v("trang_nguon")) : null,
      thu_tu: Number(v("thu_tu")),
    });
  if (tab === "tu_khoa") {
    next.tu_khoa = replace(data.tu_khoa, {
      ...stamp,
      ma_tu_khoa: nextId,
      cum_tu: v("cum_tu"),
      bien_the: [
        ...new Set(
          v("bien_the")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ],
      dinh_nghia: v("dinh_nghia"),
      ma_dieu_khoan_dinh_nghia: Number(v("ma_dieu_khoan_dinh_nghia")) || null,
    });
    next.dieu_khoan_tu_khoa = [
      ...data.dieu_khoan_tu_khoa.filter((link) => link.ma_tu_khoa !== nextId),
      ...v("lien_ket")
        .split(",")
        .map(Number)
        .filter((n) =>
          data.dieu_khoan.some((clause) => clause.ma_dieu_khoan === n),
        )
        .map((ma_dieu_khoan) => ({ ma_dieu_khoan, ma_tu_khoa: nextId })),
    ];
  }
  if (tab === "quy_dinh")
    next.quy_dinh = replace(data.quy_dinh, {
      ...stamp,
      ma_quy_dinh: nextId,
      ma_dieu_khoan: Number(v("ma_dieu_khoan")),
      loai_quy_dinh: v("loai_quy_dinh") as RuleType,
      chu_the: v("chu_the"),
      hanh_vi: v("hanh_vi"),
      doi_tuong: v("doi_tuong"),
      dieu_kien: v("dieu_kien"),
      ngoai_le: v("ngoai_le"),
      trich_nguyen_van: v("trich_nguyen_van"),
    });
  if (tab !== "van_ban")
    next = touchDocuments(next, [
      ...relatedDocumentIds(data, tab, nextId),
      ...relatedDocumentIds(next, tab, nextId),
    ]);
  return next;
}
export function deletionBlock(
  data: KnowledgeStore,
  selection: RecordSelection,
) {
  if (
    selection.tab === "van_ban" &&
    data.dieu_khoan.some((item) => item.ma_van_ban === selection.id)
  )
    return "Văn bản đang có điều khoản liên quan. Bạn có thể lưu trữ để giữ nguyên các căn cứ.";
  if (
    selection.tab === "dieu_khoan" &&
    (data.quy_dinh.some((item) => item.ma_dieu_khoan === selection.id) ||
      data.tu_khoa.some(
        (item) => item.ma_dieu_khoan_dinh_nghia === selection.id,
      ))
  )
    return "Điều khoản đang làm căn cứ cho quy định hoặc định nghĩa. Hãy cập nhật các liên kết đó trước khi xóa.";
  return "";
}
export function deleteKnowledge(
  data: KnowledgeStore,
  selection: RecordSelection,
): KnowledgeStore {
  if (deletionBlock(data, selection)) return data;
  const next = {
    ...data,
    [selection.tab]: data[selection.tab].filter(
      (item) => recordId(item) !== selection.id,
    ),
  };
  if (selection.tab === "dieu_khoan")
    next.dieu_khoan_tu_khoa = next.dieu_khoan_tu_khoa.filter(
      (item) => item.ma_dieu_khoan !== selection.id,
    );
  if (selection.tab === "tu_khoa")
    next.dieu_khoan_tu_khoa = next.dieu_khoan_tu_khoa.filter(
      (item) => item.ma_tu_khoa !== selection.id,
    );
  return touchDocuments(
    next,
    relatedDocumentIds(data, selection.tab, selection.id),
  );
}
