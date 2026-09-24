const { MONTHLY_PAYMENTS_PER_YEAR } = require('./constants');
const { createWithholdingCalculator } = require('./taxTable');

const MONTHS_PER_YEAR = 12;
const SUBSIDIES_PER_YEAR = MONTHLY_PAYMENTS_PER_YEAR - MONTHS_PER_YEAR;
const DEFAULT_MEAL_WORKING_DAYS = 22;

function roundCents(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// Art. 99.º-E CIRS: A retenção na fonte é arredondada para baixo, para o euro.
function floorEuro(value) {
  return Math.floor(value + 1e-9);
}

// Apenas o valor que exceder o limite legal diário estará sujeito ao IRS (Receita Federal dos EUA) e à SS (Seguro Social).
function computeMealAllowance({ dailyAmount, type, workingDays = DEFAULT_MEAL_WORKING_DAYS }, limits) {
  const dailyLimit = type === 'card' ? limits.cardDailyLimit : limits.cashDailyLimit;
  const totalMonthly = roundCents(dailyAmount * workingDays);
  const taxableAmount = roundCents(Math.max(0, dailyAmount - dailyLimit) * workingDays);
  return { totalMonthly, exemptAmount: roundCents(totalMonthly - taxableAmount), taxableAmount };
}

// IRS Jovem: a taxa efectiva provém do rendimento total, mas só se aplica à
// parte não isenta. O rendimento isento por pagamento está limitado ao teto anual/14.
function createIrsCalculator(withholdingBeforeRounding, irsJovemBenefit) {
  return (income) => {
    const withholding = withholdingBeforeRounding(income);
    const irsWithoutExemption = floorEuro(withholding);

    if (!irsJovemBenefit || income === 0) {
      return { irs: irsWithoutExemption, irsJovemDiscount: 0 };
    }

    const exemptIncome = Math.min(
      income * irsJovemBenefit.exemptionRate,
      irsJovemBenefit.annualExemptCap / MONTHLY_PAYMENTS_PER_YEAR,
    );
    const irs = floorEuro((withholding / income) * (income - exemptIncome));
    return { irs, irsJovemDiscount: irsWithoutExemption - irs };
  };
}

function calculate({ grossSalary, situation, numDependents, constants, taxRows, mealAllowance, irsJovem, subsidies }) {

  const { employeeRate, employerRate } = constants.socialSecurity;
  const irsJovemBenefit = irsJovem && constants.irsJovem.benefitYears[irsJovem.benefitYear - 1];
  const computeIrs = createIrsCalculator(
    createWithholdingCalculator(taxRows, situation, numDependents),
    irsJovemBenefit,
  );

  const meal = mealAllowance && computeMealAllowance(mealAllowance, constants.mealAllowance);
  const mealTotal = meal ? meal.totalMonthly : 0;
  const mealTaxable = meal ? meal.taxableAmount : 0;

  // Christmas and holiday subsidies are withheld autonomously, never added to the monthly salary.
  const subsidyIrs = computeIrs(grossSalary);
  const subsidySs = roundCents(grossSalary * employeeRate);
  const subsidy = {
    gross: grossSalary,
    net: roundCents(grossSalary - subsidyIrs.irs - subsidySs),
    irs: subsidyIrs.irs,
    ss: subsidySs,
  };

  // com duodecimos, Todos os meses paga (e retém) também 2/12 dos subsídios.
  const duodecimos = Boolean(subsidies && subsidies.duodecimos);
  const duodecimoShare = duodecimos ? SUBSIDIES_PER_YEAR / MONTHS_PER_YEAR : 0;

  const salaryTaxableIncome = grossSalary + mealTaxable;
  const salaryIrs = computeIrs(salaryTaxableIncome);

  const irsDiscount = roundCents(salaryIrs.irs + subsidyIrs.irs * duodecimoShare);
  const irsJovemDiscount = roundCents(salaryIrs.irsJovemDiscount + subsidyIrs.irsJovemDiscount * duodecimoShare);
  const ssDiscount = roundCents((salaryTaxableIncome + grossSalary * duodecimoShare) * employeeRate);
  const netSalary = roundCents(grossSalary * (1 + duodecimoShare) + mealTotal - irsDiscount - ssDiscount);

  const companyMonthlyCost = roundCents(
    (grossSalary * MONTHLY_PAYMENTS_PER_YEAR / MONTHS_PER_YEAR) * (1 + employerRate)
      + mealTotal
      + mealTaxable * employerRate,
  );

  const result = {
    grossSalary,
    netSalary,
    ssDiscount,
    irsDiscount,
    companyMonthlyCost,
    companyAnnualCost: roundCents(companyMonthlyCost * MONTHS_PER_YEAR),
  };

  if (irsJovem) {
    result.irsJovemDiscount = irsJovemDiscount;
  }

  if (meal) {
    result.mealAllowance = meal;
  }

  if (subsidies) {
    const paidSeparately = duodecimos ? { gross: 0, net: 0, irs: 0, ss: 0 } : subsidy;
    const separatePayments = duodecimos ? 0 : SUBSIDIES_PER_YEAR;

    result.subsidies = { christmas: { ...paidSeparately }, holiday: { ...paidSeparately } };
    result.annual = {
      grossTotal: roundCents(grossSalary * MONTHLY_PAYMENTS_PER_YEAR),
      netTotal: roundCents(netSalary * MONTHS_PER_YEAR + subsidy.net * separatePayments),
      irsTotal: roundCents(irsDiscount * MONTHS_PER_YEAR + subsidy.irs * separatePayments),
      ssTotal: roundCents(ssDiscount * MONTHS_PER_YEAR + subsidy.ss * separatePayments),
    };
  }

  return result;
}

module.exports = { calculate };
