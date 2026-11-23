const { audit, field, integer, requireValue, searchKey, termsVersion, token, transaction } = require('./foundation.cjs');
const catalog = require('../db/catalog.cjs');
const listProducts = 'SELECT p.*,c.name category FROM products p JOIN categories c ON c.id=p.category_id';
const cartItems = `SELECT p.*,c.active category_active,i.quantity FROM carts i JOIN products p ON p.id=i.product_id
JOIN categories c ON c.id=p.category_id WHERE i.session_id=? ORDER BY p.id`;
const inventoryChange = `UPDATE products SET stock=stock+? WHERE id=? AND stock+? BETWEEN 0 AND 1000000`;
const move = `INSERT INTO inventory_movements(product_id,delta,reason,actor_id,order_id) VALUES(?,?,?,?,?)`;
const originalCovers = new Set(catalog.flatMap(row=>typeof row[7]==='string' ? ['/games/'+row[7]] : []));
const orders = new Map([
  ['name', 'p.name,p.id'],
  ['ascending', 'p.price,p.id'],
  ['descending', 'p.price DESC,p.id'],
  ['newest', 'p.id DESC'],
  ['featured', "CASE WHEN p.image LIKE '/games/%' THEN 0 ELSE 1 END,p.id DESC"],
]);

function seedProducts(db, rows, startingAt=0, preserveSeedIds=false){
  const category=db.prepare('SELECT id FROM categories WHERE name=?');
  const insert=db.prepare(`INSERT INTO products(id,sku,category_id,name,family,description,platform,image,price,stock)
    VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(sku) DO NOTHING`);
  const movement=db.prepare(move);
  rows.forEach(([nameOfCategory,name,family,description,platform,price,stock,cover], index)=>{
    const number=startingAt+index+1;
    const sku=`MG-${String(number).padStart(3,'0')}`;
    const image=typeof cover==='string'?'/games/'+cover:`/covers/${cover ?? number}.jpg`;
    const result=insert.run(preserveSeedIds ? number : null,sku,category.get(nameOfCategory).id,name,family,description,platform,image,price,stock);
    if(result.changes&&stock>0)movement.run(result.lastInsertRowid,stock,'seed',null,null);
  });
}

function seedCatalog(db) {
  transaction(db, () => {
    const empty=!db.prepare('SELECT id FROM categories LIMIT 1').get();
    const insertCategory=db.prepare('INSERT OR IGNORE INTO categories(name) VALUES(?)');
    if(empty){
      for(const name of ['Juegos','DLCs','Complementos']) insertCategory.run(name);
      seedProducts(db,catalog.slice(catalog.retiredCount),catalog.retiredCount,true);
      db.prepare("INSERT OR IGNORE INTO coupons(code,percent,ends_at,max_uses) VALUES('DEMO10',10,'2099-12-31T00:00:00Z',200)").run();
    }
    if(!db.prepare('SELECT version FROM schema_migrations WHERE version=3').get()){
      if(!empty){
        for(const name of ['Juegos','Complementos']) insertCategory.run(name);
        seedProducts(db,catalog.slice(36),36);
      }
      db.prepare('INSERT INTO schema_migrations(version) VALUES(3)').run();
    }
    if (!db.prepare('SELECT version FROM schema_migrations WHERE version=5').get()) {
      const retire = db.prepare('UPDATE products SET active=0 WHERE sku=?');
      const removeFromCart = db.prepare('DELETE FROM carts WHERE product_id IN (SELECT id FROM products WHERE sku=?)');
      for (let index = 1; index <= catalog.retiredCount; index++) {
        const sku = 'MG-' + String(index).padStart(3, '0');
        retire.run(sku);
        removeFromCart.run(sku);
      }
      const hivebusters = catalog[35];
      db.prepare("UPDATE products SET description=?,platform=?,image=? WHERE sku='MG-036'")
        .run(hivebusters[3], hivebusters[4], '/games/' + hivebusters[7]);
      db.prepare('INSERT INTO schema_migrations(version) VALUES(5)').run();
    }
    if (!db.prepare('SELECT version FROM schema_migrations WHERE version=6').get()) {
      const revise = db.prepare('UPDATE products SET name=?,family=?,description=?,image=? WHERE sku=?');
      for (const number of catalog.complementRevisions) {
        const [, name, family, description, , , , cover] = catalog[number - 1];
        revise.run(name, family, description, '/games/' + cover, 'MG-' + String(number).padStart(3, '0'));
      }
      db.prepare('INSERT INTO schema_migrations(version) VALUES(6)').run();
    }
    if (!db.prepare('SELECT version FROM schema_migrations WHERE version=8').get()) {
      const revise = db.prepare('UPDATE products SET name=?,description=? WHERE sku=?');
      for (const number of catalog.availabilityRevisions) {
        const [, name, , description] = catalog[number - 1];
        revise.run(name, description, 'MG-' + String(number).padStart(3, '0'));
      }
      const exhausted = db.prepare(`SELECT p.id FROM products p JOIN categories c ON c.id=p.category_id
        WHERE p.active=1 AND c.active=1 AND p.stock=0 AND (c.name='Juegos' OR p.sku='MG-043')`).all();
      for (const product of exhausted) adjust(db, product.id, 10, 'catalog_restock', null, null);
      db.prepare('INSERT INTO schema_migrations(version) VALUES(8)').run();
    }
  });
}

