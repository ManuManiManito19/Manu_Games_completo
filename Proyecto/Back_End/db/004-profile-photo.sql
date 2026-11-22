ALTER TABLE users ADD COLUMN avatar_image TEXT
  CHECK(avatar_image IS NULL OR
        (length(avatar_image) BETWEEN 28 AND 16000 AND avatar_image LIKE 'data:image/jpeg;base64,%'));
