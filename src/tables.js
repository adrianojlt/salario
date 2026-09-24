const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

let cachedTables = null;

function getDataPath() {

  const packageRoot = path.join(__dirname, '..');
  const dataPath = path.join(packageRoot, 'data');

  if (fs.existsSync(path.join(dataPath, 'taxas_continente_2026.csv'))) {
    return dataPath;
  }

  return path.join(__dirname, '..', '..', '..', 'data');
}

const manifest = JSON.parse(fs.readFileSync(path.join(getDataPath(), 'manifest.json'), 'utf-8'));
const TABLES = manifest.tables;
const LOCATIONS = [...new Set(TABLES.map((table) => table.location))];
const YEARS = [...new Set(TABLES.map((table) => table.year))];

function loadTables(location, year) {

  if (!cachedTables) {
    cachedTables = {};
  }

  const key = `${location}_${year}`;
  if (cachedTables[key]) {
    return cachedTables[key];
  }

  const table = TABLES.find((entry) => entry.location === location && entry.year === year);
  if (!table) {
    return null;
  }

  const filePath = path.join(getDataPath(), table.file);
  const csv = fs.readFileSync(filePath, 'utf-8');
  const results = Papa.parse(csv, { header: true, delimiter: ';' });

  cachedTables[key] = results.data;

  return cachedTables[key];
}

module.exports = { loadTables, LOCATIONS, YEARS, TABLES };
