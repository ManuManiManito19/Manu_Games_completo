-- Ejecutar con una consola SQLite sobre una copia de la base.
SELECT COALESCE(sum(total),0) AS ventas_netas_centavos,count(*) AS pedidos FROM sales_report;
SELECT status,count(*) AS pedidos FROM orders GROUP BY status ORDER BY status;
SELECT sku,name,stock FROM products WHERE active=1 AND stock<=3 ORDER BY stock,sku;
SELECT i.sku,i.name,sum(i.quantity) AS unidades FROM order_items i
JOIN sales_report s ON s.id=i.order_id GROUP BY i.sku,i.name ORDER BY unidades DESC;
SELECT kind,status,count(*) AS solicitudes FROM cases GROUP BY kind,status;
SELECT p.sku,p.stock,COALESCE(sum(m.delta),0) AS movimientos_acumulados FROM products p
LEFT JOIN inventory_movements m ON m.product_id=p.id GROUP BY p.id HAVING p.stock<>COALESCE(sum(m.delta),0);
PRAGMA foreign_key_check;
PRAGMA integrity_check;
