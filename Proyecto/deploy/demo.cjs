const { execFileSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createApp } = require('../Back_End/src/http.cjs');
const { openDatabase } = require('../Back_End/src/foundation.cjs');

const host = '127.0.0.1';
const port = Number(process.env.DEMO_PORT || 4200);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error('DEMO_PORT debe ser un puerto entre 1024 y 65535.');
}

const origin = `http://${host}:${port}`;
const dbPath = join(mkdtempSync(join(tmpdir(), 'manu-games-demo-')), 'store.sqlite');
const email = 'admin@manugames.example';
const password = 'Demo-' + randomBytes(18).toString('base64url');

execFileSync(process.execPath, [join(__dirname, '../Back_End/src/operations.cjs'), 'bootstrap'], {
  env: { ...process.env, DB_PATH: dbPath, FIREBASE_DATABASE_URL: '', DEMO_ADMIN_EMAIL: email, DEMO_ADMIN_PASSWORD: password },
  stdio: 'inherit',
});

// The demo uses its own loopback server and never loads deployment settings.
delete process.env.FIREBASE_HOSTING_PROXY;
const db = openDatabase(dbPath);
const { server } = createApp({ db, origin, production: false });
server.once('error', error => {
  db.close();
  console.error(error.code === 'EADDRINUSE' ? 'El puerto está ocupado. Define otro DEMO_PORT.' : error.message);
  process.exitCode = 1;
});
server.listen(port, host, () => {
  console.log(`\nManu Games  ${origin}\nPanel administrativo  ${origin}/#admin`);
  console.log(`Correo de prueba  ${email}\nContraseña de esta sesión  ${password}`);
  console.log(`Base aislada  ${dbPath}\n`);
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => server.close(() => db.close()));
}
