-- CyberLaw Search: cơ sở dữ liệu cho đồ án Trí tuệ nhân tạo.
-- MySQL 8.0.16 trở lên; đã kiểm tra trên MySQL 8.0.44.
-- Tên bảng và cột dùng tiếng Việt không dấu, phân cách bằng dấu gạch dưới.
-- Chạy một lần để tạo database mới. Mật khẩu tài khoản chỉ lưu dạng băm.
-- Ứng dụng đọc và ghi các trường thời gian theo UTC.

SET NAMES utf8mb4;
CREATE DATABASE `cyberlaw_search`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `cyberlaw_search`;

CREATE TABLE `nguoi_dung` (
  `ma_nguoi_dung` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ho_ten` VARCHAR(100) NOT NULL,
  `thu_dien_tu` VARCHAR(191) NOT NULL,
  `mat_khau` VARCHAR(255) NOT NULL COMMENT 'Chỉ lưu mật khẩu đã băm bằng Laravel',
  `vai_tro` ENUM('user','admin') NOT NULL DEFAULT 'user',
  `trang_thai` ENUM('active','blocked') NOT NULL DEFAULT 'active',
  `ma_ghi_nho` VARCHAR(100) DEFAULT NULL,
  `ngay_tao` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ngay_cap_nhat` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_nguoi_dung`),
  UNIQUE KEY `duy_nhat_nguoi_dung_thu_dien_tu` (`thu_dien_tu`)
) ENGINE=InnoDB COMMENT='Tài khoản người dùng và quản trị viên';

CREATE TABLE `van_ban` (
  `ma_van_ban` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `so_hieu` VARCHAR(100) NOT NULL,
  `tieu_de` VARCHAR(500) NOT NULL,
  `co_quan_ban_hanh` VARCHAR(255) DEFAULT NULL,
  `ngay_ban_hanh` DATE DEFAULT NULL,
  `ngay_hieu_luc` DATE DEFAULT NULL,
  `ngay_het_hieu_luc` DATE DEFAULT NULL COMMENT 'Ngày đầu tiên không còn hiệu lực; NULL nếu chưa ghi nhận',
  `lien_ket_nguon` VARCHAR(2048) DEFAULT NULL,
  `duong_dan_tep` VARCHAR(500) DEFAULT NULL COMMENT 'Đường dẫn tương đối đến tệp văn bản',
  `phien_ban_noi_dung` INT UNSIGNED NOT NULL DEFAULT 1,
  `trang_thai` ENUM('draft','published','archived') NOT NULL DEFAULT 'draft'
    COMMENT 'Trạng thái công bố trên ứng dụng',
  `ngay_tao` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ngay_cap_nhat` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_van_ban`),
  UNIQUE KEY `duy_nhat_van_ban_so_hieu` (`so_hieu`),
  KEY `chi_muc_van_ban_trang_thai` (`trang_thai`),
  CONSTRAINT `kiem_tra_van_ban_phien_ban` CHECK (`phien_ban_noi_dung` > 0),
  CONSTRAINT `kiem_tra_van_ban_ngay_hieu_luc` CHECK (
    `ngay_het_hieu_luc` IS NULL OR `ngay_hieu_luc` IS NULL OR `ngay_het_hieu_luc` >= `ngay_hieu_luc`
  )
) ENGINE=InnoDB COMMENT='Mỗi dòng là một văn bản pháp luật';

CREATE TABLE `dieu_khoan` (
  `ma_dieu_khoan` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_van_ban` BIGINT UNSIGNED NOT NULL,
  `chuong` VARCHAR(100) DEFAULT NULL,
  `so_dieu` VARCHAR(10) NOT NULL COMMENT 'Ví dụ: 2, 10a, 44',
  `so_khoan` VARCHAR(10) NOT NULL DEFAULT '' COMMENT 'Để chuỗi rỗng khi lưu toàn bộ điều',
  `ky_hieu_diem` VARCHAR(10) NOT NULL DEFAULT '' COMMENT 'Để chuỗi rỗng khi không chia điểm',
  `tieu_de` VARCHAR(500) NOT NULL,
  `noi_dung` MEDIUMTEXT NOT NULL COMMENT 'Nguyên văn điều khoản, gồm câu dẫn và ngữ cảnh cần thiết',
  `trang_nguon` SMALLINT UNSIGNED DEFAULT NULL COMMENT 'Trang PDF bắt đầu trích dẫn, đếm từ 1',
  `thu_tu` INT UNSIGNED NOT NULL DEFAULT 0,
  `ngay_tao` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ngay_cap_nhat` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_dieu_khoan`),
  UNIQUE KEY `duy_nhat_dieu_khoan_vi_tri` (`ma_van_ban`,`so_dieu`,`so_khoan`,`ky_hieu_diem`),
  KEY `chi_muc_dieu_khoan_thu_tu` (`ma_van_ban`,`thu_tu`),
  CONSTRAINT `khoa_ngoai_dieu_khoan_van_ban` FOREIGN KEY (`ma_van_ban`) REFERENCES `van_ban` (`ma_van_ban`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `kiem_tra_dieu_khoan_so_dieu` CHECK (CHAR_LENGTH(TRIM(`so_dieu`)) > 0),
  CONSTRAINT `kiem_tra_dieu_khoan_diem` CHECK (`ky_hieu_diem` = '' OR `so_khoan` <> ''),
  CONSTRAINT `kiem_tra_dieu_khoan_trang` CHECK (`trang_nguon` IS NULL OR `trang_nguon` > 0)
) ENGINE=InnoDB COMMENT='Đơn vị tra cứu theo điều, khoản hoặc điểm';

