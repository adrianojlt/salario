# salario-pt

Node.js package to calculate Portuguese net salary from gross salary, using official IRS tax tables.

## Install

```bash
npm install salario-pt
```

## CLI

```bash
salario-pt <salary> [situation] [numDependents] [year] [location] [options]
```

Only salary is required. Defaults: `NotMarried`, `0` dependents, `2026`, `continente`.

```bash
salario-pt 2000
# Gross: 2000€ | Net: 1478.66€ | IRS: 301.34€ | SS: 220€
# Company Monthly Cost: 2887.5€
# Company Annual Cost: 34650€

salario-pt 2000 MarriedOneHolder 1 2026 acores

# With meal allowance (card, 7.63€/day)
salario-pt 2000 --meal-amount 7.63 --meal-type card

# With IRS Jovem (3rd year of benefit)
salario-pt 2000 --irs-jovem 3

# With subsidy breakdown
salario-pt 2000 --subsidies

# With subsidies paid as duodecimos
salario-pt 2000 --subsidies --duodecimos

# Reverse: find the gross needed for a desired net
salario-pt 1500 --reverse
```

**CLI Options:**

| Flag | Description |
|------|-------------|
| `--meal-amount <EUR>` | Daily meal allowance amount |
| `--meal-type <type>` | `card` (default) or `cash` |
| `--meal-days <days>` | Working days per month (default: 22) |
| `--irs-jovem <year>` | IRS Jovem benefit year (1-10) |
| `--subsidies` | Include Christmas and Holiday subsidy breakdown |
| `--duodecimos` | Receive subsidies spread across 12 months |
| `--reverse` | Treat salary as desired net, calculate required gross |

## Programmatic Usage

```js
const { calculateSalary, calculateSalaryFromNet } = require('salario-pt');
```

### calculateSalary(options)

Calculates the full salary breakdown for a given gross salary.

```js
const result = calculateSalary({
  salary: 2000,
  situation: 'NotMarried',
  numDependents: 0,
  year: '2026',
  location: 'continente'
});

/*
  {
    grossSalary: 2000,
    netSalary: 1478.66,
    ssDiscount: 220,
    irsDiscount: 301.34,
    companyMonthlyCost: 2887.5,
    companyAnnualCost: 34650
  }
*/
```

**Parameters:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `salary` | number | required | Gross monthly salary in euros |
| `situation` | string | `'NotMarried'` | `'NotMarried'`, `'MarriedOneHolder'`, or `'MarriedTwoHolders'` |
| `numDependents` | number | `0` | Number of dependents |
| `year` | string | `'2026'` | Tax year: `'2026'`, `'2025'`, `'2024_03'`, `'2024_02'`, `'2024'`, `'2023'` |
| `location` | string | `'continente'` | `'continente'`, `'madeira'`, or `'acores'` |
| `mealAllowance` | object | — | See below |
| `irsJovem` | object | — | See below |
| `subsidies` | object | — | See below |

**mealAllowance:**

```js
mealAllowance: {
  dailyAmount: 7.63,  // EUR per day
  type: 'card',       // 'card' or 'cash'
  workingDays: 22     // days per month (default: 22)
}
```

The portion up to the legal daily limit (2025/2026: 10.20€ card, 6.01€ cash) is exempt from IRS and SS. Any excess is taxed.

When provided, the result includes a `mealAllowance` field:
```js
mealAllowance: { totalMonthly, exemptAmount, taxableAmount }
```

**irsJovem:**

```js
irsJovem: {
  benefitYear: 3  // which year of the benefit (1-10)
}
```

Partial IRS exemption for young workers in their first 10 years of employment after completing studies. Exemption rates (2025/2026): 100%, 75%, 50%, 50%, 50%, 25%, 25%, 25%, 25%, 25%.

When provided, the result includes `irsJovemDiscount`.

**subsidies:**

```js
subsidies: {
  duodecimos: false  // false = paid separately, true = spread across 12 months
}
```

Controls how Christmas (13th month) and Holiday (14th month) subsidies are calculated. When `duodecimos: false`, they are computed separately and the monthly `netSalary` is unchanged. When `duodecimos: true`, the monthly gross becomes `salary * 14/12` and there are no separate payments.

When provided, the result includes:
```js
subsidies: {
  christmas: { gross, net, irs, ss },
  holiday:   { gross, net, irs, ss }
},
annual: {
  grossTotal,
  netTotal,
  irsTotal,
  ssTotal
}
```

**Examples:**

```js
// IRS Jovem - 1st benefit year (100% exemption)
calculateSalary({ salary: 2000, year: '2025', irsJovem: { benefitYear: 1 } });
// irsDiscount: 0, irsJovemDiscount: 326.01

// Meal allowance - card at 7.63€/day (below 10.20€ limit, fully exempt)
calculateSalary({ salary: 2000, year: '2025', mealAllowance: { dailyAmount: 7.63, type: 'card' } });
// mealAllowance: { totalMonthly: 167.86, exemptAmount: 167.86, taxableAmount: 0 }

// Subsidies with annual breakdown
calculateSalary({ salary: 2000, year: '2025', subsidies: { duodecimos: false } });
// annual: { grossTotal: 28000, netTotal: 20701.24, irsTotal: 4218.76, ssTotal: 3080 }
```

### calculateSalaryFromNet(options)

Given a desired net salary, finds the gross salary required. Accepts the same optional parameters as `calculateSalary`.

```js
const result = calculateSalaryFromNet({
  netSalary: 1500,
  situation: 'NotMarried',
  year: '2026',
  location: 'continente'
});

// result.grossSalary => ~2036.88
// result.netSalary   => ~1500
```

The function uses binary search and converges to within 0.01€ precision.

## Tabelas disponíveis

`data/manifest.json` is the single source of the IRS tables shipped with the package. Each entry in `tables` has:

| Field | Description |
|-------|-------------|
| `location` | `continente`, `madeira` or `acores` |
| `year` | Table id used in `year` option (e.g. `2026`, `2024_03`) |
| `label` | Human-readable label (e.g. `2024 11-12`) |
| `validFrom` | Date the table takes effect (`YYYY-MM-DD`) |
| `file` | CSV file name in `data/` |
| `sha256` | SHA-256 of the CSV file (generated) |

The manifest also has `schemaVersion` and `version` (same as the package version, generated).

The available tables are exported:

```js
const { LOCATIONS, YEARS, TABLES } = require('salario-pt');

LOCATIONS; // ['continente', 'madeira', 'acores']
YEARS;     // ['2026', '2025', '2024_03', '2024_02', '2024', '2023']
TABLES.filter((t) => t.location === 'madeira').map((t) => t.label); // ['2026']
```

Adding a table:

1. Add the new `taxas_<location>_<year>.csv` to `data/`
2. Add an entry to `data/manifest.json` (`location`, `year`, `label`, `validFrom`, `file`)
3. Bump the version in `package.json`
4. `npm run manifest` (fills `sha256` and `version`)
5. `npm test`
6. `npm publish` (runs `npm run manifest:check` and `npm test` first)

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
5. Optional features (IRS Jovem, meal allowance, subsidies) are applied on top without affecting the base calculation when omitted
