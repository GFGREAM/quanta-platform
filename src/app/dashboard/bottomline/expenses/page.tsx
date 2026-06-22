'use client';

import { Fragment, useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import {
  CartesianGrid, Legend as RLegend, Line, LineChart as RLineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import KpiCard from '@/components/ui/KpiCard';
import { selectStyle } from '@/lib/selectStyle';

type Timeframe = 'MTD' | 'YTD';
type TrendScope = 'dept' | 'nondist' | 'total';

// ── Data shapes ──────────────────────────────────────────────
// MonthlyLineItem is the raw shape that a SQL query should return per row:
// one 12-element array for current-year actuals, budget, and last-year
// actuals. Drop-in replace the literals below with a fetch() + map when the
// database lands; nothing else on the page should need to change.
type MonthlySeries = number[]; // 12 entries, Jan..Dec
// Recursive — subLines is the same shape, so a department can hold
// subcategories that hold sub-sub-categories that hold leaf lines
// (e.g., Rooms → Labor Cost → Salaries and Wages → Salaries & Wages - Management).
//
// cy/bud/ly may be null on a LEAF to mean "this line is not reported": such
// leaves are kept in the catalog below but pruned from the live view by
// pruneUnreported(). A null series counts as 0 in any total.
type MonthlyLineItem = {
  name: string;
  cy: MonthlySeries | null;
  bud: MonthlySeries | null;
  ly: MonthlySeries | null;
  subLines?: MonthlyLineItem[];
};

// LineItem is the scalar shape consumed by every viz component on this page.
// It is produced from a MonthlyLineItem by picking MTD or summing YTD for the
// active month. Recursive so it mirrors the source nesting.
type LineItem = {
  name: string;
  act: number;
  bud: number;
  actLy: number;
  reported: boolean; // false on a leaf with no actual → pruned from the live view
  subLines?: LineItem[];
};

type Group = {
  key: string;
  label: string;
  items: LineItem[];
};

// ── Static options ──────────────────────────────────────────
const HOTELS = ['Fort'] as const;
const YEARS = ['2026', '2025', '2024'] as const;
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

// Seasonality factor relative to March. Used only to synthesize mock
// monthly series from a single March scalar — delete and replace expandMonthly
// calls below with real monthly arrays once the SQL query is wired up.
const SEASONALITY = [
  0.90, 0.88, 1.00, 1.02, 1.03, 1.08,
  1.14, 1.12, 1.00, 0.97, 0.95, 1.09,
];
const expandMonthly = (marchValue: number): MonthlySeries =>
  SEASONALITY.map((f) => Math.round(marchValue * f));

const DEPT_COSTS: MonthlyLineItem[] = [
  {
    name: 'Total Rooms',
    cy: expandMonthly(447000), bud: expandMonthly(416500), ly: expandMonthly(429700),
    subLines: [
      {
        // ── Labor Cost and Related Expenses ──────────────────────
        // 5 sub-sub-categories, each holding its own reported lines.
        name: 'Labor Cost and Related Expenses',
        cy: expandMonthly(260000), bud: expandMonthly(245000), ly: expandMonthly(250000),
        subLines: [
          {
            name: 'Salaries and Wages',
            cy: expandMonthly(180000), bud: expandMonthly(170000), ly: expandMonthly(175000),
            subLines: [
              { name: 'Salaries & Wages - Management',     cy: expandMonthly(70000), bud: expandMonthly(66000), ly: expandMonthly(68000) },
              { name: 'Salaries & Wages - Non-Management', cy: expandMonthly(80000), bud: expandMonthly(76000), ly: expandMonthly(78000) },
              { name: 'Salaries & Wages - Overtime',       cy: expandMonthly(12000), bud: expandMonthly(11000), ly: expandMonthly(11500) },
              { name: 'Other Salaries and Wages',          cy: expandMonthly(10000), bud: expandMonthly(9500),  ly: expandMonthly(9700) },
              { name: 'Outside Labor',                     cy: expandMonthly(8000),  bud: expandMonthly(7500),  ly: expandMonthly(7800) },
            ],
          },
          {
            name: 'Bonuses and Incentives',
            cy: expandMonthly(18000), bud: expandMonthly(15000), ly: expandMonthly(16500),
            subLines: [
              { name: 'Commissions',           cy: expandMonthly(6000), bud: expandMonthly(5000), ly: expandMonthly(5500) },
              { name: 'Incentive Bonus',       cy: expandMonthly(7000), bud: expandMonthly(6000), ly: expandMonthly(6500) },
              { name: 'Local Bonus',           cy: expandMonthly(3000), bud: expandMonthly(2500), ly: expandMonthly(2800) },
              { name: 'Other Incentive Awards', cy: expandMonthly(2000), bud: expandMonthly(1500), ly: expandMonthly(1700) },
            ],
          },
          {
            name: 'Payroll Taxes',
            cy: expandMonthly(22000), bud: expandMonthly(20500), ly: expandMonthly(21000),
            subLines: [
              { name: 'Miscellaneous Payroll Taxes',     cy: expandMonthly(3000), bud: expandMonthly(2800), ly: expandMonthly(2900) },
              { name: 'National Retirement Contribution', cy: expandMonthly(7000), bud: expandMonthly(6500), ly: expandMonthly(6700) },
              { name: 'Payroll Related Taxes - Other',   cy: expandMonthly(2000), bud: expandMonthly(1900), ly: expandMonthly(1950) },
              { name: 'Social Security - 1',             cy: expandMonthly(5000), bud: expandMonthly(4650), ly: expandMonthly(4750) },
              { name: 'Social Security - 2',             cy: expandMonthly(5000), bud: expandMonthly(4650), ly: expandMonthly(4700) },
            ],
          },
          {
            name: 'Supplemental Pay',
            cy: expandMonthly(8000), bud: expandMonthly(7500), ly: expandMonthly(7700),
            subLines: [
              { name: '13th Month Pay',                  cy: expandMonthly(2000), bud: expandMonthly(1900), ly: expandMonthly(1950) },
              { name: 'Holiday Pay',                     cy: expandMonthly(1500), bud: expandMonthly(1400), ly: expandMonthly(1450) },
              { name: 'Paid Time Off',                   cy: expandMonthly(1500), bud: expandMonthly(1400), ly: expandMonthly(1450) },
              { name: 'Severance Pay',                   cy: expandMonthly(1000), bud: expandMonthly(950),  ly: expandMonthly(975) },
              { name: 'Vacation Accrual',                cy: expandMonthly(1500), bud: expandMonthly(1400), ly: expandMonthly(1425) },
              { name: 'Workers Compensation Expense',    cy: expandMonthly(500),  bud: expandMonthly(450),  ly: expandMonthly(450) },
            ],
          },
          {
            name: 'Employee Benefits',
            cy: expandMonthly(32000), bud: expandMonthly(32000), ly: expandMonthly(29800),
            subLines: [
              { name: 'Group Life Insurance',          cy: expandMonthly(4000), bud: expandMonthly(4000), ly: expandMonthly(3700) },
              { name: 'Housing & Educational',         cy: expandMonthly(8000), bud: expandMonthly(8000), ly: expandMonthly(7400) },
              { name: 'Matched Savings Expense',       cy: expandMonthly(5000), bud: expandMonthly(5000), ly: expandMonthly(4650) },
              { name: 'Meals',                         cy: expandMonthly(7000), bud: expandMonthly(7000), ly: expandMonthly(6500) },
              { name: 'National Disability Insurance', cy: expandMonthly(4000), bud: expandMonthly(4000), ly: expandMonthly(3750) },
              { name: 'Other Employee Benefits',       cy: expandMonthly(4000), bud: expandMonthly(4000), ly: expandMonthly(3800) },
            ],
          },
        ],
      },
      {
        // ── Other Expenses ───────────────────────────────────────
        // Flat list of reported lines (no intermediate grouping).
        name: 'Other Expenses',
        cy: expandMonthly(187000), bud: expandMonthly(171500), ly: expandMonthly(179700),
        subLines: [
          { name: 'Cleaning Supplies',                cy: expandMonthly(40000), bud: expandMonthly(36000), ly: expandMonthly(38600) },
          { name: 'Comp - Other Gifts & Services',    cy: expandMonthly(4000),  bud: expandMonthly(4000),  ly: expandMonthly(3800) },
          { name: 'Contract Cleaning',                cy: expandMonthly(9000),  bud: expandMonthly(8500),  ly: expandMonthly(8700) },
          { name: 'Decorations',                      cy: expandMonthly(2000),  bud: expandMonthly(1900),  ly: expandMonthly(1950) },
          { name: 'Employee Education and Training',  cy: expandMonthly(3000),  bud: expandMonthly(2800),  ly: expandMonthly(2900) },
          { name: 'Equipment Rental',                 cy: expandMonthly(2500),  bud: expandMonthly(2400),  ly: expandMonthly(2450) },
          { name: 'Express Mail & Courier',           cy: expandMonthly(1500),  bud: expandMonthly(1400),  ly: expandMonthly(1450) },
          { name: 'General Office Supplies',          cy: expandMonthly(3000),  bud: expandMonthly(3000),  ly: expandMonthly(2800) },
          { name: 'Guest Relocation',                 cy: expandMonthly(1200),  bud: expandMonthly(1100),  ly: expandMonthly(1150) },
          { name: 'Guest Supplies Expense',           cy: expandMonthly(40000), bud: expandMonthly(38500), ly: expandMonthly(40500) },
          { name: 'Guest Transportation',             cy: expandMonthly(2000),  bud: expandMonthly(1900),  ly: expandMonthly(1950) },
          { name: 'Laundry In-House',                 cy: expandMonthly(15000), bud: expandMonthly(14000), ly: expandMonthly(14200) },
          { name: 'Licenses & Permits',               cy: expandMonthly(1800),  bud: expandMonthly(1700),  ly: expandMonthly(1750) },
          { name: 'ASCAP & BMI LICENSE FEES',         cy: expandMonthly(800),   bud: expandMonthly(800),   ly: expandMonthly(780) },
          { name: 'Linen',                            cy: expandMonthly(20000), bud: expandMonthly(18000), ly: expandMonthly(19200) },
          { name: 'Loyalty Program Member Benefits',  cy: expandMonthly(3500),  bud: expandMonthly(3300),  ly: expandMonthly(3400) },
          { name: 'Membership Dues',                  cy: expandMonthly(1500),  bud: expandMonthly(1400),  ly: expandMonthly(1450) },
          { name: 'Miscellaneous Expense',            cy: expandMonthly(2500),  bud: expandMonthly(2400),  ly: expandMonthly(2450) },
          { name: 'Music & Entertainment - Other',    cy: expandMonthly(1200),  bud: expandMonthly(1100),  ly: expandMonthly(1150) },
          { name: 'Operating Equipment (OS)',         cy: expandMonthly(4000),  bud: expandMonthly(3800),  ly: expandMonthly(3900) },
          { name: 'Operating Supplies (OS)',          cy: expandMonthly(8000),  bud: expandMonthly(7600),  ly: expandMonthly(7800) },
          { name: 'Printing & Stationery',            cy: expandMonthly(2000),  bud: expandMonthly(2000),  ly: expandMonthly(1900) },
          { name: 'Reservations - Hotel Expense', cy: expandMonthly(6000), bud: expandMonthly(5700), ly: expandMonthly(5850) },
          { name: 'Travel Agent Commissions',         cy: expandMonthly(5000),  bud: expandMonthly(4750),  ly: expandMonthly(4850) },
          { name: 'Travel Expense - Auto',            cy: expandMonthly(1500),  bud: expandMonthly(1400),  ly: expandMonthly(1450) },
          { name: 'Travel Expense - Other',           cy: expandMonthly(1500),  bud: expandMonthly(1400),  ly: expandMonthly(1450) },
          { name: 'Uniform Costs',                    cy: expandMonthly(3000),  bud: expandMonthly(2800),  ly: expandMonthly(2900) },
          { name: 'Uniform Laundry In-House',         cy: expandMonthly(1500),  bud: expandMonthly(1400),  ly: expandMonthly(1450) },
        ],
      },
    ],
  },
  {
    // ── Total F&B ─────────────────────────────────────────────
    // Four subcategories: Cost of Food / Cost of Beverage (leaf, no breakdown)
    // plus Labor Cost and Related Expenses and Other Expenses (with their own
    // F&B-specific sub-sub-categories — names differ from Rooms).
    name: 'Total F&B',
    cy: expandMonthly(1069428), bud: expandMonthly(1069500), ly: expandMonthly(1030275),
    subLines: [
      { name: 'Cost of Food',     cy: expandMonthly(480000), bud: expandMonthly(492000), ly: expandMonthly(462000) },
      { name: 'Cost of Beverage', cy: expandMonthly(154028), bud: expandMonthly(158300), ly: expandMonthly(150300) },
      {
        // ── Labor Cost and Related Expenses (F&B) ────────────────
        name: 'Labor Cost and Related Expenses',
        cy: expandMonthly(330000), bud: expandMonthly(319000), ly: expandMonthly(315875),
        subLines: [
          {
            name: 'Salaries and Wages',
            cy: expandMonthly(227000), bud: expandMonthly(221000), ly: expandMonthly(217900),
            subLines: [
              { name: 'S & W Management',          cy: expandMonthly(90000),  bud: expandMonthly(88000), ly: expandMonthly(86000) },
              { name: 'S & W Non Management',      cy: expandMonthly(100000), bud: expandMonthly(98000), ly: expandMonthly(96000) },
              { name: 'S & W Overtime',            cy: expandMonthly(15000),  bud: expandMonthly(14000), ly: expandMonthly(14500) },
              { name: 'Other Salaries and Wages',  cy: expandMonthly(12000),  bud: expandMonthly(11500), ly: expandMonthly(11700) },
              { name: 'Outside Labor',             cy: expandMonthly(10000),  bud: expandMonthly(9500),  ly: expandMonthly(9700) },
            ],
          },
          {
            name: 'Bonuses and Incentives',
            cy: expandMonthly(24000), bud: expandMonthly(21000), ly: expandMonthly(22400),
            subLines: [
              { name: 'Commissions',            cy: expandMonthly(8000), bud: expandMonthly(7000), ly: expandMonthly(7500) },
              { name: 'Incentive Bonus',        cy: expandMonthly(9000), bud: expandMonthly(8000), ly: expandMonthly(8500) },
              { name: 'Local Bonus',            cy: expandMonthly(4000), bud: expandMonthly(3500), ly: expandMonthly(3700) },
              { name: 'Other Incentive Awards', cy: expandMonthly(3000), bud: expandMonthly(2500), ly: expandMonthly(2700) },
            ],
          },
          {
            name: 'Government-Mandated Payroll Taxes',
            cy: expandMonthly(28000), bud: expandMonthly(26600), ly: expandMonthly(27100),
            subLines: [
              { name: 'Miscellaneous Payroll Taxes',      cy: expandMonthly(4000), bud: expandMonthly(3800), ly: expandMonthly(3900) },
              { name: 'National Retirement Contribution', cy: expandMonthly(9000), bud: expandMonthly(8500), ly: expandMonthly(8700) },
              { name: 'Payroll Related Taxes - Other',    cy: expandMonthly(3000), bud: expandMonthly(2900), ly: expandMonthly(2950) },
              { name: 'Social Security - 1',              cy: expandMonthly(6000), bud: expandMonthly(5700), ly: expandMonthly(5800) },
              { name: 'Social Security - 2',              cy: expandMonthly(6000), bud: expandMonthly(5700), ly: expandMonthly(5750) },
            ],
          },
          {
            name: 'Supplemental Pay',
            cy: expandMonthly(12000), bud: expandMonthly(11400), ly: expandMonthly(11675),
            subLines: [
              { name: '13 Month Pay',                 cy: expandMonthly(3000), bud: expandMonthly(2900), ly: expandMonthly(2950) },
              { name: 'Holiday Pay',                  cy: expandMonthly(2000), bud: expandMonthly(1900), ly: expandMonthly(1950) },
              { name: 'Paid Time Off',                cy: expandMonthly(2000), bud: expandMonthly(1900), ly: expandMonthly(1950) },
              { name: 'Severance Pay',                cy: expandMonthly(1500), bud: expandMonthly(1400), ly: expandMonthly(1450) },
              { name: 'Vacation Accrual',             cy: expandMonthly(2000), bud: expandMonthly(1900), ly: expandMonthly(1925) },
              { name: 'Workers Compensation Expense', cy: expandMonthly(1500), bud: expandMonthly(1400), ly: expandMonthly(1450) },
            ],
          },
          {
            name: 'Employee Benefits',
            cy: expandMonthly(39000), bud: expandMonthly(39000), ly: expandMonthly(36800),
            subLines: [
              { name: 'Group Life Insurance',          cy: expandMonthly(5000),  bud: expandMonthly(5000),  ly: expandMonthly(4700) },
              { name: 'Housing & Educational',         cy: expandMonthly(10000), bud: expandMonthly(10000), ly: expandMonthly(9400) },
              { name: 'Matched Savings Expense',       cy: expandMonthly(6000),  bud: expandMonthly(6000),  ly: expandMonthly(5650) },
              { name: 'Meals',                         cy: expandMonthly(9000),  bud: expandMonthly(9000),  ly: expandMonthly(8500) },
              { name: 'National Disability Insurance', cy: expandMonthly(5000),  bud: expandMonthly(5000),  ly: expandMonthly(4750) },
              { name: 'Other Employee Benefits 2',     cy: expandMonthly(4000),  bud: expandMonthly(4000),  ly: expandMonthly(3800) },
            ],
          },
        ],
      },
      {
        // ── Other Expenses (F&B) ─────────────────────────────────
        name: 'Other Expenses',
        cy: expandMonthly(105400), bud: expandMonthly(100200), ly: expandMonthly(102100),
        subLines: [
          { name: 'Bar Supplies',                   cy: expandMonthly(12000), bud: expandMonthly(11400), ly: expandMonthly(11600) },
          { name: 'China',                          cy: expandMonthly(5000),  bud: expandMonthly(4800),  ly: expandMonthly(4850) },
          { name: 'Cleaning Supplies',              cy: expandMonthly(8000),  bud: expandMonthly(7600),  ly: expandMonthly(7750) },
          { name: 'Comp Other Gifts & Services',    cy: expandMonthly(3000),  bud: expandMonthly(3000),  ly: expandMonthly(2850) },
          { name: 'Contract Cleaning',              cy: expandMonthly(6000),  bud: expandMonthly(5700),  ly: expandMonthly(5800) },
          { name: 'Decorations',                    cy: expandMonthly(2000),  bud: expandMonthly(1900),  ly: expandMonthly(1950) },
          { name: 'Employee Education and Training', cy: expandMonthly(2500), bud: expandMonthly(2400),  ly: expandMonthly(2450) },
          { name: 'Equipment Rental',               cy: expandMonthly(3000),  bud: expandMonthly(2900),  ly: expandMonthly(2950) },
          { name: 'Express Mail & Courier',         cy: expandMonthly(1200),  bud: expandMonthly(1150),  ly: expandMonthly(1175) },
          { name: 'Flatware',                       cy: expandMonthly(4000),  bud: expandMonthly(3800),  ly: expandMonthly(3900) },
          { name: 'General Office Supplies',        cy: expandMonthly(2500),  bud: expandMonthly(2500),  ly: expandMonthly(2400) },
          { name: 'Glassware',                      cy: expandMonthly(4000),  bud: expandMonthly(3800),  ly: expandMonthly(3900) },
          { name: 'Ice',                            cy: expandMonthly(3500),  bud: expandMonthly(3300),  ly: expandMonthly(3400) },
          { name: 'Kitchen Smallwares',             cy: expandMonthly(5000),  bud: expandMonthly(4800),  ly: expandMonthly(4850) },
          { name: 'Laundry In House',               cy: expandMonthly(6000),  bud: expandMonthly(5700),  ly: expandMonthly(5800) },
          { name: 'Licenses & Permits',             cy: expandMonthly(1500),  bud: expandMonthly(1400),  ly: expandMonthly(1450) },
          { name: 'ASCAP & BMI LICENSE FEES',       cy: expandMonthly(800),   bud: expandMonthly(800),   ly: expandMonthly(780) },
          { name: 'Linen',                          cy: expandMonthly(7000),  bud: expandMonthly(6700),  ly: expandMonthly(6800) },
          { name: 'Membership Dues',                cy: expandMonthly(1200),  bud: expandMonthly(1150),  ly: expandMonthly(1175) },
          { name: 'Menus & Beverage Lists',         cy: expandMonthly(2000),  bud: expandMonthly(1900),  ly: expandMonthly(1950) },
          { name: 'Miscellaneous Expense',          cy: expandMonthly(2000),  bud: expandMonthly(1900),  ly: expandMonthly(1950) },
          { name: 'Music & Entertainment Other',    cy: expandMonthly(3000),  bud: expandMonthly(2900),  ly: expandMonthly(2950) },
          { name: 'OS Operating Equipment',         cy: expandMonthly(4000),  bud: expandMonthly(3800),  ly: expandMonthly(3900) },
          { name: 'OS Operating Supplies',          cy: expandMonthly(6000),  bud: expandMonthly(5700),  ly: expandMonthly(5800) },
          { name: 'Printing Stationery',            cy: expandMonthly(1800),  bud: expandMonthly(1700),  ly: expandMonthly(1750) },
          { name: 'Travel Agent Commissions',       cy: expandMonthly(2000),  bud: expandMonthly(1900),  ly: expandMonthly(1950) },
          { name: 'Travel Expense Auto',            cy: expandMonthly(1200),  bud: expandMonthly(1150),  ly: expandMonthly(1175) },
          { name: 'Travel Expense Other',           cy: expandMonthly(1200),  bud: expandMonthly(1150),  ly: expandMonthly(1175) },
          { name: 'Uniform Costs',                  cy: expandMonthly(2500),  bud: expandMonthly(2400),  ly: expandMonthly(2450) },
          { name: 'Uniform Laundry In House',       cy: expandMonthly(1500),  bud: expandMonthly(1400),  ly: expandMonthly(1450) },
        ],
      },
    ],
  },
  {
    // ── Total Entertainment ───────────────────────────────────
    // Two subcategories: Labor Cost and Related Expenses + Other Expenses.
    name: 'Total Entertainment',
    cy: expandMonthly(79000), bud: expandMonthly(74850), ly: expandMonthly(76340),
    subLines: [
      {
        // ── Labor Cost and Related Expenses (Entertainment) ──────
        name: 'Labor Cost and Related Expenses',
        cy: expandMonthly(60300), bud: expandMonthly(56920), ly: expandMonthly(58125),
        subLines: [
          {
            name: 'Salaries and Wages',
            cy: expandMonthly(40000), bud: expandMonthly(37600), ly: expandMonthly(38800),
            subLines: [
              { name: 'S & W Management',         cy: expandMonthly(15000), bud: expandMonthly(14000), ly: expandMonthly(14500) },
              { name: 'S & W Non Management',     cy: expandMonthly(18000), bud: expandMonthly(17000), ly: expandMonthly(17500) },
              { name: 'S & W Overtime',           cy: expandMonthly(3000),  bud: expandMonthly(2800),  ly: expandMonthly(2900) },
              { name: 'Other Salaries and Wages', cy: expandMonthly(2000),  bud: expandMonthly(1900),  ly: expandMonthly(1950) },
              { name: 'Outside Labor',            cy: expandMonthly(2000),  bud: expandMonthly(1900),  ly: expandMonthly(1950) },
            ],
          },
          {
            name: 'Bonuses and Incentives',
            cy: expandMonthly(4500), bud: expandMonthly(3900), ly: expandMonthly(4200),
            subLines: [
              { name: 'Commissions',            cy: expandMonthly(1500), bud: expandMonthly(1300), ly: expandMonthly(1400) },
              { name: 'Incentive Bonus',        cy: expandMonthly(1500), bud: expandMonthly(1300), ly: expandMonthly(1400) },
              { name: 'Local Bonus',            cy: expandMonthly(800),  bud: expandMonthly(700),  ly: expandMonthly(750) },
              { name: 'Other Incentive Awards', cy: expandMonthly(700),  bud: expandMonthly(600),  ly: expandMonthly(650) },
            ],
          },
          {
            name: 'Government-Mandated Payroll Taxes',
            cy: expandMonthly(5600), bud: expandMonthly(5320), ly: expandMonthly(5430),
            subLines: [
              { name: 'Miscellaneous Payroll Taxes',      cy: expandMonthly(800),  bud: expandMonthly(760),  ly: expandMonthly(780) },
              { name: 'National Retirement Contribution', cy: expandMonthly(1800), bud: expandMonthly(1700), ly: expandMonthly(1750) },
              { name: 'Payroll Related Taxes - Other',    cy: expandMonthly(600),  bud: expandMonthly(580),  ly: expandMonthly(590) },
              { name: 'Social Security - 1',              cy: expandMonthly(1200), bud: expandMonthly(1140), ly: expandMonthly(1160) },
              { name: 'Social Security - 2',              cy: expandMonthly(1200), bud: expandMonthly(1140), ly: expandMonthly(1150) },
            ],
          },
          {
            name: 'Supplemental Pay',
            cy: expandMonthly(2400), bud: expandMonthly(2300), ly: expandMonthly(2345),
            subLines: [
              { name: '13 Month Pay',                 cy: expandMonthly(600), bud: expandMonthly(580), ly: expandMonthly(590) },
              { name: 'Holiday Pay',                  cy: expandMonthly(400), bud: expandMonthly(380), ly: expandMonthly(390) },
              { name: 'Paid Time Off',                cy: expandMonthly(400), bud: expandMonthly(380), ly: expandMonthly(390) },
              { name: 'Severance Pay',                cy: expandMonthly(300), bud: expandMonthly(290), ly: expandMonthly(295) },
              { name: 'Vacation Accrual',             cy: expandMonthly(400), bud: expandMonthly(380), ly: expandMonthly(385) },
              { name: 'Workers Compensation Expense', cy: expandMonthly(300), bud: expandMonthly(290), ly: expandMonthly(295) },
            ],
          },
          {
            name: 'Employee Benefits',
            cy: expandMonthly(7800), bud: expandMonthly(7800), ly: expandMonthly(7350),
            subLines: [
              { name: 'Group Life Insurance',          cy: expandMonthly(1000), bud: expandMonthly(1000), ly: expandMonthly(940) },
              { name: 'Housing & Educational',         cy: expandMonthly(2000), bud: expandMonthly(2000), ly: expandMonthly(1880) },
              { name: 'Matched Savings Expense',       cy: expandMonthly(1200), bud: expandMonthly(1200), ly: expandMonthly(1130) },
              { name: 'Meals',                         cy: expandMonthly(1800), bud: expandMonthly(1800), ly: expandMonthly(1700) },
              { name: 'National Disability Insurance', cy: expandMonthly(1000), bud: expandMonthly(1000), ly: expandMonthly(940) },
              { name: 'Other Employee Benefits',       cy: expandMonthly(800),  bud: expandMonthly(800),  ly: expandMonthly(760) },
            ],
          },
        ],
      },
      {
        // ── Other Expenses (Entertainment) ───────────────────────
        name: 'Other Expenses',
        cy: expandMonthly(18700), bud: expandMonthly(17930), ly: expandMonthly(18215),
        subLines: [
          { name: 'Comp Other Gifts & Services',     cy: expandMonthly(1000), bud: expandMonthly(1000), ly: expandMonthly(950) },
          { name: 'Contract Activities',             cy: expandMonthly(3000), bud: expandMonthly(2900), ly: expandMonthly(2950) },
          { name: 'Decorations',                     cy: expandMonthly(800),  bud: expandMonthly(760),  ly: expandMonthly(780) },
          { name: 'Employee Education and Training', cy: expandMonthly(600),  bud: expandMonthly(580),  ly: expandMonthly(590) },
          { name: 'Equipment Rental',                cy: expandMonthly(1500), bud: expandMonthly(1400), ly: expandMonthly(1450) },
          { name: 'Express Mail & Courier',          cy: expandMonthly(300),  bud: expandMonthly(290),  ly: expandMonthly(295) },
          { name: 'General Office Supplies',         cy: expandMonthly(500),  bud: expandMonthly(500),  ly: expandMonthly(480) },
          { name: 'Laundry In House',                cy: expandMonthly(1000), bud: expandMonthly(950),  ly: expandMonthly(970) },
          { name: 'Miscellaneous Expense',           cy: expandMonthly(600),  bud: expandMonthly(580),  ly: expandMonthly(590) },
          { name: 'Music & Entertainment License',   cy: expandMonthly(2000), bud: expandMonthly(1900), ly: expandMonthly(1950) },
          { name: 'Music & Entertainment Other',     cy: expandMonthly(2500), bud: expandMonthly(2400), ly: expandMonthly(2450) },
          { name: 'OS Operating Equipment',          cy: expandMonthly(1200), bud: expandMonthly(1140), ly: expandMonthly(1160) },
          { name: 'OS Operating Supplies',           cy: expandMonthly(1500), bud: expandMonthly(1430), ly: expandMonthly(1450) },
          { name: 'Printing Stationery',             cy: expandMonthly(400),  bud: expandMonthly(380),  ly: expandMonthly(390) },
          { name: 'Travel Expense Auto',             cy: expandMonthly(400),  bud: expandMonthly(380),  ly: expandMonthly(390) },
          { name: 'Travel Expense Other',            cy: expandMonthly(400),  bud: expandMonthly(380),  ly: expandMonthly(390) },
          { name: 'Uniform Costs',                   cy: expandMonthly(600),  bud: expandMonthly(580),  ly: expandMonthly(590) },
          { name: 'Uniform Laundry In House',        cy: expandMonthly(400),  bud: expandMonthly(380),  ly: expandMonthly(390) },
        ],
      },
    ],
  },
  {
    // ── Total Non Package ─────────────────────────────────────
    // Three subcategories: Costs (per outlet), Labor Cost and Related Expenses
    // (group level only — no deeper leaf lines), and Other Expenses (per outlet).
    name: 'Total Non Package',
    cy: expandMonthly(85500), bud: expandMonthly(81550), ly: expandMonthly(83440),
    subLines: [
      {
        // ── Costs ────────────────────────────────────────────────
        name: 'Costs',
        cy: expandMonthly(58000), bud: expandMonthly(55350), ly: expandMonthly(56700),
        subLines: [
          { name: 'Non Package F & B', cy: expandMonthly(20000), bud: expandMonthly(19000), ly: expandMonthly(19500) },
          { name: 'Spa',               cy: expandMonthly(15000), bud: expandMonthly(14500), ly: expandMonthly(14800) },
          { name: 'Non Package Other', cy: expandMonthly(8000),  bud: expandMonthly(7600),  ly: expandMonthly(7800) },
          { name: 'Outside Rest 1',    cy: expandMonthly(6000),  bud: expandMonthly(5700),  ly: expandMonthly(5850) },
          { name: 'Outside Rest 2',    cy: expandMonthly(5000),  bud: expandMonthly(4750),  ly: expandMonthly(4850) },
          { name: 'Logo Shop',         cy: expandMonthly(4000),  bud: expandMonthly(3800),  ly: expandMonthly(3900) },
        ],
      },
      {
        // ── Labor Cost and Related Expenses (Non Package) ────────
        // Reported at group level only — no leaf breakdown for this dept.
        name: 'Labor Cost and Related Expenses',
        cy: expandMonthly(21000), bud: expandMonthly(20000), ly: expandMonthly(20400),
        subLines: [
          { name: 'Salaries and Wages',     cy: expandMonthly(12000), bud: expandMonthly(11400), ly: expandMonthly(11600) },
          { name: 'Bonuses and Incentives', cy: expandMonthly(2000),  bud: expandMonthly(1900),  ly: expandMonthly(1950) },
          { name: 'Payroll Taxes',          cy: expandMonthly(2500),  bud: expandMonthly(2400),  ly: expandMonthly(2450) },
          { name: 'Supplemental Pay',       cy: expandMonthly(1500),  bud: expandMonthly(1400),  ly: expandMonthly(1450) },
          { name: 'Employee Benefits',      cy: expandMonthly(3000),  bud: expandMonthly(2900),  ly: expandMonthly(2950) },
        ],
      },
      {
        // ── Other Expenses (Non Package) ─────────────────────────
        name: 'Other Expenses',
        cy: expandMonthly(6500), bud: expandMonthly(6200), ly: expandMonthly(6340),
        subLines: [
          { name: 'Non Package F & B', cy: expandMonthly(3000), bud: expandMonthly(2900), ly: expandMonthly(2950) },
          { name: 'Outside Rest 1',    cy: expandMonthly(1500), bud: expandMonthly(1400), ly: expandMonthly(1450) },
          { name: 'Outside Rest 2',    cy: expandMonthly(1200), bud: expandMonthly(1140), ly: expandMonthly(1160) },
          { name: 'Logo Shop',         cy: expandMonthly(800),  bud: expandMonthly(760),  ly: expandMonthly(780) },
        ],
      },
    ],
  },
];

// Non-Distributed categories. Top-level names only for now — each one is a
// single reported line until its real subcategory/sub-sub breakdown lands
// (then add a `subLines` array, exactly like the departments above).
const NON_DISTRIBUTED: MonthlyLineItem[] = [
  {
    name: 'Administrative and General',
    cy: expandMonthly(253140), bud: expandMonthly(276620), ly: expandMonthly(244100),
    subLines: [
      {
        // ── Labor Cost and Related Expenses (A&G) ────────────────
        name: 'Labor Cost and Related Expenses',
        cy: expandMonthly(210500), bud: expandMonthly(216900), ly: expandMonthly(205275),
        subLines: [
          {
            name: 'Salaries and Wages',
            cy: expandMonthly(155000), bud: expandMonthly(163000), ly: expandMonthly(151700),
            subLines: [
              { name: 'S & W Management',         cy: expandMonthly(90000), bud: expandMonthly(95000), ly: expandMonthly(88000) },
              { name: 'S & W Non Management',     cy: expandMonthly(50000), bud: expandMonthly(52000), ly: expandMonthly(49000) },
              { name: 'S & W Overtime',           cy: expandMonthly(5000),  bud: expandMonthly(5500),  ly: expandMonthly(4900) },
              { name: 'Other Salaries and Wages', cy: expandMonthly(4000),  bud: expandMonthly(4200),  ly: expandMonthly(3900) },
              { name: 'Outside Labor',            cy: expandMonthly(6000),  bud: expandMonthly(6300),  ly: expandMonthly(5900) },
            ],
          },
          {
            name: 'Bonuses and Incentives',
            cy: expandMonthly(11500), bud: expandMonthly(10900), ly: expandMonthly(11200),
            subLines: [
              { name: 'Commissions',            cy: expandMonthly(3000), bud: expandMonthly(2800), ly: expandMonthly(2900) },
              { name: 'Incentive Bonus',        cy: expandMonthly(5000), bud: expandMonthly(4800), ly: expandMonthly(4900) },
              { name: 'Local Bonus',            cy: expandMonthly(2000), bud: expandMonthly(1900), ly: expandMonthly(1950) },
              { name: 'Other Incentive Awards', cy: expandMonthly(1500), bud: expandMonthly(1400), ly: expandMonthly(1450) },
            ],
          },
          {
            name: 'Government-Mandated Payroll Taxes',
            cy: expandMonthly(17500), bud: expandMonthly(16850), ly: expandMonthly(17100),
            subLines: [
              { name: 'Miscellaneous Payroll Taxes',      cy: expandMonthly(2000), bud: expandMonthly(1900), ly: expandMonthly(1950) },
              { name: 'National Retirement Contribution', cy: expandMonthly(6000), bud: expandMonthly(5800), ly: expandMonthly(5900) },
              { name: 'Payroll Related Taxes - Other',    cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1475) },
              { name: 'Social Security - 1',              cy: expandMonthly(4000), bud: expandMonthly(3850), ly: expandMonthly(3900) },
              { name: 'Social Security - 2',              cy: expandMonthly(4000), bud: expandMonthly(3850), ly: expandMonthly(3875) },
            ],
          },
          {
            name: 'Supplemental Pay',
            cy: expandMonthly(9000), bud: expandMonthly(8650), ly: expandMonthly(8825),
            subLines: [
              { name: '13 Month Pay',                 cy: expandMonthly(2500), bud: expandMonthly(2400), ly: expandMonthly(2450) },
              { name: 'Holiday Pay',                  cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1475) },
              { name: 'Paid Time Off',                cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1475) },
              { name: 'Severance Pay',                cy: expandMonthly(1000), bud: expandMonthly(950),  ly: expandMonthly(975) },
              { name: 'Vacation Accrual',             cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1475) },
              { name: 'Workers Compensation Expense', cy: expandMonthly(1000), bud: expandMonthly(950),  ly: expandMonthly(975) },
            ],
          },
          {
            name: 'Employee Benefits',
            cy: expandMonthly(17500), bud: expandMonthly(17500), ly: expandMonthly(16450),
            subLines: [
              { name: 'Group Life Insurance',          cy: expandMonthly(2000), bud: expandMonthly(2000), ly: expandMonthly(1880) },
              { name: 'Housing & Educational',         cy: expandMonthly(5000), bud: expandMonthly(5000), ly: expandMonthly(4700) },
              { name: 'Matched Savings Expense',       cy: expandMonthly(3000), bud: expandMonthly(3000), ly: expandMonthly(2820) },
              { name: 'Meals',                         cy: expandMonthly(4000), bud: expandMonthly(4000), ly: expandMonthly(3760) },
              { name: 'National Disability Insurance', cy: expandMonthly(2000), bud: expandMonthly(2000), ly: expandMonthly(1880) },
              { name: 'Other Employee Benefits 2',     cy: expandMonthly(1500), bud: expandMonthly(1500), ly: expandMonthly(1410) },
            ],
          },
        ],
      },
      {
        // ── Other Costs (A&G) ────────────────────────────────────
        name: 'Other Costs',
        cy: expandMonthly(53000), bud: expandMonthly(51000), ly: expandMonthly(50000),
        subLines: [
          { name: 'Bank Charges',                      cy: expandMonthly(2500), bud: expandMonthly(2400), ly: expandMonthly(2450) },
          { name: 'Cash Overages & Shortages',         cy: expandMonthly(300),  bud: expandMonthly(280),  ly: expandMonthly(290) },
          { name: 'CC Commissions Other',              cy: expandMonthly(3000), bud: expandMonthly(2900), ly: expandMonthly(2950) },
          { name: 'Centralized Accounting International', cy: expandMonthly(2000), bud: expandMonthly(1950), ly: expandMonthly(1975) },
          { name: 'Comp Other Gifts & Services',       cy: expandMonthly(800),  bud: expandMonthly(780),  ly: expandMonthly(790) },
          { name: 'Contract Security',                 cy: expandMonthly(4000), bud: expandMonthly(3850), ly: expandMonthly(3900) },
          { name: 'Contract Services General',         cy: expandMonthly(3500), bud: expandMonthly(3400), ly: expandMonthly(3450) },
          { name: 'Credit & Collection',               cy: expandMonthly(1200), bud: expandMonthly(1150), ly: expandMonthly(1175) },
          { name: 'Donations - Tax Deductible',        cy: expandMonthly(1000), bud: expandMonthly(950),  ly: expandMonthly(975) },
          { name: 'Employee Education and Training',   cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1475) },
          { name: 'Equipment Rental',                  cy: expandMonthly(1200), bud: expandMonthly(1150), ly: expandMonthly(1175) },
          { name: 'Express Mail & Courier',            cy: expandMonthly(500),  bud: expandMonthly(480),  ly: expandMonthly(490) },
          { name: 'External Audit Charges',            cy: expandMonthly(2000), bud: expandMonthly(1950), ly: expandMonthly(1975) },
          { name: 'External Payroll Processing',       cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1475) },
          { name: 'General Office Supplies',           cy: expandMonthly(1800), bud: expandMonthly(1750), ly: expandMonthly(1775) },
          { name: 'Internal Audit Fees',               cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1475) },
          { name: 'Legal Services',                    cy: expandMonthly(3000), bud: expandMonthly(2900), ly: expandMonthly(2950) },
          { name: 'Licenses & Permits',                cy: expandMonthly(1000), bud: expandMonthly(950),  ly: expandMonthly(975) },
          { name: 'Loss & Damage',                     cy: expandMonthly(600),  bud: expandMonthly(580),  ly: expandMonthly(590) },
          { name: 'Membership Dues',                   cy: expandMonthly(800),  bud: expandMonthly(780),  ly: expandMonthly(790) },
          { name: 'Miscellaneous Expense',             cy: expandMonthly(1000), bud: expandMonthly(950),  ly: expandMonthly(975) },
          { name: 'Nonguest Ex Rate G/L',              cy: expandMonthly(400),  bud: expandMonthly(380),  ly: expandMonthly(390) },
          { name: 'OS Operating Equipment',            cy: expandMonthly(1200), bud: expandMonthly(1150), ly: expandMonthly(1175) },
          { name: 'Professional Fees Other',           cy: expandMonthly(2500), bud: expandMonthly(2400), ly: expandMonthly(2450) },
          { name: 'Provision Expense',                 cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1475) },
          { name: 'Security Expense',                  cy: expandMonthly(1800), bud: expandMonthly(1750), ly: expandMonthly(1775) },
          { name: 'Seminars',                          cy: expandMonthly(700),  bud: expandMonthly(680),  ly: expandMonthly(690) },
          { name: 'Service Recovery',                  cy: expandMonthly(600),  bud: expandMonthly(580),  ly: expandMonthly(590) },
          { name: 'Settlement Costs',                  cy: expandMonthly(500),  bud: expandMonthly(480),  ly: expandMonthly(490) },
          { name: 'Social and Recreation 100%',        cy: expandMonthly(1200), bud: expandMonthly(1150), ly: expandMonthly(1175) },
          { name: 'Staff Transportation',              cy: expandMonthly(900),  bud: expandMonthly(870),  ly: expandMonthly(885) },
          { name: 'Travel Expense Auto',               cy: expandMonthly(700),  bud: expandMonthly(680),  ly: expandMonthly(690) },
          { name: 'Travel Expense Other',              cy: expandMonthly(800),  bud: expandMonthly(780),  ly: expandMonthly(790) },
          { name: 'Uniform Costs',                     cy: expandMonthly(600),  bud: expandMonthly(580),  ly: expandMonthly(590) },
          { name: 'Uniform Laundry In House',          cy: expandMonthly(400),  bud: expandMonthly(380),  ly: expandMonthly(390) },
          { name: 'Vendor Management Fee',             cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1475) },
          { name: 'Insurance Operating',               cy: expandMonthly(3000), bud: expandMonthly(2900), ly: expandMonthly(2950) },
        ],
      },
    ],
  },
  {
    name: 'Information and Telecommunication Systems',
    cy: expandMonthly(155200), bud: expandMonthly(149950), ly: expandMonthly(152025),
    subLines: [
      {
        // ── Cost ─────────────────────────────────────────────────
        name: 'Cost',
        cy: expandMonthly(20000), bud: expandMonthly(19300), ly: expandMonthly(19625),
        subLines: [
          { name: 'COS Long Distance',              cy: expandMonthly(3000), bud: expandMonthly(2900), ly: expandMonthly(2950) },
          { name: 'COS Telephone Equipment Service', cy: expandMonthly(4000), bud: expandMonthly(3850), ly: expandMonthly(3900) },
          { name: 'COS Local Call',                 cy: expandMonthly(2000), bud: expandMonthly(1950), ly: expandMonthly(1975) },
          { name: 'Complimentary In-Room Media Ent', cy: expandMonthly(5000), bud: expandMonthly(4800), ly: expandMonthly(4900) },
          { name: 'COS Internet Access Guest Room', cy: expandMonthly(6000), bud: expandMonthly(5800), ly: expandMonthly(5900) },
        ],
      },
      {
        // ── Labor Cost and Related Expenses (IT) ─────────────────
        name: 'Labor Cost and Related Expenses',
        cy: expandMonthly(66500), bud: expandMonthly(64240), ly: expandMonthly(64970),
        subLines: [
          {
            name: 'Salaries and Wages',
            cy: expandMonthly(46500), bud: expandMonthly(44750), ly: expandMonthly(45625),
            subLines: [
              { name: 'S & W Management',         cy: expandMonthly(25000), bud: expandMonthly(24000), ly: expandMonthly(24500) },
              { name: 'S & W Non Management',     cy: expandMonthly(15000), bud: expandMonthly(14500), ly: expandMonthly(14750) },
              { name: 'S & W Overtime',           cy: expandMonthly(2000),  bud: expandMonthly(1900),  ly: expandMonthly(1950) },
              { name: 'Other Salaries and Wages', cy: expandMonthly(1500),  bud: expandMonthly(1450),  ly: expandMonthly(1475) },
              { name: 'Outside Labor',            cy: expandMonthly(3000),  bud: expandMonthly(2900),  ly: expandMonthly(2950) },
            ],
          },
          {
            name: 'Bonuses and Incentives',
            cy: expandMonthly(4500), bud: expandMonthly(4290), ly: expandMonthly(4395),
            subLines: [
              { name: 'Commissions',            cy: expandMonthly(1000), bud: expandMonthly(950), ly: expandMonthly(975) },
              { name: 'Incentive Bonus',        cy: expandMonthly(2000), bud: expandMonthly(1900), ly: expandMonthly(1950) },
              { name: 'Local Bonus',            cy: expandMonthly(800),  bud: expandMonthly(760), ly: expandMonthly(780) },
              { name: 'Other Incentive Awards', cy: expandMonthly(700),  bud: expandMonthly(680), ly: expandMonthly(690) },
            ],
          },
          {
            name: 'Government-Mandated Payroll Taxes',
            cy: expandMonthly(6100), bud: expandMonthly(5910), ly: expandMonthly(6000),
            subLines: [
              { name: 'Miscellaneous Payroll Taxes',      cy: expandMonthly(600),  bud: expandMonthly(580),  ly: expandMonthly(590) },
              { name: 'National Retirement Contribution', cy: expandMonthly(2000), bud: expandMonthly(1950), ly: expandMonthly(1975) },
              { name: 'Payroll Related Taxes - Other',    cy: expandMonthly(500),  bud: expandMonthly(480),  ly: expandMonthly(490) },
              { name: 'Social Security - 1',              cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1475) },
              { name: 'Social Security - 2',              cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1470) },
            ],
          },
          {
            name: 'Supplemental Pay',
            cy: expandMonthly(3000), bud: expandMonthly(2890), ly: expandMonthly(2940),
            subLines: [
              { name: '13 Month Pay',                 cy: expandMonthly(800), bud: expandMonthly(780), ly: expandMonthly(790) },
              { name: 'Holiday Pay',                  cy: expandMonthly(500), bud: expandMonthly(480), ly: expandMonthly(490) },
              { name: 'Paid Time Off',                cy: expandMonthly(500), bud: expandMonthly(480), ly: expandMonthly(490) },
              { name: 'Severance Pay',                cy: expandMonthly(400), bud: expandMonthly(380), ly: expandMonthly(390) },
              { name: 'Vacation Accrual',             cy: expandMonthly(500), bud: expandMonthly(480), ly: expandMonthly(485) },
              { name: 'Workers Compensation Expense', cy: expandMonthly(300), bud: expandMonthly(290), ly: expandMonthly(295) },
            ],
          },
          {
            name: 'Employee Benefits',
            cy: expandMonthly(6400), bud: expandMonthly(6400), ly: expandMonthly(6010),
            subLines: [
              { name: 'Group Life Insurance',          cy: expandMonthly(800),  bud: expandMonthly(800),  ly: expandMonthly(750) },
              { name: 'Housing & Educational',         cy: expandMonthly(2000), bud: expandMonthly(2000), ly: expandMonthly(1880) },
              { name: 'Matched Savings Expense',       cy: expandMonthly(1000), bud: expandMonthly(1000), ly: expandMonthly(940) },
              { name: 'Meals',                         cy: expandMonthly(1200), bud: expandMonthly(1200), ly: expandMonthly(1130) },
              { name: 'National Disability Insurance', cy: expandMonthly(800),  bud: expandMonthly(800),  ly: expandMonthly(750) },
              { name: 'Other Employee Benefits 2',     cy: expandMonthly(600),  bud: expandMonthly(600),  ly: expandMonthly(560) },
            ],
          },
        ],
      },
      {
        // ── Other Cost (IT) ──────────────────────────────────────
        name: 'Other Cost',
        cy: expandMonthly(52000), bud: expandMonthly(50250), ly: expandMonthly(51000),
        subLines: [
          {
            name: 'System Expenses',
            cy: expandMonthly(52000), bud: expandMonthly(50250), ly: expandMonthly(51000),
            subLines: [
              { name: 'Computer Maintenance Hardware',     cy: expandMonthly(8000),  bud: expandMonthly(7700),  ly: expandMonthly(7800) },
              { name: 'Guest Experience',                  cy: expandMonthly(5000),  bud: expandMonthly(4800),  ly: expandMonthly(4900) },
              { name: 'Hotel Level IT Equipment & Supplies', cy: expandMonthly(6000), bud: expandMonthly(5800), ly: expandMonthly(5900) },
              { name: 'HR Systems',                        cy: expandMonthly(4000),  bud: expandMonthly(3850),  ly: expandMonthly(3900) },
              { name: 'IT Infrastructure & Support',       cy: expandMonthly(10000), bud: expandMonthly(9700),  ly: expandMonthly(9800) },
              { name: 'IT Licenses',                       cy: expandMonthly(12000), bud: expandMonthly(11600), ly: expandMonthly(11800) },
              { name: 'IT Security',                       cy: expandMonthly(7000),  bud: expandMonthly(6800),  ly: expandMonthly(6900) },
            ],
          },
        ],
      },
      {
        // ── Other Expenses (IT) ──────────────────────────────────
        name: 'Other Expenses',
        cy: expandMonthly(16700), bud: expandMonthly(16160), ly: expandMonthly(16430),
        subLines: [
          { name: 'Comp Other Gifts & Services',          cy: expandMonthly(800),  bud: expandMonthly(780),  ly: expandMonthly(790) },
          { name: 'Contract Services General',            cy: expandMonthly(3000), bud: expandMonthly(2900), ly: expandMonthly(2950) },
          { name: 'Employee Education and Training',      cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1475) },
          { name: 'Equipment Rental',                     cy: expandMonthly(1200), bud: expandMonthly(1150), ly: expandMonthly(1175) },
          { name: 'Express Mail & Courier',               cy: expandMonthly(400),  bud: expandMonthly(380),  ly: expandMonthly(390) },
          { name: 'General Office Supplies',              cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1475) },
          { name: 'Licenses & Permits',                   cy: expandMonthly(800),  bud: expandMonthly(780),  ly: expandMonthly(790) },
          { name: 'Membership Dues',                      cy: expandMonthly(600),  bud: expandMonthly(580),  ly: expandMonthly(590) },
          { name: 'Miscellaneous Expense',                cy: expandMonthly(800),  bud: expandMonthly(780),  ly: expandMonthly(790) },
          { name: 'OS Operating Supplies',                cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1475) },
          { name: 'Other Corporate Office Reimbursables', cy: expandMonthly(2000), bud: expandMonthly(1950), ly: expandMonthly(1975) },
          { name: 'Seminars',                             cy: expandMonthly(700),  bud: expandMonthly(680),  ly: expandMonthly(690) },
          { name: 'Travel Expense Auto',                  cy: expandMonthly(600),  bud: expandMonthly(580),  ly: expandMonthly(590) },
          { name: 'Travel Expense Other',                 cy: expandMonthly(600),  bud: expandMonthly(580),  ly: expandMonthly(590) },
          { name: 'Uniform Costs',                        cy: expandMonthly(400),  bud: expandMonthly(380),  ly: expandMonthly(390) },
          { name: 'Uniform Laundry In House',             cy: expandMonthly(300),  bud: expandMonthly(290),  ly: expandMonthly(295) },
        ],
      },
    ],
  },
  {
    name: 'Sales and Marketing',
    cy: expandMonthly(161600), bud: expandMonthly(155490), ly: expandMonthly(157490),
    subLines: [
      {
        // ── Labor Cost and Related Expenses (Sales & Marketing) ──
        name: 'Labor Cost and Related Expenses',
        cy: expandMonthly(56500), bud: expandMonthly(54490), ly: expandMonthly(54990),
        subLines: [
          {
            name: 'Salaries and Wages',
            cy: expandMonthly(37000), bud: expandMonthly(35550), ly: expandMonthly(36125),
            subLines: [
              { name: 'S & W Management',         cy: expandMonthly(20000), bud: expandMonthly(19200), ly: expandMonthly(19500) },
              { name: 'S & W Non Management',     cy: expandMonthly(12000), bud: expandMonthly(11500), ly: expandMonthly(11700) },
              { name: 'S & W Overtime',           cy: expandMonthly(1500),  bud: expandMonthly(1450),  ly: expandMonthly(1475) },
              { name: 'Other Salaries and Wages', cy: expandMonthly(1500),  bud: expandMonthly(1450),  ly: expandMonthly(1475) },
              { name: 'Outside Labor',            cy: expandMonthly(2000),  bud: expandMonthly(1950),  ly: expandMonthly(1975) },
            ],
          },
          {
            name: 'Bonuses and Incentives',
            cy: expandMonthly(5500), bud: expandMonthly(5240), ly: expandMonthly(5370),
            subLines: [
              { name: 'Commissions',            cy: expandMonthly(2000), bud: expandMonthly(1900), ly: expandMonthly(1950) },
              { name: 'Incentive Bonus',        cy: expandMonthly(2000), bud: expandMonthly(1900), ly: expandMonthly(1950) },
              { name: 'Local Bonus',            cy: expandMonthly(800),  bud: expandMonthly(760),  ly: expandMonthly(780) },
              { name: 'Other Incentive Awards', cy: expandMonthly(700),  bud: expandMonthly(680),  ly: expandMonthly(690) },
            ],
          },
          {
            name: 'Government-Mandated Payroll Taxes',
            cy: expandMonthly(5300), bud: expandMonthly(5110), ly: expandMonthly(5200),
            subLines: [
              { name: 'Miscellaneous Payroll Taxes',      cy: expandMonthly(500),  bud: expandMonthly(480),  ly: expandMonthly(490) },
              { name: 'National Retirement Contribution', cy: expandMonthly(1800), bud: expandMonthly(1750), ly: expandMonthly(1775) },
              { name: 'Payroll Related Taxes - Other',    cy: expandMonthly(400),  bud: expandMonthly(380),  ly: expandMonthly(390) },
              { name: 'Social Security - 1',              cy: expandMonthly(1300), bud: expandMonthly(1250), ly: expandMonthly(1275) },
              { name: 'Social Security - 2',              cy: expandMonthly(1300), bud: expandMonthly(1250), ly: expandMonthly(1270) },
            ],
          },
          {
            name: 'Supplemental Pay',
            cy: expandMonthly(2900), bud: expandMonthly(2790), ly: expandMonthly(2840),
            subLines: [
              { name: '13 Month Pay',                 cy: expandMonthly(700), bud: expandMonthly(680), ly: expandMonthly(690) },
              { name: 'Holiday Pay',                  cy: expandMonthly(500), bud: expandMonthly(480), ly: expandMonthly(490) },
              { name: 'Paid Time Off',                cy: expandMonthly(500), bud: expandMonthly(480), ly: expandMonthly(490) },
              { name: 'Severance Pay',                cy: expandMonthly(400), bud: expandMonthly(380), ly: expandMonthly(390) },
              { name: 'Vacation Accrual',             cy: expandMonthly(500), bud: expandMonthly(480), ly: expandMonthly(485) },
              { name: 'Workers Compensation Expense', cy: expandMonthly(300), bud: expandMonthly(290), ly: expandMonthly(295) },
            ],
          },
          {
            name: 'Employee Benefits',
            cy: expandMonthly(5800), bud: expandMonthly(5800), ly: expandMonthly(5450),
            subLines: [
              { name: 'Group Life Insurance',          cy: expandMonthly(700),  bud: expandMonthly(700),  ly: expandMonthly(660) },
              { name: 'Housing & Educational',         cy: expandMonthly(1800), bud: expandMonthly(1800), ly: expandMonthly(1690) },
              { name: 'Matched Savings Expense',       cy: expandMonthly(900),  bud: expandMonthly(900),  ly: expandMonthly(850) },
              { name: 'Meals',                         cy: expandMonthly(1100), bud: expandMonthly(1100), ly: expandMonthly(1035) },
              { name: 'National Disability Insurance', cy: expandMonthly(700),  bud: expandMonthly(700),  ly: expandMonthly(660) },
              { name: 'Other Employee Benefits 2',     cy: expandMonthly(600),  bud: expandMonthly(600),  ly: expandMonthly(560) },
            ],
          },
        ],
      },
      {
        // ── Other Expenses (Sales & Marketing) ───────────────────
        name: 'Other Expenses',
        cy: expandMonthly(105100), bud: expandMonthly(101000), ly: expandMonthly(102500),
        subLines: [
          { name: 'Agency Consulting Fee',                cy: expandMonthly(3000), bud: expandMonthly(2900), ly: expandMonthly(2950) },
          { name: 'Agency Fees Other',                    cy: expandMonthly(2000), bud: expandMonthly(1950), ly: expandMonthly(1975) },
          { name: 'Business Meals - Off Property',        cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1475) },
          { name: 'Client Entertainment 0%',              cy: expandMonthly(1000), bud: expandMonthly(950),  ly: expandMonthly(975) },
          { name: 'Cluster Services',                     cy: expandMonthly(2500), bud: expandMonthly(2400), ly: expandMonthly(2450) },
          { name: 'Collateral Brochures',                 cy: expandMonthly(1800), bud: expandMonthly(1750), ly: expandMonthly(1775) },
          { name: 'Comp Other Gifts & Services',          cy: expandMonthly(800),  bud: expandMonthly(780),  ly: expandMonthly(790) },
          { name: 'Contract Services General',            cy: expandMonthly(2000), bud: expandMonthly(1950), ly: expandMonthly(1975) },
          { name: 'Decorations',                          cy: expandMonthly(500),  bud: expandMonthly(480),  ly: expandMonthly(490) },
          { name: 'Direct Marketing Rooms',               cy: expandMonthly(4000), bud: expandMonthly(3850), ly: expandMonthly(3900) },
          { name: 'Employee Education and Training',      cy: expandMonthly(1000), bud: expandMonthly(950),  ly: expandMonthly(975) },
          { name: 'Equipment Rental',                     cy: expandMonthly(800),  bud: expandMonthly(780),  ly: expandMonthly(790) },
          { name: 'Express Mail & Courier',               cy: expandMonthly(400),  bud: expandMonthly(380),  ly: expandMonthly(390) },
          { name: 'Familiarization Trips',                cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1475) },
          { name: 'Franchise Marketing Fee',              cy: expandMonthly(8000), bud: expandMonthly(7700), ly: expandMonthly(7800) },
          { name: 'General Office Supplies',              cy: expandMonthly(1200), bud: expandMonthly(1150), ly: expandMonthly(1175) },
          { name: 'Group Service Fee',                    cy: expandMonthly(3000), bud: expandMonthly(2900), ly: expandMonthly(2950) },
          { name: 'Group Services Variable Fees',         cy: expandMonthly(2500), bud: expandMonthly(2400), ly: expandMonthly(2450) },
          { name: 'In House Graphics',                    cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1475) },
          { name: 'Licenses & Permits',                   cy: expandMonthly(600),  bud: expandMonthly(580),  ly: expandMonthly(590) },
          { name: 'Local Marketing',                      cy: expandMonthly(5000), bud: expandMonthly(4800), ly: expandMonthly(4900) },
          { name: 'Media Advertising Other',              cy: expandMonthly(6000), bud: expandMonthly(5800), ly: expandMonthly(5900) },
          { name: 'Media Digital Other',                  cy: expandMonthly(7000), bud: expandMonthly(6800), ly: expandMonthly(6900) },
          { name: 'Media Group Rooms',                    cy: expandMonthly(4000), bud: expandMonthly(3850), ly: expandMonthly(3900) },
          { name: 'Media Outdoor Billboard',              cy: expandMonthly(3000), bud: expandMonthly(2900), ly: expandMonthly(2950) },
          { name: 'Membership Dues',                      cy: expandMonthly(800),  bud: expandMonthly(780),  ly: expandMonthly(790) },
          { name: 'Miscellaneous Advertising',            cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1475) },
          { name: 'Miscellaneous Expense',                cy: expandMonthly(1000), bud: expandMonthly(950),  ly: expandMonthly(975) },
          { name: 'Miscellaneous Promotions',             cy: expandMonthly(1200), bud: expandMonthly(1150), ly: expandMonthly(1175) },
          { name: 'Other Corporate Office Reimbursables', cy: expandMonthly(2000), bud: expandMonthly(1950), ly: expandMonthly(1975) },
          { name: 'Outside Services Market Research',     cy: expandMonthly(2500), bud: expandMonthly(2400), ly: expandMonthly(2450) },
          { name: 'Photography',                          cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1475) },
          { name: 'Sales & Marketing Promotions',         cy: expandMonthly(3000), bud: expandMonthly(2900), ly: expandMonthly(2950) },
          { name: 'Sales Promotion Corporate',            cy: expandMonthly(2500), bud: expandMonthly(2400), ly: expandMonthly(2450) },
          { name: 'Trade Shows',                          cy: expandMonthly(4000), bud: expandMonthly(3850), ly: expandMonthly(3900) },
          { name: 'Travel Expense Auto',                  cy: expandMonthly(800),  bud: expandMonthly(780),  ly: expandMonthly(790) },
          { name: 'Travel Expense Other',                 cy: expandMonthly(1000), bud: expandMonthly(950),  ly: expandMonthly(975) },
          { name: 'Uniform Costs',                        cy: expandMonthly(400),  bud: expandMonthly(380),  ly: expandMonthly(390) },
          { name: 'Uniform Laundry In House',             cy: expandMonthly(300),  bud: expandMonthly(290),  ly: expandMonthly(295) },
          { name: 'Web-Site Rooms',                       cy: expandMonthly(3000), bud: expandMonthly(2900), ly: expandMonthly(2950) },
          { name: 'World of Hyatt Assessment',            cy: expandMonthly(5000), bud: expandMonthly(4800), ly: expandMonthly(4900) },
          { name: 'World of Hyatt Commission Rooms',      cy: expandMonthly(6000), bud: expandMonthly(5800), ly: expandMonthly(5900) },
          { name: 'World of Hyatt Sales Promotion',       cy: expandMonthly(4000), bud: expandMonthly(3850), ly: expandMonthly(3900) },
        ],
      },
    ],
  },
  {
    name: 'Energy, Water and Waste',
    cy: expandMonthly(133000), bud: expandMonthly(141600), ly: expandMonthly(128750),
    subLines: [
      {
        name: 'Energy',
        cy: expandMonthly(95000), bud: expandMonthly(101300), ly: expandMonthly(92000),
        subLines: [
          { name: 'Oil',              cy: expandMonthly(5000),  bud: expandMonthly(5500),  ly: expandMonthly(4800) },
          { name: 'Gas',              cy: expandMonthly(18000), bud: expandMonthly(19000), ly: expandMonthly(17500) },
          { name: 'Electricity',      cy: expandMonthly(60000), bud: expandMonthly(64000), ly: expandMonthly(58000) },
          { name: 'Renewable Energy', cy: expandMonthly(8000),  bud: expandMonthly(8500),  ly: expandMonthly(7800) },
          { name: 'Vehicle Fuels',    cy: expandMonthly(4000),  bud: expandMonthly(4300),  ly: expandMonthly(3900) },
        ],
      },
      {
        name: 'Water',
        cy: expandMonthly(26000), bud: expandMonthly(27700), ly: expandMonthly(25200),
        subLines: [
          { name: 'Municipal Water', cy: expandMonthly(15000), bud: expandMonthly(16000), ly: expandMonthly(14500) },
          { name: 'Other Water',     cy: expandMonthly(3000),  bud: expandMonthly(3200),  ly: expandMonthly(2900) },
          { name: 'Sewer',           cy: expandMonthly(8000),  bud: expandMonthly(8500),  ly: expandMonthly(7800) },
        ],
      },
      {
        name: 'Waste',
        cy: expandMonthly(12000), bud: expandMonthly(12600), ly: expandMonthly(11550),
        subLines: [
          { name: 'Composted Waste', cy: expandMonthly(2000), bud: expandMonthly(2100), ly: expandMonthly(1900) },
          { name: 'Other Diverted',  cy: expandMonthly(1500), bud: expandMonthly(1600), ly: expandMonthly(1450) },
          { name: 'Recycled Waste',  cy: expandMonthly(2500), bud: expandMonthly(2600), ly: expandMonthly(2400) },
          { name: 'Waste Removal',   cy: expandMonthly(6000), bud: expandMonthly(6300), ly: expandMonthly(5800) },
        ],
      },
    ],
  },
  {
    name: 'Property Operation and Maintenance',
    cy: expandMonthly(160500), bud: expandMonthly(154650), ly: expandMonthly(156810),
    subLines: [
      {
        // ── Labor Cost and Related Expenses (Property O&M) ───────
        name: 'Labor Cost and Related Expenses',
        cy: expandMonthly(83000), bud: expandMonthly(80050), ly: expandMonthly(81010),
        subLines: [
          {
            name: 'Salaries and Wages',
            cy: expandMonthly(60000), bud: expandMonthly(57600), ly: expandMonthly(58775),
            subLines: [
              { name: 'S & W Management',         cy: expandMonthly(25000), bud: expandMonthly(24000), ly: expandMonthly(24500) },
              { name: 'S & W Non Management',     cy: expandMonthly(25000), bud: expandMonthly(24000), ly: expandMonthly(24500) },
              { name: 'S & W Overtime',           cy: expandMonthly(4000),  bud: expandMonthly(3800),  ly: expandMonthly(3900) },
              { name: 'Other Salaries and Wages', cy: expandMonthly(2000),  bud: expandMonthly(1950),  ly: expandMonthly(1975) },
              { name: 'Outside Labor',            cy: expandMonthly(4000),  bud: expandMonthly(3850),  ly: expandMonthly(3900) },
            ],
          },
          {
            name: 'Bonuses and Incentives',
            cy: expandMonthly(4000), bud: expandMonthly(3840), ly: expandMonthly(3920),
            subLines: [
              { name: 'Commissions',            cy: expandMonthly(1000), bud: expandMonthly(950),  ly: expandMonthly(975) },
              { name: 'Incentive Bonus',        cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1475) },
              { name: 'Local Bonus',            cy: expandMonthly(800),  bud: expandMonthly(760),  ly: expandMonthly(780) },
              { name: 'Other Incentive Awards', cy: expandMonthly(700),  bud: expandMonthly(680),  ly: expandMonthly(690) },
            ],
          },
          {
            name: 'Government-Mandated Payroll Taxes',
            cy: expandMonthly(7000), bud: expandMonthly(6760), ly: expandMonthly(6875),
            subLines: [
              { name: 'Miscellaneous Payroll Taxes',      cy: expandMonthly(800),  bud: expandMonthly(780),  ly: expandMonthly(790) },
              { name: 'National Retirement Contribution', cy: expandMonthly(2500), bud: expandMonthly(2400), ly: expandMonthly(2450) },
              { name: 'Payroll Related Taxes - Other',    cy: expandMonthly(700),  bud: expandMonthly(680),  ly: expandMonthly(690) },
              { name: 'Social Security - 1',              cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1475) },
              { name: 'Social Security - 2',              cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1470) },
            ],
          },
          {
            name: 'Supplemental Pay',
            cy: expandMonthly(4000), bud: expandMonthly(3850), ly: expandMonthly(3920),
            subLines: [
              { name: '13 Month Pay',                 cy: expandMonthly(1000), bud: expandMonthly(950), ly: expandMonthly(975) },
              { name: 'Holiday Pay',                  cy: expandMonthly(700),  bud: expandMonthly(680), ly: expandMonthly(690) },
              { name: 'Paid Time Off',                cy: expandMonthly(700),  bud: expandMonthly(680), ly: expandMonthly(690) },
              { name: 'Severance Pay',                cy: expandMonthly(500),  bud: expandMonthly(480), ly: expandMonthly(490) },
              { name: 'Vacation Accrual',             cy: expandMonthly(700),  bud: expandMonthly(680), ly: expandMonthly(685) },
              { name: 'Workers Compensation Expense', cy: expandMonthly(400),  bud: expandMonthly(380), ly: expandMonthly(390) },
            ],
          },
          {
            name: 'Employee Benefits',
            cy: expandMonthly(8000), bud: expandMonthly(8000), ly: expandMonthly(7520),
            subLines: [
              { name: 'Group Life Insurance',          cy: expandMonthly(1000), bud: expandMonthly(1000), ly: expandMonthly(940) },
              { name: 'Housing & Educational',         cy: expandMonthly(2500), bud: expandMonthly(2500), ly: expandMonthly(2350) },
              { name: 'Matched Savings Expense',       cy: expandMonthly(1200), bud: expandMonthly(1200), ly: expandMonthly(1130) },
              { name: 'Meals',                         cy: expandMonthly(1800), bud: expandMonthly(1800), ly: expandMonthly(1690) },
              { name: 'National Disability Insurance', cy: expandMonthly(1000), bud: expandMonthly(1000), ly: expandMonthly(940) },
              { name: 'Other Employee Benefits 2',     cy: expandMonthly(500),  bud: expandMonthly(500),  ly: expandMonthly(470) },
            ],
          },
        ],
      },
      {
        // ── Other Expenses (Property O&M) ────────────────────────
        name: 'Other Expenses',
        cy: expandMonthly(77500), bud: expandMonthly(74600), ly: expandMonthly(75800),
        subLines: [
          { name: 'Beach Maintenance & Landscaping',   cy: expandMonthly(3000), bud: expandMonthly(2900), ly: expandMonthly(2950) },
          { name: 'Building Curtain & Drapes',         cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1475) },
          { name: 'Building R&M',                      cy: expandMonthly(8000), bud: expandMonthly(7700), ly: expandMonthly(7800) },
          { name: 'Comp Other Gifts & Services',       cy: expandMonthly(500),  bud: expandMonthly(480),  ly: expandMonthly(490) },
          { name: 'Contract Pest Control',             cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1475) },
          { name: 'Contract Services General',         cy: expandMonthly(3000), bud: expandMonthly(2900), ly: expandMonthly(2950) },
          { name: 'Electrical & Mechanical',           cy: expandMonthly(4000), bud: expandMonthly(3850), ly: expandMonthly(3900) },
          { name: 'Electrical Equipment',              cy: expandMonthly(2500), bud: expandMonthly(2400), ly: expandMonthly(2450) },
          { name: 'Elevators and Escalators',          cy: expandMonthly(3500), bud: expandMonthly(3400), ly: expandMonthly(3450) },
          { name: 'Employee Education and Training',   cy: expandMonthly(800),  bud: expandMonthly(780),  ly: expandMonthly(790) },
          { name: 'Engineering Supplies',              cy: expandMonthly(2000), bud: expandMonthly(1950), ly: expandMonthly(1975) },
          { name: 'Equipment Rental',                  cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1475) },
          { name: 'Express Mail & Courier',            cy: expandMonthly(300),  bud: expandMonthly(290),  ly: expandMonthly(295) },
          { name: 'Furniture & Equipment',             cy: expandMonthly(3000), bud: expandMonthly(2900), ly: expandMonthly(2950) },
          { name: 'General Office Supplies',           cy: expandMonthly(800),  bud: expandMonthly(780),  ly: expandMonthly(790) },
          { name: 'Grounds Maintenance & Landscaping', cy: expandMonthly(4000), bud: expandMonthly(3850), ly: expandMonthly(3900) },
          { name: 'HVAC Equipment',                    cy: expandMonthly(5000), bud: expandMonthly(4800), ly: expandMonthly(4900) },
          { name: 'Kitchen Equipment',                 cy: expandMonthly(2500), bud: expandMonthly(2400), ly: expandMonthly(2450) },
          { name: 'Laundry Equipment',                 cy: expandMonthly(2000), bud: expandMonthly(1950), ly: expandMonthly(1975) },
          { name: 'Life Safety',                       cy: expandMonthly(1800), bud: expandMonthly(1750), ly: expandMonthly(1775) },
          { name: 'Light Bulbs',                       cy: expandMonthly(1200), bud: expandMonthly(1150), ly: expandMonthly(1175) },
          { name: 'Locks and Keys',                    cy: expandMonthly(800),  bud: expandMonthly(780),  ly: expandMonthly(790) },
          { name: 'Maintenance Contracts Other',       cy: expandMonthly(3000), bud: expandMonthly(2900), ly: expandMonthly(2950) },
          { name: 'Maintenance Contracts Phone',       cy: expandMonthly(1000), bud: expandMonthly(950),  ly: expandMonthly(975) },
          { name: 'Mechanical R&M',                    cy: expandMonthly(4000), bud: expandMonthly(3850), ly: expandMonthly(3900) },
          { name: 'Miscellaneous Expense',             cy: expandMonthly(1000), bud: expandMonthly(950),  ly: expandMonthly(975) },
          { name: 'OS Operating Equipment',            cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1475) },
          { name: 'OS Operating Supplies',             cy: expandMonthly(2000), bud: expandMonthly(1950), ly: expandMonthly(1975) },
          { name: 'Painting and Wallcovering',         cy: expandMonthly(2500), bud: expandMonthly(2400), ly: expandMonthly(2450) },
          { name: 'Plumbing',                          cy: expandMonthly(3000), bud: expandMonthly(2900), ly: expandMonthly(2950) },
          { name: 'Signs',                             cy: expandMonthly(800),  bud: expandMonthly(780),  ly: expandMonthly(790) },
          { name: 'Swimming Pool',                     cy: expandMonthly(2000), bud: expandMonthly(1950), ly: expandMonthly(1975) },
          { name: 'Travel Expense Auto',               cy: expandMonthly(600),  bud: expandMonthly(580),  ly: expandMonthly(590) },
          { name: 'Travel Expense Other',              cy: expandMonthly(600),  bud: expandMonthly(580),  ly: expandMonthly(590) },
          { name: 'Uniform Costs',                     cy: expandMonthly(500),  bud: expandMonthly(480),  ly: expandMonthly(490) },
          { name: 'Uniform Laundry In House',          cy: expandMonthly(300),  bud: expandMonthly(290),  ly: expandMonthly(295) },
          { name: 'Vehicle Repair',                    cy: expandMonthly(1500), bud: expandMonthly(1450), ly: expandMonthly(1475) },
        ],
      },
    ],
  },
  {
    name: 'Management Fees',
    cy: expandMonthly(66990), bud: expandMonthly(77008), ly: expandMonthly(71500),
  },
];

