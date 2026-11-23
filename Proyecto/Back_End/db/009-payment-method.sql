ALTER TABLE payments ADD COLUMN method TEXT CHECK(method IN ('card','paypal'));
