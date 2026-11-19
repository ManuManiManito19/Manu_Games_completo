const { createApp } = require('./src/http.cjs');

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4200);
const { server, db } = createApp();
server.listen(port,host,()=>console.log(`Manu Games en http://${host}:${port}`));
for(const signal of ['SIGINT','SIGTERM']) process.once(signal,()=>server.close(()=>db.close()));
