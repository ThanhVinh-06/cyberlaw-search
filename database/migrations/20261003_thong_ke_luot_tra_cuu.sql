-- Chay mot lan tren database hien co. Chi them bang dem moi, khong sua du lieu cu.
-- Bang gop theo gio (UTC), KHONG luu IP, phien, tai khoan hay tu khoa tra cuu.
SET NAMES utf8mb4;
USE `cyberlaw_search`;

CREATE TABLE `thong_ke_tra_cuu` (
  `ma_thong_ke` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `gio` DATETIME NOT NULL COMMENT 'Moc gio UTC da cat phut/giay, mot dong cho moi gio',
  `so_luot` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'So luot tra cuu thanh cong trong gio',
  `ngay_tao` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ngay_cap_nhat` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_thong_ke`),
  UNIQUE KEY `duy_nhat_thong_ke_tra_cuu_gio` (`gio`)
) ENGINE=InnoDB COMMENT='Đếm lượt tra cứu pháp luật gộp theo giờ, không lưu IP/phiên/tài khoản/từ khóa';