// Data-viz palette for composition segments — one per expense line in order.
// Brand-categorical: anchored on navy/teal/aqua, then harmonious supporting
// hues for maximum segment distinction while staying on-brand.
const SEGMENT_COLORS = [
  '#172951', // navy (primary)
  '#00AFAD', // teal (accent)
  '#69D9D0', // aqua (accent-light)
  '#3B6FB6', // blue
  '#7C5CE0', // violet
  '#E08A3C', // amber
  '#C2557A', // muted rose
  '#4FA88A', // sage
  '#6B7A99', // slate
  '#B0BAC9', // light slate
];

// Row label shade by nesting depth. Darker (primary) at the top, lighter
// (muted) deeper down. Index clamps to the last entry for any deeper level.
//   0 = department · 1 = subcategory · 2 = sub-sub-category · 3+ = leaf line
const ROW_TEXT_BY_DEPTH: { color: string; weight: number }[] = [
  { color: 'var(--primary)',        weight: 600 },
  { color: 'var(--primary)',        weight: 500 },
  { color: 'var(--text-secondary)', weight: 500 },
  { color: 'var(--text-muted)',     weight: 400 },
];

// Pick a scalar from a 12-month series for the active timeframe. MTD returns
// the selected month; YTD sums Jan..selectedMonth inclusive.
function pickMonthly(series: MonthlySeries | null, monthIdx: number, tf: Timeframe): number {
  if (!series) return 0;
  const idx = monthIdx >= 0 ? monthIdx : 11;
  if (tf === 'MTD') return series[idx] ?? 0;
  return series.slice(0, idx + 1).reduce((a, b) => a + b, 0);
}

