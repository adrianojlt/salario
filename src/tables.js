const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

let cachedTables = null;

const LOCATIONS = ['continente', 'madeira', 'acores'];
const YEARS = ['2026', '2025', '2024_03', '2024_02', '2024', '2023'];

function getDataPath() {
  const packageRoot = path.join(__dirname, '..');
  const dataPath = path.join(packageRoot, 'data');
  if (fs.existsSync(path.join(dataPath, 'taxas_continente_2026.csv'))) {
    return dataPath;
  }
  return path.join(__dirname, '..', '..', '..', 'data');
}

function loadTables(location, year) {
  if (!cachedTables) {
    cachedTables = {};
  }

  const key = `${location}_${year}`;
  if (cachedTables[key]) {
    return cachedTables[key];
  }

  const dataPath = getDataPath();
  const filePath = path.join(dataPath, `taxas_${location}_${year}.csv`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const csv = fs.readFileSync(filePath, 'utf-8');
  const results = Papa.parse(csv, { header: true, delimiter: ';' });
  cachedTables[key] = results.data;

  return cachedTables[key];
}

module.exports = { loadTables, LOCATIONS, YEARS };
