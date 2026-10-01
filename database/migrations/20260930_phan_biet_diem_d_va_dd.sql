-- CyberLaw Search / MySQL 8.0 / 30-09-2026
-- Luu ky hieu diem dung nguyen ban: d va đ la HAI diem khac nhau.
-- Chay bang tai khoan quan tri trong Workbench, KHONG cap ALTER cho app.
-- Chi doi collation cua mot cot; khong xoa/sua noi dung hay tai khoan.
-- MySQL DDL tu commit; len lich rieng neu bang da lon. Co the chay lai.
USE `cyberlaw_search`;

ALTER TABLE `dieu_khoan`
  MODIFY COLUMN `ky_hieu_diem` VARCHAR(10)
    CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci
    NOT NULL DEFAULT '' COMMENT 'Để chuỗi rỗng khi không chia điểm; phân biệt d và đ';

-- Ket qua mong doi: collation utf8mb4_0900_as_ci; d_bang_dd = 0.
SELECT COLUMN_NAME, COLLATION_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dieu_khoan'
  AND COLUMN_NAME = 'ky_hieu_diem';

SELECT _utf8mb4'd' COLLATE utf8mb4_0900_as_ci
     = _utf8mb4'đ' COLLATE utf8mb4_0900_as_ci AS d_bang_dd;
