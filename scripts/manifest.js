#!/usr/bin/env node
// Fills in (default) or validates (--check) the sha256 and version fields of data/manifest.json.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const MANIFEST_PATH = path.join(DATA_DIR, 'manifest.json');
const TABLE_FILE_PATTERN = /^taxas_.*\.csv$/;
const CAT_H_PATTERN = /_catH\.csv$/;

function sha256Of(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(DATA_DIR, file))).digest('hex');
}

function findErrors(manifest, packageVersion) {
  const errors = [];
  const listedFiles = new Set();
  const seenKeys = new Set();

  if (manifest.version !== packageVersion) {
    errors.push(`manifest version ${manifest.version} does not match package.json version ${packageVersion}`);
  }

  for (const table of manifest.tables) {
    listedFiles.add(table.file);

    const key = `${table.location}_${table.year}`;
    if (seenKeys.has(key)) {
      errors.push(`duplicate location + year: ${table.location} ${table.year}`);
    }
    seenKeys.add(key);

    if (CAT_H_PATTERN.test(table.file)) {
      errors.push(`catH table must not be listed: ${table.file}`);
    }
    if (!fs.existsSync(path.join(DATA_DIR, table.file))) {
      errors.push(`listed file not found in data/: ${table.file}`);
    } else if (table.sha256 !== sha256Of(table.file)) {
      errors.push(`sha256 mismatch: ${table.file} (run npm run manifest)`);
    }
  }

  for (const file of fs.readdirSync(DATA_DIR)) {
    if (TABLE_FILE_PATTERN.test(file) && !CAT_H_PATTERN.test(file) && !listedFiles.has(file)) {
      errors.push(`file missing from manifest: ${file}`);
    }
  }

  return errors;
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  const packageVersion = require(path.join(ROOT, 'package.json')).version;

  if (process.argv.includes('--check')) {
    const errors = findErrors(manifest, packageVersion);
    if (errors.length > 0) {
      console.error(`data/manifest.json is invalid:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
      process.exit(1);
    }
    console.log('data/manifest.json is valid');
    return;
  }

  manifest.version = packageVersion;
  for (const table of manifest.tables) {
    table.sha256 = sha256Of(table.file);
  }
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`data/manifest.json updated (version ${packageVersion}, ${manifest.tables.length} tables)`);
}

main();
