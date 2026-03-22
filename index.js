const { loadTables, LOCATIONS } = require('./src/tables');
const { calculate } = require('./src/calculate');

function calculateSalary({ situation = 'NotMarried', numDependents = 0, year = '2026', salary, location = 'continente' }) {

  if (!LOCATIONS.includes(location)) {
    throw new Error(`Unknown location: ${location}. Available: ${LOCATIONS.join(', ')}`);
  }

  const csvJson = loadTables(location, year);

  if (!csvJson) {
    throw new Error(`No data for ${location} in year ${year}`);
  }

  const result = calculate(salary, situation, numDependents, year, csvJson, location);

  if (result === null) {
    throw new Error(`Could not calculate salary for the given parameters`);
  }

  return result;
}

module.exports = { calculateSalary };
