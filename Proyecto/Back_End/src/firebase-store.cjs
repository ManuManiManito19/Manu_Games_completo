const { isDeepStrictEqual } = require('node:util');
const { openDatabase, transaction } = require('./foundation.cjs');

const tables = [
  ['schema_migrations',['version']],
  ['users',['id']], ['sessions',['id']], ['addresses',['id']],
  ['categories',['id']], ['products',['id']], ['coupons',['code']],
  ['carts',['session_id','product_id']], ['orders',['id']],
  ['order_items',['order_id','product_id']], ['payments',['order_id']], ['shipments',['order_id']],
  ['inventory_movements',['id']], ['cases',['id']], ['case_messages',['id']], ['audit_logs',['id']],
];

function databaseUrl(value){
  const url=new URL(value);
  const cloud=url.protocol==='https:' && /\.(?:firebaseio\.com|firebasedatabase\.app)$/.test(url.hostname);
  const emulator=url.protocol==='http:' && ['127.0.0.1','localhost'].includes(url.hostname) && url.searchParams.has('ns');
  if((!cloud&&!emulator)||url.username||url.password||url.pathname!=='/'||url.hash||[...url.searchParams.keys()].some(key=>key!=='ns')){
    throw Error('FIREBASE_DATABASE_URL debe apuntar a la raíz de una base de Firebase.');
  }
  url.pathname='/manuGames.json';
  return {url,emulator};
}

function snapshot(db){
  const result={};
  for(const [table, keys] of tables){
    result[table]=Object.fromEntries(db.prepare(`SELECT * FROM ${table}`).all().map(row=>[
      keys.map(key=>String(row[key])).join('~'),
      Object.fromEntries(Object.entries(row).filter(([,value])=>value!==null))
    ]));
  }
  return result;
}

function hydrate(db, data){
  transaction(db,()=>{
    for(const [table] of [...tables].reverse()) db.exec(`DELETE FROM ${table}`);
    for(const [table] of tables){
      const columns=db.prepare(`PRAGMA table_info(${table})`).all().map(column=>column.name);
      const statement=db.prepare(`INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map(()=>'?').join(',')})`);
      for(const row of Object.values(data[table]??{}).filter(Boolean)){
        statement.run(...columns.map(name=>row[name]??null));
      }
    }
  });
}

class CloudStorageError extends Error {
  constructor(message, status=503, options){
    super(message,options);
    this.status=status;
  }
}

function firebaseStore(value, options={}){
  const {url,emulator}=databaseUrl(value);
  let token=options.token;
  if(!token){
    if(emulator){
      token=async()=> 'owner';
    } else {
      const { GoogleAuth }=require('google-auth-library');
      const auth=new GoogleAuth({scopes:[
        'https://www.googleapis.com/auth/firebase.database',
        'https://www.googleapis.com/auth/userinfo.email',
      ]});
      token=()=>auth.getAccessToken();
    }
  }
  const request=options.request??fetch;
  async function access(init){
    try {
      const accessToken=await token();
      if(!accessToken)throw Error('Sin credenciales para Realtime Database');
      return await request(url,{
        ...init,signal:AbortSignal.timeout(9000),
        headers:{...init.headers,Authorization:'Bearer '+accessToken}
      });
    } catch(cause){
      throw new CloudStorageError('Firebase no respondió. Intenta de nuevo.',503,{cause});
    }
  }

  async function run(action, {write=false, initialize=false}={}){
    const response=await access({method:'GET',headers:{'X-Firebase-ETag':'true'}});
    if(!response.ok)throw new CloudStorageError('Firebase rechazó el acceso a los datos.');
    const etag=response.headers.get('etag');
    const state=await response.json();
    if(state===null&&!initialize)throw new CloudStorageError('Inicializa el catálogo con npm run db:bootstrap.');
    if(state!==null&&(!state.schema_migrations?.['3']||typeof state!=='object')){
      throw new CloudStorageError('La estructura de la base de Firebase no es compatible.');
    }
    const db=openDatabase(':memory:');
    try {
      if(state!==null)hydrate(db,state);
      const current=write&&state!==null?snapshot(db):null;
      const result=await action(db);
      if(write){
        const updated=snapshot(db);
        if(state===null||!isDeepStrictEqual(current,updated)){
          if(!etag)throw new CloudStorageError('Firebase no devolvió una versión válida de los datos.');
          const saved=await access({method:'PUT',headers:{'Content-Type':'application/json','If-Match':etag},body:JSON.stringify(updated)});
          if(saved.status===412)throw new CloudStorageError('La tienda recibió otro cambio. Reintenta la operación.',409);
          if(!saved.ok)throw new CloudStorageError('Firebase no pudo guardar la operación.');
          await saved.body?.cancel();
        }
      }
      return result;
    } finally {
      db.close();
    }
  }

  return {run};
}

module.exports={firebaseStore,CloudStorageError};
