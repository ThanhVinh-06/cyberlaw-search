-- Chay mot lan tren MySQL. NULL = hoi thoai cua khach vang lai (khong thuoc tai khoan nao).
-- Giu nguyen khoa ngoai: MySQL cho phep cot FK nhan NULL, va ON DELETE CASCADE khong anh huong dong NULL.
-- Chi noi rong rang buoc NOT NULL -> NULL, moi dong hien co giu nguyen gia tri.
ALTER TABLE `hoi_thoai`
  MODIFY COLUMN `ma_nguoi_dung` BIGINT UNSIGNED NULL;
