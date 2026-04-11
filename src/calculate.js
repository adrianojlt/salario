const { getConstants } = require('./constants');

const Situation = {
  NotMarried: '0',
  MarriedOneHolder: '1',
  MarriedTwoHolders: '2'
};

const SITUATION_MAP = {
  'NotMarried': '0',
  'MarriedOneHolder': '1',
  'MarriedTwoHolders': '2'
};

function getType(situation, dependents, year) {
  if (year === "2023") {
    if (situation === Situation.NotMarried) {
      if (dependents === 0) return "SOLCAS2";
      return "SOLD";
    }
    if (situation === Situation.MarriedOneHolder) {
      if (dependents === 0) return "CAS1";
      return "CAS1D";
    }
    if (situation === Situation.MarriedTwoHolders) {
      if (dependents === 0) return "SOLCAS2";
      return "CAS2D";
    }
  }

  if (year.startsWith("2024") || year.startsWith("2025") || year.startsWith("2026")) {
    if (situation === Situation.NotMarried) {
      if (dependents === 0) return "SOLCAS2";
      return "SOLD";
    }
    if (situation === Situation.MarriedOneHolder) {
      return "CAS1";
    }
    if (situation === Situation.MarriedTwoHolders) {
      return "SOLCAS2";
    }
  }
}

function findTaxRow(grossSalary, type, csvJson) {
  const inMaxRange = (x) => grossSalary < parseFloat(x.limite.replace(',', '.')) && x.sinal === 'max';
  const inMinRange = (x) => grossSalary >= parseFloat(x.limite.replace(',', '.')) && x.sinal === 'min';

  const hasType = (t) => csvJson.some(x => x.tipo === t);

  let resolvedType = type;
  if (!hasType(resolvedType)) {
    if (resolvedType === 'SOLCAS2') resolvedType = 'SOLD';
    else if (resolvedType === 'CAS2D') resolvedType = 'CAS1';
  }

  const values = csvJson.filter(x => x.tipo === resolvedType && (inMaxRange(x) || inMinRange(x)));

  if (!values[0]) return null;

  const row = values[0];
  return {
    part: parseFloat(row.parcela_abater.replace(',', '.')),
    percentage: parseFloat(row.maximo.replace(/%/g, '').replace(',', '.')) / 100,
    dependentsPart: parseFloat(parseFloat(row.adicional.replace(',', '.')).toFixed(2)),
  };
}

function computeIrs(grossSalary, taxRow, numDependents) {
  const salaryWithTax = parseFloat((grossSalary * taxRow.percentage).toFixed(2));
  const additionalPart = taxRow.dependentsPart * numDependents;
  let irsDiscount = salaryWithTax - taxRow.part - additionalPart;
  if (irsDiscount < 0) irsDiscount = 0;
  return parseFloat(irsDiscount.toFixed(2));
}

