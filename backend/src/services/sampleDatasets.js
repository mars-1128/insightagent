export const SAMPLE_DATASETS = [
  {
    name: 'Global Retail Sales 2025',
    originalFilename: 'sample_retail_sales_2025.csv',
    description: '48 monthly transactions across North America, Europe, and APAC covering Electronics, Furniture, Software, and Accessories with revenue, cost, profit, units sold, and customer segments.',
    columns: ['order_date', 'month', 'quarter', 'region', 'category', 'product', 'segment', 'units_sold', 'revenue', 'cost', 'profit', 'discount_pct'],
    columnTypes: {
      order_date: 'TEXT',
      month: 'TEXT',
      quarter: 'TEXT',
      region: 'TEXT',
      category: 'TEXT',
      product: 'TEXT',
      segment: 'TEXT',
      units_sold: 'NUMERIC',
      revenue: 'NUMERIC',
      cost: 'NUMERIC',
      profit: 'NUMERIC',
      discount_pct: 'NUMERIC'
    },
    rows: [
      { order_date: '2025-01-10', month: '2025-01', quarter: 'Q1', region: 'North America', category: 'Electronics', product: 'ProBook 16 Laptop', segment: 'Enterprise', units_sold: 42, revenue: 63000, cost: 41000, profit: 22000, discount_pct: 5 },
      { order_date: '2025-01-18', month: '2025-01', quarter: 'Q1', region: 'Europe', category: 'Software', product: 'CloudSync Suite', segment: 'SMB', units_sold: 110, revenue: 33000, cost: 8200, profit: 24800, discount_pct: 10 },
      { order_date: '2025-01-25', month: '2025-01', quarter: 'Q1', region: 'APAC', category: 'Furniture', product: 'ErgoDesk Standing', segment: 'Consumer', units_sold: 35, revenue: 17500, cost: 11900, profit: 5600, discount_pct: 8 },
      { order_date: '2025-01-29', month: '2025-01', quarter: 'Q1', region: 'North America', category: 'Accessories', product: 'Thunderbolt Dock', segment: 'SMB', units_sold: 95, revenue: 19000, cost: 10450, profit: 8550, discount_pct: 0 },

      { order_date: '2025-02-06', month: '2025-02', quarter: 'Q1', region: 'North America', category: 'Software', product: 'CloudSync Suite', segment: 'Enterprise', units_sold: 145, revenue: 43500, cost: 10150, profit: 33350, discount_pct: 5 },
      { order_date: '2025-02-14', month: '2025-02', quarter: 'Q1', region: 'Europe', category: 'Electronics', product: 'UltraView 4K Monitor', segment: 'SMB', units_sold: 64, revenue: 38400, cost: 25600, profit: 12800, discount_pct: 12 },
      { order_date: '2025-02-21', month: '2025-02', quarter: 'Q1', region: 'APAC', category: 'Electronics', product: 'ProBook 16 Laptop', segment: 'Enterprise', units_sold: 38, revenue: 57000, cost: 37200, profit: 19800, discount_pct: 7 },
      { order_date: '2025-02-26', month: '2025-02', quarter: 'Q1', region: 'Europe', category: 'Furniture', product: 'AeroMesh Chair', segment: 'Consumer', units_sold: 52, revenue: 20800, cost: 14560, profit: 6240, discount_pct: 15 },

      { order_date: '2025-03-04', month: '2025-03', quarter: 'Q1', region: 'North America', category: 'Electronics', product: 'UltraView 4K Monitor', segment: 'Enterprise', units_sold: 88, revenue: 52800, cost: 34320, profit: 18480, discount_pct: 5 },
      { order_date: '2025-03-12', month: '2025-03', quarter: 'Q1', region: 'APAC', category: 'Software', product: 'DataShield Pro', segment: 'Enterprise', units_sold: 130, revenue: 45500, cost: 9100, profit: 36400, discount_pct: 0 },
      { order_date: '2025-03-19', month: '2025-03', quarter: 'Q1', region: 'Europe', category: 'Accessories', product: 'Mechanical KeyPro', segment: 'Consumer', units_sold: 120, revenue: 16800, cost: 9240, profit: 7560, discount_pct: 10 },
      { order_date: '2025-03-28', month: '2025-03', quarter: 'Q1', region: 'North America', category: 'Furniture', product: 'ErgoDesk Standing', segment: 'SMB', units_sold: 46, revenue: 23000, cost: 16100, profit: 6900, discount_pct: 10 },

      { order_date: '2025-04-05', month: '2025-04', quarter: 'Q2', region: 'Europe', category: 'Software', product: 'DataShield Pro', segment: 'Enterprise', units_sold: 160, revenue: 56000, cost: 11200, profit: 44800, discount_pct: 5 },
      { order_date: '2025-04-11', month: '2025-04', quarter: 'Q2', region: 'North America', category: 'Electronics', product: 'ProBook 16 Laptop', segment: 'SMB', units_sold: 55, revenue: 82500, cost: 53625, profit: 28875, discount_pct: 6 },
      { order_date: '2025-04-19', month: '2025-04', quarter: 'Q2', region: 'APAC', category: 'Accessories', product: 'Thunderbolt Dock', segment: 'SMB', units_sold: 140, revenue: 28000, cost: 15400, profit: 12600, discount_pct: 5 },
      { order_date: '2025-04-27', month: '2025-04', quarter: 'Q2', region: 'North America', category: 'Furniture', product: 'AeroMesh Chair', segment: 'Consumer', units_sold: 40, revenue: 16000, cost: 12800, profit: 3200, discount_pct: 22 },

      { order_date: '2025-05-03', month: '2025-05', quarter: 'Q2', region: 'APAC', category: 'Electronics', product: 'UltraView 4K Monitor', segment: 'Enterprise', units_sold: 96, revenue: 57600, cost: 37440, profit: 20160, discount_pct: 4 },
      { order_date: '2025-05-14', month: '2025-05', quarter: 'Q2', region: 'North America', category: 'Software', product: 'CloudSync Suite', segment: 'Enterprise', units_sold: 190, revenue: 57000, cost: 11400, profit: 45600, discount_pct: 0 },
      { order_date: '2025-05-22', month: '2025-05', quarter: 'Q2', region: 'Europe', category: 'Electronics', product: 'ProBook 16 Laptop', segment: 'Enterprise', units_sold: 48, revenue: 72000, cost: 48240, profit: 23760, discount_pct: 8 },
      { order_date: '2025-05-29', month: '2025-05', quarter: 'Q2', region: 'APAC', category: 'Furniture', product: 'ErgoDesk Standing', segment: 'SMB', units_sold: 50, revenue: 25000, cost: 18500, profit: 6500, discount_pct: 15 },

      { order_date: '2025-06-07', month: '2025-06', quarter: 'Q2', region: 'North America', category: 'Software', product: 'DataShield Pro', segment: 'Enterprise', units_sold: 210, revenue: 73500, cost: 14700, profit: 58800, discount_pct: 0 },
      { order_date: '2025-06-15', month: '2025-06', quarter: 'Q2', region: 'Europe', category: 'Accessories', product: 'Thunderbolt Dock', segment: 'SMB', units_sold: 155, revenue: 31000, cost: 16740, profit: 14260, discount_pct: 5 },
      { order_date: '2025-06-21', month: '2025-06', quarter: 'Q2', region: 'APAC', category: 'Electronics', product: 'ProBook 16 Laptop', segment: 'SMB', units_sold: 62, revenue: 93000, cost: 63240, profit: 29760, discount_pct: 10 },
      { order_date: '2025-06-28', month: '2025-06', quarter: 'Q2', region: 'Europe', category: 'Furniture', product: 'ErgoDesk Standing', segment: 'Consumer', units_sold: 38, revenue: 19000, cost: 15960, profit: 3040, discount_pct: 25 },

      { order_date: '2025-07-08', month: '2025-07', quarter: 'Q3', region: 'North America', category: 'Electronics', product: 'ProBook 16 Laptop', segment: 'Enterprise', units_sold: 70, revenue: 105000, cost: 68250, profit: 36750, discount_pct: 5 },
      { order_date: '2025-07-16', month: '2025-07', quarter: 'Q3', region: 'APAC', category: 'Software', product: 'CloudSync Suite', segment: 'SMB', units_sold: 175, revenue: 52500, cost: 10500, profit: 42000, discount_pct: 5 },
      { order_date: '2025-07-23', month: '2025-07', quarter: 'Q3', region: 'Europe', category: 'Electronics', product: 'UltraView 4K Monitor', segment: 'Enterprise', units_sold: 82, revenue: 49200, cost: 31980, profit: 17220, discount_pct: 6 },
      { order_date: '2025-07-30', month: '2025-07', quarter: 'Q3', region: 'North America', category: 'Accessories', product: 'Mechanical KeyPro', segment: 'Consumer', units_sold: 180, revenue: 25200, cost: 13104, profit: 12096, discount_pct: 5 },

      { order_date: '2025-08-04', month: '2025-08', quarter: 'Q3', region: 'Europe', category: 'Software', product: 'CloudSync Suite', segment: 'Enterprise', units_sold: 185, revenue: 55500, cost: 11100, profit: 44400, discount_pct: 4 },
      { order_date: '2025-08-12', month: '2025-08', quarter: 'Q3', region: 'APAC', category: 'Electronics', product: 'UltraView 4K Monitor', segment: 'SMB', units_sold: 104, revenue: 62400, cost: 40560, profit: 21840, discount_pct: 8 },
      { order_date: '2025-08-19', month: '2025-08', quarter: 'Q3', region: 'North America', category: 'Furniture', product: 'AeroMesh Chair', segment: 'Enterprise', units_sold: 68, revenue: 27200, cost: 18496, profit: 8704, discount_pct: 8 },
      { order_date: '2025-08-27', month: '2025-08', quarter: 'Q3', region: 'APAC', category: 'Accessories', product: 'Mechanical KeyPro', segment: 'Consumer', units_sold: 165, revenue: 23100, cost: 12012, profit: 11088, discount_pct: 5 },

      { order_date: '2025-09-05', month: '2025-09', quarter: 'Q3', region: 'North America', category: 'Software', product: 'DataShield Pro', segment: 'Enterprise', units_sold: 240, revenue: 84000, cost: 15960, profit: 68040, discount_pct: 0 },
      { order_date: '2025-09-13', month: '2025-09', quarter: 'Q3', region: 'Europe', category: 'Electronics', product: 'ProBook 16 Laptop', segment: 'Enterprise', units_sold: 58, revenue: 87000, cost: 56550, profit: 30450, discount_pct: 5 },
      { order_date: '2025-09-20', month: '2025-09', quarter: 'Q3', region: 'APAC', category: 'Software', product: 'DataShield Pro', segment: 'SMB', units_sold: 150, revenue: 52500, cost: 10500, profit: 42000, discount_pct: 6 },
      { order_date: '2025-09-28', month: '2025-09', quarter: 'Q3', region: 'Europe', category: 'Furniture', product: 'AeroMesh Chair', segment: 'SMB', units_sold: 45, revenue: 18000, cost: 14760, profit: 3240, discount_pct: 20 },

      { order_date: '2025-10-06', month: '2025-10', quarter: 'Q4', region: 'North America', category: 'Electronics', product: 'ProBook 16 Laptop', segment: 'Enterprise', units_sold: 92, revenue: 138000, cost: 88320, profit: 49680, discount_pct: 4 },
      { order_date: '2025-10-14', month: '2025-10', quarter: 'Q4', region: 'APAC', category: 'Electronics', product: 'ProBook 16 Laptop', segment: 'Enterprise', units_sold: 75, revenue: 112500, cost: 73125, profit: 39375, discount_pct: 6 },
      { order_date: '2025-10-21', month: '2025-10', quarter: 'Q4', region: 'Europe', category: 'Software', product: 'DataShield Pro', segment: 'Enterprise', units_sold: 220, revenue: 77000, cost: 14630, profit: 62370, discount_pct: 0 },
      { order_date: '2025-10-29', month: '2025-10', quarter: 'Q4', region: 'North America', category: 'Accessories', product: 'Thunderbolt Dock', segment: 'Enterprise', units_sold: 210, revenue: 42000, cost: 21840, profit: 20160, discount_pct: 5 },

      { order_date: '2025-11-05', month: '2025-11', quarter: 'Q4', region: 'North America', category: 'Software', product: 'CloudSync Suite', segment: 'Enterprise', units_sold: 260, revenue: 78000, cost: 14820, profit: 63180, discount_pct: 0 },
      { order_date: '2025-11-12', month: '2025-11', quarter: 'Q4', region: 'Europe', category: 'Electronics', product: 'UltraView 4K Monitor', segment: 'Enterprise', units_sold: 115, revenue: 69000, cost: 44160, profit: 24840, discount_pct: 5 },
      { order_date: '2025-11-19', month: '2025-11', quarter: 'Q4', region: 'APAC', category: 'Furniture', product: 'ErgoDesk Standing', segment: 'Enterprise', units_sold: 64, revenue: 32000, cost: 22400, profit: 9600, discount_pct: 10 },
      { order_date: '2025-11-26', month: '2025-11', quarter: 'Q4', region: 'Europe', category: 'Accessories', product: 'Mechanical KeyPro', segment: 'SMB', units_sold: 195, revenue: 27300, cost: 14196, profit: 13104, discount_pct: 5 }
    ]
  },
  {
    name: 'SaaS Growth & Marketing Funnel',
    originalFilename: 'sample_saas_marketing.csv',
    description: '36 campaign & subscription performance rows tracking Monthly Recurring Revenue (MRR), Customer Acquisition Cost (CAC), churn rate, signups, and conversions across channels and plans.',
    columns: ['month', 'channel', 'plan_tier', 'ad_spend', 'signups', 'paid_conversions', 'mrr_usd', 'cac_usd', 'churn_rate_pct', 'nps_score'],
    columnTypes: {
      month: 'TEXT',
      channel: 'TEXT',
      plan_tier: 'TEXT',
      ad_spend: 'NUMERIC',
      signups: 'NUMERIC',
      paid_conversions: 'NUMERIC',
      mrr_usd: 'NUMERIC',
      cac_usd: 'NUMERIC',
      churn_rate_pct: 'NUMERIC',
      nps_score: 'NUMERIC'
    },
    rows: [
      { month: '2025-07', channel: 'Organic Search', plan_tier: 'Pro', ad_spend: 3200, signups: 420, paid_conversions: 68, mrr_usd: 10200, cac_usd: 47, churn_rate_pct: 2.1, nps_score: 64 },
      { month: '2025-07', channel: 'Paid Search', plan_tier: 'Enterprise', ad_spend: 12500, signups: 310, paid_conversions: 42, mrr_usd: 21000, cac_usd: 298, churn_rate_pct: 1.4, nps_score: 71 },
      { month: '2025-07', channel: 'Social Ads', plan_tier: 'Starter', ad_spend: 8400, signups: 540, paid_conversions: 48, mrr_usd: 2400, cac_usd: 175, churn_rate_pct: 6.8, nps_score: 48 },
      { month: '2025-07', channel: 'Partner Referral', plan_tier: 'Enterprise', ad_spend: 4500, signups: 140, paid_conversions: 38, mrr_usd: 19000, cac_usd: 118, churn_rate_pct: 0.9, nps_score: 78 },
      { month: '2025-07', channel: 'Email Outbound', plan_tier: 'Pro', ad_spend: 2800, signups: 190, paid_conversions: 29, mrr_usd: 4350, cac_usd: 97, churn_rate_pct: 2.8, nps_score: 59 },
      { month: '2025-07', channel: 'Organic Search', plan_tier: 'Starter', ad_spend: 1500, signups: 610, paid_conversions: 74, mrr_usd: 3700, cac_usd: 20, churn_rate_pct: 4.5, nps_score: 55 },

      { month: '2025-08', channel: 'Organic Search', plan_tier: 'Pro', ad_spend: 3400, signups: 465, paid_conversions: 76, mrr_usd: 11400, cac_usd: 45, churn_rate_pct: 1.9, nps_score: 66 },
      { month: '2025-08', channel: 'Paid Search', plan_tier: 'Enterprise', ad_spend: 13200, signups: 335, paid_conversions: 46, mrr_usd: 23000, cac_usd: 287, churn_rate_pct: 1.3, nps_score: 72 },
      { month: '2025-08', channel: 'Social Ads', plan_tier: 'Starter', ad_spend: 9100, signups: 590, paid_conversions: 51, mrr_usd: 2550, cac_usd: 178, churn_rate_pct: 7.2, nps_score: 46 },
      { month: '2025-08', channel: 'Partner Referral', plan_tier: 'Enterprise', ad_spend: 4800, signups: 155, paid_conversions: 44, mrr_usd: 22000, cac_usd: 109, churn_rate_pct: 0.8, nps_score: 80 },
      { month: '2025-08', channel: 'Email Outbound', plan_tier: 'Pro', ad_spend: 3000, signups: 205, paid_conversions: 33, mrr_usd: 4950, cac_usd: 91, churn_rate_pct: 2.6, nps_score: 61 },
      { month: '2025-08', channel: 'Organic Search', plan_tier: 'Starter', ad_spend: 1600, signups: 640, paid_conversions: 82, mrr_usd: 4100, cac_usd: 20, churn_rate_pct: 4.2, nps_score: 57 },

      { month: '2025-09', channel: 'Organic Search', plan_tier: 'Pro', ad_spend: 3600, signups: 510, paid_conversions: 85, mrr_usd: 12750, cac_usd: 42, churn_rate_pct: 1.8, nps_score: 68 },
      { month: '2025-09', channel: 'Paid Search', plan_tier: 'Enterprise', ad_spend: 14000, signups: 360, paid_conversions: 52, mrr_usd: 26000, cac_usd: 269, churn_rate_pct: 1.2, nps_score: 74 },
      { month: '2025-09', channel: 'Social Ads', plan_tier: 'Starter', ad_spend: 11200, signups: 620, paid_conversions: 44, mrr_usd: 2200, cac_usd: 255, churn_rate_pct: 8.1, nps_score: 44 },
      { month: '2025-09', channel: 'Partner Referral', plan_tier: 'Enterprise', ad_spend: 5200, signups: 178, paid_conversions: 51, mrr_usd: 25500, cac_usd: 102, churn_rate_pct: 0.7, nps_score: 82 },
      { month: '2025-09', channel: 'Email Outbound', plan_tier: 'Pro', ad_spend: 3100, signups: 230, paid_conversions: 38, mrr_usd: 5700, cac_usd: 82, churn_rate_pct: 2.5, nps_score: 62 },
      { month: '2025-09', channel: 'Organic Search', plan_tier: 'Starter', ad_spend: 1700, signups: 690, paid_conversions: 90, mrr_usd: 4500, cac_usd: 19, churn_rate_pct: 4.0, nps_score: 58 },

      { month: '2025-10', channel: 'Organic Search', plan_tier: 'Pro', ad_spend: 3900, signups: 575, paid_conversions: 96, mrr_usd: 14400, cac_usd: 41, churn_rate_pct: 1.7, nps_score: 70 },
      { month: '2025-10', channel: 'Paid Search', plan_tier: 'Enterprise', ad_spend: 15000, signups: 395, paid_conversions: 58, mrr_usd: 29000, cac_usd: 259, churn_rate_pct: 1.1, nps_score: 75 },
      { month: '2025-10', channel: 'Social Ads', plan_tier: 'Starter', ad_spend: 7500, signups: 480, paid_conversions: 42, mrr_usd: 2100, cac_usd: 179, churn_rate_pct: 6.4, nps_score: 49 },
      { month: '2025-10', channel: 'Partner Referral', plan_tier: 'Enterprise', ad_spend: 5600, signups: 195, paid_conversions: 58, mrr_usd: 29000, cac_usd: 97, churn_rate_pct: 0.6, nps_score: 84 },
      { month: '2025-10', channel: 'Email Outbound', plan_tier: 'Pro', ad_spend: 3300, signups: 250, paid_conversions: 41, mrr_usd: 6150, cac_usd: 80, churn_rate_pct: 2.3, nps_score: 64 },
      { month: '2025-10', channel: 'Organic Search', plan_tier: 'Starter', ad_spend: 1800, signups: 740, paid_conversions: 98, mrr_usd: 4900, cac_usd: 18, churn_rate_pct: 3.9, nps_score: 60 },

      { month: '2025-11', channel: 'Organic Search', plan_tier: 'Pro', ad_spend: 4100, signups: 620, paid_conversions: 108, mrr_usd: 16200, cac_usd: 38, churn_rate_pct: 1.6, nps_score: 72 },
      { month: '2025-11', channel: 'Paid Search', plan_tier: 'Enterprise', ad_spend: 16200, signups: 430, paid_conversions: 64, mrr_usd: 32000, cac_usd: 253, churn_rate_pct: 1.0, nps_score: 76 },
      { month: '2025-11', channel: 'Social Ads', plan_tier: 'Starter', ad_spend: 6800, signups: 450, paid_conversions: 45, mrr_usd: 2250, cac_usd: 151, churn_rate_pct: 5.9, nps_score: 51 },
      { month: '2025-11', channel: 'Partner Referral', plan_tier: 'Enterprise', ad_spend: 6100, signups: 220, paid_conversions: 66, mrr_usd: 33000, cac_usd: 92, churn_rate_pct: 0.6, nps_score: 85 },
      { month: '2025-11', channel: 'Email Outbound', plan_tier: 'Pro', ad_spend: 3500, signups: 275, paid_conversions: 47, mrr_usd: 7050, cac_usd: 74, churn_rate_pct: 2.1, nps_score: 65 },
      { month: '2025-11', channel: 'Organic Search', plan_tier: 'Starter', ad_spend: 1900, signups: 790, paid_conversions: 106, mrr_usd: 5300, cac_usd: 18, churn_rate_pct: 3.7, nps_score: 61 }
    ]
  }
];
