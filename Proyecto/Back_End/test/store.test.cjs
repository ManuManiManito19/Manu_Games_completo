const { test }=require('node:test');
const assert=require('node:assert/strict');
const { mkdtempSync,rmSync,readFileSync,writeFileSync }=require('node:fs');
const { join }=require('node:path');
const { tmpdir }=require('node:os');
const { DatabaseSync }=require('node:sqlite');
const { openDatabase,passwordHash }=require('../src/foundation.cjs');
const { createApp }=require('../src/http.cjs');
const { seedCatalog }=require('../src/commerce.cjs');
const { makeBackup,restoreBackup }=require('../src/backup.cjs');
const syntheticPassword='Prueba-esto-2026';
const demoAddress={recipient:'Cuenta de prueba',street:'Av. Simulada 100',city:'Nuevo Laredo',region:'Tamaulipas',postal_code:'88000'};

test('La migración conserva usuarios e inventario de la versión anterior',t=>{
  const folder=mkdtempSync(join(tmpdir(),'manu-migration-'));
  const path=join(folder,'store.sqlite');
  t.after(()=>rmSync(folder,{recursive:true,force:true}));
  const previous=new DatabaseSync(path);
  previous.exec(readFileSync(join(__dirname,'../db/001-initial.sql'),'utf8'));
  previous.exec(`CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP) STRICT;
    INSERT INTO schema_migrations(version) VALUES(1);
    INSERT INTO users(name,email,password_hash) VALUES('Cliente','cliente@example.test','hash de fixture');
    INSERT INTO categories(id,name) VALUES(1,'Juegos'),(2,'Complementos'),(3,'Suscripciones');
    INSERT INTO products(sku,category_id,name,family,description,platform,image,price,stock)
    VALUES ('MG-017',1,'Grand Theft Auto VI','GTA','Juego de prueba','PC','/covers/3.jpg',180000,7),
    ('MG-018',2,'Phantom Liberty','PL','DLC de prueba','PC','/covers/11.jpg',99000,3),
    ('MG-027',3,'PS Plus','PS Plus','Suscripción de prueba','PS5','/covers/13.jpg',14900,2)`);
  previous.close();
  const upgraded=openDatabase(path);
  try {
    assert.equal(upgraded.prepare('SELECT avatar FROM users WHERE id=1').get().avatar,'memo');
    assert.equal(upgraded.prepare('SELECT avatar_image FROM users WHERE id=1').get().avatar_image,null);
    assert.deepEqual(upgraded.prepare(`SELECT p.sku,c.name,p.stock,p.image FROM products p
      JOIN categories c ON c.id=p.category_id ORDER BY p.sku`).all().map(row=>[row.sku,row.name,row.stock,row.image]),[
      ['MG-017','Juegos',7,'/games/gta6.jpg'],
      ['MG-018','DLCs',3,'/games/phantom-liberty.jpg'],
      ['MG-027','Complementos',2,'/games/playstation-plus-1-mes.jpg'],
    ]);
    assert.equal(upgraded.prepare("SELECT active FROM categories WHERE name='Suscripciones'").get().active,0);
    seedCatalog(upgraded);
    seedCatalog(upgraded);
    assert.equal(upgraded.prepare('SELECT COUNT(*) AS count FROM products').get().count,10);
    assert.equal(upgraded.prepare("SELECT stock FROM products WHERE sku='MG-017'").get().stock,7);
    assert.equal(upgraded.prepare("SELECT stock FROM products WHERE sku='MG-043'").get().stock,0);
    assert.deepEqual(upgraded.prepare('PRAGMA foreign_key_check').all(),[]);
  } finally {
    upgraded.close();
  }
});