function calculate(grossSalary, situation, numDependents, year, csvJson, location, options = {}) {
  const constants = getConstants(year);
  const internalSituation = SITUATION_MAP[situation] || situation;
  const type = getType(internalSituation, numDependents, year);

  const { mealAllowance, irsJovem, subsidies } = options;

  // Meal allowance: compute taxable excess
  let mealTaxableExcess = 0;
  let mealExemptAmount = 0;
  let mealTotalMonthly = 0;
  if (mealAllowance) {
    const workingDays = mealAllowance.workingDays || 22;
    const dailyLimit = mealAllowance.type === 'card'
      ? constants.mealAllowance.cardDailyLimit
      : constants.mealAllowance.cashDailyLimit;

    mealTotalMonthly = parseFloat((mealAllowance.dailyAmount * workingDays).toFixed(2));

    if (mealAllowance.dailyAmount > dailyLimit) {
      const taxableDaily = mealAllowance.dailyAmount - dailyLimit;
      mealTaxableExcess = parseFloat((taxableDaily * workingDays).toFixed(2));
      mealExemptAmount = parseFloat((dailyLimit * workingDays).toFixed(2));
    } else {
      mealExemptAmount = mealTotalMonthly;
    }
  }

  // Duodecimos: adjust effective gross if subsidies are spread monthly
  const duodecimos = subsidies && subsidies.duodecimos === true;
  let effectiveGross = duodecimos ? parseFloat((grossSalary * 14 / 12).toFixed(2)) : grossSalary;

  // Add meal taxable excess to effective gross for IRS/SS computation
  const effectiveGrossForTax = effectiveGross + mealTaxableExcess;

  // IRS computation on effective gross
  const taxRow = findTaxRow(effectiveGrossForTax, type, csvJson);
  if (!taxRow) return null;

  let irsDiscount = computeIrs(effectiveGrossForTax, taxRow, numDependents);

  // IRS Jovem: apply exemption
  let irsJovemDiscount = 0;
  if (irsJovem) {
    const exemptions = constants.irsJovem.exemptions;
    const idx = irsJovem.benefitYear - 1;
    const exemptionRate = exemptions[idx];
    irsJovemDiscount = parseFloat((irsDiscount * exemptionRate).toFixed(2));
    irsDiscount = parseFloat((irsDiscount - irsJovemDiscount).toFixed(2));
  }

  // SS computation on effective gross
  const ssDiscount = parseFloat((effectiveGrossForTax * constants.ss.employeeRate).toFixed(2));

  // Net salary
  const netSalary = parseFloat((effectiveGrossForTax - irsDiscount - ssDiscount + mealExemptAmount).toFixed(2));

  // Company cost (always based on base gross, not effective)
  const companyMonthlyCost = parseFloat(((grossSalary * constants.tsu) * 14 / 12).toFixed(2));
  const companyAnnualCost = parseFloat((companyMonthlyCost * 12).toFixed(2));

  // Build result with original 6 fields first
  const result = {
    grossSalary,
    netSalary,
    ssDiscount,
    irsDiscount,
    companyMonthlyCost,
    companyAnnualCost,
  };

  // IRS Jovem discount (always present when irsJovem option used)
  if (irsJovem) {
    result.irsJovemDiscount = irsJovemDiscount;
  }

  // Meal allowance breakdown
  if (mealAllowance) {
    result.mealAllowance = {
      totalMonthly: mealTotalMonthly,
      exemptAmount: mealExemptAmount,
      taxableAmount: mealTaxableExcess,
    };
  }

  // Subsidies and annual calculation
  if (subsidies) {
    if (duodecimos) {
      result.subsidies = {
        christmas: { gross: 0, net: 0, irs: 0, ss: 0 },
        holiday: { gross: 0, net: 0, irs: 0, ss: 0 },
      };
      result.annual = {
        grossTotal: parseFloat((effectiveGross * 12).toFixed(2)),
        netTotal: parseFloat((netSalary * 12).toFixed(2)),
        irsTotal: parseFloat((irsDiscount * 12).toFixed(2)),
        ssTotal: parseFloat((ssDiscount * 12).toFixed(2)),
      };
    } else {
      // Compute subsidy IRS/SS independently (each = 1x base gross)
      const subsidyTaxRow = findTaxRow(grossSalary, type, csvJson);
      let subsidyIrs = 0;
      let subsidySs = 0;
      let subsidyNet = grossSalary;
      if (subsidyTaxRow) {
        subsidyIrs = computeIrs(grossSalary, subsidyTaxRow, numDependents);
        if (irsJovem) {
          const exemptions = constants.irsJovem.exemptions;
          const idx = irsJovem.benefitYear - 1;
          const jovemDiscount = parseFloat((subsidyIrs * exemptions[idx]).toFixed(2));
          subsidyIrs = parseFloat((subsidyIrs - jovemDiscount).toFixed(2));
        }
        subsidySs = parseFloat((grossSalary * constants.ss.employeeRate).toFixed(2));
        subsidyNet = parseFloat((grossSalary - subsidyIrs - subsidySs).toFixed(2));
      }

      result.subsidies = {
        christmas: { gross: grossSalary, net: subsidyNet, irs: subsidyIrs, ss: subsidySs },
        holiday: { gross: grossSalary, net: subsidyNet, irs: subsidyIrs, ss: subsidySs },
      };
      result.annual = {
        grossTotal: parseFloat((grossSalary * 14).toFixed(2)),
        netTotal: parseFloat(((netSalary * 12) + (subsidyNet * 2)).toFixed(2)),
        irsTotal: parseFloat(((irsDiscount * 12) + (subsidyIrs * 2)).toFixed(2)),
        ssTotal: parseFloat(((ssDiscount * 12) + (subsidySs * 2)).toFixed(2)),
      };
    }
  }

  return result;
}

module.exports = { calculate };
