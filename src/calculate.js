const Situation = {
  NotMarried: '0',
  MarriedOneTitular: '1',
  MarriedTwoTitulares: '2'
};

const TSU = "1.2375";

const SITUATION_MAP = {
  'NotMarried': '0',
  'MarriedOneTitular': '1',
  'MarriedTwoTitulares': '2'
};

function getType(situation, dependents, year) {
  if (year === "2023") {
    if (situation === Situation.NotMarried) {
      if (dependents === 0) return "SOLCAS2";
      return "SOLD";
    }
    if (situation === Situation.MarriedOneTitular) {
      if (dependents === 0) return "CAS1";
      return "CAS1D";
    }
    if (situation === Situation.MarriedTwoTitulares) {
      if (dependents === 0) return "SOLCAS2";
      return "CAS2D";
    }
  }

  if (year.startsWith("2024") || year.startsWith("2025") || year.startsWith("2026")) {
    if (situation === Situation.NotMarried) {
      if (dependents === 0) return "SOLCAS2";
      return "SOLD";
    }
    if (situation === Situation.MarriedOneTitular) {
      return "CAS1";
    }
    if (situation === Situation.MarriedTwoTitulares) {
      return "SOLCAS2";
    }
  }
}

function calculate(grossSalary, situation, numDependents, year, csvJson) {

  const internalSituation = SITUATION_MAP[situation] || situation;

  const type = getType(internalSituation, numDependents, year);

  const inMaxRange = (x) => grossSalary < parseFloat(x.limite.replace(',', '.')) && x.sinal === 'max';
  const inMinRange = (x) => grossSalary >= parseFloat(x.limite.replace(',', '.')) && x.sinal === 'min';

  const values = csvJson.filter(x => x.tipo === type && (inMaxRange(x) || inMinRange(x)));

  if (!values[0]) return null; 

  const row = values[0];

  const part = parseFloat(row.parcela_abater.replace(',', '.'));
  const percentage = parseFloat(row.maximo.replace(/%/g, '').replace(',', '.')) / 100;
  const salaryWithTax = parseFloat((grossSalary * percentage).toFixed(2));
  const dependentsPart = parseFloat(parseFloat(row.adicional.replace(',', '.')).toFixed(2));
  const additionalPart = dependentsPart * numDependents;

  let irsDiscount = salaryWithTax - part - additionalPart;
  let ssDiscount = grossSalary * 0.11;

  if (irsDiscount < 0) irsDiscount = 0;

  const netSalary = grossSalary - (irsDiscount + ssDiscount);

  const companyMonthlyCost = ((grossSalary * parseFloat(TSU)) * 14) / 12;
  const companyAnnualCost = companyMonthlyCost * 12;

  return {
    grossSalary,
    netSalary: parseFloat(netSalary.toFixed(2)),
    ssDiscount: parseFloat(ssDiscount.toFixed(2)),
    irsDiscount: parseFloat(irsDiscount.toFixed(2)),
    companyMonthlyCost: parseFloat(companyMonthlyCost.toFixed(2)),
    companyAnnualCost: parseFloat(companyAnnualCost.toFixed(2))
  };
}

module.exports = { calculate };
