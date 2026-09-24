const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { calculateSalary, calculateSalaryFromNet, LOCATIONS, YEARS, TABLES } = require('./index');

describe('calculateSalary', () => {

  describe('reference examples, continente 2026', () => {
    it('1500, table I: IRS 168, SS 165, net 1167', () => {
      const result = calculateSalary({ salary: 1500 });
      assert.equal(result.irsDiscount, 168);
      assert.equal(result.ssDiscount, 165);
      assert.equal(result.netSalary, 1167);
    });

    it('1000: deduction is a formula of R, not a fixed amount', () => {
      // 0.125 × 1000 − 0.125 × 2.6 × (1273.85 − 1000) = 35.99875
      const result = calculateSalary({ salary: 1000 });
      assert.equal(result.irsDiscount, 35);
    });

    it('bracket limits are inclusive', () => {
      // 1042 still uses the "até 1042" row: 130.25 − 75.35125 = 54.89875
      const result = calculateSalary({ salary: 1042 });
      assert.equal(result.irsDiscount, 54);
    });

    it('IRS withholding is rounded down to the euro', () => {
      // 2000: 0.311 × 2000 − 320.66 = 301.34
      const result = calculateSalary({ salary: 2000 });
      assert.equal(result.irsDiscount, 301);
    });

    it('3 or more dependents reduce the marginal rate by 1 percentage point', () => {
      // 0.301 × 2000 − 320.66 − 3 × 34.29 = 178.47
      const result = calculateSalary({ salary: 2000, numDependents: 3 });
      assert.equal(result.irsDiscount, 178);
    });

    it('meal card within the limit is exempt and added to net', () => {
      const result = calculateSalary({ salary: 1500, mealAllowance: { dailyAmount: 10, type: 'card' } });
      assert.equal(result.mealAllowance.taxableAmount, 0);
      assert.equal(result.irsDiscount, 168);
      assert.equal(result.netSalary, 1387);
    });

    it('meal cash above 6.15 is taxed on the excess only', () => {
      const result = calculateSalary({ salary: 1500, mealAllowance: { dailyAmount: 8, type: 'cash' } });
      assert.equal(result.mealAllowance.taxableAmount, 40.7);
      assert.equal(result.mealAllowance.exemptAmount, 135.3);
      assert.equal(result.ssDiscount, 169.48);
    });
  });

  describe('NotMarried, 0 dependents, 2025', () => {
    it('low salary (800)', () => {
      const result = calculateSalary({ situation: 'NotMarried', numDependents: 0, year: '2025', salary: 800 });
      assert.equal(result.grossSalary, 800);
      assert.equal(result.netSalary, 712);
      assert.equal(result.ssDiscount, 88);
      assert.equal(result.irsDiscount, 0);
    });

    it('mid salary (1000)', () => {
      const result = calculateSalary({ situation: 'NotMarried', numDependents: 0, year: '2025', salary: 1000 });
      assert.equal(result.irsDiscount, 58);
      assert.equal(result.netSalary, 832);
    });

    it('mid salary (2000)', () => {
      const result = calculateSalary({ situation: 'NotMarried', numDependents: 0, year: '2025', salary: 2000 });
      assert.equal(result.grossSalary, 2000);
      assert.equal(result.netSalary, 1454);
      assert.equal(result.ssDiscount, 220);
      assert.equal(result.irsDiscount, 326);
    });

    it('high salary (5000)', () => {
      const result = calculateSalary({ situation: 'NotMarried', numDependents: 0, year: '2025', salary: 5000 });
      assert.equal(result.netSalary, 2956);
    });
  });

  describe('MarriedOneHolder with dependents, 2025', () => {
    it('2 dependents, salary 2000', () => {
      const result = calculateSalary({ situation: 'MarriedOneHolder', numDependents: 2, year: '2025', salary: 2000 });
      assert.equal(result.netSalary, 1681);
    });
  });

  describe('MarriedTwoHolders, 2025', () => {
    it('0 dependents, salary 2000', () => {
      const result = calculateSalary({ situation: 'MarriedTwoHolders', numDependents: 0, year: '2025', salary: 2000 });
      assert.equal(result.netSalary, 1454);
    });
  });

  describe('different years', () => {
    it('2024', () => {
      const result = calculateSalary({ situation: 'NotMarried', numDependents: 0, year: '2024', salary: 2000 });
      assert.equal(result.netSalary, 1431);
    });

    it('2023', () => {
      const result = calculateSalary({ situation: 'NotMarried', numDependents: 0, year: '2023', salary: 2000 });
      assert.equal(result.netSalary, 1375);
    });
  });

  describe('edge cases', () => {
    it('very low salary (500) still applies SS but IRS may be 0', () => {
      const result = calculateSalary({ situation: 'NotMarried', numDependents: 0, year: '2025', salary: 500 });
      assert.equal(result.netSalary, 445);
    });

    it('net salary is always less than gross', () => {
      for (const salary of [800, 1200, 2500, 4000]) {
        const result = calculateSalary({ situation: 'NotMarried', numDependents: 0, year: '2025', salary });
        assert.ok(result.netSalary < salary, `net ${result.netSalary} should be less than gross ${salary}`);
      }
    });
  });

  describe('error handling', () => {
    it('throws on invalid year', () => {
      assert.throws(
        () => calculateSalary({ situation: 'NotMarried', numDependents: 0, year: '1999', salary: 2000 }),
        { message: /No data for continente in year 1999/ }
      );
    });

    it('throws on invalid location', () => {
      assert.throws(
        () => calculateSalary({ situation: 'NotMarried', numDependents: 0, year: '2026', salary: 2000, location: 'lisboa' }),
        { message: /Unknown location: lisboa/ }
      );
    });

    it('throws on madeira with unsupported year', () => {
      assert.throws(
        () => calculateSalary({ situation: 'NotMarried', numDependents: 0, year: '2025', salary: 2000, location: 'madeira' }),
        { message: /No data for madeira in year 2025/ }
      );
    });

    it('throws on invalid situation', () => {
      assert.throws(
        () => calculateSalary({ situation: 'Divorced', salary: 2000 }),
        { message: /Unknown situation: Divorced/ }
      );
    });

    it('throws on invalid salary', () => {
      assert.throws(() => calculateSalary({ salary: -1 }), { message: /salary must be a non-negative number/ });
      assert.throws(() => calculateSalary({ salary: NaN }), { message: /salary must be a non-negative number/ });
    });
  });

  describe('different locations', () => {
    it('acores, NotMarried, salary 2000', () => {
      const result = calculateSalary({ situation: 'NotMarried', numDependents: 0, year: '2026', salary: 2000, location: 'acores' });
      assert.ok(result.netSalary > 0);
      assert.ok(result.netSalary < 2000);
    });

    it('madeira, NotMarried, salary 2000', () => {
      const result = calculateSalary({ situation: 'NotMarried', numDependents: 0, year: '2026', salary: 2000, location: 'madeira' });
      assert.ok(result.netSalary > 0);
      assert.ok(result.netSalary < 2000);
    });

    it('acores and continente give different results', () => {
      const acores = calculateSalary({ situation: 'NotMarried', numDependents: 0, year: '2026', salary: 2000, location: 'acores' });
      const continente = calculateSalary({ situation: 'NotMarried', numDependents: 0, year: '2026', salary: 2000, location: 'continente' });
      assert.notEqual(acores.irsDiscount, continente.irsDiscount);
    });
  });

  describe('IRS Jovem', () => {
    it('benefitYear 1 gives 100% IRS exemption', () => {
      const result = calculateSalary({ salary: 2000, year: '2025', irsJovem: { benefitYear: 1 } });
      assert.equal(result.irsDiscount, 0);
      assert.equal(result.irsJovemDiscount, 326);
    });

    it('benefitYear 2 gives 75% IRS exemption', () => {
      // effective rate 326.01 / 2000 applied to the non-exempt 500
      const result = calculateSalary({ salary: 2000, year: '2025', irsJovem: { benefitYear: 2 } });
      assert.equal(result.irsDiscount, 81);
      assert.equal(result.irsJovemDiscount, 245);
    });

    it('benefitYear 5 gives 50% IRS exemption', () => {
      const result = calculateSalary({ salary: 2000, year: '2025', irsJovem: { benefitYear: 5 } });
      assert.equal(result.irsDiscount, 163);
      assert.equal(result.irsJovemDiscount, 163);
    });

    it('benefitYear 8 gives 25% IRS exemption', () => {
      const result = calculateSalary({ salary: 2000, year: '2025', irsJovem: { benefitYear: 8 } });
      assert.equal(result.irsDiscount, 244);
      assert.equal(result.irsJovemDiscount, 82);
    });

    it('exempt income is capped at 55 × IAS / 14 per payment', () => {
      // 2026 cap: 55 × 537.13 / 14 = 2110.21; taxable 889.79 at the effective rate of 3000
      const result = calculateSalary({ salary: 3000, year: '2026', irsJovem: { benefitYear: 1 } });
      assert.equal(result.irsDiscount, 196);
      assert.equal(result.irsJovemDiscount, 467);
    });

    it('low salary where IRS is already 0', () => {
      const result = calculateSalary({ salary: 800, year: '2025', irsJovem: { benefitYear: 1 } });
      assert.equal(result.irsDiscount, 0);
      assert.equal(result.irsJovemDiscount, 0);
    });

    it('throws on invalid benefitYear', () => {
      assert.throws(
        () => calculateSalary({ salary: 2000, year: '2025', irsJovem: { benefitYear: 0 } }),
        { message: /benefitYear must be between 1 and 10/ }
      );
      assert.throws(
        () => calculateSalary({ salary: 2000, year: '2025', irsJovem: { benefitYear: 11 } }),
        { message: /benefitYear must be between 1 and 10/ }
      );
    });

    it('without irsJovem, result has no irsJovemDiscount field', () => {
      const result = calculateSalary({ salary: 2000, year: '2025' });
      assert.equal(result.irsJovemDiscount, undefined);
    });
  });

  describe('Meal Allowance', () => {
    it('card below limit is fully exempt', () => {
      const result = calculateSalary({ salary: 2000, year: '2025', mealAllowance: { dailyAmount: 8.00, type: 'card', workingDays: 22 } });
      assert.equal(result.mealAllowance.totalMonthly, 176);
      assert.equal(result.mealAllowance.exemptAmount, 176);
      assert.equal(result.mealAllowance.taxableAmount, 0);
      // Net should increase by the exempt amount compared to base
      const base = calculateSalary({ salary: 2000, year: '2025' });
      assert.equal(result.netSalary, parseFloat((base.netSalary + 176).toFixed(2)));
    });

    it('card above limit has taxable excess', () => {
      const result = calculateSalary({ salary: 2000, year: '2025', mealAllowance: { dailyAmount: 12.00, type: 'card', workingDays: 22 } });
      // excess = (12 - 10.20) * 22 = 1.80 * 22 = 39.60
      assert.equal(result.mealAllowance.taxableAmount, 39.6);
      assert.equal(result.mealAllowance.exemptAmount, 224.4);
    });

    it('cash below limit is fully exempt', () => {
      const result = calculateSalary({ salary: 2000, year: '2025', mealAllowance: { dailyAmount: 5.00, type: 'cash', workingDays: 22 } });
      assert.equal(result.mealAllowance.exemptAmount, 110);
      assert.equal(result.mealAllowance.taxableAmount, 0);
    });

    it('cash above limit has taxable excess', () => {
      const result = calculateSalary({ salary: 2000, year: '2025', mealAllowance: { dailyAmount: 8.00, type: 'cash', workingDays: 22 } });
      // excess = (8 - 6.00) * 22 = 2.00 * 22 = 44
      assert.equal(result.mealAllowance.taxableAmount, 44);
    });

    it('taxable excess is included in company cost with employer SS', () => {
      const base = calculateSalary({ salary: 2000, year: '2025' });
      const result = calculateSalary({ salary: 2000, year: '2025', mealAllowance: { dailyAmount: 8.00, type: 'cash', workingDays: 22 } });
      // 176 paid + 44 × 23.75% employer SS
      assert.equal(result.companyMonthlyCost, parseFloat((base.companyMonthlyCost + 176 + 10.45).toFixed(2)));
    });

    it('defaults to 22 working days', () => {
      const result = calculateSalary({ salary: 2000, year: '2025', mealAllowance: { dailyAmount: 8.00, type: 'card' } });
      assert.equal(result.mealAllowance.totalMonthly, 176);
    });

    it('throws on invalid type', () => {
      assert.throws(
        () => calculateSalary({ salary: 2000, year: '2025', mealAllowance: { dailyAmount: 8, type: 'voucher' } }),
        { message: /Invalid meal allowance type/ }
      );
    });

    it('without mealAllowance, result has no mealAllowance field', () => {
      const result = calculateSalary({ salary: 2000, year: '2025' });
      assert.equal(result.mealAllowance, undefined);
    });
  });

  describe('Subsidies and Annual Calculation', () => {
    it('separate payment mode: monthly net unchanged, subsidies computed', () => {
      const base = calculateSalary({ salary: 2000, year: '2025' });
      const result = calculateSalary({ salary: 2000, year: '2025', subsidies: { duodecimos: false } });

      // Monthly values unchanged
      assert.equal(result.grossSalary, base.grossSalary);
      assert.equal(result.netSalary, base.netSalary);
      assert.equal(result.irsDiscount, base.irsDiscount);
      assert.equal(result.ssDiscount, base.ssDiscount);

      // Subsidies computed autonomously
      assert.equal(result.subsidies.christmas.gross, 2000);
      assert.equal(result.subsidies.christmas.irs, 326);
      assert.equal(result.subsidies.christmas.ss, 220);
      assert.equal(result.subsidies.christmas.net, 1454);

      // Annual totals
      assert.equal(result.annual.grossTotal, 28000);
      assert.equal(result.annual.netTotal, 1454 * 14);
    });

    it('subsidy IRS ignores the taxable meal excess of the monthly salary', () => {
      const result = calculateSalary({
        salary: 2000,
        year: '2025',
        mealAllowance: { dailyAmount: 12, type: 'card' },
        subsidies: { duodecimos: false },
      });
      assert.equal(result.subsidies.christmas.irs, 326);
    });

    it('duodecimos mode: 2/12 of the autonomous subsidy withholding each month', () => {
      const result = calculateSalary({ salary: 2000, year: '2025', subsidies: { duodecimos: true } });

      // 326 + 326 × 2 / 12, not the withholding of 2000 × 14 / 12 as a single salary
      assert.equal(result.irsDiscount, 380.33);
      assert.equal(result.ssDiscount, 256.67);
      assert.equal(result.subsidies.christmas.gross, 0);
      assert.equal(result.subsidies.holiday.gross, 0);
      assert.equal(result.annual.grossTotal, 28000);
    });

    it('without subsidies, result has no subsidies or annual fields', () => {
      const result = calculateSalary({ salary: 2000, year: '2025' });
      assert.equal(result.subsidies, undefined);
      assert.equal(result.annual, undefined);
    });

    it('annual net totals match between modes', () => {
      const separate = calculateSalary({ salary: 2000, year: '2025', subsidies: { duodecimos: false } });
      const duo = calculateSalary({ salary: 2000, year: '2025', subsidies: { duodecimos: true } });

      assert.ok(Math.abs(separate.annual.netTotal - duo.annual.netTotal) < 0.1,
        `Annual net totals differ: separate=${separate.annual.netTotal}, duo=${duo.annual.netTotal}`);
    });
  });

  describe('Reverse Calculation (Net to Gross)', () => {
    const assertReverses = (options) => {
      const forward = calculateSalary(options);
      const { salary, ...rest } = options;
      const reverse = calculateSalaryFromNet({ ...rest, netSalary: forward.netSalary });
      assert.ok(Math.abs(reverse.netSalary - forward.netSalary) <= 0.01, `Expected net ${forward.netSalary}, got ${reverse.netSalary}`);
      // Rounding IRS down to the euro makes net a sawtooth, so several gross values can give the same net.
      assert.ok(Math.abs(reverse.grossSalary - salary) < 2, `Expected gross ~${salary}, got ${reverse.grossSalary}`);
    };

    it('reverses mid salary', () => assertReverses({ salary: 2000, year: '2025' }));
    it('reverses low salary', () => assertReverses({ salary: 800, year: '2025' }));
    it('reverses high salary', () => assertReverses({ salary: 5000, year: '2025' }));
    it('reverses with IRS Jovem', () => assertReverses({ salary: 2000, year: '2025', irsJovem: { benefitYear: 2 } }));
    it('reverses with meal allowance', () => assertReverses({ salary: 2000, year: '2025', mealAllowance: { dailyAmount: 8, type: 'card' } }));
  });

  describe('Combined features', () => {
    it('IRS Jovem + meal allowance + subsidies together', () => {
      const result = calculateSalary({
        salary: 2000,
        year: '2025',
        irsJovem: { benefitYear: 3 },
        mealAllowance: { dailyAmount: 7.63, type: 'card' },
        subsidies: { duodecimos: false },
      });
      assert.ok(result.netSalary > 0);
      assert.ok(result.irsJovemDiscount > 0);
      assert.ok(result.mealAllowance.exemptAmount > 0);
      assert.ok(result.subsidies.christmas.net > 0);
      assert.ok(result.annual.netTotal > 0);
    });
  });
});

