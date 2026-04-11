const CONSTANTS = {
  '2026': {
    ss: { employeeRate: 0.11 },
    tsu: 1.2375,
    mealAllowance: {
      cashDailyLimit: 6.01,
      cardDailyLimit: 10.20,
    },
    irsJovem: {
      exemptions: [1.0, 0.75, 0.50, 0.50, 0.50, 0.25, 0.25, 0.25, 0.25, 0.25],
    },
  },
  '2025': {
    ss: { employeeRate: 0.11 },
    tsu: 1.2375,
    mealAllowance: {
      cashDailyLimit: 6.01,
      cardDailyLimit: 10.20,
    },
    irsJovem: {
      exemptions: [1.0, 0.75, 0.50, 0.50, 0.50, 0.25, 0.25, 0.25, 0.25, 0.25],
    },
  },
  '2024_03': {
    ss: { employeeRate: 0.11 },
    tsu: 1.2375,
    mealAllowance: {
      cashDailyLimit: 6.00,
      cardDailyLimit: 9.60,
    },
    irsJovem: {
      exemptions: [1.0, 0.75, 0.50, 0.50, 0.50, 0.25, 0.25, 0.25, 0.25, 0.25],
    },
  },
  '2024_02': {
    ss: { employeeRate: 0.11 },
    tsu: 1.2375,
    mealAllowance: {
      cashDailyLimit: 6.00,
      cardDailyLimit: 9.60,
    },
    irsJovem: {
      exemptions: [1.0, 0.75, 0.50, 0.50, 0.50, 0.25, 0.25, 0.25, 0.25, 0.25],
    },
  },
  '2024': {
    ss: { employeeRate: 0.11 },
    tsu: 1.2375,
    mealAllowance: {
      cashDailyLimit: 6.00,
      cardDailyLimit: 9.60,
    },
    irsJovem: {
      exemptions: [1.0, 0.75, 0.50, 0.50, 0.50, 0.25, 0.25, 0.25, 0.25, 0.25],
    },
  },
  '2023': {
    ss: { employeeRate: 0.11 },
    tsu: 1.2375,
    mealAllowance: {
      cashDailyLimit: 5.20,
      cardDailyLimit: 8.32,
    },
    irsJovem: {
      exemptions: [1.0, 0.75, 0.50, 0.50, 0.50],
    },
  },
};

function getConstants(year) {
  const constants = CONSTANTS[year];
  if (!constants) {
    throw new Error(`No constants defined for year ${year}`);
  }
  return constants;
}

module.exports = { getConstants };
