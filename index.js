const { loadTables, LOCATIONS, YEARS, TABLES } = require('./src/tables');
const { getConstants } = require('./src/constants');
const { calculate } = require('./src/calculate');

const SITUATIONS = ['NotMarried', 'MarriedOneHolder', 'MarriedTwoHolders'];
const MEAL_ALLOWANCE_TYPES = ['card', 'cash'];

const isNonNegativeNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const isNonNegativeInteger = (value) => Number.isInteger(value) && value >= 0;

function validateInput({ salary, situation, numDependents, mealAllowance, irsJovem, subsidies }, constants) {

  if (!isNonNegativeNumber(salary)) {
    throw new Error('salary must be a non-negative number');
  }

  if (!SITUATIONS.includes(situation)) {
    throw new Error(`Unknown situation: ${situation}. Available: ${SITUATIONS.join(', ')}`);
  }

  if (!isNonNegativeInteger(numDependents)) {
    throw new Error('numDependents must be a non-negative integer');
  }

  if (mealAllowance) {

    if (!MEAL_ALLOWANCE_TYPES.includes(mealAllowance.type)) {
      throw new Error(`Invalid meal allowance type: ${mealAllowance.type}. Must be 'card' or 'cash'`);
    }

    if (!isNonNegativeNumber(mealAllowance.dailyAmount)) {
      throw new Error('Meal allowance dailyAmount must be a positive number');
    }

    if (mealAllowance.workingDays !== undefined && !isNonNegativeInteger(mealAllowance.workingDays)) {
      throw new Error('Meal allowance workingDays must be a non-negative integer');
    }
  }

  if (irsJovem) {

    const maxBenefitYear = constants.irsJovem.benefitYears.length;
    const { benefitYear } = irsJovem;

    if (!Number.isInteger(benefitYear) || benefitYear < 1 || benefitYear > maxBenefitYear) {
      throw new Error(`IRS Jovem benefitYear must be between 1 and ${maxBenefitYear}`);
    }
  }

  if (subsidies && subsidies.duodecimos !== undefined && typeof subsidies.duodecimos !== 'boolean') {
    throw new Error('subsidies.duodecimos must be a boolean');
  }
}

function calculateSalary({
  salary,
  situation = 'NotMarried',
  numDependents = 0,
  year = '2026',
  location = 'continente',
  mealAllowance,
  irsJovem,
  subsidies,
}) {

  if (!LOCATIONS.includes(location)) {
    throw new Error(`Unknown location: ${location}. Available: ${LOCATIONS.join(', ')}`);
  }

  const taxRows = loadTables(location, year);
  if (!taxRows) {
    throw new Error(`No data for ${location} in year ${year}`);
  }

  const constants = getConstants(year);
  validateInput({ salary, situation, numDependents, mealAllowance, irsJovem, subsidies }, constants);

  return calculate({
    grossSalary: salary,
    situation,
    numDependents,
    constants,
    taxRows,
    mealAllowance,
    irsJovem,
    subsidies,
  });
}

// O valor liquido é monotonico em relação ao valor bruto, portanto uma busca por bisseção permite encontrar o valor bruto para um valor líquido.
function calculateSalaryFromNet({ netSalary: targetNet, ...options }) {

  if (!isNonNegativeNumber(targetNet)) {
    throw new Error('netSalary must be a non-negative number');
  }

  const netFor = (salary) => calculateSalary({ ...options, salary });

  let low = 0;
  let high = Math.max(targetNet * 3, 1);

  for (let i = 0; i < 100 && high - low >= 0.01; i++) {

    const mid = (low + high) / 2;

    if (netFor(mid).netSalary < targetNet) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return netFor(Math.round(high * 100) / 100);
}

module.exports = { calculateSalary, calculateSalaryFromNet, LOCATIONS, YEARS, TABLES };