// Collapse a MonthlyLineItem (raw) into a LineItem (scalar) for the current view.
// Recurses through subLines so nested categories collapse to the same shape.
// `reported`: a parent (has subLines) is always reported; a leaf is reported
// only if it carries an actuals series (cy != null).
function viewItem(it: MonthlyLineItem, monthIdx: number, tf: Timeframe): LineItem {
  return {
    name: it.name,
    act: pickMonthly(it.cy, monthIdx, tf),
    bud: pickMonthly(it.bud, monthIdx, tf),
    actLy: pickMonthly(it.ly, monthIdx, tf),
    reported: it.subLines?.length ? true : it.cy != null,
    subLines: it.subLines?.map((sl) => viewItem(sl, monthIdx, tf)),
  };
}

// Live filter: drop leaves with no reported actual, then drop any parent left
// with zero visible children. The full catalog stays in the source data; this
// only controls what renders. With every leaf carrying a mock series today,
// nothing is pruned — once real data lands with null (unreported) leaves, those
// rows disappear automatically. Totals are unaffected (they read parent-level
// series, not the sum of visible leaves).
function pruneUnreported(items: LineItem[]): LineItem[] {
  return items
    .map((it) =>
      it.subLines ? { ...it, subLines: pruneUnreported(it.subLines) } : it,
    )
    .filter((it) => (it.subLines ? it.subLines.length > 0 : it.reported));
}

