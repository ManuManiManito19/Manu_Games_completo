const { execFileSync } = require('node:child_process');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const catalog = require('../Back_End/db/catalog.cjs');

const [operation, project] = process.argv.slice(2);
if (!['rules', 'catalog'].includes(operation) || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project ?? '')) {
  throw new Error('Usa node deploy/prepare-firestore.cjs rules|catalog ID_PROYECTO en Cloud Shell.');
}

const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
async function authenticated(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message ?? 'Error de Firebase ' + response.status);
  return data;
}

async function prepareRules() {
  const url = 'https://firebaserules.googleapis.com/v1/';
  const release = await authenticated(url + 'projects/' + project + '/releases/cloud.firestore');
  const ruleset = await authenticated(url + release.rulesetName);
  if (ruleset.source.files.length !== 1) throw new Error('Revisa manualmente las reglas compuestas de este proyecto.');
  const existing = ruleset.source.files[0].content;
  const ownRules = readFileSync(join(__dirname, 'firestore-store.rules'), 'utf8').trimEnd();
  const markers = /[ \t]*\/\/ BEGIN MANU GAMES[\s\S]*?\/\/ END MANU GAMES/;
  const root = /match\s+\/databases\/\{\w+\}\/documents\s*\{/;
  if (!root.test(existing)) throw new Error('No se encontró el ámbito de documentos en las reglas actuales.');
  const updated = markers.test(existing)
    ? existing.replace(markers, ownRules)
    : existing.replace(root, match => match + '\n' + ownRules + '\n');
  writeFileSync('firestore.merged.rules', updated, { flag: 'wx' });
  writeFileSync('firebase.firestore.local.json', JSON.stringify({
    firestore: { rules: 'firestore.merged.rules' },
  }), { flag: 'wx' });
  console.log('Se prepararon las reglas de Firestore para revisión.');
}

async function seedCatalog() {
  const base = 'projects/' + project + '/databases/(default)/documents';
  const url = 'https://firestore.googleapis.com/v1/' + base + ':batchWrite';
  const categories = ['Juegos', 'DLCs', 'Complementos'];
  const writes = catalog.map(([category, name, family, description, platform, price, stock, cover], index) => {
    const id = index + 1;
    const sku = 'MG-' + String(id).padStart(3, '0');
    const image = typeof cover === 'string' ? '/games/' + cover : '/covers/' + (cover ?? id) + '.jpg';
    const product = {
      id, sku, name, family, description, platform, price, stock, image, category,
      category_id: categories.indexOf(category) + 1, active: 1,
    };
    const fields = Object.fromEntries(Object.entries(product).map(([field, value]) =>
      [field, typeof value === 'number' ? { integerValue: String(value) } : { stringValue: value }]));
    return {
      update: { name: base + '/manuGamesCatalog/' + sku, fields },
      currentDocument: { exists: false },
    };
  });
  const result = await authenticated(url, { method: 'POST', body: JSON.stringify({ writes }) });
  if (result.status.length !== writes.length) throw new Error('Firebase devolvió un resultado incompleto.');
  const statuses = result.status.map(status => status.code ?? 0);
  if (statuses.some(code => code !== 0 && code !== 6)) throw new Error('Algunas fichas no se guardaron: ' + statuses.join(', '));
  console.log(statuses.filter(code => code === 0).length + ' fichas creadas; ' +
    statuses.filter(code => code === 6).length + ' fichas existentes conservadas.');
}

(operation === 'rules' ? prepareRules() : seedCatalog()).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