test('Tienda de extremo a extremo con persistencia y autorización',async t=>{
  const db=openDatabase(':memory:');
  const {server}=createApp({db});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  t.after(()=>new Promise(resolve=>server.close(()=>{db.close();resolve();})));
  const url='http://127.0.0.1:'+server.address().port;
  function agent(){
    let csrf,cookie;
    return async (method,path,body,status=200,opts={})=>{
      const headers={...(cookie?{cookie}:{}),...(csrf?{'x-csrf-token':csrf}:{}),...(body?{'content-type':'application/json'}:{}),...opts};
      const res=await fetch(url+'/api'+path,{method,headers,body:body?JSON.stringify(body):undefined});
      const result=await res.json();
      assert.equal(res.status,status,method+' '+path+' '+JSON.stringify(result));
      if(res.headers.get('set-cookie')) cookie=res.headers.get('set-cookie').split(';')[0];
      if(result.csrf)csrf=result.csrf;
      assert.equal(res.headers.get('x-content-type-options'),'nosniff');
      return result;
    };
  }
  const buyer=agent(),buyerTwo=agent(),operator=agent();
  let first, second, order, next, guarantee, replacement, declined;
  const qty=id=>db.prepare('SELECT stock FROM products WHERE id=?').get(id).stock;
  const caseDesc={reason:'Código de demostración requiere revisión.'};
  await t.test('E01 catálogo paginado, filtros y ficha con variantes',async()=>{
    assert.equal((await buyer('GET','/products')).total,43);
    const categories=await buyer('GET','/categories');
    assert.deepEqual(categories.map(category=>category.name),['Juegos','DLCs','Complementos']);
    for(const [index,total] of [30,3,10].entries()){
      const result=await buyer('GET','/products?category='+categories[index].id);
      assert.equal(result.total,total);
      assert.ok(result.items.every(item=>item.category===categories[index].name));
    }
    const featured=await buyer('GET','/products?sort=featured');
    assert.ok(featured.items.every(item=>item.image.startsWith('/games/')));
    const result=await buyer('GET','/products?q=Horizonte&max=50000&stock=1&sort=ascending');
    assert.equal(result.total,2);
    assert.equal(result.items[0].sku,'MG-016');
    const initial = await buyer('GET','/products?q=c');
    assert.equal(initial.total,8);
    assert.ok(initial.items.every(item=>item.name.startsWith('C')));
    assert.equal((await buyer('GET','/products?q=Codice')).total,1);
    assert.equal((await buyer('GET','/products/1')).variants.length,1);
    assert.equal((await buyer('GET','/products?q=%25_%27')).total,0);
  });
  await t.test('E02 carrito persistente, modificación, eliminación y stock insuficiente',async()=>{
    await buyer('GET','/auth/session');
    await buyer('POST','/cart',{productId:1,quantity:2});
    await buyer('PATCH','/cart/1',{quantity:1});
    await buyer('POST','/cart',{productId:15,quantity:2},409);
    await buyer('POST','/cart',{productId:2,quantity:1});
    await buyer('DELETE','/cart/2');
    assert.equal((await buyer('GET','/cart')).items.length,1);
  });
  await t.test('E03 registro con hash, rotación, entrada especial y control por rol/CSRF',async()=>{
    const name='Ana <Caso> & O\'Brien';
    const session=await buyer('POST','/auth/register',{name,email:'ana@example.test',password:syntheticPassword,avatar:'neon',accepted:true},201);
    assert.equal(session.user.role,'client');
    assert.equal(session.user.avatar,'neon');
    assert.equal((await buyer('GET','/profile')).name,name);
    await buyer('PATCH','/profile',{name,avatar:'desconocido'},400);
    assert.equal((await buyer('PATCH','/profile',{name,avatar:'cyber'})).avatar,'cyber');
    assert.equal((await buyer('GET','/auth/session')).user.avatar,'cyber');
    const hash=db.prepare('SELECT password_hash FROM users WHERE id=?').get(session.user.id).password_hash;
    assert.match(hash,/^[a-f0-9]{32}:[a-f0-9]{128}$/);
    assert.ok(!hash.includes(syntheticPassword));
    assert.equal((await buyer('GET','/cart')).items[0].id,1);
    await buyer('GET','/admin/orders',null,403);
    await buyer('POST','/addresses',demoAddress,403,{'x-csrf-token':'invalid'});
    await buyer('POST','/addresses',demoAddress,403,{origin:'https://outside.example'});
    first=(await buyer('POST','/addresses',demoAddress,201)).id;
    await buyerTwo('GET','/auth/session');
    await buyerTwo('POST','/auth/register',{name:'Otra compradora',email:'otra@example.test',password:syntheticPassword,accepted:true},201);
    second=(await buyerTwo('POST','/addresses',demoAddress,201)).id;
    db.prepare("INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,'admin')").run('Operación','ops@example.test',await passwordHash(syntheticPassword));
    await operator('GET','/auth/session');
    await operator('POST','/auth/login',{email:'ops@example.test',password:syntheticPassword});
  });
  await t.test('E04 precio en servidor, cupón, términos, folio e idempotencia',async()=>{
    const quote=await buyer('POST','/quote',{coupon:'DEMO10',price:1});
    assert.deepEqual([quote.subtotal,quote.discount,quote.shipping,quote.tax,quote.total],[34900,3490,0,0,31410]);
    const data={requestKey:'checkout-10000000001',addressId:first,method:'digital',coupon:'DEMO10',quotedTotal:quote.total,termsVersion:'2026-11-19',accepted:true};
    await buyer('POST','/orders',{...data,quotedTotal:1},409);
    await buyer('POST','/orders',{...data,accepted:false},409);
    order=await buyer('POST','/orders',data,201);
    assert.match(order.folio,/^MG-/);
    assert.equal((await buyer('POST','/orders',data,201)).id,order.id);
    assert.equal(order.status,'pending');
    await buyerTwo('GET','/orders/'+order.id,null,404);
    assert.equal((await buyer('POST','/payments/'+order.id+'/confirm',{outcome:'approve'})).status,'paid');
    const after=qty(1);
    await buyer('POST','/payments/'+order.id+'/confirm',{outcome:'approve'});
    assert.equal(qty(1),after);
    assert.equal(db.prepare("SELECT delta FROM inventory_movements WHERE reason='sale' AND order_id=?").get(order.id).delta,-1);
  });
  await t.test('E11 conserva la foto de perfil después de volver a iniciar sesión', async () => {
    const portrait = 'data:image/jpeg;base64,' + Buffer.from([255, 216, 0, 255, 217]).toString('base64');
    await buyerTwo('PATCH', '/profile', {name: 'Otra compradora', avatar: 'data:image/svg+xml;base64,AAAA'}, 400);
    await buyerTwo('PATCH', '/profile', {name: 'Otra compradora', avatar: 'data:image/jpeg;base64,AAAA'}, 400);
    assert.equal((await buyerTwo('PATCH', '/profile', {name: 'Otra compradora', avatar: portrait})).avatar, portrait);
    await buyerTwo('POST', '/auth/logout', {});
    await buyerTwo('GET', '/auth/session');
    const signedIn = await buyerTwo('POST', '/auth/login', {
      email: 'otra@example.test', password: syntheticPassword,
    });
    assert.equal(signedIn.user.avatar, portrait);
    assert.equal((await buyerTwo('PATCH', '/profile', {name: 'Nombre actualizado'})).avatar, portrait);
    assert.equal((await buyerTwo('PATCH', '/profile', {name: 'Nombre actualizado', avatar: 'gamer'})).avatar, 'gamer');
    assert.equal(db.prepare('SELECT avatar_image FROM users WHERE id=?').get(signedIn.user.id).avatar_image, null);
  });
  await t.test('E05 gestión administrativa, transiciones, guía y entrega',async()=>{
    assert.ok((await operator('GET','/admin/orders')).some(o=>o.id===order.id));
    await operator('PATCH','/admin/orders/'+order.id,{status:'delivered'},409);
    for(const status of ['preparing','sent','delivered'])await operator('PATCH','/admin/orders/'+order.id,{status});
    order=await buyer('GET','/orders/'+order.id);
    assert.match(order.tracking,/^DIG-/);
    assert.match(order.delivery_code,/^DEMO-/);
    assert.equal(order.status,'delivered');
  });
  await t.test('E06 devolución, información adicional y reembolso sin doble reposición',async()=>{
    const item=await buyer('POST','/returns',{orderId:order.id,kind:'return',productId:1,...caseDesc},201);
    await buyerTwo('POST','/returns',{orderId:order.id,kind:'return',...caseDesc},404);
    await operator('PATCH','/admin/returns/'+item.id,{status:'needs_info',resolution:'Aclara el código de la prueba.'});
    await buyer('POST','/returns/'+item.id+'/messages',{message:'Código de ejemplo sin activar.'});
    const before=qty(1);
    await operator('PATCH','/admin/returns/'+item.id,{status:'approved',action:'refund',resolution:'Se aprueba la devolución de prueba.'});
    await operator('PATCH','/admin/returns/'+item.id,{status:'approved',action:'refund',resolution:'Segundo intento.'},409);
    assert.equal(qty(1),before+1);
    assert.equal((await buyer('GET','/payments/'+order.id)).status,'refunded');
    assert.equal((await buyer('GET','/returns'))[0].status,'approved');
  });
  const startOrder=async(user,address,id,key)=>{
    await user('POST','/cart',{productId:id,quantity:1});
    const quote=await user('POST','/quote',{});
    return user('POST','/orders',{requestKey:key,addressId:address,method:'digital',quotedTotal:quote.total,accepted:true,termsVersion:'2026-11-19'},201);
  };
  await t.test('E07 dos compradores disputan la última unidad y la transacción rechaza al segundo',async()=>{
    next=await startOrder(buyer,first,15,'concurrencia-demo-01');
    const competing=await startOrder(buyerTwo,second,15,'concurrencia-demo-02');
    const firstFinish=buyer('POST','/payments/'+next.id+'/confirm',{outcome:'approve'});
    await firstFinish;
    await buyerTwo('POST','/payments/'+competing.id+'/confirm',{outcome:'approve'},409);
    assert.equal(qty(15),0);
    assert.equal((await buyerTwo('GET','/payments/'+competing.id)).status,'pending');
    const {id}=await buyerTwo('POST','/returns',{orderId:competing.id,kind:'cancel',reason:'Sin inventario disponible.'},201);
    await operator('PATCH','/admin/returns/'+id,{status:'approved',action:'refund',resolution:'Cancelación de prueba sin pago aprobado.'});
    assert.equal((await buyerTwo('GET','/orders/'+competing.id)).status,'cancelled');
  });
  await t.test('E08 garantía con reposición, pago rechazado e inventario intacto',async()=>{
    for(const status of ['preparing','sent','delivered']) await operator('PATCH','/admin/orders/'+next.id,{status});
    const original=await buyer('GET','/orders/'+next.id);
    guarantee=await buyer('POST','/returns',{orderId:next.id,kind:'warranty',productId:15,...caseDesc},201);
    await operator('PATCH','/admin/returns/'+guarantee.id,{status:'approved',action:'replacement',resolution:'Se generó una reposición académica.'});
    replacement=await buyer('GET','/orders/'+next.id);
    assert.notEqual(replacement.delivery_code,original.delivery_code);
    await buyerTwo('DELETE','/cart/15');
    const before=qty(2);
    declined=await startOrder(buyerTwo,second,2,'rechazo-demo-000001');
    assert.equal((await buyerTwo('POST','/payments/'+declined.id+'/confirm',{outcome:'decline'})).payment_status,'declined');
    assert.equal(qty(2),before);
  });
  await t.test('E09 políticas, recuperación genérica, cierre de sesión y caducidad',async()=>{
    assert.equal((await buyer('GET','/info')).payment,'simulated');
    await buyer('POST','/auth/logout',{});
    await buyer('GET','/orders',null,401);
    await buyer('GET','/auth/session');
    await buyer('POST','/auth/recovery',{email:'irrelevante@example.test'},202);
    await buyer('POST','/auth/login',{email:'ana@example.test',password:'invalida'},401);
    db.prepare('UPDATE sessions SET expires_at=0').run();
    await operator('GET','/admin/reports',null,401);
  });
  await t.test('E10 integridad referencial y respaldo cifrado con restauración',async()=>{
    assert.throws(()=>db.prepare("INSERT INTO inventory_movements(product_id,delta,reason) VALUES(999999,1,'prueba')").run(),/FOREIGN KEY/);
    const folder=mkdtempSync(join(tmpdir(),'manu-test-'));
    try {
      const filename=join(folder,'demo.mgbackup');
      const restored=join(folder,'restored.sqlite');
      const key='b7'.repeat(32);
      await makeBackup(db,filename,key);
      assert.equal(readFileSync(filename).subarray(0,8).toString(),'MANUDB1\n');
      const tampered=join(folder,'tampered.mgbackup');
      const bytes=readFileSync(filename);bytes[bytes.length-1]^=1;writeFileSync(tampered,bytes);
      await assert.rejects(restoreBackup(tampered,restored,key));
      await restoreBackup(filename,restored,key);
      const candidate=openDatabase(restored);
      try {
        assert.equal(candidate.prepare("SELECT status FROM orders WHERE id=?").get(order.id).status,'refunded');
        assert.deepEqual(candidate.prepare('PRAGMA foreign_key_check').all(),[]);
        assert.equal(candidate.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
      } finally{candidate.close();}
    } finally{rmSync(folder,{recursive:true,force:true});}
  });
});
