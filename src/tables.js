const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

let cachedTables = null;

const YEARS = ['2026', '2025', '2024_03', '2024_02', '2024', '2023'];

function getDataPath() {
  const packageRoot = path.join(__dirname, '..');
  const dataPath = path.join(packageRoot, 'data');
  if (fs.existsSync(path.join(dataPath, 'taxas_continente_2026.csv'))) {
    return dataPath;
  }
  return path.join(__dirname, '..', '..', '..', 'data');
}

function loadTables() {
  if (cachedTables) return cachedTables;

  cachedTables = {};

  const dataPath = getDataPath();

  for (const year of YEARS) {
    const filePath = path.join(dataPath, `taxas_continente_${year}.csv`);
    const csv = fs.readFileSync(filePath, 'utf-8');
    const results = Papa.parse(csv, { header: true, delimiter: ';' });
    cachedTables[year] = results.data;
  }

  return cachedTables;
}

module.exports = { loadTables };
