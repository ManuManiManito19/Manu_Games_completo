const { execFileSync } = require('node:child_process');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const catalog = require('../Back_End/db/catalog.cjs');

function addStoreRules(existing, ownRules) {
  const root = /match\s+\/databases\/\{\w+\}\/documents\s*\{/;
  const markers = /[ \t]*\/\/ BEGIN MANU GAMES[\s\S]*?\/\/ END MANU GAMES/;
  const openCatchAll = /match\s+\/\{\w+=\*\*\}\s*\{\s*allow\s+read\s*,\s*write\s*:\s*if\s+true\s*;\s*\}/;
  if (!root.test(existing)) throw new Error('No se encontró el ámbito de documentos en las reglas actuales.');
  // Firestore grants access if any matching rule allows it. Exclude the new
  // collections from the legacy wildcard before adding owner-only rules.
  const scoped = existing.replace(openCatchAll, [
    'match /{legacyCollection}/{legacyDocument=**} {',
    "      allow read, write: if !(legacyCollection in ['manuGamesCatalog', 'manuGamesProfiles']);",
    '    }',
  ].join('\n'));
  return markers.test(scoped)
    ? scoped.replace(markers, ownRules)
    : scoped.replace(root, match => match + '\n' + ownRules + '\n');
}

function assertProject(project) {
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project ?? '')) {
    throw new Error('Indica el ID del proyecto de Firebase.');
  }
}

async function prepareRules(project, request) {
  assertProject(project);
  const url = 'https://firebaserules.googleapis.com/v1/';
  const release = await request(url + 'projects/' + project + '/releases/cloud.firestore');
  const ruleset = await request(url + release.rulesetName);
  if (ruleset.source.files.length !== 1) throw new Error('Revisa manualmente las reglas compuestas de este proyecto.');
  const existing = ruleset.source.files[0].content;
  const ownRules = readFileSync(join(__dirname, 'firestore-store.rules'), 'utf8').trimEnd();
  const content = addStoreRules(existing, ownRules);
  await checkRules(project, content, request);
  writeFileSync('firestore.merged.rules', content, { flag: 'wx' });
  writeFileSync('firebase.firestore.local.json', JSON.stringify({
    firestore: { rules: 'firestore.merged.rules' },
  }), { flag: 'wx' });
  console.log('Se prepararon las reglas de Firestore para revisión.');
}

async function checkRules(project, content, request) {
  const base = '/databases/(default)/documents/';
  const owner = { uid: 'rules-check-owner' };
  const visitor = { uid: 'rules-check-visitor' };
  const profile = 'manuGamesProfiles/' + owner.uid;
  const catalogPath = 'manuGamesCatalog/MG-001';
  const testCases = [
    ['ALLOW', 'get', catalogPath],
    ['DENY', 'update', catalogPath, visitor],
    ['DENY', 'get', profile],
    ['DENY', 'get', profile, visitor],
    ['ALLOW', 'get', profile, owner],
    ['DENY', 'list', 'manuGamesProfiles', owner],
  ].map(([expectation, method, path, auth]) => ({
    expectation, request: { method, path: base + path, auth },
  }));
  const result = await request('https://firebaserules.googleapis.com/v1/projects/' + project + ':test', {
    method: 'POST',
    body: JSON.stringify({
      source: { files: [{ name: 'firestore.rules', content }] },
      testSuite: { testCases },
    }),
  });
  if (result.testResults?.length !== testCases.length || result.testResults.some(test => test.state !== 'SUCCESS')) {
    const failures = (result.issues ?? []).map(issue => issue.description).join(' ');
    throw new Error('Las reglas no superaron la verificación de acceso. ' + failures);
  }
}

async function seedCatalog(project, request) {
  assertProject(project);
  const base = 'projects/' + project + '/databases/(default)/documents';
  const url = 'https://firestore.googleapis.com/v1/' + base + ':batchWrite';
  const categories = ['Juegos', 'DLCs', 'Complementos'];
  const writes = catalog.slice(catalog.retiredCount).map(([category, name, family, description, platform, price, stock, cover], index) => {
    const id = index + catalog.retiredCount + 1;
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
  const result = await request(url, { method: 'POST', body: JSON.stringify({ writes }) });
  if (result.status.length !== writes.length) throw new Error('Firebase devolvió un resultado incompleto.');
  const statuses = result.status.map(status => status.code ?? 0);
  if (statuses.some(code => code !== 0 && code !== 6)) throw new Error('Algunas fichas no se guardaron: ' + statuses.join(', '));
  console.log(statuses.filter(code => code === 0).length + ' fichas creadas; ' +
    statuses.filter(code => code === 6).length + ' fichas existentes conservadas.');
  const retirement = Array.from({ length: catalog.retiredCount }, (_, index) => ({
    update: {
      name: base + '/manuGamesCatalog/MG-' + String(index + 1).padStart(3, '0'),
      fields: { active: { integerValue: '0' } },
    },
    updateMask: { fieldPaths: ['active'] },
    currentDocument: { exists: true },
  }));
  const hivebusters = catalog[35];
  retirement.push({
    update: {
      name: base + '/manuGamesCatalog/MG-036',
      fields: {
        description: { stringValue: hivebusters[3] },
        platform: { stringValue: hivebusters[4] },
        image: { stringValue: '/games/' + hivebusters[7] },
      },
    },
    updateMask: { fieldPaths: ['description', 'platform', 'image'] },
    currentDocument: { exists: true },
  });
  for (const number of catalog.complementRevisions) {
    const [, name, family, description, , , , cover] = catalog[number - 1];
    const sku = 'MG-' + String(number).padStart(3, '0');
    retirement.push({
      update: {
        name: base + '/manuGamesCatalog/' + sku,
        fields: {
          name: { stringValue: name },
          family: { stringValue: family },
          description: { stringValue: description },
          image: { stringValue: '/games/' + cover },
        },
      },
      updateMask: { fieldPaths: ['name', 'family', 'description', 'image'] },
      currentDocument: { exists: true },
    });
  }
  const revised = await request(url, { method: 'POST', body: JSON.stringify({ writes: retirement }) });
  if (revised.status.length !== retirement.length ||
      revised.status.slice(0, catalog.retiredCount).some(status => ![0, 5].includes(status.code ?? 0)) ||
      revised.status.slice(catalog.retiredCount).some(status => (status.code ?? 0) !== 0)) {
    throw new Error('No se pudo actualizar el catálogo visible y las portadas.');
  }
  console.log('Catálogo visible actualizado. Los SKU retirados conservan sus referencias.');
}

async function main() {
  const [operation, project] = process.argv.slice(2);
  if (!['rules', 'catalog'].includes(operation)) {
    throw new Error('Usa node deploy/prepare-firestore.cjs rules|catalog ID_PROYECTO en Cloud Shell.');
  }
  const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
  const request = async (url, options) => {
    const response = await fetch(url, {
      ...options,
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message ?? 'Error de Firebase ' + response.status);
    return data;
  };
  await (operation === 'rules' ? prepareRules : seedCatalog)(project, request);
}

if (require.main === module) main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
module.exports = { prepareRules, seedCatalog };
