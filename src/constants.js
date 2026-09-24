// Yearly legal parameters that are not part of the IRS withholding tables.

const SOCIAL_SECURITY = { employeeRate: 0.11, employerRate: 0.2375 };

const MONTHLY_PAYMENTS_PER_YEAR = 14;

// Meal allowance exempt from IRS/SS: public administration daily value in cash,
// increased by 60% (until 2024) or 70% (from 2025) when paid by card or voucher.
function mealAllowanceLimits(cashDailyLimit, cardMultiplier) {
  return { cashDailyLimit, cardDailyLimit: cashDailyLimit * cardMultiplier };
}

// IRS Jovem (art. 12.º-B CIRS): exemption rate and annual exempt income cap (as multiples
// of IAS) for each benefit year.
function irsJovem(ias, exemptionRates, annualCapsInIas) {
  return {
    benefitYears: exemptionRates.map((rate, index) => ({
      exemptionRate: rate,
      annualExemptCap: annualCapsInIas[index] * ias,
    })),
  };
}

const IRS_JOVEM_2023 = irsJovem(480.43, [0.5, 0.4, 0.3, 0.3, 0.2], [40, 30, 20, 20, 10]);
const IRS_JOVEM_2024 = irsJovem(509.26, [1, 0.75, 0.5, 0.5, 0.25], [40, 30, 20, 20, 10]);
const IRS_JOVEM_2025 = irsJovem(522.5, [1, 0.75, 0.75, 0.75, 0.5, 0.5, 0.5, 0.25, 0.25, 0.25], Array(10).fill(55));
const IRS_JOVEM_2026 = irsJovem(537.13, [1, 0.75, 0.75, 0.75, 0.5, 0.5, 0.5, 0.25, 0.25, 0.25], Array(10).fill(55));

const CONSTANTS_2024 = {
  socialSecurity: SOCIAL_SECURITY,
  mealAllowance: mealAllowanceLimits(6.0, 1.6),
  irsJovem: IRS_JOVEM_2024,
};

const CONSTANTS = {
  '2026': {
    socialSecurity: SOCIAL_SECURITY,
    mealAllowance: mealAllowanceLimits(6.15, 1.7),
    irsJovem: IRS_JOVEM_2026,
  },
  '2025': {
    socialSecurity: SOCIAL_SECURITY,
    mealAllowance: mealAllowanceLimits(6.0, 1.7),
    irsJovem: IRS_JOVEM_2025,
  },
  '2024_03': CONSTANTS_2024,
  '2024_02': CONSTANTS_2024,
  '2024': CONSTANTS_2024,
  '2023': {
    socialSecurity: SOCIAL_SECURITY,
    mealAllowance: mealAllowanceLimits(5.2, 1.6),
    irsJovem: IRS_JOVEM_2023,
  },
};

function getConstants(year) {
  const constants = CONSTANTS[year];
  if (!constants) {
    throw new Error(`No constants defined for year ${year}`);
  }
  return constants;
}

module.exports = { getConstants, MONTHLY_PAYMENTS_PER_YEAR };
