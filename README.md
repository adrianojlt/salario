# salario

Node.js package to calculate Portuguese net salary from gross salary, using official IRS tax tables.

## Install

```bash
npm install
```

## CLI

```bash
node cli.js <salary> [situation] [numDependents] [year] [location]
```

Only salary is required. Defaults: `NotMarried`, `0` dependents, `2026`, `continente`.

```bash
node cli.js 1500
# Gross: 1500€ | Net: 1166.8€ | IRS: 165€ | SS: 165€
# Company Monthly Cost: 2165.63€
# Company Annual Cost: 25987.5€

node cli.js 2000 MarriedOneHolder 1 2026 acores
# Gross: 2000€ | Net: 1763.43€ | IRS: 16.57€ | SS: 220€
# Company Monthly Cost: 2887.5€
# Company Annual Cost: 34650€
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
  year: '2026',
  salary: 1500,
  location: 'continente'
});

console.log(result);
/*
  {
    grossSalary: 1500,
    netSalary: 1166.8,
    ssDiscount: 165,
    irsDiscount: 168.17,
    companyMonthlyCost: 2165.63,
    companyAnnualCost: 25987.5
  }
*/
```


**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `situation` | string | `'NotMarried'`, `'MarriedOneHolder'`, or `'MarriedTwoHolders'` |
| `numDependents` | number | Number of dependents (0-5+) |
| `year` | string | Tax year: `'2026'`, `'2025'`, `'2024_03'`, `'2024_02'`, `'2024'`, or `'2023'` |
| `salary` | number | Gross monthly salary in euros |
| `location` | string | `'continente'` (default), `'madeira'`, or `'acores'` |

**Returns:** `{ grossSalary, netSalary, ssDiscount, irsDiscount, companyMonthlyCost, companyAnnualCost }`

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
