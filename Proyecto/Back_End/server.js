const { createApp } = require('./src/http.cjs');
const { firebaseStore } = require('./src/firebase-store.cjs');

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4200);
const persistence=process.env.FIREBASE_DATABASE_URL?firebaseStore(process.env.FIREBASE_DATABASE_URL):null;
const { server, db } = createApp({persistence});
server.listen(port,host,()=>console.log(`Manu Games en http://${host}:${port}`));
for(const signal of ['SIGINT','SIGTERM']) process.once(signal,()=>server.close(()=>db?.close()));
