const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

let cachedTables = null;

const YEARS = ['2026', '2025', '2024_03', '2024_02', '2024', '2023'];

function loadTables() {
  if (cachedTables) return cachedTables;

  cachedTables = {};

  for (const year of YEARS) {
    const filePath = path.join(__dirname, '..', 'data', `taxas_continente_${year}.csv`);
    const csv = fs.readFileSync(filePath, 'utf-8');
    const results = Papa.parse(csv, { header: true, delimiter: ';' });
    cachedTables[year] = results.data;
  }

  return cachedTables;
}

module.exports = { loadTables };