CREATE TABLE `tu_khoa` (
  `ma_tu_khoa` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `cum_tu` VARCHAR(191) COLLATE utf8mb4_0900_as_ci NOT NULL,
  `bien_the` JSON DEFAULT NULL COMMENT 'Mảng JSON các biến thể tìm kiếm, ví dụ ["an ninh mang"]',
  `dinh_nghia` TEXT DEFAULT NULL,
  `ma_dieu_khoan_dinh_nghia` BIGINT UNSIGNED DEFAULT NULL,
  `ngay_tao` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ngay_cap_nhat` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_tu_khoa`),
  UNIQUE KEY `duy_nhat_tu_khoa_cum_tu` (`cum_tu`),
  CONSTRAINT `khoa_ngoai_tu_khoa_dinh_nghia` FOREIGN KEY (`ma_dieu_khoan_dinh_nghia`) REFERENCES `dieu_khoan` (`ma_dieu_khoan`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `kiem_tra_tu_khoa_cum_tu` CHECK (CHAR_LENGTH(TRIM(`cum_tu`)) > 0),
  CONSTRAINT `kiem_tra_tu_khoa_bien_the` CHECK (`bien_the` IS NULL OR JSON_TYPE(`bien_the`) = 'ARRAY')
) ENGINE=InnoDB COMMENT='Từ khóa và định nghĩa có căn cứ; phân biệt dấu tiếng Việt';

CREATE TABLE `dieu_khoan_tu_khoa` (
  `ma_dieu_khoan` BIGINT UNSIGNED NOT NULL,
  `ma_tu_khoa` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`ma_dieu_khoan`,`ma_tu_khoa`),
  KEY `chi_muc_tu_khoa_dieu_khoan` (`ma_tu_khoa`,`ma_dieu_khoan`),
  CONSTRAINT `khoa_ngoai_lien_ket_dieu_khoan` FOREIGN KEY (`ma_dieu_khoan`) REFERENCES `dieu_khoan` (`ma_dieu_khoan`)
    ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `khoa_ngoai_lien_ket_tu_khoa` FOREIGN KEY (`ma_tu_khoa`) REFERENCES `tu_khoa` (`ma_tu_khoa`)
    ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB COMMENT='Liên kết nhiều từ khóa với nhiều điều khoản';

