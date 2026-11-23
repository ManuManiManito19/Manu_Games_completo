const assert=require('node:assert/strict');
const {test}=require('node:test');
const {firebaseStore}=require('../src/firebase-store.cjs');
const {seedCatalog,library}=require('../src/commerce.cjs');
const {createApp}=require('../src/http.cjs');

test('Firebase confirma compras y conserva productos, permisos y existencias',async t=>{
  let remote=null, revision=0;
  async function request(_,options){
    const tag='"'+revision+'"';
    if(options.method==='GET'){
      assert.equal(options.headers['X-Firebase-ETag'],'true');
      return Response.json(remote,{headers:{ETag:tag}});
    }
    if(options.headers['If-Match']!==tag)return new Response('',{status:412});
    revision++;
    remote=JSON.parse(options.body);
    return Response.json(remote);
  }
  const store=firebaseStore('https://fixture.firebaseio.com',{token:async()=> 'fixture',request});
  await store.run(seedCatalog,{write:true,initialize:true});
  const {server}=createApp({persistence:store});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url='http://127.0.0.1:'+server.address().port+'/api';
  let cookie='',csrf='';
  async function call(method,path,body,status=200){
    const headers={cookie,'X-CSRF-Token':csrf};
    if(body)headers['Content-Type']='application/json';
    const response=await fetch(url+path,{method,headers,body:body&&JSON.stringify(body)});
    const data=await response.json();
    assert.equal(response.status,status,JSON.stringify(data));
    cookie=response.headers.get('set-cookie')?.split(';')[0]??cookie;
    csrf=data.csrf??csrf;
    return data;
  }
  await call('GET','/library',null,401);
  assert.equal((await call('GET','/health')).storage,'firebase');
  await call('GET','/auth/session');
  await call('POST','/cart',{productId:36,quantity:2});
  const auth=await call('POST','/auth/register',{name:'Comprador de prueba',email:'firebase@example.test',password:'Ejemplo-Firebase-2026',avatar:'gamer',accepted:true},201);
  assert.equal(auth.user.avatar,'gamer');
  const address=await call('POST','/addresses',{recipient:'Comprador de prueba',street:'Avenida Simulada 101',city:'Nuevo Laredo',region:'Tamaulipas',postal_code:'88000'},201);
  const quote=await call('POST','/quote',{coupon:'DEMO10'});
  const order=await call('POST','/orders',{requestKey:'prueba-firebase-00001',addressId:address.id,method:'digital',coupon:'DEMO10',quotedTotal:quote.total,termsVersion:auth.termsVersion,accepted:true},201);
  assert.deepEqual(await call('GET','/library'),[]);
  await call('POST','/payments/'+order.id+'/confirm',{outcome:'approve'});
  assert.equal(remote.orders[order.id].status,'paid');
  assert.equal(remote.payments[order.id].status,'approved');
  assert.equal(remote.products[36].stock,13);
  assert.equal((await call('GET','/library'))[0].license,null);
  await store.run(db=>db.prepare("UPDATE payments SET status='refunded' WHERE order_id=?").run(order.id),{write:true});
  const result=await firebaseStore('https://fixture.firebaseio.com',{token:async()=> 'fixture',request}).run(db=>library(db,auth.user.id));
  assert.equal(result[0].sku,'MG-036');

  let finish;
  let started;
  const begun=new Promise(resolve=>{started=resolve;});
  const wait=new Promise(resolve=>{finish=resolve;});
  const stale=store.run(async db=>{
    started();
    await wait;
    db.prepare('UPDATE products SET stock=0 WHERE id=36').run();
  },{write:true});
  await begun;
  await store.run(db=>db.prepare('UPDATE products SET stock=11 WHERE id=36').run(),{write:true});
  finish();
  await assert.rejects(stale,error=>error.status===409);
  assert.equal(remote.products[36].stock,11);
});
