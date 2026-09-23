const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { calculateSalary, calculateSalaryFromNet, LOCATIONS, YEARS, TABLES } = require('./index');

describe('calculateSalary', () => {

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
      assert.equal(result.netSalary, 741.5);
    });

    it('mid salary (2000)', () => {
      const result = calculateSalary({ situation: 'NotMarried', numDependents: 0, year: '2025', salary: 2000 });
      assert.equal(result.grossSalary, 2000);
      assert.equal(result.netSalary, 1453.99);
      assert.equal(result.ssDiscount, 220);
      assert.equal(result.irsDiscount, 326.01);
    });

    it('high salary (5000)', () => {
      const result = calculateSalary({ situation: 'NotMarried', numDependents: 0, year: '2025', salary: 5000 });
      assert.equal(result.netSalary, 2955.53);
    });
  });

  describe('MarriedOneHolder with dependents, 2025', () => {
    it('2 dependents, salary 2000', () => {
      const result = calculateSalary({ situation: 'MarriedOneHolder', numDependents: 2, year: '2025', salary: 2000 });
      assert.equal(result.netSalary, 1680.55);
    });
  });

  describe('MarriedTwoHolders, 2025', () => {
    it('0 dependents, salary 2000', () => {
      const result = calculateSalary({ situation: 'MarriedTwoHolders', numDependents: 0, year: '2025', salary: 2000 });
      assert.equal(result.netSalary, 1453.99);
    });
  });

  describe('different years', () => {
    it('2024', () => {
      const result = calculateSalary({ situation: 'NotMarried', numDependents: 0, year: '2024', salary: 2000 });
      assert.equal(result.netSalary, 1430.8);
    });

    it('2023', () => {
      const result = calculateSalary({ situation: 'NotMarried', numDependents: 0, year: '2023', salary: 2000 });
      assert.equal(result.netSalary, 1374.48);
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
      assert.equal(result.irsJovemDiscount, 326.01);
    });

    it('benefitYear 2 gives 75% IRS exemption', () => {
      const result = calculateSalary({ salary: 2000, year: '2025', irsJovem: { benefitYear: 2 } });
      assert.equal(result.irsJovemDiscount, 244.51);
      assert.equal(result.irsDiscount, 81.5);
    });

    it('benefitYear 6 gives 25% IRS exemption', () => {
      const result = calculateSalary({ salary: 2000, year: '2025', irsJovem: { benefitYear: 6 } });
      assert.equal(result.irsJovemDiscount, 81.5);
      assert.equal(result.irsDiscount, 244.51);
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
      // excess = (8 - 6.01) * 22 = 1.99 * 22 = 43.78
      assert.equal(result.mealAllowance.taxableAmount, 43.78);
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

      // Subsidies computed
      assert.equal(result.subsidies.christmas.gross, 2000);
      assert.ok(result.subsidies.christmas.net > 0);
      assert.ok(result.subsidies.christmas.irs >= 0);
      assert.equal(result.subsidies.christmas.ss, 220);

      // Annual totals
      assert.equal(result.annual.grossTotal, 28000);
      assert.ok(result.annual.netTotal > 0);
    });

    it('duodecimos mode: higher monthly gross, no separate subsidies', () => {
      const result = calculateSalary({ salary: 2000, year: '2025', subsidies: { duodecimos: true } });

      // Effective gross = 2000 * 14/12 = 2333.33
      assert.ok(result.netSalary > 0);
      assert.equal(result.subsidies.christmas.gross, 0);
      assert.equal(result.subsidies.holiday.gross, 0);
      // 2000 * 14/12 = 2333.33, * 12 = 27999.96 (rounding)
      assert.equal(result.annual.grossTotal, 27999.96);
    });

    it('without subsidies, result has no subsidies or annual fields', () => {
      const result = calculateSalary({ salary: 2000, year: '2025' });
      assert.equal(result.subsidies, undefined);
      assert.equal(result.annual, undefined);
    });

    it('annual net totals are similar between modes', () => {
      const separate = calculateSalary({ salary: 2000, year: '2025', subsidies: { duodecimos: false } });
      const duo = calculateSalary({ salary: 2000, year: '2025', subsidies: { duodecimos: true } });

      // They should be in the same ballpark (within 5% of each other)
      const diff = Math.abs(separate.annual.netTotal - duo.annual.netTotal);
      const avg = (separate.annual.netTotal + duo.annual.netTotal) / 2;
      assert.ok(diff / avg < 0.05, `Annual net totals too different: separate=${separate.annual.netTotal}, duo=${duo.annual.netTotal}`);
    });
  });

  describe('Reverse Calculation (Net to Gross)', () => {
    it('reverses known gross->net pair', () => {
      const result = calculateSalaryFromNet({ netSalary: 1453.99, year: '2025' });
      assert.ok(Math.abs(result.grossSalary - 2000) < 1, `Expected gross ~2000, got ${result.grossSalary}`);
    });

    it('reverses low salary', () => {
      const result = calculateSalaryFromNet({ netSalary: 712, year: '2025' });
      assert.ok(Math.abs(result.grossSalary - 800) < 1, `Expected gross ~800, got ${result.grossSalary}`);
    });

    it('reverses high salary', () => {
      const result = calculateSalaryFromNet({ netSalary: 2955.53, year: '2025' });
      assert.ok(Math.abs(result.grossSalary - 5000) < 1, `Expected gross ~5000, got ${result.grossSalary}`);
    });

    it('reverses with IRS Jovem', () => {
      const forward = calculateSalary({ salary: 2000, year: '2025', irsJovem: { benefitYear: 2 } });
      const reverse = calculateSalaryFromNet({ netSalary: forward.netSalary, year: '2025', irsJovem: { benefitYear: 2 } });
      assert.ok(Math.abs(reverse.grossSalary - 2000) < 1, `Expected gross ~2000, got ${reverse.grossSalary}`);
    });

    it('reverses with meal allowance', () => {
      const forward = calculateSalary({ salary: 2000, year: '2025', mealAllowance: { dailyAmount: 8, type: 'card' } });
      const reverse = calculateSalaryFromNet({ netSalary: forward.netSalary, year: '2025', mealAllowance: { dailyAmount: 8, type: 'card' } });
      assert.ok(Math.abs(reverse.grossSalary - 2000) < 1, `Expected gross ~2000, got ${reverse.grossSalary}`);
    });
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