function catalogPage(db, query) {
  const predicates = ['p.active=1','c.active=1'];
  const params = [];
  const q = (query.get('q') || '').trim().slice(0,80);
  if (q) {
    const pattern = searchKey(q).replace(/[\\%_]/g, '\\$&') + '%';
    if (/^\p{L}$/u.test(q)) {
      predicates.push("search_key(p.name) LIKE ? ESCAPE '\\'");
      params.push(pattern);
    } else {
      predicates.push("(search_key(p.name) LIKE ? ESCAPE '\\' OR p.sku LIKE ? ESCAPE '\\')");
      params.push(pattern,pattern);
    }
  }
  for (const [key, expression] of [['category','c.id=?'],['min','p.price>=?'],['max','p.price<=?']]) {
    if (query.has(key) && query.get(key) !== '') {
      predicates.push(expression);
      params.push(integer(Number(query.get(key)),key,0,10000000));
    }
  }
  if (query.get('stock') === '1') predicates.push('p.stock>0');
  const sort = orders.get(query.get('sort')) || 'p.id';
  const page = integer(Number(query.get('page') || 1),'página',1,10000);
  const where = ' WHERE ' + predicates.join(' AND ');
  const total = db.prepare('SELECT count(*) total FROM products p JOIN categories c ON c.id=p.category_id'+where).get(...params).total;
  const items = db.prepare(`${listProducts}${where} ORDER BY ${sort} LIMIT 6 OFFSET ?`).all(...params,(page-1)*6);
  return { items,total,page,pageSize:6 };
}

function cart(db, sessionId) {
  const items = sessionId ? db.prepare(cartItems).all(sessionId) : [];
  return { items, subtotal:items.reduce((sum,row)=>sum+row.price*row.quantity,0) };
}
function setCart(db, sessionId, productId, quantity) {
  transaction(db, () => {
    integer(productId,'producto',1,1e9);
    integer(quantity,'cantidad',0,99);
    if (quantity===0) {
      db.prepare('DELETE FROM carts WHERE session_id=? AND product_id=?').run(sessionId,productId);
      return;
    }
    const row = db.prepare(`${listProducts} WHERE p.id=? AND p.active=1 AND c.active=1`).get(productId);
    requireValue(row && row.stock >= quantity,'Inventario insuficiente.',409);
    db.prepare(`INSERT INTO carts(session_id,product_id,quantity) VALUES(?,?,?)
      ON CONFLICT(session_id,product_id) DO UPDATE SET quantity=excluded.quantity`).run(sessionId,productId,quantity);
  });
  return cart(db,sessionId);
}
function quote(db, sessionId, input) {
  const { items, subtotal } = cart(db,sessionId);
  requireValue(items.length>0,'El carrito está vacío.',409);
  requireValue(items.every(i=>i.active===1 && i.category_active===1 && i.stock>=i.quantity),'Inventario insuficiente o producto inactivo.',409);
  let code = null;
  let discount = 0;
  if (input.coupon) {
    code = field(input.coupon,'cupón',1,24).toUpperCase();
    const coupon = db.prepare("SELECT c.*, (SELECT count(*) FROM orders WHERE coupon_code=c.code AND status NOT IN ('pending','cancelled','refunded')) uses FROM coupons c WHERE c.code=?").get(code);
    requireValue(coupon && coupon.active && Date.parse(coupon.ends_at)>Date.now() && coupon.uses<coupon.max_uses,'Cupón inválido, vencido o agotado.',409);
    discount = Math.floor(subtotal * coupon.percent / 100);
  }
  return {items,subtotal,discount,code,shipping:0,tax:0,total:subtotal-discount,currency:'MXN',delivery:'Digital · preparación y liberación por administración'};
}