// Sum a field (cy/bud/ly) across a list of monthly items, month-by-month.
// Used by the progression chart to build the 12-point scope series. A null
// series (unreported leaf) contributes 0.
function sumMonthlySeries(items: MonthlyLineItem[], field: 'cy' | 'bud' | 'ly'): MonthlySeries {
  return Array.from({ length: 12 }, (_, i) =>
    items.reduce((s, it) => s + (it[field]?.[i] ?? 0), 0),
  );
}

const sum = (items: LineItem[], key: 'act' | 'bud' | 'actLy') =>
  items.reduce((s, i) => s + i[key], 0);

function fmtMoneyShort(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
}

function fmtVarDollar(v: number) {
  const sign = v > 0 ? '+' : v < 0 ? '-' : '';
  return `${sign}${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function fmtPct(v: number) {
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

// Guard against divide-by-zero when a base (e.g. Budget or LY actual) is 0.
function safePct(diff: number, base: number) {
  return base !== 0 ? (diff / base) * 100 : 0;
}

// Expense semantics: ACT > BUD is UNFAVORABLE (over budget → red).
// ACT < BUD is FAVORABLE (under budget → green).
function varColor(act: number, bud: number) {
  if (act > bud) return 'var(--danger)';
  if (act < bud) return 'var(--success)';
  return 'var(--text-secondary)';
}

function varBg(act: number, bud: number) {
  if (act > bud) return 'rgba(239, 68, 68, 0.1)';
  if (act < bud) return 'rgba(16, 185, 129, 0.1)';
  return 'transparent';
}

export default function ExpensesPage() {
  const [hotel, setHotel] = useState<string>('Fort');
  const [year, setYear] = useState<string>('2026');
  const [month, setMonth] = useState<string>('March');
  const [timeframe, setTimeframe] = useState<Timeframe>('MTD');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const monthIdx = MONTHS.indexOf(month as typeof MONTHS[number]);

  // Collapse the raw monthly data into the scalar view shape once per
  // (month, timeframe) change — every downstream component reads from here.
  const viewedDept = useMemo(
    () => pruneUnreported(DEPT_COSTS.map((it) => viewItem(it, monthIdx, timeframe))),
    [monthIdx, timeframe],
  );
  const viewedNonDist = useMemo(
    () => pruneUnreported(NON_DISTRIBUTED.map((it) => viewItem(it, monthIdx, timeframe))),
    [monthIdx, timeframe],
  );
  const allItems = useMemo(() => [...viewedDept, ...viewedNonDist], [viewedDept, viewedNonDist]);

  const viewedGroups = useMemo<Group[]>(
    () => [
      { key: 'dept', label: 'Grand Total Dept Costs', items: viewedDept },
      { key: 'nondist', label: 'Grand Total Non-Distributed', items: viewedNonDist },
    ],
    [viewedDept, viewedNonDist],
  );

  const totals = useMemo(() => {
    const deptAct = sum(viewedDept, 'act');
    const deptBud = sum(viewedDept, 'bud');
    const deptLy = sum(viewedDept, 'actLy');
    const ndAct = sum(viewedNonDist, 'act');
    const ndBud = sum(viewedNonDist, 'bud');
    const ndLy = sum(viewedNonDist, 'actLy');
    const gtAct = deptAct + ndAct;
    const gtBud = deptBud + ndBud;
    const gtLy = deptLy + ndLy;
    return { deptAct, deptBud, deptLy, ndAct, ndBud, ndLy, gtAct, gtBud, gtLy };
  }, [viewedDept, viewedNonDist]);

  // Rank variance drivers by absolute dollar size.
  const drivers = useMemo(() => {
    const withVar = allItems.map((it) => ({
      name: it.name.replace(/^Total /, ''),
      act: it.act,
      bud: it.bud,
      diff: it.act - it.bud,
      pct: it.bud !== 0 ? ((it.act - it.bud) / it.bud) * 100 : 0,
    }));
    const overruns = withVar.filter((d) => d.diff > 0).sort((a, b) => b.diff - a.diff).slice(0, 5);
    const savings = withVar.filter((d) => d.diff < 0).sort((a, b) => a.diff - b.diff).slice(0, 5);
    return { overruns, savings };
  }, [allItems]);

  const netVar = totals.gtAct - totals.gtBud;

  return (
    <div className="flex flex-col gap-5" style={{ color: 'var(--text-primary)' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <span className="hover:underline cursor-pointer">Dashboard</span>
        <ChevronRight size={14} />
        <span className="hover:underline cursor-pointer">Bottom Line</span>
        <ChevronRight size={14} />
        <span className="hover:underline cursor-pointer">Expenses</span>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--primary)' }}>Departmental</span>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight m-0" style={{ color: 'var(--primary)' }}>
          Expenses
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Operating expense performance vs Budget and Last Year
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          className="h-9 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
          style={selectStyle}
          value={hotel}
          onChange={(e) => setHotel(e.target.value)}
        >
          {HOTELS.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <select
          className="h-9 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
          style={selectStyle}
          value={year}
          onChange={(e) => setYear(e.target.value)}
        >
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          className="h-9 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
          style={selectStyle}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        >
          {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        {/* MTD / YTD segmented toggle */}
        <div className="flex h-9 rounded-md border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          {(['MTD', 'YTD'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className="px-3.5 text-[0.8125rem] font-medium cursor-pointer transition-colors border-none"
              style={{
                background: timeframe === t ? 'var(--muted)' : 'transparent',
                color: timeframe === t ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: timeframe === t ? 600 : 500,
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-3 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1">
        <KpiCard
          label="Grand Total Expenses"
          value={fmtMoneyShort(totals.gtAct)}
          sub={`vs BUD ${fmtVarDollar(totals.gtAct - totals.gtBud)} · vs LY ${fmtVarDollar(totals.gtAct - totals.gtLy)}`}
          color="var(--primary)"
          accent="var(--primary)"
        />
        <KpiCard
          label="Dept Costs"
          value={fmtMoneyShort(totals.deptAct)}
          sub={`vs BUD ${fmtVarDollar(totals.deptAct - totals.deptBud)} · vs LY ${fmtVarDollar(totals.deptAct - totals.deptLy)}`}
          color="var(--primary)"
          accent="var(--accent)"
        />
        <KpiCard
          label="Non-Distributed"
          value={fmtMoneyShort(totals.ndAct)}
          sub={`vs BUD ${fmtVarDollar(totals.ndAct - totals.ndBud)} · vs LY ${fmtVarDollar(totals.ndAct - totals.ndLy)}`}
          color="var(--primary)"
          accent="var(--accent-light)"
        />
        <KpiCard
          label="Net Variance vs Budget"
          value={fmtVarDollar(netVar)}
          sub={netVar < 0 ? 'Favorable' : netVar > 0 ? 'Unfavorable' : 'On budget'}
          color="var(--primary)"
          accent="var(--accent)"
        />
      </div>

      {/* Variance drivers */}
      <VarianceDrivers
        overruns={drivers.overruns}
        savings={drivers.savings}
      />

      {/* Detailed breakdown */}
      <DetailedBreakdown
        groups={viewedGroups}
        totals={totals}
        expandedRows={expandedRows}
        toggleRow={toggleRow}
      />

      {/* Expense composition */}
      <ExpenseComposition items={allItems} />

      {/* Expense progression */}
      <ExpenseProgression currentMonthIndex={monthIdx} />
    </div>
  );
}

// ─── Variance drivers ─────────────────────────────────────────
function VarianceDrivers({
  overruns,
  savings,
}: {
  overruns: { name: string; act: number; bud: number; diff: number; pct: number }[];
  savings: { name: string; act: number; bud: number; diff: number; pct: number }[];
}) {
  // Bars now show Actual vs Budget per driver, so scale to the largest of
  // either value across the rows (not the variance magnitude).
  const maxOver = Math.max(...overruns.flatMap((o) => [o.act, o.bud]), 1);
  const maxSave = Math.max(...savings.flatMap((s) => [s.act, s.bud]), 1);

  return (
    <div>
      <SectionHeader title="Variance Drivers vs Budget" />
      <div className="grid grid-cols-2 gap-5 max-[900px]:grid-cols-1">
        <DriverCard
          title="Overruns"
          subtitle="Exceeded Budget"
          color="var(--danger)"
          icon={<TrendingUp size={16} />}
          rows={overruns}
          max={maxOver}
          sign="+"
        />
        <DriverCard
          title="Savings"
          subtitle="Below Budget"
          color="var(--success)"
          icon={<TrendingDown size={16} />}
          rows={savings}
          max={maxSave}
          sign="−"
        />
      </div>
    </div>
  );
}

function DriverCard({
  title, subtitle, color, icon, rows, max, sign,
}: {
  title: string;
  subtitle: string;
  color: string;
  icon: React.ReactNode;
  rows: { name: string; act: number; bud: number; diff: number; pct: number }[];
  max: number;
  sign: string;
}) {
  // Actual = solid (dark) card color · Budget = same hue, faded (opaque tint).
  const budTint = `color-mix(in srgb, ${color} 28%, transparent)`;
  return (
    <div
      className="bg-white border rounded-lg p-5 flex flex-col gap-4"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span style={{ color }}>{icon}</span>
          <div>
            <div className="text-sm font-bold" style={{ color }}>{title}</div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{subtitle}</div>
          </div>
        </div>
        {/* Legend: dark = Actual, faded = Budget */}
        <div className="flex items-center gap-3 text-[0.625rem]" style={{ color: 'var(--text-muted)' }}>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: color }} />Actual
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: budTint }} />Budget
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        {rows.map((r) => {
          const actWidth = (r.act / max) * 100;
          const budWidth = (r.bud / max) * 100;
          return (
            <div key={r.name} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[0.8125rem] font-medium truncate" style={{ color: 'var(--primary)' }}>
                  {r.name}
                </div>
                <div className="mt-1.5 flex flex-col gap-1">
                  {/* Actual — solid */}
                  <div className="h-2 rounded-sm" style={{ background: 'var(--muted)' }}>
                    <div className="h-full rounded-sm" style={{ width: `${actWidth}%`, background: color }} />
                  </div>
                  {/* Budget — faded */}
                  <div className="h-2 rounded-sm" style={{ background: 'var(--muted)' }}>
                    <div className="h-full rounded-sm" style={{ width: `${budWidth}%`, background: budTint }} />
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0 w-[110px]">
                <div className="text-[0.8125rem] font-semibold" style={{ color }}>
                  {sign}${Math.abs(r.diff).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[0.6875rem]" style={{ color: 'var(--text-muted)' }}>
                  {sign}{Math.abs(r.pct).toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Expense composition ──────────────────────────────────────
function ExpenseComposition({ items }: { items: LineItem[] }) {
  const totalAct = items.reduce((s, i) => s + i.act, 0);
  const totalBud = items.reduce((s, i) => s + i.bud, 0);

  const labels = items.map((i) => i.name.replace(/^Total /, ''));

  return (
    <div>
      <SectionHeader
        title="Expense Composition"
        subtitle="Actual vs Budget"
      />
      <div
        className="bg-white border rounded-lg p-5 flex flex-col gap-4"
        style={{ borderColor: 'var(--border)' }}
      >
        <StackedBar label="Actual" items={items} total={totalAct} accessor="act" />
        <StackedBar label="Budget" items={items} total={totalBud} accessor="bud" />
        <Legend labels={labels} />
      </div>
    </div>
  );
}

function StackedBar({
  label, items, total, accessor,
}: {
  label: string;
  items: LineItem[];
  total: number;
  accessor: 'act' | 'bud';
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[0.8125rem] font-semibold" style={{ color: 'var(--primary)' }}>
          {label}
        </span>
        <span className="text-[0.8125rem]" style={{ color: 'var(--text-secondary)' }}>
          {fmtMoneyShort(total)}
        </span>
      </div>
      <div
        className="h-10 rounded-md overflow-hidden flex border"
        style={{ borderColor: 'var(--border)' }}
      >
        {items.map((it, idx) => {
          const pct = (it[accessor] / total) * 100;
          const color = SEGMENT_COLORS[idx % SEGMENT_COLORS.length];
          const short = it.name.replace(/^Total /, '');
          return (
            <div
              key={it.name}
              title={`${short}: ${fmtMoneyShort(it[accessor])} (${pct.toFixed(1)}%)`}
              className="h-full flex items-center justify-center text-[0.6875rem] font-semibold text-white overflow-hidden whitespace-nowrap px-1"
              style={{ width: `${pct}%`, background: color }}
            >
              {pct >= 6 ? short : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Legend({ labels }: { labels: string[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
      {labels.map((l, idx) => (
        <div key={l} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span
            className="w-3 h-3 rounded-sm inline-block"
            style={{ background: SEGMENT_COLORS[idx % SEGMENT_COLORS.length] }}
          />
          {l}
        </div>
      ))}
    </div>
  );
}

// ─── Detailed breakdown table ─────────────────────────────────
function DetailedBreakdown({
  groups, totals, expandedRows, toggleRow,
}: {
  groups: Group[];
  totals: {
    deptAct: number; deptBud: number; deptLy: number;
    ndAct: number; ndBud: number; ndLy: number;
    gtAct: number; gtBud: number; gtLy: number;
  };
  expandedRows: Set<string>;
  toggleRow: (key: string) => void;
}) {
  return (
    <div>
      <SectionHeader
        title="Detailed Breakdown"
        subtitle="Click any department to expand sub-lines"
      />
      <div
        className="bg-white border rounded-lg overflow-hidden"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[0.8125rem]">
            <thead>
              <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                {['Department', 'ACT', 'BUD', 'Var. $', 'Var. %', 'ACT LY', 'Var. $ LY', 'Var. % LY'].map((h, i) => (
                  <th
                    key={h}
                    className="px-3.5 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{
                      color: 'var(--text-secondary)',
                      textAlign: i === 0 ? 'left' : 'right',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <GroupRows
                  key={g.key}
                  group={g}
                  expandedRows={expandedRows}
                  toggleRow={toggleRow}
                  subtotalLabel={g.label}
                  subtotal={
                    g.key === 'dept'
                      ? { act: totals.deptAct, bud: totals.deptBud, actLy: totals.deptLy }
                      : { act: totals.ndAct, bud: totals.ndBud, actLy: totals.ndLy }
                  }
                />
              ))}
              <GrandTotalRow act={totals.gtAct} bud={totals.gtBud} actLy={totals.gtLy} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GroupRows({
  group, expandedRows, toggleRow, subtotalLabel, subtotal,
}: {
  group: Group;
  expandedRows: Set<string>;
  toggleRow: (k: string) => void;
  subtotalLabel: string;
  subtotal: { act: number; bud: number; actLy: number };
}) {
  return (
    <>
      <ItemRows
        items={group.items}
        parentKey={group.key}
        expandedRows={expandedRows}
        toggleRow={toggleRow}
        depth={0}
      />
      <SubtotalRow label={subtotalLabel} act={subtotal.act} bud={subtotal.bud} actLy={subtotal.actLy} />
    </>
  );
}

// Recursive renderer for nested expense items. Each level descends via the
// item's own subLines and gets a deeper indent. Keys cascade through
// parentKey so independent branches don't collide in the expanded set.
function ItemRows({
  items, parentKey, expandedRows, toggleRow, depth,
}: {
  items: LineItem[];
  parentKey: string;
  expandedRows: Set<string>;
  toggleRow: (k: string) => void;
  depth: number;
}) {
  return (
    <>
      {items.map((it) => {
        const key = `${parentKey}::${it.name}`;
        const hasChildren = !!it.subLines?.length;
        const isExpanded = hasChildren && expandedRows.has(key);
        return (
          <Fragment key={key}>
            <DataRow
              name={it.name}
              act={it.act}
              bud={it.bud}
              actLy={it.actLy}
              expandable={hasChildren}
              expanded={isExpanded}
              onToggle={() => toggleRow(key)}
              depth={depth}
            />
            {isExpanded && (
              <ItemRows
                items={it.subLines!}
                parentKey={key}
                expandedRows={expandedRows}
                toggleRow={toggleRow}
                depth={depth + 1}
              />
            )}
          </Fragment>
        );
      })}
    </>
  );
}

function DataRow({
  name, act, bud, actLy, expandable, expanded, onToggle, depth = 0,
}: {
  name: string;
  act: number;
  bud: number;
  actLy: number;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  depth?: number;
}) {
  const diffBud = act - bud;
  const diffLy = act - actLy;
  const pctBud = safePct(diffBud, bud);
  const pctLy = safePct(diffLy, actLy);
  const budColor = varColor(act, bud);
  const budBg = varBg(act, bud);
  const lyColor = varColor(act, actLy);
  const lyBg = varBg(act, actLy);

  // Text shade darkens-to-lightens with depth so each level is visually
  // distinct: department/subcategory are darkest (primary), sub-sub-categories
  // lighter (secondary), and the deepest leaf lines lightest (muted).
  const tier = ROW_TEXT_BY_DEPTH[Math.min(depth, ROW_TEXT_BY_DEPTH.length - 1)];
  const indented = depth > 0;
  const paddingLeft = depth === 0 ? undefined : 14 + depth * 24;

  return (
    <tr
      className={`border-b transition-colors ${expandable ? 'cursor-pointer hover:bg-[var(--bg-hover)]' : ''}`}
      style={{ borderColor: 'var(--border)', background: indented ? 'rgba(245,245,245,0.6)' : undefined }}
      onClick={expandable ? onToggle : undefined}
    >
      <td
        className="px-3.5 py-2.5 font-medium whitespace-nowrap"
        style={{
          paddingLeft,
          color: tier.color,
          fontWeight: tier.weight,
        }}
      >
        <span className="inline-flex items-center gap-1.5">
          {expandable && (
            expanded
              ? <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
              : <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
          )}
          {!expandable && !indented && <span className="w-[14px] inline-block" />}
          {name}
        </span>
      </td>
      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
        {fmtMoneyShort(act)}
      </td>
      <td className="px-3.5 py-2.5 text-right whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
        {fmtMoneyShort(bud)}
      </td>
      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
        <span
          className="inline-block px-2 py-0.5 rounded-sm font-semibold"
          style={{ color: budColor, background: budBg }}
        >
          {fmtVarDollar(diffBud)}
        </span>
      </td>
      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
        <span
          className="inline-block px-2 py-0.5 rounded-sm font-semibold"
          style={{ color: budColor, background: budBg }}
        >
          {fmtPct(pctBud)}
        </span>
      </td>
      <td className="px-3.5 py-2.5 text-right whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
        {fmtMoneyShort(actLy)}
      </td>
      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
        <span
          className="inline-block px-2 py-0.5 rounded-sm font-semibold"
          style={{ color: lyColor, background: lyBg }}
        >
          {fmtVarDollar(diffLy)}
        </span>
      </td>
      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
        <span
          className="inline-block px-2 py-0.5 rounded-sm font-semibold"
          style={{ color: lyColor, background: lyBg }}
        >
          {fmtPct(pctLy)}
        </span>
      </td>
    </tr>
  );
}

function SubtotalRow({
  label, act, bud, actLy,
}: {
  label: string;
  act: number;
  bud: number;
  actLy: number;
}) {
  const diffBud = act - bud;
  const diffLy = act - actLy;
  const pctBud = safePct(diffBud, bud);
  const pctLy = safePct(diffLy, actLy);
  const budColor = varColor(act, bud);
  const lyColor = varColor(act, actLy);

  return (
    <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
      <td className="px-3.5 py-2.5 font-bold whitespace-nowrap" style={{ color: 'var(--primary)' }}>
        {label}
      </td>
      <td className="px-3.5 py-2.5 text-right font-bold whitespace-nowrap" style={{ color: 'var(--primary)' }}>
        {fmtMoneyShort(act)}
      </td>
      <td className="px-3.5 py-2.5 text-right font-bold whitespace-nowrap" style={{ color: 'var(--primary)' }}>
        {fmtMoneyShort(bud)}
      </td>
      <td className="px-3.5 py-2.5 text-right font-bold whitespace-nowrap" style={{ color: budColor }}>
        {fmtVarDollar(diffBud)}
      </td>
      <td className="px-3.5 py-2.5 text-right font-bold whitespace-nowrap" style={{ color: budColor }}>
        {fmtPct(pctBud)}
      </td>
      <td className="px-3.5 py-2.5 text-right font-bold whitespace-nowrap" style={{ color: 'var(--primary)' }}>
        {fmtMoneyShort(actLy)}
      </td>
      <td className="px-3.5 py-2.5 text-right font-bold whitespace-nowrap" style={{ color: lyColor }}>
        {fmtVarDollar(diffLy)}
      </td>
      <td className="px-3.5 py-2.5 text-right font-bold whitespace-nowrap" style={{ color: lyColor }}>
        {fmtPct(pctLy)}
      </td>
    </tr>
  );
}

function GrandTotalRow({ act, bud, actLy }: { act: number; bud: number; actLy: number }) {
  const diffBud = act - bud;
  const diffLy = act - actLy;
  const pctBud = safePct(diffBud, bud);
  const pctLy = safePct(diffLy, actLy);
  // Expenses: lower is better, so positive variance = danger, negative = success.
  const budColor = diffBud <= 0 ? 'var(--success)' : 'var(--danger)';
  const lyColor = diffLy <= 0 ? 'var(--success)' : 'var(--danger)';

  return (
    <tr style={{ background: 'var(--border)' }}>
      <td className="px-3.5 py-3 font-bold whitespace-nowrap" style={{ color: 'var(--primary)' }}>GRAND TOTAL EXPENSES</td>
      <td className="px-3.5 py-3 text-right font-bold whitespace-nowrap" style={{ color: 'var(--primary)' }}>
        {fmtMoneyShort(act)}
      </td>
      <td className="px-3.5 py-3 text-right font-bold whitespace-nowrap" style={{ color: 'var(--primary)' }}>
        {fmtMoneyShort(bud)}
      </td>
      <td className="px-3.5 py-3 text-right font-bold whitespace-nowrap" style={{ color: budColor }}>
        {fmtVarDollar(diffBud)}
      </td>
      <td className="px-3.5 py-3 text-right font-bold whitespace-nowrap" style={{ color: budColor }}>
        {fmtPct(pctBud)}
      </td>
      <td className="px-3.5 py-3 text-right font-bold whitespace-nowrap" style={{ color: 'var(--primary)' }}>
        {fmtMoneyShort(actLy)}
      </td>
      <td className="px-3.5 py-3 text-right font-bold whitespace-nowrap" style={{ color: lyColor }}>
        {fmtVarDollar(diffLy)}
      </td>
      <td className="px-3.5 py-3 text-right font-bold whitespace-nowrap" style={{ color: lyColor }}>
        {fmtPct(pctLy)}
      </td>
    </tr>
  );
}

// ─── Expense progression ──────────────────────────────────────
const SCOPE_LABEL: Record<TrendScope, string> = {
  dept: 'Dept Costs',
  nondist: 'Non-Distributed',
  total: 'Total Expenses',
};

function ExpenseProgression({ currentMonthIndex }: { currentMonthIndex: number }) {
  const [scope, setScope] = useState<TrendScope>('total');

  const scopeItems = useMemo(() => {
    if (scope === 'dept') return DEPT_COSTS;
    if (scope === 'nondist') return NON_DISTRIBUTED;
    return [...DEPT_COSTS, ...NON_DISTRIBUTED];
  }, [scope]);

  const series = useMemo(() => ({
    cy: sumMonthlySeries(scopeItems, 'cy'),
    bud: sumMonthlySeries(scopeItems, 'bud'),
    ly: sumMonthlySeries(scopeItems, 'ly'),
  }), [scopeItems]);

  const safeIdx = currentMonthIndex >= 0 ? currentMonthIndex : 11;

  const currentCy = series.cy[safeIdx];
  const currentBud = series.bud[safeIdx];
  const currentLy = series.ly[safeIdx];
  const budDelta = currentCy - currentBud;
  const budPct = currentBud ? (budDelta / currentBud) * 100 : 0;
  const lyDelta = currentCy - currentLy;
  const lyPct = currentLy ? (lyDelta / currentLy) * 100 : 0;

  // For expenses, lower is better: negative delta = success, positive = danger.
  const budColor = budDelta <= 0 ? 'var(--success)' : 'var(--danger)';
  const lyColor = lyDelta <= 0 ? 'var(--success)' : 'var(--danger)';

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold m-0" style={{ color: 'var(--primary)' }}>
            Expense Progression
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Current Year vs Last Year — {SCOPE_LABEL[scope]}
          </p>
        </div>
        <div className="flex h-9 rounded-md border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          {(['dept', 'nondist', 'total'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className="px-3.5 text-[0.8125rem] font-medium cursor-pointer transition-colors border-none whitespace-nowrap"
              style={{
                background: scope === s ? 'var(--muted)' : 'transparent',
                color: scope === s ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: scope === s ? 600 : 500,
              }}
            >
              {SCOPE_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div
        className="bg-white border rounded-lg p-5 flex flex-col gap-4"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Summary strip */}
        <div className="flex gap-6 flex-wrap">
          <MiniStat label={`${MONTHS_SHORT[safeIdx]} actual`} value={fmtMoneyShort(currentCy)} />
          <MiniStat
            label="vs Budget"
            value={`${budDelta > 0 ? '+' : ''}${budPct.toFixed(1)}%`}
            valueColor={budColor}
          />
          <MiniStat
            label="vs LY same month"
            value={`${lyDelta > 0 ? '+' : ''}${lyPct.toFixed(1)}%`}
            valueColor={lyColor}
          />
        </div>

        <ProgressionChart
          cy={series.cy}
          bud={series.bud}
          ly={series.ly}
          currentIdx={safeIdx}
        />

        {/* Legend */}
        <div className="flex items-center gap-5 text-xs pt-1 flex-wrap" style={{ color: 'var(--text-secondary)' }}>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-5 h-0.5" style={{ background: 'var(--primary)' }} />
            Current Year
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block w-5 h-0"
              style={{ borderTop: '2px dashed var(--accent)' }}
            />
            Budget
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block w-5 h-0"
              style={{ borderTop: '2px dotted var(--text-secondary)' }}
            />
            Last Year
          </span>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <div className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="text-base font-bold" style={{ color: valueColor ?? 'var(--primary)' }}>
        {value}
      </div>
    </div>
  );
}

function ProgressionChart({
  cy, bud, ly, currentIdx,
}: {
  cy: number[];
  bud: number[];
  ly: number[];
  currentIdx: number;
}) {
  const data = MONTHS_SHORT.map((m, i) => ({
    month: m,
    cy: cy[i],
    bud: bud[i],
    ly: ly[i],
  }));
  // Tight Y domain: snap to data range with 8% breathing room so the lines use
  // most of the chart height instead of compressing near the middle.
  const allValues = [...cy, ...bud, ...ly].filter(Number.isFinite);
  const minV = Math.min(...allValues);
  const maxV = Math.max(...allValues);
  const pad = (maxV - minV) * 0.08 || maxV * 0.05 || 1;
  const yMin = Math.max(0, minV - pad);
  const yMax = maxV + pad;
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RLineChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="#E5E5E5" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="month"
            tick={(props: Record<string, unknown>) => <CurrentMonthTick x={props.x as number} y={props.y as number} payload={props.payload as { value: string; index: number }} currentIdx={currentIdx} />}
            tickLine={false}
            axisLine={{ stroke: '#E5E5E5' }}
          />
          <YAxis
            tick={{ fill: '#6B7280', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#E5E5E5' }}
            tickFormatter={(v) => fmtMoneyShort(typeof v === 'number' ? v : Number(v))}
            width={70}
            domain={[yMin, yMax]}
          />
          <Tooltip content={<ProgressionTooltip />} />
          <RLegend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            iconType="circle"
          />
          <Line
            type="monotone"
            dataKey="ly"
            name="LY"
            stroke="var(--text-secondary)"
            strokeWidth={1.75}
            strokeDasharray="2 4"
            dot={{ r: 2, fill: 'var(--text-secondary)' }}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="bud"
            name="Budget"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={{ r: 3, fill: 'var(--accent)' }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="cy"
            name="Current Year"
            stroke="var(--primary)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: 'var(--primary)' }}
            activeDot={{ r: 5 }}
          />
        </RLineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Highlights the current month tick (bold + primary color) without losing
// the default tick layout.
function CurrentMonthTick(props: {
  x?: number; y?: number; payload?: { value: string; index: number };
  currentIdx: number;
}) {
  const { x = 0, y = 0, payload, currentIdx } = props;
  const isCurrent = payload?.index === currentIdx;
  return (
    <text
      x={x}
      y={y}
      dy={16}
      textAnchor="middle"
      fontSize={12}
      fontWeight={isCurrent ? 600 : 400}
      fill={isCurrent ? 'var(--primary)' : '#6B7280'}
    >
      {payload?.value}
    </text>
  );
}

interface ProgressionPayload {
  payload: { month: string; cy: number; bud: number; ly: number };
}

// Custom tooltip — shows the three series plus variance% vs Budget and LY,
// coloring the deltas with the expense convention (lower = good).
function ProgressionTooltip({ active, payload }: { active?: boolean; payload?: ProgressionPayload[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const budDelta = p.cy - p.bud;
  const budPct = p.bud ? (budDelta / p.bud) * 100 : 0;
  const lyDelta = p.cy - p.ly;
  const lyPct = p.ly ? (lyDelta / p.ly) * 100 : 0;
  const budColor = budDelta <= 0 ? 'var(--success)' : 'var(--danger)';
  const lyColor = lyDelta <= 0 ? 'var(--success)' : 'var(--danger)';
  return (
    <div
      className="bg-white border rounded-lg px-3 py-2 shadow-sm text-xs"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="font-semibold mb-1" style={{ color: 'var(--primary)' }}>{p.month}</div>
      <div className="flex justify-between gap-4">
        <span style={{ color: 'var(--text-secondary)' }}>CY</span>
        <span className="font-semibold" style={{ color: 'var(--primary)' }}>{fmtMoneyShort(p.cy)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span style={{ color: 'var(--text-secondary)' }}>BUD</span>
        <span className="font-semibold" style={{ color: 'var(--accent)' }}>{fmtMoneyShort(p.bud)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span style={{ color: 'var(--text-secondary)' }}>LY</span>
        <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{fmtMoneyShort(p.ly)}</span>
      </div>
      <div className="font-semibold mt-1" style={{ color: budColor }}>
        vs BUD {budDelta > 0 ? '+' : ''}{budPct.toFixed(1)}%
      </div>
      <div className="font-semibold" style={{ color: lyColor }}>
        vs LY {lyDelta > 0 ? '+' : ''}{lyPct.toFixed(1)}%
      </div>
    </div>
  );
}


// ─── Shared ───────────────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-bold m-0" style={{ color: 'var(--primary)' }}>
        {title}
      </h2>
      {subtitle && (
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
