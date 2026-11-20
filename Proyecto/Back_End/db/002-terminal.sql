ALTER TABLE users ADD COLUMN avatar TEXT NOT NULL DEFAULT 'memo'
  CHECK(avatar IN ('memo','cyber','gamer','neon','hacker'));

INSERT OR IGNORE INTO categories(name)
  SELECT 'DLCs' WHERE EXISTS (SELECT 1 FROM categories WHERE name='Complementos');
INSERT OR IGNORE INTO categories(name)
  SELECT 'Complementos' WHERE EXISTS (SELECT 1 FROM categories WHERE name='Suscripciones');

UPDATE products SET category_id=(SELECT id FROM categories WHERE name='DLCs')
WHERE sku IN ('MG-018','MG-020','MG-036')
  AND category_id=(SELECT id FROM categories WHERE name='Complementos');

UPDATE products SET category_id=(SELECT id FROM categories WHERE name='Complementos')
WHERE category_id=(SELECT id FROM categories WHERE name='Suscripciones');
UPDATE categories SET active=0 WHERE name='Suscripciones';

WITH covers(sku, previous, replacement) AS (
  VALUES
    ('MG-017','/covers/3.jpg','/games/gta6.jpg'),
    ('MG-018','/covers/11.jpg','/games/phantom-liberty.jpg'),
    ('MG-019','/covers/12.jpg','/games/blackops6.jpg'),
    ('MG-020','/covers/4.jpg','/games/shadow-of-the-erdtree.jpg'),
    ('MG-021','/covers/2.jpg','/games/fifa25.jpg'),
    ('MG-022','/covers/3.jpg','/games/rdr2.jpg'),
    ('MG-023','/covers/6.jpg','/games/haloinfinite.jpg'),
    ('MG-024','/covers/8.jpg','/games/gow-ragnarok.webp'),
    ('MG-025','/covers/4.jpg','/games/elden_ring.jpg'),
    ('MG-026','/covers/11.jpg','/games/cyberpunk.jpg'),
    ('MG-027','/covers/13.jpg','/games/playstation-plus-1-mes.jpg'),
    ('MG-028','/covers/13.jpg','/games/playstation-plus-3-meses.jpg'),
    ('MG-029','/covers/14.jpg','/games/gamepass-1-mes.jpg'),
    ('MG-030','/covers/14.jpg','/games/gamepass-3-meses.jpg'),
    ('MG-035','/covers/3.jpg','/games/rdo-lingotes.jpg')
)
UPDATE products AS product SET image=covers.replacement
FROM covers WHERE product.sku=covers.sku AND product.image=covers.previous;
