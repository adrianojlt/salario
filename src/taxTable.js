// IRS withholding tables for dependent work (category A), as published in the yearly despachos.
// Each table row is a bracket: R ≤ limit ("max" rows) or R > limit (the "min" top row).

const LARGE_FAMILY_MIN_DEPENDENTS = 3;
const LARGE_FAMILY_RATE_REDUCTION = 0.01;

const parsedTables = new WeakMap();

function parseNumber(text) {
  return parseFloat(text.replace('%', '').replace(',', '.'));
}

function parsePercentage(text) {
  return parseNumber(text) / 100;
}

// A dedução é um valor fixo ou, nas faixas inferiores, uma função de R:
// rate × factor × (reference − R).
function parseDeduction(row) {
  if (row.parcela_abater.includes('%')) {
    const rate = parsePercentage(row.parcela_abater);
    const factor = parseNumber(row.var1);
    const reference = parseNumber(row.var2);
    return (income) => rate * factor * (reference - income);
  }
  const amount = parseNumber(row.parcela_abater);
  return () => amount;
}

function parseRows(rawRows) {
  return rawRows
    .filter((row) => row.tipo)
    .map((row) => ({
      type: row.tipo,
      isTopBracket: row.sinal === 'min',
      limit: parseNumber(row.limite),
      rate: parsePercentage(row.maximo),
      deduction: parseDeduction(row),
      dependentDeduction: parseNumber(row.adicional),
    }));
}

function resolveTableType(availableTypes, situation, numDependents) {

  const hasDependents = numDependents > 0;
  const preferIfAvailable = (type, fallback) => (availableTypes.has(type) ? type : fallback);

  switch (situation) {
    case 'NotMarried':
      return hasDependents ? 'SOLD' : 'SOLCAS2';
    case 'MarriedOneHolder':
      return hasDependents ? preferIfAvailable('CAS1D', 'CAS1') : 'CAS1';
    case 'MarriedTwoHolders':
      return hasDependents ? preferIfAvailable('CAS2D', 'SOLCAS2') : 'SOLCAS2';
    default:
      throw new Error(`Unknown situation: ${situation}`);
  }
}

function createWithholdingCalculator(rawRows, situation, numDependents) {

  if (!parsedTables.has(rawRows)) {
    parsedTables.set(rawRows, parseRows(rawRows));
  }

  const rows = parsedTables.get(rawRows);
  const type = resolveTableType(new Set(rows.map((row) => row.type)), situation, numDependents);
  const brackets = rows.filter((row) => row.type === type);
  const rateReduction = numDependents >= LARGE_FAMILY_MIN_DEPENDENTS ? LARGE_FAMILY_RATE_REDUCTION : 0;

  return (income) => {
    const bracket = brackets.find((row) => (row.isTopBracket ? income > row.limit : income <= row.limit));
    const withholding = income * (bracket.rate - rateReduction)
      - bracket.deduction(income)
      - numDependents * bracket.dependentDeduction;
    return Math.max(0, withholding);
  };
}

module.exports = { createWithholdingCalculator };