CREATE TABLE `quy_dinh` (
  `ma_quy_dinh` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_dieu_khoan` BIGINT UNSIGNED NOT NULL,
  `loai_quy_dinh` ENUM('prohibition','right','obligation','authority','measure','procedure','effectiveness','other') NOT NULL,
  `chu_the` TEXT DEFAULT NULL,
  `hanh_vi` TEXT NOT NULL,
  `doi_tuong` TEXT DEFAULT NULL,
  `dieu_kien` TEXT DEFAULT NULL,
  `ngoai_le` TEXT DEFAULT NULL,
  `trich_nguyen_van` TEXT NOT NULL COMMENT 'Trích nguyên văn căn cứ; đối chiếu trước khi công bố',
  `ngay_tao` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ngay_cap_nhat` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_quy_dinh`),
  KEY `chi_muc_quy_dinh_nguon_loai` (`ma_dieu_khoan`,`loai_quy_dinh`),
  KEY `chi_muc_quy_dinh_loai` (`loai_quy_dinh`),
  CONSTRAINT `khoa_ngoai_quy_dinh_dieu_khoan` FOREIGN KEY (`ma_dieu_khoan`) REFERENCES `dieu_khoan` (`ma_dieu_khoan`)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB COMMENT='Quy định gồm chủ thể, hành vi, điều kiện và ngoại lệ';

CREATE TABLE `hoi_thoai` (
  `ma_hoi_thoai` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_nguoi_dung` BIGINT UNSIGNED NOT NULL,
  `tieu_de` VARCHAR(255) NOT NULL DEFAULT 'Cuộc trò chuyện mới',
  `ngay_tao` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ngay_cap_nhat` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_hoi_thoai`),
  KEY `chi_muc_hoi_thoai_nguoi_dung_ngay` (`ma_nguoi_dung`,`ngay_cap_nhat`),
  CONSTRAINT `khoa_ngoai_hoi_thoai_nguoi_dung` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`)
    ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB COMMENT='Hội thoại riêng của từng người dùng';

CREATE TABLE `tin_nhan` (
  `ma_tin_nhan` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_hoi_thoai` BIGINT UNSIGNED NOT NULL,
  `nguoi_gui` ENUM('user','assistant') NOT NULL,
  `noi_dung` MEDIUMTEXT NOT NULL,
  `ngay_tao` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ngay_cap_nhat` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_tin_nhan`),
  KEY `chi_muc_tin_nhan_hoi_thoai` (`ma_hoi_thoai`,`ma_tin_nhan`),
  CONSTRAINT `khoa_ngoai_tin_nhan_hoi_thoai` FOREIGN KEY (`ma_hoi_thoai`) REFERENCES `hoi_thoai` (`ma_hoi_thoai`)
    ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB COMMENT='Câu hỏi của người dùng và câu trả lời của trợ lý AI';

CREATE TABLE `trich_dan` (
  `ma_trich_dan` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_tin_nhan` BIGINT UNSIGNED NOT NULL,
  `ma_dieu_khoan` BIGINT UNSIGNED DEFAULT NULL,
  `thu_tu_trich_dan` SMALLINT UNSIGNED NOT NULL,
  `so_hieu` VARCHAR(100) NOT NULL COMMENT 'Bản chụp thông tin tại thời điểm trả lời',
  `tieu_de_van_ban` VARCHAR(500) NOT NULL,
  `phien_ban_noi_dung` INT UNSIGNED NOT NULL,
  `so_dieu` VARCHAR(10) NOT NULL,
  `so_khoan` VARCHAR(10) NOT NULL DEFAULT '',
  `ky_hieu_diem` VARCHAR(10) NOT NULL DEFAULT '',
  `noi_dung_trich_dan` TEXT NOT NULL COMMENT 'Nguyên văn căn cứ được lưu cùng câu trả lời',
  `lien_ket_nguon` VARCHAR(2048) DEFAULT NULL,
  `trang_nguon` SMALLINT UNSIGNED DEFAULT NULL,
  `ngay_tao` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_trich_dan`),
  UNIQUE KEY `duy_nhat_trich_dan_thu_tu` (`ma_tin_nhan`,`thu_tu_trich_dan`),
  CONSTRAINT `khoa_ngoai_trich_dan_tin_nhan` FOREIGN KEY (`ma_tin_nhan`) REFERENCES `tin_nhan` (`ma_tin_nhan`)
    ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `khoa_ngoai_trich_dan_dieu_khoan` FOREIGN KEY (`ma_dieu_khoan`) REFERENCES `dieu_khoan` (`ma_dieu_khoan`)
    ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `kiem_tra_trich_dan_thu_tu` CHECK (`thu_tu_trich_dan` > 0),
  CONSTRAINT `kiem_tra_trich_dan_phien_ban` CHECK (`phien_ban_noi_dung` > 0),
  CONSTRAINT `kiem_tra_trich_dan_so_dieu` CHECK (CHAR_LENGTH(TRIM(`so_dieu`)) > 0),
  CONSTRAINT `kiem_tra_trich_dan_diem` CHECK (`ky_hieu_diem` = '' OR `so_khoan` <> ''),
  CONSTRAINT `kiem_tra_trich_dan_trang` CHECK (`trang_nguon` IS NULL OR `trang_nguon` > 0)
) ENGINE=InnoDB COMMENT='Căn cứ của câu trả lời, giữ lại khi nguồn được cập nhật';
