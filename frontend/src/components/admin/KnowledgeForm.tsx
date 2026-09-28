import { useRef, type FormEvent, type ReactNode } from "react";
import { FileUp, FileText, X, Info } from "lucide-react";
import {
  clauseLabel,
  ruleLabels,
  type KnowledgeForm as FormValues,
  type KnowledgeStore,
  type KnowledgeTab,
} from "@/lib/knowledge-data";

export function KnowledgeForm({
  tab,
  data,
  values,
  errors,
  onChange,
  onSubmit,
  onFile,
  fileError,
}: {
  tab: KnowledgeTab;
  data: KnowledgeStore;
  values: FormValues;
  errors: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onFile: (file: File | null) => void;
  fileError: string;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  function field(
    key: string,
    label: string,
    options: {
      type?: string;
      required?: boolean;
      wide?: boolean;
      hint?: string;
      max?: number;
      children?: ReactNode;
      min?: number;
    } = {},
  ) {
    const id = `knowledge-${key}`;
    const common = {
      id,
      name: key,
      value: values[key] ?? "",
      onChange: (
        event: React.ChangeEvent<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
      ) => onChange(key, event.target.value),
      required: options.required,
      "aria-invalid": !!errors[key],
      "aria-describedby": errors[key]
        ? `${id}-error`
        : options.hint
          ? `${id}-hint`
          : undefined,
      className: "cl-admin-form-input",
    };
    return (
      <div
        className={`cl-admin-form-group ${options.wide ? "is-full" : ""}`}
        key={key}
      >
        <label htmlFor={id}>
          {label}
          {options.required && (
            <span className="required" aria-hidden="true">
              {" "}
              *
            </span>
          )}
        </label>
        {options.children ? (
          <select {...common}>{options.children}</select>
        ) : options.type === "textarea" ? (
          <textarea
            {...common}
            rows={key === "noi_dung" || key === "trich_nguyen_van" ? 6 : 3}
            maxLength={options.max}
          />
        ) : (
          <input
            {...common}
            type={options.type ?? "text"}
            maxLength={options.max ?? 255}
            min={options.min}
            step={options.type === "number" ? 1 : undefined}
            autoComplete="off"
          />
        )}
        {options.hint && (
          <span className="cl-admin-form-hint" id={`${id}-hint`}>
            {options.hint}
          </span>
        )}
        {errors[key] && (
          <span className="cl-admin-form-error" id={`${id}-error`}>
            {errors[key]}
          </span>
        )}
      </div>
    );
  }
  const clauseOptions = (
    <>
      <option value="">Chọn điều khoản</option>
      {data.dieu_khoan.map((item) => (
        <option value={item.ma_dieu_khoan} key={item.ma_dieu_khoan}>
          {
            data.van_ban.find((doc) => doc.ma_van_ban === item.ma_van_ban)
              ?.so_hieu
          }{" "}
          · {clauseLabel(item)} — {item.tieu_de || "Chưa có tiêu đề"}
        </option>
      ))}
    </>
  );
  const source = data.dieu_khoan.find(
    (item) => item.ma_dieu_khoan === Number(values.ma_dieu_khoan),
  );
  return (
    <form
      id="knowledge-editor"
      className="cl-knowledge-form"
      onSubmit={onSubmit}
      noValidate
    >
      <div className="cl-knowledge-form-note is-full" data-dialog-reveal>
        <Info size={16} />
        <span>
          Thao tác dùng thử. Dữ liệu được giữ trong lần mở trang này, chưa lưu
          lên hệ thống.
        </span>
      </div>
      {Object.keys(errors).length > 0 && (
        <p role="alert" className="cl-knowledge-form-alert is-full">
          Bạn kiểm tra lại các trường được đánh dấu bên dưới nhé.
        </p>
      )}
      {tab === "van_ban" && (
        <>
          {field("tieu_de", "Tên văn bản", {
            required: true,
            wide: true,
            max: 500,
          })}
          {field("so_hieu", "Số hiệu", { required: true, max: 100 })}
          {field("co_quan_ban_hanh", "Cơ quan ban hành")}
          {field("ngay_ban_hanh", "Ngày ban hành", { type: "date" })}
          {field("ngay_hieu_luc", "Ngày có hiệu lực", { type: "date" })}
          {field("ngay_het_hieu_luc", "Ngày hết hiệu lực", {
            type: "date",
            hint: "Để trống nếu chưa ghi nhận.",
          })}
          {field("lien_ket_nguon", "Liên kết nguồn", {
            type: "url",
            max: 2048,
            hint: "Liên kết đến nơi công bố văn bản gốc.",
          })}
          <div className="cl-admin-form-group is-full">
            <label htmlFor="knowledge-file">Tài liệu PDF</label>
            <input
              ref={fileInput}
              id="knowledge-file"
              type="file"
              accept="application/pdf,.pdf"
              className="cl-knowledge-file-input"
              onChange={(event) => {
                onFile(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
            <div className="cl-knowledge-upload">
              {values.duong_dan_tep ? (
                <>
                  <FileText size={24} />
                  <span>
                    <strong>{values.duong_dan_tep}</strong>
                    <small>Đã chọn trên thiết bị · chưa tải lên máy chủ</small>
                  </span>
                  <button
                    type="button"
                    className="cl-knowledge-icon-button"
                    aria-label="Bỏ tệp PDF đã chọn"
                    onClick={() => onFile(null)}
                  >
                    <X size={18} />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                >
                  <FileUp size={25} />
                  <span>
                    <strong>Chọn tệp PDF</strong>
                    <small>Tối đa 20 MB · xem thử trên thiết bị</small>
                  </span>
                </button>
              )}
            </div>
            {fileError && (
              <span role="alert" className="cl-admin-form-error">
                {fileError}
              </span>
            )}
          </div>
        </>
      )}
      {tab === "dieu_khoan" && (
        <>
          {field("ma_van_ban", "Văn bản nguồn", {
            required: true,
            wide: true,
            children: (
              <>
                <option value="">Chọn văn bản</option>
                {data.van_ban.map((item) => (
                  <option key={item.ma_van_ban} value={item.ma_van_ban}>
                    {item.so_hieu} — {item.tieu_de}
                  </option>
                ))}
              </>
            ),
          })}
          {field("chuong", "Chương", { max: 100 })}
          {field("so_dieu", "Số điều", { required: true, max: 10 })}
          {field("so_khoan", "Khoản", { max: 10 })}
          {field("ky_hieu_diem", "Điểm", { max: 10 })}
          {field("tieu_de", "Tiêu đề điều khoản", { wide: true, max: 500 })}
          {field("noi_dung", "Nội dung nguyên văn", {
            required: true,
            type: "textarea",
            wide: true,
            hint: "Giữ đầy đủ câu dẫn, điều kiện áp dụng và ngoại lệ từ văn bản nguồn.",
          })}
          {field("trang_nguon", "Trang PDF", { type: "number", min: 1 })}
          {field("thu_tu", "Thứ tự hiển thị", { type: "number", min: 0 })}
        </>
      )}
      {tab === "tu_khoa" && (
        <>
          {field("cum_tu", "Cụm từ", { required: true, max: 191 })}
          {field("bien_the", "Biến thể tìm kiếm", {
            hint: "Phân cách bằng dấu phẩy, ví dụ: an ninh mang.",
          })}
          {field("dinh_nghia", "Định nghĩa", {
            type: "textarea",
            wide: true,
            hint: "Có thể để trống đối với từ khóa thông thường.",
          })}
          {field("ma_dieu_khoan_dinh_nghia", "Căn cứ định nghĩa", {
            required: !!values.dinh_nghia?.trim(),
            wide: true,
            children: clauseOptions,
          })}
          <fieldset className="cl-knowledge-links is-full" data-dialog-reveal>
            <legend>Điều khoản liên quan</legend>
            <p>Chọn những nội dung có thể tra cứu bằng từ khóa này.</p>
            <div>
              {data.dieu_khoan.length === 0 ? (
                <p>Chưa có điều khoản. Bạn thêm điều khoản trước nhé.</p>
              ) : (
                data.dieu_khoan.map((item) => {
                  const selected = (values.lien_ket ?? "")
                    .split(",")
                    .filter(Boolean);
                  return (
                    <label key={item.ma_dieu_khoan}>
                      <input
                        type="checkbox"
                        checked={selected.includes(String(item.ma_dieu_khoan))}
                        onChange={(event) =>
                          onChange(
                            "lien_ket",
                            (event.target.checked
                              ? [...selected, String(item.ma_dieu_khoan)]
                              : selected.filter(
                                  (id) => id !== String(item.ma_dieu_khoan),
                                )
                            ).join(","),
                          )
                        }
                      />
                      <span>
                        <strong>
                          {clauseLabel(item)} ·{" "}
                          {
                            data.van_ban.find(
                              (doc) => doc.ma_van_ban === item.ma_van_ban,
                            )?.so_hieu
                          }
                        </strong>
                        <small>{item.tieu_de}</small>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </fieldset>
        </>
      )}
      {tab === "quy_dinh" && (
        <>
          {field("ma_dieu_khoan", "Điều khoản làm căn cứ", {
            required: true,
            wide: true,
            children: clauseOptions,
          })}
          {field("loai_quy_dinh", "Loại quy định", {
            required: true,
            children: Object.entries(ruleLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            )),
          })}
          {field("chu_the", "Chủ thể")}
          {field("hanh_vi", "Hành vi", {
            required: true,
            type: "textarea",
            wide: true,
          })}
          {field("doi_tuong", "Đối tượng", { wide: true })}
          {field("dieu_kien", "Điều kiện áp dụng", { type: "textarea" })}
          {field("ngoai_le", "Ngoại lệ", { type: "textarea" })}
          {source && (
            <div
              className="cl-knowledge-source-preview is-full"
              data-dialog-reveal
            >
              <div>
                <strong>Đối chiếu điều khoản nguồn</strong>
                <button
                  className="cl-knowledge-text-button"
                  type="button"
                  onClick={() => onChange("trich_nguyen_van", source.noi_dung)}
                >
                  Dùng nguyên văn
                </button>
              </div>
              <p>{source.noi_dung}</p>
            </div>
          )}
          {field("trich_nguyen_van", "Trích nguyên văn căn cứ", {
            required: true,
            type: "textarea",
            wide: true,
            hint: "Chọn đoạn trích đúng nguyên văn trong điều khoản phía trên.",
          })}
        </>
      )}
    </form>
  );
}
