const { createServer } = require('node:http');
const { readFile, stat } = require('node:fs/promises');
const { extname, resolve, sep } = require('node:path');
const { openDatabase, Problem, requireValue, emailOf, passwordOf, passwordHash, verifyPassword,
  token, digest, transaction, audit, field, integer, termsVersion } = require('./foundation.cjs');
const shop = require('./commerce.cjs');
const support = require('./support.cjs');
const admin = require('./admin.cjs');
const sessionAge = 8 * 3600 * 1000;
const maxBody = 24 * 1024;
const mimes = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2','.json':'application/json' };

async function readJson(req){
  requireValue(req.headers['content-type']?.split(';')[0]?.trim().toLowerCase()==='application/json','Envía datos JSON.',415);
  let length=0;
  const parts=[];
  for await(const part of req){
    length+=part.length;
    if(length>maxBody) break;
    parts.push(part);
  }
  requireValue(length<=maxBody,'La solicitud excede el límite.',413);
  try {
    const body=JSON.parse(Buffer.concat(parts).toString('utf8'));
    if(!body||typeof body!=='object'||Array.isArray(body))throw Error('object required');
    return body;
  } catch { throw new Problem(400,'JSON inválido.'); }
}

function createApp(options={}){
  const db=options.db ?? openDatabase();
  if (options.seed!==false) shop.seedCatalog(db);
  const root=resolve(options.publicDir||resolve(__dirname,'../../dist/Front_end/browser'));
  const publicOrigin=options.origin||process.env.PUBLIC_ORIGIN;
  const secure=publicOrigin?.startsWith('https://') ?? false;
  const production=options.production ?? process.env.NODE_ENV==='production';
  if(production && !secure) throw Error('Define PUBLIC_ORIGIN con HTTPS en producción.');
  const cookieName=secure?'__Host-manu':'manu_dev';
  const rates = new Map();
  const routes=[];
  const add=(method, pattern, access, handler)=>routes.push({method,pattern:new RegExp('^'+pattern+'$'),access,handler});
  const account='SELECT id,name,email,role,active,created_at FROM users';
  const getUser=id=>db.prepare(account+' WHERE id=? AND active=1').get(id||0)||null;
  function setCookie(res,value,seconds){
    res.setHeader('Set-Cookie',`${cookieName}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${secure?'; Secure':''}`);
  }
  function current(req){
    const raw=req.headers.cookie?.split(/;\s*/).find(c=>c.startsWith(cookieName+'='))?.split('=')[1];
    if(!raw||!/^[a-f0-9]{48}$/.test(raw))return null;
    const session=db.prepare('SELECT * FROM sessions WHERE id=? AND expires_at>?').get(digest(raw),Date.now());
    if(!session||(session.user_id&&!getUser(session.user_id)))return null;
    return {...session,user:getUser(session.user_id)};
  }
  function newSession(res,userId,previous){
    const raw=token();
    const id=digest(raw);
    const csrf=token();
    transaction(db,()=>{
      db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(id,userId||null,csrf,Date.now()+sessionAge);
      if(previous){
        db.prepare('UPDATE carts SET session_id=? WHERE session_id=?').run(id,previous.id);
        db.prepare('DELETE FROM sessions WHERE id=?').run(previous.id);
      }
      db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(Date.now());
    });
    setCookie(res,raw,sessionAge/1000);
    return {id,csrf,user:getUser(userId)};
  }
  function sessionPayload(session){
    return {user:session.user,csrf:session.csrf,termsVersion};
  }
  function throttle(req,key,limit){
    const now=Date.now();
    if(rates.size>2000){
      for(const [name,value] of rates) if(value.reset<=now) rates.delete(name);
    }
    const id=(req.socket.remoteAddress||'unknown')+':'+key;
    requireValue(rates.has(id)||rates.size<10000,'Intenta más tarde.',429);
    const bucket=rates.get(id);
    if(!bucket||bucket.reset<=now){rates.set(id,{count:1,reset:now+60000});return;}
    bucket.count++;
    requireValue(bucket.count<=limit,'Intenta más tarde.',429);
  }
  function validateOrigin(req){
    const origin=req.headers.origin;
    if(!origin)return;
    const expected=publicOrigin||'http://'+req.headers.host;
    requireValue(origin===expected,'Origen no autorizado.',403);
  }
  const cleanUser=user=>user&&({id:user.id,name:user.name,email:user.email,role:user.role});
  add('GET','/health','public',()=>({ok:true,db:db.prepare('SELECT 1 ready').get().ready===1,version:'1.0.0'}));
  add('GET','/auth/session','public',c=>sessionPayload(c.session||newSession(c.res)));
  add('POST','/auth/register','guest',async c=>{
    throttle(c.req,'auth',10);
    requireValue(c.body.accepted===true,'Acepta términos y consulta el aviso de privacidad.');
    const name=field(c.body.name,'nombre',2,90);
    const email=emailOf(c.body.email);
    const hash=await passwordHash(passwordOf(c.body.password));
    const id=transaction(db,()=>{
      requireValue(!db.prepare('SELECT id FROM users WHERE email=?').get(email),'Ya existe una cuenta con ese correo.',409);
      const id=Number(db.prepare('INSERT INTO users(name,email,password_hash) VALUES(?,?,?)').run(name,email,hash).lastInsertRowid);
      audit(db,id,'registered','user',id);
      return id;
    });
    c.status=201;
    return sessionPayload(newSession(c.res,id,c.session));
  });
  add('POST','/auth/login','guest',async c=>{
    throttle(c.req,'auth',10);
    const email=emailOf(c.body.email);
    const secret=c.body.password;
    requireValue(typeof secret==='string' && secret.length>=1 && secret.length<=128,'Credenciales inválidas.',401);
    const user=db.prepare('SELECT id,password_hash FROM users WHERE email=? AND active=1').get(email);
    const valid=await verifyPassword(secret,user?.password_hash);
    if(!valid){
      audit(db,null,'login_denied','security','login');
      throw new Problem(401,'Credenciales inválidas.');
    }
    audit(db,user.id,'login','user',user.id);
    return sessionPayload(newSession(c.res,user.id,c.session));
  });
  add('POST','/auth/logout','client',c=>{
    db.prepare('DELETE FROM sessions WHERE id=?').run(c.session.id);
    audit(db,c.user.id,'logout','user',c.user.id);
    setCookie(c.res,'',0);
    return {ok:true};
  });
  add('POST','/auth/recovery','guest',c=>{
    throttle(c.req,'recovery',5);
    emailOf(c.body.email);
    audit(db,null,'recovery_simulated','security','recovery');
    c.status=202;
    return {message:'Si la cuenta existe, se registraría una solicitud. Demostración sin correo externo.'};
  });
  add('GET','/profile','client',c=>cleanUser(c.user));
  add('PATCH','/profile','client',c=>{
    db.prepare('UPDATE users SET name=? WHERE id=?').run(field(c.body.name,'nombre',2,90),c.user.id);
    return cleanUser(getUser(c.user.id));
  });
  add('GET','/addresses','client',c=>db.prepare('SELECT id,recipient,street,city,region,postal_code FROM addresses WHERE user_id=? ORDER BY id').all(c.user.id));
  add('POST','/addresses','client',c=>{
    const cp=field(c.body.postal_code,'código postal',5,5);
    requireValue(/^\d{5}$/.test(cp),'Código postal mexicano de cinco dígitos.');
    const id=db.prepare('INSERT INTO addresses(user_id,recipient,street,city,region,postal_code) VALUES(?,?,?,?,?,?)').run(
      c.user.id,field(c.body.recipient,'destinatario',2,90),field(c.body.street,'calle y número',4,140),
      field(c.body.city,'municipio',2,70),field(c.body.region,'estado',2,70),cp).lastInsertRowid;
    c.status=201;
    return {id:Number(id)};
  });
  add('DELETE','/addresses/(\\d+)','client',c=>{
    requireValue(db.prepare('DELETE FROM addresses WHERE user_id=? AND id=?').run(c.user.id,c.id).changes,'Dirección no encontrada.',404);
    return {ok:true};
  });
  add('GET','/categories','public',()=>db.prepare('SELECT id,name FROM categories WHERE active=1 ORDER BY name').all());
  add('GET','/products','public',c=>shop.catalogPage(db,c.url.searchParams));
  add('GET','/products/(\\d+)','public',c=>{
    const row=db.prepare(shop.listProducts+' WHERE p.id=? AND p.active=1 AND c.active=1').get(c.id);
    requireValue(row,'Producto no encontrado.',404);
    const variants=db.prepare(`${shop.listProducts} WHERE p.family=? AND p.id<>? AND p.active=1 AND c.active=1`).all(row.family,c.id);
    return {...row,variants};
  });
  add('GET','/cart','public',c=>shop.cart(db,c.session?.id));
  add('POST','/cart','guest',c=>{
    const product=integer(c.body.productId,'producto',1,1e9);
    const currentQuantity=db.prepare('SELECT quantity FROM carts WHERE session_id=? AND product_id=?').get(c.session.id,product)?.quantity||0;
    return shop.setCart(db,c.session.id,product,currentQuantity+integer(c.body.quantity,'cantidad',1,99));
  });
  add('PATCH','/cart/(\\d+)','guest',c=>shop.setCart(db,c.session.id,c.id,integer(c.body.quantity,'cantidad',1,99)));
  add('DELETE','/cart/(\\d+)','guest',c=>shop.setCart(db,c.session.id,c.id,0));
  add('POST','/quote','guest',c=>shop.quote(db,c.session.id,c.body));
  add('POST','/orders','client',c=>{c.status=201;return shop.createOrder(db,c.session,c.body);});
  add('GET','/orders','client',c=>db.prepare(`SELECT id,folio,status,total,created_at FROM orders WHERE user_id=? ORDER BY id DESC LIMIT 250`).all(c.user.id));
  add('GET','/orders/(\\d+)','client',c=>shop.orderDetail(db,c.id,c.user));
  add('POST','/payments/(\\d+)/confirm','client',c=>shop.confirmPayment(db,c.session,c.id,c.body));
  add('GET','/payments/(\\d+)','client',c=>{
    const order=shop.orderDetail(db,c.id,c.user);
    return {status:order.payment_status,reference:order.reference,amount:order.total,provider:'simulator'};
  });
  add('GET','/returns','client',c=>support.caseList(db,{...c.user,role:'client'}));
  add('POST','/returns','client',c=>{c.status=201;return support.createCase(db,c.user,c.body);});
  add('POST','/returns/(\\d+)/messages','client',c=>support.addCaseMessage(db,c.user,c.id,c.body));
  add('GET','/admin/products','admin',()=>db.prepare(shop.listProducts+' ORDER BY p.id DESC LIMIT 250').all());
  add('POST','/admin/products','admin',c=>{c.status=201;return admin.saveProduct(db,c.user,null,c.body);});
  add('PATCH','/admin/products/(\\d+)','admin',c=>admin.saveProduct(db,c.user,c.id,c.body));
  add('DELETE','/admin/products/(\\d+)','admin',c=>admin.disable(db,c.user,'product',c.id));
  add('GET','/admin/categories','admin',()=>db.prepare('SELECT * FROM categories ORDER BY name').all());
  add('POST','/admin/categories','admin',c=>{c.status=201;return admin.saveCategory(db,c.user,null,c.body);});
  add('PATCH','/admin/categories/(\\d+)','admin',c=>admin.saveCategory(db,c.user,c.id,c.body));
  add('DELETE','/admin/categories/(\\d+)','admin',c=>admin.disable(db,c.user,'category',c.id));
  add('GET','/admin/orders','admin',()=>db.prepare('SELECT id,folio,status,total,created_at FROM orders ORDER BY id DESC LIMIT 250').all());
  add('PATCH','/admin/orders/(\\d+)','admin',c=>shop.transitionOrder(db,c.user,c.id,c.body));
  add('GET','/admin/inventory','admin',()=>db.prepare('SELECT * FROM inventory_movements ORDER BY id DESC LIMIT 250').all());
  add('POST','/admin/inventory/(\\d+)','admin',c=>admin.inventory(db,c.user,c.id,c.body));
  add('GET','/admin/coupons','admin',()=>db.prepare('SELECT * FROM coupons ORDER BY code').all());
  add('POST','/admin/coupons','admin',c=>admin.saveCoupon(db,c.user,c.body));
  add('GET','/admin/returns','admin',c=>support.caseList(db,c.user));
  add('PATCH','/admin/returns/(\\d+)','admin',c=>support.resolveCase(db,c.user,c.id,c.body));
  add('GET','/admin/customers','admin',()=>db.prepare(account+" WHERE role='client' ORDER BY id DESC LIMIT 250").all());
  add('GET','/admin/reports','admin',()=>admin.reports(db));
  add('GET','/admin/audit','admin',()=>db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 250').all());
  add('GET','/info','public',()=>({termsVersion,provider:'Manu Games · operador académico ficticio',payment:'simulated'}));

  async function staticFile(url,res){
    const pathname=decodeURIComponent(url.pathname);
    const normalized=resolve(root,'.'+pathname);
    requireValue(normalized===root||normalized.startsWith(root+sep),'Ruta inválida.',400);
    let candidate=normalized;
    if(pathname==='/'||!extname(pathname))candidate=resolve(root,'index.html');
    const exists=await stat(candidate).then(s=>s.isFile(),()=>false);
    requireValue(exists, pathname==='/'?'Compila Angular con npm run build antes de iniciar.':'Archivo no encontrado.',404);
    res.setHeader('Content-Type',mimes[extname(candidate)]||'application/octet-stream');
    res.end(await readFile(candidate));
  }
  const server=createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Referrer-Policy','same-origin');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
    if(secure)res.setHeader('Strict-Transport-Security','max-age=31536000');
    const send=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));};
    try {
      const url=new URL(req.url,'http://localhost');
      if(!url.pathname.startsWith('/api/')){
        requireValue(req.method==='GET','Método no permitido.',405);
        return await staticFile(url,res);
      }
      res.setHeader('Cache-Control','no-store');
      throttle(req,'api',600);
      const path=url.pathname.slice(4);
      const route=routes.find(entry=>entry.method===req.method&&entry.pattern.test(path));
      requireValue(route,'Ruta no encontrada.',404);
      const session=current(req);
      const user=session?.user;
      if(route.access!=='public'){
        requireValue(session,'Obtén o renueva la sesión.',401);
        if(route.access!=='guest') requireValue(user,'Inicia sesión.',401);
        if(route.access==='admin') {
          if(user.role!=='admin') audit(db,user.id,'access_denied','security','admin');
          requireValue(user.role==='admin','Permisos insuficientes.',403);
        }
      }
      const mutation=req.method!=='GET';
      if(mutation){
        validateOrigin(req);
        requireValue(session?.csrf && session.csrf===req.headers['x-csrf-token'],'Solicitud protegida inválida.',403);
      }
      const body=['POST','PATCH'].includes(req.method)?await readJson(req):{};
      const context={req,res,url,session,user,body,id:Number(route.pattern.exec(path)[1]),status:200};
      const value=await route.handler(context);
      send(context.status,value);
    } catch(err){
      if(err instanceof Problem)send(err.status,{error:err.message});
      else {
        console.error('Error de operación',err.code||err.name);
        send(500,{error:'No se pudo completar la operación.'});
      }
    }
  });
  server.requestTimeout=15000;
  server.headersTimeout=12000;
  return {server,db};
}
module.exports={createApp};
