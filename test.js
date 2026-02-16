const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { calculateSalary } = require('./index');

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
        { message: /Unknown year: 1999/ }
      );
    });
  });
});