describe('manifest', () => {
  const dataDir = path.join(__dirname, 'data');
  const listedFiles = TABLES.map((table) => table.file);

  it('every listed file exists and its sha256 matches', () => {
    for (const table of TABLES) {
      const filePath = path.join(dataDir, table.file);
      assert.ok(fs.existsSync(filePath), `${table.file} missing`);
      const hash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
      assert.equal(table.sha256, hash, `${table.file} sha256 mismatch`);
    }
  });

  it('does not list catH tables', () => {
    assert.ok(listedFiles.every((file) => !file.endsWith('_catH.csv')));
  });

  it('lists every non-catH table in data/', () => {
    const tableFiles = fs.readdirSync(dataDir).filter((file) => /^taxas_.*\.csv$/.test(file) && !file.endsWith('_catH.csv'));
    for (const file of tableFiles) {
      assert.ok(listedFiles.includes(file), `${file} not in manifest`);
    }
  });

  it('exports LOCATIONS in manifest order', () => {
    assert.deepEqual(LOCATIONS, ['continente', 'madeira', 'acores']);
  });

  it('exports YEARS in manifest order', () => {
    assert.deepEqual(YEARS, ['2026', '2025', '2024_03', '2024_02', '2024', '2023']);
  });

  it('exports TABLES with all fields', () => {
    assert.equal(TABLES.length, 8);
    for (const table of TABLES) {
      for (const field of ['location', 'year', 'label', 'validFrom', 'file', 'sha256']) {
        assert.ok(table[field], `${table.file} missing ${field}`);
      }
    }
  });

  it('does not load tables missing from the manifest', () => {
    assert.throws(
      () => calculateSalary({ location: 'acores', year: '2026_catH', salary: 1000 }),
      { message: 'No data for acores in year 2026_catH' }
    );
  });
});
