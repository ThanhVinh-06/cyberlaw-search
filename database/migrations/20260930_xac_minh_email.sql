-- Chay mot lan, giu quyen truy cap tai khoan hien co; khong gia danh email da xac minh.
-- Tam dung dang ky trong luc ap dung. DDL MySQL khong rollback nhu transaction du lieu.
ALTER TABLE `nguoi_dung`
  ADD COLUMN `ngay_xac_minh_email` DATETIME DEFAULT NULL,
  ADD COLUMN `duoc_mien_xac_minh_email` TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE `nguoi_dung` ALTER COLUMN `duoc_mien_xac_minh_email` SET DEFAULT 0;

CREATE TABLE `yeu_cau_xac_minh_email` (
  `ma_yeu_cau` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_nguoi_dung` BIGINT UNSIGNED NOT NULL,
  `ma_xac_nhan_bam` VARCHAR(255) NOT NULL,
  `so_lan_thu` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `ngay_tao` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ngay_het_han` DATETIME NOT NULL,
  `ngay_su_dung` DATETIME DEFAULT NULL,
  `ngay_huy` DATETIME DEFAULT NULL,
  PRIMARY KEY (`ma_yeu_cau`),
  KEY `chi_muc_xac_minh_email_nguoi_dung` (`ma_nguoi_dung`, `ngay_tao`),
  KEY `chi_muc_xac_minh_email_het_han` (`ngay_het_han`),
  CONSTRAINT `fk_xac_minh_email_nguoi_dung` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE CASCADE,
  CONSTRAINT `kiem_tra_xac_minh_email_so_lan` CHECK (`so_lan_thu` <= 5),
  CONSTRAINT `kiem_tra_xac_minh_email_het_han` CHECK (`ngay_het_han` > `ngay_tao`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
