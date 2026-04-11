#!/usr/bin/env node

const { calculateSalary, calculateSalaryFromNet } = require('./index');

const args = process.argv.slice(2);

// Boolean flags that don't take a value
const BOOLEAN_FLAGS = new Set(['duodecimos', 'subsidies', 'reverse', 'help']);

// Parse named flags from args
function parseArgs(args) {
  const positional = [];
  const flags = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      if (BOOLEAN_FLAGS.has(key)) {
        flags[key] = true;
      } else {
        flags[key] = args[i + 1];
        i++;
      }
    } else {
      positional.push(args[i]);
    }
  }

  return { positional, flags };
}

const { positional, flags } = parseArgs(args);

if (positional.length < 1 && !flags.help) {
  console.log('Usage: node cli.js <salary> [situation] [numDependents] [year] [location] [options]');
  console.log('');
  console.log('  salary          Gross monthly salary in euros');
  console.log('  situation       NotMarried (default), MarriedOneHolder, MarriedTwoHolders');
  console.log('  numDependents   Number of dependents, 0-5+ (default: 0)');
  console.log('  year            2026 (default), 2024_03, 2024_02, 2024, 2023');
  console.log('  location        continente (default), madeira, acores');
  console.log('');
  console.log('Options:');
  console.log('  --meal-amount <EUR>    Daily meal allowance amount');
  console.log('  --meal-type <type>     card or cash (default: card)');
  console.log('  --meal-days <days>     Working days per month (default: 22)');
  console.log('  --irs-jovem <year>     IRS Jovem benefit year (1-10)');
  console.log('  --duodecimos           Receive subsidies as duodecimos');
  console.log('  --subsidies            Include subsidy calculations');
  console.log('  --reverse              Reverse calculation: treat salary as desired net');
  console.log('');
  console.log('Examples:');
  console.log('  node cli.js 1500');
  console.log('  node cli.js 1500 MarriedOneHolder 1 2025');
  console.log('  node cli.js 1500 NotMarried 0 2026 acores');
  console.log('  node cli.js 2000 --meal-amount 7.63 --meal-type card');
  console.log('  node cli.js 2000 --irs-jovem 3');
  console.log('  node cli.js 2000 --subsidies --duodecimos');
  console.log('  node cli.js 1500 --reverse');
  process.exit(1);
}

const salary = parseFloat(positional[0]);
const situation = positional[1] || 'NotMarried';
const numDependents = parseInt(positional[2] || '0', 10);
const year = positional[3] || '2026';
const location = positional[4] || 'continente';

const opts = { salary, situation, numDependents, year, location };

// Meal allowance
if (flags['meal-amount']) {
  opts.mealAllowance = {
    dailyAmount: parseFloat(flags['meal-amount']),
    type: flags['meal-type'] || 'card',
    workingDays: flags['meal-days'] ? parseInt(flags['meal-days'], 10) : 22,
  };
}

// IRS Jovem
if (flags['irs-jovem']) {
  opts.irsJovem = { benefitYear: parseInt(flags['irs-jovem'], 10) };
}

// Subsidies
if (flags['subsidies'] || flags['duodecimos']) {
  opts.subsidies = { duodecimos: !!flags['duodecimos'] };
}

const isReverse = !!flags['reverse'];

let result;
if (isReverse) {
  result = calculateSalaryFromNet({ netSalary: salary, situation, numDependents, year, location, ...opts });
} else {
  result = calculateSalary(opts);
}

// Output
if (isReverse) {
  console.log(`Target Net: ${salary}€ | Required Gross: ${result.grossSalary}€`);
}
console.log(`Gross: ${result.grossSalary}€ | Net: ${result.netSalary}€ | IRS: ${result.irsDiscount}€ | SS: ${result.ssDiscount}€`);
console.log(`Company Monthly Cost: ${result.companyMonthlyCost}€`);
console.log(`Company Annual Cost: ${result.companyAnnualCost}€`);

if (result.irsJovemDiscount !== undefined) {
  console.log(`IRS Jovem Discount: ${result.irsJovemDiscount}€`);
}

if (result.mealAllowance) {
  console.log(`Meal Allowance: ${result.mealAllowance.totalMonthly}€/month (exempt: ${result.mealAllowance.exemptAmount}€, taxable: ${result.mealAllowance.taxableAmount}€)`);
}

if (result.subsidies) {
  console.log(`Christmas Subsidy: Gross ${result.subsidies.christmas.gross}€ | Net ${result.subsidies.christmas.net}€`);
  console.log(`Holiday Subsidy: Gross ${result.subsidies.holiday.gross}€ | Net ${result.subsidies.holiday.net}€`);
}

if (result.annual) {
  console.log(`Annual: Gross ${result.annual.grossTotal}€ | Net ${result.annual.netTotal}€ | IRS ${result.annual.irsTotal}€ | SS ${result.annual.ssTotal}€`);
}
