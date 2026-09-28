import type { ReactNode } from "react";
import { ArrowUpRight, BookOpen, FileText, Link2, Tag } from "lucide-react";
import {
  clauseLabel,
  formatDate,
  ruleLabels,
  safeSourceUrl,
  statusLabels,
  type KnowledgeRecord,
  type KnowledgeStore,
  type RecordSelection,
} from "@/lib/knowledge-data";

export function KnowledgeDetail({
  item,
  data,
  onOpen,
  onClauses,
  pdfUrl,
}: {
  item: KnowledgeRecord;
  data: KnowledgeStore;
  onOpen: (selection: RecordSelection) => void;
  onClauses: (id: number) => void;
  pdfUrl?: string;
}) {
  function info(label: string, content: ReactNode) {
    return (
      <div>
        <dt>{label}</dt>
        <dd>{content || "Chưa ghi nhận"}</dd>
      </div>
    );
  }
  function source(id: number | null) {
    const clause = data.dieu_khoan.find((row) => row.ma_dieu_khoan === id);
    if (!clause)
      return <p className="cl-knowledge-muted">Chưa gắn căn cứ điều khoản.</p>;
    const doc = data.van_ban.find(
      (row) => row.ma_van_ban === clause.ma_van_ban,
    );
    return (
      <button
        className="cl-knowledge-source-link"
        onClick={() => onOpen({ tab: "dieu_khoan", id: clause.ma_dieu_khoan })}
      >
        <BookOpen size={19} />
        <span>
          <strong>{clauseLabel(clause)}</strong>
          <small>
            {doc?.so_hieu}{" "}
            {clause.trang_nguon ? `· Trang ${clause.trang_nguon}` : ""}
          </small>
        </span>
        <ArrowUpRight size={17} />
      </button>
    );
  }
  return (
    <div className="cl-knowledge-detail">
      {"ma_quy_dinh" in item ? (
        <>
          <span className={`cl-knowledge-badge rule-${item.loai_quy_dinh}`}>
            {ruleLabels[item.loai_quy_dinh]}
          </span>
          <h3>{item.hanh_vi}</h3>
          <div className="cl-knowledge-detail-columns">
            <section>
              <h4>Thông tin quy định</h4>
              <dl className="cl-knowledge-metadata">
                {info("Chủ thể", item.chu_the)}
                {info("Đối tượng", item.doi_tuong)}
                {info("Điều kiện áp dụng", item.dieu_kien)}
                {info("Ngoại lệ", item.ngoai_le)}
              </dl>
            </section>
            <section>
              <h4>Căn cứ nguồn</h4>
              {source(item.ma_dieu_khoan)}
              <blockquote className="cl-knowledge-quote">
                {item.trich_nguyen_van}
              </blockquote>
            </section>
          </div>
        </>
      ) : "ma_tu_khoa" in item ? (
        <>
          <span className="cl-knowledge-badge keyword">
            <Tag size={13} />
            {item.dinh_nghia ? "Khái niệm có định nghĩa" : "Từ khóa tra cứu"}
          </span>
          <h3>{item.cum_tu}</h3>
          <section>
            <h4>Biến thể tìm kiếm</h4>
            <div className="cl-knowledge-chips">
              {item.bien_the.length ? (
                item.bien_the.map((variant) => (
                  <span key={variant}>{variant}</span>
                ))
              ) : (
                <p className="cl-knowledge-muted">Chưa thêm biến thể.</p>
              )}
            </div>
          </section>
          <section>
            <h4>Định nghĩa</h4>
            <p className="cl-knowledge-prose">
              {item.dinh_nghia || "Từ khóa này chưa có định nghĩa."}
            </p>
            {item.ma_dieu_khoan_dinh_nghia &&
              source(item.ma_dieu_khoan_dinh_nghia)}
          </section>
          <section>
            <h4>Điều khoản liên quan</h4>
            <div className="cl-knowledge-link-list">
              {data.dieu_khoan_tu_khoa
                .filter((link) => link.ma_tu_khoa === item.ma_tu_khoa)
                .map((link) => (
                  <div key={link.ma_dieu_khoan}>
                    {source(link.ma_dieu_khoan)}
                  </div>
                ))}
              {!data.dieu_khoan_tu_khoa.some(
                (link) => link.ma_tu_khoa === item.ma_tu_khoa,
              ) && (
                <p className="cl-knowledge-muted">
                  Chưa có liên kết điều khoản.
                </p>
              )}
            </div>
          </section>
        </>
      ) : "ma_dieu_khoan" in item ? (
        <>
          <span className="cl-knowledge-badge neutral">
            {item.chuong || "Điều khoản"} · {clauseLabel(item)}
          </span>
          <h3>{item.tieu_de || clauseLabel(item)}</h3>
          <button
            className="cl-knowledge-source-link"
            onClick={() => onOpen({ tab: "van_ban", id: item.ma_van_ban })}
          >
            <FileText size={19} />
            <span>
              <strong>
                {
                  data.van_ban.find((doc) => doc.ma_van_ban === item.ma_van_ban)
                    ?.tieu_de
                }
              </strong>
              <small>
                {
                  data.van_ban.find((doc) => doc.ma_van_ban === item.ma_van_ban)
                    ?.so_hieu
                }
                {item.trang_nguon ? ` · Trang ${item.trang_nguon}` : ""}
              </small>
            </span>
            <ArrowUpRight size={17} />
          </button>
          <section>
            <h4>Nội dung nguyên văn · minh họa</h4>
            <blockquote className="cl-knowledge-quote">
              {item.noi_dung}
            </blockquote>
          </section>
          <section>
            <h4>Từ khóa liên quan</h4>
            <div className="cl-knowledge-chips">
              {data.dieu_khoan_tu_khoa
                .filter((link) => link.ma_dieu_khoan === item.ma_dieu_khoan)
                .map((link) => (
                  <button
                    key={link.ma_tu_khoa}
                    onClick={() =>
                      onOpen({ tab: "tu_khoa", id: link.ma_tu_khoa })
                    }
                  >
                    <Tag size={13} />
                    {
                      data.tu_khoa.find(
                        (word) => word.ma_tu_khoa === link.ma_tu_khoa,
                      )?.cum_tu
                    }
                  </button>
                ))}
              {!data.dieu_khoan_tu_khoa.some(
                (link) => link.ma_dieu_khoan === item.ma_dieu_khoan,
              ) && <p className="cl-knowledge-muted">Chưa gắn từ khóa.</p>}
            </div>
          </section>
          <section>
            <h4>Quy định được bóc tách</h4>
            <div className="cl-knowledge-link-list">
              {data.quy_dinh
                .filter((rule) => rule.ma_dieu_khoan === item.ma_dieu_khoan)
                .map((rule) => (
                  <button
                    key={rule.ma_quy_dinh}
                    className="cl-knowledge-source-link"
                    onClick={() =>
                      onOpen({ tab: "quy_dinh", id: rule.ma_quy_dinh })
                    }
                  >
                    <Link2 size={17} />
                    <span>
                      <strong>{rule.hanh_vi}</strong>
                      <small>{ruleLabels[rule.loai_quy_dinh]}</small>
                    </span>
                    <ArrowUpRight size={17} />
                  </button>
                ))}
              {!data.quy_dinh.some(
                (rule) => rule.ma_dieu_khoan === item.ma_dieu_khoan,
              ) && (
                <p className="cl-knowledge-muted">
                  Chưa có quy định liên quan.
                </p>
              )}
            </div>
          </section>
        </>
      ) : (
        <>
          <div className="cl-knowledge-detail-topline">
            <span className={`cl-knowledge-badge ${item.trang_thai}`}>
              {statusLabels[item.trang_thai]}
            </span>
            <span>
              {item.so_hieu} · Phiên bản {item.phien_ban_noi_dung}
            </span>
          </div>
          <h3>{item.tieu_de}</h3>
          <dl className="cl-knowledge-metadata is-grid">
            {info("Cơ quan ban hành", item.co_quan_ban_hanh)}
            {info("Ngày ban hành", formatDate(item.ngay_ban_hanh))}
            {info("Ngày có hiệu lực", formatDate(item.ngay_hieu_luc))}
            {info("Ngày hết hiệu lực", formatDate(item.ngay_het_hieu_luc))}
          </dl>
          <p className="cl-knowledge-form-note">
            Trạng thái thể hiện việc công bố trên ứng dụng, không xác nhận hiệu
            lực pháp lý.
          </p>
          <section>
            <h4>Tài liệu nguồn</h4>
            <div className="cl-knowledge-source-actions">
              {safeSourceUrl(item.lien_ket_nguon) && (
                <a
                  className="cl-admin-btn-outline"
                  href={safeSourceUrl(item.lien_ket_nguon)!}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ArrowUpRight size={16} />
                  Mở nguồn gốc
                </a>
              )}
              {pdfUrl && (
                <a
                  className="cl-admin-btn-outline"
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText size={16} />
                  Xem PDF đã chọn
                </a>
              )}
              {!safeSourceUrl(item.lien_ket_nguon) && !pdfUrl && (
                <p className="cl-knowledge-muted">
                  Chưa đính kèm nguồn. Bạn có thể thêm liên kết hoặc chọn PDF
                  trong phần chỉnh sửa.
                </p>
              )}
            </div>
            {item.duong_dan_tep && (
              <p className="cl-knowledge-file-name">{item.duong_dan_tep}</p>
            )}
          </section>
          <button
            className="cl-knowledge-source-link"
            onClick={() => onClauses(item.ma_van_ban)}
          >
            <BookOpen size={20} />
            <span>
              <strong>Xem danh sách điều khoản</strong>
              <small>
                {
                  data.dieu_khoan.filter(
                    (clause) => clause.ma_van_ban === item.ma_van_ban,
                  ).length
                }{" "}
                đơn vị điều/khoản/điểm
              </small>
            </span>
            <ArrowUpRight size={18} />
          </button>
        </>
      )}
      <div className="cl-knowledge-detail-timestamp">
        Cập nhật {formatDate(item.ngay_cap_nhat)} · Dữ liệu minh họa giao diện
      </div>
    </div>
  );
}
