const { makeBackup,restoreBackup }=require('./backup.cjs');
const { resolve }=require('node:path');
const { openDatabase,emailOf,passwordOf,passwordHash,transaction,audit }=require('./foundation.cjs');
const { seedCatalog }=require('./commerce.cjs');

async function run(){
  const [operation,target]=process.argv.slice(2);
  if(!['bootstrap','backup','restore'].includes(operation))throw Error('Usa bootstrap, backup ruta o restore archivo.');
  if(operation!=='bootstrap'&&!target)throw Error('Indica una ruta.');
  const location=resolve(process.env.DB_PATH||resolve(__dirname,'../data/store.sqlite'));
  if(operation==='restore'){
    await restoreBackup(target,location,process.env.BACKUP_KEY);
    console.log('Respaldo restaurado. Valida la operación antes de cambiar DB_PATH.');
    return;
  }
  const db=openDatabase(location);
  try {
    if(operation==='backup'){
      await makeBackup(db,target,process.env.BACKUP_KEY);
      console.log('Copia de respaldo creada.');
      return;
    }
    const email=emailOf(process.env.DEMO_ADMIN_EMAIL);
    const hash=await passwordHash(passwordOf(process.env.DEMO_ADMIN_PASSWORD));
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
    console.log('Cuenta administrativa y catálogo de demostración listos.');
  } finally{db.close();}
}
run().catch(err=>{console.error(err.message);process.exitCode=1;});
