const { loadTables } = require('./src/tables');
const { calculate } = require('./src/calculate');

function calculateSalary({ situation, numDependents, year, salary }) {

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
