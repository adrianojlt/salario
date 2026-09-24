export type Situation = 'NotMarried' | 'MarriedOneHolder' | 'MarriedTwoHolders';

export interface MealAllowanceInput {
  /** EUR per day */
  dailyAmount: number;
  type: 'card' | 'cash';
  /** Days per month, default 22 */
  workingDays?: number;
}

export interface IrsJovemInput {
  /** Benefit year, starting at 1 */
  benefitYear: number;
}

export interface SubsidiesInput {
  /** true = subsidies spread across 12 months */
  duodecimos?: boolean;
}

export interface SalaryOptions {
  situation?: Situation;
  numDependents?: number;
  year?: string;
  location?: string;
  mealAllowance?: MealAllowanceInput;
  irsJovem?: IrsJovemInput;
  subsidies?: SubsidiesInput;
}

export interface SalaryInput extends SalaryOptions {
  /** Gross monthly salary in euros */
  salary: number;
}

export interface NetSalaryInput extends SalaryOptions {
  /** Desired net monthly salary in euros */
  netSalary: number;
}

export interface Payment {
  gross: number;
  net: number;
  irs: number;
  ss: number;
}

export interface SalaryResult {
  grossSalary: number;
  netSalary: number;
  ssDiscount: number;
  irsDiscount: number;
  companyMonthlyCost: number;
  companyAnnualCost: number;
  irsJovemDiscount?: number;
  mealAllowance?: { totalMonthly: number; exemptAmount: number; taxableAmount: number };
  subsidies?: { christmas: Payment; holiday: Payment };
  annual?: { grossTotal: number; netTotal: number; irsTotal: number; ssTotal: number };
}

export interface TableInfo {
  location: string;
  year: string;
  label: string;
  validFrom: string;
  file: string;
  sha256: string;
}

export function calculateSalary(input: SalaryInput): SalaryResult;
export function calculateSalaryFromNet(input: NetSalaryInput): SalaryResult;
export const LOCATIONS: string[];
export const YEARS: string[];
export const TABLES: TableInfo[];
