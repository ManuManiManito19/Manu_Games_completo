const { backup,DatabaseSync }=require('node:sqlite');
const { createCipheriv,createDecipheriv,randomBytes }=require('node:crypto');
const { mkdtempSync,rmSync,readFileSync,writeFileSync,statSync,mkdirSync,existsSync }=require('node:fs');
const { dirname,join,resolve }=require('node:path');
const { tmpdir }=require('node:os');
const header=Buffer.from('MANUDB1\n');
const maxSize=50*1024*1024;
function key(value){
  if(typeof value!=='string'||!/^[a-fA-F0-9]{64}$/.test(value))throw Error('BACKUP_KEY requiere 64 caracteres hexadecimales.');
  return Buffer.from(value,'hex');
}
function readLimited(path){
  if(statSync(path).size>maxSize)throw Error('Respaldo supera el límite de 50 MiB.');
  return readFileSync(path);
}
async function temporary(work){
  const folder=mkdtempSync(join(tmpdir(),'manu-games-'));
  try{return await work(join(folder,'copy.sqlite'));}finally{rmSync(folder,{recursive:true,force:true});}
}
async function makeBackup(database,target,secret){
  const encryptionKey=key(secret);
  const destination=resolve(target);
  if(existsSync(destination))throw Error('Ya existe el archivo de destino.');
  await temporary(async path=>{
    await backup(database,path);
    const nonce=randomBytes(12);
    const cipher=createCipheriv('aes-256-gcm',encryptionKey,nonce);
    cipher.setAAD(header);
    const bytes=Buffer.concat([cipher.update(readLimited(path)),cipher.final()]);
    mkdirSync(dirname(destination),{recursive:true});
    writeFileSync(destination,Buffer.concat([header,nonce,cipher.getAuthTag(),bytes]),{flag:'wx',mode:0o600});
  });
}
async function restoreBackup(target,destination,secret){
  const encryptionKey=key(secret);
  if(existsSync(destination))throw Error('DB_PATH debe apuntar a una ruta nueva.');
  const bytes=readLimited(resolve(target));
  if(!bytes.subarray(0,header.length).equals(header))throw Error('Formato de respaldo inválido.');
  const nonce=bytes.subarray(header.length,header.length+12);
  const tag=bytes.subarray(header.length+12,header.length+28);
  const payload=bytes.subarray(header.length+28);
  const decipher=createDecipheriv('aes-256-gcm',encryptionKey,nonce);
  decipher.setAAD(header);
  decipher.setAuthTag(tag);
  const decoded=Buffer.concat([decipher.update(payload),decipher.final()]);
  await temporary(async path=>{
    writeFileSync(path,decoded,{mode:0o600});
    const source=new DatabaseSync(path,{readOnly:true});
    try {
      if(source.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||source.prepare('PRAGMA foreign_key_check').all().length)
        throw Error('La copia contiene errores de integridad.');
      mkdirSync(dirname(destination),{recursive:true});
      writeFileSync(destination,decoded,{flag:'wx',mode:0o600});
    } finally{source.close();}
  });
}
module.exports={makeBackup,restoreBackup};
