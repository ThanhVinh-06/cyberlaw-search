-- Chay mot lan tren database hien co. Khong xoa hoac sua du lieu tai khoan.
SET NAMES utf8mb4;
USE `cyberlaw_search`;

CREATE TABLE `yeu_cau_dat_lai_mat_khau` (
  `ma_yeu_cau` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_nguoi_dung` BIGINT UNSIGNED NOT NULL,
  `ma_xac_nhan_bam` VARCHAR(255) NOT NULL COMMENT 'Gia tri bam cua ma OTP, khong luu ma goc',
  `ma_phien_bam` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL COMMENT 'SHA-256 cua token ngau nhien cap sau khi xac nhan OTP',
  `so_lan_thu` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `ngay_tao` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ngay_het_han` DATETIME NOT NULL,
  `ngay_xac_nhan` DATETIME DEFAULT NULL,
  `ngay_su_dung` DATETIME DEFAULT NULL,
  `ngay_huy` DATETIME DEFAULT NULL,
  PRIMARY KEY (`ma_yeu_cau`),
  UNIQUE KEY `duy_nhat_dat_lai_mat_khau_phien` (`ma_phien_bam`),
  KEY `chi_muc_dat_lai_mat_khau_nguoi_dung` (`ma_nguoi_dung`, `ngay_tao`),
  KEY `chi_muc_dat_lai_mat_khau_het_han` (`ngay_het_han`),
  CONSTRAINT `fk_dat_lai_mat_khau_nguoi_dung` FOREIGN KEY (`ma_nguoi_dung`)
    REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE CASCADE,
  CONSTRAINT `kiem_tra_dat_lai_mat_khau_so_lan` CHECK (`so_lan_thu` <= 5),
  CONSTRAINT `kiem_tra_dat_lai_mat_khau_het_han` CHECK (`ngay_het_han` > `ngay_tao`),
  CONSTRAINT `kiem_tra_dat_lai_mat_khau_phien` CHECK (
    (`ngay_xac_nhan` IS NULL AND `ma_phien_bam` IS NULL) OR
    (`ngay_xac_nhan` IS NOT NULL AND `ma_phien_bam` IS NOT NULL)
  ),
  CONSTRAINT `kiem_tra_dat_lai_mat_khau_su_dung` CHECK (`ngay_su_dung` IS NULL OR `ngay_xac_nhan` IS NOT NULL)
) ENGINE=InnoDB COMMENT='Yeu cau dat lai mat khau qua email, ma chi su dung mot lan';
