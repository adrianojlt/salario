#!/usr/bin/env node

const { calculateSalary } = require('./index');

const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('Usage: node cli.js <salary> [situation] [numDependents] [year]');
  console.log('');
  console.log('  salary          Gross monthly salary in euros');
  console.log('  situation       NotMarried (default), MarriedOneTitular, MarriedTwoTitulares');
  console.log('  numDependents   Number of dependents, 0-5+ (default: 0)');
  console.log('  year            2025 (default), 2024_03, 2024_02, 2024, 2023');
  console.log('');
  console.log('Examples:');
  console.log('  node cli.js 1500');
  console.log('  node cli.js 1500 MarriedOneTitular 1 2025');
  process.exit(1);
}

const salary = parseFloat(args[0]);
const situation = args[1] || 'NotMarried';
const numDependents = parseInt(args[2] || '0', 10);
const year = args[3] || '2025';

const result = calculateSalary({ salary, situation, numDependents, year });

console.log(`Gross: ${result.grossSalary}€ | Net: ${result.netSalary}€ | IRS: ${result.irsDiscount}€ | SS: ${result.ssDiscount}€`);
console.log(`Company Monthly Cost: ${result.companyMonthlyCost}€`)
console.log(`Company Annual Cost: ${result.companyAnnualCost}€`)
