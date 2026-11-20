const { audit, field, integer, requireValue, transaction } = require('./foundation.cjs');
const { listProducts, adjust, originalCovers } = require('./commerce.cjs');

function saveProduct(db,user,id,input){
  const code=field(input.sku,'SKU',2,24).toUpperCase();
  requireValue(/^[A-Z0-9-]+$/.test(code),'Formato de SKU inválido.');
  const category=integer(input.category_id,'categoría',1,1e9);
  const name=field(input.name,'nombre',3,100);
  const family=input.family ? field(input.family,'familia',3,100) : name;
  const description=field(input.description,'descripción',8,550);
  const platform=field(input.platform,'plataforma',2,45);
  const image=field(input.image,'imagen');
  requireValue(/^\/covers\/(?:[1-9]|1[0-6])\.jpg$/.test(image) || originalCovers.has(image),'Selecciona una portada del catálogo.');
  const price=integer(input.price,'precio en centavos',1,10000000);
  return transaction(db,()=>{
    requireValue(db.prepare('SELECT id FROM categories WHERE id=? AND active=1').get(category),'Categoría inactiva o inexistente.');
    const old=id ? db.prepare('SELECT price FROM products WHERE id=?').get(id) : null;
    requireValue(!id||old,'Producto no encontrado.',404);
    requireValue(!db.prepare('SELECT 1 FROM products WHERE sku=? AND id<>?').get(code,id||0),'SKU repetido.',409);
    const columns=[code,category,name,family,description,platform,image,price,input.active===false?0:1];
    if(id){
      db.prepare('UPDATE products SET sku=?,category_id=?,name=?,family=?,description=?,platform=?,image=?,price=?,active=? WHERE id=?').run(...columns,id);
    } else {
      id=Number(db.prepare('INSERT INTO products(sku,category_id,name,family,description,platform,image,price,active) VALUES(?,?,?,?,?,?,?,?,?)').run(...columns).lastInsertRowid);
    }
    audit(db,user.id,old?'product_updated':'product_created','product',id,old?.price!==price?`price ${old?.price??'-'} → ${price}`:null);
    return db.prepare(listProducts+' WHERE p.id=?').get(id);
  });
}
function saveCategory(db,user,id,input){
  const name=field(input.name,'categoría',2,60);
  return transaction(db,()=>{
    requireValue(!db.prepare('SELECT 1 FROM categories WHERE name=? AND id<>?').get(name,id||0),'Categoría repetida.',409);
    if(id){
      requireValue(db.prepare('UPDATE categories SET name=?,active=? WHERE id=?').run(name,input.active===false?0:1,id).changes,'Categoría no encontrada.',404);
    } else id=Number(db.prepare('INSERT INTO categories(name) VALUES(?)').run(name).lastInsertRowid);
    audit(db,user.id,'category_saved','category',id);
    return {id};
  });
}
function disable(db,user,type,id){
  const table=type==='product'?'products':'categories';
  transaction(db,()=>{
    requireValue(db.prepare(`UPDATE ${table} SET active=0 WHERE id=?`).run(id).changes,'Registro no encontrado.',404);
    audit(db,user.id,'disabled',type,id);
  });
  return {ok:true};
}
function saveCoupon(db,user,input){
  const code=field(input.code,'código',2,24).toUpperCase();
  requireValue(/^[A-Z0-9-]+$/.test(code),'Formato de cupón inválido.');
  const percent=integer(input.percent,'porcentaje',1,80);
  const cap=integer(input.max_uses,'cantidad máxima',1,1000000);
  const end=Date.parse(field(input.ends_at,'vigencia'));
  requireValue(Number.isFinite(end),'Vigencia inválida.');
  transaction(db,()=>{
    db.prepare(`INSERT INTO coupons(code,percent,max_uses,ends_at,active) VALUES(?,?,?,?,?)
      ON CONFLICT(code) DO UPDATE SET percent=excluded.percent,max_uses=excluded.max_uses,ends_at=excluded.ends_at,active=excluded.active`)
      .run(code,percent,cap,new Date(end).toISOString(),input.active===false?0:1);
    audit(db,user.id,'coupon_saved','coupon',code);
  });
  return {code};
}
function inventory(db,user,id,input){
  const delta=integer(input.delta,'movimiento',-10000,10000);
  requireValue(delta!==0,'El ajuste debe ser distinto de cero.');
  const reason=field(input.reason,'motivo',4,100);
  transaction(db,()=>adjust(db,id,delta,reason,user.id));
  return {ok:true};
}
function reports(db){
  return {
    sales:db.prepare('SELECT COALESCE(SUM(total),0) total,COUNT(*) orders FROM sales_report').get(),
    orders:db.prepare('SELECT status,COUNT(*) quantity FROM orders GROUP BY status').all(),
    lowStock:db.prepare('SELECT sku,name,stock FROM products WHERE active=1 AND stock<=3 ORDER BY stock,id').all(),
    top:db.prepare(`SELECT i.sku, i.name, SUM(i.quantity) quantity FROM order_items i JOIN sales_report s ON s.id=i.order_id
      GROUP BY i.sku,i.name ORDER BY quantity DESC,i.sku LIMIT 10`).all(),
    cases:db.prepare('SELECT kind,status,COUNT(*) quantity FROM cases GROUP BY kind,status').all()
  };
}
module.exports={saveProduct,saveCategory,disable,saveCoupon,inventory,reports};
