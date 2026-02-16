# salario

Node.js package to calculate Portuguese net salary from gross salary, using official IRS tax tables.

## Install

```bash
npm install
```

## CLI

```bash
node cli.js <salary> [situation] [numDependents] [year]
```

Only salary is required. Defaults: `NotMarried`, `0` dependents, `2025`.

```bash
node cli.js 1500
# Gross: 1500€ | Net: 1148.9€ | IRS: 186.1€ | SS: 165€

node cli.js 2000 MarriedOneTitular 1 2025
# Gross: 2000€ | Net: 1637.69€ | IRS: 142.31€ | SS: 220€
```

## Programmatic Usage

```js
const { calculateSalary } = require('./index');
```

### calculateSalary(options)

Calculates the full salary breakdown for a given gross salary.

```js
const result = calculateSalary({
  situation: 'NotMarried',
  numDependents: 0,
  year: '2025',
  salary: 1500
});

console.log(result);
// { grossSalary: 1500, netSalary: 1148.9, ssDiscount: 165, irsDiscount: 186.1 }
```

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `situation` | string | `'NotMarried'`, `'MarriedOneTitular'`, or `'MarriedTwoTitulares'` |
| `numDependents` | number | Number of dependents (0-5+) |
| `year` | string | Tax year: `'2026'`, `'2025'`, `'2024_03'`, `'2024_02'`, `'2024'`, or `'2023'` |
| `salary` | number | Gross monthly salary in euros |

**Returns:** `{ grossSalary, netSalary, ssDiscount, irsDiscount }`

## Test

```bash
npm test
```

## How it works

1. Loads CSV tax tables from `data/` (parsed with papaparse, cached after first load)
2. Determines the tax type based on situation, dependents, and year
3. Finds the matching tax bracket for the gross salary
4. Calculates:
   - **IRS discount** = (gross x tax rate) - parcela a abater - (adicional x dependents), minimum 0
   - **SS discount** = gross x 11%
   - **Net salary** = gross - IRS discount - SS discount
