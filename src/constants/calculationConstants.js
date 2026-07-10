// src/constants/calculationConstants.js
// Cost calculation configuration constants

export const COST_CONFIG = {
  // Panel cost per piece (in rupees)
  PANEL_COST_PER_PIECE: Number(process.env.VUE_APP_PANEL_COST_PER_PIECE) || 15000,

  // Labor cost constants
  LABOR_COST_PER_PANEL: Number(process.env.VUE_APP_LABOR_COST_PER_PANEL) || 500,
  LABOR_DAYS_LOW: Number(process.env.VUE_APP_LABOR_DAYS_LOW) || 8,
  LABOR_DAYS_HIGH: Number(process.env.VUE_APP_LABOR_DAYS_HIGH) || 12,

  // Markup rates applied to total cost
  // These represent profit margins: 15%, 40%, and 50%
  MARKUP_RATE_LOW: Number(process.env.VUE_APP_MARKUP_RATE_LOW) || 1.15,    // 15% markup
  MARKUP_RATE_MEDIUM: Number(process.env.VUE_APP_MARKUP_RATE_MEDIUM) || 1.4, // 40% markup
  MARKUP_RATE_HIGH: Number(process.env.VUE_APP_MARKUP_RATE_HIGH) || 1.5,     // 50% markup

  // Cost threshold (in rupees) for determining markup tier
  COST_THRESHOLD: Number(process.env.VUE_APP_COST_THRESHOLD) || 50000,

  // Profit discount threshold
  PROFIT_THRESHOLD_FOR_DISCOUNT: Number(process.env.VUE_APP_PROFIT_THRESHOLD_FOR_DISCOUNT) || 30,
};

export const ELECTRICITY_RATES = {
  // Domestic electricity rate (units per rupee)
  DOMESTIC_RATE: Number(process.env.VUE_APP_DOMESTIC_ELECTRICITY_RATE) || 6.5,

  // Commercial electricity rate (units per rupee)
  COMMERCIAL_RATE: Number(process.env.VUE_APP_COMMERCIAL_ELECTRICITY_RATE) || 10,
};

export const VALIDATION_CONFIG = {
  // Maximum number of appliances to prevent unrealistic inputs
  MAX_APPLIANCE_COUNT: Number(process.env.VUE_APP_MAX_APPLIANCE_COUNT) || 100,

  // Maximum battery combinations to check
  MAX_BATTERY_COMBINATIONS: Number(process.env.VUE_APP_MAX_BATTERY_COMBINATIONS) || 10,
};
