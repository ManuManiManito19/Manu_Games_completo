const { makeBackup,restoreBackup }=require('./backup.cjs');
const { resolve }=require('node:path');
const { openDatabase,emailOf,passwordOf,passwordHash,transaction,audit }=require('./foundation.cjs');
const { seedCatalog }=require('./commerce.cjs');
const { firebaseStore }=require('./firebase-store.cjs');

function provision(db,email,hash){
  seedCatalog(db);
  transaction(db,()=>{
    const existing=db.prepare('SELECT id,role FROM users WHERE email=?').get(email);
    if(existing&&existing.role!=='admin')throw Error('Usa un correo separado para administración.');
    if(existing){
      db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash,existing.id);
      db.prepare('DELETE FROM sessions WHERE user_id=?').run(existing.id);
    }
    const id=existing?.id||db.prepare("INSERT INTO users(name,email,password_hash,role) VALUES('Operación académica',?,?,'admin')").run(email,hash).lastInsertRowid;
    audit(db,Number(id),'admin_bootstrap','user',id);
  });
}

async function run(){
  const [operation,target]=process.argv.slice(2);
  if(!['bootstrap','catalog','backup','restore'].includes(operation))throw Error('Usa bootstrap, catalog, backup ruta o restore archivo.');
  if(['backup','restore'].includes(operation)&&!target)throw Error('Indica una ruta.');
  const cloud=process.env.FIREBASE_DATABASE_URL;
  if(cloud){
    if(operation==='restore')throw Error('La restauración local requiere quitar FIREBASE_DATABASE_URL y elegir una DB_PATH nueva.');
    const store=firebaseStore(cloud);
    if(operation==='catalog'){
      await store.run(seedCatalog,{write:true,initialize:true});
      console.log('Catálogo inicial listo en Firebase.');
    } else if(operation==='bootstrap'){
      const email=emailOf(process.env.DEMO_ADMIN_EMAIL);
      const hash=await passwordHash(passwordOf(process.env.DEMO_ADMIN_PASSWORD));
      await store.run(db=>provision(db,email,hash),{write:true,initialize:true});
      console.log('Cuenta administrativa y catálogo listos en Firebase.');
    } else {
      await store.run(db=>makeBackup(db,target,process.env.BACKUP_KEY));
      console.log('Copia cifrada de Firebase creada.');
    }
    return;
  }
  const location=resolve(process.env.DB_PATH||resolve(__dirname,'../data/store.sqlite'));
  if(operation==='restore'){
    await restoreBackup(target,location,process.env.BACKUP_KEY);
    console.log('Respaldo restaurado. Valida la operación antes de cambiar DB_PATH.');
    return;
  }
  const db=openDatabase(location);
  try {
    if(operation==='catalog'){seedCatalog(db);return;}
    if(operation==='backup'){
      await makeBackup(db,target,process.env.BACKUP_KEY);
      console.log('Copia de respaldo creada.');
      return;
    }
    const email=emailOf(process.env.DEMO_ADMIN_EMAIL);
    const hash=await passwordHash(passwordOf(process.env.DEMO_ADMIN_PASSWORD));
    provision(db,email,hash);
    console.log('Cuenta administrativa y catálogo de demostración listos.');
  } finally{db.close();}
}
run().catch(err=>{console.error(err.message);process.exitCode=1;});
