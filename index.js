const { loadTables } = require('./src/tables');
const { calculate } = require('./src/calculate');

function calculateSalary({ situation = 'NotMarried', numDependents = 0, year = '2026', salary }) {

  const csvJsons = loadTables();
  const csvJson = csvJsons[year];

  if (!csvJson) {
    throw new Error(`Unknown year: ${year}. Available: ${Object.keys(csvJsons).join(', ')}`);
  }

  const result = calculate(salary, situation, numDependents, year, csvJson);

  if (result === null) {
    throw new Error(`Could not calculate salary for the given parameters`);
  }

  return result;
}

module.exports = { calculateSalary };
