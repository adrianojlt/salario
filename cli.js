#!/usr/bin/env node

const { calculateSalary } = require('./index');

const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('Usage: node cli.js <salary> [situation] [numDependents] [year] [location]');
  console.log('');
  console.log('  salary          Gross monthly salary in euros');
  console.log('  situation       NotMarried (default), MarriedOneHolder, MarriedTwoHolders');
  console.log('  numDependents   Number of dependents, 0-5+ (default: 0)');
  console.log('  year            2026 (default), 2024_03, 2024_02, 2024, 2023');
  console.log('  location        continente (default), madeira, acores');
  console.log('');
  console.log('Examples:');
  console.log('  node cli.js 1500');
  console.log('  node cli.js 1500 MarriedOneHolder 1 2025');
  console.log('  node cli.js 1500 NotMarried 0 2026 acores');
  process.exit(1);
}

const salary = parseFloat(args[0]);
const situation = args[1] || 'NotMarried';
const numDependents = parseInt(args[2] || '0', 10);
const year = args[3] || '2026';
const location = args[4] || 'continente';

const result = calculateSalary({ salary, situation, numDependents, year, location });

console.log(`Gross: ${result.grossSalary}€ | Net: ${result.netSalary}€ | IRS: ${result.irsDiscount}€ | SS: ${result.ssDiscount}€`);
console.log(`Company Monthly Cost: ${result.companyMonthlyCost}€`);
console.log(`Company Annual Cost: ${result.companyAnnualCost}€`);
