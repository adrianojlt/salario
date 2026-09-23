const { loadTables, LOCATIONS, YEARS, TABLES } = require('./src/tables');
const { calculate } = require('./src/calculate');

function calculateSalary({ situation = 'NotMarried', numDependents = 0, year = '2026', salary, location = 'continente', mealAllowance, irsJovem, subsidies }) {

  if (!LOCATIONS.includes(location)) {
    throw new Error(`Unknown location: ${location}. Available: ${LOCATIONS.join(', ')}`);
  }

  const csvJson = loadTables(location, year);

  if (!csvJson) {
    throw new Error(`No data for ${location} in year ${year}`);
  }

  // Validate mealAllowance
  if (mealAllowance) {
    if (!['card', 'cash'].includes(mealAllowance.type)) {
      throw new Error(`Invalid meal allowance type: ${mealAllowance.type}. Must be 'card' or 'cash'`);
    }
    if (typeof mealAllowance.dailyAmount !== 'number' || mealAllowance.dailyAmount < 0) {
      throw new Error('Meal allowance dailyAmount must be a positive number');
    }
  }

  // Validate irsJovem
  if (irsJovem) {
    if (typeof irsJovem.benefitYear !== 'number' || irsJovem.benefitYear < 1 || irsJovem.benefitYear > 10) {
      throw new Error('IRS Jovem benefitYear must be between 1 and 10');
    }
  }

  // Validate subsidies
  if (subsidies && typeof subsidies.duodecimos !== 'undefined' && typeof subsidies.duodecimos !== 'boolean') {
    throw new Error('subsidies.duodecimos must be a boolean');
  }

  const options = {};
  if (mealAllowance) options.mealAllowance = mealAllowance;
  if (irsJovem) options.irsJovem = irsJovem;
  if (subsidies) options.subsidies = subsidies;

  const result = calculate(salary, situation, numDependents, year, csvJson, location, options);

  if (result === null) {
    throw new Error(`Could not calculate salary for the given parameters`);
  }

  return result;
}

function calculateSalaryFromNet({ netSalary: targetNet, situation = 'NotMarried', numDependents = 0, year = '2026', location = 'continente', mealAllowance, irsJovem, subsidies }) {
  let low = targetNet;
  let high = targetNet * 2.5;

  const opts = { situation, numDependents, year, location };
  if (mealAllowance) opts.mealAllowance = mealAllowance;
  if (irsJovem) opts.irsJovem = irsJovem;
  if (subsidies) opts.subsidies = subsidies;

  for (let i = 0; i < 100; i++) {
    const mid = parseFloat(((low + high) / 2).toFixed(2));
    const result = calculateSalary({ ...opts, salary: mid });

    if (Math.abs(result.netSalary - targetNet) < 0.01) {
      return result;
    }

    if (result.netSalary < targetNet) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return calculateSalary({ ...opts, salary: parseFloat(((low + high) / 2).toFixed(2)) });
}

module.exports = { calculateSalary, calculateSalaryFromNet, LOCATIONS, YEARS, TABLES };
