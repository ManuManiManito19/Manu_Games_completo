const { DatabaseSync } = require('node:sqlite');
const { createHash, randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const { mkdirSync, readFileSync } = require('node:fs');
const { dirname, resolve, join } = require('node:path');
const derive = promisify(scrypt);
const termsVersion = '2026-11-19';
const migrations = [[1, '001-initial.sql'], [2, '002-terminal.sql'], [4, '004-profile-photo.sql'], [7, '007-comments.sql']];
const avatarIds = ['memo', 'cyber', 'gamer', 'neon', 'hacker'];

class Problem extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const requireValue = (condition, message, status = 400) => {
  if (!condition) throw new Problem(status, message);
};
function field(value, name, min = 1, max = 100) {
  requireValue(typeof value === 'string', `Campo requerido: ${name}.`);
  const result = value.trim();
  requireValue(result.length >= min && result.length <= max && !/[\x00-\x1f\x7f]/.test(result), `Longitud o formato inválido: ${name}.`);
  return result;
}
function integer(value, name, min, max) {
  requireValue(Number.isSafeInteger(value) && value >= min && value <= max, `Valor inválido: ${name}.`);
  return value;
}
function emailOf(value) {
  const email = field(value, 'correo', 3, 180).toLowerCase();
  requireValue(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Correo inválido.');
  return email;
}
const token = () => randomBytes(24).toString('hex');
const digest = value => createHash('sha256').update(value).digest('hex');
const scryptOptions = { N: 131072, r: 8, p: 1, maxmem: 160 * 1024 * 1024 };
async function passwordHash(password, salt = randomBytes(16).toString('hex')) {
  const hash = await derive(password, salt, 64, scryptOptions);
  return `${salt}:${hash.toString('hex')}`;
}
async function verifyPassword(password, stored) {
  const reference = stored ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`;
  const actual = await passwordHash(password, reference.split(':')[0]);
  return timingSafeEqual(Buffer.from(actual), Buffer.from(reference)) && !!stored;
}
function passwordOf(value) {
  requireValue(typeof value === 'string' && value.length >= 12 && value.length <= 128, 'La contraseña debe tener entre 12 y 128 caracteres.');
  return value;
}
function searchKey(value) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}
function avatarId(value = 'memo') {
  if (avatarIds.includes(value)) return value;
  const encoded = typeof value === 'string' && value.length <= 16000 &&
    /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(value)?.[1];
  const image = encoded && Buffer.from(encoded, 'base64');
  requireValue(image && image.length > 4 && image.toString('base64') === encoded &&
    image[0] === 0xff && image[1] === 0xd8 && image.at(-2) === 0xff && image.at(-1) === 0xd9,
  'Selecciona un avatar o una imagen válida.');
  return value;
}
function openDatabase(location = process.env.DB_PATH || join(__dirname, '../data/store.sqlite')) {
  if (location !== ':memory:') mkdirSync(dirname(resolve(location)), { recursive: true });
  const db = new DatabaseSync(location);
  db.function('search_key', { deterministic: true }, searchKey);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP) STRICT');
  transaction(db, () => {
    const applied = db.prepare('SELECT 1 FROM schema_migrations WHERE version=?');
    const record = db.prepare('INSERT INTO schema_migrations(version) VALUES(?)');
    for (const [version, file] of migrations) {
      if (applied.get(version)) continue;
      db.exec(readFileSync(join(__dirname, '../db', file), 'utf8'));
      record.run(version);
    }
  });
  return db;
}
function transaction(db, work) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
function audit(db, actor, action, entity, id, detail = null) {
  db.prepare('INSERT INTO audit_logs(actor_id,action,entity,entity_id,detail) VALUES(?,?,?,?,?)').run(actor, action, entity, String(id), detail);
}
module.exports = { openDatabase, transaction, audit, Problem, requireValue, field, integer, emailOf, passwordHash, verifyPassword, passwordOf, avatarId, searchKey, token, digest, termsVersion };
