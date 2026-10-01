-- Chay mot lan tren database hien co (sau 20260929_them_dat_lai_mat_khau.sql).
-- Bo sung truong ma frontend/backend can; khong xoa hoac sua du lieu hien co.
SET NAMES utf8mb4;
USE `cyberlaw_search`;

ALTER TABLE `nguoi_dung`
  ADD COLUMN `lan_dang_nhap_cuoi` DATETIME DEFAULT NULL COMMENT 'Lan dang nhap thanh cong gan nhat' AFTER `ma_ghi_nho`;

ALTER TABLE `dieu_khoan`
  MODIFY COLUMN `tieu_de` VARCHAR(500) NOT NULL DEFAULT '' COMMENT 'Co the de trong; giao dien hien "Chua co tieu de"';

ALTER TABLE `tin_nhan`
  ADD COLUMN `trang_thai_tra_loi` ENUM('answered','no_basis','error') DEFAULT NULL COMMENT 'Chi dung cho tin nhan assistant' AFTER `noi_dung`,
  ADD COLUMN `do_tin_cay` DECIMAL(5,2) DEFAULT NULL COMMENT '0-100, do he thong truy hoi tinh' AFTER `trang_thai_tra_loi`,
  ADD COLUMN `thoi_gian_xu_ly_ms` INT UNSIGNED DEFAULT NULL COMMENT 'Thoi gian tao cau tra loi (mili giay)' AFTER `do_tin_cay`,
  ADD CONSTRAINT `kiem_tra_tin_nhan_do_tin_cay` CHECK (`do_tin_cay` IS NULL OR (`do_tin_cay` BETWEEN 0 AND 100));

CREATE TABLE `nhat_ky_quan_tri` (
  `ma_nhat_ky` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_nguoi_thuc_hien` BIGINT UNSIGNED DEFAULT NULL,
  `hanh_dong` VARCHAR(100) NOT NULL COMMENT 'Vi du: admin.user.role_changed',
  `loai_doi_tuong` VARCHAR(50) NOT NULL,
  `ma_doi_tuong` BIGINT UNSIGNED DEFAULT NULL,
  `ma_yeu_cau` VARCHAR(64) DEFAULT NULL COMMENT 'request_id de doi chieu log',
  `du_lieu_them` JSON DEFAULT NULL COMMENT 'Chi khoa da allowlist; khong luu mat khau/OTP/token/noi dung chat',
  `ngay_tao` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_nhat_ky`),
  KEY `chi_muc_nhat_ky_nguoi_thuc_hien` (`ma_nguoi_thuc_hien`,`ngay_tao`),
  KEY `chi_muc_nhat_ky_doi_tuong` (`loai_doi_tuong`,`ma_doi_tuong`),
  CONSTRAINT `khoa_ngoai_nhat_ky_nguoi_thuc_hien` FOREIGN KEY (`ma_nguoi_thuc_hien`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`)
    ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `kiem_tra_nhat_ky_du_lieu_them` CHECK (`du_lieu_them` IS NULL OR JSON_TYPE(`du_lieu_them`) = 'OBJECT')
) ENGINE=InnoDB COMMENT='Audit thao tac quan tri, ghi cung transaction voi thao tac';