function orderDetail(db, id, user) {
  const order=db.prepare(`SELECT o.*,p.status payment_status,p.reference,s.status delivery_status,s.method,s.tracking
    FROM orders o JOIN payments p ON p.order_id=o.id JOIN shipments s ON s.order_id=o.id WHERE o.id=?`).get(id);
  requireValue(order && (user.role==='admin'||order.user_id===user.id),'Pedido no encontrado.',404);
  const { request_key, address_snapshot, ...visible }=order;
  const items=db.prepare('SELECT product_id,sku,name,description,platform,unit_price,quantity FROM order_items WHERE order_id=?').all(id);
  const history=db.prepare("SELECT detail,created_at FROM audit_logs WHERE entity='order' AND entity_id=? ORDER BY id").all(String(id));
  return {...visible,address:JSON.parse(address_snapshot),items,history,
    delivery_code: order.status==='delivered' ? `DEMO-${order.tracking?.slice(4) || order.folio.slice(3)}` : null };
}
function library(db, userId){
  return db.prepare(`SELECT o.id AS order_id,o.folio,o.status,i.sku,i.name,i.platform,i.quantity,s.tracking
    FROM orders o JOIN payments p ON p.order_id=o.id JOIN order_items i ON i.order_id=o.id
    JOIN shipments s ON s.order_id=o.id WHERE o.user_id=? AND p.status IN ('approved','refunded')
    ORDER BY o.id DESC,i.sku`).all(userId).map(({tracking,...item})=>({
      ...item,
      license:item.status==='delivered'?`DEMO-${tracking?.slice(4)??item.folio.slice(3)}-${item.sku}`:null
    }));
}
function adjust(db, product, delta, reason, actor, order=null) {
  requireValue(db.prepare(inventoryChange).run(delta,product,delta).changes===1,'Inventario insuficiente o ajuste fuera de rango.',409);
  db.prepare(move).run(product,delta,reason,actor,order);
  audit(db,actor,'inventory_change','product',product,`${reason} ${delta}`);
}
function createOrder(db, session, input) {
  const key=field(input.requestKey,'clave de solicitud',16,72);
  return transaction(db,()=>{
    const previous=db.prepare('SELECT id FROM orders WHERE user_id=? AND request_key=?').get(session.user.id,key);
    if(previous) return orderDetail(db,previous.id,session.user);
    requireValue(input.accepted===true && input.termsVersion===termsVersion,'Acepta la versión vigente de los términos.',409);
    requireValue(input.method==='digital','Método de entrega inválido.');
    const address=db.prepare('SELECT recipient,street,city,region,postal_code FROM addresses WHERE id=? AND user_id=?')
      .get(integer(input.addressId,'dirección',1,1e9),session.user.id);
    requireValue(address,'Selecciona una dirección de tu cuenta.');
    const totals = quote(db,session.id,input);
    requireValue(input.quotedTotal===totals.total,'El total cambió. Revisa y confirma nuevamente.',409);
    const current=db.prepare(`INSERT INTO orders(folio,user_id,request_key,address_snapshot,subtotal,discount,shipping,tax,total,coupon_code,status,terms_version,consent_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,'pending',?,?)`).run('MG-'+token().slice(0,12).toUpperCase(),session.user.id,key,JSON.stringify(address),totals.subtotal,totals.discount,0,0,totals.total,totals.code,termsVersion,new Date().toISOString());
    const id=Number(current.lastInsertRowid);
    for(const item of totals.items) db.prepare('INSERT INTO order_items VALUES(?,?,?,?,?,?,?,?)')
      .run(id,item.id,item.sku,item.name,item.description,item.platform,item.price,item.quantity);
    db.prepare("INSERT INTO payments(order_id,reference,amount,status) VALUES(?,?,?,'pending')").run(id,'SIM-'+token().slice(0,12),totals.total);
    db.prepare("INSERT INTO shipments(order_id,method,status) VALUES(?,'digital','pending')").run(id);
    audit(db,session.user.id,'order_placed','order',id,'Pedido pendiente y términos aceptados');
    return orderDetail(db,id,session.user);
  });
}
function confirmPayment(db, session, id, input) {
  requireValue(['approve','decline'].includes(input.outcome),'Selecciona un resultado de prueba.');
  return transaction(db,()=>{
    const order=orderDetail(db,id,session.user);
    requireValue(order.user_id===session.user.id,'Pedido no encontrado.',404);
    if(order.status!=='pending') return order;
    if(input.outcome==='approve') {
      if (order.coupon_code) {
        const coupon=db.prepare("SELECT active,ends_at,max_uses,(SELECT COUNT(*) FROM orders WHERE coupon_code=c.code AND status NOT IN ('pending','cancelled','refunded')) uses FROM coupons c WHERE code=?").get(order.coupon_code);
        requireValue(coupon?.active && Date.parse(coupon.ends_at)>Date.now() && coupon.uses<coupon.max_uses,'Cupón inválido, vencido o agotado.',409);
      }
      for (const item of order.items) {
        const product=db.prepare(`${listProducts} WHERE p.id=? AND p.active=1 AND c.active=1`).get(item.product_id);
        requireValue(product && product.price===item.unit_price,'Producto o precio cambió. Cancela y vuelve a cotizar.',409);
        adjust(db,item.product_id,-item.quantity,'sale',session.user.id,id);
        db.prepare('DELETE FROM carts WHERE session_id=? AND product_id=?').run(session.id,item.product_id);
      }
      db.prepare("UPDATE orders SET status='paid' WHERE id=?").run(id);
      db.prepare("UPDATE payments SET status='approved',updated_at=CURRENT_TIMESTAMP WHERE order_id=?").run(id);
      audit(db,session.user.id,'payment','order',id,'Pago de prueba aprobado');
    } else {
      db.prepare("UPDATE orders SET status='cancelled' WHERE id=?").run(id);
      db.prepare("UPDATE payments SET status='declined',updated_at=CURRENT_TIMESTAMP WHERE order_id=?").run(id);
      db.prepare("UPDATE shipments SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE order_id=?").run(id);
      audit(db,session.user.id,'payment','order',id,'Pago de prueba rechazado');
    }
    return orderDetail(db,id,session.user);
  });
}
function transitionOrder(db, user, id, input) {
  return transaction(db,()=>{
    const order=orderDetail(db,id,user);
    const target={paid:'preparing',preparing:'sent',sent:'delivered'}[order.status];
    requireValue(target && input.status===target,'Transición no permitida.',409);
    const tracking=target==='sent' ? 'DIG-'+token().slice(0,12).toUpperCase() : order.tracking;
    db.prepare('UPDATE orders SET status=? WHERE id=?').run(target,id);
    db.prepare('UPDATE shipments SET status=?,tracking=?,updated_at=CURRENT_TIMESTAMP WHERE order_id=?').run(target,tracking,id);
    audit(db,user.id,'status_change','order',id,target);
    return orderDetail(db,id,user);
  });
}

module.exports={ seedCatalog,catalogPage,listProducts,originalCovers,cart,setCart,quote,orderDetail,library,createOrder,confirmPayment,transitionOrder,adjust };
