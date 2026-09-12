// src/sim/state.ts
var SAVE_VERSION = 3;
var SETTINGS_KEY = "business-manager:settings";
var START_CASH = 6e4;
var START_DAY = 1;
var START_HOUR = 8;
var LEDGER_LIMIT = 600;
function emptyPeriod(fromDay) {
  return { fromDay, categories: {}, revenueByBusiness: {}, costsByBusiness: {} };
}
var DAY_HISTORY_LIMIT = 365;
var ALERT_LIMIT = 60;
var SPEEDS = [0, 0.5, 1, 2, 4];
var SPEED_LABELS = ["\u275A\u275A", "1\xD7", "2\xD7", "4\xD7", "8\xD7"];
var DEFAULT_SETTINGS = {
  autosave: true,
  showTutorial: true,
  compactNumbers: true,
  confirmLargeSpend: true
};
var DEFAULT_ECONOMY = {
  confidence: 100,
  inflation: 1,
  interestRate: 0.045,
  unemployment: 0.062,
  growth: 0.024,
  lastLabel: "Stable"
};
function defaultDistrictState() {
  return { demandIndex: 1, rentIndex: 1, propertyIndex: 1 };
}
function absoluteHour(state) {
  return state.day * 24 + state.hour;
}
function playerCompany(state) {
  const company = state.companies.find((c) => c.id === state.playerCompanyId);
  if (!company) throw new Error("Player company missing from state");
  return company;
}
function companyById(state, id) {
  return state.companies.find((c) => c.id === id);
}
function businessById(state, id) {
  return state.businesses.find((b) => b.id === id);
}
function buildingById(state, id) {
  return state.buildings.find((b) => b.id === id);
}
function employeeById(state, id) {
  return state.employees.find((e) => e.id === id);
}
function playerBusinesses(state) {
  return state.businesses.filter((b) => b.companyId === state.playerCompanyId);
}
function competitorBusinesses(state) {
  return state.businesses.filter((b) => b.companyId !== state.playerCompanyId);
}
function employeesOf(state, businessId) {
  return state.employees.filter((e) => e.businessId === businessId);
}

// src/data/districts.ts
var DISTRICTS = [
  // ------------------------------------------------------------ north row
  {
    id: "warehouse",
    name: "Warehouse District",
    short: "WHS",
    x: 0.035,
    y: 0.05,
    w: 0.175,
    h: 0.24,
    population: 12e3,
    density: 900,
    averageIncome: 31e3,
    incomeSpread: 0.3,
    ageMix: { young: 0.24, adult: 0.63, senior: 0.13 },
    footTraffic: 900,
    vehicleTraffic: 14e3,
    tourism: 0.05,
    commercialActivity: 0.6,
    rentPerSqm: 7,
    pricePerSqm: 620,
    growth: 0.018,
    preferences: { retail: 0.35, food: 0.5, services: 1.25, specialized: 0.7 },
    colour: "#6b7a86",
    description: "Cheap floor space and loading bays. Almost no walk-in trade."
  },
  {
    id: "industrial",
    name: "Industrial District",
    short: "IND",
    x: 0.222,
    y: 0.05,
    w: 0.2,
    h: 0.24,
    population: 21e3,
    density: 1400,
    averageIncome: 34e3,
    incomeSpread: 0.28,
    ageMix: { young: 0.26, adult: 0.62, senior: 0.12 },
    footTraffic: 1600,
    vehicleTraffic: 21e3,
    tourism: 0.05,
    commercialActivity: 0.75,
    rentPerSqm: 9,
    pricePerSqm: 780,
    growth: 0.012,
    preferences: { retail: 0.45, food: 0.85, services: 1.35, specialized: 1.1 },
    colour: "#7d7566",
    description: "Workshops and light manufacturing. Lunch trade, little else."
  },
  {
    id: "transit",
    name: "Transport Hub",
    short: "HUB",
    x: 0.434,
    y: 0.05,
    w: 0.152,
    h: 0.24,
    population: 9e3,
    density: 3800,
    averageIncome: 38e3,
    incomeSpread: 0.45,
    ageMix: { young: 0.38, adult: 0.53, senior: 0.09 },
    footTraffic: 31e3,
    vehicleTraffic: 34e3,
    tourism: 1.1,
    commercialActivity: 1.5,
    rentPerSqm: 34,
    pricePerSqm: 3100,
    growth: 0.035,
    preferences: { retail: 1.2, food: 1.6, services: 0.8, specialized: 0.6 },
    colour: "#5f86a8",
    description: "Central station. Enormous footfall, tiny units, brutal rent."
  },
  {
    id: "midtown",
    name: "Midtown Residential",
    short: "MID",
    x: 0.598,
    y: 0.05,
    w: 0.18,
    h: 0.24,
    population: 96e3,
    density: 6200,
    averageIncome: 46e3,
    incomeSpread: 0.35,
    ageMix: { young: 0.3, adult: 0.52, senior: 0.18 },
    footTraffic: 7400,
    vehicleTraffic: 16e3,
    tourism: 0.15,
    commercialActivity: 1,
    rentPerSqm: 19,
    pricePerSqm: 1900,
    growth: 0.028,
    preferences: { retail: 1.15, food: 1.1, services: 1.05, specialized: 0.95 },
    colour: "#7f9b78",
    description: "Dense middle-class housing. Steady, unspectacular demand."
  },
  {
    id: "highend",
    name: "High-End Residential",
    short: "HER",
    x: 0.79,
    y: 0.05,
    w: 0.175,
    h: 0.24,
    population: 38e3,
    density: 2100,
    averageIncome: 118e3,
    incomeSpread: 0.22,
    ageMix: { young: 0.22, adult: 0.54, senior: 0.24 },
    footTraffic: 3900,
    vehicleTraffic: 11e3,
    tourism: 0.2,
    commercialActivity: 0.9,
    rentPerSqm: 41,
    pricePerSqm: 4600,
    growth: 0.031,
    preferences: { retail: 1.05, food: 1.2, services: 1.35, specialized: 1.6 },
    colour: "#a89566",
    description: "Wealthy, quiet streets. Small volumes, very high margins."
  },
  // ----------------------------------------------------------- centre row
  {
    id: "waterfront",
    name: "Waterfront",
    short: "WTR",
    x: 0.035,
    y: 0.315,
    w: 0.175,
    h: 0.24,
    population: 24e3,
    density: 3100,
    averageIncome: 72e3,
    incomeSpread: 0.4,
    ageMix: { young: 0.31, adult: 0.55, senior: 0.14 },
    footTraffic: 12e3,
    vehicleTraffic: 9e3,
    tourism: 1.5,
    commercialActivity: 1.2,
    rentPerSqm: 29,
    pricePerSqm: 3400,
    growth: 0.042,
    preferences: { retail: 0.9, food: 1.7, services: 0.85, specialized: 1.2 },
    colour: "#4f8497",
    description: "Converted docks. Seasonal, food-led, gentrifying fast."
  },
  {
    id: "shopping",
    name: "Shopping District",
    short: "SHP",
    x: 0.222,
    y: 0.315,
    w: 0.2,
    h: 0.24,
    population: 18e3,
    density: 4200,
    averageIncome: 58e3,
    incomeSpread: 0.38,
    ageMix: { young: 0.35, adult: 0.51, senior: 0.14 },
    footTraffic: 42e3,
    vehicleTraffic: 19e3,
    tourism: 0.9,
    commercialActivity: 1.8,
    rentPerSqm: 46,
    pricePerSqm: 4200,
    growth: 0.026,
    preferences: { retail: 1.75, food: 1.15, services: 0.7, specialized: 1.1 },
    colour: "#9c6f9e",
    description: "The retail core. Highest footfall in the city, and it shows in the rent."
  },
  {
    id: "downtown",
    name: "Downtown",
    short: "DTN",
    x: 0.434,
    y: 0.315,
    w: 0.152,
    h: 0.24,
    population: 31e3,
    density: 7800,
    averageIncome: 67e3,
    incomeSpread: 0.44,
    ageMix: { young: 0.34, adult: 0.54, senior: 0.12 },
    footTraffic: 36e3,
    vehicleTraffic: 27e3,
    tourism: 1.2,
    commercialActivity: 1.7,
    rentPerSqm: 52,
    pricePerSqm: 5100,
    growth: 0.033,
    preferences: { retail: 1.3, food: 1.45, services: 1.3, specialized: 1.15 },
    colour: "#5b8fc9",
    description: "Offices above, trade below. Everything is expensive and busy."
  },
  {
    id: "financial",
    name: "Financial District",
    short: "FIN",
    x: 0.598,
    y: 0.315,
    w: 0.18,
    h: 0.24,
    population: 8e3,
    density: 5400,
    averageIncome: 141e3,
    incomeSpread: 0.25,
    ageMix: { young: 0.26, adult: 0.66, senior: 0.08 },
    footTraffic: 27e3,
    vehicleTraffic: 22e3,
    tourism: 0.3,
    commercialActivity: 1.6,
    rentPerSqm: 61,
    pricePerSqm: 6400,
    growth: 0.022,
    preferences: { retail: 0.75, food: 1.8, services: 1.6, specialized: 0.9 },
    colour: "#4c6f9b",
    description: "Weekday money. Dead on Sundays, ferocious at lunchtime."
  },
  {
    id: "suburbs",
    name: "Suburban District",
    short: "SUB",
    x: 0.79,
    y: 0.315,
    w: 0.175,
    h: 0.24,
    population: 124e3,
    density: 1800,
    averageIncome: 61e3,
    incomeSpread: 0.3,
    ageMix: { young: 0.28, adult: 0.5, senior: 0.22 },
    footTraffic: 4200,
    vehicleTraffic: 24e3,
    tourism: 0.1,
    commercialActivity: 0.95,
    rentPerSqm: 16,
    pricePerSqm: 1750,
    growth: 0.036,
    preferences: { retail: 1.3, food: 0.95, services: 1.2, specialized: 1.05 },
    colour: "#87a17e",
    description: "Families, cars and parking. Cheap space, customers arrive by car."
  },
  // ------------------------------------------------------------ south row
  {
    id: "airport",
    name: "Airport Area",
    short: "APT",
    x: 0.035,
    y: 0.58,
    w: 0.175,
    h: 0.26,
    population: 6e3,
    density: 700,
    averageIncome: 44e3,
    incomeSpread: 0.36,
    ageMix: { young: 0.31, adult: 0.6, senior: 0.09 },
    footTraffic: 24e3,
    vehicleTraffic: 38e3,
    tourism: 1.9,
    commercialActivity: 1.3,
    rentPerSqm: 38,
    pricePerSqm: 2600,
    growth: 0.029,
    preferences: { retail: 1.15, food: 1.5, services: 1.1, specialized: 0.6 },
    colour: "#6d7f9c",
    description: "Captive travellers with time to kill and money to spend."
  },
  {
    id: "university",
    name: "University District",
    short: "UNI",
    x: 0.222,
    y: 0.58,
    w: 0.2,
    h: 0.26,
    population: 44e3,
    density: 5100,
    averageIncome: 24e3,
    incomeSpread: 0.5,
    ageMix: { young: 0.71, adult: 0.24, senior: 0.05 },
    footTraffic: 19e3,
    vehicleTraffic: 8e3,
    tourism: 0.3,
    commercialActivity: 1.25,
    rentPerSqm: 21,
    pricePerSqm: 2100,
    growth: 0.024,
    preferences: { retail: 1, food: 1.55, services: 0.75, specialized: 0.95 },
    colour: "#a3894f",
    description: "Huge crowds, tiny budgets. Price matters more than anything else."
  },
  {
    id: "entertainment",
    name: "Entertainment District",
    short: "ENT",
    x: 0.434,
    y: 0.58,
    w: 0.152,
    h: 0.26,
    population: 15e3,
    density: 4600,
    averageIncome: 52e3,
    incomeSpread: 0.47,
    ageMix: { young: 0.52, adult: 0.42, senior: 0.06 },
    footTraffic: 29e3,
    vehicleTraffic: 15e3,
    tourism: 1.4,
    commercialActivity: 1.45,
    rentPerSqm: 40,
    pricePerSqm: 3600,
    growth: 0.03,
    preferences: { retail: 0.8, food: 1.85, services: 0.7, specialized: 1.4 },
    colour: "#a05f74",
    description: "Evenings and weekends. Nothing happens before four in the afternoon."
  },
  {
    id: "southside",
    name: "Southside",
    short: "STH",
    x: 0.598,
    y: 0.58,
    w: 0.18,
    h: 0.26,
    population: 118e3,
    density: 7100,
    averageIncome: 27e3,
    incomeSpread: 0.33,
    ageMix: { young: 0.36, adult: 0.48, senior: 0.16 },
    footTraffic: 8600,
    vehicleTraffic: 13e3,
    tourism: 0.05,
    commercialActivity: 0.85,
    rentPerSqm: 11,
    pricePerSqm: 980,
    growth: 0.015,
    preferences: { retail: 1.35, food: 1, services: 1.1, specialized: 0.6 },
    colour: "#8a7f6e",
    description: "Low-income housing, high density. Volume business on thin margins."
  },
  {
    id: "tourist",
    name: "Tourist Quarter",
    short: "TUR",
    x: 0.79,
    y: 0.58,
    w: 0.175,
    h: 0.26,
    population: 11e3,
    density: 3300,
    averageIncome: 69e3,
    incomeSpread: 0.42,
    ageMix: { young: 0.36, adult: 0.5, senior: 0.14 },
    footTraffic: 33e3,
    vehicleTraffic: 7e3,
    tourism: 2,
    commercialActivity: 1.55,
    rentPerSqm: 49,
    pricePerSqm: 4400,
    growth: 0.038,
    preferences: { retail: 1.25, food: 1.7, services: 0.6, specialized: 1.45 },
    colour: "#b08a5c",
    description: "Old town streets. Heavily seasonal, and tourists rarely haggle."
  }
];
var byId = new Map(DISTRICTS.map((d) => [d.id, d]));
function district(id) {
  const found = byId.get(id);
  if (!found) throw new Error(`Unknown district: ${id}`);
  return found;
}
var CITY_NAME = "Northgate";
var CITY_POPULATION = DISTRICTS.reduce((total2, d) => total2 + d.population, 0);

// src/data/businessTypes.ts
var BUSINESS_TYPES = [
  // ------------------------------------------------------------- retail
  {
    id: "convenience",
    name: "Convenience Store",
    category: "retail",
    description: "Small basket, high frequency. Forgiving on location, thin on margin.",
    minSize: 60,
    setupCost: 9e3,
    equipmentCost: 7500,
    productIds: ["bread", "milk", "snacks", "softdrinks", "readymeal", "household"],
    serviceFee: 0,
    baseCustomers: 210,
    customersPerStaffHour: 22,
    roles: ["cashier", "sales", "manager"],
    defaultOpenFrom: 7,
    defaultOpenTo: 22,
    priceSensitivity: 0.75,
    complexity: 1,
    equipmentUpkeep: 0.012,
    reputationSensitivity: 0.7,
    automatable: 0.75,
    keySkills: ["service", "logistics"],
    icon: "\u{1F6D2}"
  },
  {
    id: "electronics",
    name: "Electronics Store",
    category: "retail",
    description: "Few customers, large baskets. Stock ties up a lot of cash.",
    minSize: 120,
    setupCost: 26e3,
    equipmentCost: 14e3,
    productIds: ["phone", "laptop", "headphones", "accessories"],
    serviceFee: 0,
    baseCustomers: 62,
    customersPerStaffHour: 5,
    roles: ["sales", "cashier", "technician", "manager"],
    defaultOpenFrom: 9,
    defaultOpenTo: 19,
    priceSensitivity: 0.85,
    complexity: 3,
    equipmentUpkeep: 0.018,
    reputationSensitivity: 1.15,
    automatable: 0.45,
    keySkills: ["sales", "technical"],
    icon: "\u{1F4BB}"
  },
  {
    id: "clothing",
    name: "Clothing Store",
    category: "retail",
    description: "Lives on footfall and brand. Seasonal swings are severe.",
    minSize: 100,
    setupCost: 18e3,
    equipmentCost: 9500,
    productIds: ["tshirt", "jeans", "jacket", "sneakers"],
    serviceFee: 0,
    baseCustomers: 96,
    customersPerStaffHour: 9,
    roles: ["sales", "cashier", "manager"],
    defaultOpenFrom: 10,
    defaultOpenTo: 20,
    priceSensitivity: 0.7,
    complexity: 2,
    equipmentUpkeep: 8e-3,
    reputationSensitivity: 1.25,
    automatable: 0.5,
    keySkills: ["sales", "service"],
    icon: "\u{1F455}"
  },
  {
    id: "homegoods",
    name: "Home Goods Store",
    category: "retail",
    description: "Big units, cheap rent, customers arrive by car.",
    minSize: 220,
    setupCost: 24e3,
    equipmentCost: 12e3,
    productIds: ["furniture", "decor", "household"],
    serviceFee: 0,
    baseCustomers: 58,
    customersPerStaffHour: 6,
    roles: ["sales", "warehouse", "cashier", "manager"],
    defaultOpenFrom: 9,
    defaultOpenTo: 19,
    priceSensitivity: 0.72,
    complexity: 2,
    equipmentUpkeep: 0.012,
    reputationSensitivity: 0.9,
    automatable: 0.55,
    keySkills: ["sales", "logistics"],
    icon: "\u{1F6CB}\uFE0F"
  },
  {
    id: "sportsstore",
    name: "Sports Store",
    category: "retail",
    description: "Mid-sized baskets, loyal customers, strong in the suburbs.",
    minSize: 140,
    setupCost: 19e3,
    equipmentCost: 1e4,
    productIds: ["fitness", "bicycle", "sneakers", "tshirt"],
    serviceFee: 0,
    baseCustomers: 64,
    customersPerStaffHour: 7,
    roles: ["sales", "technician", "cashier", "manager"],
    defaultOpenFrom: 9,
    defaultOpenTo: 19,
    priceSensitivity: 0.68,
    complexity: 2,
    equipmentUpkeep: 0.01,
    reputationSensitivity: 1,
    automatable: 0.5,
    keySkills: ["sales", "service"],
    icon: "\u{1F6B4}"
  },
  {
    id: "petstore",
    name: "Pet Store",
    category: "retail",
    description: "Repeat purchases and predictable demand. Rarely spectacular.",
    minSize: 90,
    setupCost: 13e3,
    equipmentCost: 8e3,
    productIds: ["petfood", "petsupplies"],
    serviceFee: 0,
    baseCustomers: 74,
    customersPerStaffHour: 11,
    roles: ["sales", "cashier", "manager"],
    defaultOpenFrom: 9,
    defaultOpenTo: 18,
    priceSensitivity: 0.66,
    complexity: 2,
    equipmentUpkeep: 0.015,
    reputationSensitivity: 1.1,
    automatable: 0.4,
    keySkills: ["service", "technical"],
    icon: "\u{1F43E}"
  },
  // --------------------------------------------------------------- food
  {
    id: "coffeeshop",
    name: "Coffee Shop",
    category: "food",
    description: "Cheap to start, brutal margins per cup, saved by volume.",
    minSize: 45,
    setupCost: 11e3,
    equipmentCost: 13500,
    productIds: ["coffeecup", "pastry", "sandwich", "juice"],
    serviceFee: 0,
    baseCustomers: 240,
    customersPerStaffHour: 26,
    roles: ["server", "cook", "manager"],
    defaultOpenFrom: 7,
    defaultOpenTo: 18,
    priceSensitivity: 0.6,
    complexity: 2,
    equipmentUpkeep: 0.022,
    reputationSensitivity: 1.2,
    automatable: 0.4,
    keySkills: ["service", "communication"],
    icon: "\u2615"
  },
  {
    id: "bakery",
    name: "Bakery",
    category: "food",
    description: "Morning trade. Anything unsold at closing time is waste.",
    minSize: 55,
    setupCost: 14e3,
    equipmentCost: 18e3,
    productIds: ["bread", "pastry", "coffeecup"],
    serviceFee: 0,
    baseCustomers: 185,
    customersPerStaffHour: 24,
    roles: ["cook", "server", "manager"],
    defaultOpenFrom: 6,
    defaultOpenTo: 16,
    priceSensitivity: 0.65,
    complexity: 3,
    equipmentUpkeep: 0.026,
    reputationSensitivity: 1.15,
    automatable: 0.3,
    keySkills: ["technical", "logistics"],
    icon: "\u{1F950}"
  },
  {
    id: "fastfood",
    name: "Fast Food",
    category: "food",
    description: "Throughput is everything. Understaff it and you lose the queue.",
    minSize: 90,
    setupCost: 21e3,
    equipmentCost: 26e3,
    productIds: ["burger", "softdrinks", "snacks"],
    serviceFee: 0,
    baseCustomers: 290,
    customersPerStaffHour: 24,
    roles: ["cook", "cashier", "server", "manager"],
    defaultOpenFrom: 10,
    defaultOpenTo: 23,
    priceSensitivity: 0.8,
    complexity: 2,
    equipmentUpkeep: 0.03,
    reputationSensitivity: 1,
    automatable: 0.6,
    keySkills: ["technical", "service"],
    icon: "\u{1F354}"
  },
  {
    id: "pizzeria",
    name: "Pizzeria",
    category: "food",
    description: "Evening business with decent margins and a loyal following.",
    minSize: 95,
    setupCost: 19e3,
    equipmentCost: 23e3,
    productIds: ["pizza", "softdrinks", "juice"],
    serviceFee: 0,
    baseCustomers: 165,
    customersPerStaffHour: 14,
    roles: ["cook", "server", "cashier", "manager"],
    defaultOpenFrom: 12,
    defaultOpenTo: 23,
    priceSensitivity: 0.7,
    complexity: 3,
    equipmentUpkeep: 0.028,
    reputationSensitivity: 1.2,
    automatable: 0.35,
    keySkills: ["technical", "service"],
    icon: "\u{1F355}"
  },
  {
    id: "restaurant",
    name: "Restaurant",
    category: "food",
    description: "High ticket, high staffing, unforgiving of poor service.",
    minSize: 160,
    setupCost: 44e3,
    equipmentCost: 38e3,
    productIds: ["dinner", "juice", "coffeecup"],
    serviceFee: 0,
    baseCustomers: 105,
    customersPerStaffHour: 7,
    roles: ["cook", "server", "manager", "cleaner"],
    defaultOpenFrom: 12,
    defaultOpenTo: 23,
    priceSensitivity: 0.5,
    complexity: 5,
    equipmentUpkeep: 0.032,
    reputationSensitivity: 1.5,
    automatable: 0.2,
    keySkills: ["technical", "service", "communication"],
    icon: "\u{1F37D}\uFE0F"
  },
  // ----------------------------------------------------------- services
  {
    id: "cleaning",
    name: "Cleaning Company",
    category: "services",
    description: "No stock at all. Profit is purely staff utilisation.",
    minSize: 50,
    setupCost: 6500,
    equipmentCost: 5200,
    productIds: [],
    serviceFee: 78,
    baseCustomers: 34,
    customersPerStaffHour: 0.8,
    roles: ["cleaner", "manager", "accountant"],
    defaultOpenFrom: 7,
    defaultOpenTo: 18,
    priceSensitivity: 0.72,
    complexity: 2,
    equipmentUpkeep: 0.014,
    reputationSensitivity: 1.1,
    automatable: 0.35,
    keySkills: ["service", "technical"],
    icon: "\u{1F9F9}"
  },
  {
    id: "repair",
    name: "Repair Company",
    category: "services",
    description: "Skilled work, high hourly value, needs qualified technicians.",
    minSize: 70,
    setupCost: 12e3,
    equipmentCost: 14500,
    productIds: ["accessories"],
    serviceFee: 96,
    baseCustomers: 28,
    customersPerStaffHour: 1.1,
    roles: ["technician", "manager", "cashier"],
    defaultOpenFrom: 8,
    defaultOpenTo: 18,
    priceSensitivity: 0.6,
    complexity: 4,
    equipmentUpkeep: 0.024,
    reputationSensitivity: 1.3,
    automatable: 0.25,
    keySkills: ["technical", "communication"],
    icon: "\u{1F527}"
  },
  {
    id: "marketing",
    name: "Marketing Agency",
    category: "services",
    description: "Few clients, very high fees, entirely dependent on talent.",
    minSize: 110,
    setupCost: 17e3,
    equipmentCost: 12e3,
    productIds: [],
    serviceFee: 420,
    baseCustomers: 7,
    customersPerStaffHour: 0.22,
    roles: ["marketer", "manager", "accountant"],
    defaultOpenFrom: 9,
    defaultOpenTo: 18,
    priceSensitivity: 0.42,
    complexity: 4,
    equipmentUpkeep: 8e-3,
    reputationSensitivity: 1.35,
    automatable: 0.3,
    keySkills: ["communication", "sales"],
    icon: "\u{1F4C8}"
  },
  {
    id: "itservices",
    name: "IT Services",
    category: "services",
    description: "Business-to-business contracts. Stable once established.",
    minSize: 100,
    setupCost: 15500,
    equipmentCost: 17e3,
    productIds: [],
    serviceFee: 310,
    baseCustomers: 11,
    customersPerStaffHour: 0.3,
    roles: ["technician", "manager", "accountant"],
    defaultOpenFrom: 9,
    defaultOpenTo: 18,
    priceSensitivity: 0.45,
    complexity: 4,
    equipmentUpkeep: 0.016,
    reputationSensitivity: 1.2,
    automatable: 0.45,
    keySkills: ["technical", "communication"],
    icon: "\u{1F5A5}\uFE0F"
  },
  {
    id: "logistics",
    name: "Logistics Company",
    category: "services",
    description: "Cheap space, heavy vehicles, wins on scale and reliability.",
    minSize: 300,
    setupCost: 22e3,
    equipmentCost: 41e3,
    productIds: [],
    serviceFee: 148,
    baseCustomers: 42,
    customersPerStaffHour: 0.9,
    roles: ["driver", "warehouse", "manager", "accountant"],
    defaultOpenFrom: 6,
    defaultOpenTo: 20,
    priceSensitivity: 0.78,
    complexity: 4,
    equipmentUpkeep: 0.03,
    reputationSensitivity: 0.85,
    automatable: 0.65,
    keySkills: ["logistics", "admin"],
    icon: "\u{1F69A}"
  },
  // -------------------------------------------------------- specialized
  {
    id: "beauty",
    name: "Beauty Salon",
    category: "specialized",
    description: "Appointment-driven, loyal clientele, strong in wealthy areas.",
    minSize: 65,
    setupCost: 16e3,
    equipmentCost: 19e3,
    productIds: ["cosmetics", "haircare"],
    serviceFee: 54,
    baseCustomers: 48,
    customersPerStaffHour: 1.4,
    roles: ["technician", "cashier", "manager"],
    defaultOpenFrom: 9,
    defaultOpenTo: 19,
    priceSensitivity: 0.5,
    complexity: 3,
    equipmentUpkeep: 0.02,
    reputationSensitivity: 1.4,
    automatable: 0.2,
    keySkills: ["service", "technical"],
    icon: "\u{1F487}"
  },
  {
    id: "fitnessclub",
    name: "Fitness Studio",
    category: "specialized",
    description: "High fixed costs, membership income, needs volume to work.",
    minSize: 280,
    setupCost: 38e3,
    equipmentCost: 62e3,
    productIds: ["energydrinks", "fitness"],
    serviceFee: 36,
    baseCustomers: 190,
    customersPerStaffHour: 12,
    roles: ["technician", "cleaner", "manager"],
    defaultOpenFrom: 6,
    defaultOpenTo: 23,
    priceSensitivity: 0.62,
    complexity: 3,
    equipmentUpkeep: 0.034,
    reputationSensitivity: 1.25,
    automatable: 0.35,
    keySkills: ["service", "communication"],
    icon: "\u{1F3CB}\uFE0F"
  },
  {
    id: "autodetail",
    name: "Auto Detailing",
    category: "specialized",
    description: "Small premium niche. Needs parking and wealthy neighbours.",
    minSize: 150,
    setupCost: 13500,
    equipmentCost: 16500,
    productIds: [],
    serviceFee: 132,
    baseCustomers: 22,
    customersPerStaffHour: 0.6,
    roles: ["technician", "manager"],
    defaultOpenFrom: 8,
    defaultOpenTo: 18,
    priceSensitivity: 0.55,
    complexity: 3,
    equipmentUpkeep: 0.022,
    reputationSensitivity: 1.2,
    automatable: 0.25,
    keySkills: ["technical", "service"],
    icon: "\u{1F697}"
  }
];
var byId2 = new Map(BUSINESS_TYPES.map((type) => [type.id, type]));
function businessType(id) {
  return byId2.get(id);
}
function businessTypeOrThrow(id) {
  const found = byId2.get(id);
  if (!found) throw new Error(`Unknown business type: ${id}`);
  return found;
}
var CATEGORY_NAMES = {
  retail: "Retail",
  food: "Food",
  services: "Services",
  specialized: "Specialized"
};

// src/sim/rng.ts
var Rng = class {
  state;
  constructor(seed) {
    this.state = seed >>> 0 || 1;
  }
  next() {
    this.state = this.state + 1831565813 >>> 0;
    let t = this.state;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  range(min, max) {
    return min + this.next() * (max - min);
  }
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }
  pick(items) {
    return items[Math.min(items.length - 1, Math.floor(this.next() * items.length))];
  }
  /** Picks `count` distinct items, or fewer if the list is short. */
  sample(items, count2) {
    const pool = [...items];
    const out = [];
    while (out.length < count2 && pool.length > 0) {
      out.push(pool.splice(Math.floor(this.next() * pool.length), 1)[0]);
    }
    return out;
  }
  chance(probability) {
    return this.next() < probability;
  }
  /** Normal-ish value via the mean of three samples; keeps outliers rare. */
  around(centre, spread) {
    const roll = (this.next() + this.next() + this.next()) / 3;
    return centre + (roll - 0.5) * 2 * spread;
  }
};
var CITY_SEED = 1315926644;
var gameRng = new Rng(Date.now() >>> 0);
function reseedGameRng(seed) {
  gameRng = new Rng(seed);
}

// src/sim/util.ts
function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
function approach(current, target, rate) {
  return current + (target - current) * clamp(rate, 0, 1);
}
function sum(items, pick2) {
  let total2 = 0;
  for (const item of items) {
    const value = pick2(item);
    if (Number.isFinite(value)) total2 += value;
  }
  return total2;
}
var counter = 0;
function makeId(prefix) {
  counter += 1;
  return `${prefix}_${counter.toString(36)}${Date.now().toString(36).slice(-4)}`;
}
function num(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function str(value, fallback) {
  return typeof value === "string" ? value : fallback;
}
function bool(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/sim/cityLayout.ts
var STREET_NAMES = [
  "Marlow",
  "Kestrel",
  "Ashford",
  "Bellamy",
  "Cormorant",
  "Dunmore",
  "Ellery",
  "Fenwick",
  "Garrick",
  "Halstead",
  "Ivory",
  "Jasper",
  "Kingsley",
  "Langmere",
  "Merrick",
  "Northgate",
  "Orwell",
  "Pemberton",
  "Quarry",
  "Ravensworth",
  "Sable",
  "Thornbury",
  "Underhill",
  "Vandermeer",
  "Whitlock",
  "Yarrow"
];
var STREET_SUFFIX = ["Street", "Avenue", "Road", "Lane", "Way", "Square", "Terrace"];
var STUB = 0.014;
var STYLES = {
  downtown: {
    block: 0.028,
    street: 52e-4,
    mix: { commercial: 6, civic: 1.2, plaza: 0.8, residential: 1.6, parking: 0.5 },
    housing: "tower",
    trees: 0.3,
    floors: [4, 14]
  },
  financial: {
    block: 0.032,
    street: 56e-4,
    mix: { commercial: 5, civic: 1.4, plaza: 1, residential: 1, parking: 0.6 },
    housing: "tower",
    trees: 0.25,
    floors: [6, 18]
  },
  shopping: {
    block: 0.026,
    street: 5e-3,
    mix: { commercial: 7, plaza: 1.2, parking: 1.2, residential: 1.4 },
    housing: "apartment",
    trees: 0.45,
    floors: [2, 5]
  },
  highend: {
    block: 0.042,
    street: 48e-4,
    mix: { residential: 7, park: 1.6, commercial: 1.2, civic: 0.6 },
    housing: "detached",
    trees: 0.95,
    floors: [1, 3]
  },
  midtown: {
    block: 0.03,
    street: 46e-4,
    mix: { residential: 6, commercial: 2, park: 0.9, civic: 0.7, parking: 0.5 },
    housing: "terrace",
    trees: 0.7,
    floors: [2, 5]
  },
  southside: {
    block: 0.027,
    street: 44e-4,
    mix: { residential: 7, commercial: 2, parking: 1, civic: 0.6, park: 0.5 },
    housing: "apartment",
    trees: 0.35,
    floors: [3, 8]
  },
  suburbs: {
    block: 0.045,
    street: 46e-4,
    mix: { residential: 7, park: 1.4, commercial: 1.1, parking: 0.6 },
    housing: "detached",
    trees: 0.85,
    floors: [1, 2]
  },
  industrial: {
    block: 0.058,
    street: 68e-4,
    mix: { industrial: 7, parking: 1.6, commercial: 1, civic: 0.3 },
    housing: "none",
    trees: 0.1,
    floors: [1, 2]
  },
  warehouse: {
    block: 0.055,
    street: 64e-4,
    mix: { industrial: 6, parking: 2, commercial: 1.2 },
    housing: "none",
    trees: 0.12,
    floors: [1, 2]
  },
  university: {
    block: 0.036,
    street: 48e-4,
    mix: { civic: 4, residential: 3, park: 2.2, commercial: 1.6, plaza: 0.8 },
    housing: "apartment",
    trees: 0.9,
    floors: [2, 6]
  },
  entertainment: {
    block: 0.025,
    street: 5e-3,
    mix: { commercial: 6, plaza: 1.6, residential: 1.6, parking: 1.2, civic: 0.8 },
    housing: "apartment",
    trees: 0.4,
    floors: [2, 6]
  },
  tourist: {
    block: 0.019,
    street: 38e-4,
    mix: { commercial: 5, civic: 1.4, plaza: 1.6, residential: 2.4 },
    housing: "terrace",
    trees: 0.55,
    floors: [2, 4]
  },
  waterfront: {
    block: 0.034,
    street: 5e-3,
    mix: { commercial: 3.5, residential: 2.6, industrial: 1.6, plaza: 1, park: 0.8 },
    housing: "apartment",
    trees: 0.5,
    floors: [2, 7]
  },
  airport: {
    block: 0.06,
    street: 62e-4,
    mix: { industrial: 3, parking: 3, commercial: 1.4, civic: 1 },
    housing: "none",
    trees: 0.15,
    floors: [1, 3]
  },
  transit: {
    block: 0.03,
    street: 52e-4,
    mix: { commercial: 4, civic: 2, parking: 2, residential: 2, plaza: 1 },
    housing: "apartment",
    trees: 0.4,
    floors: [2, 7]
  }
};
function unique(values, tolerance = 4e-3) {
  const sorted = [...values].sort((a, b) => a - b);
  const out = [];
  for (const value of sorted) {
    if (out.length === 0 || Math.abs(value - out[out.length - 1]) > tolerance) out.push(value);
  }
  return out;
}
function runs(rng, start, span, min, max) {
  const out = [];
  let cursor = start;
  const end = start + span;
  while (end - cursor > min * 0.8) {
    const width = Math.min(end - cursor, rng.range(min, max));
    out.push({ a: cursor, b: cursor + width });
    cursor += width;
  }
  if (out.length > 0) out[out.length - 1].b = end;
  return out;
}
function weightedUse(rng, mix) {
  const entries = Object.entries(mix);
  const total2 = entries.reduce((acc, [, weight]) => acc + weight, 0);
  let roll = rng.next() * total2;
  for (const [use, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return use;
  }
  return entries[0][0];
}
function plotCount(def) {
  const area = def.w * def.h;
  return Math.round(clamp(area * 900 * (0.6 + def.commercialActivity * 0.7), 8, 26));
}
var cached = null;
function cityLayout() {
  if (!cached) cached = build();
  return cached;
}
function build() {
  const rng = new Rng(CITY_SEED);
  const roads = [];
  const fillers = [];
  const amenities = [];
  const water = [];
  const plots = [];
  const parks = [];
  const reserved = [];
  const left = Math.min(...DISTRICTS.map((d) => d.x));
  const right = Math.max(...DISTRICTS.map((d) => d.x + d.w));
  const top = Math.min(...DISTRICTS.map((d) => d.y));
  const bottom = Math.max(...DISTRICTS.map((d) => d.y + d.h));
  const riverX = left - 0.028;
  water.push({ x: riverX - 0.03, y: top - 0.05, w: 0.05, h: bottom - top + 0.14 });
  const waterfront = DISTRICTS.find((d) => d.id === "waterfront");
  if (waterfront) {
    water.push({ x: riverX - 0.01, y: waterfront.y + 0.02, w: 0.062, h: waterfront.h - 0.05 });
  }
  const verticals = unique([left, ...DISTRICTS.flatMap((d) => [d.x, d.x + d.w]), right], 9e-3);
  const horizontals = unique([top, ...DISTRICTS.flatMap((d) => [d.y, d.y + d.h]), bottom], 9e-3);
  const ARTERIAL_W = 92e-4;
  const usedNames = /* @__PURE__ */ new Set();
  const roadName = () => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const name = `${rng.pick(STREET_NAMES)} ${rng.pick(STREET_SUFFIX)}`;
      if (!usedNames.has(name)) {
        usedNames.add(name);
        return name;
      }
    }
    return `${rng.pick(STREET_NAMES)} Street`;
  };
  for (const x of verticals) {
    const centre = x;
    roads.push({
      cls: "arterial",
      pts: [
        { x: centre, y: top - 0.045 },
        { x: centre, y: bottom + 0.045 }
      ],
      width: ARTERIAL_W,
      name: roadName(),
      major: true
    });
  }
  for (const y of horizontals) {
    const centre = y;
    roads.push({
      cls: "arterial",
      pts: [
        { x: left - 0.05, y: centre },
        { x: right + 0.05, y: centre }
      ],
      width: ARTERIAL_W,
      name: roadName(),
      major: true
    });
  }
  const diagonals = [
    {
      cls: "arterial",
      pts: [
        { x: left - 0.04, y: top + 0.02 },
        { x: 0.44, y: 0.33 },
        { x: 0.62, y: 0.48 },
        { x: right + 0.04, y: 0.66 }
      ],
      width: 78e-4,
      name: roadName(),
      major: true
    },
    {
      cls: "arterial",
      pts: [
        { x: 0.2, y: bottom + 0.04 },
        { x: 0.36, y: 0.73 },
        { x: 0.52, y: 0.6 },
        { x: 0.66, y: 0.3 },
        { x: 0.74, y: top - 0.04 }
      ],
      width: 72e-4,
      name: roadName(),
      major: true
    }
  ];
  roads.push(...diagonals);
  amenities.push({ kind: "fountain", x: 0.44, y: 0.33, r: 75e-4 });
  amenities.push({ kind: "fountain", x: 0.66, y: 0.3, r: 68e-4 });
  amenities.push({ kind: "fountain", x: 0.36, y: 0.73, r: 62e-4 });
  for (const x of verticals) {
    for (const y of horizontals) {
      amenities.push({ kind: "signal", x, y, r: 16e-4 });
    }
  }
  const railY = 0.2985;
  roads.push({
    cls: "rail",
    pts: [
      { x: left - 0.05, y: railY },
      { x: right + 0.05, y: railY }
    ],
    width: 42e-4,
    name: "Northgate Main Line",
    major: true
  });
  roads.push({
    cls: "rail",
    pts: [
      { x: 0.503, y: top - 0.05 },
      { x: 0.503, y: railY }
    ],
    width: 42e-4,
    name: null,
    major: true
  });
  const transit = DISTRICTS.find((d) => d.id === "transit");
  if (transit) {
    reserved.push({ x: transit.x + 0.016, y: transit.y + 0.08, w: 0.1, h: 0.125 });
    for (let i = 0; i < 4; i += 1) {
      fillers.push({
        kind: "platform",
        x: 0.4915 + i * 55e-4,
        y: transit.y + 0.085,
        w: 32e-4,
        h: 0.115,
        floors: 1,
        tone: 0.5,
        district: "transit"
      });
    }
    fillers.push({
      kind: "terminal",
      x: transit.x + 0.02,
      y: transit.y + 0.09,
      w: 0.036,
      h: 0.07,
      floors: 3,
      tone: 0.62,
      district: "transit"
    });
    fillers.push({
      kind: "plaza",
      x: transit.x + 0.02,
      y: transit.y + 0.165,
      w: 0.05,
      h: 0.03,
      floors: 0,
      tone: 0.5,
      district: "transit"
    });
  }
  const airport = DISTRICTS.find((d) => d.id === "airport");
  if (airport) {
    reserved.push({ x: airport.x, y: airport.y, w: airport.w * 0.6, h: airport.h });
  }
  if (airport) {
    const runwayY = airport.y + airport.h * 0.34;
    roads.push({
      cls: "runway",
      pts: [
        { x: airport.x + 6e-3, y: runwayY },
        { x: airport.x + airport.w - 6e-3, y: runwayY }
      ],
      width: 0.011,
      name: "Runway 09/27",
      major: false
    });
    roads.push({
      cls: "taxiway",
      pts: [
        { x: airport.x + 0.012, y: runwayY + 0.036 },
        { x: airport.x + airport.w - 0.012, y: runwayY + 0.036 }
      ],
      width: 5e-3,
      name: null,
      major: false
    });
    for (let i = 0; i < 3; i += 1) {
      const x = airport.x + 0.03 + i * 0.05;
      roads.push({
        cls: "taxiway",
        pts: [
          { x, y: runwayY },
          { x, y: runwayY + 0.036 }
        ],
        width: 4e-3,
        name: null,
        major: false
      });
    }
    fillers.push({
      kind: "terminal",
      x: airport.x + 0.028,
      y: runwayY + 0.045,
      w: 0.11,
      h: 0.035,
      floors: 3,
      tone: 0.66,
      district: "airport"
    });
    for (let i = 0; i < 4; i += 1) {
      fillers.push({
        kind: "hangar",
        x: airport.x + 0.014 + i * 0.038,
        y: airport.y + 0.018,
        w: 0.031,
        h: 0.03,
        floors: 1,
        tone: 0.42 + i * 0.04,
        district: "airport"
      });
    }
    fillers.push({
      kind: "parking",
      x: airport.x + 0.028,
      y: runwayY + 0.088,
      w: 0.11,
      h: 0.042,
      floors: 0,
      tone: 0.5,
      district: "airport"
    });
    amenities.push({ kind: "mast", x: airport.x + airport.w - 0.02, y: runwayY + 0.05, r: 4e-3 });
  }
  for (const def of DISTRICTS) {
    buildDistrict(def, rng, { reserved, roads, fillers, amenities, water, plots, parks }, roadName);
  }
  buildCountryside(rng, fillers, amenities, { left, right, top, bottom });
  return {
    roads,
    fillers: fillers.map((f, i) => ({ ...f, asset: assetForFiller(f, i) })),
    amenities: amenities.map((a, i) => ({ ...a, asset: assetForAmenity(a, i) })),
    water,
    plots,
    parks
  };
}
function buildCountryside(rng, fillers, amenities, bounds) {
  const { left, right, top, bottom } = bounds;
  const taken = [
    { x: left - 0.175, y: bottom - 0.12, w: 0.09, h: 0.08 }
  ];
  fillers.push({
    kind: "solar",
    x: left - 0.175,
    y: bottom - 0.12,
    w: 0.09,
    h: 0.08,
    floors: 0,
    tone: 0.5,
    district: "outskirts"
  });
  for (let i = 0; i < 7; i += 1) {
    const x = right + 0.07 + i % 2 * 0.045;
    const y = top + 0.04 + i * 0.1;
    taken.push({ x: x - 6e-3, y: y - 6e-3, w: 0.034, h: 0.034 });
    fillers.push({
      kind: "turbine",
      x,
      y,
      w: 0.022,
      h: 0.022,
      floors: 0,
      tone: 0.5,
      district: "outskirts"
    });
  }
  const clash = (r) => taken.some((t) => r.x + r.w > t.x && t.x + t.w > r.x && r.y + r.h > t.y && t.y + t.h > r.y);
  const belts = [
    { x: left - 0.2, y: top - 0.18, w: 0.17, h: bottom - top + 0.36 },
    { x: right + 0.03, y: top - 0.18, w: 0.18, h: bottom - top + 0.36 },
    { x: left - 0.03, y: top - 0.18, w: right - left + 0.06, h: 0.15 },
    { x: left - 0.03, y: bottom + 0.03, w: right - left + 0.06, h: 0.15 }
  ];
  const uses = ["field", "field", "pasture", "field", "orchard", "pasture", "field", "glasshouse"];
  let n = 0;
  const parcel = (r, depth) => {
    const small = r.w < 0.055 && r.h < 0.055;
    if (!small && depth < 4) {
      const alongX = r.w >= r.h;
      const cut = rng.range(0.34, 0.66);
      const gap = 24e-4;
      if (alongX) {
        parcel({ x: r.x, y: r.y, w: r.w * cut - gap, h: r.h }, depth + 1);
        parcel({ x: r.x + r.w * cut + gap, y: r.y, w: r.w * (1 - cut) - gap, h: r.h }, depth + 1);
      } else {
        parcel({ x: r.x, y: r.y, w: r.w, h: r.h * cut - gap }, depth + 1);
        parcel({ x: r.x, y: r.y + r.h * cut + gap, w: r.w, h: r.h * (1 - cut) - gap }, depth + 1);
      }
      return;
    }
    if (r.w < 0.012 || r.h < 0.012) return;
    if (clash(r)) return;
    if (rng.chance(0.3)) {
      const clump = 2 + Math.floor(rng.next() * 5);
      for (let t = 0; t < clump; t += 1) {
        amenities.push({
          kind: "tree",
          x: r.x + rng.next() * r.w,
          y: r.y + rng.next() * r.h,
          r: rng.range(24e-4, 46e-4)
        });
      }
      return;
    }
    const kind = uses[n % uses.length];
    n += 1;
    fillers.push({
      kind,
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
      floors: kind === "glasshouse" ? 1 : 0,
      tone: rng.next(),
      district: "outskirts"
    });
    if (rng.chance(0.45)) {
      const vertical = rng.chance(0.5);
      amenities.push({
        kind: "hedge",
        x: vertical ? r.x : r.x + r.w / 2,
        y: vertical ? r.y + r.h / 2 : r.y,
        r: (vertical ? r.h : r.w) * 0.25,
        vertical
      });
    }
    if (kind !== "glasshouse" && r.w > 0.03 && r.h > 0.025 && rng.chance(0.22)) {
      fillers.push({
        kind: "farmstead",
        x: r.x + r.w * 0.08,
        y: r.y + r.h * 0.08,
        w: Math.min(r.w * 0.3, 0.014),
        h: Math.min(r.h * 0.28, 0.011),
        floors: 1,
        tone: rng.next(),
        district: "outskirts"
      });
    }
  };
  for (const belt of belts) parcel(belt, 0);
}
function assetForFiller(f, index) {
  const key2 = `${f.kind}|${f.district}|${index}`;
  switch (f.kind) {
    case "house":
      return pick(f.district === "highend" || f.district === "suburbs" ? ["detached-house", "villa", "semi-detached"] : ["semi-detached", "detached-house", "tiny-house"], key2);
    case "terrace":
      return pick(["terrace", "social-housing", "student-house"], key2);
    case "apartment":
      return pick(f.district === "university" ? ["student-house", "apartment-block", "social-housing"] : ["apartment-block", "social-housing"], key2);
    case "tower":
      return pick(["curtain-wall-tower", "head-office", "office-block"], key2);
    case "office":
      return pick(OFFICES, key2);
    case "retail":
      return pick(SHOPS, key2);
    case "shed":
      return pick(f.district === "industrial" ? ["brick-works", "foundry", "assembly-plant", "machine-shop", "steelworks", "textile-mill", "food-processing", "recycling-centre"] : ["small-warehouse", "warehouse", "large-warehouse", "distribution-centre", "cold-store", "sorting-office"], key2);
    case "hangar":
      return pick(["transhipment-yard", "container-terminal", "large-warehouse"], key2);
    case "civic":
      return pick(CIVIC, key2);
    case "hotel":
      return pick(["hotel", "small-hotel", "restaurant", "cinema", "gym"], key2);
    case "terminal":
      return f.district === "airport" ? "airport" : "station";
    case "platform":
      return "station";
    case "quay":
      return "harbour";
    case "park":
      return pick(["city-park", "city-park", "petting-farm", "cemetery"], key2);
    case "plaza":
      return pick(["market-square", "terrace-seating"], key2);
    case "pitch":
      return "city-park";
    case "parking":
      return "market-square";
    case "field":
      return "arable-field";
    case "orchard":
      return pick(["orchard", "fruit-plantation"], key2);
    case "pasture":
      return "pasture";
    case "glasshouse":
      return "glasshouse";
    case "solar":
      return "solar-farm";
    case "turbine":
      return "wind-turbine";
    case "farmstead":
      return pick(["farmhouse", "poultry-shed", "livestock-shed"], key2);
    default:
      return "office-block";
  }
}
var OFFICES = [
  "glass-office",
  "courtyard-office",
  "business-centre",
  "corner-office",
  "head-office",
  "rooftop-garden-office",
  "office-block",
  "chambers",
  "riverside-office"
];
var SHOPS = [
  "supermarket",
  "electronics-store",
  "clothing-store",
  "furniture-store",
  "builders-merchant",
  "sports-shop",
  "pharmacy",
  "car-showroom",
  "shopping-centre",
  "filling-station",
  "cafe",
  "restaurant",
  "bank"
];
var CIVIC = [
  "school",
  "town-hall",
  "courthouse",
  "police-station",
  "fire-station",
  "hospital",
  "university",
  "bank",
  "events-hall",
  "research-centre",
  "data-centre"
];
var TREES = ["oak", "beech", "pine", "birch", "oak", "beech"];
function assetForAmenity(a, index) {
  switch (a.kind) {
    case "tree":
      return pick(TREES, `tree|${index}`);
    case "light":
      return "street-light";
    case "bus":
      return "bus-stop";
    case "signal":
      return "traffic-light";
    case "fountain":
      return "fountain";
    case "mast":
      return "telecom-mast";
    case "bench":
      return "bench";
    case "planter":
      return pick(["planter", "flowers"], `planter|${index}`);
    case "hedge":
      return "hedge";
    case "shrub":
      return pick(["shrubs", "rocks"], `shrub|${index}`);
    case "bin":
      return "litter-bin";
    case "railings":
      return "railings";
    default:
      return "shrubs";
  }
}
function pick(pool, key2) {
  let h2 = 2166136261;
  for (let i = 0; i < key2.length; i += 1) {
    h2 ^= key2.charCodeAt(i);
    h2 = Math.imul(h2, 16777619);
  }
  return pool[(h2 >>> 0) % pool.length];
}
function buildDistrict(def, rng, sink, roadName) {
  const style = STYLES[def.id];
  const inset = 5e-3;
  const area = {
    x: def.x + inset,
    y: def.y + inset,
    w: def.w - inset * 2,
    h: def.h - inset * 2
  };
  if (def.id === "waterfront") {
    const quayW = 0.03;
    sink.fillers.push({
      kind: "quay",
      x: area.x,
      y: area.y,
      w: quayW,
      h: area.h,
      floors: 0,
      tone: 0.5,
      district: def.id
    });
    for (let i = 0; i < 5; i += 1) {
      sink.fillers.push({
        kind: "shed",
        x: area.x + 4e-3,
        y: area.y + 0.012 + i * 0.042,
        w: 0.021,
        h: 0.03,
        floors: 1,
        tone: 0.4 + i * 0.05,
        district: def.id
      });
    }
    area.x += quayW + 4e-3;
    area.w -= quayW + 4e-3;
  }
  if (def.id === "airport") {
    area.x += area.w * 0.6;
    area.w *= 0.4;
  }
  const columns = Math.max(2, Math.round(area.w / style.block));
  const rows = Math.max(2, Math.round(area.h / style.block));
  const cellW = area.w / columns;
  const cellH = area.h / rows;
  const sw = style.street;
  const nameA = roadName();
  const nameB = roadName();
  for (let c = 1; c < columns; c += 1) {
    const x = area.x + c * cellW;
    sink.roads.push({
      cls: c % 2 === 0 ? "street" : "lane",
      pts: [
        { x, y: area.y - STUB },
        { x, y: area.y + area.h + STUB }
      ],
      width: c % 2 === 0 ? sw : sw * 0.78,
      name: c === Math.floor(columns / 2) ? nameA : null,
      major: false
    });
  }
  for (let r = 1; r < rows; r += 1) {
    const y = area.y + r * cellH;
    sink.roads.push({
      cls: r % 2 === 0 ? "street" : "lane",
      pts: [
        { x: area.x - STUB, y },
        { x: area.x + area.w + STUB, y }
      ],
      width: r % 2 === 0 ? sw : sw * 0.78,
      name: r === Math.floor(rows / 2) ? nameB : null,
      major: false
    });
  }
  const blocks = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < columns; c += 1) {
      const x = area.x + c * cellW + sw / 2;
      const y = area.y + r * cellH + sw / 2;
      const w = cellW - sw;
      const h2 = cellH - sw;
      if (w < 4e-3 || h2 < 4e-3) continue;
      if (sink.reserved.some((res) => x + w > res.x && res.x + res.w > x && y + h2 > res.y && res.y + res.h > y)) continue;
      const edge = c === 0 || c === columns - 1 || r === 0 || r === rows - 1;
      const corner = (c === 0 || c === columns - 1) && (r === 0 || r === rows - 1);
      const mix = { ...style.mix };
      if (edge && mix.commercial) mix.commercial *= 1.35;
      if (!edge && mix.commercial) mix.commercial *= 0.85;
      blocks.push({
        x,
        y,
        w,
        h: h2,
        use: weightedUse(rng, mix),
        edge,
        corner,
        topEdge: r === 0,
        bottomEdge: r === rows - 1
      });
    }
  }
  const quota = plotCount(def);
  const candidates = blocks.filter((b) => b.use === "commercial").sort((a, b) => Number(b.corner) - Number(a.corner) || Number(b.edge) - Number(a.edge));
  if (candidates.length * 2.4 < quota) {
    for (const block2 of blocks) {
      if (candidates.length * 2.4 >= quota) break;
      if (block2.use === "commercial" || block2.use === "park" || block2.use === "civic") continue;
      block2.use = "commercial";
      candidates.push(block2);
    }
    candidates.sort((a, b) => Number(b.corner) - Number(a.corner) || Number(b.edge) - Number(a.edge));
  }
  const streetA = `${rng.pick(STREET_NAMES)} ${rng.pick(STREET_SUFFIX)}`;
  const streetB = `${rng.pick(STREET_NAMES)} ${rng.pick(STREET_SUFFIX)}`;
  let made = 0;
  for (const block2 of candidates) {
    if (made >= quota) {
      fillCommercialBlock(block2, def, style, rng, sink, null);
      continue;
    }
    made = fillCommercialBlock(block2, def, style, rng, sink, {
      quota,
      made,
      streetA,
      streetB
    });
  }
  const rest = blocks.filter((b) => b.use !== "commercial");
  for (const block2 of rest) {
    if (made >= quota) break;
    if (block2.use === "park" || block2.use === "plaza") continue;
    block2.use = "commercial";
    made = fillCommercialBlock(block2, def, style, rng, sink, { quota, made, streetA, streetB });
  }
  for (const block2 of blocks) {
    if (block2.use === "commercial") continue;
    fillBlock(block2, def, style, rng, sink);
  }
  const treeBudget = Math.round(style.trees * 120);
  for (let i = 0; i < treeBudget; i += 1) {
    const vertical = rng.chance(0.5);
    const along = vertical ? area.y + rng.next() * area.h : area.x + rng.next() * area.w;
    const line = vertical ? area.x + Math.max(1, Math.round(rng.next() * columns)) * cellW : area.y + Math.max(1, Math.round(rng.next() * rows)) * cellH;
    const offset = (rng.chance(0.5) ? -1 : 1) * (sw * 0.62 + 12e-4);
    const point = vertical ? { x: line + offset, y: along } : { x: along, y: line + offset };
    if (point.x < def.x || point.x > def.x + def.w || point.y < def.y || point.y > def.y + def.h) continue;
    sink.amenities.push({ kind: "tree", x: point.x, y: point.y, r: rng.range(14e-4, 26e-4) });
  }
  for (let i = 0; i < 3; i += 1) {
    sink.amenities.push({
      kind: "bus",
      x: area.x + area.w * ((i + 0.5) / 3),
      y: area.y + Math.floor(rows / 2) * cellH + 32e-4,
      r: 22e-4
    });
  }
}
function fillCommercialBlock(block2, def, style, rng, sink, quotaState) {
  const depth = Math.min(block2.h * 0.4, 0.011);
  const minWidth = def.id === "tourist" ? 52e-4 : 75e-4;
  const maxWidth = def.id === "industrial" || def.id === "warehouse" ? 0.03 : 0.016;
  const rows = [
    { y: block2.y, h: depth, frontage: block2.topEdge ? "arterial" : "street" }
  ];
  if (block2.h > depth * 1.9) {
    rows.push({
      y: block2.y + block2.h - depth,
      h: depth,
      frontage: block2.bottomEdge ? "arterial" : "back"
    });
  }
  let made = quotaState?.made ?? 0;
  for (const row2 of rows) {
    for (const run of runs(rng, block2.x, block2.w, minWidth, maxWidth)) {
      const w = run.b - run.a - 6e-4;
      if (w < 3e-3) continue;
      const isCorner = run.a <= block2.x + 1e-4 || run.b >= block2.x + block2.w - 1e-4;
      if (quotaState && made < quotaState.quota) {
        made += 1;
        const number = made * 2 + rng.int(0, 1);
        sink.plots.push({
          id: `${def.id}-${made}`,
          district: def.id,
          x: run.a,
          y: row2.y,
          w,
          h: row2.h,
          frontage: row2.frontage,
          corner: isCorner && row2.frontage !== "back",
          weight: clamp(w * row2.h / (0.013 * 0.011), 0.25, 1),
          street: made % 2 === 0 ? quotaState.streetA : quotaState.streetB,
          number
        });
      } else {
        sink.fillers.push({
          kind: "retail",
          x: run.a,
          y: row2.y,
          w,
          h: row2.h,
          floors: rng.int(style.floors[0], style.floors[1]),
          tone: rng.next(),
          district: def.id
        });
      }
    }
  }
  const backY = block2.y + depth + 12e-4;
  const backH = block2.h - depth * (rows.length === 2 ? 2 : 1) - 24e-4;
  if (backH > 4e-3) {
    sink.fillers.push({
      kind: rng.chance(0.62) ? "parking" : "office",
      x: block2.x + 1e-3,
      y: backY,
      w: block2.w - 2e-3,
      h: backH,
      floors: rng.int(1, 3),
      tone: rng.next(),
      district: def.id
    });
  }
  return made;
}
function fillBlock(block2, def, style, rng, sink) {
  const { x, y, w, h: h2, use } = block2;
  if (use === "park") {
    sink.fillers.push({ kind: "park", x, y, w, h: h2, floors: 0, tone: rng.next(), district: def.id });
    if (w * h2 > 9e-4) {
      sink.parks.push({ x, y, w, h: h2, name: `${rng.pick(STREET_NAMES)} ${rng.chance(0.5) ? "Park" : "Gardens"}` });
    }
    const trees = Math.round(clamp(w * h2 / 12e-6, 6, 90));
    for (let i = 0; i < trees; i += 1) {
      sink.amenities.push({
        kind: "tree",
        x: x + rng.range(15e-4, w - 15e-4),
        y: y + rng.range(15e-4, h2 - 15e-4),
        r: rng.range(16e-4, 32e-4)
      });
    }
    if (w > 0.02 && h2 > 0.02 && rng.chance(0.4)) {
      sink.fillers.push({
        kind: "pitch",
        x: x + w * 0.2,
        y: y + h2 * 0.3,
        w: w * 0.55,
        h: h2 * 0.38,
        floors: 0,
        tone: 0.5,
        district: def.id
      });
    }
    return;
  }
  if (use === "plaza") {
    sink.fillers.push({ kind: "plaza", x, y, w, h: h2, floors: 0, tone: rng.next(), district: def.id });
    if (rng.chance(0.5)) sink.amenities.push({ kind: "fountain", x: x + w / 2, y: y + h2 / 2, r: Math.min(w, h2) * 0.16 });
    for (let i = 0; i < 5; i += 1) {
      sink.amenities.push({
        kind: "tree",
        x: x + rng.range(2e-3, w - 2e-3),
        y: y + rng.range(2e-3, h2 - 2e-3),
        r: rng.range(14e-4, 22e-4)
      });
    }
    return;
  }
  if (use === "parking") {
    sink.fillers.push({ kind: "parking", x, y, w, h: h2, floors: 0, tone: rng.next(), district: def.id });
    return;
  }
  if (use === "industrial") {
    const count2 = w > 0.04 ? 2 : 1;
    for (let i = 0; i < count2; i += 1) {
      sink.fillers.push({
        kind: rng.chance(0.25) ? "hangar" : "shed",
        x: x + 2e-3 + i * (w - 4e-3) / count2,
        y: y + 2e-3,
        w: (w - 4e-3) / count2 - 2e-3,
        h: h2 * rng.range(0.5, 0.72),
        floors: rng.int(1, 2),
        tone: rng.next(),
        district: def.id
      });
    }
    sink.fillers.push({
      kind: "parking",
      x: x + 2e-3,
      y: y + h2 * 0.78,
      w: w - 4e-3,
      h: h2 * 0.2,
      floors: 0,
      tone: rng.next(),
      district: def.id
    });
    return;
  }
  if (use === "civic") {
    const inset = Math.min(w, h2) * 0.16;
    sink.fillers.push({
      kind: rng.chance(0.3) ? "hotel" : "civic",
      x: x + inset,
      y: y + inset,
      w: w - inset * 2,
      h: h2 - inset * 2,
      floors: rng.int(style.floors[0] + 1, style.floors[1]),
      tone: rng.next(),
      district: def.id
    });
    for (let i = 0; i < 6; i += 1) {
      sink.amenities.push({
        kind: "tree",
        x: x + rng.range(1e-3, w - 1e-3),
        y: y + rng.range(1e-3, h2 - 1e-3),
        r: rng.range(14e-4, 24e-4)
      });
    }
    return;
  }
  switch (style.housing) {
    case "detached": {
      const plot = 88e-4;
      const cols = Math.max(1, Math.floor(w / plot));
      const rws = Math.max(1, Math.floor(h2 / plot));
      for (let c = 0; c < cols; c += 1) {
        for (let r = 0; r < rws; r += 1) {
          if (rng.chance(0.12)) continue;
          const cw = w / cols;
          const ch = h2 / rws;
          const size = rng.range(0.45, 0.62);
          sink.fillers.push({
            kind: "house",
            x: x + c * cw + cw * (1 - size) * 0.5,
            y: y + r * ch + ch * (1 - size) * 0.5,
            w: cw * size,
            h: ch * size,
            floors: rng.int(1, 2),
            tone: rng.next(),
            district: def.id
          });
          if (rng.chance(0.5)) {
            sink.amenities.push({
              kind: "tree",
              x: x + c * cw + cw * rng.range(0.1, 0.9),
              y: y + r * ch + ch * rng.range(0.1, 0.9),
              r: rng.range(14e-4, 24e-4)
            });
          }
        }
      }
      return;
    }
    case "terrace": {
      const depth = Math.min(h2 * 0.34, 9e-3);
      for (const row2 of [y, y + h2 - depth]) {
        for (const run of runs(rng, x, w, 26e-4, 42e-4)) {
          sink.fillers.push({
            kind: "terrace",
            x: run.a,
            y: row2,
            w: run.b - run.a - 3e-4,
            h: depth,
            floors: rng.int(2, 3),
            tone: rng.next(),
            district: def.id
          });
        }
      }
      return;
    }
    case "apartment": {
      const count2 = Math.max(1, Math.round(w / 0.016));
      for (let i = 0; i < count2; i += 1) {
        const bw = (w - 3e-3 * (count2 + 1)) / count2;
        sink.fillers.push({
          kind: "apartment",
          x: x + 3e-3 + i * (bw + 3e-3),
          y: y + 25e-4,
          w: bw,
          h: h2 - 5e-3,
          floors: rng.int(style.floors[0], style.floors[1]),
          tone: rng.next(),
          district: def.id
        });
      }
      return;
    }
    case "tower": {
      const inset = Math.min(w, h2) * rng.range(0.1, 0.2);
      sink.fillers.push({
        kind: "tower",
        x: x + inset,
        y: y + inset,
        w: w - inset * 2,
        h: h2 - inset * 2,
        floors: rng.int(style.floors[0], style.floors[1]),
        tone: rng.next(),
        district: def.id
      });
      return;
    }
    default: {
      sink.fillers.push({
        kind: "shed",
        x: x + 2e-3,
        y: y + 2e-3,
        w: w - 4e-3,
        h: h2 - 4e-3,
        floors: 1,
        tone: rng.next(),
        district: def.id
      });
    }
  }
}

// src/data/atlas.ts
var ATLAS = [
  { id: "glass-office", name: "Glass office", kind: "office", roof: "#a2a19c", roofAlt: "#ddd8d5", wall: "#5e818f", wallAlt: "#99a8a2", accent: "#618998", ratio: 1.15 },
  { id: "courtyard-office", name: "Courtyard office", kind: "office", roof: "#838380", roofAlt: "#dfdbda", wall: "#5e693c", wallAlt: "#7e8776", accent: "#858f7b", ratio: 1.16 },
  { id: "business-centre", name: "Business centre", kind: "office", roof: "#dfdad7", roofAlt: "#737940", wall: "#828c8f", wallAlt: "#e8e4e1", accent: "#7d8342", ratio: 1.24 },
  { id: "curtain-wall-tower", name: "Curtain-wall tower", kind: "office", roof: "#828995", roofAlt: "#e2ddda", wall: "#7b8889", wallAlt: "#3d5f61", accent: "#4c678e", ratio: 1.06 },
  { id: "corner-office", name: "Corner office", kind: "office", roof: "#7c7d73", roofAlt: "#e8e0d9", wall: "#788285", wallAlt: "#eee5d7", accent: "#f1e7d8", ratio: 1.23 },
  { id: "head-office", name: "Head office", kind: "office", roof: "#e4dbd7", roofAlt: "#627385", wall: "#768686", wallAlt: "#3e5e61", accent: "#42676b", ratio: 1.07 },
  { id: "rooftop-garden-office", name: "Rooftop-garden office", kind: "office", roof: "#868a8b", roofAlt: "#dbd7d5", wall: "#41615f", wallAlt: "#688693", accent: "#435f70", ratio: 1.07 },
  { id: "office-block", name: "Office block", kind: "office", roof: "#7b817d", roofAlt: "#e5ded8", wall: "#eae0d9", wallAlt: "#636e35", accent: "#44606b", ratio: 1.13 },
  { id: "riverside-office", name: "Riverside office", kind: "office", roof: "#536e85", roofAlt: "#7990a2", wall: "#50778a", wallAlt: "#7b969d", accent: "#528094", ratio: 1.17 },
  { id: "chambers", name: "Chambers", kind: "office", roof: "#607380", roofAlt: "#8f9ba3", wall: "#6b8084", wallAlt: "#eee6dc", accent: "#406565", ratio: 1.08 },
  { id: "supermarket", name: "Supermarket", kind: "retail", roof: "#a1a0a9", roofAlt: "#dbc8b7", wall: "#e4d0b1", wallAlt: "#bfb788", accent: "#c6be89", ratio: 1.26 },
  { id: "electronics-store", name: "Electronics store", kind: "retail", roof: "#787276", roofAlt: "#8d888a", wall: "#7e7a7c", wallAlt: "#b6aca8", accent: "#636c43", ratio: 1.55 },
  { id: "clothing-store", name: "Clothing store", kind: "retail", roof: "#6d7d32", roofAlt: "#837f80", wall: "#848084", wallAlt: "#e4d8cd", accent: "#5c6244", ratio: 1.08 },
  { id: "furniture-store", name: "Furniture store", kind: "retail", roof: "#946b6e", roofAlt: "#c3a493", wall: "#7f5b45", wallAlt: "#dcbfb0", accent: "#ed373e", ratio: 1.2 },
  { id: "builders-merchant", name: "Builders merchant", kind: "retail", roof: "#6b7695", roofAlt: "#c7b19e", wall: "#8f5c3a", wallAlt: "#e8ae6d", accent: "#9d633b", ratio: 1.28 },
  { id: "sports-shop", name: "Sports shop", kind: "retail", roof: "#d2b29b", roofAlt: "#e7cab2", wall: "#ddbca2", wallAlt: "#927d6d", accent: "#e4c1a3", ratio: 1.16 },
  { id: "pharmacy", name: "Pharmacy", kind: "retail", roof: "#80828a", roofAlt: "#e3dddb", wall: "#848b8b", wallAlt: "#ece5e2", accent: "#f53b49", ratio: 1.26 },
  { id: "filling-station", name: "Filling station", kind: "retail", roof: "#918a8d", roofAlt: "#dac6c1", wall: "#c1a092", wallAlt: "#5e534b", accent: "#ec4649", ratio: 1.41 },
  { id: "car-showroom", name: "Car showroom", kind: "retail", roof: "#ede2da", roofAlt: "#677187", wall: "#eae2dd", wallAlt: "#dccdc6", accent: "#6c7890", ratio: 1.41 },
  { id: "shopping-centre", name: "Shopping centre", kind: "retail", roof: "#867e7d", roofAlt: "#e9d8c7", wall: "#857d71", wallAlt: "#ede0d3", accent: "#bfa996", ratio: 1.19 },
  { id: "brick-works", name: "Brick works", kind: "industry", roof: "#c3483a", roofAlt: "#e1e1df", wall: "#ede2db", wallAlt: "#847c7b", accent: "#d54a39", ratio: 1.09 },
  { id: "foundry", name: "Foundry", kind: "industry", roof: "#80767d", roofAlt: "#aa9e9f", wall: "#7c7881", wallAlt: "#eee7e6", accent: "#5a6537", ratio: 1.32 },
  { id: "assembly-plant", name: "Assembly plant", kind: "industry", roof: "#7e92a6", roofAlt: "#a5bbc8", wall: "#6d94ae", wallAlt: "#8fafc1", accent: "#6f9bb7", ratio: 1.1 },
  { id: "chemical-plant", name: "Chemical plant", kind: "industry", roof: "#b9a599", roofAlt: "#8d6c65", wall: "#eadcd2", wallAlt: "#787067", accent: "#97726a", ratio: 1.01 },
  { id: "food-processing", name: "Food processing", kind: "industry", roof: "#8c8689", roofAlt: "#dccdc8", wall: "#e2d4ca", wallAlt: "#c5b7af", accent: "#e74c38", ratio: 0.94 },
  { id: "steelworks", name: "Steelworks", kind: "industry", roof: "#e1d7cf", roofAlt: "#85716f", wall: "#e9dfd9", wallAlt: "#747270", accent: "#ad988d", ratio: 1.12 },
  { id: "textile-mill", name: "Textile mill", kind: "industry", roof: "#827979", roofAlt: "#deccc4", wall: "#867f87", wallAlt: "#efe4e0", accent: "#b7625b", ratio: 1.33 },
  { id: "vehicle-plant", name: "Vehicle plant", kind: "industry", roof: "#7e828e", roofAlt: "#c9c8c9", wall: "#7b868b", wallAlt: "#a4b4bb", accent: "#445471", ratio: 1.44 },
  { id: "machine-shop", name: "Machine shop", kind: "industry", roof: "#a99d99", roofAlt: "#7f7879", wall: "#938882", wallAlt: "#c6b6a9", accent: "#ccbaac", ratio: 1.35 },
  { id: "recycling-centre", name: "Recycling centre", kind: "industry", roof: "#77776e", roofAlt: "#a29d8d", wall: "#798881", wallAlt: "#adb1a7", accent: "#a9a491", ratio: 1.06 },
  { id: "small-warehouse", name: "Small warehouse", kind: "logistics", roof: "#afacaf", roofAlt: "#e9ddd8", wall: "#c5b4a8", wallAlt: "#ac9a91", accent: "#b39f95", ratio: 0.94 },
  { id: "warehouse", name: "Warehouse", kind: "logistics", roof: "#4e6181", roofAlt: "#beb4b2", wall: "#beafa8", wallAlt: "#ede2da", accent: "#51688d", ratio: 1.03 },
  { id: "large-warehouse", name: "Large warehouse", kind: "logistics", roof: "#b5b5be", roofAlt: "#565e62", wall: "#b3a298", wallAlt: "#eaded6", accent: "#baa79c", ratio: 1.02 },
  { id: "distribution-centre", name: "Distribution centre", kind: "logistics", roof: "#a69c9d", roofAlt: "#596b8f", wall: "#b2a5a0", wallAlt: "#e9e2de", accent: "#5d729a", ratio: 0.91 },
  { id: "cold-store", name: "Cold store", kind: "logistics", roof: "#c5b8b2", roofAlt: "#868084", wall: "#747981", wallAlt: "#c4b2a2", accent: "#4c6ba0", ratio: 1.24 },
  { id: "container-terminal", name: "Container terminal", kind: "logistics", roof: "#9c4736", roofAlt: "#dc6f3b", wall: "#c87e5a", wallAlt: "#98463d", accent: "#ec7338", ratio: 1.11 },
  { id: "sorting-office", name: "Sorting office", kind: "logistics", roof: "#b6a9a7", roofAlt: "#848081", wall: "#b0a3a0", wallAlt: "#d1c2ba", accent: "#d85a52", ratio: 1.08 },
  { id: "transhipment-yard", name: "Transhipment yard", kind: "logistics", roof: "#76798c", roofAlt: "#4a618f", wall: "#7a7a85", wallAlt: "#af9d95", accent: "#4c679b", ratio: 1.17 },
  { id: "bank", name: "Bank", kind: "civic", roof: "#847c77", roofAlt: "#e4d9cb", wall: "#376b97", wallAlt: "#a8a595", accent: "#3673a5", ratio: 1.01 },
  { id: "hospital", name: "Hospital", kind: "civic", roof: "#837b7b", roofAlt: "#e7e0d9", wall: "#8f8b80", wallAlt: "#ece1d8", accent: "#6c733b", ratio: 0.93 },
  { id: "fire-station", name: "Fire station", kind: "civic", roof: "#e27b5d", roofAlt: "#7a473d", wall: "#734938", wallAlt: "#d36752", accent: "#e26a52", ratio: 0.95 },
  { id: "police-station", name: "Police station", kind: "civic", roof: "#e0dad0", roofAlt: "#72787f", wall: "#77848a", wallAlt: "#a9aba0", accent: "#7d8b91", ratio: 0.9 },
  { id: "school", name: "School", kind: "civic", roof: "#8a7d79", roofAlt: "#76813a", wall: "#8f8170", wallAlt: "#cdab83", accent: "#7c7932", ratio: 1.28 },
  { id: "university", name: "University", kind: "civic", roof: "#847f79", roofAlt: "#dac9b9", wall: "#a09286", wallAlt: "#e9d8c5", accent: "#4a5362", ratio: 1.06 },
  { id: "town-hall", name: "Town hall", kind: "civic", roof: "#9a9a9e", roofAlt: "#d7d3cf", wall: "#e8ded3", wallAlt: "#5f673f", accent: "#677043", ratio: 1.31 },
  { id: "courthouse", name: "Courthouse", kind: "civic", roof: "#857f78", roofAlt: "#dac6b4", wall: "#8a8171", wallAlt: "#e7d4c2", accent: "#757e2c", ratio: 1.06 },
  { id: "restaurant", name: "Restaurant", kind: "leisure", roof: "#8d7567", roofAlt: "#6b7531", wall: "#8b725d", wallAlt: "#c69a72", accent: "#8c5b3e", ratio: 0.95 },
  { id: "cafe", name: "Caf\xE9", kind: "leisure", roof: "#697731", roofAlt: "#8e7465", wall: "#b87a69", wallAlt: "#956857", accent: "#c47e6c", ratio: 0.95 },
  { id: "small-hotel", name: "Small hotel", kind: "leisure", roof: "#a6846e", roofAlt: "#e2ae7e", wall: "#cfa079", wallAlt: "#a07d5e", accent: "#ecb37d", ratio: 0.9 },
  { id: "hotel", name: "Hotel", kind: "leisure", roof: "#ecdbc8", roofAlt: "#7d7a73", wall: "#e7d5c2", wallAlt: "#8c8371", accent: "#6f7735", ratio: 0.98 },
  { id: "cinema", name: "Cinema", kind: "leisure", roof: "#7a7176", roofAlt: "#898284", wall: "#7d7579", wallAlt: "#805c44", accent: "#8c6347", ratio: 1.25 },
  { id: "gym", name: "Gym", kind: "leisure", roof: "#687632", roofAlt: "#8f8a79", wall: "#7d7877", wallAlt: "#a09690", accent: "#dacbb4", ratio: 1.07 },
  { id: "swimming-pool", name: "Swimming pool", kind: "leisure", roof: "#5f908d", roofAlt: "#667136", wall: "#2295b6", wallAlt: "#dcc09b", accent: "#1aa0c5", ratio: 1.3 },
  { id: "funfair-ride", name: "Funfair ride", kind: "leisure", roof: "#9a6f7a", roofAlt: "#686058", wall: "#8d836d", wallAlt: "#6d6a3c", accent: "#ce7968", ratio: 1.12 },
  { id: "terrace", name: "Terrace", kind: "housing", roof: "#7d767b", roofAlt: "#d49f80", wall: "#817a57", wallAlt: "#c29271", accent: "#717929", ratio: 1.16 },
  { id: "semi-detached", name: "Semi-detached", kind: "housing", roof: "#7b757a", roofAlt: "#d8a486", wall: "#87814c", wallAlt: "#ba9572", accent: "#72752c", ratio: 1.17 },
  { id: "detached-house", name: "Detached house", kind: "housing", roof: "#49534c", roofAlt: "#85856e", wall: "#636e2d", wallAlt: "#918f55", accent: "#9b9957", ratio: 0.9 },
  { id: "apartment-block", name: "Apartment block", kind: "housing", roof: "#e7d4c4", roofAlt: "#847b75", wall: "#867f71", wallAlt: "#e8d3c3", accent: "#798034", ratio: 1.01 },
  { id: "villa", name: "Villa", kind: "housing", roof: "#8e5d4a", roofAlt: "#b98671", wall: "#aa8a70", wallAlt: "#826f45", accent: "#9a624c", ratio: 1.33 },
  { id: "tiny-house", name: "Tiny house", kind: "housing", roof: "#667626", roofAlt: "#898948", wall: "#d19872", wallAlt: "#8d8046", accent: "#716e2d", ratio: 1.7 },
  { id: "student-house", name: "Student house", kind: "housing", roof: "#908580", roofAlt: "#e3cebd", wall: "#e4cebc", wallAlt: "#cab7a6", accent: "#777c36", ratio: 1.39 },
  { id: "social-housing", name: "Social housing", kind: "housing", roof: "#7a716e", roofAlt: "#d39471", wall: "#e8a377", wallAlt: "#c88b68", accent: "#8d513d", ratio: 1.4 },
  { id: "solar-farm", name: "Solar farm", kind: "energy", roof: "#476ba6", roofAlt: "#385592", wall: "#4362a2", wallAlt: "#707336", accent: "#385ba0", ratio: 1.54 },
  { id: "wind-turbine", name: "Wind turbine", kind: "energy", roof: "#e7e2df", roofAlt: "#afa9aa", wall: "#898c41", wallAlt: "#676e2d", accent: "#717a2d", ratio: 1.06 },
  { id: "gas-plant", name: "Gas plant", kind: "energy", roof: "#af3832", roofAlt: "#c08d7e", wall: "#9e8f7e", wallAlt: "#b6a99a", accent: "#c13931", ratio: 1.31 },
  { id: "nuclear-plant", name: "Nuclear plant", kind: "energy", roof: "#807b73", roofAlt: "#bfaa9b", wall: "#817a72", wallAlt: "#c9b8ab", accent: "#b1a089", ratio: 0.96 },
  { id: "storage-silos", name: "Storage silos", kind: "energy", roof: "#8f8886", roofAlt: "#cec1ae", wall: "#a29864", wallAlt: "#837d41", accent: "#8d8741", ratio: 1.85 },
  { id: "substation", name: "Substation", kind: "energy", roof: "#8e8c83", roofAlt: "#bdb7b2", wall: "#c5b3a3", wallAlt: "#9f9081", accent: "#686953", ratio: 1.48 },
  { id: "charging-hub", name: "Charging hub", kind: "energy", roof: "#dfdbd7", roofAlt: "#6f8489", wall: "#beafa5", wallAlt: "#eae5e2", accent: "#748b91", ratio: 2.3 },
  { id: "biogas-plant", name: "Biogas plant", kind: "energy", roof: "#698891", roofAlt: "#a4b7b3", wall: "#a19961", wallAlt: "#557d7e", accent: "#aba262", ratio: 1.73 },
  { id: "farmhouse", name: "Farmhouse", kind: "farm", roof: "#935043", roofAlt: "#86443c", wall: "#835c40", wallAlt: "#ca9563", accent: "#94483e", ratio: 1.26 },
  { id: "glasshouse", name: "Glasshouse", kind: "farm", roof: "#8d9493", roofAlt: "#73797a", wall: "#8b928e", wallAlt: "#74766b", accent: "#af9a4c", ratio: 1.13 },
  { id: "poultry-shed", name: "Poultry shed", kind: "farm", roof: "#8d8f8d", roofAlt: "#c8bdb7", wall: "#929292", wallAlt: "#8d7b52", accent: "#988454", ratio: 1.21 },
  { id: "livestock-shed", name: "Livestock shed", kind: "farm", roof: "#9a8882", roofAlt: "#7b726b", wall: "#897657", wallAlt: "#b49567", accent: "#7f7034", ratio: 1.3 },
  { id: "arable-field", name: "Arable field", kind: "farm", roof: "#90794d", roofAlt: "#be904b", wall: "#d99e59", wallAlt: "#ebb36a", accent: "#ce9445", ratio: 1.55 },
  { id: "orchard", name: "Orchard", kind: "farm", roof: "#878734", roofAlt: "#5e6e20", wall: "#9a8d3f", wallAlt: "#837f33", accent: "#929232", ratio: 1.51 },
  { id: "pasture", name: "Pasture", kind: "farm", roof: "#9a9145", roofAlt: "#b1aa54", wall: "#929440", wallAlt: "#848438", accent: "#8f8f37", ratio: 1.9 },
  { id: "fruit-plantation", name: "Fruit plantation", kind: "farm", roof: "#9e7f42", roofAlt: "#796b34", wall: "#817837", wallAlt: "#9c8b43", accent: "#7d6a29", ratio: 1.8 },
  { id: "research-centre", name: "Research centre", kind: "landmark", roof: "#7b8084", roofAlt: "#e3dcdd", wall: "#81846d", wallAlt: "#69722d", accent: "#737d2d", ratio: 1.16 },
  { id: "data-centre", name: "Data centre", kind: "landmark", roof: "#798a95", roofAlt: "#d8d5d6", wall: "#7f8f95", wallAlt: "#b8bab8", accent: "#3e5762", ratio: 1.15 },
  { id: "airport", name: "Airport", kind: "landmark", roof: "#545b5d", roofAlt: "#4c5659", wall: "#c0aea2", wallAlt: "#968a80", accent: "#c7b2a5", ratio: 1.22 },
  { id: "station", name: "Station", kind: "landmark", roof: "#867c7a", roofAlt: "#a99f98", wall: "#7f766f", wallAlt: "#b59f8a", accent: "#856045", ratio: 1.07 },
  { id: "harbour", name: "Harbour", kind: "landmark", roof: "#816c68", roofAlt: "#c1603d", wall: "#996757", wallAlt: "#b49b8b", accent: "#d1643c", ratio: 1.46 },
  { id: "stadium", name: "Stadium", kind: "landmark", roof: "#cec1c0", roofAlt: "#ac9c98", wall: "#c7b7b0", wallAlt: "#52754c", accent: "#a39a8a", ratio: 1.6 },
  { id: "events-hall", name: "Events hall", kind: "landmark", roof: "#a39292", roofAlt: "#e0d4c8", wall: "#dc6552", wallAlt: "#764747", accent: "#ec6851", ratio: 1.38 },
  { id: "telecom-mast", name: "Telecom mast", kind: "landmark", roof: "#716c6d", roofAlt: "#854349", wall: "#81464d", wallAlt: "#a7595b", accent: "#92464d", ratio: 0.85 },
  { id: "city-park", name: "City park", kind: "park", roof: "#768529", roofAlt: "#5f6f22", wall: "#7e7a46", wallAlt: "#a39859", accent: "#6d7724", ratio: 1.08 },
  { id: "fountain", name: "Fountain", kind: "park", roof: "#4a5549", roofAlt: "#768334", wall: "#cec3bb", wallAlt: "#89875f", accent: "#4e7775", ratio: 1.19 },
  { id: "playground", name: "Playground", kind: "park", roof: "#4e543e", roofAlt: "#736029", wall: "#d7ac70", wallAlt: "#a88747", accent: "#7f6929", ratio: 1.22 },
  { id: "petting-farm", name: "Petting farm", kind: "park", roof: "#c9a67c", roofAlt: "#737c2e", wall: "#867f4a", wallAlt: "#cdac79", accent: "#7d872c", ratio: 1.01 },
  { id: "cemetery", name: "Cemetery", kind: "park", roof: "#968e5a", roofAlt: "#737241", wall: "#90894e", wallAlt: "#a69c69", accent: "#7f7c36", ratio: 1.84 },
  { id: "statue", name: "Statue", kind: "park", roof: "#dac7b7", roofAlt: "#8f7a76", wall: "#d6c3b4", wallAlt: "#bfa99b", accent: "#c6ae9f", ratio: 1.42 },
  { id: "market-square", name: "Market square", kind: "park", roof: "#c5ad9c", roofAlt: "#e4d4c9", wall: "#c6b09d", wallAlt: "#ac957c", accent: "#726549", ratio: 1.74 },
  { id: "terrace-seating", name: "Terrace seating", kind: "park", roof: "#948d7f", roofAlt: "#ecd9ca", wall: "#efddd0", wallAlt: "#d1b6a4", accent: "#a58f7c", ratio: 1.58 },
  { id: "straight-road", name: "Straight road", kind: "road", roof: "#696768", roofAlt: "#6e6d6d", wall: "#6b6a6b", wallAlt: "#6e6e6f", accent: "#cab3a0", ratio: 1.68 },
  { id: "curved-road", name: "Curved road", kind: "road", roof: "#777373", roofAlt: "#cac0ba", wall: "#726e6e", wallAlt: "#aa9f98", accent: "#b0a49c", ratio: 1.44 },
  { id: "crossroads", name: "Crossroads", kind: "road", roof: "#878077", roofAlt: "#cac5ba", wall: "#837c78", wallAlt: "#b3aca5", accent: "#8e877c", ratio: 1.18 },
  { id: "t-junction", name: "T-junction", kind: "road", roof: "#807977", roofAlt: "#cdc3bc", wall: "#7c7773", wallAlt: "#b4aaa2", accent: "#4c413e", ratio: 1.26 },
  { id: "roundabout", name: "Roundabout", kind: "road", roof: "#716f6f", roofAlt: "#908787", wall: "#6e6c67", wallAlt: "#797768", accent: "#817f6d", ratio: 1.26 },
  { id: "motorway", name: "Motorway", kind: "road", roof: "#767372", roofAlt: "#b6b0ab", wall: "#757372", wallAlt: "#9d9894", accent: "#3a3d40", ratio: 1.45 },
  { id: "bridge", name: "Bridge", kind: "road", roof: "#928c8f", roofAlt: "#888186", wall: "#948d8f", wallAlt: "#a7a2a3", accent: "#8f878d", ratio: 1.76 },
  { id: "tunnel", name: "Tunnel", kind: "road", roof: "#747173", roofAlt: "#817a7c", wall: "#777073", wallAlt: "#9d8b7f", accent: "#a59283", ratio: 1.68 },
  { id: "cycle-path", name: "Cycle path", kind: "road", roof: "#c4685f", roofAlt: "#856a65", wall: "#c96d62", wallAlt: "#bc6258", accent: "#ca6559", ratio: 1.77 },
  { id: "footpath", name: "Footpath", kind: "road", roof: "#996a64", roofAlt: "#a99891", wall: "#b6a79e", wallAlt: "#a89791", accent: "#a57068", ratio: 1.67 },
  { id: "saloon-car", name: "Saloon car", kind: "vehicle", roof: "#222427", roofAlt: "#686e7a", wall: "#17171b", wallAlt: "#292e32", accent: "#2e3439", ratio: 1.06 },
  { id: "suv", name: "SUV", kind: "vehicle", roof: "#83838d", roofAlt: "#ebe8e9", wall: "#f1eded", wallAlt: "#797983", accent: "#898995", ratio: 1.5 },
  { id: "hatchback", name: "Hatchback", kind: "vehicle", roof: "#6989af", roofAlt: "#41668d", wall: "#6a8db5", wallAlt: "#86a8cc", accent: "#426d99", ratio: 1.43 },
  { id: "sports-car", name: "Sports car", kind: "vehicle", roof: "#ca272b", roofAlt: "#9c2a2f", wall: "#eb3238", wallAlt: "#ae282d", accent: "#df2429", ratio: 1.61 },
  { id: "electric-car", name: "Electric car", kind: "vehicle", roof: "#9ba27e", roofAlt: "#80866d", wall: "#9ba475", wallAlt: "#adb587", accent: "#7a8058", ratio: 1.35 },
  { id: "van", name: "Van", kind: "vehicle", roof: "#83868d", roofAlt: "#eee7e8", wall: "#868790", wallAlt: "#f6f5f4", accent: "#7c7c88", ratio: 1.2 },
  { id: "lorry", name: "Lorry", kind: "vehicle", roof: "#e4dddc", roofAlt: "#b1acae", wall: "#b5b1b3", wallAlt: "#aca6a9", accent: "#8a807d", ratio: 1.9 },
  { id: "articulated-lorry", name: "Articulated lorry", kind: "vehicle", roof: "#d9d2d1", roofAlt: "#a6a2a6", wall: "#9b9598", wallAlt: "#d5cac6", accent: "#605351", ratio: 1.74 },
  { id: "scooter", name: "Scooter", kind: "vehicle", roof: "#5e6364", roofAlt: "#7d7d83", wall: "#7b7b7f", wallAlt: "#76747b", accent: "#bfc2a0", ratio: 1.44 },
  { id: "bicycle", name: "Bicycle", kind: "vehicle", roof: "#25262b", roofAlt: "#696766", wall: "#292c2e", wallAlt: "#1c1c20", accent: "#202026", ratio: 1 },
  { id: "street-light", name: "Street light", kind: "street", roof: "#7d7266", roofAlt: "#272c30", wall: "#8e887d", wallAlt: "#1f252a", accent: "#e2c89f", ratio: 0.57 },
  { id: "traffic-light", name: "Traffic light", kind: "street", roof: "#2b252b", roofAlt: "#a9a39e", wall: "#303334", wallAlt: "#1a171c", accent: "#9a5d55", ratio: 1.27 },
  { id: "bus-stop", name: "Bus stop", kind: "street", roof: "#8b8d9a", roofAlt: "#787c89", wall: "#baa496", wallAlt: "#ac9589", accent: "#b59b8d", ratio: 0.84 },
  { id: "litter-bin", name: "Litter bin", kind: "street", roof: "#828d96", roofAlt: "#74808b", wall: "#b9a598", wallAlt: "#978d89", accent: "#e8ceb4", ratio: 0.84 },
  { id: "bench", name: "Bench", kind: "street", roof: "#7e767a", roofAlt: "#a39ea0", wall: "#756e6e", wallAlt: "#7d7574", accent: "#b6a396", ratio: 0.53 },
  { id: "railings", name: "Railings", kind: "street", roof: "#6f6d6b", roofAlt: "#999591", wall: "#696866", wallAlt: "#908984", accent: "#bcb2ab", ratio: 1.26 },
  { id: "hedge", name: "Hedge", kind: "street", roof: "#819131", roofAlt: "#91a33c", wall: "#6c7d27", wallAlt: "#7a8c2d", accent: "#748623", ratio: 1.59 },
  { id: "bench-2", name: "Bench", kind: "street", roof: "#8e5e43", roofAlt: "#ae7c57", wall: "#eec399", wallAlt: "#8c5a3f", accent: "#9a6041", ratio: 1.45 },
  { id: "planter", name: "Planter", kind: "street", roof: "#746b22", roofAlt: "#9a8c37", wall: "#b5977e", wallAlt: "#ceb29c", accent: "#807620", ratio: 1.7 },
  { id: "solar-panel", name: "Solar panel", kind: "street", roof: "#384d78", roofAlt: "#4a5f87", wall: "#3a5179", wallAlt: "#4e6389", accent: "#3a5384", ratio: 1.14 },
  { id: "oak", name: "Oak", kind: "nature", roof: "#7d8a2b", roofAlt: "#65711e", wall: "#5f6c1f", wallAlt: "#828e31", accent: "#6f7e1c", ratio: 1.37 },
  { id: "beech", name: "Beech", kind: "nature", roof: "#808d2e", roofAlt: "#657221", wall: "#5f6f1f", wallAlt: "#748328", accent: "#6f7f1f", ratio: 0.88 },
  { id: "pine", name: "Pine", kind: "nature", roof: "#2e3e17", roofAlt: "#66732e", wall: "#1c2c0e", wallAlt: "#344519", accent: "#354818", ratio: 1.32 },
  { id: "birch", name: "Birch", kind: "nature", roof: "#8a8d3a", roofAlt: "#9ea145", wall: "#818339", wallAlt: "#8f9244", accent: "#7e822e", ratio: 1.78 },
  { id: "palm", name: "Palm", kind: "nature", roof: "#93992d", roofAlt: "#6f7722", wall: "#8f733c", wallAlt: "#a78552", accent: "#7a831f", ratio: 0.82 },
  { id: "rocks", name: "Rocks", kind: "nature", roof: "#a08c7e", roofAlt: "#c0ae9c", wall: "#78695b", wallAlt: "#978771", accent: "#94983a", ratio: 1.27 },
  { id: "shrubs", name: "Shrubs", kind: "nature", roof: "#696f20", roofAlt: "#86872b", wall: "#7d8224", wallAlt: "#9c9a30", accent: "#ffa92c", ratio: 2.48 },
  { id: "flowers", name: "Flowers", kind: "nature", roof: "#aa8423", roofAlt: "#876214", wall: "#756717", wallAlt: "#858b24", accent: "#bd8a07", ratio: 2.5 },
  { id: "grass", name: "Grass", kind: "nature", roof: "#859628", roofAlt: "#92a531", wall: "#7a8b24", wallAlt: "#86982a", accent: "#80911d", ratio: 1.47 },
  { id: "pond", name: "Pond", kind: "nature", roof: "#235e78", roofAlt: "#2d6e8a", wall: "#1f5b74", wallAlt: "#266780", accent: "#1c6481", ratio: 1.44 }
];
var BY_ID = new Map(ATLAS.map((a) => [a.id, a]));
var BY_KIND = /* @__PURE__ */ new Map();
for (const a of ATLAS) {
  const list = BY_KIND.get(a.kind);
  if (list) list.push(a);
  else BY_KIND.set(a.kind, [a]);
}
function asset(id) {
  const found = BY_ID.get(id);
  if (!found) throw new Error("Unknown asset: " + id);
  return found;
}

// src/ui/sprites.ts
function shade(hex, amount) {
  const value = parseInt(hex.slice(1), 16);
  const r = value >> 16 & 255;
  const g = value >> 8 & 255;
  const b = value & 255;
  const mix = (channel) => Math.max(0, Math.min(255, Math.round(amount >= 0 ? channel + (255 - channel) * amount : channel * (1 + amount))));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}
function alpha(hex, a) {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${value >> 16 & 255}, ${value >> 8 & 255}, ${value & 255}, ${a})`;
}
var SLATE = [58, 68, 84];
var LEAF = [44, 74, 52];
function towards(hex, target, amount) {
  const value = parseInt(hex.slice(1), 16);
  const rgb = [value >> 16 & 255, value >> 8 & 255, value & 255];
  const out = rgb.map((v, i) => Math.round(v + (target[i] - v) * amount));
  return `#${out.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("")}`;
}
function green(hex) {
  const value = parseInt(hex.slice(1), 16);
  const r = value >> 16 & 255;
  const g = value >> 8 & 255;
  const b = value & 255;
  if (g > r + 6 && g > b + 14) return true;
  return Math.abs(r - g) < 26 && b < Math.min(r, g) - 22;
}
function mute(hex, amount) {
  return towards(hex, SLATE, green(hex) ? Math.min(0.85, amount + 0.32) : amount);
}
var BUILT = /* @__PURE__ */ new Set(["office", "retail", "industry", "logistics", "civic", "leisure", "housing", "landmark"]);
var faces = /* @__PURE__ */ new Map();
function face(a) {
  const found = faces.get(a.id);
  if (found) return found;
  let made = a;
  if (BUILT.has(a.kind)) {
    made = {
      ...a,
      roof: mute(a.roof, 0.5),
      roofAlt: mute(a.roofAlt, 0.46),
      wall: mute(a.wall, 0.54),
      wallAlt: mute(a.wallAlt, 0.52),
      accent: green(a.accent) ? mute(a.accent, 0.7) : a.accent
    };
  } else if (a.kind === "vehicle") {
    const value = parseInt(a.roof.slice(1), 16);
    const lum = ((value >> 16 & 255) + (value >> 8 & 255) + (value & 255)) / 3;
    made = lum < 95 ? { ...a, roof: towards(a.roof, [214, 219, 226], 0.42), wall: towards(a.wall, [214, 219, 226], 0.3) } : a;
  } else if (a.kind === "nature" || a.kind === "park" || a.kind === "farm") {
    made = {
      ...a,
      roof: towards(a.roof, LEAF, 0.55),
      roofAlt: towards(a.roofAlt, LEAF, 0.5),
      wall: towards(a.wall, LEAF, 0.45),
      wallAlt: towards(a.wallAlt, LEAF, 0.45)
    };
  }
  faces.set(a.id, made);
  return made;
}
function hash(key2) {
  let h2 = 2166136261;
  for (let i = 0; i < key2.length; i += 1) {
    h2 ^= key2.charCodeAt(i);
    h2 = Math.imul(h2, 16777619);
  }
  return (h2 >>> 0) / 4294967296;
}
function shell(ctx, a, b, tone, detail) {
  ctx.fillStyle = shade(a.wall, (tone - 0.5) * 0.16);
  ctx.fillRect(b.x, b.y, b.w, b.h);
  if (!detail.markings || b.w < 5 || b.h < 5) return b;
  const inset = Math.max(0.6, Math.min(b.w, b.h) * 0.13);
  const roof = { x: b.x + inset, y: b.y + inset, w: b.w - inset * 2, h: b.h - inset * 2 };
  ctx.fillStyle = shade(a.roof, (tone - 0.5) * 0.12);
  ctx.fillRect(roof.x, roof.y, roof.w, roof.h);
  return roof;
}
function row(ctx, b, count2, frac, colour, vertical = false) {
  if (count2 < 1) return;
  ctx.fillStyle = colour;
  if (vertical) {
    const step = b.h / count2;
    const size = Math.max(0.8, step * frac);
    for (let i = 0; i < count2; i += 1) {
      ctx.fillRect(b.x, b.y + i * step + (step - size) / 2, b.w, size);
    }
  } else {
    const step = b.w / count2;
    const size = Math.max(0.8, step * frac);
    for (let i = 0; i < count2; i += 1) {
      ctx.fillRect(b.x + i * step + (step - size) / 2, b.y, size, b.h);
    }
  }
}
function dot(ctx, x, y, r, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2);
  ctx.fill();
}
function pitched(ctx, a, b, tone) {
  const alongX = b.w >= b.h;
  const light = shade(a.roof, 0.12 + (tone - 0.5) * 0.1);
  const dark = shade(a.roof, -0.18 + (tone - 0.5) * 0.08);
  if (alongX) {
    ctx.fillStyle = light;
    ctx.fillRect(b.x, b.y, b.w, b.h / 2);
    ctx.fillStyle = dark;
    ctx.fillRect(b.x, b.y + b.h / 2, b.w, b.h / 2);
  } else {
    ctx.fillStyle = light;
    ctx.fillRect(b.x, b.y, b.w / 2, b.h);
    ctx.fillStyle = dark;
    ctx.fillRect(b.x + b.w / 2, b.y, b.w / 2, b.h);
  }
  if (Math.min(b.w, b.h) > 6) {
    ctx.strokeStyle = shade(a.roof, 0.3);
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (alongX) {
      ctx.moveTo(b.x + 1, b.y + b.h / 2);
      ctx.lineTo(b.x + b.w - 1, b.y + b.h / 2);
    } else {
      ctx.moveTo(b.x + b.w / 2, b.y + 1);
      ctx.lineTo(b.x + b.w / 2, b.y + b.h - 1);
    }
    ctx.stroke();
  }
}
function paintAsset(ctx, raw, b, tone, detail) {
  const a = face(raw);
  switch (a.kind) {
    case "housing":
      return paintHousing(ctx, a, b, tone, detail);
    case "office":
      return paintOffice(ctx, a, b, tone, detail);
    case "retail":
      return paintRetail(ctx, a, b, tone, detail);
    case "industry":
      return paintIndustry(ctx, a, b, tone, detail);
    case "logistics":
      return paintLogistics(ctx, a, b, tone, detail);
    case "civic":
      return paintCivic(ctx, a, b, tone, detail);
    case "leisure":
      return paintLeisure(ctx, a, b, tone, detail);
    case "energy":
      return paintEnergy(ctx, a, b, tone, detail);
    case "farm":
      return paintFarm(ctx, a, b, tone, detail);
    case "landmark":
      return paintLandmark(ctx, a, b, tone, detail);
    case "park":
      return paintPark(ctx, a, b, tone, detail);
    default:
      shell(ctx, a, b, tone, detail);
  }
}
function paintHousing(ctx, a, b, tone, d) {
  ctx.fillStyle = shade(a.wall, (tone - 0.5) * 0.18);
  ctx.fillRect(b.x, b.y, b.w, b.h);
  if (!d.markings || b.w < 4 || b.h < 4) return;
  const flat = a.id === "apartment-block" || a.id === "social-housing" || a.id === "student-house";
  const inset = Math.max(0.5, Math.min(b.w, b.h) * 0.1);
  const roof = { x: b.x + inset, y: b.y + inset, w: b.w - inset * 2, h: b.h - inset * 2 };
  if (flat) {
    ctx.fillStyle = shade(a.roof, (tone - 0.5) * 0.1);
    ctx.fillRect(roof.x, roof.y, roof.w, roof.h);
    if (d.fine && roof.w > 10 && roof.h > 8) {
      ctx.fillStyle = alpha("#000000", 0.28);
      ctx.fillRect(roof.x + roof.w * 0.3, roof.y + roof.h * 0.35, roof.w * 0.25, roof.h * 0.3);
    }
  } else {
    pitched(ctx, a, roof, tone);
    if (d.fine && Math.min(roof.w, roof.h) > 5) {
      dot(ctx, roof.x + roof.w * 0.72, roof.y + roof.h * 0.5, Math.min(roof.w, roof.h) * 0.09, alpha("#000000", 0.45));
    }
  }
}
function paintOffice(ctx, a, b, tone, d) {
  const roof = shell(ctx, a, b, tone, d);
  if (!d.fine || roof.w < 9 || roof.h < 7) return;
  ctx.fillStyle = alpha("#000000", 0.26);
  ctx.fillRect(roof.x + roof.w * 0.12, roof.y + roof.h * 0.22, roof.w * 0.3, roof.h * 0.3);
  ctx.fillStyle = shade(a.roofAlt, 0.08);
  ctx.fillRect(roof.x + roof.w * 0.55, roof.y + roof.h * 0.18, roof.w * 0.3, roof.h * 0.22);
  ctx.fillStyle = alpha(a.accent, 0.5);
  ctx.fillRect(roof.x + roof.w * 0.2, roof.y + roof.h * 0.72, roof.w * 0.6, Math.max(1, roof.h * 0.1));
}
function paintRetail(ctx, a, b, tone, d) {
  if (a.id === "filling-station") return paintFillingStation(ctx, a, b, tone, d);
  const roof = shell(ctx, a, b, tone, d);
  if (!d.markings) return;
  const alongX = b.w >= b.h;
  ctx.fillStyle = alpha(a.accent, 0.75);
  const band = Math.max(1, Math.min(b.w, b.h) * 0.13);
  if (alongX) ctx.fillRect(b.x, b.y + b.h - band, b.w, band);
  else ctx.fillRect(b.x + b.w - band, b.y, band, b.h);
  if (d.fine && roof.w > 12 && roof.h > 9) {
    row(
      ctx,
      { x: roof.x + roof.w * 0.15, y: roof.y + roof.h * 0.25, w: roof.w * 0.7, h: roof.h * 0.3 },
      3,
      0.55,
      alpha("#000000", 0.22),
      false
    );
  }
}
function paintFillingStation(ctx, a, b, tone, d) {
  ctx.fillStyle = shade("#2b3440", (tone - 0.5) * 0.1);
  ctx.fillRect(b.x, b.y, b.w, b.h);
  if (!d.markings) return;
  const cw = b.w * 0.62;
  const ch = b.h * 0.5;
  ctx.fillStyle = alpha(a.accent, 0.85);
  ctx.fillRect(b.x + b.w - cw, b.y + b.h * 0.25, cw, Math.max(1.5, ch));
  ctx.fillStyle = shade(a.wall, 0.05);
  ctx.fillRect(b.x, b.y, b.w * 0.34, b.h * 0.45);
  if (d.fine && cw > 10) {
    ctx.fillStyle = alpha("#000000", 0.35);
    for (let i = 0; i < 2; i += 1) {
      ctx.fillRect(b.x + b.w - cw + cw * (0.25 + i * 0.42), b.y + b.h * 0.25 + ch * 0.35, cw * 0.1, ch * 0.3);
    }
  }
}
function paintIndustry(ctx, a, b, tone, d) {
  ctx.fillStyle = shade(a.wall, (tone - 0.5) * 0.14);
  ctx.fillRect(b.x, b.y, b.w, b.h);
  if (!d.markings || b.w < 6 || b.h < 5) return;
  const inset = Math.max(0.6, Math.min(b.w, b.h) * 0.1);
  const roof = { x: b.x + inset, y: b.y + inset, w: b.w - inset * 2, h: b.h - inset * 2 };
  ctx.fillStyle = shade(a.roof, (tone - 0.5) * 0.1);
  ctx.fillRect(roof.x, roof.y, roof.w, roof.h);
  if (!d.fine) return;
  const bays = Math.max(2, Math.round(roof.w / 7));
  row(ctx, roof, bays, 0.35, alpha("#9fb6c4", 0.22), false);
  const r = Math.min(roof.w, roof.h) * 0.12;
  dot(ctx, b.x + b.w * 0.12, b.y + b.h * 0.16, r, a.accent);
  if (b.w > 26) dot(ctx, b.x + b.w * 0.24, b.y + b.h * 0.14, r * 0.8, shade(a.accent, -0.15));
}
function paintLogistics(ctx, a, b, tone, d) {
  const roof = shell(ctx, a, b, tone, d);
  if (!d.markings) return;
  const alongX = b.w >= b.h;
  if (d.fine && Math.min(b.w, b.h) > 8) {
    const doors = Math.max(3, Math.round((alongX ? b.w : b.h) / 6));
    const band = Math.max(1, Math.min(b.w, b.h) * 0.12);
    if (alongX) {
      row(ctx, { x: b.x + b.w * 0.06, y: b.y + b.h - band, w: b.w * 0.88, h: band }, doors, 0.5, alpha("#000000", 0.5));
    } else {
      row(ctx, { x: b.x + b.w - band, y: b.y + b.h * 0.06, w: band, h: b.h * 0.88 }, doors, 0.5, alpha("#000000", 0.5), true);
    }
  }
  if (d.fine && roof.w > 12 && roof.h > 9) {
    const ribs = Math.max(3, Math.round((alongX ? roof.w : roof.h) / 5));
    row(ctx, roof, ribs, 0.14, alpha("#ffffff", 0.06), !alongX);
    if (a.id === "warehouse" || a.id === "distribution-centre" || a.id === "large-warehouse") {
      ctx.fillStyle = alpha("#3f5f96", 0.6);
      ctx.fillRect(roof.x + roof.w * 0.12, roof.y + roof.h * 0.16, roof.w * 0.5, roof.h * 0.34);
    }
  }
}
function paintCivic(ctx, a, b, tone, d) {
  const roof = shell(ctx, a, b, tone, d);
  if (!d.markings) return;
  ctx.fillStyle = shade(a.roofAlt, 0.06);
  const alongX = b.w >= b.h;
  if (alongX) ctx.fillRect(b.x + b.w * 0.38, b.y, b.w * 0.24, b.h);
  else ctx.fillRect(b.x, b.y + b.h * 0.38, b.w, b.h * 0.24);
  if (d.fine && Math.min(roof.w, roof.h) > 7) {
    dot(ctx, b.x + b.w / 2, b.y + b.h / 2, Math.min(b.w, b.h) * 0.1, alpha(a.accent, 0.8));
  }
}
function paintLeisure(ctx, a, b, tone, d) {
  if (a.id === "swimming-pool") {
    ctx.fillStyle = shade(a.wall, (tone - 0.5) * 0.12);
    ctx.fillRect(b.x, b.y, b.w, b.h);
    if (d.markings) {
      ctx.fillStyle = "#2f7f9e";
      ctx.fillRect(b.x + b.w * 0.2, b.y + b.h * 0.25, b.w * 0.6, b.h * 0.5);
    }
    return;
  }
  const roof = shell(ctx, a, b, tone, d);
  if (!d.markings) return;
  ctx.fillStyle = alpha(a.accent, 0.6);
  ctx.fillRect(b.x + b.w * 0.1, b.y + b.h * 0.82, b.w * 0.8, Math.max(1, b.h * 0.1));
  if (d.fine && roof.w > 10 && roof.h > 8) {
    for (let i = 0; i < 3; i += 1) {
      dot(ctx, b.x + b.w * (0.22 + i * 0.28), b.y + b.h * 0.94, Math.max(0.6, b.w * 0.035), alpha("#d9c7a8", 0.5));
    }
  }
}
function paintEnergy(ctx, a, b, tone, d) {
  if (a.id === "solar-farm") {
    ctx.fillStyle = shade("#28351f", (tone - 0.5) * 0.1);
    ctx.fillRect(b.x, b.y, b.w, b.h);
    if (!d.markings) return;
    const rows = Math.max(3, Math.round(b.h / 6));
    row(ctx, { x: b.x + b.w * 0.06, y: b.y + b.h * 0.08, w: b.w * 0.88, h: b.h * 0.84 }, rows, 0.55, a.roof, true);
    return;
  }
  if (a.id === "wind-turbine") {
    if (!d.markings) return;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const r = Math.min(b.w, b.h) * 0.5;
    ctx.strokeStyle = alpha("#e8e6e2", 0.75);
    ctx.lineWidth = Math.max(0.8, r * 0.1);
    ctx.beginPath();
    for (let i = 0; i < 3; i += 1) {
      const angle = i * Math.PI * 2 / 3 + hash(a.id + b.x.toFixed(1)) * 2;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    }
    ctx.stroke();
    dot(ctx, cx, cy, Math.max(0.8, r * 0.16), "#cfcdc9");
    return;
  }
  const roof = shell(ctx, a, b, tone, d);
  if (!d.markings) return;
  if (a.id === "nuclear-plant" || a.id === "gas-plant" || a.id === "biogas-plant") {
    const r = Math.min(b.w, b.h) * 0.2;
    dot(ctx, b.x + b.w * 0.3, b.y + b.h * 0.35, r, shade(a.wall, 0.16));
    dot(ctx, b.x + b.w * 0.68, b.y + b.h * 0.42, r * 0.9, shade(a.wall, 0.08));
  } else if (d.fine && roof.w > 8) {
    row(ctx, roof, 4, 0.4, alpha(a.accent, 0.5), false);
  }
}
function paintFarm(ctx, a, b, tone, d) {
  switch (a.id) {
    case "arable-field": {
      ctx.fillStyle = shade(a.wall, (tone - 0.5) * 0.16);
      ctx.fillRect(b.x, b.y, b.w, b.h);
      if (d.markings) {
        const furrows = Math.max(3, Math.round(b.w / 5));
        row(ctx, b, furrows, 0.35, alpha(a.accent, 0.35), false);
      }
      return;
    }
    case "pasture": {
      ctx.fillStyle = shade(a.roof, (tone - 0.5) * 0.14);
      ctx.fillRect(b.x, b.y, b.w, b.h);
      if (d.fine) {
        for (let i = 0; i < 4; i += 1) {
          dot(ctx, b.x + b.w * (0.2 + 0.2 * i), b.y + b.h * (0.3 + 0.4 * hash(a.id + i)), Math.max(0.5, b.w * 0.02), "#e6e1d6");
        }
      }
      return;
    }
    case "orchard":
    case "fruit-plantation": {
      ctx.fillStyle = shade(a.wall, (tone - 0.5) * 0.12);
      ctx.fillRect(b.x, b.y, b.w, b.h);
      if (!d.markings) return;
      const cols = Math.max(2, Math.round(b.w / 7));
      const rows = Math.max(2, Math.round(b.h / 7));
      for (let i = 0; i < cols; i += 1) {
        for (let j = 0; j < rows; j += 1) {
          dot(ctx, b.x + (i + 0.5) * b.w / cols, b.y + (j + 0.5) * b.h / rows, Math.max(0.6, b.w / cols / 3.4), a.roof);
        }
      }
      return;
    }
    case "glasshouse": {
      ctx.fillStyle = alpha("#9fc7cf", 0.5);
      ctx.fillRect(b.x, b.y, b.w, b.h);
      if (d.markings) {
        const bays = Math.max(2, Math.round(b.w / 6));
        row(ctx, b, bays, 0.12, alpha("#ffffff", 0.35), false);
      }
      return;
    }
    default: {
      const roof = shell(ctx, a, b, tone, d);
      if (d.markings) pitched(ctx, a, roof, tone);
      return;
    }
  }
}
function paintLandmark(ctx, a, b, tone, d) {
  if (a.id === "stadium") {
    ctx.fillStyle = shade(a.wall, (tone - 0.5) * 0.1);
    ctx.beginPath();
    ctx.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    if (d.markings) {
      ctx.fillStyle = "#2f5c37";
      ctx.beginPath();
      ctx.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w * 0.3, b.h * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (a.id === "telecom-mast") {
    if (!d.markings) return;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    ctx.strokeStyle = alpha("#b9c3cc", 0.7);
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - b.w * 0.18, cy - b.h * 0.18, b.w * 0.36, b.h * 0.36);
    dot(ctx, cx, cy, Math.max(0.7, b.w * 0.08), "#d4534b");
    return;
  }
  const roof = shell(ctx, a, b, tone, d);
  if (d.fine && roof.w > 12 && roof.h > 8) {
    row(
      ctx,
      { x: roof.x + roof.w * 0.1, y: roof.y + roof.h * 0.2, w: roof.w * 0.8, h: roof.h * 0.4 },
      4,
      0.4,
      alpha("#000000", 0.2),
      false
    );
  }
}
function paintPark(ctx, a, b, tone, d) {
  if (d.base !== false) {
    ctx.fillStyle = shade(a.roof, (tone - 0.5) * 0.14);
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }
  if (!d.markings) return;
  switch (a.id) {
    case "market-square":
    case "terrace-seating": {
      if (d.base !== false) {
        ctx.fillStyle = shade(a.wall, 0.04);
        ctx.fillRect(b.x, b.y, b.w, b.h);
      }
      if (!d.fine) return;
      const stalls = Math.max(2, Math.round(b.w / 8));
      row(ctx, { x: b.x + b.w * 0.1, y: b.y + b.h * 0.3, w: b.w * 0.8, h: b.h * 0.4 }, stalls, 0.5, alpha(a.accent, 0.55));
      return;
    }
    case "cemetery": {
      if (!d.fine) return;
      const cols = Math.max(2, Math.round(b.w / 6));
      const rows = Math.max(2, Math.round(b.h / 6));
      ctx.fillStyle = alpha("#cfd6d9", 0.35);
      for (let i = 0; i < cols; i += 1) {
        for (let j = 0; j < rows; j += 1) {
          ctx.fillRect(b.x + (i + 0.4) * b.w / cols, b.y + (j + 0.4) * b.h / rows, 1, 1.6);
        }
      }
      return;
    }
    case "playground": {
      if (!d.fine) return;
      for (let i = 0; i < 3; i += 1) {
        dot(ctx, b.x + b.w * (0.25 + i * 0.25), b.y + b.h * (0.35 + 0.25 * hash(a.id + i)), Math.max(0.7, b.w * 0.05), a.accent);
      }
      return;
    }
    default: {
      ctx.strokeStyle = alpha("#b9ab8b", 0.28);
      ctx.lineWidth = Math.max(1, Math.min(b.w, b.h) * 0.05);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + b.h * 0.7);
      ctx.quadraticCurveTo(b.x + b.w * 0.5, b.y + b.h * 0.25, b.x + b.w, b.y + b.h * 0.55);
      ctx.stroke();
    }
  }
}
function paintTree(ctx, raw, x, y, r, detail) {
  const a = face(raw);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.arc(x + r * 0.35, y + r * 0.35, r, 0, Math.PI * 2);
  ctx.fill();
  if (a.id === "pine" && detail.markings) {
    ctx.fillStyle = a.roof;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.8, y + r * 0.7);
    ctx.lineTo(x - r * 0.8, y + r * 0.7);
    ctx.closePath();
    ctx.fill();
    return;
  }
  ctx.fillStyle = a.roof;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  if (detail.fine && r > 2.6) {
    ctx.fillStyle = shade(a.roofAlt, 0.12);
    ctx.beginPath();
    ctx.arc(x - r * 0.22, y - r * 0.22, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}
function paintFurniture(ctx, a, x, y, r, vertical) {
  switch (a.id) {
    case "street-light":
      ctx.strokeStyle = alpha(a.wall, 0.85);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (vertical ? 0 : r * 1.6), y - (vertical ? r * 1.6 : 0));
      ctx.stroke();
      dot(ctx, x + (vertical ? 0 : r * 1.6), y - (vertical ? r * 1.6 : 0), Math.max(0.6, r * 0.4), alpha("#f0e2b4", 0.75));
      return;
    case "traffic-light":
      dot(ctx, x, y, Math.max(0.8, r * 0.9), "#d8b24a");
      return;
    case "bus-stop":
      ctx.fillStyle = shade(a.wall, 0.18);
      if (vertical) ctx.fillRect(x - r * 0.6, y - r, r * 1.2, r * 2);
      else ctx.fillRect(x - r, y - r * 0.6, r * 2, r * 1.2);
      return;
    case "bench":
      ctx.fillStyle = a.roof;
      if (vertical) ctx.fillRect(x - r * 0.35, y - r, r * 0.7, r * 2);
      else ctx.fillRect(x - r, y - r * 0.35, r * 2, r * 0.7);
      return;
    case "planter":
    case "flowers":
      dot(ctx, x, y, Math.max(0.6, r * 0.8), a.accent);
      return;
    case "hedge":
      ctx.fillStyle = a.roof;
      if (vertical) ctx.fillRect(x - r * 0.5, y - r * 2, r, r * 4);
      else ctx.fillRect(x - r * 2, y - r * 0.5, r * 4, r);
      return;
    case "shrubs":
      dot(ctx, x, y, Math.max(0.7, r), a.roof);
      dot(ctx, x + r * 0.8, y + r * 0.4, Math.max(0.5, r * 0.7), shade(a.roofAlt, -0.05));
      return;
    case "rocks":
      dot(ctx, x, y, Math.max(0.7, r), a.roof);
      return;
    case "litter-bin":
      dot(ctx, x, y, Math.max(0.5, r * 0.5), shade(a.wall, -0.1));
      return;
    case "railings":
      ctx.strokeStyle = alpha(a.wall, 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (vertical) {
        ctx.moveTo(x, y - r * 2);
        ctx.lineTo(x, y + r * 2);
      } else {
        ctx.moveTo(x - r * 2, y);
        ctx.lineTo(x + r * 2, y);
      }
      ctx.stroke();
      return;
    case "fountain":
    default:
      dot(ctx, x, y, r, shade(a.wall, 0.1));
      dot(ctx, x, y, r * 0.55, "#2f6f8c");
  }
}
function paintVehicle(ctx, raw, x, y, heading2, length, width, detail) {
  const a = face(raw);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading2);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(-length / 2 + 1, -width / 2 + 1, length, width);
  ctx.fillStyle = a.roof;
  ctx.fillRect(-length / 2, -width / 2, length, width);
  if (detail.fine && length > 6) {
    ctx.fillStyle = shade(a.wall, -0.22);
    const cab = a.kind === "vehicle" && (a.id === "lorry" || a.id === "articulated-lorry" || a.id === "van") ? length * 0.28 : length * 0.42;
    ctx.fillRect(-length / 2 + length * 0.06, -width / 2 + width * 0.16, cab, width * 0.68);
  }
  ctx.restore();
}

// src/sim/traffic.ts
var SPEED = {
  arterial: 0.0125,
  street: 8e-3,
  lane: 58e-4
};
var FASTEST = 0.0125;
function drivable(road) {
  return road.cls === "arterial" || road.cls === "street" || road.cls === "lane";
}
var QUANTUM = 1e5;
function key(p2) {
  return `${Math.round(p2.x * QUANTUM)},${Math.round(p2.y * QUANTUM)}`;
}
function dist(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}
function crossing(a1, a2, b1, b2) {
  const ax = a2.x - a1.x;
  const ay = a2.y - a1.y;
  const bx = b2.x - b1.x;
  const by = b2.y - b1.y;
  const denominator = ax * by - ay * bx;
  if (Math.abs(denominator) < 1e-12) return null;
  const t = ((b1.x - a1.x) * by - (b1.y - a1.y) * bx) / denominator;
  const u = ((b1.x - a1.x) * ay - (b1.y - a1.y) * ax) / denominator;
  if (t < 1e-6 || t > 1 - 1e-6 || u < 1e-6 || u > 1 - 1e-6) return null;
  return { t, u };
}
var cachedGraph = null;
function roadGraph() {
  if (!cachedGraph) cachedGraph = buildGraph();
  return cachedGraph;
}
function buildGraph() {
  const roads = cityLayout().roads.filter(drivable);
  const segments = [];
  for (const road of roads) {
    for (let i = 0; i + 1 < road.pts.length; i += 1) {
      segments.push({ a: road.pts[i], b: road.pts[i + 1], cls: road.cls, width: road.width, cuts: [] });
    }
  }
  for (let i = 0; i < segments.length; i += 1) {
    for (let j = i + 1; j < segments.length; j += 1) {
      const hit = crossing(segments[i].a, segments[i].b, segments[j].a, segments[j].b);
      if (!hit) continue;
      segments[i].cuts.push(hit.t);
      segments[j].cuts.push(hit.u);
    }
  }
  const nodes = [];
  const edges = [];
  const index = /* @__PURE__ */ new Map();
  const nodeAt = (p2) => {
    const k = key(p2);
    const found = index.get(k);
    if (found !== void 0) return found;
    const id = nodes.length;
    nodes.push({ x: p2.x, y: p2.y, out: [] });
    index.set(k, id);
    return id;
  };
  const link = (from, to, cls, width) => {
    if (from === to) return;
    const length = dist(nodes[from], nodes[to]);
    if (length < 1e-6) return;
    const cost = length / (SPEED[cls] ?? 6e-3);
    nodes[from].out.push(edges.length);
    edges.push({ from, to, cost, length, cls, width });
    nodes[to].out.push(edges.length);
    edges.push({ from: to, to: from, cost, length, cls, width });
  };
  for (const seg of segments) {
    const stops = [0, ...seg.cuts, 1].sort((a, b) => a - b);
    let previous = -1;
    for (const t of stops) {
      const point = { x: seg.a.x + (seg.b.x - seg.a.x) * t, y: seg.a.y + (seg.b.y - seg.a.y) * t };
      const id = nodeAt(point);
      if (previous >= 0) link(previous, id, seg.cls, seg.width);
      previous = id;
    }
  }
  return { nodes, edges };
}
function route(graph, from, to) {
  if (from === to) return [from];
  const count2 = graph.nodes.length;
  const best = new Float64Array(count2).fill(Infinity);
  const cameFrom = new Int32Array(count2).fill(-1);
  const done = new Uint8Array(count2);
  const target = graph.nodes[to];
  const heap = [];
  const push = (node2, f) => {
    heap.push({ node: node2, f });
    let i = heap.length - 1;
    while (i > 0) {
      const parent = i - 1 >> 1;
      if (heap[parent].f <= heap[i].f) break;
      [heap[parent], heap[i]] = [heap[i], heap[parent]];
      i = parent;
    }
  };
  const pop = () => {
    if (heap.length === 0) return void 0;
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0 && last) {
      heap[0] = last;
      let i = 0;
      for (; ; ) {
        const l = i * 2 + 1;
        const r = l + 1;
        let small = i;
        if (l < heap.length && heap[l].f < heap[small].f) small = l;
        if (r < heap.length && heap[r].f < heap[small].f) small = r;
        if (small === i) break;
        [heap[small], heap[i]] = [heap[i], heap[small]];
        i = small;
      }
    }
    return top;
  };
  best[from] = 0;
  push(from, dist(graph.nodes[from], target) / FASTEST);
  while (heap.length > 0) {
    const current = pop();
    if (!current) break;
    if (done[current.node]) continue;
    done[current.node] = 1;
    if (current.node === to) break;
    for (const edgeId of graph.nodes[current.node].out) {
      const edge = graph.edges[edgeId];
      const through = best[current.node] + edge.cost;
      if (through >= best[edge.to]) continue;
      best[edge.to] = through;
      cameFrom[edge.to] = current.node;
      push(edge.to, through + dist(graph.nodes[edge.to], target) / FASTEST);
    }
  }
  if (best[to] === Infinity) return null;
  const path = [to];
  let step = to;
  while (step !== from) {
    step = cameFrom[step];
    if (step < 0) return null;
    path.push(step);
  }
  return path.reverse();
}
function nearestNode(graph, p2) {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < graph.nodes.length; i += 1) {
    const d = (graph.nodes[i].x - p2.x) ** 2 + (graph.nodes[i].y - p2.y) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  }
  return best;
}
var CAR_ASSETS = ["saloon-car", "suv", "hatchback", "electric-car", "hatchback", "saloon-car", "sports-car"];
var VAN_ASSETS = ["van", "van", "lorry"];
var LORRY_ASSETS = ["lorry", "articulated-lorry"];
var BIKE_ASSETS = ["scooter", "bicycle"];
var SIZE = {
  car: 3e-3,
  van: 42e-4,
  lorry: 62e-4,
  bike: 18e-4
};
var SLENDER = {
  car: 2.4,
  van: 2.6,
  lorry: 3.4,
  bike: 3
};
var PACE = {
  car: 1,
  van: 0.92,
  lorry: 0.78,
  bike: 0.62
};
function parkingSpaces(graph, fillers) {
  const structures = fillers.filter((f) => !GROUND_USES.has(f.kind));
  const out = [];
  for (const filler of fillers) {
    if (filler.kind !== "parking") continue;
    const at = { x: filler.x + filler.w / 2, y: filler.y + filler.h / 2 };
    const node2 = nearestNode(graph, at);
    if (dist(graph.nodes[node2], at) > Math.max(filler.w, filler.h) * 0.95) continue;
    if (crossesStructure(graph.nodes[node2], at, structures)) continue;
    out.push({ at, node: node2 });
  }
  return out;
}
var GROUND_USES = /* @__PURE__ */ new Set([
  "park",
  "plaza",
  "parking",
  "pitch",
  "quay",
  "field",
  "orchard",
  "pasture",
  "solar"
]);
function crossesStructure(from, to, structures) {
  const steps = 12;
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    for (const s of structures) {
      if (x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h) return s;
    }
  }
  return null;
}
function createTraffic(count2 = 160) {
  const graph = roadGraph();
  const layout = cityLayout();
  const spaces = parkingSpaces(graph, layout.fillers);
  const rng = new Rng(CITY_SEED ^ 31249);
  const vehicles = [];
  const freight = [];
  const general = [];
  const campus = [];
  for (let i = 0; i < graph.nodes.length; i += 1) {
    general.push(i);
  }
  for (const filler of layout.fillers) {
    const at = { x: filler.x + filler.w / 2, y: filler.y + filler.h / 2 };
    if (filler.kind === "shed" || filler.kind === "hangar" || filler.kind === "quay") {
      freight.push(nearestNode(graph, at));
    }
    if (filler.district === "university" || filler.district === "tourist") {
      campus.push(nearestNode(graph, at));
    }
  }
  for (let i = 0; i < count2; i += 1) {
    const roll = rng.next();
    const cls = roll < 0.12 ? "lorry" : roll < 0.34 ? "van" : roll < 0.44 ? "bike" : "car";
    const pool = cls === "lorry" ? LORRY_ASSETS : cls === "van" ? VAN_ASSETS : cls === "bike" ? BIKE_ASSETS : CAR_ASSETS;
    const ends = cls === "lorry" && freight.length > 1 ? freight : cls === "bike" && campus.length > 1 ? campus : general;
    const vehicle = {
      id: i,
      asset: pool[Math.floor(rng.next() * pool.length)],
      cls,
      length: SIZE[cls],
      width: SIZE[cls] / SLENDER[cls],
      path: [],
      leg: 0,
      t: 0,
      speed: PACE[cls] * rng.range(0.85, 1.15),
      x: 0,
      y: 0,
      heading: 0,
      offset: 0,
      ends,
      waiting: rng.range(0, 6),
      park: null,
      parking: 0
    };
    retarget(graph, vehicle, rng, spaces);
    vehicles.push(vehicle);
  }
  return { graph, vehicles, spaces };
}
function retarget(graph, vehicle, rng, spaces) {
  const ends = vehicle.ends;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const from = vehicle.path.length > 0 ? vehicle.path[vehicle.path.length - 1] : ends[Math.floor(rng.next() * ends.length)];
    const to = ends[Math.floor(rng.next() * ends.length)];
    if (from === to) continue;
    const found = route(graph, from, to);
    if (!found || found.length < 2) continue;
    vehicle.path = found;
    vehicle.leg = 0;
    vehicle.t = 0;
    vehicle.park = null;
    vehicle.parking = 0;
    if (rng.chance(0.25)) {
      const near = spaces.find((space) => space.node === to);
      if (near) vehicle.park = near.at;
    }
    const a = graph.nodes[found[0]];
    vehicle.x = a.x;
    vehicle.y = a.y;
    return;
  }
  vehicle.waiting = 5;
}
function edgeBetween(graph, from, to) {
  for (const id of graph.nodes[from].out) {
    if (graph.edges[id].to === to) return graph.edges[id];
  }
  return null;
}
function advanceTraffic(traffic, dt) {
  const { graph, vehicles, spaces } = traffic;
  const rng = advanceRng;
  for (const vehicle of vehicles) {
    if (vehicle.waiting > 0) {
      vehicle.waiting -= dt;
      if (vehicle.waiting > 0) {
        if (vehicle.park) vehicle.parking = Math.min(1, vehicle.parking + dt * 0.8);
        continue;
      }
      vehicle.parking = 0;
      vehicle.park = null;
      retarget(graph, vehicle, rng, spaces);
      continue;
    }
    if (vehicle.path.length < 2) {
      vehicle.waiting = 3;
      continue;
    }
    const from = vehicle.path[vehicle.leg];
    const to = vehicle.path[vehicle.leg + 1];
    const edge = edgeBetween(graph, from, to);
    if (!edge) {
      vehicle.waiting = 2;
      continue;
    }
    const speed = (SPEED[edge.cls] ?? 6e-3) * vehicle.speed;
    vehicle.t += speed * dt / edge.length;
    while (vehicle.t >= 1) {
      vehicle.t -= 1;
      vehicle.leg += 1;
      if (vehicle.leg + 1 >= vehicle.path.length) {
        vehicle.t = 0;
        vehicle.waiting = vehicle.park ? 14 + vehicle.id % 7 * 3 : 2 + vehicle.id % 5;
        break;
      }
    }
    const legFrom = graph.nodes[vehicle.path[Math.min(vehicle.leg, vehicle.path.length - 1)]];
    const legTo = graph.nodes[vehicle.path[Math.min(vehicle.leg + 1, vehicle.path.length - 1)]];
    const dx = legTo.x - legFrom.x;
    const dy = legTo.y - legFrom.y;
    const length = Math.hypot(dx, dy) || 1;
    vehicle.heading = Math.atan2(dy, dx);
    vehicle.offset = edge.width * 0.24;
    const nx = -dy / length;
    const ny = dx / length;
    vehicle.x = legFrom.x + dx * vehicle.t + nx * vehicle.offset;
    vehicle.y = legFrom.y + dy * vehicle.t + ny * vehicle.offset;
  }
}
var advanceRng = new Rng(CITY_SEED ^ 24081);
function vehiclePosition(vehicle) {
  if (!vehicle.park || vehicle.parking <= 0) {
    return { x: vehicle.x, y: vehicle.y, heading: vehicle.heading };
  }
  const k = vehicle.parking;
  return {
    x: vehicle.x + (vehicle.park.x - vehicle.x) * k,
    y: vehicle.y + (vehicle.park.y - vehicle.y) * k,
    heading: vehicle.heading + k * 0.6
  };
}

// src/sim/validateMap.ts
var BOUNDS = { x: -0.24, y: -0.24, w: 1.5, h: 1.45 };
var GROUND = /* @__PURE__ */ new Set(["park", "plaza", "parking", "pitch", "quay", "field", "orchard", "pasture", "solar"]);
function overlaps(a, b, slack) {
  return a.x + a.w > b.x + slack && b.x + b.w > a.x + slack && a.y + a.h > b.y + slack && b.y + b.h > a.y + slack;
}
function inside(r, bounds) {
  return r.x >= bounds.x && r.y >= bounds.y && r.x + r.w <= bounds.x + bounds.w && r.y + r.h <= bounds.y + bounds.h;
}
function distanceToRoad(p2, road) {
  let best = Infinity;
  for (let i = 0; i + 1 < road.pts.length; i += 1) {
    const a = road.pts[i];
    const b = road.pts[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared > 0 ? Math.max(0, Math.min(1, ((p2.x - a.x) * dx + (p2.y - a.y) * dy) / lengthSquared)) : 0;
    const d = Math.hypot(p2.x - (a.x + dx * t), p2.y - (a.y + dy * t));
    if (d < best) best = d;
  }
  return best;
}
function validateMap() {
  const layout = cityLayout();
  const graph = roadGraph();
  const problems = [];
  const structures = layout.fillers.filter((f) => !GROUND.has(f.kind));
  const known = new Set(ATLAS.map((a) => a.id));
  for (const filler of layout.fillers) {
    if (!known.has(filler.asset)) {
      problems.push({ kind: "missing-asset", what: filler.asset, at: { x: filler.x, y: filler.y } });
    }
  }
  for (const item of layout.amenities) {
    if (!known.has(item.asset)) {
      problems.push({ kind: "missing-asset", what: item.asset, at: item });
    }
  }
  const cell = 0.02;
  const buckets = /* @__PURE__ */ new Map();
  for (const s of structures) {
    const x0 = Math.floor(s.x / cell);
    const x1 = Math.floor((s.x + s.w) / cell);
    const y0 = Math.floor(s.y / cell);
    const y1 = Math.floor((s.y + s.h) / cell);
    for (let x = x0; x <= x1; x += 1) {
      for (let y = y0; y <= y1; y += 1) {
        const k = `${x},${y}`;
        const list = buckets.get(k);
        if (list) list.push(s);
        else buckets.set(k, [s]);
      }
    }
  }
  const reported = /* @__PURE__ */ new Set();
  for (const list of buckets.values()) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        if (!overlaps(list[i], list[j], 8e-4)) continue;
        const k = `${list[i].x.toFixed(5)}|${list[j].x.toFixed(5)}|${list[i].y.toFixed(5)}`;
        if (reported.has(k)) continue;
        reported.add(k);
        problems.push({
          kind: "overlap",
          what: `${list[i].kind} and ${list[j].kind} stand on the same ground`,
          at: { x: list[i].x, y: list[i].y }
        });
      }
    }
  }
  for (const filler of layout.fillers) {
    if (inside(filler, BOUNDS)) continue;
    problems.push({ kind: "out-of-bounds", what: `${filler.kind} is off the map`, at: { x: filler.x, y: filler.y } });
  }
  for (const plot of layout.plots) {
    const centre = { x: plot.x + plot.w / 2, y: plot.y + plot.h / 2 };
    let best = Infinity;
    for (const road of layout.roads) {
      if (road.cls === "rail" || road.cls === "runway" || road.cls === "taxiway") continue;
      const d = distanceToRoad(centre, road) - road.width / 2;
      if (d < best) best = d;
    }
    if (best > 0.012) {
      problems.push({ kind: "no-road-access", what: `${plot.number} ${plot.street}`, at: centre });
    }
  }
  if (graph.nodes.length > 0) {
    const seen = new Uint8Array(graph.nodes.length);
    const queue = [0];
    seen[0] = 1;
    while (queue.length > 0) {
      const at = queue.pop();
      for (const edgeId of graph.nodes[at].out) {
        const next = graph.edges[edgeId].to;
        if (seen[next]) continue;
        seen[next] = 1;
        queue.push(next);
      }
    }
    for (let i = 0; i < graph.nodes.length; i += 1) {
      if (seen[i]) continue;
      problems.push({ kind: "unreachable", what: "this junction is cut off from the network", at: graph.nodes[i] });
    }
    for (let i = 0; i < graph.nodes.length; i += 1) {
      if (graph.nodes[i].out.length === 0) {
        problems.push({ kind: "orphan-road", what: "a road that connects to nothing", at: graph.nodes[i] });
      }
    }
  }
  const spaces = parkingSpaces(graph, layout.fillers);
  for (const space of spaces) {
    const kerb = graph.nodes[space.node];
    const through = crossesStructure(kerb, space.at, structures);
    if (through) {
      problems.push({ kind: "blocked-approach", what: `a car park reached only through a ${through.kind}`, at: space.at });
    }
  }
  return {
    problems,
    counts: {
      roads: layout.roads.length,
      structures: structures.length,
      plots: layout.plots.length,
      amenities: layout.amenities.length,
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      parking: spaces.length
    }
  };
}

// src/ui/map.ts
var MAP_MODES = [
  { id: "standard", label: "Standard", legend: "Districts and available units" },
  { id: "commercial", label: "Commercial", legend: "Units suitable for business" },
  { id: "demand", label: "Demand", legend: "Customer demand per district" },
  { id: "income", label: "Income", legend: "Average household income" },
  { id: "competition", label: "Competition", legend: "Competitor density" },
  { id: "property", label: "Property", legend: "Price per square metre" },
  { id: "traffic", label: "Traffic", legend: "Foot traffic at each address" }
];
var CITY_W = 1;
var CITY_H = 0.92;
var MIN_ZOOM = 0.85;
var MAX_ZOOM = 9;
function heat(value) {
  const t = clamp(value, 0, 1);
  if (t < 0.5) {
    const k2 = t / 0.5;
    return `rgb(${Math.round(58 + k2 * 92)}, ${Math.round(110 + k2 * 60)}, ${Math.round(180 - k2 * 40)})`;
  }
  const k = (t - 0.5) / 0.5;
  return `rgb(${Math.round(150 + k * 90)}, ${Math.round(170 - k * 90)}, ${Math.round(140 - k * 90)})`;
}
var C = {
  ground: "#0a1119",
  land: "#141c26",
  water: "#0e2536",
  waterEdge: "rgba(120,170,200,0.22)",
  road: "#333e4d",
  roadMain: "#3d4a5b",
  runway: "#39424e",
  taxiway: "#333b46",
  path: "#44505f",
  pavement: "#4c5a6b",
  kerb: "rgba(10,16,23,0.55)",
  outskirts: "#101a17",
  marking: "rgba(226,214,160,0.5)",
  ballast: "#2b3037",
  rail: "#6b7784",
  park: "#1c3324",
  pitch: "#22412c",
  plaza: "#2a3340",
  parking: "#262f3a",
  quay: "#28323d",
  shadow: "rgba(0,0,0,0.34)",
  roadLabel: "rgba(190,205,222,0.55)"
};
var GROUND_KINDS = /* @__PURE__ */ new Set([
  "park",
  "plaza",
  "parking",
  "pitch",
  "quay",
  "field",
  "orchard",
  "pasture",
  "solar"
]);
var COUNTRY_KINDS = /* @__PURE__ */ new Set(["field", "orchard", "pasture", "solar", "turbine", "glasshouse", "farmstead"]);
var CityMap = class _CityMap {
  /**
   * The map currently on screen. The map is a canvas, so it has no DOM for a
   * test to drive; this is how the browser tests point the camera somewhere and
   * check what got drawn.
   */
  static current = null;
  canvas;
  /**
   * The city is painted into an off-screen canvas and blitted; only the traffic
   * is redrawn every frame. Northgate is several thousand shapes, and repainting
   * all of them sixty times a second to move ninety vehicles would be absurd.
   */
  base;
  ctx;
  screen;
  baseDirty = true;
  traffic = null;
  raf = null;
  lastFrame = 0;
  debug = false;
  report = null;
  state;
  camera;
  mode = "standard";
  pointers = [];
  dragged = false;
  pinchStart = 0;
  pinchZoom = 1;
  hoverId = null;
  selectedId = null;
  dpr = 1;
  cssW = 0;
  cssH = 0;
  frame = null;
  resizeObserver = null;
  onSelect = () => {
  };
  constructor(state, camera) {
    this.state = state;
    this.camera = camera;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "map-canvas";
    const context = this.canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is not available in this browser.");
    this.screen = context;
    this.base = document.createElement("canvas");
    const baseContext = this.base.getContext("2d");
    if (!baseContext) throw new Error("Canvas 2D is not available in this browser.");
    this.ctx = baseContext;
    _CityMap.current = this;
    this.attach();
    this.run();
  }
  /** Points the camera at a place, for tests and for the "show me" buttons. */
  setCamera(x, y, zoom) {
    this.camera.x = x;
    this.camera.y = y;
    this.camera.zoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    this.draw();
  }
  /**
   * The check-your-work view: footprints, the road graph the traffic runs on,
   * district boundaries, the route every vehicle is driving, and a marker on
   * anything `validateMap()` found wrong with the city.
   */
  setDebug(on2) {
    this.debug = on2;
    if (on2 && !this.report) this.report = validateMap();
    this.draw();
  }
  getDebug() {
    return this.debug;
  }
  /** What the last check found. Runs the check if it has not run yet. */
  checkMap() {
    if (!this.report) this.report = validateMap();
    return this.report;
  }
  setMode(mode) {
    this.mode = mode;
    this.draw();
  }
  getMode() {
    return this.mode;
  }
  setState(state) {
    this.state = state;
    this.draw();
  }
  select(id) {
    this.selectedId = id;
    this.draw();
  }
  /** Centres the view on a building without changing zoom. */
  focus(building, zoom = 4) {
    this.camera.x = building.x + building.w / 2;
    this.camera.y = building.y + building.h / 2;
    this.camera.zoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    this.draw();
  }
  zoomBy(factor2) {
    this.camera.zoom = clamp(this.camera.zoom * factor2, MIN_ZOOM, MAX_ZOOM);
    this.clampCamera();
    this.draw();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(240, rect.width);
    const height = clamp(width * 0.72, 280, 780);
    this.cssW = width;
    this.cssH = height;
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.style.height = `${height}px`;
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    this.base.width = this.canvas.width;
    this.base.height = this.canvas.height;
    this.draw();
  }
  destroy() {
    this.resizeObserver?.disconnect();
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
    if (_CityMap.current === this) _CityMap.current = null;
  }
  /**
   * The traffic loop. It runs only while the map is on screen and the clock is
   * running: a paused game is a still city, and a map nobody is looking at
   * costs nothing.
   */
  run() {
    const step = (now) => {
      this.raf = requestAnimationFrame(step);
      if (!this.canvas.isConnected || document.hidden) {
        this.lastFrame = now;
        return;
      }
      const dt = Math.min(0.06, (now - this.lastFrame) / 1e3);
      this.lastFrame = now;
      const speed = this.state.speed ?? 1;
      let moved = false;
      if (!this.traffic) {
        this.traffic = createTraffic();
        moved = true;
      }
      if (speed > 0 && dt > 0) {
        advanceTraffic(this.traffic, dt * Math.min(speed, 3));
        moved = true;
      }
      if (moved || this.baseDirty) this.render();
    };
    this.raf = requestAnimationFrame(step);
  }
  // ---------------------------------------------------------- projection
  scale() {
    return Math.min(this.cssW / CITY_W, this.cssH / CITY_H) * this.camera.zoom;
  }
  toScreen(x, y) {
    const s = this.scale();
    return {
      x: (x - this.camera.x) * s + this.cssW / 2,
      y: (y - this.camera.y) * s + this.cssH / 2
    };
  }
  toWorld(px, py) {
    const s = this.scale();
    return {
      x: (px - this.cssW / 2) / s + this.camera.x,
      y: (py - this.cssH / 2) / s + this.camera.y
    };
  }
  clampCamera() {
    const s = this.scale();
    const halfW = this.cssW / 2 / s;
    const halfH = this.cssH / 2 / s;
    const margin = 0.06;
    const minX = Math.min(halfW - margin, CITY_W / 2);
    const maxX = Math.max(CITY_W - halfW + margin, CITY_W / 2);
    const minY = Math.min(halfH - margin, CITY_H / 2);
    const maxY = Math.max(CITY_H - halfH + margin, CITY_H / 2);
    this.camera.x = clamp(this.camera.x, minX, maxX);
    this.camera.y = clamp(this.camera.y, minY, maxY);
  }
  // ------------------------------------------------------------- input
  attach() {
    const canvas = this.canvas;
    canvas.addEventListener("pointerdown", (event) => {
      canvas.setPointerCapture(event.pointerId);
      this.pointers.push({ id: event.pointerId, x: event.clientX, y: event.clientY });
      this.dragged = false;
      if (this.pointers.length === 2) {
        this.pinchStart = this.pointerDistance();
        this.pinchZoom = this.camera.zoom;
      }
      canvas.classList.add("dragging");
    });
    canvas.addEventListener("pointermove", (event) => {
      const index = this.pointers.findIndex((p2) => p2.id === event.pointerId);
      if (index === -1) {
        this.updateHover(event);
        return;
      }
      const previous = this.pointers[index];
      const dx = event.clientX - previous.x;
      const dy = event.clientY - previous.y;
      this.pointers[index] = { id: event.pointerId, x: event.clientX, y: event.clientY };
      if (this.pointers.length === 2 && this.pinchStart > 0) {
        const distance = this.pointerDistance();
        this.camera.zoom = clamp(distance / this.pinchStart * this.pinchZoom, MIN_ZOOM, MAX_ZOOM);
        this.dragged = true;
        this.clampCamera();
        this.draw();
        return;
      }
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this.dragged = true;
      const s = this.scale();
      this.camera.x -= dx / s;
      this.camera.y -= dy / s;
      this.clampCamera();
      this.draw();
    });
    const release = (event) => {
      const wasSingle = this.pointers.length === 1;
      this.pointers = this.pointers.filter((p2) => p2.id !== event.pointerId);
      if (this.pointers.length < 2) this.pinchStart = 0;
      if (this.pointers.length === 0) canvas.classList.remove("dragging");
      if (wasSingle && !this.dragged) this.handleTap(event);
    };
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    canvas.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const before = this.toWorld(event.clientX - rect.left, event.clientY - rect.top);
        this.camera.zoom = clamp(this.camera.zoom * (event.deltaY < 0 ? 1.16 : 1 / 1.16), MIN_ZOOM, MAX_ZOOM);
        const after = this.toWorld(event.clientX - rect.left, event.clientY - rect.top);
        this.camera.x += before.x - after.x;
        this.camera.y += before.y - after.y;
        this.clampCamera();
        this.draw();
      },
      { passive: false }
    );
    canvas.addEventListener("pointerleave", () => {
      this.hoverId = null;
      this.draw();
    });
    if ("ResizeObserver" in window) {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas);
    } else {
      globalThis.addEventListener("resize", () => this.resize());
    }
  }
  pointerDistance() {
    if (this.pointers.length < 2) return 0;
    return Math.hypot(this.pointers[0].x - this.pointers[1].x, this.pointers[0].y - this.pointers[1].y);
  }
  updateHover(event) {
    const rect = this.canvas.getBoundingClientRect();
    const found = this.pick(event.clientX - rect.left, event.clientY - rect.top);
    const id = found?.id ?? null;
    if (id !== this.hoverId) {
      this.hoverId = id;
      this.draw();
    }
  }
  handleTap(event) {
    const rect = this.canvas.getBoundingClientRect();
    const found = this.pick(event.clientX - rect.left, event.clientY - rect.top);
    this.selectedId = found?.id ?? null;
    this.onSelect(found);
    this.draw();
  }
  /** Finds the building under a screen point, with a touch-friendly margin. */
  pick(px, py) {
    const world = this.toWorld(px, py);
    const s = this.scale();
    const pad = Math.max(0, (11 - 0) / s);
    let best = null;
    let bestDistance = Infinity;
    for (const building of this.state.buildings) {
      const inside2 = world.x >= building.x - pad && world.x <= building.x + building.w + pad && world.y >= building.y - pad && world.y <= building.y + building.h + pad;
      if (!inside2) continue;
      const cx = building.x + building.w / 2;
      const cy = building.y + building.h / 2;
      const distance = (world.x - cx) ** 2 + (world.y - cy) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = building;
      }
    }
    return best;
  }
  // ------------------------------------------------------------ drawing
  draw() {
    this.baseDirty = true;
    if (this.frame !== null) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.render();
    });
  }
  /** Blits the city, then draws the traffic on top of it. */
  render() {
    if (this.cssW === 0) this.resize();
    if (this.baseDirty) {
      this.paint();
      this.baseDirty = false;
    }
    this.screen.setTransform(1, 0, 0, 1, 0, 0);
    this.screen.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.screen.drawImage(this.base, 0, 0);
    this.paintTraffic();
    if (this.debug) this.paintDebug();
  }
  paintDebug() {
    const ctx = this.screen;
    const s = this.scale();
    const layout = cityLayout();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.strokeStyle = "rgba(120,190,255,0.5)";
    ctx.lineWidth = 1;
    for (const def of DISTRICTS) {
      const p2 = this.toScreen(def.x, def.y);
      ctx.strokeRect(p2.x, p2.y, def.w * s, def.h * s);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    for (const filler of layout.fillers) {
      if (!this.visible(filler)) continue;
      const p2 = this.toScreen(filler.x, filler.y);
      ctx.strokeRect(p2.x, p2.y, filler.w * s, filler.h * s);
    }
    if (this.traffic) {
      const graph = this.traffic.graph;
      ctx.strokeStyle = "rgba(255,200,90,0.35)";
      ctx.beginPath();
      for (const edge of graph.edges) {
        if (edge.from > edge.to) continue;
        const a = this.toScreen(graph.nodes[edge.from].x, graph.nodes[edge.from].y);
        const b = this.toScreen(graph.nodes[edge.to].x, graph.nodes[edge.to].y);
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();
      ctx.fillStyle = "rgba(255,220,140,0.8)";
      for (const node2 of graph.nodes) {
        const p2 = this.toScreen(node2.x, node2.y);
        if (p2.x < 0 || p2.x > this.cssW || p2.y < 0 || p2.y > this.cssH) continue;
        ctx.fillRect(p2.x - 1.5, p2.y - 1.5, 3, 3);
      }
      ctx.strokeStyle = "rgba(120,255,190,0.5)";
      ctx.beginPath();
      for (const vehicle of this.traffic.vehicles) {
        for (let i = vehicle.leg; i + 1 < vehicle.path.length; i += 1) {
          const a = this.toScreen(graph.nodes[vehicle.path[i]].x, graph.nodes[vehicle.path[i]].y);
          const b = this.toScreen(graph.nodes[vehicle.path[i + 1]].x, graph.nodes[vehicle.path[i + 1]].y);
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
        }
      }
      ctx.stroke();
    }
    const report = this.checkMap();
    ctx.strokeStyle = "#ff5a5a";
    ctx.lineWidth = 2;
    for (const problem of report.problems) {
      const p2 = this.toScreen(problem.at.x, problem.at.y);
      ctx.beginPath();
      ctx.arc(p2.x, p2.y, 7, 0, Math.PI * 2);
      ctx.stroke();
    }
    const c = report.counts;
    ctx.fillStyle = "rgba(8,14,22,0.82)";
    ctx.fillRect(8, 8, 232, 74);
    ctx.fillStyle = "#dbe6f2";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${c.roads} roads \xB7 ${c.nodes} junctions \xB7 ${c.edges} links`, 16, 26);
    ctx.fillText(`${c.structures} buildings \xB7 ${c.plots} units \xB7 ${c.amenities} details`, 16, 42);
    ctx.fillText(`${c.parking} car parks \xB7 ${this.traffic?.vehicles.length ?? 0} vehicles`, 16, 58);
    ctx.fillStyle = report.problems.length === 0 ? "#7fd6a2" : "#ff7b7b";
    ctx.fillText(
      report.problems.length === 0 ? "no problems found" : `${report.problems.length} problems`,
      16,
      74
    );
  }
  /**
   * The moving city. Every vehicle is somewhere on an edge of the road graph,
   * so none of them can be anywhere but on a road.
   */
  paintTraffic() {
    if (!this.traffic) return;
    const s = this.scale();
    if (s < 1400) return;
    const ctx = this.screen;
    const detail = { markings: s > 1900, fine: s > 4200 };
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (const vehicle of this.traffic.vehicles) {
      const at = vehiclePosition(vehicle);
      const p2 = this.toScreen(at.x, at.y);
      if (p2.x < -20 || p2.x > this.cssW + 20 || p2.y < -20 || p2.y > this.cssH + 20) continue;
      paintVehicle(
        ctx,
        asset(vehicle.asset),
        p2.x,
        p2.y,
        at.heading,
        Math.max(2.5, vehicle.length * s),
        Math.max(1.2, vehicle.width * s),
        detail
      );
    }
  }
  /**
   * One frame of Northgate.
   *
   * Drawn the way a city is built up: ground, water, parks, then the roads,
   * then everything standing on the blocks, then the details you only notice
   * when you are close — trees, crossings, street names. Each layer has a zoom
   * at which it starts being worth drawing, which is what keeps the whole city
   * on screen at once from costing anything.
   */
  paint() {
    const ctx = this.ctx;
    const layout = cityLayout();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssW, this.cssH);
    const s = this.scale();
    const detail = {
      s,
      fabric: s > 560,
      kerbs: s > 1500,
      markings: s > 1900,
      scenery: s > 2400,
      fine: s > 4200,
      labels: s > 520
    };
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, this.cssW, this.cssH);
    this.paintOutskirts();
    for (const body of layout.water) this.paintWater(body);
    for (const def of DISTRICTS) this.paintDistrictGround(def);
    if (detail.fabric) {
      for (const filler of layout.fillers) {
        if (!GROUND_KINDS.has(filler.kind)) continue;
        if (!this.visible(filler)) continue;
        this.paintGroundFiller(filler, detail);
      }
    }
    this.paintRoads(layout.roads, detail);
    if (detail.fabric) {
      for (const filler of layout.fillers) {
        if (GROUND_KINDS.has(filler.kind)) continue;
        if (!this.visible(filler)) continue;
        this.paintStructure(filler, detail);
      }
    }
    if (this.mode !== "standard") {
      for (const def of DISTRICTS) this.paintOverlay(def);
    }
    if (detail.scenery) this.paintAmenities(layout.amenities, detail);
    for (const building of this.state.buildings) {
      if (!this.visible(building)) continue;
      this.paintBuilding(building, detail);
    }
    if (detail.scenery) this.paintRoadNames(layout.roads, detail);
    if (detail.labels) {
      for (const park of layout.parks) this.paintParkName(park, detail);
      for (const def of DISTRICTS) this.paintDistrictLabel(def, detail);
    } else {
      for (const def of DISTRICTS) this.paintDistrictShort(def);
    }
  }
  /**
   * The country the city sits in. Northgate does not stop at a hard edge: the
   * land runs on, and the main roads run out into it.
   */
  paintOutskirts() {
    const ctx = this.ctx;
    const s = this.scale();
    const p2 = this.toScreen(-0.2, -0.2);
    ctx.fillStyle = C.outskirts;
    ctx.fillRect(p2.x, p2.y, 1.4 * s, 1.34 * s);
  }
  /** Is any part of this rectangle on screen? */
  visible(rect) {
    const p2 = this.toScreen(rect.x, rect.y);
    const s = this.scale();
    return !(p2.x + rect.w * s < -8 || p2.x > this.cssW + 8 || p2.y + rect.h * s < -8 || p2.y > this.cssH + 8);
  }
  paintWater(body) {
    const ctx = this.ctx;
    const p2 = this.toScreen(body.x, body.y);
    const s = this.scale();
    ctx.fillStyle = C.water;
    ctx.fillRect(p2.x, p2.y, body.w * s, body.h * s);
    ctx.strokeStyle = C.waterEdge;
    ctx.lineWidth = Math.max(1, s * 16e-4);
    ctx.strokeRect(p2.x, p2.y, body.w * s, body.h * s);
  }
  paintDistrictGround(def) {
    const ctx = this.ctx;
    const p2 = this.toScreen(def.x, def.y);
    const s = this.scale();
    const w = def.w * s;
    const h2 = def.h * s;
    if (p2.x + w < -40 || p2.x > this.cssW + 40 || p2.y + h2 < -40 || p2.y > this.cssH + 40) return;
    ctx.fillStyle = C.land;
    ctx.fillRect(p2.x, p2.y, w, h2);
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = def.colour;
    ctx.fillRect(p2.x, p2.y, w, h2);
    ctx.globalAlpha = 1;
  }
  paintOverlay(def) {
    const ctx = this.ctx;
    const value = this.districtValue(def);
    if (value < 0) return;
    const p2 = this.toScreen(def.x, def.y);
    const s = this.scale();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = heat(value);
    ctx.fillRect(p2.x, p2.y, def.w * s, def.h * s);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 1;
    ctx.strokeRect(p2.x + 0.5, p2.y + 0.5, def.w * s - 1, def.h * s - 1);
  }
  // ------------------------------------------------------------- roads
  paintRoads(roads, detail) {
    const ctx = this.ctx;
    const s = detail.s;
    ctx.lineJoin = "round";
    ctx.lineCap = "butt";
    const trace = (road) => {
      ctx.beginPath();
      road.pts.forEach((pt, index) => {
        const p2 = this.toScreen(pt.x, pt.y);
        if (index === 0) ctx.moveTo(p2.x, p2.y);
        else ctx.lineTo(p2.x, p2.y);
      });
    };
    const carriageways = roads.filter((road) => road.cls !== "rail");
    const minor = (road) => road.cls === "lane" || road.cls === "street";
    if (detail.kerbs) {
      ctx.strokeStyle = C.pavement;
      for (const road of carriageways) {
        if (road.cls === "runway" || road.cls === "taxiway") continue;
        if (minor(road) && !detail.fabric) continue;
        ctx.lineWidth = road.width * s + Math.min(Math.max(2, s * 22e-4), 9);
        trace(road);
        ctx.stroke();
      }
    }
    for (const road of carriageways) {
      if (minor(road) && !detail.fabric) continue;
      ctx.strokeStyle = road.cls === "arterial" ? C.roadMain : road.cls === "runway" ? C.runway : road.cls === "taxiway" ? C.taxiway : road.cls === "pedestrian" || road.cls === "path" ? C.path : C.road;
      ctx.lineWidth = Math.max(road.cls === "arterial" ? 1.6 : 0.8, road.width * s);
      trace(road);
      ctx.stroke();
    }
    if (detail.markings) {
      ctx.strokeStyle = C.marking;
      ctx.lineWidth = Math.max(1, s * 6e-4);
      ctx.setLineDash([s * 6e-3, s * 5e-3]);
      for (const road of carriageways) {
        if (road.cls !== "arterial" && road.cls !== "runway") continue;
        trace(road);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      if (detail.fine) {
        ctx.strokeStyle = C.kerb;
        ctx.lineWidth = 1;
        for (const road of carriageways) {
          if (road.cls === "runway" || road.cls === "taxiway") continue;
          for (const side of [-0.5, 0.5]) {
            const vertical = Math.abs(road.pts[road.pts.length - 1].x - road.pts[0].x) < 1e-4;
            ctx.beginPath();
            road.pts.forEach((pt, index) => {
              const offset = road.width * side;
              const q = this.toScreen(pt.x + (vertical ? offset : 0), pt.y + (vertical ? 0 : offset));
              if (index === 0) ctx.moveTo(q.x, q.y);
              else ctx.lineTo(q.x, q.y);
            });
            ctx.stroke();
          }
        }
      }
    }
    for (const road of roads) {
      if (road.cls !== "rail") continue;
      ctx.strokeStyle = C.ballast;
      ctx.lineWidth = Math.max(1.4, road.width * s);
      trace(road);
      ctx.stroke();
      if (detail.markings) {
        ctx.strokeStyle = C.rail;
        ctx.lineWidth = Math.max(0.6, road.width * s * 0.16);
        for (const offset of [-road.width * 0.3, road.width * 0.3]) {
          ctx.beginPath();
          road.pts.forEach((pt, index) => {
            const vertical = road.pts.length > 1 && Math.abs(road.pts[1].x - road.pts[0].x) < 1e-4;
            const p2 = this.toScreen(pt.x + (vertical ? offset : 0), pt.y + (vertical ? 0 : offset));
            if (index === 0) ctx.moveTo(p2.x, p2.y);
            else ctx.lineTo(p2.x, p2.y);
          });
          ctx.stroke();
        }
      }
    }
  }
  paintRoadNames(roads, detail) {
    const ctx = this.ctx;
    ctx.font = "600 9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = C.roadLabel;
    for (const road of roads) {
      if (!road.name || road.pts.length < 2) continue;
      if (!road.major && !detail.fine) continue;
      const a = road.pts[0];
      const b = road.pts[road.pts.length - 1];
      const vertical = Math.abs(b.x - a.x) < Math.abs(b.y - a.y);
      const mid = vertical ? { x: a.x, y: clamp(this.camera.y, Math.min(a.y, b.y) + 0.02, Math.max(a.y, b.y) - 0.02) } : { x: clamp(this.camera.x, Math.min(a.x, b.x) + 0.02, Math.max(a.x, b.x) - 0.02), y: a.y };
      const p2 = this.toScreen(mid.x, mid.y);
      if (p2.x < -60 || p2.x > this.cssW + 60 || p2.y < -20 || p2.y > this.cssH + 20) continue;
      ctx.save();
      ctx.translate(p2.x, p2.y);
      if (vertical) ctx.rotate(-Math.PI / 2);
      ctx.fillText(road.name, 0, -Math.max(3, road.width * detail.s * 0.5 + 3));
      ctx.restore();
    }
  }
  // -------------------------------------------------------- the fabric
  paintGroundFiller(filler, detail) {
    const ctx = this.ctx;
    const p2 = this.toScreen(filler.x, filler.y);
    const s = detail.s;
    const w = filler.w * s;
    const h2 = filler.h * s;
    if (COUNTRY_KINDS.has(filler.kind)) {
      ctx.globalAlpha = 0.38;
      paintAsset(ctx, asset(filler.asset), { x: p2.x, y: p2.y, w, h: h2 }, filler.tone, detail);
      ctx.globalAlpha = 1;
      return;
    }
    switch (filler.kind) {
      case "park":
        ctx.fillStyle = C.park;
        ctx.fillRect(p2.x, p2.y, w, h2);
        paintAsset(ctx, asset(filler.asset), { x: p2.x, y: p2.y, w, h: h2 }, filler.tone, { ...detail, base: false });
        break;
      case "pitch":
        ctx.fillStyle = C.pitch;
        ctx.fillRect(p2.x, p2.y, w, h2);
        if (detail.markings) {
          ctx.strokeStyle = "rgba(255,255,255,0.22)";
          ctx.lineWidth = 1;
          ctx.strokeRect(p2.x + 1, p2.y + 1, w - 2, h2 - 2);
          ctx.beginPath();
          ctx.moveTo(p2.x + w / 2, p2.y + 1);
          ctx.lineTo(p2.x + w / 2, p2.y + h2 - 1);
          ctx.stroke();
        }
        break;
      case "plaza":
        ctx.fillStyle = C.plaza;
        ctx.fillRect(p2.x, p2.y, w, h2);
        paintAsset(ctx, asset(filler.asset), { x: p2.x, y: p2.y, w, h: h2 }, filler.tone, { ...detail, base: false });
        break;
      case "quay":
        ctx.fillStyle = C.quay;
        ctx.fillRect(p2.x, p2.y, w, h2);
        break;
      case "parking":
      default:
        ctx.fillStyle = C.parking;
        ctx.fillRect(p2.x, p2.y, w, h2);
        if (detail.markings && w > 14 && h2 > 10) {
          ctx.strokeStyle = "rgba(255,255,255,0.14)";
          ctx.lineWidth = 1;
          const step = Math.max(5, s * 26e-4);
          ctx.beginPath();
          for (let x = p2.x + step; x < p2.x + w - 1; x += step) {
            ctx.moveTo(x, p2.y + 1);
            ctx.lineTo(x, p2.y + h2 - 1);
          }
          ctx.stroke();
        }
        break;
    }
  }
  /**
   * A building, drawn as whichever asset from the pack it was built as. The
   * choice was made once when the city was generated, so this is a lookup and a
   * few dozen rectangles — cheap enough to do for every structure on screen.
   */
  paintStructure(filler, detail) {
    const ctx = this.ctx;
    const p2 = this.toScreen(filler.x, filler.y);
    const s = detail.s;
    const w = Math.max(1, filler.w * s);
    const h2 = Math.max(1, filler.h * s);
    if (detail.kerbs && filler.floors > 0) {
      const drop = Math.min(10, filler.floors * (detail.fine ? 0.9 : 0.5));
      ctx.fillStyle = C.shadow;
      ctx.fillRect(p2.x + drop, p2.y + drop, w, h2);
    }
    if (COUNTRY_KINDS.has(filler.kind)) {
      ctx.globalAlpha = 0.45;
      paintAsset(ctx, asset(filler.asset), { x: p2.x, y: p2.y, w, h: h2 }, filler.tone, detail);
      ctx.globalAlpha = 1;
      return;
    }
    paintAsset(ctx, asset(filler.asset), { x: p2.x, y: p2.y, w, h: h2 }, filler.tone, detail);
    if (detail.markings && w > 5 && h2 > 5) {
      ctx.strokeStyle = C.kerb;
      ctx.lineWidth = 1;
      ctx.strokeRect(p2.x + 0.5, p2.y + 0.5, w - 1, h2 - 1);
    }
  }
  paintAmenities(amenities, detail) {
    const ctx = this.ctx;
    const s = detail.s;
    for (const item of amenities) {
      const p2 = this.toScreen(item.x, item.y);
      if (p2.x < -20 || p2.x > this.cssW + 20 || p2.y < -20 || p2.y > this.cssH + 20) continue;
      const a = asset(item.asset);
      const r = clamp(item.r * s, 1.1, item.kind === "fountain" ? 26 : item.kind === "tree" ? 4.6 : 6);
      if (item.kind === "tree") {
        paintTree(ctx, a, p2.x, p2.y, r, detail);
        continue;
      }
      if (item.kind === "crossing") {
        if (!detail.markings) continue;
        const half = item.r * s;
        ctx.fillStyle = "rgba(230,236,244,0.42)";
        const bars = 4;
        for (let i = 0; i < bars; i += 1) {
          const t = -half + (i + 0.25) * 2 * half / bars;
          if (item.vertical) ctx.fillRect(p2.x - 2, p2.y + t, 4, Math.max(1, 2 * half / bars / 2.2));
          else ctx.fillRect(p2.x + t, p2.y - 2, Math.max(1, 2 * half / bars / 2.2), 4);
        }
        continue;
      }
      if (!detail.fine && item.kind !== "fountain") continue;
      paintFurniture(ctx, a, p2.x, p2.y, r, item.vertical ?? false);
    }
  }
  // ------------------------------------------------------------- labels
  districtValue(def) {
    const districtState = this.state.districts[def.id];
    switch (this.mode) {
      case "demand": {
        const index = districtState?.demandIndex ?? 1;
        return clamp(def.footTraffic / 42e3 * 0.5 + def.population / 13e4 * 0.5 * index, 0, 1);
      }
      case "income":
        return clamp((def.averageIncome - 2e4) / 125e3, 0, 1);
      case "property":
        return clamp(def.pricePerSqm * (districtState?.propertyIndex ?? 1) / 6500, 0, 1);
      case "traffic":
        return clamp(def.footTraffic / 42e3, 0, 1);
      case "competition": {
        const buildings = this.state.buildings.filter((b) => b.district === def.id);
        const rivals = buildings.filter((b) => b.status === "competitor").length;
        return clamp(rivals / Math.max(1, buildings.length * 0.55), 0, 1);
      }
      case "commercial":
        return clamp(def.commercialActivity / 1.9, 0, 1);
      default:
        return -1;
    }
  }
  paintDistrictShort(def) {
    const ctx = this.ctx;
    const p2 = this.toScreen(def.x, def.y);
    const s = this.scale();
    const w = def.w * s;
    if (p2.x + w < 0 || p2.x > this.cssW || w < 46) return;
    ctx.fillStyle = "rgba(230,237,245,0.62)";
    ctx.font = "600 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(def.short, p2.x + w / 2, p2.y + def.h * s / 2 + 3);
  }
  paintDistrictLabel(def, detail) {
    const ctx = this.ctx;
    const p2 = this.toScreen(def.x, def.y);
    const s = detail.s;
    const w = def.w * s;
    if (p2.x + w < 0 || p2.x > this.cssW) return;
    const label = def.name.toUpperCase();
    let size = 10;
    ctx.font = `700 ${size}px system-ui, sans-serif`;
    while (ctx.measureText(label).width + 18 > w && size > 7) {
      size -= 1;
      ctx.font = `700 ${size}px system-ui, sans-serif`;
    }
    ctx.textAlign = "left";
    const width = ctx.measureText(label).width;
    if (width + 18 > w) return;
    ctx.fillStyle = "rgba(11,16,23,0.72)";
    ctx.fillRect(p2.x + 4, p2.y + 3, width + 10, 15);
    ctx.fillStyle = "rgba(230,237,245,0.9)";
    ctx.fillText(label, p2.x + 9, p2.y + 14);
  }
  paintParkName(park, detail) {
    if (!detail.scenery) return;
    const ctx = this.ctx;
    const p2 = this.toScreen(park.x, park.y);
    const s = detail.s;
    if (park.w * s < 60) return;
    ctx.fillStyle = "rgba(190,218,196,0.75)";
    ctx.font = "italic 600 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(park.name, p2.x + park.w * s / 2, p2.y + park.h * s / 2 + 3);
  }
  buildingColour(building) {
    const player = this.state.playerCompanyId;
    if (building.occupantCompanyId === player) return "#4bbf87";
    if (building.status === "competitor") return "#e2686d";
    switch (this.mode) {
      case "traffic":
        return heat(clamp(building.footTraffic / 42e3, 0, 1));
      case "property":
        return heat(clamp(building.value / 9e5, 0, 1));
      case "commercial":
        return building.status === "available" ? "#6f9bd0" : "#4a5567";
      default:
        return building.status === "available" ? "#5d708a" : "#4a5567";
    }
  }
  paintBuilding(building, detail) {
    const ctx = this.ctx;
    const p2 = this.toScreen(building.x, building.y);
    const s = detail.s;
    const w = Math.max(2, building.w * s);
    const h2 = Math.max(2, building.h * s);
    const colour = this.buildingColour(building);
    if (detail.kerbs) {
      const drop = Math.min(9, building.floors * (detail.fine ? 1.4 : 0.8));
      ctx.fillStyle = C.shadow;
      ctx.fillRect(p2.x + drop, p2.y + drop, w, h2);
    }
    ctx.fillStyle = colour;
    ctx.fillRect(p2.x, p2.y, w, h2);
    if (detail.markings && h2 > 6) {
      ctx.fillStyle = "rgba(255,255,255,0.13)";
      ctx.fillRect(p2.x, p2.y + h2 - Math.max(1.5, h2 * 0.2), w, Math.max(1.5, h2 * 0.2));
    }
    const selected = building.id === this.selectedId;
    const hovered = building.id === this.hoverId;
    if (selected || hovered) {
      ctx.strokeStyle = selected ? "#ffffff" : "rgba(255,255,255,0.65)";
      ctx.lineWidth = selected ? 2 : 1.5;
      ctx.strokeRect(p2.x - 1.5, p2.y - 1.5, w + 3, h2 + 3);
    }
    if (!detail.markings || w < 22 || h2 < 9) return;
    const business = building.businessId ? businessById(this.state, building.businessId) : void 0;
    if (business) {
      const type = businessType(business.typeId);
      ctx.fillStyle = "rgba(0,0,0,0.32)";
      ctx.fillRect(p2.x, p2.y, w, h2);
      ctx.fillStyle = "#e6edf5";
      ctx.font = `${Math.min(13, Math.max(7, h2 * 0.55))}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(type?.icon ?? "\u2022", p2.x + w / 2, p2.y + h2 / 2 + 4);
      if (detail.fine && h2 > 22 && w > 54) {
        ctx.fillStyle = "rgba(230,237,245,0.9)";
        ctx.font = "600 9px system-ui, sans-serif";
        ctx.fillText(this.truncate(business.name, w), p2.x + w / 2, p2.y + h2 - 4);
      }
    } else if (detail.fine && h2 > 14 && w > 46) {
      ctx.fillStyle = "rgba(15,22,31,0.75)";
      ctx.font = "9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(this.truncate(building.address, w), p2.x + w / 2, p2.y + h2 / 2 + 3);
    }
  }
  truncate(text, width) {
    const max = Math.max(3, Math.floor(width / 5.6));
    return text.length > max ? `${text.slice(0, max - 1)}\u2026` : text;
  }
};

// src/sim/bus.ts
var listeners = /* @__PURE__ */ new Map();
function on(event, listener) {
  let set = listeners.get(event);
  if (!set) {
    set = /* @__PURE__ */ new Set();
    listeners.set(event, set);
  }
  set.add(listener);
  return () => void set?.delete(listener);
}
function emit(event, payload) {
  const set = listeners.get(event);
  if (!set) return;
  for (const listener of [...set]) {
    try {
      listener(payload);
    } catch (error) {
      console.error(`[bm] listener for "${String(event)}" failed`, error);
    }
  }
}

// src/data/products.ts
function p(id, name, category, wholesalePrice, marketPrice, quality, appeal, unitsPerBasket, weight, volume, shelfLife) {
  return { id, name, category, wholesalePrice, marketPrice, quality, appeal, unitsPerBasket, weight, volume, shelfLife };
}
var PRODUCTS = [
  // groceries
  p("bread", "Bread", "groceries", 0.82, 2.4, 0.55, 0.72, 1.4, 0.6, 1.2, 3),
  p("milk", "Milk", "groceries", 0.94, 2.15, 0.6, 0.68, 1.6, 1.05, 1.1, 7),
  p("produce", "Fresh produce", "groceries", 1.35, 3.5, 0.62, 0.66, 2.2, 0.8, 1.4, 5),
  p("snacks", "Snacks", "groceries", 0.68, 2.1, 0.42, 0.78, 2.1, 0.2, 0.6, 90),
  p("readymeal", "Ready meals", "groceries", 2.4, 6.2, 0.5, 0.63, 0.55, 0.45, 0.9, 6),
  p("household", "Household goods", "home", 1.9, 5.1, 0.55, 0.4, 0.6, 0.9, 1.6, 0),
  // beverages
  p("coffeebeans", "Coffee beans", "beverages", 6.4, 15.5, 0.7, 0.6, 0.7, 1, 1, 180),
  p("softdrinks", "Soft drinks", "beverages", 0.55, 1.9, 0.4, 0.8, 2.4, 0.5, 0.8, 240),
  p("energydrinks", "Energy drinks", "beverages", 0.85, 2.6, 0.4, 0.66, 1.8, 0.5, 0.7, 240),
  p("juice", "Fresh juice", "beverages", 1.25, 3.6, 0.68, 0.58, 1.1, 0.6, 0.8, 5),
  // prepared food
  p("coffeecup", "Coffee (cup)", "prepared", 0.42, 3.1, 0.62, 0.92, 1.3, 0.3, 0.3, 0),
  p("pastry", "Pastries", "prepared", 0.75, 2.9, 0.6, 0.8, 1.6, 0.15, 0.4, 2),
  p("sandwich", "Sandwiches", "prepared", 1.65, 5.4, 0.6, 0.86, 1.2, 0.3, 0.5, 2),
  p("burger", "Burger meal", "prepared", 2.7, 9.5, 0.5, 0.83, 1.1, 0.5, 0.7, 1),
  p("dinner", "Restaurant dinner", "prepared", 7.2, 27.5, 0.78, 0.6, 0.85, 0.8, 1, 1),
  p("pizza", "Pizza", "prepared", 2.3, 11.5, 0.58, 0.78, 1.1, 0.6, 1, 1),
  // electronics
  p("phone", "Smartphone", "electronics", 285, 549, 0.82, 0.7, 0.03, 0.4, 0.8, 0),
  p("laptop", "Laptop", "electronics", 520, 949, 0.85, 0.55, 0.012, 2.1, 2.4, 0),
  p("headphones", "Headphones", "electronics", 34, 89, 0.65, 0.68, 0.09, 0.35, 0.6, 0),
  p("accessories", "Tech accessories", "electronics", 4.2, 16.5, 0.45, 0.72, 0.55, 0.2, 0.4, 0),
  // apparel
  p("tshirt", "T-shirts", "apparel", 6.2, 19.5, 0.5, 0.66, 0.45, 0.2, 0.5, 0),
  p("jeans", "Jeans", "apparel", 18, 59, 0.62, 0.6, 0.22, 0.6, 1.1, 0),
  p("jacket", "Jackets", "apparel", 42, 139, 0.72, 0.52, 0.1, 1.1, 2, 0),
  p("sneakers", "Sneakers", "apparel", 31, 99, 0.68, 0.74, 0.18, 0.9, 1.6, 0),
  // home, sports, pet, beauty
  p("furniture", "Small furniture", "home", 78, 219, 0.66, 0.46, 0.07, 14, 9, 0),
  p("decor", "Home d\xE9cor", "home", 8.5, 27, 0.55, 0.58, 0.5, 1.2, 1.8, 0),
  p("fitness", "Fitness gear", "sports", 21, 65, 0.6, 0.6, 0.28, 2.4, 2.6, 0),
  p("bicycle", "Bicycles", "sports", 210, 549, 0.7, 0.5, 0.035, 13, 12, 0),
  p("petfood", "Pet food", "pet", 3.6, 9.8, 0.55, 0.62, 1.1, 3.2, 2.2, 120),
  p("petsupplies", "Pet supplies", "pet", 5.4, 17.5, 0.55, 0.55, 0.4, 0.8, 1.4, 0),
  p("cosmetics", "Cosmetics", "beauty", 7.8, 28.5, 0.68, 0.7, 0.5, 0.2, 0.4, 365),
  p("haircare", "Hair care", "beauty", 4.1, 14.2, 0.6, 0.6, 0.45, 0.5, 0.7, 365)
];
var byId3 = new Map(PRODUCTS.map((product2) => [product2.id, product2]));
function product(id) {
  return byId3.get(id);
}
var CATEGORY_LABELS = {
  groceries: "Groceries",
  beverages: "Beverages",
  prepared: "Prepared food",
  electronics: "Electronics",
  apparel: "Apparel",
  home: "Home",
  sports: "Sports",
  pet: "Pet",
  beauty: "Beauty"
};

// src/data/events.ts
var CITY_EVENTS = [
  {
    id: "festival",
    name: "Street festival",
    description: "A weekend festival floods the area with visitors.",
    districts: ["downtown", "entertainment", "tourist", "waterfront"],
    demand: 1.45,
    supplyCost: 1,
    rent: 1,
    durationDays: [2, 4],
    weight: 12
  },
  {
    id: "roadworks",
    name: "Road closure",
    description: "Major roadworks make the district hard to reach.",
    districts: [],
    demand: 0.72,
    supplyCost: 1.04,
    rent: 1,
    durationDays: [5, 14],
    weight: 12
  },
  {
    id: "tourist-boom",
    name: "Tourist season",
    description: "Visitor numbers are well above normal across the city.",
    districts: ["tourist", "waterfront", "airport", "downtown"],
    demand: 1.28,
    supplyCost: 1,
    rent: 1,
    durationDays: [10, 21],
    weight: 9
  },
  {
    id: "recession",
    name: "Economic downturn",
    description: "Consumer confidence drops and people spend less.",
    districts: [],
    demand: 0.78,
    supplyCost: 0.96,
    rent: 0.98,
    durationDays: [20, 45],
    weight: 5
  },
  {
    id: "boom",
    name: "Economic boom",
    description: "Wages are up and the city is spending freely.",
    districts: [],
    demand: 1.22,
    supplyCost: 1.05,
    rent: 1.04,
    durationDays: [20, 45],
    weight: 5
  },
  {
    id: "supply-shortage",
    name: "Supplier shortage",
    description: "Wholesale prices spike after a supply disruption.",
    districts: [],
    demand: 1,
    supplyCost: 1.32,
    rent: 1,
    durationDays: [6, 16],
    weight: 10
  },
  {
    id: "mall-opening",
    name: "New shopping centre",
    description: "A new centre opens and pulls shoppers away from nearby streets.",
    districts: ["shopping", "downtown", "midtown"],
    demand: 0.82,
    supplyCost: 1,
    rent: 1.06,
    durationDays: [25, 50],
    weight: 6
  },
  {
    id: "rent-hike",
    name: "Rent increase",
    description: "Landlords push commercial rents up across the district.",
    districts: [],
    demand: 1,
    supplyCost: 1,
    rent: 1.14,
    durationDays: [30, 60],
    weight: 7
  },
  {
    id: "labour-shortage",
    name: "Labour shortage",
    description: "Applicants are scarce and everyone is asking for more money.",
    districts: [],
    demand: 1,
    supplyCost: 1,
    rent: 1,
    durationDays: [14, 30],
    weight: 7
  },
  {
    id: "construction",
    name: "Construction works",
    description: "Scaffolding and noise put customers off visiting.",
    districts: [],
    demand: 0.84,
    supplyCost: 1,
    rent: 0.96,
    durationDays: [8, 20],
    weight: 9
  },
  {
    id: "heatwave",
    name: "Heatwave",
    description: "Cold drinks fly out; anything requiring effort does not.",
    districts: [],
    demand: 1.06,
    supplyCost: 1.02,
    rent: 1,
    durationDays: [3, 8],
    weight: 8
  }
];
var byId4 = new Map(CITY_EVENTS.map((event) => [event.id, event]));
function cityEvent(id) {
  return byId4.get(id);
}
var TOTAL_EVENT_WEIGHT = CITY_EVENTS.reduce((total2, event) => total2 + event.weight, 0);

// src/sim/format.ts
var int = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
var dec = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function money(value) {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe < 0 ? "-" : ""}\u20AC${int.format(Math.abs(Math.round(safe)))}`;
}
function moneyCents(value) {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe < 0 ? "-" : ""}\u20AC${dec.format(Math.abs(safe))}`;
}
function moneySigned(value) {
  const safe = Number.isFinite(value) ? value : 0;
  if (Math.round(safe) === 0) return "\u20AC0";
  return `${safe > 0 ? "+" : "-"}\u20AC${int.format(Math.abs(Math.round(safe)))}`;
}
function moneyShort(value) {
  const safe = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(safe);
  const sign = safe < 0 ? "-" : "";
  if (abs >= 1e6) return `${sign}\u20AC${(abs / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M`;
  if (abs >= 1e4) return `${sign}\u20AC${int.format(Math.round(abs / 1e3))}k`;
  return money(safe);
}
function count(value) {
  return int.format(Number.isFinite(value) ? Math.round(value) : 0);
}
function pct(value, digits = 0) {
  return `${(Number.isFinite(value) ? value : 0).toFixed(digits)}%`;
}
var MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
var WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
var DAYS_PER_MONTH = 30;
var MONTHS_PER_YEAR = 12;
function calendar(day) {
  const index = Math.max(0, Math.floor(day) - 1);
  const dayOfMonth = index % DAYS_PER_MONTH + 1;
  const monthIndex2 = Math.floor(index / DAYS_PER_MONTH) % MONTHS_PER_YEAR;
  const year = 2026 + Math.floor(index / (DAYS_PER_MONTH * MONTHS_PER_YEAR));
  const weekday = WEEKDAYS[index % 7];
  return {
    dayOfMonth,
    month: monthIndex2 + 1,
    year,
    monthName: MONTHS[monthIndex2],
    weekday,
    label: `${weekday} ${dayOfMonth} ${MONTHS[monthIndex2]} ${year}`
  };
}
function clockLabel(hour) {
  const h2 = (Math.floor(hour) % 24 + 24) % 24;
  return `${String(h2).padStart(2, "0")}:00`;
}
function hoursLabel(hours) {
  const total2 = Math.max(0, Math.round(hours));
  if (total2 < 24) return `${total2}h`;
  const days = Math.floor(total2 / 24);
  const rest = total2 % 24;
  return rest ? `${days}d ${rest}h` : `${days}d`;
}

// src/data/roles.ts
var ROLES = [
  { id: "cashier", name: "Cashier", baseSalary: 2050, description: "Handles the queue. Directly limits how many customers you can serve." },
  { id: "sales", name: "Sales Employee", baseSalary: 2250, description: "Converts browsers into buyers and lifts the average basket." },
  { id: "manager", name: "Store Manager", baseSalary: 3600, description: "Lifts everyone else and keeps service quality from sliding." },
  { id: "warehouse", name: "Warehouse Worker", baseSalary: 2200, description: "Keeps the shelves filled from the back room." },
  { id: "driver", name: "Delivery Driver", baseSalary: 2400, description: "Required for logistics work and own-fleet deliveries." },
  { id: "cook", name: "Cook", baseSalary: 2650, description: "Sets both the throughput and the food quality of a kitchen." },
  { id: "server", name: "Server", baseSalary: 2e3, description: "Front of house. Drives service quality and review scores." },
  { id: "technician", name: "Technician", baseSalary: 3100, description: "Skilled work: repairs, installations, treatments." },
  { id: "cleaner", name: "Cleaner", baseSalary: 1850, description: "Cleanliness feeds directly into reviews." },
  { id: "accountant", name: "Accountant", baseSalary: 3300, description: "Trims overheads and reduces the tax bill." },
  { id: "marketer", name: "Marketing Employee", baseSalary: 2950, description: "Makes every euro of marketing spend go further." },
  // Central functions. They can be hired into a shop, but they only do what
  // they are for from a head office, where they serve every business at once.
  { id: "hr", name: "HR Officer", baseSalary: 3150, description: "Finds people, keeps people, and notices before they go." },
  { id: "it", name: "IT Specialist", baseSalary: 3850, description: "Systems that do the routine work nobody should be doing by hand." },
  { id: "legal", name: "Legal Counsel", baseSalary: 4250, description: "Reads the contract before it is signed rather than after." }
];
var byId5 = new Map(ROLES.map((role2) => [role2.id, role2]));
function role(id) {
  const found = byId5.get(id);
  if (!found) throw new Error(`Unknown role: ${id}`);
  return found;
}
var TRAITS = [
  { id: "hardworker", name: "Hard worker", effect: "+15% productivity, burns out sooner", productivity: 1.15, reliability: 1.04, moraleDrift: 0, learning: 1, salaryExpectation: 1.02, service: 1, stress: 1.15, teamMorale: 0, supervision: 0.9, management: 1, turnover: 1 },
  { id: "lazy", name: "Lazy", effect: "\u221218% productivity, needs watching", productivity: 0.82, reliability: 0.94, moraleDrift: 0.4, learning: 0.8, salaryExpectation: 0.94, service: 0.94, stress: 0.8, teamMorale: -0.04, supervision: 1.45, management: 0.8, turnover: 1 },
  { id: "ambitious", name: "Ambitious", effect: "Learns fast, expects raises, leaves if ignored", productivity: 1.07, reliability: 1, moraleDrift: -0.6, learning: 1.3, salaryExpectation: 1.14, service: 1, stress: 1.05, teamMorale: 0, supervision: 0.85, management: 1.1, turnover: 1.3 },
  { id: "loyal", name: "Loyal", effect: "Rarely resigns", productivity: 1, reliability: 1.06, moraleDrift: 0.5, learning: 1, salaryExpectation: 0.95, service: 1.02, stress: 0.95, teamMorale: 0.02, supervision: 0.9, management: 1, turnover: 0.35 },
  { id: "unreliable", name: "Unreliable", effect: "Often absent, and a handful to manage", productivity: 0.95, reliability: 0.74, moraleDrift: -0.2, learning: 0.95, salaryExpectation: 0.9, service: 0.92, stress: 1, teamMorale: -0.03, supervision: 1.5, management: 0.75, turnover: 1.4 },
  { id: "fastlearner", name: "Fast learner", effect: "Training pays off twice as fast", productivity: 1, reliability: 1, moraleDrift: 0, learning: 1.9, salaryExpectation: 1.05, service: 1, stress: 1, teamMorale: 0, supervision: 0.95, management: 1.05, turnover: 1.1 },
  { id: "perfectionist", name: "Perfectionist", effect: "+ service quality, \u2212 speed, takes it hard", productivity: 0.92, reliability: 1.05, moraleDrift: -0.3, learning: 1.1, salaryExpectation: 1.06, service: 1.2, stress: 1.3, teamMorale: -0.02, supervision: 1.1, management: 0.95, turnover: 1 },
  { id: "teamplayer", name: "Team player", effect: "Lifts colleagues\u2019 morale every day", productivity: 1.02, reliability: 1.02, moraleDrift: 0.3, learning: 1, salaryExpectation: 1, service: 1.05, stress: 0.95, teamMorale: 0.09, supervision: 0.85, management: 1.15, turnover: 0.85 },
  { id: "difficult", name: "Difficult", effect: "Drags colleagues\u2019 morale down daily", productivity: 1.03, reliability: 0.98, moraleDrift: -0.5, learning: 1, salaryExpectation: 1.03, service: 0.9, stress: 1.1, teamMorale: -0.12, supervision: 1.6, management: 0.7, turnover: 1.2 },
  { id: "friendly", name: "Customer-friendly", effect: "+ service quality", productivity: 1.01, reliability: 1.01, moraleDrift: 0.2, learning: 1, salaryExpectation: 1.04, service: 1.18, stress: 0.95, teamMorale: 0.03, supervision: 0.95, management: 1.05, turnover: 0.95 },
  { id: "independent", name: "Independent", effect: "Needs almost no supervision, gives the team little", productivity: 1.04, reliability: 1.02, moraleDrift: 0.1, learning: 1, salaryExpectation: 1.03, service: 0.97, stress: 0.9, teamMorale: -0.01, supervision: 0.45, management: 0.9, turnover: 1.1 },
  { id: "stressresistant", name: "Stress resistant", effect: "Long hours barely touch them", productivity: 1.02, reliability: 1.05, moraleDrift: 0.2, learning: 1, salaryExpectation: 1.04, service: 1.02, stress: 0.5, teamMorale: 0.02, supervision: 0.85, management: 1.1, turnover: 0.8 },
  { id: "creative", name: "Creative", effect: "Finds a way, and customers notice", productivity: 1.03, reliability: 0.97, moraleDrift: -0.1, learning: 1.15, salaryExpectation: 1.07, service: 1.12, stress: 1.05, teamMorale: 0.03, supervision: 1.05, management: 1, turnover: 1.15 }
];
var traitById = new Map(TRAITS.map((trait2) => [trait2.id, trait2]));
function trait(id) {
  const found = traitById.get(id);
  if (!found) throw new Error(`Unknown trait: ${id}`);
  return found;
}
var FIRST_NAMES = [
  "Aisha",
  "Mateo",
  "Nora",
  "Elias",
  "Priya",
  "Tomas",
  "Lena",
  "Youssef",
  "Sofia",
  "Kenji",
  "Marta",
  "Dmitri",
  "Chloe",
  "Andre",
  "Ingrid",
  "Hassan",
  "Lucia",
  "Bram",
  "Zoe",
  "Otto",
  "Amara",
  "Felix",
  "Rina",
  "Viktor",
  "Talia",
  "Jonas",
  "Mei",
  "Rafael",
  "Sanne",
  "Idris",
  "Clara",
  "Nikolai",
  "Yara",
  "Pieter",
  "Esme",
  "Omar",
  "Freya",
  "Diego",
  "Hana",
  "Lars"
];
var LAST_NAMES = [
  "Okafor",
  "Lindqvist",
  "Moreau",
  "Hartmann",
  "Silva",
  "Novak",
  "Bergman",
  "Halim",
  "Costa",
  "Tanaka",
  "Kovac",
  "Duarte",
  "Ferreira",
  "Ivanov",
  "Nakamura",
  "Brandt",
  "Rossi",
  "Vos",
  "Adeyemi",
  "Larsen",
  "Mendez",
  "Weiss",
  "Petrov",
  "Dubois",
  "Haddad",
  "Sorensen",
  "Marino",
  "Pereira",
  "Farkas",
  "Nowak",
  "Reyes",
  "Aalto",
  "Bianchi",
  "Steiner",
  "Okonkwo",
  "Vidal"
];

// src/sim/news.ts
var NEWS_LIMIT = 90;
var NEWS_LABELS = {
  economy: "Economy",
  competitor: "Competition",
  company: "Your company",
  staff: "Staff",
  market: "Market",
  supplier: "Suppliers",
  property: "Property"
};
var NEWS_ICONS = {
  economy: "\u{1F4C8}",
  competitor: "\u2694",
  company: "\u{1F3E2}",
  staff: "\u{1F465}",
  market: "\u{1F6D2}",
  supplier: "\u{1F69A}",
  property: "\u{1F3D9}"
};
function pushNews(state, category, headline, body, options = {}) {
  const item = {
    id: makeId("news"),
    day: state.day,
    hour: state.hour,
    category,
    headline,
    body,
    businessId: options.businessId ?? null,
    importance: options.importance ?? "normal"
  };
  state.news.unshift(item);
  if (state.news.length > NEWS_LIMIT) state.news.length = NEWS_LIMIT;
  return item;
}
function recentNews(state, limit = 20, category) {
  const filtered = category ? state.news.filter((item) => item.category === category) : state.news;
  return [...filtered].sort((a, b) => {
    const aHot = a.importance === "high" && state.day - a.day <= 1 ? 1 : 0;
    const bHot = b.importance === "high" && state.day - b.day <= 1 ? 1 : 0;
    if (aHot !== bHot) return bHot - aHot;
    return b.day * 24 + b.hour - (a.day * 24 + a.hour);
  }).slice(0, limit);
}

// src/data/founders.ts
var FOUNDER_SKILLS = [
  {
    id: "management",
    name: "Management",
    detail: "Holding more than one thing in your head at once.",
    says: "You can keep an eye on more locations before any of them starts drifting"
  },
  {
    id: "finance",
    name: "Finance",
    detail: "Reading a balance sheet, and knowing what a bank will say before you ask.",
    says: "Lenders quote you a better rate and lend you more against the same assets"
  },
  {
    id: "sales",
    name: "Sales",
    detail: "Knowing why people buy, and what makes them come back.",
    says: "Every euro of marketing spend buys more awareness"
  },
  {
    id: "operations",
    name: "Operations",
    detail: "Making the same work take less doing.",
    says: "Coordination costs less at every location you run"
  },
  {
    id: "strategy",
    name: "Strategy",
    detail: "Seeing the move after this one.",
    says: "Research finishes sooner"
  },
  {
    id: "leadership",
    name: "Leadership",
    detail: "People work harder for some owners than others.",
    says: "Everybody on the payroll settles at a higher morale"
  },
  {
    id: "negotiation",
    name: "Negotiation",
    detail: "Asking for a better price without souring the room.",
    says: "Suppliers charge you less and sellers accept less for their business"
  }
];
var FOUNDER_SKILL_IDS = FOUNDER_SKILLS.map((s) => s.id);
function founderSkill(id) {
  const found = FOUNDER_SKILLS.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown founder skill: ${id}`);
  return found;
}
var FOUNDER_BASE = 30;
var FOUNDER_TRAITS = [
  {
    id: "financier",
    name: "Financial expert",
    detail: "Fifteen years on the other side of the lending desk.",
    plays: "Money is cheap and plentiful. Running the place is the part you have to learn.",
    skills: { finance: 72, strategy: 46, negotiation: 44, operations: 20, sales: 18 }
  },
  {
    id: "seller",
    name: "Sales expert",
    detail: "You have sold everything from windows to advertising, and enjoyed it.",
    plays: "Customers come. Keeping the books straight and the team steady is where it gets hard.",
    skills: { sales: 72, negotiation: 52, leadership: 40, finance: 18, operations: 22 }
  },
  {
    id: "operator",
    name: "Operations expert",
    detail: "You ran somebody else\u2019s floor for a decade and knew where every minute went.",
    plays: "The place runs beautifully and cheaply. Getting anybody through the door is the problem.",
    skills: { operations: 72, management: 50, leadership: 44, sales: 18, finance: 22 }
  },
  {
    id: "strategist",
    name: "Strategist",
    detail: "Consulting. You are very good at knowing what a business should do.",
    plays: "You see further than anybody. Doing it is a different skill from seeing it.",
    skills: { strategy: 72, management: 52, finance: 44, operations: 22, leadership: 22 }
  },
  {
    id: "shopfloor",
    name: "Up from the floor",
    detail: "You did the job itself for years, and everybody knows it.",
    plays: "Your people would follow you anywhere. The bank has never heard of you.",
    skills: { leadership: 70, operations: 52, management: 42, finance: 16, strategy: 22 }
  },
  {
    id: "allrounder",
    name: "All-rounder",
    detail: "A bit of everything, nothing in particular.",
    plays: "No advantage anywhere, and no hole anywhere either.",
    skills: { management: 42, finance: 42, sales: 42, operations: 42, strategy: 42, leadership: 42, negotiation: 42 }
  }
];
function founderTrait(id) {
  return FOUNDER_TRAITS.find((t) => t.id === id) ?? FOUNDER_TRAITS[FOUNDER_TRAITS.length - 1];
}
function startingSkills(traitId) {
  const trait2 = founderTrait(traitId);
  const skills = {};
  for (const id of FOUNDER_SKILL_IDS) skills[id] = trait2.skills[id] ?? FOUNDER_BASE;
  return skills;
}

// src/sim/founder.ts
function emptyFounder(name, traitId, scenarioId) {
  const skills = startingSkills(traitId);
  const progress = {};
  for (const id of FOUNDER_SKILL_IDS) progress[id] = 0;
  return { name: name.trim().slice(0, 40) || "You", traitId, skills, progress, scenarioId };
}
function skillOf(state, id) {
  return clamp(state.founder?.skills[id] ?? 0, 0, 100);
}
function factor(state, id, spread) {
  return 1 + (skillOf(state, id) - 50) / 50 * spread;
}
function attentionSpan(state) {
  return 4 * factor(state, "management", 0.5);
}
function rateDiscount(state) {
  return (skillOf(state, "finance") - 50) / 50 * 0.018;
}
function lendingFactor(state) {
  return factor(state, "finance", 0.3);
}
function marketingSkillFactor(state) {
  return factor(state, "sales", 0.3);
}
function operationsFactor(state) {
  return factor(state, "operations", -0.3);
}
function researchSpeed(state) {
  return factor(state, "strategy", 0.3);
}
function moraleFromOwner(state) {
  return (skillOf(state, "leadership") - 50) / 50 * 9;
}
function negotiationFactor(state) {
  return factor(state, "negotiation", -0.12);
}
var LEARNS = {
  hired: { skill: "management", amount: 0.5 },
  promoted: { skill: "management", amount: 0.8 },
  letGo: { skill: "management", amount: 0.4 },
  delegated: { skill: "management", amount: 2.5 },
  merged: { skill: "management", amount: 9 },
  borrowed: { skill: "finance", amount: 1.2 },
  repaid: { skill: "finance", amount: 1.6 },
  closedMonth: { skill: "finance", amount: 0.35 },
  marketed: { skill: "sales", amount: 0.25 },
  soldTo: { skill: "sales", amount: 0.04 },
  traded: { skill: "operations", amount: 0.22 },
  opened: { skill: "operations", amount: 1.4 },
  researched: { skill: "strategy", amount: 3 },
  levelled: { skill: "strategy", amount: 2.2 },
  ordered: { skill: "negotiation", amount: 0.2 },
  acquired: { skill: "negotiation", amount: 4 },
  signed: { skill: "negotiation", amount: 1.1 },
  keptTeamHappy: { skill: "leadership", amount: 0.3 },
  trained: { skill: "leadership", amount: 0.6 }
};
function learn(state, event, times = 1) {
  const founder = state.founder;
  if (!founder) return;
  const entry = LEARNS[event];
  if (!entry) return;
  const level = founder.skills[entry.skill] ?? 0;
  const resistance = 1 + Math.pow(clamp(level, 0, 100) / 100, 2) * 4;
  founder.progress[entry.skill] += entry.amount * times / resistance;
  while (founder.progress[entry.skill] >= 1 && founder.skills[entry.skill] < 100) {
    founder.progress[entry.skill] -= 1;
    founder.skills[entry.skill] = clamp(founder.skills[entry.skill] + 1, 0, 100);
    announce(state, entry.skill);
  }
  if (founder.skills[entry.skill] >= 100) founder.progress[entry.skill] = 0;
}
function announce(state, id) {
  const founder = state.founder;
  if (!founder) return;
  const level = founder.skills[id];
  if (level !== 50 && level !== 70 && level !== 85 && level !== 100) return;
  const def = founderSkill(id);
  pushNews(
    state,
    "company",
    `${founder.name} is getting good at ${def.name.toLowerCase()}`,
    `${level}/100. ${def.says}.`,
    { importance: level >= 85 ? "high" : "normal" }
  );
}

// src/sim/alerts.ts
function pushAlert(state, priority, title, detail, businessId = null, view) {
  const existing = state.alerts.find(
    (alert2) => alert2.title === title && alert2.businessId === businessId && alert2.day === state.day
  );
  if (existing) {
    existing.detail = detail;
    existing.hour = state.hour;
    existing.read = false;
    if (view) existing.view = view;
    return existing;
  }
  const alert = {
    id: makeId("alert"),
    priority,
    title,
    detail,
    day: state.day,
    hour: state.hour,
    businessId,
    read: false,
    view
  };
  state.alerts.unshift(alert);
  if (state.alerts.length > ALERT_LIMIT) state.alerts.length = ALERT_LIMIT;
  emit("alert", alert);
  return alert;
}
function unreadAlerts(state) {
  return state.alerts.filter((alert) => !alert.read);
}
function markAlertsRead(state) {
  for (const alert of state.alerts) alert.read = true;
}
var PRIORITY_ORDER = {
  critical: 0,
  warning: 1,
  info: 2,
  success: 3
};
var PRIORITY_LABELS = {
  critical: "Critical",
  warning: "Warning",
  info: "Information",
  success: "Good news"
};
function distinctAlerts(state) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const alert of sortedAlerts(state)) {
    const key2 = `${alert.title}|${alert.businessId ?? ""}`;
    if (seen.has(key2)) continue;
    seen.add(key2);
    out.push(alert);
  }
  return out;
}
function sortedAlerts(state) {
  return [...state.alerts].sort((a, b) => {
    const byPriority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (byPriority !== 0) return byPriority;
    return b.day * 24 + b.hour - (a.day * 24 + a.hour);
  });
}

// src/sim/progress.ts
var LEVELS = [
  {
    n: 1,
    name: "Starter",
    blurb: "One shop, your own money, and everything still to prove.",
    requires: { netWorth: 0, locations: 0, headcount: 0, monthlyProfit: 0 },
    unlocks: ["One trading location", "Hire staff, set prices, buy stock"]
  },
  {
    n: 2,
    name: "Local business",
    blurb: "The shop washes its own face. Now make it worth owning.",
    requires: { netWorth: 85e3, locations: 1, headcount: 1, monthlyProfit: 1500 },
    unlocks: ["A second location", "18% more borrowing against the same assets"]
  },
  {
    n: 3,
    name: "Growing company",
    blurb: "Two shops is not twice one shop. It is a different job.",
    requires: { netWorth: 22e4, locations: 2, headcount: 4, monthlyProfit: 6e3 },
    unlocks: ["Up to four locations", "Supply contracts", "36% more borrowing"]
  },
  {
    n: 4,
    name: "Regional company",
    blurb: "Big enough that the things you cannot see start costing you.",
    requires: { netWorth: 65e4, locations: 3, headcount: 9, monthlyProfit: 18e3 },
    unlocks: ["Up to seven locations", "R&D: operations, logistics and marketing", "54% more borrowing"]
  },
  {
    n: 5,
    name: "National company",
    blurb: "A name people recognise in towns you have never been to.",
    requires: { netWorth: 2e6, locations: 5, headcount: 20, monthlyProfit: 55e3 },
    unlocks: ["Up to eleven locations", "R&D: technology", "72% more borrowing"]
  },
  {
    n: 6,
    name: "Corporation",
    blurb: "The company runs whether or not you are in the room.",
    requires: { netWorth: 7e6, locations: 8, headcount: 45, monthlyProfit: 18e4 },
    unlocks: ["Up to sixteen locations", "R&D: sustainability \u2014 the full tree", "90% more borrowing"]
  },
  {
    n: 7,
    name: "Industry leader",
    blurb: "Competitors price against you, not the other way round.",
    requires: { netWorth: 25e6, locations: 12, headcount: 80, monthlyProfit: 6e5 },
    unlocks: ["Up to twenty-two locations", "Contracts sized to a company this big", "108% more borrowing"]
  },
  {
    n: 8,
    name: "Business empire",
    blurb: "There is nothing left to be promoted to. Now hold it.",
    requires: { netWorth: 1e8, locations: 16, headcount: 120, monthlyProfit: 2e6 },
    unlocks: ["No limit on locations", "Twice the borrowing a starter could raise"]
  }
];
var LOCATION_CAP = [1, 2, 4, 7, 11, 16, 22, Infinity];
function measures(state, level) {
  const open = playerBusinesses(state).filter((b) => b.status === "open").length;
  const profit = sum(state.dayHistory.slice(-30), (d) => d.profit);
  const rows = [
    {
      label: "Company value",
      now: netWorth(state),
      need: level.requires.netWorth,
      progress: 0,
      format: moneyShort
    },
    { label: "Locations trading", now: open, need: level.requires.locations, progress: 0, format: (v) => `${Math.round(v)}` },
    {
      label: "People employed",
      now: state.employees.length,
      need: level.requires.headcount,
      progress: 0,
      format: (v) => `${Math.round(v)}`
    },
    { label: "Profit, last 30 days", now: profit, need: level.requires.monthlyProfit, progress: 0, format: moneyShort }
  ];
  for (const row2 of rows) row2.progress = row2.need <= 0 ? 1 : clamp(row2.now / row2.need, 0, 1);
  return rows.filter((row2) => row2.need > 0);
}
function levelOf(state) {
  let best = LEVELS[0];
  for (const level of LEVELS) {
    if (measures(state, level).every((row2) => row2.now >= row2.need)) best = level;
    else break;
  }
  return best;
}
function nextLevel(state) {
  const now = levelOf(state);
  return LEVELS.find((level) => level.n === now.n + 1) ?? null;
}
function levelProgress(state) {
  const next = nextLevel(state);
  if (!next) return 1;
  const rows = measures(state, next);
  if (rows.length === 0) return 1;
  return sum(rows, (row2) => row2.progress) / rows.length;
}
function bindingMeasure(state) {
  const next = nextLevel(state);
  if (!next) return null;
  const rows = measures(state, next).filter((row2) => row2.now < row2.need);
  if (rows.length === 0) return null;
  return rows.sort((a, b) => a.progress - b.progress)[0];
}
function unlockedLevel(state) {
  return Math.max(levelOf(state).n, state.levelReached ?? 1);
}
function locationCap(state) {
  return LOCATION_CAP[unlockedLevel(state) - 1] ?? 1;
}
function unlockedLevelDef(state) {
  return LEVELS[unlockedLevel(state) - 1] ?? LEVELS[0];
}
function contractsUnlocked(state) {
  return unlockedLevel(state) >= 3;
}
function researchUnlocked(state) {
  return unlockedLevel(state) >= 4;
}
function creditMultiplier(state) {
  return 1 + (unlockedLevel(state) - 1) * 0.18;
}
function researchBranches(state) {
  const n = unlockedLevel(state);
  if (n >= 6) return 5;
  if (n >= 5) return 4;
  if (n >= 4) return 3;
  return 0;
}
function checkPromotion(state) {
  const level = levelOf(state);
  if (level.n <= (state.levelReached ?? 1)) return;
  state.levelReached = level.n;
  learn(state, "levelled");
  pushNews(
    state,
    "company",
    `${playerCompany(state).name} is now a ${level.name.toLowerCase()}`,
    `${level.blurb} ${level.unlocks.join(". ")}.`,
    { importance: "high" }
  );
  pushAlert(state, "success", `Level ${level.n}: ${level.name}`, level.unlocks.join(" \xB7 "), null, "progress");
}
function nextStep(state) {
  const company = playerCompany(state);
  const mine = playerBusinesses(state);
  const open = mine.filter((b) => b.status === "open");
  const burn = dailyBurn(state);
  const level = levelOf(state);
  if (mine.length === 0) {
    const held = state.buildings.filter((b) => b.occupantCompanyId === state.playerCompanyId);
    if (held.length === 0) {
      return {
        title: "Take a lease on your first unit",
        why: `You have ${money(company.cash)} and nowhere to trade from. Rent is the cheapest way in.`,
        progress: 0,
        reward: "A place to put a business",
        view: "property"
      };
    }
    return {
      title: "Open a business in your unit",
      why: "The lease is running whether or not anything is trading in it.",
      progress: 0.5,
      reward: "Revenue instead of rent",
      view: "businesses"
    };
  }
  const shut = mine.find((b) => b.status !== "open");
  if (shut && open.length === 0) {
    const stocked = sum(Object.values(shut.stock), (units) => units) > 0;
    return {
      title: stocked ? `Open ${shut.name}` : `Stock ${shut.name} and open the doors`,
      why: stocked ? "Everything is in place. Nothing sells until the doors are open." : "An empty shop turns customers away and they do not come back soon.",
      progress: stocked ? 0.75 : 0.35,
      reward: "Your first day of trade",
      view: stocked ? "businesses" : "inventory"
    };
  }
  if (burn > 0 && company.cash / burn < 21) {
    const days = Math.max(0, Math.floor(company.cash / burn));
    return {
      title: "Fix the cash position",
      why: `At the current rate the company runs out of cash in ${days} days.`,
      progress: clamp(company.cash / (burn * 21), 0, 1),
      reward: "A company that is still here next month",
      view: "finance"
    };
  }
  const bleeding = open.filter((b) => b.totals.revenue > 0).map((b) => ({
    b,
    profit: b.yesterday.revenue - (b.yesterday.cogs + b.yesterday.wages + b.yesterday.rent + b.yesterday.marketing + b.yesterday.otherCosts)
  })).filter((row2) => row2.profit < 0).sort((a, b) => a.profit - b.profit)[0];
  if (bleeding) {
    return {
      title: `Turn ${bleeding.b.name} around`,
      why: `It lost ${money(-bleeding.profit)} yesterday. Prices, staffing or the pitch itself.`,
      progress: 0,
      reward: "One less hole in the accounts",
      view: "businesses"
    };
  }
  const binding = bindingMeasure(state);
  const next = nextLevel(state);
  if (binding && next) {
    return {
      title: bindingTitle(binding, state),
      why: `${binding.label} is ${binding.format(binding.now)} of the ${binding.format(binding.need)} a ${next.name.toLowerCase()} needs.`,
      progress: binding.progress,
      reward: next.unlocks[0],
      view: bindingView(binding)
    };
  }
  return {
    title: "Hold the empire together",
    why: `${level.name} is the top of the ladder. What is left is keeping it.`,
    progress: 1,
    reward: "Nothing but the satisfaction",
    view: "dashboard"
  };
}
function bindingTitle(measure, state) {
  switch (measure.label) {
    case "Locations trading": {
      const cap = locationCap(state);
      const open = playerBusinesses(state).filter((b) => b.status === "open").length;
      return open >= cap ? "Grow the company to unlock more locations" : "Open another location";
    }
    case "People employed":
      return "Take more people on";
    case "Profit, last 30 days":
      return "Get the monthly profit up";
    default:
      return "Build the company up";
  }
}
function bindingView(measure) {
  switch (measure.label) {
    case "Locations trading":
      return "property";
    case "People employed":
      return "employees";
    case "Profit, last 30 days":
      return "reports";
    default:
      return "dashboard";
  }
}
function dailyBurn(state) {
  const recent = state.dayHistory.slice(-14);
  if (recent.length === 0) return 0;
  const net = sum(recent, (day) => day.costs - day.revenue) / recent.length;
  return Math.max(0, net);
}

// src/sim/finance.ts
var LEDGER_LABELS = {
  sales: "Product sales",
  service: "Service revenue",
  stock: "Stock purchased",
  cogs: "Cost of goods sold",
  wages: "Wages",
  rent: "Rent",
  utilities: "Utilities",
  marketing: "Marketing",
  logistics: "Logistics",
  setup: "Fit-out",
  equipment: "Equipment",
  property: "Property",
  renovation: "Renovation",
  loan: "Loan",
  interest: "Interest",
  tax: "Tax",
  training: "Training",
  severance: "Severance",
  recruitment: "Recruitment",
  management: "Management and coordination",
  outsourcing: "Outsourced services",
  other: "Other"
};
var REVENUE_CATEGORIES = ["sales", "service"];
var OPERATING_COSTS = [
  "cogs",
  "wages",
  "rent",
  "utilities",
  "marketing",
  "logistics",
  "tax",
  "training",
  "severance",
  "recruitment",
  "management",
  "outsourcing",
  "interest"
];
function isRevenue(category) {
  return REVENUE_CATEGORIES.includes(category);
}
function isOperatingCost(category) {
  return OPERATING_COSTS.includes(category);
}
function dayTotals(state, day) {
  let revenue = 0;
  let costs = 0;
  for (const entry of state.ledger) {
    if (entry.day !== day) continue;
    if (isRevenue(entry.category)) revenue += entry.amount;
    else if (isOperatingCost(entry.category)) costs += -entry.amount;
  }
  return { revenue, costs: Math.max(0, costs) };
}
function accrue(state, category, amount, businessId) {
  const totals = state.period;
  totals.categories[category] = (totals.categories[category] ?? 0) + Math.abs(amount);
  if (!businessId) return;
  if (isRevenue(category)) {
    totals.revenueByBusiness[businessId] = (totals.revenueByBusiness[businessId] ?? 0) + amount;
  } else if (isOperatingCost(category)) {
    totals.costsByBusiness[businessId] = (totals.costsByBusiness[businessId] ?? 0) + Math.abs(amount);
  }
}
function post(state, companyId, category, label, amount, businessId = null) {
  if (!Number.isFinite(amount) || amount === 0) return;
  const company = companyById(state, companyId);
  if (!company) return;
  company.cash += amount;
  if (!company.isPlayer) return;
  if (amount > 0) state.stats.revenueTotal += amount;
  else state.stats.costsTotal += -amount;
  accrue(state, category, amount, businessId);
  const last = state.ledger[state.ledger.length - 1];
  if (last && last.day === state.day && last.hour === state.hour && last.category === category && last.label === label && last.businessId === businessId) {
    last.amount += amount;
    return;
  }
  state.ledger.push({
    day: state.day,
    hour: state.hour,
    category,
    label,
    amount,
    businessId
  });
  if (state.ledger.length > LEDGER_LIMIT) {
    state.ledger.splice(0, state.ledger.length - LEDGER_LIMIT);
  }
}
function postNonCash(state, companyId, category, label, amount, businessId = null) {
  if (!Number.isFinite(amount) || amount === 0) return;
  const company = companyById(state, companyId);
  if (!company || !company.isPlayer) return;
  accrue(state, category, amount, businessId);
  const last = state.ledger[state.ledger.length - 1];
  if (last && last.day === state.day && last.hour === state.hour && last.category === category && last.label === label && last.businessId === businessId) {
    last.amount += amount;
    return;
  }
  state.ledger.push({ day: state.day, hour: state.hour, category, label, amount, businessId });
  if (state.ledger.length > LEDGER_LIMIT) {
    state.ledger.splice(0, state.ledger.length - LEDGER_LIMIT);
  }
}
function inventoryValue(state) {
  let total2 = 0;
  for (const business of playerBusinesses(state)) {
    for (const [productId, units] of Object.entries(business.stock)) {
      const def = product(productId);
      if (def) total2 += def.wholesalePrice * units;
    }
  }
  return total2;
}
function propertyValue(state) {
  const player = playerCompany(state);
  return sum(
    state.buildings.filter((b) => b.status === "owned" && b.occupantCompanyId === player.id),
    (b) => b.value
  );
}
function debtTotal(state) {
  return sum(state.loans, (loan) => loan.outstanding);
}
function goodwillValue(state) {
  let total2 = 0;
  for (const business of playerBusinesses(state)) {
    if (business.status !== "open") continue;
    const recent = business.profitHistory.slice(-30);
    if (recent.length === 0) continue;
    const average = sum(recent, (value) => value) / recent.length;
    total2 += Math.max(0, average * 120);
  }
  return total2;
}
function netWorth(state) {
  return playerCompany(state).cash + inventoryValue(state) + propertyValue(state) + goodwillValue(state) - debtTotal(state);
}
var LOAN_TYPES = [
  {
    id: "working",
    name: "Working capital",
    detail: "A year of breathing room, to be paid back out of trade rather than growth.",
    spread: 0.052,
    termMonths: 12,
    minimumCreditRating: 30,
    security: "nothing"
  },
  {
    id: "business",
    name: "Business loan",
    detail: "The ordinary one. Four years, secured on what the company owns.",
    spread: 0.031,
    termMonths: 48,
    minimumCreditRating: 50,
    security: "assets"
  },
  {
    id: "equipment",
    name: "Equipment finance",
    detail: "Against the ovens, the lifts and the vans. Cheap, and limited to what they are worth.",
    spread: 0.024,
    termMonths: 36,
    minimumCreditRating: 45,
    security: "equipment"
  },
  {
    id: "expansion",
    name: "Expansion loan",
    detail: "Seven years at the best rate on offer, for a company with a record behind it.",
    spread: 0.019,
    termMonths: 84,
    minimumCreditRating: 70,
    security: "assets"
  },
  {
    id: "property",
    name: "Property loan",
    detail: "A mortgage on the freeholds you hold. The longest and the cheapest, because the bank can take the building.",
    spread: 9e-3,
    termMonths: 180,
    minimumCreditRating: 60,
    security: "property"
  },
  {
    id: "emergency",
    name: "Emergency credit",
    detail: "Money today, at a price. Only ever worth it against a bill you cannot miss.",
    spread: 0.145,
    termMonths: 18,
    minimumCreditRating: 0,
    security: "nothing"
  }
];
function loanType(id) {
  return LOAN_TYPES.find((t) => t.id === id) ?? LOAN_TYPES[1];
}
var LENDERS = {
  working: "Northgate Credit Union",
  business: "Meridian Business Bank",
  equipment: "Kestrel Asset Finance",
  expansion: "Halcyon Capital",
  property: "Northgate Mutual",
  emergency: "Vantage Bridging"
};
function loanOffers(state) {
  const company = playerCompany(state);
  const base2 = state.economy.interestRate;
  const headroom = borrowingHeadroom(state);
  const equipment = equipmentValue(state);
  const freeholds = propertyValue(state);
  const runway = dailyOutgoings(state) > 0 ? company.cash / dailyOutgoings(state) : 99;
  const offers = [];
  for (const type of LOAN_TYPES) {
    let ceiling = headroom;
    let blocked = null;
    if (type.security === "equipment") {
      ceiling = Math.min(headroom + equipment * 0.6, equipment * 0.6);
      if (equipment < 5e3) blocked = "You have no equipment worth securing a loan against.";
    } else if (type.security === "property") {
      ceiling = Math.min(headroom + freeholds * 0.75, freeholds * 0.75);
      if (freeholds < 2e4) blocked = "A mortgage needs a freehold. You are renting everywhere.";
    } else if (type.id === "emergency") {
      ceiling = Math.max(15e3, dailyOutgoings(state) * 45);
      if (runway > 30 && company.cash > 0) blocked = "You are not short of cash. This is not a loan to take for fun.";
    } else if (type.id === "working") {
      ceiling = Math.min(headroom + 2e4, Math.max(2e4, dailyOutgoings(state) * 60));
    }
    if (!blocked && company.creditRating < type.minimumCreditRating) {
      blocked = `${LENDERS[type.id]} wants a credit rating of ${type.minimumCreditRating}. Yours is ${Math.round(company.creditRating)}.`;
    }
    if (!blocked && ceiling < 1e3) {
      blocked = "The bank will not lend anything more against what you own.";
    }
    offers.push({
      id: type.id,
      lender: LENDERS[type.id] ?? "The bank",
      type,
      maxPrincipal: Math.max(0, Math.round(ceiling / 1e3) * 1e3),
      // A poor credit rating costs real money on top of the spread.
      // Somebody who knows what a lender is looking at is quoted better terms.
      annualRate: Math.max(
        5e-3,
        base2 + type.spread + clamp((60 - company.creditRating) / 100, 0, 0.6) * 0.06 - rateDiscount(state)
      ),
      termMonths: type.termMonths,
      minimumCreditRating: type.minimumCreditRating,
      blocked
    });
  }
  return offers;
}
function dailyOutgoings(state) {
  const recent = state.dayHistory.slice(-14);
  if (recent.length === 0) return 0;
  return Math.max(0, sum(recent, (day) => day.costs) / recent.length);
}
function equipmentValue(state) {
  return sum(
    state.businesses.filter((b) => b.companyId === state.playerCompanyId && b.status !== "closed"),
    (business) => {
      const type = businessTypeOrThrow(business.typeId);
      const age = Math.max(0, state.day - business.openedOnDay);
      return type.equipmentCost * clamp(1 - age / 1800, 0.3, 1);
    }
  );
}
function monthlyPayment(principal, annualRate, months) {
  const monthly = annualRate / 12;
  if (monthly <= 0) return principal / months;
  const factor2 = Math.pow(1 + monthly, months);
  return principal * monthly * factor2 / (factor2 - 1);
}
function monthsRemaining(outstanding, annualRate, payment) {
  if (outstanding <= 0) return 0;
  const monthly = annualRate / 12;
  if (monthly <= 0) return Math.ceil(outstanding / Math.max(1, payment));
  if (payment <= outstanding * monthly) return Infinity;
  return Math.ceil(-Math.log(1 - monthly * outstanding / payment) / Math.log(1 + monthly));
}
function interestRemaining(outstanding, annualRate, payment) {
  const months = monthsRemaining(outstanding, annualRate, payment);
  if (!Number.isFinite(months)) return Infinity;
  return Math.max(0, months * payment - outstanding);
}
function quoteRepayment(state, loanId, amount) {
  const loan = state.loans.find((l) => l.id === loanId);
  if (!loan) return null;
  const company = playerCompany(state);
  const wanted = Math.min(Math.max(0, Math.round(amount)), loan.outstanding);
  const monthsBefore = monthsRemaining(loan.outstanding, loan.annualRate, loan.monthlyPayment);
  const interestBefore = interestRemaining(loan.outstanding, loan.annualRate, loan.monthlyPayment);
  const after = Math.max(0, loan.outstanding - wanted);
  const monthsAfter = monthsRemaining(after, loan.annualRate, loan.monthlyPayment);
  const interestAfter = interestRemaining(after, loan.annualRate, loan.monthlyPayment);
  let blocked = null;
  if (wanted <= 0) blocked = "Name an amount first.";
  else if (company.cash < wanted) {
    blocked = `That is ${money(wanted - company.cash)} more than you have in the bank.`;
  }
  return {
    amount: wanted,
    outstandingAfter: after,
    monthsBefore,
    monthsAfter,
    interestBefore,
    interestAfter,
    interestSaved: Number.isFinite(interestBefore) && Number.isFinite(interestAfter) ? interestBefore - interestAfter : 0,
    blocked
  };
}
function borrowingHeadroom(state) {
  const company = playerCompany(state);
  const secured = propertyValue(state) * 0.7 + goodwillValue(state) * 0.4;
  const rating = clamp(company.creditRating / 100, 0.1, 1);
  const standing = creditMultiplier(state);
  return Math.max(0, (secured + 25e3 * rating) * (0.6 + rating) * standing * lendingFactor(state) - debtTotal(state));
}
function takeLoan(state, offerId, principal) {
  const offer = loanOffers(state).find((o) => o.id === offerId);
  if (!offer) return { ok: false, message: "Unknown loan offer." };
  const company = playerCompany(state);
  if (offer.blocked) return { ok: false, message: offer.blocked };
  if (principal > offer.maxPrincipal) {
    return {
      ok: false,
      message: `${offer.lender} will lend up to ${money(offer.maxPrincipal)} on this. Ask for less.`
    };
  }
  const amount = Math.round(clamp(principal, 1e3, offer.maxPrincipal));
  const loan = {
    id: makeId("loan"),
    lender: offer.lender,
    typeId: offer.type.id,
    principal: amount,
    outstanding: amount,
    annualRate: offer.annualRate,
    termMonths: offer.termMonths,
    monthlyPayment: Math.round(monthlyPayment(amount, offer.annualRate, offer.termMonths)),
    takenOnDay: state.day,
    missedPayments: 0,
    interestPaid: 0,
    earlyRepaid: 0
  };
  state.loans.push(loan);
  learn(state, "borrowed");
  post(state, company.id, "loan", `${offer.lender} loan`, amount);
  return { ok: true, message: `${offer.lender} approved \u20AC${amount.toLocaleString("en-GB")}.` };
}
function repayLoan(state, loanId, amount) {
  const loan = state.loans.find((l) => l.id === loanId);
  if (!loan) return { ok: false, message: "Loan not found." };
  const quote = quoteRepayment(state, loanId, amount);
  if (!quote) return { ok: false, message: "Loan not found." };
  if (quote.blocked) return { ok: false, message: quote.blocked };
  const company = playerCompany(state);
  loan.outstanding = quote.outstandingAfter;
  loan.earlyRepaid += quote.amount;
  learn(state, "repaid");
  post(state, company.id, "loan", `Early repayment \u2014 ${loan.lender}`, -quote.amount);
  if (loan.outstanding < 1) {
    state.loans = state.loans.filter((l) => l.id !== loan.id);
    company.creditRating = clamp(company.creditRating + 4, 0, 100);
    return {
      ok: true,
      message: `${loan.lender} is cleared. ${quote.interestSaved > 1 ? `That saved ${money(quote.interestSaved)} in interest you will now never pay. ` : ""}Credit rating improved.`
    };
  }
  const months = Math.max(0, Math.round(quote.monthsBefore - quote.monthsAfter));
  return {
    ok: true,
    message: `Repaid ${money(quote.amount)}.${months > 0 ? ` ${months} month${months === 1 ? "" : "s"} off the term` : ""}${quote.interestSaved > 1 ? `, ${money(quote.interestSaved)} of interest saved.` : "."}`
  };
}
function settleLoansMonthly(state) {
  const company = playerCompany(state);
  let paid = 0;
  let missed = 0;
  for (const loan of [...state.loans]) {
    const interest = loan.outstanding * (loan.annualRate / 12);
    const payment = Math.min(loan.monthlyPayment, loan.outstanding + interest);
    if (company.cash >= payment) {
      post(state, company.id, "interest", `Interest \u2014 ${loan.lender}`, -interest);
      loan.interestPaid += interest;
      post(state, company.id, "loan", `Repayment \u2014 ${loan.lender}`, -(payment - interest));
      loan.outstanding = Math.max(0, loan.outstanding - (payment - interest));
      paid += payment;
      company.creditRating = clamp(company.creditRating + 0.4, 0, 100);
    } else {
      loan.missedPayments += 1;
      loan.outstanding += interest + payment * 0.05;
      missed += 1;
      company.creditRating = clamp(company.creditRating - 9, 0, 100);
    }
    if (loan.outstanding < 1) state.loans = state.loans.filter((l) => l.id !== loan.id);
  }
  return { paid, missed };
}
var TAX_RATE = 0.19;
function monthlyProfit(state, days) {
  const from = state.day - days;
  let revenue = 0;
  let costs = 0;
  for (const record of state.dayHistory) {
    if (record.day <= from) continue;
    revenue += record.revenue;
    costs += record.costs;
  }
  return { revenue, costs, profit: revenue - costs };
}
function chargeTax(state) {
  const { profit } = monthlyProfit(state, 30);
  if (profit <= 0) return 0;
  const tax = profit * TAX_RATE * taxFactor(state);
  post(state, state.playerCompanyId, "tax", "Corporation tax", -tax);
  return tax;
}
function updateCreditRating(state) {
  const company = playerCompany(state);
  const recent = state.dayHistory.slice(-14);
  const profit = sum(recent, (r) => r.profit);
  const target = profit > 0 ? 78 : company.cash > 0 ? 52 : 22;
  const drift = (target - company.creditRating) * 0.05 + gameRng.range(-0.4, 0.4);
  company.creditRating = clamp(company.creditRating + drift, 0, 100);
}

// src/sim/skills.ts
var SKILLS = [
  { id: "technical", name: "Technical", detail: "Doing the actual work: repairs, cooking, installation, making things." },
  { id: "sales", name: "Sales", detail: "Turning somebody who is looking into somebody who is buying." },
  { id: "service", name: "Service", detail: "How the customer feels about having been in." },
  { id: "logistics", name: "Logistics", detail: "Stock, deliveries, and where everything is." },
  { id: "admin", name: "Administration", detail: "Paperwork, ordering, rotas and keeping the place legal." },
  { id: "finance", name: "Finance", detail: "The books, the tax, and knowing what a number means." },
  { id: "communication", name: "Communication", detail: "Being understood \u2014 by customers, by colleagues, on paper." },
  { id: "leadership", name: "Leadership", detail: "Getting more out of everybody else than they would give on their own." }
];
var SKILL_IDS = SKILLS.map((s) => s.id);
var ROLE_SKILLS = {
  cashier: { service: 0.42, sales: 0.26, admin: 0.18, communication: 0.14 },
  sales: { sales: 0.5, communication: 0.24, service: 0.18, admin: 0.08 },
  server: { service: 0.48, communication: 0.28, sales: 0.14, logistics: 0.1 },
  cook: { technical: 0.54, logistics: 0.24, service: 0.14, communication: 0.08 },
  technician: { technical: 0.7, service: 0.12, admin: 0.1, communication: 0.08 },
  cleaner: { service: 0.44, technical: 0.34, logistics: 0.22 },
  warehouse: { logistics: 0.7, technical: 0.16, admin: 0.14 },
  driver: { logistics: 0.74, communication: 0.14, service: 0.12 },
  marketer: { communication: 0.38, sales: 0.36, admin: 0.14, service: 0.12 },
  // The three desk jobs that used to be the same job. An accountant lives in
  // the numbers, a solicitor in the wording, a personnel officer in the people.
  accountant: { finance: 0.62, admin: 0.26, technical: 0.06, leadership: 0.06 },
  legal: { admin: 0.5, communication: 0.2, finance: 0.16, leadership: 0.14 },
  hr: { communication: 0.38, leadership: 0.3, admin: 0.22, service: 0.1 },
  manager: { leadership: 0.44, communication: 0.24, admin: 0.16, service: 0.16 },
  it: { technical: 0.62, admin: 0.2, logistics: 0.1, communication: 0.08 }
};
function emptySkills() {
  return {
    technical: 0,
    sales: 0,
    service: 0,
    logistics: 0,
    admin: 0,
    finance: 0,
    communication: 0,
    leadership: 0
  };
}
function overallSkill(skills) {
  let total2 = 0;
  for (const id of SKILL_IDS) total2 += skills[id] ?? 0;
  return total2 / SKILL_IDS.length;
}
function syncOverall(employee) {
  employee.skill = clamp(overallSkill(employee.skills), 0, 100);
}
function roleFit(skills, roleId) {
  const weights = ROLE_SKILLS[roleId];
  let total2 = 0;
  let weight = 0;
  for (const [id, w] of Object.entries(weights)) {
    total2 += (skills[id] ?? 0) * w;
    weight += w;
  }
  return weight > 0 ? total2 / weight : 0;
}
function fitFactor(fit) {
  return clamp(0.62 + fit / 100 * 0.62, 0.62, 1.24);
}
var GRADES = [
  { n: 0, name: "Junior", leadership: 0, skill: 0, pay: 1, span: 0, managerial: false, detail: "Learning the job on somebody else\u2019s time." },
  { n: 1, name: "Employee", leadership: 0, skill: 38, pay: 1.16, span: 0, managerial: false, detail: "Does the job without being watched." },
  { n: 2, name: "Senior", leadership: 0, skill: 55, pay: 1.36, span: 0, managerial: false, detail: "The one the others ask." },
  { n: 3, name: "Specialist", leadership: 0, skill: 68, pay: 1.58, span: 0, managerial: false, detail: "As good at the trade as anybody gets, and paid like it. The top of this track, and a perfectly good place to stop." },
  { n: 4, name: "Team Lead", leadership: 45, skill: 68, pay: 1.78, span: 5, managerial: false, detail: "Still on the floor, and now answerable for a handful of people." },
  { n: 5, name: "Manager", leadership: 60, skill: 72, pay: 2.15, span: 11, managerial: true, detail: "Runs the place. A different job from the one below it." },
  { n: 6, name: "Senior Manager", leadership: 72, skill: 76, pay: 2.75, span: 20, managerial: true, detail: "Runs managers, which is harder than running staff." },
  { n: 7, name: "Director", leadership: 80, skill: 80, pay: 3.35, span: 27, managerial: true, detail: "Answerable for a part of the company rather than a part of a shop." },
  { n: 8, name: "Executive", leadership: 88, skill: 84, pay: 4.1, span: 36, managerial: true, detail: "Takes a division off your hands entirely." }
];
var TOP_OF_TRADE = 3;
function canRunDivision(def) {
  return def.span >= 20;
}
function grade(n) {
  return GRADES[clamp(Math.round(n), 0, GRADES.length - 1)];
}
function gradeOf(employee) {
  return grade(employee.grade ?? 0);
}
function titleOf(employee) {
  const def = gradeOf(employee);
  const roleName = role(employee.role).name;
  if (def.n === 0) return `Junior ${roleName}`;
  if (def.n === 1) return roleName;
  if (def.n === 2) return `Senior ${roleName}`;
  if (def.n === 3) return `Specialist ${roleName}`;
  if (def.n === 4) return `Team Lead \u2014 ${roleName}`;
  return def.name;
}
function gradeBlocker(employee, target) {
  if (target.n >= GRADES.length) return "There is nothing above this.";
  const shortOnLevel = employee.skill < target.skill;
  const shortOnLeadership = target.leadership > 0 && employee.skills.leadership < target.leadership;
  if (!shortOnLevel && !shortOnLeadership) return null;
  if (shortOnLeadership) {
    const also = shortOnLevel ? ` They are also at ${Math.round(employee.skill)} overall against the ${target.skill} the rung asks for, and leadership training moves both.` : "";
    return `${target.name} needs leadership ${target.leadership}. ${employee.name} is at ${Math.round(
      employee.skills.leadership
    )} \u2014 a fine ${role(employee.role).name.toLowerCase()}, and not yet somebody who runs people. Leadership training would change that.${also}`;
  }
  return `${target.name} needs an overall level of ${target.skill}. They are at ${Math.round(employee.skill)}.`;
}
function gradeFactor(employee) {
  return 1 + gradeOf(employee).n * 0.028;
}
function rungRate(base2, gradeN, skill) {
  return base2 * grade(gradeN).pay * (0.86 + clamp(skill, 0, 100) / 700);
}
function workloadOf(state, business) {
  if (business.status !== "open") return 25;
  const type = businessTypeOrThrow(business.typeId);
  const staff = state.employees.filter((e) => e.businessId === business.id);
  const openHours = Math.max(1, business.openTo - business.openFrom);
  const hands = Math.max(0.5, staff.length);
  const capacity = hands * type.customersPerStaffHour * openHours;
  const demanded = business.yesterday.customers + business.yesterday.lostCustomers;
  if (capacity <= 0) return 100;
  return clamp(demanded / capacity * 70, 0, 100);
}
function workloadFactor(workload) {
  if (workload <= 60) return 1;
  return clamp(1 - (workload - 60) * 6e-3, 0.76, 1);
}
function moraleFactor(morale) {
  return clamp(0.68 + morale / 100 * 0.5, 0.68, 1.18);
}
function experienceFactor(years) {
  return 1 + Math.min(years, 10) / 10 * 0.14;
}
function performanceOf(employee) {
  const fit = roleFit(employee.skills, employee.role);
  const base2 = fit * 0.7 + employee.productivity * 0.3;
  const traits = employee.traits.reduce((acc, id) => acc * trait(id).productivity, 1);
  const value = base2 * fitFactor(fit) * moraleFactor(employee.morale) * workloadFactor(employee.workload) * experienceFactor(employee.experience) * gradeFactor(employee) * traits;
  return clamp(value, 0, 100);
}
function performanceLabel(value) {
  if (value >= 78) return "Excellent";
  if (value >= 62) return "Strong";
  if (value >= 45) return "Steady";
  if (value >= 30) return "Struggling";
  return "Not working out";
}
function fitLabel(fit) {
  if (fit >= 72) return "Made for this job";
  if (fit >= 56) return "Well suited";
  if (fit >= 42) return "Can do the job";
  if (fit >= 28) return "Out of their depth";
  return "Wrong job for them";
}
var COURSES = [
  { id: "technical", name: "Technical training", skill: "technical", days: 6, costPerDay: 210, detail: "The craft itself: faster, cleaner, fewer mistakes." },
  { id: "sales", name: "Sales training", skill: "sales", days: 5, costPerDay: 190, detail: "Asking for the sale, and asking for the bigger one." },
  { id: "service", name: "Customer service", skill: "service", days: 4, costPerDay: 160, detail: "How people feel on the way out, which is what they write down." },
  { id: "logistics", name: "Stock and logistics", skill: "logistics", days: 5, costPerDay: 175, detail: "Where everything is, and how it gets there." },
  { id: "admin", name: "Administration", skill: "admin", days: 5, costPerDay: 185, detail: "Ordering, paperwork and the things that go wrong quietly." },
  { id: "finance", name: "Bookkeeping and finance", skill: "finance", days: 7, costPerDay: 240, detail: "Reading the numbers rather than filing them. The desk an accountant sits at." },
  { id: "communication", name: "Communication", skill: "communication", days: 4, costPerDay: 170, detail: "Saying the difficult thing clearly, to a customer or to a colleague." },
  { id: "leadership", name: "Leadership", skill: "leadership", days: 8, costPerDay: 290, detail: "Running a shift, and later a shop. The only way past Senior." }
];
var COURSE_BY_ID = new Map(COURSES.map((course) => [course.id, course]));
function suggestedCourse(employee) {
  const weights = ROLE_SKILLS[employee.role];
  const next = GRADES[gradeOf(employee).n + 1];
  if (next && employee.skill >= next.skill && employee.skills.leadership < next.leadership) {
    const leadership = COURSES.find((course) => course.skill === "leadership");
    if (leadership) return leadership;
  }
  let best = COURSES[0];
  let gap = -1;
  for (const course of COURSES) {
    const weight = weights[course.skill] ?? 0;
    const worth = weight * (100 - (employee.skills[course.skill] ?? 0));
    if (worth > gap) {
      gap = worth;
      best = course;
    }
  }
  return best;
}
function profileFor(overall, roleId, roll) {
  const weights = ROLE_SKILLS[roleId];
  const skills = emptySkills();
  for (const id of SKILL_IDS) {
    const weight = weights[id] ?? 0;
    const centre = overall * (0.55 + weight * 0.9);
    skills[id] = clamp(centre + roll(-11, 11), 3, 100);
  }
  for (let pass = 0; pass < 6; pass += 1) {
    const mean = overallSkill(skills);
    const shortfall2 = overall - mean;
    if (Math.abs(shortfall2) < 0.01) break;
    const room = SKILL_IDS.filter((id) => shortfall2 > 0 ? skills[id] < 100 : skills[id] > 3);
    if (room.length === 0) break;
    const share = shortfall2 * SKILL_IDS.length / room.length;
    for (const id of room) skills[id] = clamp(skills[id] + share, 3, 100);
  }
  return skills;
}

// src/sim/holding.ts
function attentionOf(state) {
  return attentionSpan(state);
}
function divisionById(state, id) {
  return state.divisions.find((d) => d.id === id);
}
function divisionBusinesses(state, divisionId) {
  return playerBusinesses(state).filter((business) => business.divisionId === divisionId);
}
function unassignedBusinesses(state) {
  return playerBusinesses(state).filter((business) => !business.divisionId);
}
function divisionHead(state, division) {
  if (!division.headEmployeeId) return null;
  return employeeById(state, division.headEmployeeId) ?? null;
}
function ownerAttention(state) {
  const direct = unassignedBusinesses(state).filter((b) => b.status !== "closed").length;
  const delegated = sum(state.divisions, (division) => {
    const head = divisionHead(state, division);
    const locations = divisionBusinesses(state, division.id).filter((b) => b.status !== "closed").length;
    if (!head) return locations;
    const topSpan = GRADES[GRADES.length - 1].span;
    const relief = clamp(performanceOf(head) / 80, 0.35, 1) * clamp(gradeOf(head).span / topSpan, 0.4, 1);
    return locations * (1 - relief * 0.9);
  });
  const load = direct + delegated + mergerAttentionLoad(state);
  const span = attentionOf(state);
  if (load <= span) return 1;
  return clamp(span / load, 0.55, 1);
}
function attentionFactor(state) {
  const attention = ownerAttention(state);
  return clamp(2 - attention, 1, 1.45);
}
function delegatedSupervision(state, business) {
  if (!business.divisionId) return 0;
  const division = divisionById(state, business.divisionId);
  if (!division) return 0;
  const head = divisionHead(state, division);
  if (!head) return 0;
  const locations = Math.max(1, divisionBusinesses(state, division.id).filter((b) => b.status !== "closed").length);
  return gradeOf(head).span * clamp(performanceOf(head) / 70, 0.4, 1.25) / locations;
}
function createDivision(state, name, acquiredFrom) {
  const division = {
    id: makeId("div"),
    name: name.trim().slice(0, 40) || "New division",
    acquiredFrom,
    createdOnDay: state.day,
    headEmployeeId: null,
    mergedOnDay: null
  };
  state.divisions.push(division);
  return division;
}
function renameDivision(state, divisionId, name) {
  const division = divisionById(state, divisionId);
  if (!division) return { ok: false, message: "Unknown division." };
  const next = name.trim().slice(0, 40);
  if (!next) return { ok: false, message: "A division needs a name." };
  division.name = next;
  return { ok: true, message: `Renamed to ${next}.` };
}
function assignToDivision(state, businessId, divisionId) {
  const business = businessById(state, businessId);
  if (!business || business.companyId !== state.playerCompanyId) {
    return { ok: false, message: "That is not one of your locations." };
  }
  if (divisionId && !divisionById(state, divisionId)) return { ok: false, message: "Unknown division." };
  business.divisionId = divisionId;
  const division = divisionId ? divisionById(state, divisionId) : null;
  return {
    ok: true,
    message: division ? `${business.name} now reports to ${division.name}.` : `${business.name} reports to you directly.`
  };
}
function eligibleHeads(state) {
  return state.employees.filter((person) => person.companyId === state.playerCompanyId && canRunDivision(gradeOf(person))).sort((a, b) => performanceOf(b) - performanceOf(a));
}
function appointHead(state, divisionId, employeeId) {
  const division = divisionById(state, divisionId);
  if (!division) return { ok: false, message: "Unknown division." };
  if (employeeId === null) {
    const was = divisionHead(state, division);
    division.headEmployeeId = null;
    return {
      ok: true,
      message: was ? `${was.name} no longer runs ${division.name}. It is back on your desk.` : "Nobody was running it."
    };
  }
  const person = employeeById(state, employeeId);
  if (!person || person.companyId !== state.playerCompanyId) {
    return { ok: false, message: "That is not one of your people." };
  }
  if (!canRunDivision(gradeOf(person))) {
    return {
      ok: false,
      message: `${person.name} is a ${titleOf(person)}. Running a division takes a Senior Manager at least \u2014 promote them first, which needs leadership, not more of what they already do well.`
    };
  }
  for (const other of state.divisions) {
    if (other.headEmployeeId === employeeId) other.headEmployeeId = null;
  }
  division.headEmployeeId = employeeId;
  learn(state, "delegated");
  person.morale = clamp(person.morale + 12, 0, 100);
  person.loyalty = clamp(person.loyalty + 10, 0, 100);
  person.stress = clamp(person.stress + 8, 0, 100);
  pushNews(state, "company", `${person.name} takes over ${division.name}`, `${divisionBusinesses(state, division.id).length} locations, and they answer for all of them now.`, {
    importance: "high"
  });
  return { ok: true, message: `${person.name} runs ${division.name}. That is ${divisionBusinesses(state, division.id).length} locations off your desk.` };
}
function tidyDivisions(state) {
  for (const division of state.divisions) {
    if (division.headEmployeeId && !employeeById(state, division.headEmployeeId)) {
      const locations = divisionBusinesses(state, division.id).length;
      division.headEmployeeId = null;
      pushNews(state, "staff", `${division.name} has nobody running it`, `${locations} locations are back on your desk until you appoint somebody.`, {
        importance: "high"
      });
    }
  }
  const kept = state.divisions.filter((division) => divisionBusinesses(state, division.id).length > 0);
  if (kept.length !== state.divisions.length) state.divisions = kept;
}
function groupStructure(state) {
  const rows = state.divisions.map((division) => ({
    division,
    head: divisionHead(state, division),
    businesses: divisionBusinesses(state, division.id),
    headcount: 0,
    revenue: 0,
    profit: 0
  }));
  const direct = unassignedBusinesses(state);
  if (direct.length > 0) {
    rows.push({ division: null, head: null, businesses: direct, headcount: 0, revenue: 0, profit: 0 });
  }
  for (const row2 of rows) {
    row2.headcount = sum(row2.businesses, (business) => employeesOf(state, business.id).length);
    row2.revenue = sum(row2.businesses, (business) => business.yesterday.revenue);
    row2.profit = sum(
      row2.businesses,
      (business) => business.yesterday.revenue - (business.yesterday.cogs + business.yesterday.wages + business.yesterday.rent + business.yesterday.marketing + business.yesterday.otherCosts)
    );
  }
  return rows;
}

// src/sim/staffing.ts
var DEPARTMENTS = [
  {
    id: "operations",
    name: "Operations",
    detail: "The work itself \u2014 making, fixing, cooking, cleaning.",
    roles: ["cook", "technician", "cleaner"]
  },
  {
    id: "sales",
    name: "Sales and service",
    detail: "Everybody the customer actually meets.",
    roles: ["cashier", "sales", "server", "marketer"]
  },
  {
    id: "logistics",
    name: "Logistics",
    detail: "Stock in, stock out, and everything between.",
    roles: ["warehouse", "driver"]
  },
  { id: "admin", name: "Administration", detail: "The books and the paperwork.", roles: ["accountant", "hr", "it", "legal"] },
  { id: "management", name: "Management", detail: "Running the place.", roles: ["manager"] }
];
var DEPARTMENT_OF = /* @__PURE__ */ new Map();
for (const department2 of DEPARTMENTS) {
  for (const roleId of department2.roles) DEPARTMENT_OF.set(roleId, department2.id);
}
function departmentOf(roleId) {
  return DEPARTMENT_OF.get(roleId) ?? "operations";
}
function department(id) {
  const found = DEPARTMENTS.find((d) => d.id === id);
  if (!found) throw new Error(`Unknown department: ${id}`);
  return found;
}
function departmentsOf(state, business) {
  const staff = employeesOf(state, business.id);
  const rows = [];
  for (const def of DEPARTMENTS) {
    const people2 = staff.filter((person) => departmentOf(person.role) === def.id);
    if (people2.length === 0) continue;
    rows.push({
      id: def.id,
      name: def.name,
      detail: def.detail,
      people: people2,
      performance: sum(people2, (p2) => performanceOf(p2)) / people2.length,
      payroll: sum(people2, (p2) => p2.salary)
    });
  }
  return rows;
}
var SIZES = [
  { id: "small", name: "Small", from: 0, managers: 0, adminPerHead: 0, detail: "Everybody knows what everybody else is doing." },
  { id: "growing", name: "Growing", from: 6, managers: 1, adminPerHead: 1.2, detail: "Too many to hold in your head. Somebody has to run the rota." },
  { id: "medium", name: "Medium", from: 10, managers: 1, adminPerHead: 2.2, detail: "Shifts that never overlap, and a handover that has to be written down." },
  { id: "large", name: "Large", from: 18, managers: 2, adminPerHead: 3.8, detail: "People who work here and have never met each other." },
  { id: "enterprise", name: "Enterprise", from: 30, managers: 3, adminPerHead: 5.6, detail: "A business that runs whether or not you are in it." }
];
function sizeOf(state, business) {
  const headcount = employeesOf(state, business.id).length;
  let found = SIZES[0];
  for (const size of SIZES) if (headcount >= size.from) found = size;
  return found;
}
function nextSize(size) {
  return SIZES[SIZES.indexOf(size) + 1] ?? null;
}
function supervisionLoad(state, business) {
  const staff = employeesOf(state, business.id);
  const type = businessTypeOrThrow(business.typeId);
  return sum(
    staff.filter((person) => !gradeOf(person).managerial),
    (person) => sum(person.traits.map(trait), (t) => t.supervision) / Math.max(1, person.traits.length)
  ) * complexityOf(type);
}
function supervisionCapacity(state, business) {
  const staff = employeesOf(state, business.id);
  const inside2 = sum(staff, (person) => {
    const span = gradeOf(person).span;
    if (span <= 0) return 0;
    const knack = person.traits.reduce((acc, id) => acc * trait(id).management, 1);
    return span * knack * clamp(performanceOf(person) / 60, 0.45, 1.2);
  });
  return inside2 + delegatedSupervision(state, business);
}
function managementCover(state, business) {
  const load = supervisionLoad(state, business);
  if (load <= SIZES[1].from - 1) return 1;
  const capacity = supervisionCapacity(state, business);
  return clamp(capacity / load, 0, 1.25);
}
function managementFactor(state, business) {
  const cover2 = managementCover(state, business);
  if (cover2 >= 1) return 1;
  return clamp(0.8 + cover2 * 0.2, 0.8, 1);
}
function adminCostPerDay(state, business) {
  const size = sizeOf(state, business);
  const type = businessTypeOrThrow(business.typeId);
  const headcount = employeesOf(state, business.id).length;
  const stretched = business.companyId === state.playerCompanyId ? attentionFactor(state) : 1;
  const scale = business.companyId === state.playerCompanyId ? mergerScaleFactor(state) : 1;
  return size.adminPerHead * headcount * complexityOf(type) * coordinationFactor(state) * stretched * operationsFactor(state) * scale;
}
function complexityOf(type) {
  return 0.8 + (type.complexity - 1) * 0.2;
}
function tradeFit(state, business) {
  const type = businessTypeOrThrow(business.typeId);
  const staff = employeesOf(state, business.id);
  if (staff.length === 0 || type.keySkills.length === 0) return 50;
  return sum(staff, (person) => sum(type.keySkills, (id) => person.skills[id] ?? 0) / type.keySkills.length) / staff.length;
}
function tradeFitOf(person, type) {
  if (type.keySkills.length === 0) return 50;
  return sum(type.keySkills, (id) => person.skills[id] ?? 0) / type.keySkills.length;
}
function automationAt(state, business) {
  const type = businessTypeOrThrow(business.typeId);
  return automationRelief(state) * type.automatable;
}
function orgChart(state, business) {
  const staff = [...employeesOf(state, business.id)].sort((a, b) => gradeOf(b).n - gradeOf(a).n);
  const nodes = new Map(staff.map((person) => [person.id, { person, reports: [] }]));
  const roots = [];
  for (const person of staff) {
    const node2 = nodes.get(person.id);
    if (!node2) continue;
    const mine = gradeOf(person).n;
    const candidates = staff.filter((other) => other.id !== person.id && gradeOf(other).n > mine && gradeOf(other).span > 0);
    const sameDepartment = candidates.filter((other) => departmentOf(other.role) === departmentOf(person.role));
    const pool = sameDepartment.length > 0 ? sameDepartment : candidates;
    const boss = pool.sort((a, b) => gradeOf(a).n - gradeOf(b).n)[0];
    if (boss) nodes.get(boss.id)?.reports.push(node2);
    else roots.push(node2);
  }
  return roots;
}
function staffingPlan(state, business) {
  const type = businessTypeOrThrow(business.typeId);
  const staff = employeesOf(state, business.id);
  const openHours = Math.max(1, business.openTo - business.openFrom);
  const traded = business.yesterday.customers + business.yesterday.lostCustomers;
  const demand = business.status === "open" && traded > 0 ? traded : type.baseCustomers;
  const bodies = Math.max(1, Math.ceil(demand / Math.max(1, type.customersPerStaffHour * openHours)));
  const relief = automationAt(state, business);
  const rows = [];
  for (const [index, roleId] of type.roles.entries()) {
    const inSeat = staff.filter((person) => person.role === roleId);
    let required = 1;
    let recommended = 1;
    if (roleId === "manager") {
      const load = supervisionLoad(state, business);
      const perManager = Math.max(1, grade(4).span);
      required = load <= SIZES[1].from - 1 ? 0 : Math.max(1, Math.ceil(load / perManager));
      recommended = required;
    } else if (index === 0) {
      required = Math.max(1, bodies);
      recommended = Math.max(required + 1, Math.ceil(required * 1.3));
    } else {
      recommended = bodies > 6 ? 2 : 1;
      if (relief >= 0.75) {
        required = 0;
        recommended = Math.max(0, recommended - 1);
      }
    }
    rows.push({
      role: roleId,
      name: role(roleId).name,
      department: departmentOf(roleId),
      required,
      recommended,
      current: inSeat.length,
      gap: inSeat.length - required,
      fit: inSeat.length > 0 ? sum(inSeat, (p2) => roleFit(p2.skills, roleId)) / inSeat.length : null
    });
  }
  return rows;
}
function staffingSummary(state, business) {
  const rows = staffingPlan(state, business);
  const required = sum(rows, (row2) => row2.required);
  const recommended = sum(rows, (row2) => row2.recommended);
  const current = employeesOf(state, business.id).length;
  return {
    rows,
    required,
    recommended,
    current,
    shortage: Math.max(0, sum(rows, (row2) => Math.max(0, row2.required - row2.current))),
    surplus: Math.max(0, current - recommended),
    workload: workloadOf(state, business),
    size: sizeOf(state, business),
    managementCover: managementCover(state, business)
  };
}
function findings(state, business) {
  const out = [];
  const plan = staffingSummary(state, business);
  const staff = employeesOf(state, business.id);
  if (plan.shortage > 0) {
    const short = plan.rows.filter((row2) => row2.current < row2.required);
    out.push({
      level: "bad",
      title: `${plan.shortage} short of what this trade needs`,
      detail: short.map((row2) => `${row2.required - row2.current} \xD7 ${row2.name.toLowerCase()}`).join(", ")
    });
  }
  if (plan.workload > 82) {
    out.push({
      level: "bad",
      title: "The team is running flat out",
      detail: `Workload is ${Math.round(plan.workload)}/100. People at this pace get ill, get cross, and leave.`
    });
  } else if (plan.workload > 68) {
    out.push({
      level: "warn",
      title: "Busy, and one absence from a problem",
      detail: `Workload is ${Math.round(plan.workload)}/100. Another pair of hands would buy some room.`
    });
  }
  if (plan.managementCover < 1) {
    const load = Math.round(supervisionLoad(state, business));
    const capacity = Math.round(supervisionCapacity(state, business));
    out.push({
      level: plan.managementCover < 0.55 ? "bad" : "warn",
      title: "Nobody is running this place properly",
      detail: `${load} people need managing and the grades here cover about ${capacity}. ${plan.size.detail} Everything still happens, about ${Math.round(
        (1 - managementFactor(state, business)) * 100
      )}% slower. Promote somebody with leadership, or hire a manager.`
    });
  }
  if (plan.surplus > 0 && plan.workload < 45) {
    out.push({
      level: "warn",
      title: `${plan.surplus} more people than this trade needs`,
      detail: "Wages are going out for hours nobody is asking for. Either find them work or let somebody go."
    });
  }
  const mismatched = staff.filter((person) => roleFit(person.skills, person.role) < 38);
  if (mismatched.length > 0) {
    out.push({
      level: "warn",
      title: `${mismatched.length} ${mismatched.length === 1 ? "person is" : "people are"} in the wrong seat`,
      detail: `${mismatched.slice(0, 3).map((p2) => p2.name).join(", ")} \u2014 their skills do not suit the job they are doing. Train them, or move them.`
    });
  }
  const unhappy = staff.filter((person) => person.morale < 40);
  if (unhappy.length > 0) {
    out.push({
      level: "bad",
      title: `${unhappy.length} unhappy ${unhappy.length === 1 ? "person" : "people"}`,
      detail: "Below forty they start looking. Pay, hours or recognition is usually the cause."
    });
  }
  if (out.length === 0 && staff.length > 0) {
    out.push({
      level: "good",
      title: "Nothing wrong with the team",
      detail: `${staff.length} people, workload ${Math.round(plan.workload)}/100, nobody unhappy.`
    });
  }
  return out;
}
function opportunities(state, business) {
  const out = [];
  const staff = employeesOf(state, business.id);
  if (staff.length === 0) return out;
  const trainable = staff.filter((person) => person.trainingEndsOnDay === null && person.skill < 82).sort((a, b) => roleFit(a.skills, a.role) - roleFit(b.skills, b.role))[0];
  if (trainable) {
    out.push({
      level: "good",
      title: `Train ${trainable.name}`,
      detail: `They fit the job ${Math.round(roleFit(trainable.skills, trainable.role))}/100. A course would show up in what they get through.`
    });
  }
  const ready = staff.filter((person) => gradeOf(person).n < 6 && person.skill > 62).sort((a, b) => b.skill - a.skill)[0];
  if (ready) {
    const next = GRADES[gradeOf(ready).n + 1];
    const wall = next ? gradeBlocker(ready, next) : null;
    out.push({
      level: "good",
      title: wall ? `${ready.name} has gone as far as they can` : `${ready.name} has earned a step up`,
      detail: wall ? wall : `${titleOf(ready)} now; ${next?.name} next. Recognise them before somebody else does.`
    });
  }
  const size = sizeOf(state, business);
  const bigger = nextSize(size);
  if (bigger && staff.length >= bigger.from - 2) {
    out.push({
      level: "good",
      title: `${bigger.from - staff.length} more ${bigger.from - staff.length === 1 ? "person" : "people"} and this is a ${bigger.name.toLowerCase()} business`,
      detail: bigger.detail
    });
  }
  return out;
}

// src/sim/mergers.ts
var MERGER_STYLES = [
  {
    id: "absorb",
    name: "Absorb them",
    pitch: "One company by the end of the month.",
    detail: "Your name over every door, your systems everywhere, and every job that exists twice goes. Fastest, cheapest to run afterwards, and the hardest on everybody who has to live through it \u2014 including the customers, who walked past a name they knew yesterday.",
    days: 30,
    cutShare: 1,
    disruption: 26,
    savingShare: 1,
    costPerHeadPerDay: 14,
    rebrandCost: 9
  },
  {
    id: "blend",
    name: "Blend the two",
    pitch: "Take the best of both, and take your time over it.",
    detail: "Keep what they were good at, move people rather than replace them, and let the two ways of working meet in the middle. It takes more than twice as long and costs more in total \u2014 you are paying consultants to do carefully what you could have done in a fortnight \u2014 but you keep most of the saving and most of the people.",
    days: 70,
    cutShare: 0.55,
    disruption: 11,
    savingShare: 0.75,
    costPerHeadPerDay: 9,
    rebrandCost: 4
  },
  {
    id: "federate",
    name: "Leave them to it",
    pitch: "Same owner, same everything else.",
    detail: "They keep their name, their staff and their way of running a shop; you join up the buying and file one set of accounts. Almost nobody notices, which is the point when you have bought something that is already working \u2014 but you are still paying for two of most things, so the saving is small.",
    days: 40,
    cutShare: 0,
    disruption: 3,
    savingShare: 0.22,
    costPerHeadPerDay: 4,
    rebrandCost: 0
  }
];
function mergerStyle(id) {
  return MERGER_STYLES.find((style) => style.id === id) ?? MERGER_STYLES[1];
}
var CENTRAL_ROLES = ["accountant", "marketer", "hr", "it", "legal"];
var SHARED_SERVICES = 0.2;
var SCALE_FLOOR = 0.78;
function cultureGapOf(state, divisionId) {
  const inside2 = divisionPeople(state, divisionId);
  const outside = state.employees.filter(
    (person) => person.companyId === state.playerCompanyId && !inside2.some((p2) => p2.id === person.id)
  );
  if (inside2.length === 0 || outside.length === 0) return { gap: 0, reasons: [] };
  const reasons = [];
  const payOf = (people2) => sum(people2, (person) => person.salary / Math.max(1, marketRate(state, person))) / people2.length;
  const theirPay = payOf(inside2);
  const ourPay = payOf(outside);
  const payGap = Math.abs(theirPay - ourPay);
  if (payGap > 0.04) {
    reasons.push(
      `They are paid ${Math.round((theirPay - 1) * 100)}% ${theirPay >= 1 ? "over" : "under"} the going rate and your side is on ${Math.round(
        (ourPay - 1) * 100
      )}%. Everybody finds that out in the first week.`
    );
  }
  const moraleOf = (people2) => sum(people2, (p2) => p2.morale) / people2.length;
  const moraleGap = Math.abs(moraleOf(inside2) - moraleOf(outside));
  if (moraleGap > 8) {
    reasons.push(
      `Their teams are on ${Math.round(moraleOf(inside2))} morale and yours are on ${Math.round(
        moraleOf(outside)
      )}. The happier side resents being told how to work by the other.`
    );
  }
  const theirShops = divisionBusinesses(state, divisionId).filter((b) => b.status === "open");
  const ourShops = playerBusinesses(state).filter((b) => b.status === "open" && b.divisionId !== divisionId);
  let repGap = 0;
  if (theirShops.length > 0 && ourShops.length > 0) {
    const theirRep = sum(theirShops, (b) => b.reputation) / theirShops.length;
    const ourRep = sum(ourShops, (b) => b.reputation) / ourShops.length;
    repGap = Math.abs(theirRep - ourRep);
    if (repGap > 10) {
      reasons.push(
        `Their shops review ${Math.round(theirRep)} against your ${Math.round(
          ourRep
        )}. Whichever side is behind is about to be told how it should be done.`
      );
    }
  }
  const gradeOfSide = (people2) => sum(people2, (p2) => gradeOf(p2).n) / people2.length;
  const seniorityGap = Math.abs(gradeOfSide(inside2) - gradeOfSide(outside));
  if (seniorityGap > 0.8) {
    reasons.push("The two sides are at very different stages of their careers, and titles will not line up.");
  }
  const gap = clamp(payGap * 180 + moraleGap * 0.8 + repGap * 0.5 + seniorityGap * 6, 0, 100);
  if (reasons.length === 0) reasons.push("Two companies that already worked much the same way. This should go quietly.");
  return { gap: Math.round(gap), reasons };
}
function divisionPeople(state, divisionId) {
  return divisionBusinesses(state, divisionId).flatMap((business) => employeesOf(state, business.id));
}
function duplicatesIn(state, divisionId) {
  const covered = centralFunctionsCovered(state);
  const found = [];
  for (const business of divisionBusinesses(state, divisionId)) {
    const staff = employeesOf(state, business.id);
    if (staff.length === 0) continue;
    const ranked = [...staff].sort((a, b) => {
      const aCentral = covered.has(a.role) ? 0 : 1;
      const bCentral = covered.has(b.role) ? 0 : 1;
      if (aCentral !== bCentral) return aCentral - bCentral;
      return performanceOf(a) - performanceOf(b);
    });
    const rows = staffingPlan(state, business);
    const needed = new Map(rows.map((row2) => [row2.role, row2.required]));
    const summary = staffingSummary(state, business);
    const keepTotal = Math.max(summary.required, Math.round(summary.recommended * (1 - SHARED_SERVICES)));
    const left = /* @__PURE__ */ new Map();
    for (const person of staff) left.set(person.role, (left.get(person.role) ?? 0) + 1);
    let remaining = staff.length;
    for (const person of ranked) {
      if (remaining <= keepTotal) break;
      const floor = covered.has(person.role) ? 0 : needed.get(person.role) ?? 0;
      const here = left.get(person.role) ?? 0;
      if (here <= floor) continue;
      found.push(person);
      left.set(person.role, here - 1);
      remaining -= 1;
    }
  }
  return found;
}
function centralFunctionsCovered(state) {
  const covered = /* @__PURE__ */ new Set();
  const office = state.headOffice;
  if (!office) return covered;
  for (const id of office.employeeIds) {
    const person = state.employees.find((e) => e.id === id);
    if (person && CENTRAL_ROLES.includes(person.role)) covered.add(person.role);
  }
  for (const [fn, out] of Object.entries(office.outsourced)) {
    if (out && CENTRAL_ROLES.includes(fn)) covered.add(fn);
  }
  return covered;
}
function redundancyPay(state, person) {
  const years = (state.day - person.hiredOnDay) / 360;
  return Math.round(person.salary * clamp(0.75 + years * 0.25, 0.75, 3.5));
}
function mergerPlan(state, divisionId, styleId) {
  const division = divisionById(state, divisionId);
  if (!division) return null;
  const style = mergerStyle(styleId);
  const businesses = divisionBusinesses(state, divisionId);
  const people2 = divisionPeople(state, divisionId);
  const duplicates = duplicatesIn(state, divisionId);
  const culture = cultureGapOf(state, divisionId);
  const head = divisionHead(state, division);
  const cuts = Math.round(duplicates.length * style.cutShare);
  const going = duplicates.slice(0, cuts);
  const severance = sum(going, (person) => redundancyPay(state, person));
  const days = plannedDays(state, division, style, culture.gap);
  const headcount = people2.length;
  const integrationCost = Math.round(style.costPerHeadPerDay * Math.max(1, headcount) * days);
  const wageSaving = sum(going, (person) => person.salary);
  const overheadSaving = Math.round(overheadSavingPerMonth(state, businesses.length) * style.savingShare);
  const perMonth = wageSaving + overheadSaving;
  const total2 = severance + integrationCost;
  const payback = perMonth > 0 ? Math.ceil(total2 / perMonth) : null;
  return {
    division,
    style,
    locations: businesses.length,
    headcount,
    duplicates,
    cuts,
    severance,
    integrationCost,
    days,
    culture,
    wageSaving,
    overheadSaving,
    payback,
    head,
    blocked: blockedReason(state, division)
  };
}
function plannedDays(state, division, style, gap) {
  const head = divisionHead(state, division);
  const carried = head ? 0.78 + (1 - clamp(performanceOf(head) / 100, 0, 1)) * 0.22 : 1.3;
  const owner = 1 - (skillOf(state, "management") - 50) / 50 * 0.2;
  const friction = 1 + gap / 100 * 0.45;
  return Math.max(10, Math.round(style.days * carried * owner * friction));
}
function overheadSavingPerMonth(state, locations) {
  const office = state.headOffice;
  const central = office ? sum(
    office.employeeIds.map((id) => state.employees.find((e) => e.id === id)).filter((person) => person !== void 0),
    (person) => person.salary
  ) : sum(
    CENTRAL_ROLES.map((id) => role(id).baseSalary),
    (salary) => salary
  ) * 0.35;
  return central * clamp(locations * 0.05, 0.05, 0.3);
}
function blockedReason(state, division) {
  if (division.acquiredFrom === GROUPED_BY_HAND) {
    return "You made this division yourself. There is no second company here to merge with \u2014 it is already one.";
  }
  if (division.mergedOnDay !== null) return `Already merged, on day ${division.mergedOnDay}.`;
  const open = activeMerger(state);
  if (open && open.divisionId !== division.id) {
    const other = divisionById(state, open.divisionId);
    return `${other?.name ?? "Another integration"} is still going. One at a time \u2014 nobody integrates two companies at once and gets either of them right.`;
  }
  if (divisionBusinesses(state, division.id).length === 0) return "Nothing left in it to merge.";
  return null;
}
var GROUPED_BY_HAND = "grouped by you";
function activeMerger(state) {
  return state.mergers.find((merger) => merger.completedOnDay === null) ?? null;
}
function mergerFor(state, divisionId) {
  return state.mergers.find((merger) => merger.divisionId === divisionId && merger.completedOnDay === null) ?? null;
}
function mergerCandidates(state) {
  return state.divisions.filter(
    (division) => division.acquiredFrom !== GROUPED_BY_HAND && division.mergedOnDay === null
  );
}
function startMerger(state, divisionId, styleId) {
  const plan = mergerPlan(state, divisionId, styleId);
  if (!plan) return { ok: false, message: "Unknown division." };
  if (plan.blocked) return { ok: false, message: plan.blocked };
  const company = playerCompany(state);
  const upfront = Math.round(plan.integrationCost / Math.max(1, plan.days / DAYS_PER_MONTH));
  if (company.cash < upfront) {
    return {
      ok: false,
      message: `An integration costs about ${money(upfront)} a month while it runs, and you have ${money(
        company.cash
      )}. Borrow it or wait.`
    };
  }
  const merger = {
    id: makeId("merge"),
    divisionId,
    fromCompany: plan.division.acquiredFrom,
    style: styleId,
    startedOnDay: state.day,
    days: plan.days,
    progress: 0,
    cultureGap: plan.culture.gap,
    duplicateIds: plan.duplicates.slice(0, plan.cuts).map((person) => person.id),
    headcountAtStart: plan.headcount,
    spent: 0,
    severanceSpent: 0,
    letGo: 0,
    completedOnDay: null,
    savingLockedIn: 0
  };
  state.mergers.push(merger);
  if (plan.style.rebrandCost > 0) {
    for (const business of divisionBusinesses(state, divisionId)) {
      business.awareness = clamp(business.awareness - plan.style.rebrandCost, 0, 100);
      business.reputation = clamp(business.reputation - plan.style.rebrandCost * 0.4, 0, 100);
      if (plan.style.id === "absorb") {
        business.name = business.name.replace(plan.division.acquiredFrom, company.name).slice(0, 60);
      }
    }
  }
  pushNews(
    state,
    "company",
    `${plan.division.name} is being merged in`,
    `${plan.style.name}. ${plan.days} days, about ${money(plan.integrationCost)} to run it${plan.cuts > 0 ? `, and ${plan.cuts} job${plan.cuts === 1 ? "" : "s"} that now exist twice` : ""}.`,
    { importance: "high" }
  );
  return {
    ok: true,
    message: `Integration started. ${plan.days} days, ${money(plan.integrationCost)} to run, ${plan.payback === null ? "and no saving to pay it back" : `paid back in about ${plan.payback} months`}.`
  };
}
function abandonMerger(state, mergerId) {
  const merger = state.mergers.find((m) => m.id === mergerId);
  if (!merger || merger.completedOnDay !== null) return { ok: false, message: "Nothing to call off." };
  const style = mergerStyle(merger.style);
  const division = divisionById(state, merger.divisionId);
  merger.completedOnDay = state.day;
  merger.savingLockedIn = availableSaving(state, merger) * style.savingShare * merger.progress;
  if (division) division.mergedOnDay = state.day;
  pushNews(
    state,
    "company",
    `The ${division?.name ?? "integration"} merger has been called off`,
    `${Math.round(merger.progress * 100)}% of the way through, ${money(
      merger.spent + merger.severanceSpent
    )} spent. What was done stays done; the rest will not happen.`,
    { importance: "high" }
  );
  return {
    ok: true,
    message: `Called off at ${Math.round(merger.progress * 100)}%. ${money(
      merger.spent + merger.severanceSpent
    )} spent, and you keep ${Math.round(merger.savingLockedIn * 100)}% of the saving.`
  };
}
function availableSaving(state, merger) {
  const locations = Math.max(1, divisionBusinesses(state, merger.divisionId).length);
  return clamp(locations * 0.02, 0.02, 0.09);
}
function mergersDaily(state) {
  const company = playerCompany(state);
  for (const merger of state.mergers) {
    if (merger.completedOnDay !== null) continue;
    const style = mergerStyle(merger.style);
    const division = divisionById(state, merger.divisionId);
    if (!division) {
      merger.completedOnDay = state.day;
      merger.savingLockedIn = 0.02 * style.savingShare * merger.progress;
      continue;
    }
    const people2 = divisionPeople(state, merger.divisionId);
    const cost = Math.round(style.costPerHeadPerDay * Math.max(1, people2.length));
    if (cost > 0) {
      post(state, company.id, "management", `Integration \u2014 ${division.name}`, -cost, null);
      merger.spent += cost;
    }
    merger.progress = clamp(merger.progress + 1 / Math.max(1, merger.days), 0, 1);
    merger.cultureGap = approach(merger.cultureGap, 0, 0.015 + merger.progress * 0.03);
    const due = Math.round(merger.duplicateIds.length * clamp(merger.progress / 0.8, 0, 1));
    while (merger.letGo < due) {
      if (!makeOneRedundant(state, merger, division.name)) break;
    }
    if (merger.progress >= 1) complete(state, merger, division);
  }
}
function makeOneRedundant(state, merger, divisionName) {
  const company = playerCompany(state);
  const id = merger.duplicateIds[merger.letGo];
  if (!id) return false;
  const person = state.employees.find((e) => e.id === id);
  if (!person) {
    merger.letGo += 1;
    return true;
  }
  const pay = redundancyPay(state, person);
  if (company.cash < pay) return false;
  removeEmployee(state, person.id);
  post(state, company.id, "severance", `Redundancy \u2014 ${person.name}`, -pay, person.businessId);
  merger.severanceSpent += pay;
  merger.letGo += 1;
  learn(state, "letGo");
  for (const colleague of divisionPeople(state, merger.divisionId)) {
    colleague.morale = clamp(colleague.morale - 3, 0, 100);
    colleague.loyalty = clamp(colleague.loyalty - 2, 0, 100);
  }
  pushNews(
    state,
    "staff",
    `${person.name} made redundant`,
    `${role(person.role).name}. The job existed twice after the ${divisionName} merger, and ${money(
      pay
    )} went out with them.`,
    { businessId: person.businessId, importance: "normal" }
  );
  return true;
}
function complete(state, merger, division) {
  const company = playerCompany(state);
  const style = mergerStyle(merger.style);
  merger.completedOnDay = state.day;
  merger.savingLockedIn = availableSaving(state, merger) * style.savingShare;
  division.mergedOnDay = state.day;
  const shops = divisionBusinesses(state, merger.divisionId);
  if (shops.length > 0) {
    const theirs = sum(shops, (b) => b.awareness) / shops.length;
    company.brandAwareness = clamp(company.brandAwareness + theirs * 0.25 * style.savingShare, 0, 100);
  }
  const remaining = divisionPeople(state, merger.divisionId).length;
  const resigned = Math.max(0, merger.headcountAtStart - merger.letGo - remaining);
  learn(state, "merged");
  pushNews(
    state,
    "company",
    `${division.name} is part of the company now`,
    `${merger.days} days and ${money(merger.spent + merger.severanceSpent)}. ${merger.letGo > 0 ? `${merger.letGo} made redundant` : "Nobody was made redundant"}${resigned > 0 ? `, ${resigned} left of their own accord` : ""}. Coordination across the group costs ${Math.round(
      merger.savingLockedIn * 100
    )}% less from today, and that does not go away.`,
    { importance: "high" }
  );
  pushAlert(
    state,
    "info",
    `${division.name} is merged`,
    `Two companies are one. The saving is permanent; the people who lived through it will take a while longer.`,
    null,
    "holding"
  );
}
function mergerMoraleDrag(state, employee) {
  let drag = 0;
  for (const merger of state.mergers) {
    if (merger.completedOnDay !== null) continue;
    const style = mergerStyle(merger.style);
    const inside2 = divisionBusinesses(state, merger.divisionId).some((b) => b.id === employee.businessId);
    const weight = inside2 ? 1 : 0.25;
    const fade = 1 - merger.progress * 0.55;
    drag += (style.disruption * 0.55 + merger.cultureGap / 100 * style.disruption * 0.9) * weight * fade;
  }
  return -clamp(drag, 0, 24);
}
function mergerAttentionLoad(state) {
  let load = 0;
  for (const merger of state.mergers) {
    if (merger.completedOnDay !== null) continue;
    const division = divisionById(state, merger.divisionId);
    const head = division ? divisionHead(state, division) : null;
    load += head ? 0.6 : 2.2;
  }
  return load;
}
function mergerScaleFactor(state) {
  let factor2 = 1;
  for (const merger of state.mergers) factor2 *= 1 - clamp(merger.savingLockedIn, 0, 0.2);
  return clamp(factor2, SCALE_FLOOR, 1);
}
function mergerHistory(state) {
  return state.mergers.filter((m) => m.completedOnDay !== null).sort((a, b) => (b.completedOnDay ?? 0) - (a.completedOnDay ?? 0));
}

// src/sim/research.ts
var BRANCHES = [
  { id: "operations", name: "Operations", detail: "How much work the same people get through." },
  { id: "logistics", name: "Logistics", detail: "Moving goods for less, and holding more of them." },
  { id: "marketing", name: "Marketing", detail: "Being remembered for longer by more people." },
  { id: "technology", name: "Technology", detail: "Machines doing what people were doing." },
  { id: "sustainability", name: "Sustainability", detail: "Costs that never come back once they are gone." }
];
var RESEARCH = [
  // ------------------------------------------------------------ operations
  {
    id: "efficiency",
    branch: "operations",
    name: "Efficiency review",
    after: null,
    cost: 18e3,
    days: 14,
    effect: "throughput",
    amount: 0.08,
    detail: "Time-and-motion on the shop floor: fewer steps between the door and the till.",
    says: "Staff serve 8% more customers an hour"
  },
  {
    id: "automation",
    branch: "operations",
    name: "Automation",
    after: "efficiency",
    cost: 55e3,
    days: 21,
    effect: "wages",
    amount: -0.07,
    detail: "Self-service, scheduling and stock counts that do not need a person.",
    says: "The wage bill falls 7%"
  },
  {
    id: "lean",
    branch: "operations",
    name: "Lean production",
    after: "automation",
    cost: 12e4,
    days: 28,
    effect: "purchasing",
    amount: -0.06,
    detail: "Order what sells, when it sells. Less money sitting on the racks.",
    says: "Stock costs 6% less to buy"
  },
  // ------------------------------------------------------------- logistics
  {
    id: "fleet",
    branch: "logistics",
    name: "Fleet management",
    after: null,
    cost: 22e3,
    days: 14,
    effect: "logistics",
    amount: -0.1,
    detail: "Maintenance intervals, fuel cards and drivers who are not lost.",
    says: "Delivery and haulage cost 10% less"
  },
  {
    id: "routing",
    branch: "logistics",
    name: "Route optimisation",
    after: "fleet",
    cost: 6e4,
    days: 21,
    effect: "trips",
    amount: 0.25,
    detail: "One van, one round, in an order that makes sense.",
    says: "Each driver makes 25% more trips a day"
  },
  {
    id: "warehousing",
    branch: "logistics",
    name: "High-bay warehousing",
    after: "routing",
    cost: 14e4,
    days: 28,
    effect: "capacity",
    amount: 0.2,
    detail: "Taller racks, narrower aisles, and the trucks to reach the top.",
    says: "Distribution centres hold 20% more"
  },
  // ------------------------------------------------------------- marketing
  {
    id: "branding",
    branch: "marketing",
    name: "Branding",
    after: null,
    cost: 2e4,
    days: 14,
    effect: "awareness",
    amount: 0.15,
    detail: "A name people can picture, on everything you own.",
    says: "Awareness fades 15% more slowly"
  },
  {
    id: "advertising",
    branch: "marketing",
    name: "Advertising science",
    after: "branding",
    cost: 65e3,
    days: 21,
    effect: "awareness",
    amount: 0.15,
    detail: "Knowing which half of the budget is the wasted half.",
    says: "Awareness fades another 15% more slowly"
  },
  {
    id: "analytics",
    branch: "marketing",
    name: "Customer analytics",
    after: "advertising",
    cost: 15e4,
    days: 28,
    effect: "throughput",
    amount: 0.06,
    detail: "Stocking and staffing for who actually walks in, and when.",
    says: "Staff serve another 6% more customers an hour"
  },
  // ------------------------------------------------------------ technology
  {
    id: "ai",
    branch: "technology",
    name: "Forecasting models",
    after: null,
    cost: 9e4,
    days: 21,
    effect: "purchasing",
    amount: -0.05,
    detail: "Buying to a forecast instead of to a hunch.",
    says: "Stock costs another 5% less to buy"
  },
  {
    id: "robotics",
    branch: "technology",
    name: "Robotics",
    after: "ai",
    cost: 24e4,
    days: 35,
    effect: "capacity",
    amount: 0.25,
    detail: "Pickers that do not need a break, in racking they can reach.",
    says: "Distribution centres hold another 25%"
  },
  {
    id: "manufacturing",
    branch: "technology",
    name: "Advanced manufacturing",
    after: "robotics",
    cost: 48e4,
    days: 42,
    effect: "wages",
    amount: -0.08,
    detail: "Making more of what you sell, with fewer hands on it.",
    says: "The wage bill falls another 8%"
  },
  // -------------------------------------------------------- sustainability
  {
    id: "solar",
    branch: "sustainability",
    name: "Rooftop solar",
    after: null,
    cost: 45e3,
    days: 21,
    effect: "utilities",
    amount: -0.18,
    detail: "Panels on every roof you own or lease long enough to matter.",
    says: "Utilities cost 18% less"
  },
  {
    id: "battery",
    branch: "sustainability",
    name: "Battery storage",
    after: "solar",
    cost: 11e4,
    days: 28,
    effect: "utilities",
    amount: -0.14,
    detail: "Buy power when it is cheap, use it when it is not.",
    says: "Utilities cost another 14% less"
  },
  {
    id: "green-logistics",
    branch: "sustainability",
    name: "Electric fleet",
    after: "battery",
    cost: 26e4,
    days: 35,
    effect: "logistics",
    amount: -0.14,
    detail: "Electric vans, charged off your own roofs.",
    says: "Delivery and haulage cost another 14% less"
  }
];
var RESEARCH_BY_ID = new Map(RESEARCH.map((node2) => [node2.id, node2]));
function emptyResearch() {
  return { done: [], active: null };
}
function openBranches(state) {
  return BRANCHES.slice(0, researchBranches(state));
}
function isDone(state, id) {
  return state.research.done.includes(id);
}
function canStart(state, id) {
  const node2 = RESEARCH_BY_ID.get(id);
  if (!node2) return { ok: false, reason: "Unknown project." };
  if (isDone(state, id)) return { ok: false, reason: "Already done." };
  if (state.research.active) return { ok: false, reason: "Another project is running." };
  if (!openBranches(state).some((branch) => branch.id === node2.branch)) {
    return { ok: false, reason: `${levelOf(state).name} companies do not have a ${node2.branch} department yet.` };
  }
  if (node2.after && !isDone(state, node2.after)) {
    return { ok: false, reason: `${RESEARCH_BY_ID.get(node2.after)?.name ?? "The previous project"} comes first.` };
  }
  if (playerCompany(state).cash < node2.cost) {
    return { ok: false, reason: `It costs ${money(node2.cost)} and you have ${money(playerCompany(state).cash)}.` };
  }
  return { ok: true, reason: "" };
}
function startResearch(state, id) {
  const check = canStart(state, id);
  if (!check.ok) return { ok: false, message: check.reason };
  const node2 = RESEARCH_BY_ID.get(id);
  if (!node2) return { ok: false, message: "Unknown project." };
  post(state, state.playerCompanyId, "training", `R&D \u2014 ${node2.name}`, -node2.cost, null);
  const days = Math.max(1, Math.round(node2.days / researchSpeed(state)));
  state.research.active = { id, endsOnDay: state.day + days };
  return { ok: true, message: `${node2.name} started. ${days} days.` };
}
function researchDaily(state) {
  const active = state.research.active;
  if (!active || state.day < active.endsOnDay) return;
  const node2 = RESEARCH_BY_ID.get(active.id);
  state.research.active = null;
  if (!node2) return;
  state.research.done.push(node2.id);
  learn(state, "researched");
  pushNews(state, "company", `${node2.name} goes live`, `${node2.says}. ${node2.detail}`, { importance: "high" });
  pushAlert(state, "success", `R&D complete: ${node2.name}`, node2.says, null, "research");
}
function researchFactor(state, effect) {
  let factor2 = 1;
  for (const id of state.research?.done ?? []) {
    const node2 = RESEARCH_BY_ID.get(id);
    if (node2 && node2.effect === effect) factor2 *= 1 + node2.amount;
  }
  return factor2;
}
function researchProgress(state) {
  const active = state.research.active;
  if (!active) return 0;
  const node2 = RESEARCH_BY_ID.get(active.id);
  if (!node2) return 0;
  const left = active.endsOnDay - state.day;
  return Math.max(0, Math.min(1, 1 - left / node2.days));
}

// src/sim/employees.ts
var APPLICANT_POOL = 14;
var RECRUITMENT_FEE = 420;
function dailyWage(employee) {
  return employee.salary / 30;
}
function marketRate(state, employee) {
  return Math.round(
    rungRate(role(employee.role).baseSalary, gradeOf(employee).n, employee.skill) * state.economy.inflation
  );
}
function rollTraits() {
  const count2 = gameRng.chance(0.35) ? 2 : 1;
  const picked = gameRng.sample(TRAITS, count2);
  return picked.map((t) => t.id);
}
function generateApplicant(state, forcedRole) {
  const roleDef = forcedRole ? role(forcedRole) : gameRng.pick(ROLES);
  const skill = Math.round(clamp(gameRng.around(52, 26), 8, 99));
  let startGrade = 0;
  for (const step of GRADES) {
    if (step.n === 0) continue;
    if (skill >= step.skill && (step.leadership === 0 || skill >= step.leadership)) startGrade = step.n;
    else break;
  }
  if (roleDef.id !== "manager") startGrade = Math.min(startGrade, TOP_OF_TRADE);
  else startGrade = Math.max(5, Math.min(startGrade, 6));
  const experience = Math.round(clamp(gameRng.around(skill / 12, 4), 0, 30));
  const traits = rollTraits();
  const traitDefs = traits.map(trait);
  const productivityMod = traitDefs.reduce((acc, t) => acc * t.productivity, 1);
  const reliabilityMod = traitDefs.reduce((acc, t) => acc * t.reliability, 1);
  const salaryMod = traitDefs.reduce((acc, t) => acc * t.salaryExpectation, 1);
  const marketPressure = 1 + clamp(0.08 - state.economy.unemployment, -0.05, 0.09) * 2.2;
  const skills = profileFor(skill, roleDef.id, (min, max) => gameRng.range(min, max));
  return {
    id: makeId("emp"),
    name: `${gameRng.pick(FIRST_NAMES)} ${gameRng.pick(LAST_NAMES)}`,
    age: Math.round(clamp(19 + experience + gameRng.range(0, 14), 18, 64)),
    role: roleDef.id,
    grade: startGrade,
    salary: Math.round(
      rungRate(roleDef.baseSalary, startGrade, skill) * salaryMod * marketPressure * state.economy.inflation / 10
    ) * 10,
    skill: Math.round(overallSkill(skills)),
    skills,
    workload: 40,
    experience,
    productivity: Math.round(clamp(gameRng.around(skill, 14) * productivityMod, 10, 100)),
    reliability: Math.round(clamp(gameRng.around(80, 16) * reliabilityMod, 25, 100)),
    morale: Math.round(clamp(gameRng.around(72, 12), 30, 100)),
    stress: Math.round(clamp(gameRng.around(24, 12), 0, 70)),
    loyalty: Math.round(clamp(gameRng.around(50, 20), 5, 100)),
    traits,
    businessId: null,
    companyId: null,
    hiredOnDay: 0,
    trainingDays: 0,
    trainingEndsOnDay: null,
    trainingCourseId: null,
    sickUntilDay: null,
    promotions: 0,
    lastRecognisedOnDay: 0
  };
}
function refreshApplicants(state) {
  const needed = [];
  for (const business of state.businesses) {
    if (business.companyId !== state.playerCompanyId) continue;
    for (const roleId of businessTypeOrThrow(business.typeId).roles) {
      if (!needed.includes(roleId)) needed.push(roleId);
    }
  }
  const pool = [];
  for (const roleId of needed.slice(0, Math.floor(APPLICANT_POOL / 2))) {
    pool.push(generateApplicant(state, roleId));
  }
  while (pool.length < APPLICANT_POOL) pool.push(generateApplicant(state));
  state.applicants = pool;
}
function applicantsFor(state, business) {
  const type = businessTypeOrThrow(business.typeId);
  const wanted = new Set(type.roles);
  return state.applicants.filter((applicant) => wanted.has(applicant.role));
}
function staffCapacityOf(business) {
  const type = businessTypeOrThrow(business.typeId);
  return Math.max(2, type.roles.length * 3);
}
function hire(state, applicantId, businessId) {
  const applicant = state.applicants.find((a) => a.id === applicantId);
  if (!applicant) return { ok: false, message: "That applicant is no longer available." };
  const business = state.businesses.find((b) => b.id === businessId);
  if (!business) return { ok: false, message: "Unknown business." };
  if (business.companyId !== state.playerCompanyId) return { ok: false, message: "That is not your business." };
  if (employeesOf(state, businessId).length >= staffCapacityOf(business)) {
    return { ok: false, message: `${business.name} cannot take on more staff.` };
  }
  const company = playerCompany(state);
  const fee = recruitmentFee(state);
  const upfront = fee + dailyWage(applicant) * 7;
  if (company.cash < upfront) {
    return { ok: false, message: `You need \u20AC${Math.round(upfront)} in cash to take someone on.` };
  }
  applicant.businessId = businessId;
  applicant.companyId = company.id;
  applicant.hiredOnDay = state.day;
  applicant.lastRecognisedOnDay = state.day;
  state.employees.push(applicant);
  business.employeeIds.push(applicant.id);
  state.applicants = state.applicants.filter((a) => a.id !== applicantId);
  state.applicants.push(generateApplicant(state));
  learn(state, "hired");
  post(state, company.id, "recruitment", `Recruitment \u2014 ${applicant.name}`, -fee, businessId);
  return { ok: true, message: `${applicant.name} hired as ${role(applicant.role).name}.` };
}
function fire(state, employeeId) {
  const employee = state.employees.find((e) => e.id === employeeId);
  if (!employee) return { ok: false, message: "Employee not found." };
  const company = playerCompany(state);
  const years = (state.day - employee.hiredOnDay) / 360;
  const severance = Math.round(employee.salary * clamp(0.5 + years * 0.2, 0.5, 3));
  if (company.cash < severance) {
    return { ok: false, message: `Severance of \u20AC${severance.toLocaleString("en-GB")} exceeds available cash.` };
  }
  removeEmployee(state, employeeId);
  learn(state, "letGo");
  post(state, company.id, "severance", `Severance \u2014 ${employee.name}`, -severance, employee.businessId);
  for (const colleague of state.employees.filter((e) => e.businessId === employee.businessId)) {
    colleague.morale = clamp(colleague.morale - 4, 0, 100);
  }
  return { ok: true, message: `${employee.name} left. Severance \u20AC${severance.toLocaleString("en-GB")}.` };
}
function removeEmployee(state, employeeId) {
  const employee = state.employees.find((e) => e.id === employeeId);
  state.employees = state.employees.filter((e) => e.id !== employeeId);
  if (!employee?.businessId) return;
  const business = state.businesses.find((b) => b.id === employee.businessId);
  if (business) business.employeeIds = business.employeeIds.filter((id) => id !== employeeId);
}
function setSalary(state, employeeId, salary) {
  const employee = state.employees.find((e) => e.id === employeeId);
  if (!employee) return { ok: false, message: "Employee not found." };
  const band = marketRate(state, employee);
  const next = Math.round(clamp(salary, band * 0.5, band * 2.6) / 10) * 10;
  const change = next - employee.salary;
  employee.salary = next;
  if (change > 0) {
    employee.morale = clamp(employee.morale + change / band * 45, 0, 100);
    employee.loyalty = clamp(employee.loyalty + change / band * 30, 0, 100);
    return { ok: true, message: `${employee.name} accepted the raise.` };
  }
  employee.morale = clamp(employee.morale + change / band * 70, 0, 100);
  employee.loyalty = clamp(employee.loyalty + change / band * 60, 0, 100);
  return { ok: true, message: `${employee.name} was not pleased about the pay cut.` };
}
function startTraining(state, employeeId, courseId) {
  const employee = state.employees.find((e) => e.id === employeeId);
  if (!employee) return { ok: false, message: "Employee not found." };
  if (employee.trainingEndsOnDay !== null) return { ok: false, message: "Already in training." };
  if (isOffSick(state, employee)) return { ok: false, message: `${employee.name} is off sick.` };
  const course = (courseId ? COURSE_BY_ID.get(courseId) : void 0) ?? suggestedCourse(employee);
  const cost = trainingCost(course);
  const company = playerCompany(state);
  if (company.cash < cost) return { ok: false, message: `${course.name} costs ${money(cost)}.` };
  learn(state, "trained");
  employee.trainingEndsOnDay = state.day + course.days;
  employee.trainingCourseId = course.id;
  post(state, company.id, "training", `${course.name} \u2014 ${employee.name}`, -cost, employee.businessId);
  return {
    ok: true,
    message: `${employee.name} starts ${course.name.toLowerCase()} \u2014 ${course.days} days off the floor, ${money(cost)}.`
  };
}
function trainingCost(course) {
  return course.days * course.costPerDay;
}
function transfer(state, employeeId, businessId) {
  const employee = state.employees.find((e) => e.id === employeeId);
  const target = state.businesses.find((b) => b.id === businessId);
  if (!employee || !target) return { ok: false, message: "Unknown employee or business." };
  if (target.companyId !== state.playerCompanyId) return { ok: false, message: "That is not your business." };
  if (employeesOf(state, businessId).length >= staffCapacityOf(target)) {
    return { ok: false, message: `${target.name} is fully staffed.` };
  }
  const previous = state.businesses.find((b) => b.id === employee.businessId);
  if (previous) previous.employeeIds = previous.employeeIds.filter((id) => id !== employeeId);
  employee.businessId = businessId;
  target.employeeIds.push(employeeId);
  employee.morale = clamp(employee.morale - 3, 0, 100);
  return { ok: true, message: `${employee.name} moved to ${target.name}.` };
}
var ROLE_WEIGHTS = {
  cashier: { capacity: 1.15, service: 0.08 },
  sales: { capacity: 0.85, service: 0.45 },
  server: { capacity: 1, service: 0.55 },
  cook: { capacity: 1.1, service: 0.5 },
  technician: { capacity: 0.95, service: 0.5 },
  cleaner: { capacity: 0.75, service: 0.6 },
  warehouse: { capacity: 0.5, service: 0.05 },
  driver: { capacity: 0.75, service: 0.05 },
  marketer: { capacity: 0.1, service: 0.15 },
  accountant: { capacity: 0.1, service: 0.1 },
  manager: { capacity: 0.15, service: 0.4, manager: true },
  // Central people do almost nothing on a shop floor. What they are worth is
  // what they do for the whole company from a head office.
  hr: { capacity: 0.06, service: 0.12 },
  it: { capacity: 0.12, service: 0.06 },
  legal: { capacity: 0.04, service: 0.06 }
};
function staffPower(state, business) {
  const type = businessTypeOrThrow(business.typeId);
  const staff = employeesOf(state, business.id);
  const result = {
    capacityPerHour: 0,
    service: 0.55,
    present: 0,
    headcount: staff.length,
    morale: 0,
    performance: 0
  };
  if (staff.length === 0) return result;
  let capacity = 0;
  let service = 0;
  let managers = 0;
  let moraleTotal = 0;
  for (const employee of staff) {
    moraleTotal += employee.morale;
    if (employee.trainingEndsOnDay !== null) continue;
    if (isOffSick(state, employee)) continue;
    const attendance = clamp((employee.reliability - employee.stress * 0.35) / 100, 0.3, 0.99);
    if (!gameRng.chance(attendance)) continue;
    result.present += 1;
    const contribution = performanceOf(employee) / 100;
    const weights = ROLE_WEIGHTS[employee.role];
    const manner = employee.traits.reduce((acc, id) => acc * trait(id).service, 1);
    if (weights.manager || gradeOf(employee).managerial || gradeOf(employee).n === 3) {
      managers += contribution * gradeOf(employee).n * 0.25;
    }
    capacity += contribution * weights.capacity;
    service += contribution * weights.service * manner;
  }
  const managerBoost = 1 + clamp(managers, 0, 2.5) * 0.16;
  result.capacityPerHour = capacity * type.customersPerStaffHour * managerBoost;
  result.service = clamp(0.55 + service * 0.32 * managerBoost, 0.35, 1.45);
  result.morale = moraleTotal / staff.length / 100;
  result.performance = sum(staff, (person) => performanceOf(person)) / staff.length;
  return result;
}
function isOffSick(state, employee) {
  return employee.sickUntilDay !== null && state.day < employee.sickUntilDay;
}
function sickDaysLeft(state, employee) {
  if (!isOffSick(state, employee)) return 0;
  return Math.max(0, (employee.sickUntilDay ?? 0) - state.day);
}
function promotionTarget(employee) {
  const next = GRADES[gradeOf(employee).n + 1];
  return next ?? null;
}
function roleTitle(employee) {
  return titleOf(employee);
}
function quotePromotion(state, employee) {
  const target = promotionTarget(employee);
  if (!target) {
    return {
      grade: null,
      role: employee.role,
      title: titleOf(employee),
      salary: employee.salary,
      extra: 0,
      blocked: "There is nothing above Executive."
    };
  }
  const nextRole = target.managerial ? "manager" : employee.role;
  const base2 = role(nextRole).baseSalary * state.economy.inflation;
  const salary = Math.max(
    employee.salary + 40,
    Math.round(rungRate(base2, target.n, employee.skill) / 10) * 10
  );
  const preview = { ...employee, grade: target.n, role: nextRole };
  const quote = {
    grade: target,
    role: nextRole,
    title: titleOf(preview),
    salary,
    extra: salary - employee.salary,
    blocked: gradeBlocker(employee, target)
  };
  if (!quote.blocked && state.day - employee.hiredOnDay < 20) {
    quote.blocked = "They have not been here long enough.";
  } else if (!quote.blocked && state.day - employee.lastRecognisedOnDay < 30) {
    quote.blocked = "They were recognised recently.";
  }
  return quote;
}
function promote(state, employeeId) {
  const employee = state.employees.find((e) => e.id === employeeId);
  if (!employee) return { ok: false, message: "Unknown employee." };
  const quote = quotePromotion(state, employee);
  if (quote.blocked) return { ok: false, message: quote.blocked };
  if (!quote.grade) return { ok: false, message: "There is nothing above Executive." };
  const from = titleOf(employee);
  const steppingUp = quote.role !== employee.role;
  employee.grade = quote.grade.n;
  employee.role = quote.role;
  employee.salary = quote.salary;
  employee.promotions += 1;
  learn(state, "promoted");
  employee.lastRecognisedOnDay = state.day;
  employee.morale = clamp(employee.morale + 20, 0, 100);
  employee.loyalty = clamp(employee.loyalty + 26, 0, 100);
  employee.stress = clamp(employee.stress + (steppingUp ? 12 : 6), 0, 100);
  const title = titleOf(employee);
  pushNews(state, "staff", `${employee.name} promoted to ${title}`, `From ${from}, on ${money(employee.salary)} a month.`, {
    businessId: employee.businessId
  });
  return { ok: true, message: `${employee.name} is now ${title} on ${money(employee.salary)} a month.` };
}
var BONUS_MONTHS = 0.5;
function payBonus(state, employeeId) {
  const employee = state.employees.find((e) => e.id === employeeId);
  if (!employee) return { ok: false, message: "Unknown employee." };
  const amount = Math.round(employee.salary * BONUS_MONTHS / 10) * 10;
  const company = playerCompany(state);
  if (company.cash < amount) return { ok: false, message: `You need ${money(amount)} in the bank for that.` };
  post(state, company.id, "wages", `Bonus \u2014 ${employee.name}`, -amount, employee.businessId);
  employee.morale = clamp(employee.morale + 16, 0, 100);
  employee.loyalty = clamp(employee.loyalty + 12, 0, 100);
  employee.stress = clamp(employee.stress - 8, 0, 100);
  employee.lastRecognisedOnDay = state.day;
  return { ok: true, message: `${employee.name} received ${money(amount)}.` };
}
function sicknessSpell(employee) {
  const base2 = employee.stress > 70 ? 3 : 2;
  return base2 + (gameRng.chance(0.25) ? 1 : 0);
}
function peopleEvents(state, employee) {
  if (employee.sickUntilDay !== null && state.day >= employee.sickUntilDay) {
    employee.sickUntilDay = null;
    employee.stress = clamp(employee.stress - 12, 0, 100);
  }
  if (employee.sickUntilDay === null && employee.businessId) {
    const chance = clamp(4e-3 + employee.stress / 100 * 0.03 + (60 - employee.morale) / 4e3, 2e-3, 0.05);
    if (gameRng.chance(chance)) {
      const days = sicknessSpell(employee);
      employee.sickUntilDay = state.day + days;
      pushNews(state, "staff", `${employee.name} has called in sick`, `Off for about ${days} day${days === 1 ? "" : "s"}. Stress was ${Math.round(employee.stress)}/100.`, {
        businessId: employee.businessId
      });
      if (employee.stress > 70) {
        pushAlert(
          state,
          "warning",
          `${employee.name} is off sick`,
          "They were running at very high stress. Another pair of hands or shorter hours would stop this repeating.",
          employee.businessId
        );
      }
      return;
    }
  }
  if (!employee.businessId) return;
  if (employee.traits.includes("ambitious")) {
    const waited = state.day - Math.max(employee.lastRecognisedOnDay, employee.hiredOnDay);
    if (waited > 45 && employee.skill > 50) {
      employee.morale = clamp(employee.morale - 0.8, 0, 100);
      employee.loyalty = clamp(employee.loyalty - 0.6, 0, 100);
      if (waited === 60) {
        pushNews(state, "staff", `${employee.name} wants to know where this is going`, "Two months without a promotion or a rise, and they are ambitious. Recognise them or lose them.", {
          businessId: employee.businessId,
          importance: "high"
        });
        pushAlert(
          state,
          "warning",
          `${employee.name} is looking for a step up`,
          "Promote them, give them a bonus, or expect a resignation.",
          employee.businessId
        );
      }
    }
  }
  if (employee.traits.includes("difficult") && employee.morale < 45 && gameRng.chance(0.05)) {
    const colleagues = employeesOf(state, employee.businessId).filter((e) => e.id !== employee.id);
    if (colleagues.length > 0) {
      const worst = colleagues.reduce((a, b) => b.morale < a.morale ? b : a);
      pushNews(state, "staff", `A row at ${state.businesses.find((b) => b.id === employee.businessId)?.name ?? "work"}`, `${employee.name} fell out with ${worst.name}. Morale across the team has taken a knock.`, {
        businessId: employee.businessId
      });
    }
  }
}
function employeesDaily(state) {
  for (const employee of [...state.employees]) {
    const traitDefs = employee.traits.map(trait);
    const business = state.businesses.find((b) => b.id === employee.businessId);
    if (employee.trainingEndsOnDay !== null && state.day >= employee.trainingEndsOnDay) {
      const learning = traitDefs.reduce((acc, t) => acc * t.learning, 1);
      const gain = 13 * learning / (1 + employee.trainingDays * 0.4);
      const course = employee.trainingCourseId ? COURSE_BY_ID.get(employee.trainingCourseId) : void 0;
      if (course) {
        employee.skills[course.skill] = clamp(employee.skills[course.skill] + gain, 0, 100);
      } else {
        for (const id of SKILL_IDS) employee.skills[id] = clamp(employee.skills[id] + gain / 3, 0, 100);
      }
      syncOverall(employee);
      employee.productivity = clamp(employee.productivity + gain * 0.5, 0, 100);
      employee.trainingDays += 1;
      employee.trainingEndsOnDay = null;
      employee.trainingCourseId = null;
      employee.morale = clamp(employee.morale + 5, 0, 100);
      pushAlert(
        state,
        "info",
        `${employee.name} finished ${course ? course.name.toLowerCase() : "training"}`,
        course ? `${SKILLS.find((s) => s.id === course.skill)?.name ?? "Their skill"} is now ${Math.round(employee.skills[course.skill])}.` : `Skill is now ${Math.round(employee.skill)}.`,
        employee.businessId
      );
    }
    const payRatio = employee.salary / Math.max(1, marketRate(state, employee));
    const payEffect = clamp((payRatio - 1) * 30, -16, 14);
    const moraleDrift = traitDefs.reduce((acc, t) => acc + t.moraleDrift, 0);
    employee.workload = business ? workloadOf(state, business) : 20;
    const pressure = clamp((employee.workload - 55) * 0.32, -5, 14);
    const takesIt = traitDefs.reduce((acc, t) => acc * t.stress, 1);
    employee.stress = clamp(employee.stress + pressure * 0.5 * takesIt - 2 + gameRng.range(-2, 2), 0, 100);
    const colleagues = business ? employeesOf(state, business.id) : [];
    const fromColleagues = clamp(
      sum(
        colleagues.filter((other) => other.id !== employee.id),
        (other) => sum(other.traits.map(trait), (t) => t.teamMorale)
      ),
      -1.6,
      1.2
    );
    const settlesAt = clamp(
      68 + moraleFromOwner(state) + mergerMoraleDrag(state, employee) + payEffect * 1.6 + moraleDrift * 10 + fromColleagues * 8 - Math.max(0, employee.workload - 60) * 0.5 - employee.stress * 0.22,
      0,
      100
    );
    employee.morale = clamp(approach(employee.morale, settlesAt, 0.06) + gameRng.range(-1.2, 1.2), 0, 100);
    employee.loyalty = clamp(employee.loyalty + (employee.morale - 55) * 0.05, 0, 100);
    employee.experience += 1 / 360;
    peopleEvents(state, employee);
    const leaving = traitDefs.reduce((acc, t) => acc * t.turnover, 1);
    const risk = clamp((35 - employee.morale) / 260 + (30 - employee.loyalty) / 900, 0, 0.22) * retentionFactor(state) * leaving;
    if (employee.morale < 38 && gameRng.chance(risk)) {
      removeEmployee(state, employee.id);
      pushNews(state, "staff", `${employee.name} has resigned`, `Morale had fallen to ${Math.round(employee.morale)}/100.`, {
        businessId: employee.businessId,
        importance: "high"
      });
      const left = state.businesses.find((b) => b.id === employee.businessId);
      if (left && left.status === "open" && employeesOf(state, left.id).length === 0) {
        pushAlert(
          state,
          "critical",
          `${left.name} has nobody working there`,
          "You are covering it yourself, which serves about half of what one member of staff could. Hire somebody today.",
          left.id
        );
      }
      pushAlert(
        state,
        "warning",
        `${employee.name} resigned`,
        `Morale had fallen to ${Math.round(employee.morale)}. Pay, workload or management is the usual cause.`,
        employee.businessId
      );
    }
  }
  const replace = Math.min(4, state.applicants.length);
  state.applicants.splice(0, replace);
  refreshTail(state, replace);
}
function payWages(state) {
  let total2 = 0;
  for (const business of state.businesses) {
    if (business.companyId !== state.playerCompanyId) continue;
    const staff = employeesOf(state, business.id);
    const amount = staff.reduce((acc, e) => acc + dailyWage(e), 0) * researchFactor(state, "wages");
    if (amount <= 0) continue;
    business.today.wages += amount;
    post(state, business.companyId, "wages", `Wages \u2014 ${business.name}`, -amount, business.id);
    total2 += amount;
  }
  return total2;
}
function refreshTail(state, count2) {
  const needed = [];
  for (const business of state.businesses) {
    if (business.companyId !== state.playerCompanyId) continue;
    for (const roleId of businessTypeOrThrow(business.typeId).roles) {
      if (!needed.includes(roleId)) needed.push(roleId);
    }
  }
  for (let i = 0; i < count2; i += 1) {
    const forced = needed.length > 0 && gameRng.chance(0.55) ? gameRng.pick(needed) : void 0;
    state.applicants.push(generateApplicant(state, forced));
  }
}

// src/sim/headOffice.ts
var FUNCTIONS = [
  {
    id: "hr",
    name: "Human resources",
    detail: "Finding people, keeping people, and noticing before they go.",
    role: "hr",
    perLocation: 0.4,
    outsourcePerLocation: 900,
    outsourceEffect: 0.55,
    says: "Recruitment costs half as much and people are far less likely to walk"
  },
  {
    id: "finance",
    name: "Finance",
    detail: "The books, the bills, and the part of the tax return nobody enjoys.",
    role: "accountant",
    perLocation: 0.35,
    outsourcePerLocation: 1100,
    outsourceEffect: 0.6,
    says: "Coordination costs 45% less and the tax bill 10%"
  },
  {
    id: "marketing",
    name: "Marketing",
    detail: "One brand across every shop, instead of each one shouting alone.",
    role: "marketer",
    perLocation: 0.45,
    outsourcePerLocation: 1400,
    outsourceEffect: 0.5,
    says: "Every euro of campaign spend buys 35% more awareness"
  },
  {
    id: "it",
    name: "IT and systems",
    detail: "Ordering, rotas and stock counts that do not need a person.",
    role: "it",
    perLocation: 0.35,
    outsourcePerLocation: 1250,
    outsourceEffect: 0.6,
    says: "Support roles need one fewer person, and coordination costs 25% less"
  },
  {
    id: "legal",
    name: "Legal",
    detail: "Contracts read before they are signed rather than after.",
    role: "legal",
    perLocation: 0.3,
    outsourcePerLocation: 950,
    outsourceEffect: 0.65,
    says: "Contract penalties are halved"
  }
];
var FUNCTION_BY_ID = new Map(FUNCTIONS.map((f) => [f.id, f]));
function emptyOutsourcing() {
  return { hr: false, finance: false, marketing: false, it: false, legal: false };
}
function emptyAutomation() {
  return { hr: 0, finance: 0, marketing: 0, it: 0, legal: 0 };
}
var HQ_FIT_OUT = 24e3;
var HQ_LEVELS = [
  { n: 1, name: "Back office", upgrade: 0, running: 0, desks: 4, reach: 1, automationCap: 1, detail: "A room with desks in it. Enough for a company of two or three shops." },
  { n: 2, name: "Support floor", upgrade: 38e3, running: 1400, desks: 8, reach: 1.12, automationCap: 2, detail: "Separate desks for separate jobs, and somewhere to put a server." },
  { n: 3, name: "Head office", upgrade: 95e3, running: 3200, desks: 14, reach: 1.26, automationCap: 2, detail: "A floor of its own. The shops start ringing here instead of each other." },
  { n: 4, name: "Corporate centre", upgrade: 24e4, running: 7500, desks: 24, reach: 1.42, automationCap: 3, detail: "Departments rather than people. Things get decided here now." },
  { n: 5, name: "Group headquarters", upgrade: 62e4, running: 16e3, desks: 40, reach: 1.6, automationCap: 3, detail: "The company has an address, and this is it." }
];
function hqLevel(state) {
  const n = clamp(state.headOffice?.level ?? 1, 1, HQ_LEVELS.length);
  return HQ_LEVELS[n - 1];
}
function nextHqLevel(state) {
  return HQ_LEVELS[hqLevel(state).n] ?? null;
}
function upgradeHeadOffice(state) {
  const hq = state.headOffice;
  if (!hq) return { ok: false, message: "You have no head office." };
  const next = nextHqLevel(state);
  if (!next) return { ok: false, message: "This is already a group headquarters." };
  const company = playerCompany(state);
  if (company.cash < next.upgrade) {
    return { ok: false, message: `Fitting out a ${next.name.toLowerCase()} costs ${money(next.upgrade)}.` };
  }
  post(state, company.id, "equipment", `Head office fit-out \u2014 ${next.name}`, -next.upgrade, null);
  hq.level = next.n;
  pushNews(state, "company", `${hq.name} is now a ${next.name.toLowerCase()}`, `${next.detail} ${money(next.running)} a month to run, and ${next.desks} desks.`, {
    importance: "high"
  });
  return { ok: true, message: `${hq.name} is now a ${next.name.toLowerCase()}. ${next.desks} desks.` };
}
var STANCES = [
  {
    id: "local",
    name: "Run by the shops",
    detail: "Each manager decides for their own street. Quick to react, expensive to coordinate, and nothing is ever done the same way twice.",
    central: 0.6,
    local: 1.12,
    coordination: 1.25
  },
  {
    id: "hybrid",
    name: "Shared",
    detail: "The centre owns the systems, the shops own the customers. Neither the cheapest nor the sharpest.",
    central: 1,
    local: 1,
    coordination: 1
  },
  {
    id: "central",
    name: "Run from the centre",
    detail: "One way of doing things everywhere. Cheap to run and slow to notice that one district is not like the others.",
    central: 1.3,
    local: 0.88,
    coordination: 0.72
  }
];
function stanceOf(state) {
  const id = state.headOffice?.stance ?? "hybrid";
  return STANCES.find((s) => s.id === id) ?? STANCES[1];
}
function setStance(state, id) {
  const hq = state.headOffice;
  if (!hq) return { ok: false, message: "You have no head office." };
  const def = STANCES.find((s) => s.id === id);
  if (!def) return { ok: false, message: "Unknown way of running it." };
  hq.stance = id;
  for (const person of state.employees.filter((e) => e.companyId === state.playerCompanyId)) {
    person.morale = clamp(person.morale - 2, 0, 100);
  }
  return { ok: true, message: `${def.name}. ${def.detail}` };
}
function localResponsiveness(state) {
  if (!state.headOffice) return 1;
  return stanceOf(state).local;
}
var AUTOMATION_TIERS = [
  { n: 0, name: "By hand", cost: 0, running: 0, detail: "Somebody does it, every time." },
  { n: 1, name: "Assisted", cost: 26e3, running: 320, detail: "The repetitive half is done for them." },
  { n: 2, name: "Automated", cost: 88e3, running: 900, detail: "It happens without anybody starting it." },
  { n: 3, name: "Self-running", cost: 26e4, running: 2400, detail: "Nobody thinks about it until it breaks." }
];
function automationTier(state, id) {
  return clamp(state.headOffice?.automation[id] ?? 0, 0, 3);
}
function automationCover(state, id) {
  return automationTier(state, id) * 0.18;
}
function canAutomate(state, id) {
  const hq = state.headOffice;
  if (!hq) return { ok: false, message: "Systems like that need a head office to run from." };
  const tier = automationTier(state, id);
  const next = AUTOMATION_TIERS[tier + 1];
  if (!next) return { ok: false, message: "This function is as automated as it gets." };
  const cap = hqLevel(state).automationCap;
  if (next.n > cap) {
    return { ok: false, message: `A ${hqLevel(state).name.toLowerCase()} cannot carry that. Upgrade the head office first.` };
  }
  if (playerCompany(state).cash < next.cost) {
    return { ok: false, message: `${next.name} systems cost ${money(next.cost)} to put in.` };
  }
  return { ok: true, message: "" };
}
function investInAutomation(state, id) {
  const check = canAutomate(state, id);
  if (!check.ok) return check;
  const hq = state.headOffice;
  const def = FUNCTION_BY_ID.get(id);
  if (!hq || !def) return { ok: false, message: "Unknown function." };
  const next = AUTOMATION_TIERS[automationTier(state, id) + 1];
  post(state, state.playerCompanyId, "equipment", `${def.name} systems \u2014 ${next.name}`, -next.cost, null);
  hq.automation[id] = next.n;
  pushNews(state, "company", `${def.name} is now ${next.name.toLowerCase()}`, `${next.detail} ${money(next.cost)} to put in, ${money(next.running)} a month to keep running.`, {});
  return { ok: true, message: `${def.name}: ${next.name.toLowerCase()}. ${next.detail}` };
}
function overheadBill(state) {
  if (!state.headOffice) return 0;
  const systems = sum(FUNCTIONS, (def) => AUTOMATION_TIERS[automationTier(state, def.id)].running);
  return hqLevel(state).running + systems;
}
function centralStaff(state) {
  const hq = state.headOffice;
  if (!hq) return [];
  return state.employees.filter((person) => person.businessId === hq.id);
}
function coverNeeded(state, def) {
  const locations = Math.max(1, playerBusinesses(state).filter((b) => b.status === "open").length);
  return Math.max(1, Math.ceil(0.4 + locations * def.perLocation));
}
function outsourceCost(state, def) {
  const locations = Math.max(1, playerBusinesses(state).filter((b) => b.status === "open").length);
  return Math.round(def.outsourcePerLocation * (0.6 + locations * 0.55));
}
function functionState(state, id) {
  const def = FUNCTION_BY_ID.get(id);
  if (!def) throw new Error(`Unknown central function: ${id}`);
  const hq = state.headOffice;
  const outsourced = hq?.outsourced[id] ?? false;
  const people2 = centralStaff(state).filter((person) => person.role === def.role);
  const needed = coverNeeded(state, def);
  const fromSystems = hq ? automationCover(state, id) : 0;
  const automation = automationTier(state, id);
  const stance = stanceOf(state);
  if (outsourced) {
    return {
      def,
      people: people2,
      needed,
      cover: clamp(def.outsourceEffect * stance.central + fromSystems, 0, 1),
      fromSystems,
      automation,
      outsourced: true,
      cost: outsourceCost(state, def)
    };
  }
  if (!hq) {
    return { def, people: people2, needed, cover: 0, fromSystems: 0, automation: 0, outsourced: false, cost: 0 };
  }
  const quality = people2.length > 0 ? sum(people2, (person) => performanceOf(person) / 70) / people2.length : 0;
  const staffed = people2.length > 0 ? people2.length / needed * clamp(quality, 0.4, 1.15) * hqLevel(state).reach : 0;
  const cover2 = clamp(staffed * stance.central + fromSystems, 0, 1);
  return {
    def,
    people: people2,
    needed,
    cover: cover2,
    fromSystems,
    automation,
    outsourced: false,
    cost: sum(people2, (p2) => p2.salary)
  };
}
function functionStates(state) {
  return FUNCTIONS.map((def) => functionState(state, def.id));
}
function cover(state, id) {
  if (!state.headOffice) return 0;
  return functionState(state, id).cover;
}
function recruitmentFee(state) {
  return Math.round(RECRUITMENT_FEE * (1 - cover(state, "hr") * 0.5));
}
function retentionFactor(state) {
  return 1 - cover(state, "hr") * 0.35;
}
function coordinationFactor(state) {
  const central = clamp(1 - cover(state, "finance") * 0.45 - cover(state, "it") * 0.25, 0.3, 1);
  return clamp(central * (state.headOffice ? stanceOf(state).coordination : 1), 0.2, 1.3);
}
function taxFactor(state) {
  return 1 - cover(state, "finance") * 0.1;
}
function marketingFactor(state) {
  return 1 + cover(state, "marketing") * 0.35;
}
function automationRelief(state) {
  return cover(state, "it");
}
function penaltyFactor(state) {
  return 1 - cover(state, "legal") * 0.5;
}
function canOpenHeadOffice(state, buildingId) {
  if (state.headOffice) return { ok: false, message: "You already have a head office." };
  const building = buildingById(state, buildingId);
  if (!building) return { ok: false, message: "Unknown building." };
  if (building.occupantCompanyId !== state.playerCompanyId) {
    return { ok: false, message: "Rent or buy the building first." };
  }
  if (building.businessId) return { ok: false, message: "There is a business trading in this unit." };
  if (state.warehouses.some((w) => w.buildingId === buildingId)) {
    return { ok: false, message: "This unit is a distribution centre." };
  }
  if (playerCompany(state).cash < HQ_FIT_OUT) {
    return { ok: false, message: `Fitting out a head office costs ${money(HQ_FIT_OUT)}.` };
  }
  return { ok: true, message: "" };
}
function openHeadOffice(state, buildingId, name) {
  const check = canOpenHeadOffice(state, buildingId);
  if (!check.ok) return check;
  const company = playerCompany(state);
  const building = buildingById(state, buildingId);
  if (!building) return { ok: false, message: "Unknown building." };
  post(state, company.id, "equipment", `Head office fit-out \u2014 ${building.address}`, -HQ_FIT_OUT, null);
  state.headOffice = {
    id: makeId("hq"),
    companyId: company.id,
    buildingId,
    name: name.trim().slice(0, 40) || `${company.name} Head Office`,
    openedOnDay: state.day,
    employeeIds: [],
    outsourced: emptyOutsourcing(),
    level: 1,
    stance: "hybrid",
    automation: emptyAutomation()
  };
  pushNews(
    state,
    "company",
    `${state.headOffice.name} opens at ${building.address}`,
    "Personnel, the books, the brand and the systems can be run once for the whole company instead of separately in every shop.",
    { importance: "high" }
  );
  return { ok: true, message: `${state.headOffice.name} is open at ${building.address}.` };
}
function closeHeadOffice(state) {
  const hq = state.headOffice;
  if (!hq) return { ok: false, message: "There is no head office." };
  const staff = centralStaff(state);
  if (staff.length > 0) {
    return { ok: false, message: `Move or let go of the ${staff.length} people there first.` };
  }
  state.headOffice = null;
  pushNews(state, "company", `${hq.name} has closed`, "Everything it did centrally goes back to being done in the shops, or not at all.", {});
  return { ok: true, message: `${hq.name} is closed.` };
}
function hireToHeadOffice(state, applicantId) {
  const hq = state.headOffice;
  if (!hq) return { ok: false, message: "You have no head office." };
  const applicant = state.applicants.find((a) => a.id === applicantId);
  if (!applicant) return { ok: false, message: "That applicant is no longer available." };
  if (!FUNCTIONS.some((def) => def.role === applicant.role)) {
    return { ok: false, message: "A head office needs HR, finance, marketing, IT or legal people." };
  }
  const desks = hqLevel(state).desks;
  if (centralStaff(state).length >= desks) {
    return {
      ok: false,
      message: `A ${hqLevel(state).name.toLowerCase()} has ${desks} desks and they are all taken. Upgrade the head office to make room.`
    };
  }
  const company = playerCompany(state);
  const fee = recruitmentFee(state);
  const upfront = fee + applicant.salary / 30 * 7;
  if (company.cash < upfront) {
    return { ok: false, message: `You need ${money(upfront)} in cash to take someone on.` };
  }
  applicant.businessId = hq.id;
  applicant.companyId = company.id;
  applicant.hiredOnDay = state.day;
  applicant.lastRecognisedOnDay = state.day;
  state.employees.push(applicant);
  hq.employeeIds.push(applicant.id);
  state.applicants = state.applicants.filter((a) => a.id !== applicantId);
  state.applicants.push(generateApplicant(state));
  post(state, company.id, "recruitment", `Recruitment \u2014 ${applicant.name}`, -fee, null);
  return { ok: true, message: `${applicant.name} joins ${hq.name} as ${role(applicant.role).name}.` };
}
function setOutsourced(state, id, on2) {
  const hq = state.headOffice;
  if (!hq) return { ok: false, message: "You have no head office." };
  const def = FUNCTION_BY_ID.get(id);
  if (!def) return { ok: false, message: "Unknown function." };
  hq.outsourced[id] = on2;
  return {
    ok: true,
    message: on2 ? `${def.name} is now bought in for ${money(outsourceCost(state, def))} a month.` : `${def.name} is back in house.`
  };
}
function outsourcingBill(state) {
  if (!state.headOffice) return 0;
  return sum(
    FUNCTIONS.filter((def) => state.headOffice?.outsourced[def.id]),
    (def) => outsourceCost(state, def)
  );
}
function headOfficeDaily(state) {
  const bought = outsourcingBill(state);
  if (bought > 0) {
    post(state, state.playerCompanyId, "outsourcing", "Outsourced central services", -bought / 30, null);
  }
  const overheads = overheadBill(state);
  if (overheads > 0) {
    post(state, state.playerCompanyId, "management", `${hqLevel(state).name} and systems`, -overheads / 30, null);
  }
}

// src/sim/segments.ts
var EVENING = [
  0.2,
  0.1,
  0.05,
  0.05,
  0.05,
  0.1,
  0.3,
  0.5,
  0.7,
  0.8,
  0.9,
  1,
  1.1,
  1,
  1,
  1.1,
  1.3,
  1.6,
  1.9,
  2,
  1.8,
  1.3,
  0.8,
  0.4
];
var DAYTIME = [
  0.05,
  0.02,
  0.02,
  0.02,
  0.05,
  0.2,
  0.6,
  1.1,
  1.5,
  1.7,
  1.8,
  1.7,
  1.5,
  1.5,
  1.5,
  1.4,
  1.2,
  0.9,
  0.6,
  0.35,
  0.2,
  0.1,
  0.05,
  0.05
];
var COMMUTER = [
  0.05,
  0.02,
  0.02,
  0.02,
  0.1,
  0.4,
  1.1,
  1.8,
  1.9,
  1.1,
  0.8,
  0.9,
  1.4,
  1.1,
  0.8,
  0.9,
  1.4,
  1.9,
  1.8,
  1.1,
  0.6,
  0.3,
  0.1,
  0.05
];
var WEEKEND_ISH = [
  0.05,
  0.02,
  0.02,
  0.02,
  0.05,
  0.15,
  0.4,
  0.8,
  1.2,
  1.5,
  1.7,
  1.7,
  1.6,
  1.6,
  1.6,
  1.5,
  1.3,
  1.1,
  0.9,
  0.6,
  0.35,
  0.2,
  0.1,
  0.05
];
var SEGMENTS = [
  {
    id: "students",
    name: "Students",
    priceSensitivity: 1.55,
    basket: 0.62,
    quality: 0.6,
    service: 0.8,
    hours: EVENING,
    description: "Huge numbers, tiny budgets, out late. They will walk past a better shop to save twenty cents."
  },
  {
    id: "families",
    name: "Families",
    priceSensitivity: 1.15,
    basket: 1.45,
    quality: 1,
    service: 1.15,
    hours: WEEKEND_ISH,
    description: "The big baskets. They care about price, but they care more about not having to go somewhere else afterwards."
  },
  {
    id: "professionals",
    name: "Professionals",
    priceSensitivity: 0.62,
    basket: 1.25,
    quality: 1.35,
    service: 1.3,
    hours: COMMUTER,
    description: "Time-poor and price-blind. They buy on the way to work and on the way home, and they notice bad service."
  },
  {
    id: "retirees",
    name: "Retirees",
    priceSensitivity: 1.05,
    basket: 0.95,
    quality: 1.2,
    service: 1.45,
    hours: DAYTIME,
    description: "Daytime trade, loyal, and the first to stop coming when the service slips."
  },
  {
    id: "visitors",
    name: "Visitors",
    priceSensitivity: 0.72,
    basket: 1.3,
    quality: 1.1,
    service: 1.05,
    hours: WEEKEND_ISH,
    description: "Tourists and people passing through. They pay the asking price and never come back, so reputation matters less than being findable."
  }
];
var NEUTRAL = (() => {
  const categories = ["retail", "food", "services", "specialized"];
  let population = 0;
  const totals = { priceSensitivity: 0, quality: 0, service: 0, basket: 0 };
  for (const def of DISTRICTS) {
    for (const category of categories) {
      const mix = rawMix(def, category);
      for (const s of SEGMENTS) {
        totals.priceSensitivity += mix[s.id] * s.priceSensitivity * def.population;
        totals.quality += mix[s.id] * s.quality * def.population;
        totals.service += mix[s.id] * s.service * def.population;
        totals.basket += mix[s.id] * s.basket * def.population;
      }
      population += def.population;
    }
  }
  return {
    priceSensitivity: totals.priceSensitivity / population,
    quality: totals.quality / population,
    service: totals.service / population,
    basket: totals.basket / population
  };
})();
function weightsOf(seg) {
  return {
    priceSensitivity: seg.priceSensitivity / NEUTRAL.priceSensitivity,
    quality: seg.quality / NEUTRAL.quality,
    service: seg.service / NEUTRAL.service,
    basket: seg.basket / NEUTRAL.basket
  };
}
var SEGMENT_BY_ID = new Map(SEGMENTS.map((segment) => [segment.id, segment]));
var mixCache = /* @__PURE__ */ new Map();
function districtMix(def, category) {
  const key2 = `${def.id}|${category}`;
  const cached2 = mixCache.get(key2);
  if (cached2) return cached2;
  const mix = rawMix(def, category);
  mixCache.set(key2, mix);
  return mix;
}
function rawMix(def, category) {
  const income = clamp(def.averageIncome / 55e3, 0.35, 2.4);
  const students = def.ageMix.young * clamp(1.7 - income * 0.75, 0.15, 1.5);
  const retirees = def.ageMix.senior * 1.15;
  const adults = Math.max(0.05, def.ageMix.adult);
  const professionals = adults * clamp(income * 0.85, 0.25, 1.6);
  const families = adults * clamp(1.5 - income * 0.35, 0.4, 1.4) + def.ageMix.young * 0.35;
  const visitorPull = category === "food" ? 1.5 : category === "retail" ? 1.1 : 0.5;
  const visitors = def.tourism * 0.42 * visitorPull;
  const raw = { students, families, professionals, retirees, visitors };
  const total2 = SEGMENTS.reduce((acc, s) => acc + raw[s.id], 0) || 1;
  const mix = {};
  for (const s of SEGMENTS) mix[s.id] = raw[s.id] / total2;
  return mix;
}
function mixAtHour(def, category, hour) {
  const base2 = districtMix(def, category);
  const out = {};
  let total2 = 0;
  for (const s of SEGMENTS) {
    const weight = base2[s.id] * (s.hours[hour] ?? 1);
    out[s.id] = weight;
    total2 += weight;
  }
  if (total2 <= 0) return base2;
  for (const s of SEGMENTS) out[s.id] /= total2;
  return out;
}
function emptyMix() {
  return { students: 0, families: 0, professionals: 0, retirees: 0, visitors: 0 };
}
function normaliseMix(mix) {
  const total2 = SEGMENTS.reduce((acc, s) => acc + (mix[s.id] ?? 0), 0);
  if (total2 <= 0) return emptyMix();
  const out = emptyMix();
  for (const s of SEGMENTS) out[s.id] = (mix[s.id] ?? 0) / total2;
  return out;
}
function basketFactor(mix) {
  const normalised = normaliseMix(mix);
  const factor2 = SEGMENTS.reduce((acc, s) => acc + normalised[s.id] * weightsOf(s).basket, 0);
  return factor2 > 0 ? factor2 : 1;
}
function leadingSegment(mix) {
  let best = SEGMENTS[0];
  for (const s of SEGMENTS) if ((mix[s.id] ?? 0) > (mix[best.id] ?? 0)) best = s;
  return best;
}

// src/sim/demand.ts
var CATEGORY_RATE = {
  retail: 0.085,
  food: 0.155,
  services: 0.011,
  specialized: 0.019
};
var OUTLETS_PER_10K = {
  retail: 6.5,
  food: 9,
  services: 3,
  specialized: 2.5
};
var BACKGROUND_SCORE = 1;
var typeShareCache = /* @__PURE__ */ new Map();
function typeShare(typeId) {
  const cached2 = typeShareCache.get(typeId);
  if (cached2 !== void 0) return cached2;
  const type = businessTypeOrThrow(typeId);
  const peers = BUSINESS_TYPES.filter((other) => other.category === type.category);
  const total2 = peers.reduce((acc, other) => acc + other.baseCustomers, 0);
  const share = total2 > 0 ? type.baseCustomers / total2 : 1;
  typeShareCache.set(typeId, share);
  return share;
}
var VISITOR_WEIGHT = {
  retail: 0.55,
  food: 0.7,
  services: 0.2,
  specialized: 0.35
};
var HOUR_CURVES = {
  // 24 entries, normalised so the day sums to roughly 24.
  retail: [0, 0, 0, 0, 0, 0.05, 0.2, 0.5, 0.9, 1.3, 1.6, 1.8, 1.9, 1.7, 1.6, 1.7, 1.9, 2, 1.7, 1.1, 0.6, 0.3, 0.1, 0],
  food: [0.05, 0.02, 0.01, 0.01, 0.02, 0.15, 0.6, 1.3, 1.5, 1, 0.9, 1.6, 2.6, 2.2, 1.1, 0.9, 1.1, 1.8, 2.5, 2.3, 1.6, 1, 0.5, 0.2],
  services: [0, 0, 0, 0, 0, 0.1, 0.4, 1, 1.7, 2, 2, 1.9, 1.4, 1.6, 1.9, 1.9, 1.7, 1.3, 0.7, 0.3, 0.1, 0, 0, 0],
  specialized: [0, 0, 0, 0, 0, 0.05, 0.2, 0.6, 1.2, 1.6, 1.7, 1.6, 1.4, 1.5, 1.7, 1.8, 1.8, 1.7, 1.4, 0.9, 0.5, 0.2, 0.05, 0]
};
var WEEKDAY_FACTOR = {
  retail: [0.85, 0.86, 0.9, 0.98, 1.18, 1.42, 0.95],
  food: [0.86, 0.88, 0.92, 1.02, 1.3, 1.45, 1.12],
  services: [1.15, 1.15, 1.12, 1.08, 1, 0.62, 0.28],
  specialized: [0.9, 0.92, 0.95, 1.02, 1.2, 1.35, 0.7]
};
var SEASON_FACTOR = {
  retail: [0.86, 0.88, 0.96, 1, 1.04, 1.06, 1.02, 1, 1.05, 1.08, 1.18, 1.42],
  food: [0.9, 0.92, 0.98, 1.02, 1.08, 1.14, 1.18, 1.16, 1.04, 1, 1, 1.12],
  services: [1.02, 1.04, 1.06, 1.04, 1, 0.94, 0.84, 0.86, 1.06, 1.08, 1.04, 0.9],
  specialized: [0.92, 0.96, 1.02, 1.06, 1.1, 1.12, 1.08, 1.02, 1.02, 1, 1.04, 1.16]
};
function weekdayIndex(day) {
  return Math.max(0, Math.floor(day) - 1) % 7;
}
function monthIndex(day) {
  return Math.floor(Math.max(0, day - 1) / DAYS_PER_MONTH) % MONTHS_PER_YEAR;
}
function hourFactor(category, hour) {
  const curve = HOUR_CURVES[category];
  return curve[(Math.floor(hour) % 24 + 24) % 24];
}
function seasonFactor(category, day) {
  return SEASON_FACTOR[category][monthIndex(day)];
}
function weekdayFactor(category, day) {
  return WEEKDAY_FACTOR[category][weekdayIndex(day)];
}
function eventFactors(state, districtId) {
  let demand = 1;
  let supplyCost = 1;
  let rent = 1;
  for (const active of state.events) {
    const def = cityEvent(active.defId);
    if (!def) continue;
    if (def.districts.length > 0 && !def.districts.includes(districtId)) continue;
    demand *= def.demand;
    supplyCost *= def.supplyCost;
    rent *= def.rent;
  }
  return { demand, supplyCost, rent };
}
function districtPool(state, districtId, category) {
  const def = district(districtId);
  const districtState = state.districts[districtId] ?? { demandIndex: 1, rentIndex: 1, propertyIndex: 1 };
  const preference = def.preferences[category] ?? 1;
  const residents = def.population * CATEGORY_RATE[category];
  const visitors = (def.footTraffic * 0.055 + def.footTraffic * def.tourism * 0.02) * VISITOR_WEIGHT[category];
  const daily = (residents + visitors) * preference;
  const confidence = clamp(state.economy.confidence / 100, 0.55, 1.45);
  const events = eventFactors(state, districtId).demand;
  return daily / 24 * hourFactor(category, state.hour) * weekdayFactor(category, state.day) * seasonFactor(category, state.day) * confidence * events * districtState.demandIndex;
}
function priceIndex(business) {
  const type = businessTypeOrThrow(business.typeId);
  if (type.productIds.length === 0) {
    return type.serviceFee > 0 ? (business.prices.service ?? type.serviceFee) / type.serviceFee : 1;
  }
  let weighted = 0;
  let weight = 0;
  for (const productId of type.productIds) {
    const def = product(productId);
    if (!def) continue;
    const price = business.prices[productId] ?? def.marketPrice;
    weighted += price / def.marketPrice * def.appeal;
    weight += def.appeal;
  }
  return weight > 0 ? weighted / weight : 1;
}
function productQuality(business) {
  const type = businessTypeOrThrow(business.typeId);
  if (type.productIds.length === 0) return 0.6;
  const defs = type.productIds.map(product).filter((d) => Boolean(d));
  if (defs.length === 0) return 0.6;
  return sum(defs, (d) => d.quality) / defs.length;
}
function pullOf(state, business) {
  const type = businessTypeOrThrow(business.typeId);
  const building = buildingById(state, business.buildingId);
  if (!building) return null;
  const def = district(building.district);
  const walkIn = type.category === "retail" || type.category === "food";
  const location = walkIn ? clamp(building.footTraffic / 14e3, 0.22, 2.6) : clamp(0.45 + def.population / 9e4, 0.35, 2.1);
  const scale = clamp(0.55 + building.customerCapacity / 42, 0.55, 2.2);
  const reputation = clamp(0.5 + business.reputation / 100 * 0.9, 0.4, 1.45);
  const awareness = clamp(0.42 + business.awareness / 100 * 0.95, 0.42, 1.4);
  const incomeIndex = clamp(def.averageIncome / 55e3, 0.4, 2.4);
  return {
    base: location * scale * reputation * awareness,
    index: priceIndex(business),
    elasticity: clamp(type.priceSensitivity * (2.3 - incomeIndex * 0.55), 0.35, 2.6),
    quality01: productQuality(business),
    incomeIndex,
    service01: business.serviceQuality / 100,
    condition01: building.condition / 100
  };
}
function scoreFor(pull, seg) {
  const weights = seg ? weightsOf(seg) : null;
  const priceWeight = weights ? weights.priceSensitivity : 1;
  const qualityWeight = weights ? weights.quality : 1;
  const serviceWeight = weights ? weights.service : 1;
  const price = clamp(
    Math.pow(1 / Math.max(0.15, pull.index), pull.elasticity * priceWeight),
    0.1,
    2.6
  );
  const quality = clamp(
    0.6 + pull.quality01 * 0.7 * qualityWeight * clamp(pull.incomeIndex, 0.6, 1.6),
    0.4,
    1.95
  );
  const service = clamp(0.5 + pull.service01 * 0.85 * serviceWeight, 0.4, 1.5);
  const condition = clamp(0.8 + pull.condition01 * 0.28 * serviceWeight, 0.75, 1.12);
  return Math.max(1e-4, pull.base * price * quality * service * condition);
}
function attractiveness(state, business) {
  const type = businessTypeOrThrow(business.typeId);
  const building = buildingById(state, business.buildingId);
  const factors = [];
  if (!building) return { score: 0, factors };
  const def = district(building.district);
  const walkIn = type.category === "retail" || type.category === "food";
  const location = walkIn ? clamp(building.footTraffic / 14e3, 0.22, 2.6) : clamp(0.45 + def.population / 9e4, 0.35, 2.1);
  factors.push({ label: "Location", value: location, hint: walkIn ? `${building.footTraffic.toLocaleString("en-GB")} passers-by/day` : `${def.name} catchment` });
  const incomeIndex = clamp(def.averageIncome / 55e3, 0.4, 2.4);
  const elasticity = clamp(type.priceSensitivity * (2.3 - incomeIndex * 0.55), 0.35, 2.6);
  const index = priceIndex(business);
  const price = clamp(Math.pow(1 / Math.max(0.15, index), elasticity), 0.12, 2.4);
  factors.push({ label: "Price", value: price, hint: `${Math.round(index * 100)}% of market price` });
  const quality = clamp(0.6 + productQuality(business) * 0.7 * clamp(incomeIndex, 0.6, 1.6), 0.4, 1.9);
  factors.push({ label: "Product quality", value: quality, hint: `${Math.round(productQuality(business) * 100)}% quality tier` });
  const service = clamp(0.5 + business.serviceQuality / 100 * 0.85, 0.4, 1.4);
  factors.push({ label: "Service", value: service, hint: `${Math.round(business.serviceQuality)}/100 service quality` });
  const scale = clamp(0.55 + building.customerCapacity / 42, 0.55, 2.2);
  factors.push({ label: "Size", value: scale, hint: `${building.size} m\xB2, room for ${building.customerCapacity} at once` });
  const reputation = clamp(0.5 + business.reputation / 100 * 0.9, 0.4, 1.45);
  factors.push({ label: "Reputation", value: reputation, hint: `${business.reviewScore.toFixed(1)}\u2605 from ${business.reviewCount} reviews` });
  const awareness = clamp(0.42 + business.awareness / 100 * 0.95, 0.42, 1.4);
  factors.push({ label: "Awareness", value: awareness, hint: `${Math.round(business.awareness)}% of the district knows you` });
  const condition = clamp(0.8 + building.condition / 100 * 0.28, 0.75, 1.1);
  factors.push({ label: "Premises", value: condition, hint: `${Math.round(building.condition)}/100 condition` });
  if (business.companyId === state.playerCompanyId) {
    const local = localResponsiveness(state);
    if (local !== 1) {
      factors.push({
        label: "Local judgement",
        value: local,
        hint: local > 1 ? "The manager here decides, and they can see the street" : "Decided centrally, the same way in every district"
      });
    }
  }
  const score = factors.reduce((acc, factor2) => acc * factor2.value, 1);
  return { score: Math.max(1e-4, score), factors };
}
function marketRows(state, businessId) {
  const business = state.businesses.find((b) => b.id === businessId);
  if (!business) return [];
  const building = buildingById(state, business.buildingId);
  if (!building) return [];
  const type = businessTypeOrThrow(business.typeId);
  const peers = state.businesses.filter((other) => {
    if (other.status !== "open") return false;
    if (other.typeId !== business.typeId) return false;
    return buildingById(state, other.buildingId)?.district === building.district;
  });
  const scores = peers.map((peer) => ({ peer, score: attractiveness(state, peer).score }));
  const background = backgroundOutlets(building.district, type.category, 0) * typeShare(business.typeId);
  const total2 = sum(scores, (row2) => row2.score) + background;
  if (total2 <= 0) return [];
  const rows = scores.map(({ peer, score }) => ({
    businessId: peer.id,
    companyId: peer.companyId,
    name: peer.name,
    share: score / total2,
    isPlayer: peer.companyId === state.playerCompanyId
  }));
  if (background > 0) {
    rows.push({
      businessId: null,
      companyId: null,
      name: "Everyone else",
      share: background / total2,
      isPlayer: false
    });
  }
  return rows.sort((a, b) => b.share - a.share);
}
function marketShare(state, businessId) {
  const row2 = marketRows(state, businessId).find((entry) => entry.businessId === businessId);
  return row2?.share ?? 0;
}
function groupShare(state) {
  const mine = state.businesses.filter((b) => b.companyId === state.playerCompanyId && b.status === "open");
  if (mine.length === 0) return 0;
  let weighted = 0;
  let weight = 0;
  for (const business of mine) {
    const building = buildingById(state, business.buildingId);
    if (!building) continue;
    const size = district(building.district).population;
    weighted += marketShare(state, business.id) * size;
    weight += size;
  }
  return weight > 0 ? weighted / weight : 0;
}
function backgroundOutlets(districtId, category, simulated) {
  const def = district(districtId);
  const expected = def.population / 1e4 * OUTLETS_PER_10K[category];
  return Math.max(0, expected - simulated);
}
function rivalsOf(state, business) {
  const building = buildingById(state, business.buildingId);
  if (!building) return [];
  return state.businesses.filter((other) => {
    if (other.id === business.id) return false;
    if (other.status !== "open") return false;
    if (other.typeId !== business.typeId) return false;
    const otherBuilding = buildingById(state, other.buildingId);
    return otherBuilding?.district === building.district;
  });
}
function allocateDemand(state) {
  const result = /* @__PURE__ */ new Map();
  const open = state.businesses.filter((b) => b.status === "open" && isTradingHour(state, b));
  const groups = /* @__PURE__ */ new Map();
  for (const business of open) {
    const building = buildingById(state, business.buildingId);
    if (!building) continue;
    const key2 = `${building.district}|${business.typeId}`;
    const list = groups.get(key2);
    if (list) list.push(business);
    else groups.set(key2, [business]);
  }
  for (const [key2, members] of groups) {
    const [districtId, typeId] = key2.split("|");
    const category = businessTypeOrThrow(typeId).category;
    const share = typeShare(typeId);
    const pool = districtPool(state, districtId, category) * share;
    if (pool <= 0) continue;
    const pulls = members.map((business) => pullOf(state, business));
    const background = backgroundOutlets(districtId, category, 0) * share * BACKGROUND_SCORE;
    const mix = mixAtHour(district(districtId), category, state.hour);
    const customers = new Array(members.length).fill(0);
    const served = members.map(() => emptyMix());
    for (const seg of SEGMENTS) {
      const segmentShare = mix[seg.id];
      if (segmentShare < 4e-3) continue;
      const segmentPool = pool * segmentShare;
      let total2 = background;
      const scores = pulls.map((pull) => {
        if (!pull) return 0;
        const score = scoreFor(pull, seg);
        total2 += score;
        return score;
      });
      if (total2 <= 0) continue;
      for (let i = 0; i < members.length; i += 1) {
        const got = segmentPool * (scores[i] / total2);
        customers[i] += got;
        served[i][seg.id] += got;
      }
    }
    members.forEach((business, index) => {
      result.set(business.id, {
        businessId: business.id,
        customers: customers[index],
        share: pool > 0 ? customers[index] / pool : 0,
        poolSize: pool,
        mix: normaliseMix(served[index])
      });
    });
  }
  return result;
}
function isTradingHour(state, business) {
  const hour = state.hour;
  if (business.openFrom === business.openTo) return false;
  if (business.openFrom < business.openTo) return hour >= business.openFrom && hour < business.openTo;
  return hour >= business.openFrom || hour < business.openTo;
}
function estimateDailyCustomers(state, business, overridePrices) {
  const probe = overridePrices ? { ...business, prices: { ...business.prices, ...overridePrices } } : business;
  const building = buildingById(state, business.buildingId);
  if (!building) return 0;
  const category = businessTypeOrThrow(business.typeId).category;
  const rivals = rivalsOf(state, business);
  const own = attractiveness(state, probe).score;
  const rivalTotal = sum(rivals, (rival) => attractiveness(state, rival).score);
  const share = typeShare(business.typeId);
  const background = backgroundOutlets(building.district, category, 0) * share * BACKGROUND_SCORE;
  const total2 = own + rivalTotal + background;
  if (total2 <= 0) return 0;
  let daily = 0;
  const saved = state.hour;
  for (let hour = 0; hour < 24; hour += 1) {
    state.hour = hour;
    if (!isTradingHour(state, business)) continue;
    daily += districtPool(state, building.district, category) * share;
  }
  state.hour = saved;
  return daily * (own / total2);
}

// src/sim/types.ts
function emptyDayStats() {
  return {
    revenue: 0,
    cogs: 0,
    wages: 0,
    rent: 0,
    marketing: 0,
    otherCosts: 0,
    customers: 0,
    lostCustomers: 0,
    units: 0
  };
}

// src/sim/reviews.ts
var REVIEW_LIMIT = 60;
var POSITIVE = {
  price: [
    "Cheaper than anywhere else nearby and the quality is fine.",
    "Good value. I checked two other places first and came back here.",
    "Prices have not crept up like everywhere else. Appreciated."
  ],
  service: [
    "Staff actually seemed pleased to see me.",
    "In and out in two minutes, and someone still said good morning.",
    "Whoever is running this place has trained the team properly."
  ],
  availability: [
    "They had everything I came for, which is rarer than it should be.",
    "Shelves full, no queue. Simple things done well.",
    "Never had to settle for a substitute here."
  ],
  quality: [
    "Noticeably better stock than the chain down the road.",
    "You can tell they buy decent products.",
    "Worth the extra few euro for what you get."
  ],
  premises: [
    "Clean, bright and easy to find things.",
    "The place has clearly had money spent on it. Pleasant to walk around.",
    "Tidy and well kept, which puts you in the mood to buy."
  ]
};
var NEGATIVE = {
  price: [
    "Fine, but I am not paying those prices twice.",
    "Everything is a euro or two more than it should be.",
    "Convenient, expensive, and they know it."
  ],
  service: [
    "Stood at the counter while two staff talked to each other.",
    "Nobody could answer a straight question.",
    "The person serving looked like they would rather be anywhere else."
  ],
  availability: [
    "Half of what I wanted was out of stock. Again.",
    "Queued for ten minutes and then gave up.",
    "Empty shelves on a weekday afternoon is not a good look."
  ],
  quality: [
    "The stock feels cheap for what they charge.",
    "Bought something here once. Will not repeat it.",
    "Quality is a step below what I expected."
  ],
  premises: [
    "The place needs a proper clean and a coat of paint.",
    "Tired-looking inside. Put me off browsing.",
    "Feels neglected. Hard to enjoy shopping in it."
  ]
};
function dominantDriver(state, business, availability) {
  const building = buildingById(state, business.buildingId);
  const index = priceIndex(business);
  const type = businessTypeOrThrow(business.typeId);
  const scores = [
    { driver: "price", score: (1 - index) * 2.2 },
    { driver: "service", score: (business.serviceQuality - 55) / 45 },
    { driver: "availability", score: (availability - 0.85) * 5 },
    { driver: "premises", score: building ? (building.condition - 65) / 35 : 0 }
  ];
  if (type.productIds.length > 0) {
    scores.push({ driver: "quality", score: (business.reputation - 50) / 50 });
  }
  let best = scores[0];
  for (const entry of scores) {
    if (Math.abs(entry.score) > Math.abs(best.score)) best = entry;
  }
  return { driver: best.driver, positive: best.score >= 0 };
}
function writeReviews(state, business, stars2, availability) {
  if (business.yesterday.customers < 5 && business.today.customers < 5) return;
  const { driver, positive } = dominantDriver(state, business, availability);
  const count2 = business.today.customers > 220 && gameRng.chance(0.45) ? 2 : 1;
  for (let i = 0; i < count2; i += 1) {
    const lines = positive ? POSITIVE[driver] : NEGATIVE[driver];
    const review = {
      id: makeId("rev"),
      businessId: business.id,
      day: state.day,
      // Individual reviews scatter around the day's average.
      stars: Math.max(1, Math.min(5, Math.round(stars2 + gameRng.range(-0.6, 0.6)))),
      text: gameRng.pick(lines),
      driver
    };
    state.reviews.unshift(review);
  }
  if (state.reviews.length > REVIEW_LIMIT) state.reviews.length = REVIEW_LIMIT;
}
function reviewsFor(state, businessId, limit = 6) {
  return state.reviews.filter((review) => review.businessId === businessId).slice(0, limit);
}
function topComplaint(state, businessId) {
  const recent = state.reviews.filter((review) => review.businessId === businessId && review.stars <= 3);
  if (recent.length === 0) return null;
  const counts = /* @__PURE__ */ new Map();
  for (const review of recent) counts.set(review.driver, (counts.get(review.driver) ?? 0) + 1);
  let best = null;
  for (const [driver, count2] of counts) {
    if (!best || count2 > best.count) best = { driver, count: count2 };
  }
  return best;
}
var DRIVER_LABELS = {
  price: "value for money",
  service: "service",
  availability: "availability",
  quality: "product quality",
  premises: "the premises"
};

// src/sim/business.ts
var UTILITY_RATE = 0.14;
function createBusinessRecord(state, company, type, building, name) {
  const prices = {};
  const stock = {};
  const incoming = {};
  const costBasis = {};
  const reorderPoints = {};
  const appealTotal = sum(
    type.productIds.map((id) => product(id)?.appeal ?? 0),
    (value) => value
  );
  for (const productId of type.productIds) {
    const def = product(productId);
    if (!def) continue;
    prices[productId] = Number((def.marketPrice * state.economy.inflation).toFixed(2));
    stock[productId] = 0;
    incoming[productId] = 0;
    costBasis[productId] = def.wholesalePrice;
    const share = appealTotal > 0 ? def.appeal / appealTotal : 1 / Math.max(1, type.productIds.length);
    const perDay = type.baseCustomers * share * def.unitsPerBasket;
    reorderPoints[productId] = Math.max(10, Math.round(perDay * 1.5));
  }
  if (type.serviceFee > 0) {
    prices.service = Number((type.serviceFee * state.economy.inflation).toFixed(2));
  }
  return {
    id: makeId("biz"),
    companyId: company.id,
    divisionId: null,
    typeId: type.id,
    buildingId: building.id,
    name,
    status: "setup",
    openFrom: type.defaultOpenFrom,
    openTo: type.defaultOpenTo,
    reputation: 35,
    serviceQuality: 55,
    reviewScore: 3.4,
    reviewCount: 0,
    prices,
    stock,
    incoming,
    costBasis,
    reorderPoints,
    employeeIds: [],
    marketingBudget: 0,
    awareness: 6,
    todayMix: emptyMix(),
    yesterdayMix: emptyMix(),
    today: emptyDayStats(),
    yesterday: emptyDayStats(),
    totals: { revenue: 0, costs: 0, customers: 0, units: 0 },
    profitHistory: [],
    openedOnDay: state.day,
    autoRestock: false
  };
}
function rentBuilding(state, buildingId) {
  const building = buildingById(state, buildingId);
  if (!building) return { ok: false, message: "Unknown building." };
  if (building.status !== "available") return { ok: false, message: "That unit is not available." };
  const company = playerCompany(state);
  const upfront = building.rent * 3;
  if (company.cash < upfront) {
    return { ok: false, message: `You need \u20AC${upfront.toLocaleString("en-GB")} up front (deposit plus first month).` };
  }
  building.status = "rented";
  building.occupantCompanyId = company.id;
  post(state, company.id, "property", `Deposit \u2014 ${building.address}`, -building.rent * 2);
  post(state, company.id, "rent", `First month \u2014 ${building.address}`, -building.rent);
  return { ok: true, message: `${building.address} leased.` };
}
function buyBuilding(state, buildingId) {
  const building = buildingById(state, buildingId);
  if (!building) return { ok: false, message: "Unknown building." };
  if (building.status === "owned") return { ok: false, message: "You already own this building." };
  if (building.status === "competitor") return { ok: false, message: "Another company occupies this building." };
  const company = playerCompany(state);
  if (company.cash < building.value) {
    return { ok: false, message: `You need \u20AC${building.value.toLocaleString("en-GB")} to buy this outright.` };
  }
  building.status = "owned";
  building.occupantCompanyId = company.id;
  post(state, company.id, "property", `Purchase \u2014 ${building.address}`, -building.value);
  return { ok: true, message: `${building.address} purchased.` };
}
function sellBuilding(state, buildingId) {
  const building = buildingById(state, buildingId);
  if (!building) return { ok: false, message: "Unknown building." };
  if (building.status !== "owned") return { ok: false, message: "You do not own this building." };
  if (building.businessId) return { ok: false, message: "Close the business here before selling." };
  const company = playerCompany(state);
  const proceeds = Math.round(building.value * 0.94);
  building.status = "available";
  building.occupantCompanyId = null;
  post(state, company.id, "property", `Sale \u2014 ${building.address}`, proceeds);
  return { ok: true, message: `Sold for \u20AC${proceeds.toLocaleString("en-GB")} after fees.` };
}
function endLease(state, buildingId) {
  const building = buildingById(state, buildingId);
  if (!building) return { ok: false, message: "Unknown building." };
  if (building.status !== "rented") return { ok: false, message: "That unit is not leased by you." };
  if (building.businessId) return { ok: false, message: "Close the business here before ending the lease." };
  const company = playerCompany(state);
  const refund = Math.round(building.rent * 1.5);
  building.status = "available";
  building.occupantCompanyId = null;
  post(state, company.id, "property", `Deposit returned \u2014 ${building.address}`, refund);
  return { ok: true, message: "Lease ended, part of the deposit returned." };
}
var RENOVATION_DAYS = 6;
function renovate(state, buildingId) {
  const building = buildingById(state, buildingId);
  if (!building) return { ok: false, message: "Unknown building." };
  if (building.occupantCompanyId !== state.playerCompanyId) {
    return { ok: false, message: "You must rent or own the building first." };
  }
  if (building.renovationEndsOnDay !== null) return { ok: false, message: "Renovation already under way." };
  if (building.condition >= 97) return { ok: false, message: "This unit is already in excellent condition." };
  const cost = Math.round(building.size * (100 - building.condition) * 1.9);
  const company = playerCompany(state);
  if (company.cash < cost) return { ok: false, message: `Renovation would cost \u20AC${cost.toLocaleString("en-GB")}.` };
  building.renovationEndsOnDay = state.day + RENOVATION_DAYS;
  post(state, company.id, "renovation", `Renovation \u2014 ${building.address}`, -cost);
  return { ok: true, message: `Work starts today and takes ${RENOVATION_DAYS} days.` };
}
function renovationCost(building) {
  return Math.round(building.size * (100 - building.condition) * 1.9);
}
function foundBusiness(state, typeId, buildingId, name) {
  const type = businessTypeOrThrow(typeId);
  const building = buildingById(state, buildingId);
  if (!building) return { ok: false, message: "Unknown building." };
  if (building.occupantCompanyId !== state.playerCompanyId) {
    return { ok: false, message: "Rent or buy the building first." };
  }
  if (building.businessId) return { ok: false, message: "There is already a business in this unit." };
  const cap = locationCap(state);
  const running = playerBusinesses(state).filter((b) => b.status !== "closed").length;
  if (running >= cap) {
    const level = unlockedLevelDef(state);
    return {
      ok: false,
      message: `A ${level.name.toLowerCase()} can run ${cap} location${cap === 1 ? "" : "s"}. Grow the company to open more.`
    };
  }
  if (building.size < type.minSize) {
    return { ok: false, message: `A ${type.name} needs at least ${type.minSize} m\xB2; this unit is ${building.size} m\xB2.` };
  }
  const company = playerCompany(state);
  const cost = type.setupCost + type.equipmentCost;
  if (company.cash < cost) {
    return { ok: false, message: `Fit-out and equipment cost \u20AC${cost.toLocaleString("en-GB")}.` };
  }
  const trimmed = name.trim().slice(0, 40) || type.name;
  const business = createBusinessRecord(state, company, type, building, trimmed);
  state.businesses.push(business);
  building.businessId = business.id;
  post(state, company.id, "setup", `Fit-out \u2014 ${trimmed}`, -type.setupCost, business.id);
  post(state, company.id, "equipment", `Equipment \u2014 ${trimmed}`, -type.equipmentCost, business.id);
  refreshApplicants(state);
  return { ok: true, message: `${trimmed} created. Stock it, staff it, then open the doors.`, businessId: business.id };
}
function openBusiness(state, businessId) {
  const business = businessById(state, businessId);
  if (!business) return { ok: false, message: "Unknown business." };
  if (business.status === "open") return { ok: false, message: "Already open." };
  const type = businessTypeOrThrow(business.typeId);
  if (type.productIds.length > 0) {
    const units = sum(Object.values(business.stock), (value) => value);
    if (units <= 0) return { ok: false, message: "You cannot open with empty shelves. Order stock first." };
  }
  if (employeesOf(state, businessId).length === 0) {
    return { ok: false, message: "Hire at least one member of staff before opening." };
  }
  business.status = "open";
  business.openedOnDay = state.day;
  learn(state, "opened");
  pushAlert(state, "info", `${business.name} is open`, "Trading has started. Watch the first day closely.", businessId);
  return { ok: true, message: `${business.name} is open for business.` };
}
function closeBusiness(state, businessId) {
  const business = businessById(state, businessId);
  if (!business) return { ok: false, message: "Unknown business." };
  business.status = "closed";
  return { ok: true, message: `${business.name} is closed. Rent and wages still apply.` };
}
function shutDownBusiness(state, businessId) {
  const business = businessById(state, businessId);
  if (!business) return { ok: false, message: "Unknown business." };
  const company = playerCompany(state);
  let salvage = 0;
  for (const [productId, units] of Object.entries(business.stock)) {
    salvage += (business.costBasis[productId] ?? 0) * units * 0.5;
  }
  for (const employee of employeesOf(state, businessId)) {
    const severance = Math.round(employee.salary * 0.75);
    post(state, company.id, "severance", `Severance \u2014 ${employee.name}`, -severance, businessId);
    state.employees = state.employees.filter((e) => e.id !== employee.id);
  }
  if (salvage > 0) post(state, company.id, "other", `Stock clearance \u2014 ${business.name}`, salvage, businessId);
  const building = buildingById(state, business.buildingId);
  if (building) building.businessId = null;
  state.businesses = state.businesses.filter((b) => b.id !== businessId);
  return { ok: true, message: `${business.name} has been wound up.` };
}
function setPrice(state, businessId, productId, price) {
  const business = businessById(state, businessId);
  if (!business || !Number.isFinite(price)) return false;
  const def = product(productId);
  const ceiling = def ? def.marketPrice * 5 : 1e5;
  business.prices[productId] = Number(clamp(price, 0.05, ceiling).toFixed(2));
  return true;
}
function setHours(state, businessId, from, to) {
  const business = businessById(state, businessId);
  if (!business) return false;
  business.openFrom = clamp(Math.round(from), 0, 23);
  business.openTo = clamp(Math.round(to), 1, 24);
  return true;
}
function setMarketingBudget(state, businessId, budget) {
  const business = businessById(state, businessId);
  if (!business || !Number.isFinite(budget)) return false;
  business.marketingBudget = Math.max(0, Math.round(budget));
  return true;
}
function setReorderPoint(state, businessId, productId, value) {
  const business = businessById(state, businessId);
  if (!business || !Number.isFinite(value)) return false;
  business.reorderPoints[productId] = Math.round(clamp(value, 0, 9999));
  return true;
}
function storageUsed(business) {
  let total2 = 0;
  for (const [productId, units] of Object.entries(business.stock)) {
    const def = product(productId);
    if (def) total2 += def.volume * units;
  }
  return total2;
}
function storageFree(state, business) {
  const building = buildingById(state, business.buildingId);
  if (!building) return 0;
  return Math.max(0, building.storageCapacity - storageUsed(business));
}
function hourlyCapacity(state, business) {
  const building = buildingById(state, business.buildingId);
  const power = staffPower(state, business);
  const owner = businessTypeOrThrow(business.typeId).customersPerStaffHour * 0.5;
  const floorLimit = building ? building.customerCapacity * 3 : Infinity;
  const throughput = researchFactor(state, "throughput");
  const managed = managementFactor(state, business);
  return Math.min((power.capacityPerHour + owner) * throughput * managed, floorLimit);
}
function tradeHour(state, business, allocation) {
  if (business.status !== "open" || !isTradingHour(state, business)) return;
  const arrivals = allocation?.customers ?? 0;
  if (arrivals <= 0) return;
  const type = businessTypeOrThrow(business.typeId);
  const capacity = hourlyCapacity(state, business);
  const served = Math.min(arrivals, capacity);
  const turnedAway = Math.max(0, arrivals - capacity);
  const crowd = allocation?.mix ?? emptyMix();
  for (const seg of SEGMENTS) {
    business.todayMix[seg.id] = (business.todayMix[seg.id] ?? 0) + served * (crowd[seg.id] ?? 0);
  }
  const basket = basketFactor(crowd);
  let revenue = 0;
  let cogs = 0;
  let units = 0;
  let unmet = 0;
  if (type.productIds.length === 0) {
    const fee = business.prices.service ?? type.serviceFee;
    revenue = served * fee * clamp(basket, 0.75, 1.3);
  } else {
    const defs = type.productIds.map((id) => product(id)).filter((d) => Boolean(d));
    const appealTotal = sum(defs, (d) => d.appeal);
    if (appealTotal <= 0) return;
    for (const def of defs) {
      const share = def.appeal / appealTotal;
      const wanted = served * share * def.unitsPerBasket * basket;
      if (wanted <= 0) continue;
      const available2 = business.stock[def.id] ?? 0;
      const sold = Math.min(wanted, available2);
      if (sold > 0) {
        business.stock[def.id] = available2 - sold;
        const price = business.prices[def.id] ?? def.marketPrice;
        revenue += sold * price;
        cogs += sold * (business.costBasis[def.id] ?? def.wholesalePrice);
        units += sold;
      }
      unmet += wanted - sold;
    }
    if (type.serviceFee > 0) revenue += served * (business.prices.service ?? type.serviceFee) * clamp(basket, 0.75, 1.3);
  }
  if (revenue > 0) {
    post(state, business.companyId, type.productIds.length > 0 ? "sales" : "service", `Takings \u2014 ${business.name}`, revenue, business.id);
    business.today.revenue += revenue;
    business.today.cogs += cogs;
    business.today.units += units;
    business.totals.revenue += revenue;
    business.totals.units += units;
    state.stats.unitsTotal += units;
  }
  business.today.customers += served;
  business.today.lostCustomers += turnedAway;
  business.totals.customers += served;
  state.stats.customersTotal += served;
  if (turnedAway > served * 0.15 && turnedAway > 2) {
    business.serviceQuality = clamp(business.serviceQuality - turnedAway * 0.05, 0, 100);
  }
  if (unmet > 0) {
    business.serviceQuality = clamp(business.serviceQuality - unmet * 0.02, 0, 100);
  }
}
function businessDaily(state, business) {
  const building = buildingById(state, business.buildingId);
  const type = businessTypeOrThrow(business.typeId);
  if (!building) return 0;
  if (business.today.cogs > 0) {
    postNonCash(state, business.companyId, "cogs", `Cost of goods \u2014 ${business.name}`, -business.today.cogs, business.id);
  }
  const events = eventFactors(state, building.district);
  const dailyRent = building.status === "rented" ? building.rent * events.rent / 30 : 0;
  const utilities = building.rent * UTILITY_RATE / 30 * (building.status === "owned" ? 1.1 : 1) * researchFactor(state, "utilities");
  const coordination = adminCostPerDay(state, business);
  if (coordination > 0) {
    post(state, business.companyId, "management", `Coordination \u2014 ${business.name}`, -coordination, business.id);
    business.today.otherCosts += coordination;
  }
  if (dailyRent > 0) {
    post(state, business.companyId, "rent", `Rent \u2014 ${business.name}`, -dailyRent, business.id);
    business.today.rent += dailyRent;
  }
  if (utilities > 0) {
    post(state, business.companyId, "utilities", `Utilities \u2014 ${business.name}`, -utilities, business.id);
    business.today.otherCosts += utilities;
  }
  const upkeep = type.equipmentCost * type.equipmentUpkeep / 30;
  if (upkeep > 0 && business.status !== "closed") {
    post(state, business.companyId, "equipment", `Equipment servicing \u2014 ${business.name}`, -upkeep, business.id);
    business.today.otherCosts += upkeep;
  }
  if (business.marketingBudget > 0 && business.status === "open") {
    post(state, business.companyId, "marketing", `Marketing \u2014 ${business.name}`, -business.marketingBudget, business.id);
    business.today.marketing += business.marketingBudget;
  }
  const power = staffPower(state, business);
  const suits = (tradeFit(state, business) - 50) * 0.16;
  const targetService = clamp(
    power.headcount === 0 ? 25 : 30 + power.service * 45 + (building.condition - 60) * 0.25 + suits,
    0,
    100
  );
  business.serviceQuality = approach(business.serviceQuality, targetService, 0.3);
  if (business.today.customers > 3 && business.status === "open") {
    const valueScore = clamp(1.15 / Math.max(0.4, priceIndex(business)), 0.3, 1.9);
    const availability = clamp(
      1 - business.today.lostCustomers / Math.max(1, business.today.customers + business.today.lostCustomers),
      0,
      1
    );
    const raw = clamp(
      0.6 + valueScore * 0.9 + business.serviceQuality / 100 * 1.4 + availability * 0.9 + gameRng.range(-0.3, 0.3),
      1,
      5
    );
    const newReviews = Math.max(1, Math.round(business.today.customers / 45));
    const total2 = business.reviewScore * business.reviewCount + raw * newReviews;
    business.reviewCount += newReviews;
    business.reviewScore = clamp(total2 / business.reviewCount, 1, 5);
    writeReviews(state, business, raw, availability);
    business.reputation = approach(
      business.reputation,
      (business.reviewScore - 1) / 4 * 100,
      clamp(0.16 * type.reputationSensitivity, 0.05, 0.35)
    );
  } else if (business.status === "open") {
    business.reputation = approach(business.reputation, 30, 0.03);
  }
  const districtDef = district(building.district);
  const reachPerEuro = 26e3 / Math.max(4e3, districtDef.population);
  const gain = Math.sqrt(business.marketingBudget) * reachPerEuro * 0.9;
  const wordOfMouth = business.today.customers / Math.max(400, districtDef.population * 0.02) * 6;
  const stickiness = 1 - (1 - 0.975) / researchFactor(state, "awareness");
  business.awareness = clamp(business.awareness * stickiness + gain + wordOfMouth, 0, 100);
  spoilStock(state, business);
  const profit = business.today.revenue - (business.today.cogs + business.today.wages + business.today.rent + business.today.marketing + business.today.otherCosts);
  if (business.status === "open" && business.profitHistory.length >= 3) {
    const previousBest = Math.max(...business.profitHistory);
    if (profit > 200 && profit > previousBest * 1.3) {
      pushNews(
        state,
        "company",
        `${business.name} had its best day yet`,
        `\u20AC${Math.round(business.today.revenue).toLocaleString("en-GB")} of takings from ${Math.round(
          business.today.customers
        ).toLocaleString("en-GB")} customers, and \u20AC${Math.round(profit).toLocaleString("en-GB")} of profit.`,
        { businessId: business.id, importance: "high" }
      );
    }
    const wasLosing = business.profitHistory.slice(-3).every((value) => value < 0);
    if (wasLosing && profit > 0) {
      pushNews(state, "company", `${business.name} is back in profit`, "Three days of losses came to an end today.", {
        businessId: business.id
      });
    }
  }
  business.totals.costs += business.today.cogs + business.today.wages + business.today.rent + business.today.marketing + business.today.otherCosts;
  business.profitHistory.push(profit);
  if (business.profitHistory.length > 30) business.profitHistory.shift();
  business.yesterday = business.today;
  business.today = emptyDayStats();
  business.yesterdayMix = business.todayMix;
  business.todayMix = emptyMix();
  if (business.status === "open") {
    const lowStock = type.productIds.filter(
      (id) => (business.stock[id] ?? 0) <= (business.reorderPoints[id] ?? 0) && (business.incoming[id] ?? 0) <= 0
    );
    if (lowStock.length > 0) {
      pushAlert(
        state,
        lowStock.length >= type.productIds.length ? "critical" : "warning",
        `Low stock at ${business.name}`,
        `${lowStock.map((id) => product(id)?.name ?? id).join(", ")} at or below the reorder point.`,
        business.id
      );
    }
    if (profit < 0 && business.profitHistory.length >= 3 && business.profitHistory.slice(-3).every((p2) => p2 < 0)) {
      pushAlert(
        state,
        "warning",
        `${business.name} is losing money`,
        `Three days of losses, most recently \u20AC${Math.abs(Math.round(profit))}. Check pricing, staffing and rent.`,
        business.id
      );
    }
    if (business.yesterday.lostCustomers > business.yesterday.customers * 0.25 && business.yesterday.lostCustomers > 10) {
      pushAlert(
        state,
        "warning",
        `${business.name} is turning customers away`,
        `${Math.round(business.yesterday.lostCustomers)} customers could not be served yesterday. More staff would convert them.`,
        business.id
      );
    }
  }
  return profit;
}
function spoilStock(state, business) {
  let wasted = 0;
  for (const [productId, units] of Object.entries(business.stock)) {
    if (units <= 0) continue;
    const def = product(productId);
    if (!def || def.shelfLife <= 0) continue;
    const rate = clamp(1 / (def.shelfLife * 2.2), 0.02, 0.4);
    const lost = units * rate;
    if (lost < 0.01) continue;
    business.stock[productId] = Math.max(0, units - lost);
    const value = lost * (business.costBasis[productId] ?? def.wholesalePrice);
    wasted += value;
    postNonCash(state, business.companyId, "cogs", `Waste \u2014 ${business.name}`, -value, business.id);
  }
  if (wasted > 25) {
    pushAlert(
      state,
      "warning",
      `Stock is going to waste at ${business.name}`,
      `About ${Math.round(wasted)} euro of perishable stock was thrown away. Order smaller amounts more often, or fit refrigeration.`,
      business.id
    );
  }
}
function propertyDaily(state) {
  let total2 = 0;
  for (const building of state.buildings) {
    if (building.occupantCompanyId !== state.playerCompanyId) continue;
    if (building.businessId) continue;
    const events = eventFactors(state, building.district);
    const rent = building.status === "rented" ? building.rent * events.rent / 30 : 0;
    const utilities = building.rent * UTILITY_RATE / 30 * 0.45 * researchFactor(state, "utilities");
    if (rent > 0) {
      post(state, state.playerCompanyId, "rent", `Rent \u2014 ${building.address} (empty)`, -rent, null);
      total2 += rent;
    }
    if (utilities > 0) {
      post(state, state.playerCompanyId, "utilities", `Standing charges \u2014 ${building.address}`, -utilities, null);
      total2 += utilities;
    }
  }
  return total2;
}
function grossMargin(business) {
  const type = businessTypeOrThrow(business.typeId);
  if (type.productIds.length === 0) return 1;
  let revenue = 0;
  let cost = 0;
  for (const productId of type.productIds) {
    const def = product(productId);
    if (!def) continue;
    const price = business.prices[productId] ?? def.marketPrice;
    revenue += price * def.appeal;
    cost += (business.costBasis[productId] ?? def.wholesalePrice) * def.appeal;
  }
  return revenue > 0 ? (revenue - cost) / revenue : 0;
}

// src/sim/competitors.ts
var PERSONALITY_LABELS = {
  lowcost: "Low-cost operator",
  premium: "Premium operator",
  aggressive: "Aggressive expander",
  conservative: "Conservative operator",
  marketer: "Marketing-led",
  quality: "Quality-focused",
  opportunist: "Opportunist"
};
var PROFILES = {
  lowcost: { targetPriceIndex: 0.84, reactivity: 0.55, marketingRatio: 0.01, serviceTarget: 46, expansion: 0.35, patience: 40 },
  premium: { targetPriceIndex: 1.28, reactivity: 0.18, marketingRatio: 0.035, serviceTarget: 84, expansion: 0.18, patience: 55 },
  aggressive: { targetPriceIndex: 0.93, reactivity: 0.75, marketingRatio: 0.05, serviceTarget: 62, expansion: 0.7, patience: 22 },
  conservative: { targetPriceIndex: 1.03, reactivity: 0.12, marketingRatio: 0.012, serviceTarget: 60, expansion: 0.08, patience: 70 },
  marketer: { targetPriceIndex: 1.09, reactivity: 0.3, marketingRatio: 0.085, serviceTarget: 64, expansion: 0.4, patience: 35 },
  quality: { targetPriceIndex: 1.16, reactivity: 0.22, marketingRatio: 0.025, serviceTarget: 88, expansion: 0.22, patience: 50 },
  opportunist: { targetPriceIndex: 0.98, reactivity: 0.62, marketingRatio: 0.03, serviceTarget: 58, expansion: 0.55, patience: 18 }
};
function aiWageBill(business) {
  const type = businessTypeOrThrow(business.typeId);
  const headcount = Math.max(1, Math.round(type.roles.length * 1.6));
  return headcount * 2400 / 30;
}
function tradeHourAI(state, business, allocation) {
  if (business.status !== "open" || !isTradingHour(state, business)) return;
  const customers = allocation?.customers ?? 0;
  if (customers <= 0) return;
  const type = businessTypeOrThrow(business.typeId);
  let revenuePerCustomer2 = type.serviceFee;
  let costRatio = 0.34;
  if (type.productIds.length > 0) {
    let revenue2 = 0;
    let cost = 0;
    let weight = 0;
    for (const productId of type.productIds) {
      const def = product(productId);
      if (!def) continue;
      const price = business.prices[productId] ?? def.marketPrice;
      revenue2 += price * def.unitsPerBasket * def.appeal;
      cost += def.wholesalePrice * def.unitsPerBasket * def.appeal;
      weight += def.appeal;
    }
    if (weight > 0) {
      revenuePerCustomer2 += revenue2 / weight;
      costRatio = revenue2 > 0 ? cost / revenue2 : 0.34;
    }
  }
  const revenue = customers * revenuePerCustomer2 * basketFactor(allocation?.mix ?? emptyMix());
  const company = companyById(state, business.companyId);
  if (company) company.cash += revenue - revenue * costRatio;
  business.today.revenue += revenue;
  business.today.cogs += revenue * costRatio;
  business.today.customers += customers;
  business.totals.revenue += revenue;
  business.totals.customers += customers;
}
function competitorDaily(state) {
  for (const business of competitorBusinesses(state)) {
    const building = buildingById(state, business.buildingId);
    const company = companyById(state, business.companyId);
    if (!building || !company) continue;
    const rent = building.status === "rented" ? building.rent / 30 : building.rent / 45;
    const wages = aiWageBill(business);
    company.cash -= rent + wages + business.marketingBudget;
    business.today.rent += rent;
    business.today.wages += wages;
    business.today.marketing += business.marketingBudget;
    const profit = business.today.revenue - (business.today.cogs + business.today.wages + business.today.rent + business.today.marketing);
    business.profitHistory.push(profit);
    if (business.profitHistory.length > 30) business.profitHistory.shift();
    const profile = PROFILES[company.personality ?? "conservative"];
    business.serviceQuality = clamp(
      business.serviceQuality + (profile.serviceTarget - business.serviceQuality) * 0.08,
      0,
      100
    );
    const reviewTarget = clamp(
      1.6 + 2.2 / Math.max(0.5, priceIndex(business)) * 0.55 + business.serviceQuality / 100 * 1.4,
      1,
      5
    );
    business.reviewScore = clamp(business.reviewScore + (reviewTarget - business.reviewScore) * 0.1, 1, 5);
    business.reputation = clamp(
      business.reputation + ((business.reviewScore - 1) / 4 * 100 - business.reputation) * 0.12,
      0,
      100
    );
    const districtDef = district(building.district);
    const awarenessGain = Math.sqrt(business.marketingBudget) * (26e3 / Math.max(4e3, districtDef.population)) * 0.9;
    business.awareness = clamp(business.awareness * 0.975 + awarenessGain + business.today.customers / 220, 0, 100);
    business.yesterday = business.today;
    business.today = emptyDayStats();
  }
}
function competitorWeekly(state) {
  for (const business of competitorBusinesses(state)) {
    const company = companyById(state, business.companyId);
    const building = buildingById(state, business.buildingId);
    if (!company || !building) continue;
    const profile = PROFILES[company.personality ?? "conservative"];
    const type = businessTypeOrThrow(business.typeId);
    const rivals = state.businesses.filter((other) => {
      if (other.id === business.id || other.status !== "open") return false;
      const otherBuilding = buildingById(state, other.buildingId);
      return otherBuilding?.district === building.district && businessTypeOrThrow(other.typeId).category === type.category;
    });
    const own = attractiveness(state, business).score;
    const rivalTotal = sum(rivals, (rival) => attractiveness(state, rival).score);
    const share = own / Math.max(1e-4, own + rivalTotal);
    const fairShare = 1 / (rivals.length + 1);
    let target = profile.targetPriceIndex;
    if (share < fairShare * 0.8) target *= 1 - profile.reactivity * 0.14;
    else if (share > fairShare * 1.3) target *= 1 + profile.reactivity * 0.07;
    target *= gameRng.range(0.96, 1.04);
    const current = priceIndex(business);
    const step = clamp((target - current) * (0.35 + profile.reactivity * 0.4), -0.12, 0.12);
    if (Math.abs(step) > 0.045 && rivals.length > 0) {
      const playerNearby = rivals.some((rival) => rival.companyId === state.playerCompanyId);
      if (playerNearby) {
        pushNews(
          state,
          "competitor",
          `${company.name} ${step < 0 ? "cuts" : "raises"} prices at ${business.name}`,
          `${Math.abs(Math.round(step * 100))}% ${step < 0 ? "lower" : "higher"} in ${district(building.district).name}. You trade against them there.`,
          { importance: step < 0 ? "high" : "normal" }
        );
      }
    }
    for (const productId of type.productIds) {
      const def = product(productId);
      if (!def) continue;
      const price = business.prices[productId] ?? def.marketPrice;
      business.prices[productId] = Number(
        clamp(price * (1 + step), def.wholesalePrice * 1.05, def.marketPrice * 3).toFixed(2)
      );
    }
    if (type.serviceFee > 0) {
      const fee = business.prices.service ?? type.serviceFee;
      business.prices.service = Number(clamp(fee * (1 + step), type.serviceFee * 0.5, type.serviceFee * 2.5).toFixed(2));
    }
    const weeklyRevenue = business.yesterday.revenue * 7;
    business.marketingBudget = Math.round(clamp(weeklyRevenue / 7 * profile.marketingRatio, 0, company.cash / 60));
    const recent = business.profitHistory.slice(-14);
    const losing = recent.length >= 7 && sum(recent, (p2) => p2) < 0;
    if (losing && company.cash < 0) {
      closeCompetitor(state, business.id, `${company.name} closed ${business.name}.`);
      continue;
    }
    if (losing && gameRng.chance(clamp(14 / profile.patience, 0.05, 0.5) * 0.25)) {
      closeCompetitor(state, business.id, `${company.name} pulled out of ${district(building.district).name}.`);
    }
  }
  for (const company of state.companies.filter((c) => !c.isPlayer)) {
    const profile = PROFILES[company.personality ?? "conservative"];
    if (company.cash < 9e4) continue;
    if (!gameRng.chance(profile.expansion * 0.25)) continue;
    openCompetitorOutlet(state, company);
  }
}
function closeCompetitor(state, businessId, message) {
  const business = state.businesses.find((b) => b.id === businessId);
  if (!business) return;
  const building = buildingById(state, business.buildingId);
  if (building) {
    building.businessId = null;
    building.status = "available";
    building.occupantCompanyId = null;
  }
  state.businesses = state.businesses.filter((b) => b.id !== businessId);
  pushAlert(state, "info", "A competitor closed", message, null, "market");
  pushNews(state, "competitor", message, "Their share of that market is now up for grabs.", { importance: "normal" });
}
function openCompetitorOutlet(state, company) {
  const profile = PROFILES[company.personality ?? "conservative"];
  const candidates = state.buildings.filter((b) => b.status === "available" && b.businessId === null);
  if (candidates.length === 0) return null;
  const scoreByDistrict = /* @__PURE__ */ new Map();
  for (const business2 of state.businesses) {
    const building = buildingById(state, business2.buildingId);
    if (!building) continue;
    const recent = business2.profitHistory.slice(-7);
    const profit = recent.length > 0 ? sum(recent, (p2) => p2) / recent.length : 0;
    scoreByDistrict.set(building.district, (scoreByDistrict.get(building.district) ?? 0) + profit);
  }
  const shortlist = gameRng.sample(candidates, 14);
  let best = null;
  for (const building of shortlist) {
    const districtDef = district(building.district);
    const options = BUSINESS_TYPES.filter(
      (type3) => building.size >= type3.minSize && building.suitableFor.includes(type3.category)
    );
    if (options.length === 0) continue;
    const type2 = gameRng.pick(options);
    const setup = type2.setupCost + type2.equipmentCost + building.rent * 3;
    if (setup > company.cash * 0.6) continue;
    const heat2 = scoreByDistrict.get(building.district) ?? 0;
    const score = (districtDef.preferences[type2.category] ?? 1) * clamp(building.footTraffic / 12e3, 0.2, 2.4) * (1 + clamp(heat2 / 900, -0.5, 1.4) * profile.expansion) * gameRng.range(0.7, 1.3);
    if (!best || score > best.score) best = { building, typeId: type2.id, score };
  }
  if (!best) return null;
  const type = businessTypeOrThrow(best.typeId);
  const business = createBusinessRecord(state, company, type, best.building, `${company.name} ${type.name}`);
  business.status = "open";
  business.reputation = clamp(gameRng.around(46, 14), 15, 85);
  business.serviceQuality = profile.serviceTarget;
  business.awareness = clamp(gameRng.around(18 + company.brandAwareness * 0.3, 8), 3, 70);
  business.reviewScore = clamp(gameRng.around(3.5, 0.5), 1.5, 4.8);
  business.reviewCount = gameRng.int(15, 400);
  for (const productId of type.productIds) {
    const def = product(productId);
    if (!def) continue;
    business.prices[productId] = Number((def.marketPrice * profile.targetPriceIndex * gameRng.range(0.95, 1.05)).toFixed(2));
  }
  if (type.serviceFee > 0) {
    business.prices.service = Number((type.serviceFee * profile.targetPriceIndex).toFixed(2));
  }
  company.cash -= type.setupCost + type.equipmentCost + best.building.rent * 3;
  best.building.status = "competitor";
  best.building.occupantCompanyId = company.id;
  best.building.businessId = business.id;
  state.businesses.push(business);
  const where = district(best.building.district).name;
  pushAlert(state, "warning", "A competitor opened nearby", `${company.name} opened ${type.name.toLowerCase()} "${business.name}" in ${where}.`, null, "market");
  pushNews(
    state,
    "competitor",
    `${company.name} opens in ${where}`,
    `A new ${type.name.toLowerCase()} at ${best.building.address}. ${PERSONALITY_LABELS[company.personality ?? "conservative"]} \u2014 expect them to compete on ${company.personality === "lowcost" || company.personality === "aggressive" ? "price" : company.personality === "marketer" ? "advertising" : "quality"}.`,
    { importance: "high" }
  );
  return business;
}

// src/data/suppliers.ts
var SUPPLIERS = [
  {
    id: "northgate-wholesale",
    name: "Northgate Wholesale",
    priceMultiplier: 1,
    reliability: 0.97,
    quality: 0.8,
    leadTimeHours: 12,
    minimumOrderValue: 200,
    categories: ["groceries", "beverages", "prepared", "home"],
    volumeDiscount: 0.04,
    volumeThreshold: 15e3,
    description: "The default local wholesaler. Dependable, never cheap, never late."
  },
  {
    id: "harbour-imports",
    name: "Harbour Imports",
    priceMultiplier: 0.86,
    reliability: 0.84,
    quality: 0.66,
    leadTimeHours: 52,
    minimumOrderValue: 1800,
    categories: ["groceries", "beverages", "apparel", "home", "electronics", "sports", "pet"],
    volumeDiscount: 0.07,
    volumeThreshold: 25e3,
    description: "14% below list, but container shipping means long, uncertain lead times."
  },
  {
    id: "meridian-supply",
    name: "Meridian Supply Co.",
    priceMultiplier: 0.93,
    reliability: 0.92,
    quality: 0.74,
    leadTimeHours: 26,
    minimumOrderValue: 900,
    categories: ["groceries", "beverages", "apparel", "home", "sports", "pet", "beauty"],
    volumeDiscount: 0.05,
    volumeThreshold: 18e3,
    description: "A sensible middle option across most categories."
  },
  {
    id: "atelier-fresh",
    name: "Atelier Fresh",
    priceMultiplier: 1.22,
    reliability: 0.98,
    quality: 0.95,
    leadTimeHours: 8,
    minimumOrderValue: 180,
    categories: ["groceries", "prepared", "beverages"],
    volumeDiscount: 0.02,
    volumeThreshold: 9e3,
    description: "Premium fresh produce delivered daily. Expensive, and worth it in the right shop."
  },
  {
    id: "voltron-tech",
    name: "Voltron Tech Distribution",
    priceMultiplier: 0.97,
    reliability: 0.94,
    quality: 0.86,
    leadTimeHours: 30,
    minimumOrderValue: 4e3,
    categories: ["electronics"],
    volumeDiscount: 0.06,
    volumeThreshold: 6e4,
    description: "Authorised electronics distributor. Large minimum orders."
  },
  {
    id: "lumen-brands",
    name: "Lumen Brands",
    priceMultiplier: 1.09,
    reliability: 0.95,
    quality: 0.88,
    leadTimeHours: 20,
    minimumOrderValue: 1200,
    categories: ["apparel", "beauty", "sports"],
    volumeDiscount: 0.05,
    volumeThreshold: 22e3,
    description: "Branded goods that customers actually recognise. Priced accordingly."
  }
];
var byId6 = new Map(SUPPLIERS.map((supplier2) => [supplier2.id, supplier2]));
function supplier(id) {
  return byId6.get(id);
}

// src/sim/warehouse.ts
var RACKING_FACTOR = 4;
var TRIP_COST = 28;
var TRIPS_PER_DRIVER = 4;
var BASE_TRIPS = 2;
function warehousesOf(state) {
  return state.warehouses.filter((w) => w.companyId === state.playerCompanyId);
}
function warehouseById(state, id) {
  return state.warehouses.find((w) => w.id === id);
}
function capacityOf(state, warehouse) {
  const building = buildingById(state, warehouse.buildingId);
  if (!building) return 0;
  return building.storageCapacity * RACKING_FACTOR * researchFactor(state, "capacity");
}
function usedSpace(warehouse) {
  return sum(Object.entries(warehouse.stock), ([productId, units]) => {
    const def = product(productId);
    return def ? units * def.volume : 0;
  });
}
function freeSpace(state, warehouse) {
  return Math.max(0, capacityOf(state, warehouse) - usedSpace(warehouse));
}
function stockValue(warehouse) {
  return sum(Object.entries(warehouse.stock), ([productId, units]) => {
    const def = product(productId);
    return units * (warehouse.costBasis[productId] ?? def?.wholesalePrice ?? 0);
  });
}
function tripsPerDay(state, warehouse) {
  const drivers = employeesOf(state, warehouse.id).filter((e) => e.role === "driver").length;
  return Math.floor(BASE_TRIPS + drivers * TRIPS_PER_DRIVER * researchFactor(state, "trips"));
}
function canConvert(state, buildingId) {
  const building = buildingById(state, buildingId);
  if (!building) return { ok: false, message: "Unknown building." };
  if (building.occupantCompanyId !== state.playerCompanyId) {
    return { ok: false, message: "You have to lease or buy the unit first." };
  }
  if (building.businessId) return { ok: false, message: "There is a business trading here." };
  if (state.warehouses.some((w) => w.buildingId === buildingId)) {
    return { ok: false, message: "This is already a distribution centre." };
  }
  if (building.storageCapacity < 400) {
    return { ok: false, message: `Too small to be worth racking out \u2014 ${building.storageCapacity} units of storage.` };
  }
  return { ok: true, message: `Racking out ${building.address} gives you ${building.storageCapacity * RACKING_FACTOR} units of space.` };
}
var FIT_OUT_COST = 6500;
function openWarehouse(state, buildingId, name) {
  const check = canConvert(state, buildingId);
  if (!check.ok) return check;
  const company = playerCompany(state);
  if (company.cash < FIT_OUT_COST) {
    return { ok: false, message: `Racking, a loading bay and a forklift cost ${money(FIT_OUT_COST)}.` };
  }
  const building = buildingById(state, buildingId);
  if (!building) return { ok: false, message: "Unknown building." };
  post(state, company.id, "equipment", `Warehouse fit-out \u2014 ${building.address}`, -FIT_OUT_COST, null);
  const warehouse = {
    id: makeId("wh"),
    companyId: company.id,
    buildingId,
    name: name.trim().slice(0, 40) || `${company.name} Distribution`,
    stock: {},
    costBasis: {},
    employeeIds: [],
    autoDispatch: true,
    openedOnDay: state.day,
    dispatchedToday: 0
  };
  state.warehouses.push(warehouse);
  pushNews(state, "company", `${warehouse.name} is open`, `${building.address} is now racked out as a distribution centre. Order in bulk here and your shops can pull from it overnight.`, {
    importance: "normal"
  });
  return { ok: true, message: `${warehouse.name} is open at ${building.address}.` };
}
function closeWarehouse(state, warehouseId) {
  const warehouse = warehouseById(state, warehouseId);
  if (!warehouse) return { ok: false, message: "Unknown warehouse." };
  const value = stockValue(warehouse) * 0.5;
  if (value > 0) {
    post(state, warehouse.companyId, "stock", `Clearance \u2014 ${warehouse.name}`, value, null);
  }
  for (const employee of employeesOf(state, warehouse.id)) {
    employee.businessId = null;
    employee.companyId = null;
    state.employees = state.employees.filter((e) => e.id !== employee.id);
  }
  state.warehouses = state.warehouses.filter((w) => w.id !== warehouseId);
  return {
    ok: true,
    message: `${warehouse.name} is closed. Remaining stock raised ${money(value)}.`
  };
}
function shortfall(business) {
  const type = businessTypeOrThrow(business.typeId);
  const out = {};
  for (const productId of type.productIds) {
    const have = business.stock[productId] ?? 0;
    const incoming = business.incoming[productId] ?? 0;
    const reorder = business.reorderPoints[productId] ?? 0;
    const target = Math.max(reorder * 7, 60);
    const need = target - have - incoming;
    if (need > 1) out[productId] = need;
  }
  return out;
}
function planDispatch(state, warehouse) {
  const lines = [];
  const trips = tripsPerDay(state, warehouse);
  const available2 = { ...warehouse.stock };
  let used = 0;
  const shops = playerBusinesses(state).filter((b) => b.status !== "closed" && b.autoRestock).map((business) => ({ business, need: shortfall(business) })).filter((entry) => Object.keys(entry.need).length > 0).sort((a, b) => sum(Object.values(b.need), (n) => n) - sum(Object.values(a.need), (n) => n));
  for (const { business, need } of shops) {
    if (used >= trips) break;
    let room = storageFree(state, business);
    let sentAnything = false;
    for (const [productId, wanted] of Object.entries(need)) {
      const def = product(productId);
      if (!def) continue;
      const onRack = available2[productId] ?? 0;
      if (onRack < 1) continue;
      const fits = Math.floor(room / Math.max(0.01, def.volume));
      const units = Math.floor(Math.min(wanted, onRack, fits));
      if (units < 1) continue;
      available2[productId] = onRack - units;
      room -= units * def.volume;
      lines.push({ businessId: business.id, productId, units });
      sentAnything = true;
    }
    if (sentAnything) used += 1;
  }
  return lines;
}
function dispatchDaily(state) {
  for (const warehouse of warehousesOf(state)) {
    warehouse.dispatchedToday = 0;
    if (!warehouse.autoDispatch) continue;
    const lines = planDispatch(state, warehouse);
    if (lines.length === 0) continue;
    const byBusiness = /* @__PURE__ */ new Map();
    for (const line of lines) {
      const list = byBusiness.get(line.businessId) ?? [];
      list.push(line);
      byBusiness.set(line.businessId, list);
    }
    for (const [businessId, group] of byBusiness) {
      const business = businessById(state, businessId);
      if (!business) continue;
      for (const line of group) {
        const def = product(line.productId);
        if (!def) continue;
        const cost = warehouse.costBasis[line.productId] ?? def.wholesalePrice;
        warehouse.stock[line.productId] = Math.max(0, (warehouse.stock[line.productId] ?? 0) - line.units);
        const have = business.stock[line.productId] ?? 0;
        const currentCost = business.costBasis[line.productId] ?? cost;
        const total2 = have + line.units;
        business.costBasis[line.productId] = total2 > 0 ? (have * currentCost + line.units * cost) / total2 : cost;
        business.stock[line.productId] = total2;
      }
      warehouse.dispatchedToday += 1;
      const runCost = TRIP_COST * researchFactor(state, "logistics");
      post(state, warehouse.companyId, "logistics", `Delivery run \u2014 ${business.name}`, -runCost, businessId);
      business.today.otherCosts += runCost;
    }
    if (warehouse.dispatchedToday > 0) {
      const units = Math.round(sum(lines, (line) => line.units));
      pushNews(state, "supplier", `${warehouse.name} restocked ${warehouse.dispatchedToday} shop${warehouse.dispatchedToday === 1 ? "" : "s"}`, `${units} units left the racks overnight. No supplier lead time, no minimum order.`, {
        importance: "low"
      });
    }
  }
}
function warehouseDaily(state) {
  for (const warehouse of warehousesOf(state)) {
    const staff = employeesOf(state, warehouse.id);
    const wages = sum(staff, (e) => e.salary / 30);
    if (wages > 0) {
      post(state, warehouse.companyId, "wages", `Wages \u2014 ${warehouse.name}`, -wages, null);
    }
    let wasted = 0;
    for (const [productId, units] of Object.entries(warehouse.stock)) {
      if (units <= 0) continue;
      const def = product(productId);
      if (!def || def.shelfLife <= 0) continue;
      const rate = clamp(1 / (def.shelfLife * 9), 4e-3, 0.09);
      const lost = units * rate;
      if (lost < 0.01) continue;
      warehouse.stock[productId] = Math.max(0, units - lost);
      wasted += lost * (warehouse.costBasis[productId] ?? def.wholesalePrice);
    }
    if (wasted > 0) {
      postNonCash(state, warehouse.companyId, "cogs", `Waste \u2014 ${warehouse.name}`, -wasted, null);
    }
    if (wasted > 60) {
      pushAlert(
        state,
        "warning",
        `Stock is going off at ${warehouse.name}`,
        `About ${money(wasted)} of perishable stock was written off. A warehouse is the wrong place for anything short-dated.`,
        null,
        "logistics"
      );
    }
  }
}
var BULK_DELIVERY_RATE = 0.11;
var BULK_CALLOUT = 45;
function stockableProducts(state) {
  const ids = /* @__PURE__ */ new Set();
  for (const business of playerBusinesses(state)) {
    for (const productId of businessTypeOrThrow(business.typeId).productIds) ids.add(productId);
  }
  return [...ids];
}
function quoteBulk(state, supplierId, warehouseId, requested) {
  const problems = [];
  const def = supplier(supplierId);
  const warehouse = warehouseById(state, warehouseId);
  const lines = [];
  let units = 0;
  let volume = 0;
  let weight = 0;
  let goodsCost = 0;
  if (!def) problems.push("Unknown supplier.");
  if (!warehouse) problems.push("Unknown warehouse.");
  if (def && warehouse) {
    const stockable = new Set(stockableProducts(state));
    for (const input of requested) {
      const quantity = Math.floor(input.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) continue;
      const productDef = product(input.productId);
      if (!productDef) continue;
      if (!stockable.has(input.productId)) {
        problems.push(`None of your shops sell ${productDef.name}.`);
        continue;
      }
      if (!def.categories.includes(productDef.category)) {
        problems.push(`${def.name} does not carry ${productDef.name}.`);
        continue;
      }
      const price = unitPrice(state, supplierId, input.productId);
      lines.push({ productId: input.productId, quantity, unitPrice: price });
      units += quantity;
      volume += quantity * productDef.volume;
      weight += quantity * productDef.weight;
      goodsCost += quantity * price;
    }
    if (units === 0) problems.push("Nothing selected to order.");
    if (goodsCost > 0 && goodsCost < def.minimumOrderValue) {
      problems.push(`${def.name} has a minimum order of \u20AC${def.minimumOrderValue.toLocaleString("en-GB")}.`);
    }
    const room = freeSpace(state, warehouse);
    if (volume > room) {
      problems.push(`That is ${Math.round(volume - room)} units more than the racks will hold.`);
    }
  }
  const deliveryCost = units > 0 ? Math.round(BULK_CALLOUT + weight * BULK_DELIVERY_RATE) : 0;
  const total2 = Math.round(goodsCost + deliveryCost);
  if (total2 > playerCompany(state).cash) problems.push("Not enough cash for this order.");
  return {
    lines,
    units,
    volume,
    goodsCost: Math.round(goodsCost),
    deliveryCost,
    total: total2,
    leadTimeHours: def?.leadTimeHours ?? 0,
    // Six separate van deliveries, which is what the shops would otherwise pay.
    retailEquivalent: units > 0 ? Math.round(goodsCost + 15 * Math.max(1, lines.length) + weight * 0.18) : 0,
    problems
  };
}
function placeBulkOrder(state, supplierId, warehouseId, requested) {
  const quote = quoteBulk(state, supplierId, warehouseId, requested);
  if (quote.problems.length > 0) return { ok: false, message: quote.problems[0] };
  const def = supplier(supplierId);
  const warehouse = warehouseById(state, warehouseId);
  if (!def || !warehouse) return { ok: false, message: "Order could not be placed." };
  const now = absoluteHour(state);
  state.orders.push({
    id: makeId("po"),
    supplierId,
    businessId: warehouse.id,
    warehouseId: warehouse.id,
    lines: quote.lines,
    goodsCost: quote.goodsCost,
    deliveryCost: quote.deliveryCost,
    total: quote.total,
    placedOnTick: now,
    arrivesOnTick: now + def.leadTimeHours,
    status: "transit"
  });
  state.supplierSpend[supplierId] = (state.supplierSpend[supplierId] ?? 0) + quote.total;
  post(state, warehouse.companyId, "stock", `Bulk purchase \u2014 ${def.name}`, -quote.goodsCost, null);
  if (quote.deliveryCost > 0) {
    post(state, warehouse.companyId, "logistics", `Bulk delivery \u2014 ${def.name}`, -quote.deliveryCost, null);
  }
  return {
    ok: true,
    message: `${quote.units} units ordered into ${warehouse.name}, arriving in about ${def.leadTimeHours} hours.`
  };
}
function receiveBulk(state, order) {
  const warehouse = order.warehouseId ? warehouseById(state, order.warehouseId) : void 0;
  const def = supplier(order.supplierId);
  order.status = "delivered";
  if (!warehouse || !def) return;
  let received = 0;
  let rejected = 0;
  let credit = 0;
  for (const line of order.lines) {
    const productDef = product(line.productId);
    if (!productDef) continue;
    const room = Math.floor(freeSpace(state, warehouse) / Math.max(0.01, productDef.volume));
    const accepted = Math.max(0, Math.min(line.quantity, room));
    if (accepted > 0) {
      const have = warehouse.stock[line.productId] ?? 0;
      const currentCost = warehouse.costBasis[line.productId] ?? line.unitPrice;
      const total2 = have + accepted;
      warehouse.costBasis[line.productId] = total2 > 0 ? (have * currentCost + accepted * line.unitPrice) / total2 : line.unitPrice;
      warehouse.stock[line.productId] = total2;
      received += accepted;
    }
    const short = line.quantity - accepted;
    if (short > 0) {
      rejected += short;
      credit += short * line.unitPrice;
    }
  }
  if (credit > 0) {
    post(state, warehouse.companyId, "stock", `Credit \u2014 ${def.name}`, credit, null);
    pushAlert(
      state,
      "warning",
      `${warehouse.name} could not take the whole delivery`,
      `${Math.round(rejected)} units went back on the lorry and were credited. The racks are full.`,
      null,
      "logistics"
    );
  }
  if (received > 0) {
    pushNews(state, "supplier", `${Math.round(received)} units delivered to ${warehouse.name}`, `From ${def.name}. Your shops can draw on it from tonight.`, {
      importance: "low"
    });
  }
}
function warehouseCanSupply(state, productId, units) {
  for (const warehouse of warehousesOf(state)) {
    if (!warehouse.autoDispatch) continue;
    if ((warehouse.stock[productId] ?? 0) >= units) return true;
  }
  return false;
}
function hireToWarehouse(state, applicantId, warehouseId) {
  const warehouse = warehouseById(state, warehouseId);
  if (!warehouse) return { ok: false, message: "Unknown warehouse." };
  const applicant = state.applicants.find((a) => a.id === applicantId);
  if (!applicant) return { ok: false, message: "That applicant is no longer available." };
  if (applicant.role !== "warehouse" && applicant.role !== "driver" && applicant.role !== "manager") {
    return { ok: false, message: "A distribution centre needs warehouse staff, drivers or a manager." };
  }
  const company = playerCompany(state);
  const fee = recruitmentFee(state);
  const upfront = fee + applicant.salary / 30 * 7;
  if (company.cash < upfront) {
    return { ok: false, message: `You need ${money(upfront)} in cash to take someone on.` };
  }
  applicant.businessId = warehouse.id;
  applicant.companyId = company.id;
  applicant.hiredOnDay = state.day;
  applicant.lastRecognisedOnDay = state.day;
  state.employees.push(applicant);
  warehouse.employeeIds.push(applicant.id);
  state.applicants = state.applicants.filter((a) => a.id !== applicantId);
  state.applicants.push(generateApplicant(state));
  post(state, company.id, "recruitment", `Recruitment \u2014 ${applicant.name}`, -fee, null);
  return { ok: true, message: `${applicant.name} joins ${warehouse.name} as ${role(applicant.role).name}.` };
}

// src/sim/procurement.ts
var DELIVERY_RATE = 0.18;
var DELIVERY_CALLOUT = 15;
function unitPrice(state, supplierId, productId, districtEventCost = 1) {
  const def = supplier(supplierId);
  const productDef = product(productId);
  if (!def || !productDef) return 0;
  const spend = state.supplierSpend[supplierId] ?? 0;
  const discount = spend >= def.volumeThreshold ? def.volumeDiscount : 0;
  const buying = researchFactor(state, "purchasing");
  return Number(
    (productDef.wholesalePrice * def.priceMultiplier * (1 - discount) * state.economy.inflation * districtEventCost * buying * negotiationFactor(state)).toFixed(2)
  );
}
function quoteOrder(state, supplierId, businessId, requested) {
  const problems = [];
  const def = supplier(supplierId);
  const business = businessById(state, businessId);
  const building = business ? buildingById(state, business.buildingId) : void 0;
  const lines = [];
  let units = 0;
  let volume = 0;
  let weight = 0;
  let goodsCost = 0;
  if (!def) problems.push("Unknown supplier.");
  if (!business || !building) problems.push("Unknown business.");
  if (def && business && building) {
    const costFactor = eventFactors(state, building.district).supplyCost;
    const type = businessTypeOrThrow(business.typeId);
    for (const input of requested) {
      const quantity = Math.floor(input.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) continue;
      const productDef = product(input.productId);
      if (!productDef) continue;
      if (!type.productIds.includes(input.productId)) {
        problems.push(`${business.name} does not sell ${productDef.name}.`);
        continue;
      }
      if (!def.categories.includes(productDef.category)) {
        problems.push(`${def.name} does not carry ${productDef.name}.`);
        continue;
      }
      const price = unitPrice(state, supplierId, input.productId, costFactor);
      lines.push({ productId: input.productId, quantity, unitPrice: price });
      units += quantity;
      volume += quantity * productDef.volume;
      weight += quantity * productDef.weight;
      goodsCost += quantity * price;
    }
    if (units === 0) problems.push("Nothing selected to order.");
    if (goodsCost > 0 && goodsCost < def.minimumOrderValue) {
      problems.push(`${def.name} has a minimum order of \u20AC${def.minimumOrderValue.toLocaleString("en-GB")}.`);
    }
    const incomingVolume = sum(
      state.orders.filter((o) => o.businessId === businessId && o.status !== "delivered"),
      (order) => sum(order.lines, (line) => (product(line.productId)?.volume ?? 1) * line.quantity)
    );
    const room = storageFree(state, business) - incomingVolume;
    if (volume > room) {
      problems.push(
        `Storage is too small: ${Math.round(volume)} units of space needed, ${Math.max(0, Math.round(room))} free.`
      );
    }
  }
  const deliveryCost = units > 0 ? Number((DELIVERY_CALLOUT + weight * DELIVERY_RATE * (def ? 2 - def.reliability : 1)).toFixed(2)) : 0;
  const total2 = Number((goodsCost + deliveryCost).toFixed(2));
  if (total2 > playerCompany(state).cash) problems.push("Not enough cash for this order.");
  return {
    lines,
    units,
    volume: Number(volume.toFixed(1)),
    goodsCost: Number(goodsCost.toFixed(2)),
    deliveryCost,
    total: total2,
    leadTimeHours: def?.leadTimeHours ?? 0,
    problems
  };
}
function placeOrder(state, supplierId, businessId, requested) {
  const quote = quoteOrder(state, supplierId, businessId, requested);
  if (quote.problems.length > 0) return { ok: false, message: quote.problems[0] };
  const def = supplier(supplierId);
  const business = businessById(state, businessId);
  if (!def || !business) return { ok: false, message: "Order could not be placed." };
  const now = absoluteHour(state);
  const order = {
    id: makeId("po"),
    supplierId,
    businessId,
    lines: quote.lines,
    goodsCost: quote.goodsCost,
    deliveryCost: quote.deliveryCost,
    total: quote.total,
    placedOnTick: now,
    arrivesOnTick: now + def.leadTimeHours,
    status: "transit"
  };
  state.orders.push(order);
  learn(state, "ordered");
  for (const line of order.lines) {
    business.incoming[line.productId] = (business.incoming[line.productId] ?? 0) + line.quantity;
  }
  state.supplierSpend[supplierId] = (state.supplierSpend[supplierId] ?? 0) + quote.total;
  post(state, business.companyId, "stock", `Stock purchase \u2014 ${def.name}`, -quote.goodsCost, businessId);
  if (quote.deliveryCost > 0) {
    post(state, business.companyId, "logistics", `Delivery \u2014 ${def.name}`, -quote.deliveryCost, businessId);
    business.today.otherCosts += quote.deliveryCost;
  }
  return {
    ok: true,
    message: `${quote.units} units ordered from ${def.name}, arriving in about ${def.leadTimeHours} hours.`
  };
}
function processOrders(state) {
  const now = absoluteHour(state);
  for (const order of state.orders) {
    if (order.status === "delivered" || now < order.arrivesOnTick) continue;
    const def = supplier(order.supplierId);
    if (order.warehouseId) {
      receiveBulk(state, order);
      continue;
    }
    const business = businessById(state, order.businessId);
    if (!def || !business) {
      order.status = "delivered";
      continue;
    }
    if (order.status === "transit" && !gameRng.chance(def.reliability)) {
      order.status = "delayed";
      order.arrivesOnTick = now + gameRng.int(6, 26);
      pushAlert(
        state,
        "warning",
        `${def.name} delivery delayed`,
        `The order for ${business.name} is late. New estimate: ${order.arrivesOnTick - now} hours.`,
        business.id
      );
      pushNews(
        state,
        "supplier",
        `${def.name} has missed a delivery`,
        `Stock for ${business.name} is ${order.arrivesOnTick - now} hours late. Their reliability is ${Math.round(def.reliability * 100)}%.`,
        { businessId: business.id, importance: "normal" }
      );
      continue;
    }
    let received = 0;
    let rejected = 0;
    let credit = 0;
    for (const line of order.lines) {
      const productDef = product(line.productId);
      if (!productDef) continue;
      const room = Math.floor(storageFree(state, business) / Math.max(0.01, productDef.volume));
      const accepted = Math.max(0, Math.min(line.quantity, room));
      if (accepted > 0) {
        const current = business.stock[line.productId] ?? 0;
        const currentCost = business.costBasis[line.productId] ?? line.unitPrice;
        const total2 = current + accepted;
        business.costBasis[line.productId] = total2 > 0 ? (current * currentCost + accepted * line.unitPrice) / total2 : line.unitPrice;
        business.stock[line.productId] = total2;
        received += accepted;
      }
      const short = line.quantity - accepted;
      rejected += short;
      credit += short * line.unitPrice;
      business.incoming[line.productId] = Math.max(0, (business.incoming[line.productId] ?? 0) - line.quantity);
    }
    if (credit > 0.01) {
      post(state, business.companyId, "stock", `Credit note \u2014 ${def.name}`, credit, business.id);
    }
    order.status = "delivered";
    pushAlert(
      state,
      "info",
      `Delivery received at ${business.name}`,
      rejected > 0 ? `${received} units stored, ${rejected} did not fit and were credited. Consider a bigger unit.` : `${received} units are on the shelves.`,
      business.id
    );
  }
  const delivered = state.orders.filter((o) => o.status === "delivered");
  if (delivered.length > 40) {
    const keep = new Set(delivered.slice(-40).map((o) => o.id));
    state.orders = state.orders.filter((o) => o.status !== "delivered" || keep.has(o.id));
  }
}
function planOrder(state, business, supplierId, wishlist) {
  const def = supplier(supplierId);
  if (!def) return [];
  const lines = wishlist.filter((line) => {
    const productDef = product(line.productId);
    return productDef !== void 0 && def.categories.includes(productDef.category) && line.quantity > 0;
  });
  if (lines.length === 0) return [];
  const goods = sum(lines, (line) => line.quantity * unitPrice(state, supplierId, line.productId));
  const volume = sum(lines, (line) => line.quantity * (product(line.productId)?.volume ?? 1));
  if (goods <= 0 || volume <= 0) return [];
  const incomingVolume = sum(
    state.orders.filter((o) => o.businessId === business.id && o.status !== "delivered"),
    (order) => sum(order.lines, (line) => (product(line.productId)?.volume ?? 1) * line.quantity)
  );
  const room = storageFree(state, business) - incomingVolume;
  if (room <= 0) return [];
  const weight = sum(lines, (line) => line.quantity * (product(line.productId)?.weight ?? 0.5));
  const costAtOne = goods + DELIVERY_CALLOUT + weight * DELIVERY_RATE * (2 - def.reliability);
  const cash = playerCompany(state).cash;
  const maxByCash = cash * 0.85 / costAtOne;
  const maxByRoom = room / volume;
  const maxScale = Math.min(maxByCash, maxByRoom);
  const minScale = def.minimumOrderValue > 0 ? def.minimumOrderValue * 1.04 / goods : 0;
  if (minScale > maxScale) return [];
  const scale = Math.min(Math.max(1, minScale), maxScale);
  const scaled = lines.map((line) => ({ productId: line.productId, quantity: Math.max(1, Math.floor(line.quantity * scale)) })).filter((line) => line.quantity > 0);
  return quoteOrder(state, supplierId, business.id, scaled).problems.length === 0 ? scaled : [];
}
function rankedSuppliers(business) {
  const type = businessTypeOrThrow(business.typeId);
  const categories = new Set(
    type.productIds.map((id) => product(id)?.category).filter((c) => Boolean(c))
  );
  return SUPPLIERS.filter((def) => def.categories.some((category) => categories.has(category))).slice().sort((a, b) => a.priceMultiplier - b.priceMultiplier).map((def) => def.id);
}
function runAutoRestock(state) {
  for (const business of state.businesses) {
    if (business.companyId !== state.playerCompanyId || !business.autoRestock) continue;
    const type = businessTypeOrThrow(business.typeId);
    const wishlist = [];
    for (const productId of type.productIds) {
      const onHand = (business.stock[productId] ?? 0) + (business.incoming[productId] ?? 0);
      const reorder = business.reorderPoints[productId] ?? 0;
      if (onHand > reorder) continue;
      if (warehouseCanSupply(state, productId, Math.max(reorder, 20))) continue;
      wishlist.push({ productId, quantity: Math.max(Math.ceil(reorder * 7), 60) });
    }
    if (wishlist.length === 0) continue;
    for (const supplierId of rankedSuppliers(business)) {
      const lines = planOrder(state, business, supplierId, wishlist);
      if (lines.length === 0) continue;
      const result = placeOrder(state, supplierId, business.id, lines);
      if (result.ok) break;
    }
  }
}
function suggestOrder(state, business, supplierId, productIds) {
  const type = businessTypeOrThrow(business.typeId);
  const ids = productIds ?? type.productIds;
  const appealTotal = sum(
    type.productIds.map((id) => product(id)?.appeal ?? 0),
    (value) => value
  );
  if (appealTotal <= 0) return [];
  const wishlist = [];
  for (const productId of ids) {
    const def = product(productId);
    if (!def) continue;
    const share = def.appeal / appealTotal;
    const onHand = (business.stock[productId] ?? 0) + (business.incoming[productId] ?? 0);
    const perDay = type.baseCustomers * share * def.unitsPerBasket;
    const quantity = Math.max(0, Math.ceil(perDay * 7) - onHand);
    if (quantity > 0) wishlist.push({ productId, quantity });
  }
  if (wishlist.length === 0) return [];
  if (supplierId) {
    const planned = planOrder(state, business, supplierId, wishlist);
    if (planned.length > 0) return planned;
  }
  const budget = storageFree(state, business) * 0.9;
  const needed = sum(wishlist, (line) => line.quantity * (product(line.productId)?.volume ?? 1));
  const scale = needed > budget && needed > 0 ? budget / needed : 1;
  return wishlist.map((line) => ({ productId: line.productId, quantity: Math.floor(line.quantity * scale) })).filter((line) => line.quantity > 0);
}

// src/data/marketing.ts
var MARKETING_CHANNELS = [
  {
    id: "flyers",
    name: "Flyers",
    dailyCost: 45,
    reach: 0.06,
    conversion: 0.35,
    targets: ["adult", "senior"],
    minimumDays: 3,
    description: "Cheap, local and unglamorous. Works surprisingly well in residential areas."
  },
  {
    id: "local-ads",
    name: "Local advertising",
    dailyCost: 120,
    reach: 0.14,
    conversion: 0.4,
    targets: ["adult", "senior"],
    minimumDays: 7,
    description: "Local press and neighbourhood boards. Slow, steady awareness."
  },
  {
    id: "social",
    name: "Social media",
    dailyCost: 95,
    reach: 0.22,
    conversion: 0.5,
    targets: ["young", "adult"],
    minimumDays: 5,
    description: "Best reach per euro under 35. Almost invisible to older customers."
  },
  {
    id: "search",
    name: "Search advertising",
    dailyCost: 160,
    reach: 0.12,
    conversion: 0.72,
    targets: ["young", "adult", "senior"],
    minimumDays: 5,
    description: "Small reach, but it catches people who are already looking to buy."
  },
  {
    id: "influencer",
    name: "Influencer campaign",
    dailyCost: 340,
    reach: 0.31,
    conversion: 0.44,
    targets: ["young"],
    minimumDays: 7,
    description: "Large young audience. Expensive and hit-or-miss."
  },
  {
    id: "billboards",
    name: "Billboards",
    dailyCost: 260,
    reach: 0.34,
    conversion: 0.22,
    targets: ["adult", "senior"],
    minimumDays: 14,
    description: "Blunt city-wide reach. Builds brand rather than sales."
  },
  {
    id: "radio",
    name: "Radio",
    dailyCost: 180,
    reach: 0.26,
    conversion: 0.28,
    targets: ["adult", "senior"],
    minimumDays: 10,
    description: "Reaches commuters. Good for anything near a main road."
  }
];
var byId7 = new Map(MARKETING_CHANNELS.map((channel) => [channel.id, channel]));
function marketingChannel(id) {
  return byId7.get(id);
}

// src/sim/marketing.ts
function audienceMatch(channelId, districtId) {
  const channel = marketingChannel(channelId);
  if (!channel) return 0;
  const def = district(districtId);
  let match = 0;
  for (const target of channel.targets) match += def.ageMix[target];
  return clamp(match, 0.05, 1);
}
function expectedDailyAwareness(state, channelId, businessId) {
  const channel = marketingChannel(channelId);
  const business = businessById(state, businessId);
  if (!channel || !business) return 0;
  const building = state.buildings.find((b) => b.id === business.buildingId);
  if (!building) return 0;
  const match = audienceMatch(channelId, building.district);
  const headroom = clamp(1 - business.awareness / 100, 0.05, 1);
  return channel.reach * channel.conversion * match * headroom * 100 * 0.42 * marketingFactor(state) * marketingSkillFactor(state);
}
function startCampaign(state, channelId, businessId, days) {
  const channel = marketingChannel(channelId);
  const business = businessById(state, businessId);
  if (!channel || !business) return { ok: false, message: "Unknown campaign." };
  if (business.companyId !== state.playerCompanyId) return { ok: false, message: "That is not your business." };
  const length = Math.max(channel.minimumDays, Math.round(days));
  const total2 = channel.dailyCost * length;
  const company = playerCompany(state);
  if (company.cash < total2) {
    return { ok: false, message: `That campaign costs ${total2.toLocaleString("en-GB")} euro in total.` };
  }
  if (state.campaigns.some((c) => c.businessId === businessId && c.channelId === channelId)) {
    return { ok: false, message: "That campaign is already running for this business." };
  }
  const campaign = {
    id: makeId("camp"),
    companyId: company.id,
    businessId,
    channelId,
    daysLeft: length,
    dailyCost: channel.dailyCost
  };
  state.campaigns.push(campaign);
  return { ok: true, message: `${channel.name} campaign booked for ${length} days.` };
}
function stopCampaign(state, campaignId) {
  state.campaigns = state.campaigns.filter((campaign) => campaign.id !== campaignId);
}
function campaignsDaily(state) {
  for (const campaign of [...state.campaigns]) {
    const business = businessById(state, campaign.businessId);
    const channel = marketingChannel(campaign.channelId);
    if (!business || !channel) {
      state.campaigns = state.campaigns.filter((c) => c.id !== campaign.id);
      continue;
    }
    const company = playerCompany(state);
    if (company.cash < campaign.dailyCost) {
      state.campaigns = state.campaigns.filter((c) => c.id !== campaign.id);
      pushAlert(
        state,
        "warning",
        "Campaign cancelled",
        `${channel.name} for ${business.name} stopped because there was not enough cash to pay for it.`,
        business.id
      );
      continue;
    }
    post(state, company.id, "marketing", `${channel.name} \u2014 ${business.name}`, -campaign.dailyCost, business.id);
    business.today.marketing += campaign.dailyCost;
    business.awareness = clamp(
      business.awareness + expectedDailyAwareness(state, campaign.channelId, business.id),
      0,
      100
    );
    company.brandAwareness = clamp(company.brandAwareness + 0.05, 0, 100);
    campaign.daysLeft -= 1;
    if (campaign.daysLeft <= 0) {
      state.campaigns = state.campaigns.filter((c) => c.id !== campaign.id);
      pushAlert(
        state,
        "info",
        "Campaign finished",
        `${channel.name} for ${business.name} has ended. Awareness is now ${Math.round(business.awareness)}%.`,
        business.id
      );
    }
  }
}

// src/sim/decisions.ts
function base(defId, title, body, state, options, context = {}, numbers = {}, days = 4) {
  return {
    id: makeId("dec"),
    defId,
    title,
    body,
    day: state.day,
    expiresOnDay: state.day + days,
    options,
    context,
    numbers
  };
}
var POACH = {
  id: "poach",
  weight: 12,
  cooldown: 14,
  create(state) {
    const candidates = state.employees.filter((e) => e.skill > 55 && e.businessId);
    if (candidates.length === 0) return null;
    const employee = candidates.reduce((best, e) => e.skill > best.skill ? e : best, candidates[0]);
    const business = businessById(state, employee.businessId ?? "");
    const bonus = Math.round(employee.salary * 1.5);
    const raise = Math.round(employee.salary * 0.12);
    const canPromote = employee.role !== "manager";
    return base(
      "poach",
      `${employee.name} has an offer from a competitor`,
      `${employee.name} (${role(employee.role).name}, skill ${Math.round(employee.skill)}) has been approached by another company${business ? ` and works at ${business.name}` : ""}. Replacing them means recruitment costs and a less experienced team.`,
      state,
      [
        { id: "bonus", label: `Pay a retention bonus of ${money(bonus)}`, detail: "One-off cost. Buys loyalty now, changes nothing long term." },
        { id: "raise", label: `Raise their salary by ${money(raise)}/month`, detail: "Permanent cost, but the strongest hold on someone good." },
        canPromote ? { id: "promote", label: "Promote them to store manager", detail: "Salary rises 25% and they lift the whole team \u2014 if you need a manager." } : { id: "promote", label: "Promote them", detail: "Already at the top of their track.", blocked: "They are already a manager." },
        { id: "nothing", label: "Let them decide for themselves", detail: "Costs nothing. They may well leave." }
      ],
      { employeeId: employee.id },
      { bonus, raise }
    );
  },
  resolve(state, decision, optionId) {
    const employee = state.employees.find((e) => e.id === decision.context.employeeId);
    if (!employee) return "That employee has already left.";
    const company = playerCompany(state);
    if (optionId === "bonus") {
      const bonus = decision.numbers.bonus ?? 0;
      if (company.cash < bonus) return "Not enough cash for the bonus \u2014 they were not persuaded.";
      post(state, company.id, "wages", `Retention bonus \u2014 ${employee.name}`, -bonus, employee.businessId);
      employee.morale = clamp(employee.morale + 22, 0, 100);
      employee.loyalty = clamp(employee.loyalty + 26, 0, 100);
      return `${employee.name} is staying. Morale and loyalty are up, but the offer will come round again.`;
    }
    if (optionId === "raise") {
      employee.salary = Math.round(employee.salary * 1.12);
      employee.morale = clamp(employee.morale + 16, 0, 100);
      employee.loyalty = clamp(employee.loyalty + 34, 0, 100);
      return `${employee.name} accepted ${money(employee.salary)} a month and turned the offer down.`;
    }
    if (optionId === "promote") {
      if (employee.role === "manager") return "They are already a manager.";
      employee.role = "manager";
      employee.salary = Math.round(employee.salary * 1.25);
      employee.morale = clamp(employee.morale + 26, 0, 100);
      employee.loyalty = clamp(employee.loyalty + 40, 0, 100);
      return `${employee.name} is now store manager on ${money(employee.salary)} a month, and will lift everyone around them.`;
    }
    if (gameRng.chance(clamp(0.62 - employee.loyalty / 260, 0.15, 0.75))) {
      state.employees = state.employees.filter((e) => e.id !== employee.id);
      const business = businessById(state, employee.businessId ?? "");
      if (business) business.employeeIds = business.employeeIds.filter((id) => id !== employee.id);
      pushNews(state, "staff", `${employee.name} has left for a competitor`, "You chose not to match the offer.", {
        businessId: employee.businessId,
        importance: "high"
      });
      return `${employee.name} took the other job.`;
    }
    employee.loyalty = clamp(employee.loyalty - 12, 0, 100);
    return `${employee.name} stayed anyway, but will remember that you did nothing.`;
  },
  expire(state, decision) {
    return this.resolve(state, decision, "nothing");
  }
};
var SUPPLIER_DEAL = {
  id: "supplier-deal",
  weight: 10,
  cooldown: 20,
  create(state) {
    const used = SUPPLIERS.filter((def2) => (state.supplierSpend[def2.id] ?? 0) > 800);
    if (used.length === 0) return null;
    const def = gameRng.pick(used);
    const commitment = Math.max(50, Math.round(def.volumeThreshold * def.volumeDiscount * 0.4 / 10) * 10);
    return base(
      "supplier-deal",
      `${def.name} is offering you preferred terms`,
      `${def.name} will grant you their volume discount of ${Math.round(def.volumeDiscount * 100)}% immediately, instead of making you spend ${money(
        def.volumeThreshold
      )} to earn it. In return they want a commitment fee of ${money(commitment)} up front.`,
      state,
      [
        { id: "accept", label: `Pay ${money(commitment)} and take the discount`, detail: `Every future order from ${def.name} is ${Math.round(def.volumeDiscount * 100)}% cheaper.` },
        { id: "decline", label: "Decline", detail: "Keep the cash and earn the discount the slow way." }
      ],
      { supplierId: def.id },
      { commitment }
    );
  },
  resolve(state, decision, optionId) {
    const def = supplier(decision.context.supplierId);
    if (!def) return "That offer is no longer on the table.";
    if (optionId !== "accept") return `You passed on ${def.name}'s offer.`;
    const commitment = decision.numbers.commitment ?? 0;
    const company = playerCompany(state);
    if (company.cash < commitment) return "Not enough cash to take the deal.";
    post(state, company.id, "other", `Commitment fee \u2014 ${def.name}`, -commitment);
    state.supplierSpend[def.id] = Math.max(state.supplierSpend[def.id] ?? 0, def.volumeThreshold);
    pushNews(state, "supplier", `Preferred terms agreed with ${def.name}`, `Orders are now ${Math.round(def.volumeDiscount * 100)}% cheaper.`, {
      importance: "normal"
    });
    return `${def.name} has moved you onto discounted pricing.`;
  },
  expire(_state, _decision) {
    return "The supplier withdrew the offer.";
  }
};
var RENT_REVIEW = {
  id: "rent-review",
  weight: 9,
  cooldown: 16,
  create(state) {
    const leased = state.buildings.filter(
      (b) => b.status === "rented" && b.occupantCompanyId === state.playerCompanyId
    );
    if (leased.length === 0) return null;
    const building = gameRng.pick(leased);
    const increase = Math.round(gameRng.range(6, 18));
    const newRent = Math.round(building.rent * (1 + increase / 100) / 5) * 5;
    return base(
      "rent-review",
      `Rent review at ${building.address}`,
      `Your landlord wants to raise the rent by ${increase}%, from ${money(building.rent)} to ${money(newRent)} a month. ${district(building.district).name} has been getting busier.`,
      state,
      [
        { id: "accept", label: "Accept the new rent", detail: `${money(newRent)} a month from now on.` },
        { id: "negotiate", label: "Negotiate", detail: "Might halve the increase. Might annoy them into holding firm." },
        { id: "leave", label: "Give notice and leave", detail: "Only possible if the unit is empty.", blocked: building.businessId ? "There is a business trading here." : void 0 }
      ],
      { buildingId: building.id },
      { increase, newRent },
      5
    );
  },
  resolve(state, decision, optionId) {
    const building = buildingById(state, decision.context.buildingId);
    if (!building) return "That unit is no longer yours.";
    const newRent = decision.numbers.newRent ?? building.rent;
    if (optionId === "negotiate") {
      if (gameRng.chance(0.5)) {
        const halved = Math.round((building.rent + newRent) / 2 / 5) * 5;
        building.rent = halved;
        return `They settled at ${money(halved)} a month.`;
      }
      building.rent = newRent;
      return `They would not move. Rent is ${money(newRent)} a month.`;
    }
    if (optionId === "leave") {
      if (building.businessId) return "You cannot walk away while a business is trading there.";
      building.status = "available";
      building.occupantCompanyId = null;
      post(state, state.playerCompanyId, "rent", `Deposit returned \u2014 ${building.address}`, Math.round(building.rent * 1.5));
      return `You handed the keys back at ${building.address}.`;
    }
    building.rent = newRent;
    return `Rent at ${building.address} is now ${money(newRent)} a month.`;
  },
  expire(state, decision) {
    return this.resolve(state, decision, "accept");
  }
};
var PRESS_FEATURE = {
  id: "press-feature",
  weight: 8,
  cooldown: 18,
  create(state) {
    const open = playerBusinesses(state).filter((b) => b.status === "open");
    if (open.length === 0) return null;
    const business = gameRng.pick(open);
    const cost = Math.round(gameRng.range(900, 2600) / 50) * 50;
    return base(
      "press-feature",
      "A city magazine wants to feature you",
      `A local title is running a piece on independent businesses in ${district(buildingById(state, business.buildingId)?.district ?? "downtown").name}. A paid feature on ${business.name} costs ${money(cost)} and would put you in front of a lot of people at once.`,
      state,
      [
        { id: "pay", label: `Pay ${money(cost)} for the feature`, detail: "A large one-off jump in local awareness." },
        { id: "decline", label: "Decline politely", detail: "Keep the cash." }
      ],
      { businessId: business.id },
      { cost }
    );
  },
  resolve(state, decision, optionId) {
    const business = businessById(state, decision.context.businessId);
    if (!business) return "That business no longer exists.";
    if (optionId !== "pay") return "You let the feature go.";
    const cost = decision.numbers.cost ?? 0;
    const company = playerCompany(state);
    if (company.cash < cost) return "Not enough cash for the feature.";
    post(state, company.id, "marketing", `Magazine feature \u2014 ${business.name}`, -cost, business.id);
    business.awareness = clamp(business.awareness + 22, 0, 100);
    business.reputation = clamp(business.reputation + 4, 0, 100);
    pushNews(state, "company", `${business.name} featured in the local press`, "Awareness jumped sharply in the district.", {
      businessId: business.id,
      importance: "high"
    });
    return `The feature ran. Awareness at ${business.name} is now ${Math.round(business.awareness)}%.`;
  },
  expire() {
    return "The magazine went to print without you.";
  }
};
var BULK_STOCK = {
  id: "bulk-stock",
  weight: 11,
  cooldown: 10,
  create(state) {
    const stocking = playerBusinesses(state).filter(
      (b) => businessTypeOrThrow(b.typeId).productIds.length > 0 && b.status !== "setup"
    );
    if (stocking.length === 0) return null;
    const business = gameRng.pick(stocking);
    const type = businessTypeOrThrow(business.typeId);
    const productId = gameRng.pick(type.productIds);
    const def = product(productId);
    if (!def) return null;
    const room = Math.floor(storageFree(state, business) / Math.max(0.01, def.volume));
    if (room < 40) return null;
    const quantity = Math.min(room, Math.round(gameRng.range(80, 320)));
    const unit = Number((def.wholesalePrice * 0.65).toFixed(2));
    const total2 = Math.round(unit * quantity);
    return base(
      "bulk-stock",
      `Clearance ${def.name.toLowerCase()} offered to ${business.name}`,
      `A wholesaler is clearing ${quantity} units of ${def.name} at ${moneyCents(unit)} each \u2014 35% below the going rate. It has to be collected today, and it will take ${Math.round(
        quantity * def.volume
      )} units of your storage.`,
      state,
      [
        { id: "buy", label: `Take all ${quantity} for ${money(total2)}`, detail: "Cheap stock, but cash and shelf space are tied up." },
        { id: "decline", label: "Pass", detail: "Keep the space and the cash." }
      ],
      { businessId: business.id, productId },
      { quantity, unit, total: total2 },
      2
    );
  },
  resolve(state, decision, optionId) {
    const business = businessById(state, decision.context.businessId);
    const def = product(decision.context.productId);
    if (!business || !def) return "That offer has gone.";
    if (optionId !== "buy") return "You passed on the clearance stock.";
    const quantity = decision.numbers.quantity ?? 0;
    const unit = decision.numbers.unit ?? def.wholesalePrice;
    const total2 = decision.numbers.total ?? Math.round(unit * quantity);
    const company = playerCompany(state);
    if (company.cash < total2) return "Not enough cash to take the pallet.";
    const room = Math.floor(storageFree(state, business) / Math.max(0.01, def.volume));
    const accepted = Math.min(quantity, room);
    if (accepted <= 0) return "There is no longer room for it.";
    const current = business.stock[def.id] ?? 0;
    const currentCost = business.costBasis[def.id] ?? def.wholesalePrice;
    const newTotal = current + accepted;
    business.costBasis[def.id] = newTotal > 0 ? (current * currentCost + accepted * unit) / newTotal : unit;
    business.stock[def.id] = newTotal;
    post(state, company.id, "stock", `Clearance stock \u2014 ${def.name}`, -Math.round(unit * accepted), business.id);
    return `${accepted} units of ${def.name} are on the shelves at ${moneyCents(unit)} each.`;
  },
  expire() {
    return "The pallet went to somebody else.";
  }
};
var PRICE_WAR = {
  id: "price-war",
  weight: 10,
  cooldown: 12,
  create(state) {
    const open = playerBusinesses(state).filter((b) => b.status === "open");
    for (const business of open) {
      const rivals = rivalsOf(state, business);
      const cheaper = rivals.filter((rival2) => priceIndex(rival2) < priceIndex(business) * 0.93);
      if (cheaper.length === 0) continue;
      const rival = cheaper[0];
      const owner = state.companies.find((c) => c.id === rival.companyId);
      const gap = Math.round((1 - priceIndex(rival) / priceIndex(business)) * 100);
      return base(
        "price-war",
        `${owner?.name ?? "A rival"} is undercutting ${business.name}`,
        `${rival.name} is trading about ${gap}% below your prices in the same district. Customers are already comparing.`,
        state,
        [
          { id: "match", label: "Cut your prices by 8%", detail: "Protects share, cuts your margin on every sale." },
          { id: "marketing", label: "Raise marketing by \u20AC120/day instead", detail: "Defend on awareness rather than price." },
          { id: "hold", label: "Hold your prices", detail: "Bet that quality and location carry you." }
        ],
        { businessId: business.id, rivalId: rival.id },
        { gap }
      );
    }
    return null;
  },
  resolve(state, decision, optionId) {
    const business = businessById(state, decision.context.businessId);
    if (!business) return "That business no longer exists.";
    if (optionId === "match") {
      for (const [productId, price] of Object.entries(business.prices)) {
        business.prices[productId] = Number((price * 0.92).toFixed(2));
      }
      return `Prices at ${business.name} are down 8%. Watch the margin.`;
    }
    if (optionId === "marketing") {
      business.marketingBudget += 120;
      return `Marketing at ${business.name} is now ${money(business.marketingBudget)} a day.`;
    }
    return "You held your prices. The next few days will show whether that was right.";
  },
  expire() {
    return "You let the price gap stand.";
  }
};
var PAY_RISE = {
  id: "pay-rise",
  weight: 9,
  cooldown: 15,
  create(state) {
    const withStaff = playerBusinesses(state).filter((b) => employeesOf(state, b.id).length >= 2);
    if (withStaff.length === 0) return null;
    const business = gameRng.pick(withStaff);
    const staff = employeesOf(state, business.id);
    const monthly = sum(staff, (e) => e.salary);
    const rise = Math.round(monthly * 0.08);
    return base(
      "pay-rise",
      `The team at ${business.name} is asking for a rise`,
      `${staff.length} people are asking for 8% across the board \u2014 about ${money(rise)} a month. Morale there is ${Math.round(
        sum(staff, (e) => e.morale) / staff.length
      )}/100.`,
      state,
      [
        { id: "grant", label: "Grant the full 8%", detail: `${money(rise)}/month more. Morale and loyalty jump.` },
        { id: "partial", label: "Offer 4%", detail: `${money(Math.round(rise / 2))}/month. A smaller lift, and they know it.` },
        { id: "refuse", label: "Refuse", detail: "Costs nothing today. Morale falls and some may start looking." }
      ],
      { businessId: business.id },
      { rise }
    );
  },
  resolve(state, decision, optionId) {
    const business = businessById(state, decision.context.businessId);
    if (!business) return "That business no longer exists.";
    const staff = employeesOf(state, business.id);
    if (staff.length === 0) return "Nobody works there any more.";
    const factor2 = optionId === "grant" ? 1.08 : optionId === "partial" ? 1.04 : 1;
    const moraleShift = optionId === "grant" ? 16 : optionId === "partial" ? 6 : -15;
    for (const employee of staff) {
      employee.salary = Math.round(employee.salary * factor2);
      employee.morale = clamp(employee.morale + moraleShift, 0, 100);
      employee.loyalty = clamp(employee.loyalty + moraleShift * 0.6, 0, 100);
    }
    if (optionId === "refuse") {
      pushNews(state, "staff", `Pay request refused at ${business.name}`, "Morale has dropped across the team.", {
        businessId: business.id
      });
      return "You said no. Morale has taken a hit.";
    }
    return `Salaries at ${business.name} are up ${optionId === "grant" ? "8" : "4"}%.`;
  },
  expire(state, decision) {
    return this.resolve(state, decision, "refuse");
  }
};
var PRIME_UNIT = {
  id: "prime-unit",
  weight: 8,
  cooldown: 18,
  create(state) {
    if (playerBusinesses(state).filter((b) => b.status === "open").length === 0) return null;
    const available2 = state.buildings.filter((b) => b.status === "available" && b.footTraffic > 15e3);
    if (available2.length === 0) return null;
    const building = available2.reduce((best, b) => b.footTraffic > best.footTraffic ? b : best, available2[0]);
    const discounted = Math.round(building.rent * 0.8 / 5) * 5;
    return base(
      "prime-unit",
      `A prime unit has come free at ${building.address}`,
      `${district(building.district).name}, ${building.size} m\xB2, ${building.footTraffic.toLocaleString("en-GB")} passers-by a day. The landlord wants it filled quickly and will hold the rent at ${money(
        discounted
      )} instead of ${money(building.rent)} if you sign now. You still pay the usual deposit.`,
      state,
      [
        { id: "take", label: `Sign the lease at ${money(discounted)}/month`, detail: `${money(discounted * 3)} due today. The unit is yours to fit out.` },
        { id: "decline", label: "Not now", detail: "It will go to somebody else." }
      ],
      { buildingId: building.id },
      { discounted },
      3
    );
  },
  resolve(state, decision, optionId) {
    const building = buildingById(state, decision.context.buildingId);
    if (!building) return "That unit has gone.";
    if (optionId !== "take") return "You let the unit go.";
    if (building.status !== "available") return "Somebody else took it first.";
    const discounted = decision.numbers.discounted ?? building.rent;
    const original = building.rent;
    building.rent = discounted;
    const result = rentBuilding(state, building.id);
    if (!result.ok) {
      building.rent = original;
      return result.message;
    }
    pushNews(state, "property", `Signed a lease at ${building.address}`, `Held at ${money(discounted)} a month.`, {
      importance: "normal"
    });
    return `${building.address} is yours at ${money(discounted)} a month. Create a business there when you are ready.`;
  },
  expire() {
    return "The unit was let to somebody else.";
  }
};
var DEFS = [POACH, SUPPLIER_DEAL, RENT_REVIEW, PRESS_FEATURE, BULK_STOCK, PRICE_WAR, PAY_RISE, PRIME_UNIT];
var defById = new Map(DEFS.map((def) => [def.id, def]));
function decisionsDaily(state) {
  for (const decision2 of [...state.decisions]) {
    if (state.day < decision2.expiresOnDay) continue;
    const def = defById.get(decision2.defId);
    state.decisions = state.decisions.filter((d) => d.id !== decision2.id);
    if (!def) continue;
    const outcome = def.expire(state, decision2);
    pushNews(state, "company", decision2.title, `No decision was taken. ${outcome}`, { importance: "normal" });
  }
  if (state.decisions.length > 0) return;
  const trading = playerBusinesses(state).filter((b) => b.status === "open");
  if (trading.length === 0) return;
  const oldest = Math.min(...trading.map((b) => b.openedOnDay));
  if (state.day - oldest < 4) return;
  if (!gameRng.chance(0.3)) return;
  const eligible = DEFS.filter((def) => state.day - (state.decisionHistory[def.id] ?? -999) >= def.cooldown);
  if (eligible.length === 0) return;
  const total2 = eligible.reduce((acc, def) => acc + def.weight, 0);
  let roll = gameRng.next() * total2;
  let chosen = eligible[0];
  for (const def of eligible) {
    roll -= def.weight;
    if (roll <= 0) {
      chosen = def;
      break;
    }
  }
  const decision = chosen.create(state);
  if (!decision) return;
  state.decisions.push(decision);
  state.decisionHistory[chosen.id] = state.day;
  pushAlert(state, "warning", decision.title, "A decision is waiting for you.", decision.context.businessId ?? null, "news");
  pushNews(state, "company", decision.title, decision.body, {
    businessId: decision.context.businessId ?? null,
    importance: "high"
  });
}
function resolveDecision(state, decisionId, optionId) {
  const decision = state.decisions.find((d) => d.id === decisionId);
  if (!decision) return { ok: false, message: "That decision has already been settled." };
  const def = defById.get(decision.defId);
  if (!def) {
    state.decisions = state.decisions.filter((d) => d.id !== decisionId);
    return { ok: false, message: "That decision is no longer valid." };
  }
  const option = decision.options.find((o) => o.id === optionId);
  if (option?.blocked) return { ok: false, message: option.blocked };
  const outcome = def.resolve(state, decision, optionId);
  state.decisions = state.decisions.filter((d) => d.id !== decisionId);
  pushNews(state, "company", decision.title, outcome, {
    businessId: decision.context.businessId ?? null
  });
  return { ok: true, message: outcome };
}

// src/sim/goals.ts
var MAX_ACTIVE_GOALS = 3;
function readMetric(state, metric2, businessId) {
  const business = businessId ? state.businesses.find((b) => b.id === businessId) : null;
  switch (metric2) {
    case "netWorth":
      return netWorth(state);
    case "cash":
      return playerCompany(state).cash;
    case "locations":
      return playerBusinesses(state).filter((b) => b.status === "open").length;
    case "weeklyProfit":
      return sum(state.dayHistory.slice(-7), (d) => d.profit);
    case "reviewScore":
      return business?.reviewScore ?? 0;
    case "dailyCustomers":
      return business?.yesterday.customers ?? 0;
    case "awareness":
      return business?.awareness ?? 0;
    case "reputation":
      return business?.reputation ?? 0;
    case "marketShare":
      return business ? shareOf(state, business) * 100 : 0;
    case "staffMorale": {
      const staff = business ? employeesOf(state, business.id) : state.employees;
      return staff.length === 0 ? 0 : sum(staff, (e) => e.morale) / staff.length;
    }
    default:
      return 0;
  }
}
function shareOf(state, business) {
  const building = buildingById(state, business.buildingId);
  if (!building) return 0;
  const type = businessTypeOrThrow(business.typeId);
  const share = typeShare(business.typeId);
  const peers = state.businesses.filter((other) => {
    if (other.status !== "open" || other.typeId !== business.typeId) return false;
    return buildingById(state, other.buildingId)?.district === building.district;
  });
  const total2 = sum(peers, (peer) => attractiveness(state, peer).score) + backgroundOutlets(building.district, type.category, 0) * share;
  return total2 > 0 ? attractiveness(state, business).score / total2 : 0;
}
function goalProgress(state, goal2) {
  const now = readMetric(state, goal2.metric, goal2.businessId);
  const span = goal2.target - goal2.startValue;
  if (span <= 0) return now >= goal2.target ? 1 : 0;
  return clamp((now - goal2.startValue) / span, 0, 1);
}
function goal(defId, state, fields) {
  const businessId = fields.businessId ?? null;
  return {
    id: makeId("goal"),
    defId,
    title: fields.title,
    detail: fields.detail,
    metric: fields.metric,
    businessId,
    target: fields.target,
    startValue: readMetric(state, fields.metric, businessId),
    day: state.day,
    expiresOnDay: state.day + fields.days,
    rewardCash: fields.rewardCash,
    rewardText: fields.rewardText
  };
}
function anyOpen(state) {
  const open = playerBusinesses(state).filter((b) => b.status === "open");
  return open.length === 0 ? null : gameRng.pick(open);
}
var DEFS2 = [
  {
    // Get a shop's reviews up. The most common thing a real operator works on.
    id: "reviews",
    create(state) {
      const business = anyOpen(state);
      if (!business || business.reviewCount < 8 || business.reviewScore > 4.3) return null;
      const target = Math.min(4.6, Math.round((business.reviewScore + 0.5) * 10) / 10);
      return goal("reviews", state, {
        title: `Get ${business.name} to ${target.toFixed(1)}\u2605`,
        detail: `It sits at ${business.reviewScore.toFixed(1)}\u2605 today. Price, service, stock and the state of the premises are what customers are scoring.`,
        metric: "reviewScore",
        target,
        businessId: business.id,
        days: 24,
        rewardCash: 3500,
        rewardText: "A local business award comes with \u20AC3,500 and a write-up in the paper."
      });
    }
  },
  {
    // Trade your way to a busier shop.
    id: "customers",
    create(state) {
      const business = anyOpen(state);
      if (!business || business.yesterday.customers < 5) return null;
      const target = Math.round(business.yesterday.customers * 1.6);
      return goal("customers", state, {
        title: `Serve ${target} customers a day at ${business.name}`,
        detail: `Yesterday it served ${Math.round(business.yesterday.customers)}. Awareness, price and the state of the shelves all move this number.`,
        metric: "dailyCustomers",
        target,
        businessId: business.id,
        days: 21,
        rewardCash: 4e3,
        rewardText: "The district trade association pays \u20AC4,000 towards your next fit-out."
      });
    }
  },
  {
    // Take share off the competition in one district.
    id: "share",
    create(state) {
      const business = anyOpen(state);
      if (!business) return null;
      const current = shareOf(state, business) * 100;
      if (current < 2 || current > 34) return null;
      const target = Math.round(current * 1.5);
      const building = buildingById(state, business.buildingId);
      return goal("share", state, {
        title: `Take ${target}% of the ${building ? district(building.district).name : "local"} market`,
        detail: `${business.name} holds ${current.toFixed(1)}% of the customers for what it sells here. Every point comes off somebody else.`,
        metric: "marketShare",
        target,
        businessId: business.id,
        days: 30,
        rewardCash: 6e3,
        rewardText: "A supplier signs you as their flagship stockist: \u20AC6,000 up front."
      });
    }
  },
  {
    // A week in profit, which is a different thing from a good day.
    id: "weekly-profit",
    create(state) {
      const open = playerBusinesses(state).filter((b) => b.status === "open");
      if (open.length === 0) return null;
      const recent = sum(state.dayHistory.slice(-7), (d) => d.profit);
      const target = Math.max(1200, Math.round((recent > 0 ? recent * 1.5 : 1500) / 100) * 100);
      return goal("weekly-profit", state, {
        title: `Clear ${money(target)} of profit in a week`,
        detail: recent > 0 ? `The last seven days made ${money(recent)}. Costs are as much of the answer as revenue.` : `The last seven days lost ${money(Math.abs(recent))}. Getting to ${money(target)} means fixing something structural.`,
        metric: "weeklyProfit",
        target,
        days: 18,
        rewardCash: 2500,
        rewardText: "Your bank cuts your arrangement fees and refunds \u20AC2,500."
      });
    }
  },
  {
    // Expansion.
    id: "expand",
    create(state) {
      const open = playerBusinesses(state).filter((b) => b.status === "open").length;
      if (open === 0 || open > 6) return null;
      return goal("expand", state, {
        title: `Run ${open + 1} businesses at once`,
        detail: `You have ${open} trading. A second site spreads the risk and shares the overhead \u2014 if the first one can carry the setup cost.`,
        metric: "locations",
        target: open + 1,
        days: 40,
        rewardCash: 8e3,
        rewardText: "The city development fund pays \u20AC8,000 towards opening in a new district."
      });
    }
  },
  {
    // Somewhere for a struggling player to aim that is not growth.
    id: "reserve",
    create(state) {
      const cash = playerCompany(state).cash;
      if (cash < 2e3 || cash > 12e4) return null;
      const target = Math.round(cash * 1.4 / 1e3) * 1e3;
      return goal("reserve", state, {
        title: `Build a cash reserve of ${money(target)}`,
        detail: `You are holding ${money(cash)}. A business with no reserve cannot survive a bad month, however good the trading looks.`,
        metric: "cash",
        target,
        days: 30,
        rewardCash: 0,
        rewardText: "Your credit rating improves, which makes borrowing cheaper."
      });
    }
  },
  {
    // People.
    id: "morale",
    create(state) {
      const business = anyOpen(state);
      if (!business) return null;
      const staff = employeesOf(state, business.id);
      if (staff.length < 2) return null;
      const morale = sum(staff, (e) => e.morale) / staff.length;
      if (morale > 68) return null;
      return goal("morale", state, {
        title: `Get the team at ${business.name} to 70 morale`,
        detail: `The average is ${Math.round(morale)}/100. Pay, workload and recognition are the three levers, and unhappy staff serve worse.`,
        metric: "staffMorale",
        target: 70,
        businessId: business.id,
        days: 21,
        rewardCash: 1500,
        rewardText: "Lower turnover saves you \u20AC1,500 in recruitment you no longer need."
      });
    }
  }
];
var defById2 = new Map(DEFS2.map((def) => [def.id, def]));
function goalsDaily(state) {
  for (const active of [...state.goals]) {
    if (active.businessId && !state.businesses.some((b) => b.id === active.businessId)) {
      state.goals = state.goals.filter((g) => g.id !== active.id);
      continue;
    }
    if (readMetric(state, active.metric, active.businessId) >= active.target) {
      state.goals = state.goals.filter((g) => g.id !== active.id);
      state.goalsCompleted += 1;
      if (active.rewardCash > 0) {
        post(state, state.playerCompanyId, "other", `Goal reward \u2014 ${active.title}`, active.rewardCash, active.businessId);
      }
      if (active.defId === "reserve") {
        const company = playerCompany(state);
        company.creditRating = clamp(company.creditRating + 6, 0, 100);
      }
      pushNews(state, "company", `Goal met: ${active.title}`, active.rewardText, {
        businessId: active.businessId,
        importance: "high"
      });
      pushAlert(state, "success", `Goal met: ${active.title}`, active.rewardText, active.businessId, "progress");
      continue;
    }
    if (state.day >= active.expiresOnDay) {
      state.goals = state.goals.filter((g) => g.id !== active.id);
      pushNews(state, "company", `Goal missed: ${active.title}`, "The deadline passed. Another one will come along.", {
        businessId: active.businessId
      });
    }
  }
  if (state.goals.length >= MAX_ACTIVE_GOALS) return;
  if (playerBusinesses(state).length === 0) return;
  if (!gameRng.chance(0.45)) return;
  const taken = new Set(state.goals.map((g) => g.defId));
  const candidates = DEFS2.filter((def) => !taken.has(def.id));
  if (candidates.length === 0) return;
  const chosen = defById2.get(gameRng.pick(candidates).id);
  const created = chosen?.create(state) ?? null;
  if (!created) return;
  state.goals.push(created);
  pushNews(state, "company", `New goal: ${created.title}`, created.detail, {
    businessId: created.businessId
  });
}

// src/sim/contracts.ts
var OFFER_LIMIT = 3;
var STRIKES = 3;
var CLIENTS = [
  "Halstead Hospitality",
  "Northgate Schools Trust",
  "Vandermeer Facilities",
  "Orwell Care Homes",
  "Kestrel Hotels",
  "Pemberton Catering",
  "Sable Events",
  "Merrick Logistics",
  "Thornbury Council",
  "Ravensworth Stadium",
  "Langmere Airlines",
  "Quarry Construction"
];
var MARGINS = [0.14, 0.19, 0.26, 0.34];
function contractsOf(state) {
  return state.contracts.filter((c) => c.status === "active");
}
function supplyable(state) {
  const ids = /* @__PURE__ */ new Set();
  for (const warehouse of warehousesOf(state)) {
    for (const [productId, units] of Object.entries(warehouse.stock)) {
      if (units > 0) ids.add(productId);
    }
  }
  for (const business of playerBusinesses(state)) {
    for (const productId of Object.keys(business.prices)) {
      if (productId !== "service") ids.add(productId);
    }
  }
  return [...ids];
}
function makeOffer(state) {
  const pool = supplyable(state);
  if (pool.length === 0) return null;
  const productId = gameRng.pick(pool);
  const def = product(productId);
  if (!def) return null;
  const level = levelOf(state);
  const scale = 24 * level.n ** 1.5;
  const units = Math.max(20, Math.round(gameRng.range(scale * 0.7, scale * 1.6) / 5) * 5);
  const margin = gameRng.pick(MARGINS);
  const unitPrice2 = Math.round(def.wholesalePrice * (1 + margin) * 100) / 100;
  const weeks = gameRng.int(4, 13);
  const weekly = Math.round(units * unitPrice2);
  const demanding = MARGINS.indexOf(margin) / (MARGINS.length - 1);
  const headcount = Math.round(1 + demanding * 3 + level.n * 0.6);
  const needsWarehouse = demanding > 0.5 || units > 120;
  const penalty = Math.round(weekly * (0.3 + demanding * 0.5));
  return {
    id: makeId("offer"),
    client: gameRng.pick(CLIENTS),
    productId,
    unitsPerWeek: units,
    unitPrice: unitPrice2,
    weeks,
    requiresHeadcount: headcount,
    requiresWarehouse: needsWarehouse,
    penalty,
    reputationPerWeek: Math.round(1 + demanding * 2),
    offeredOnDay: state.day,
    expiresOnDay: state.day + 7
  };
}
function eligibility(state, offer) {
  const reasons = [];
  if (state.employees.length < offer.requiresHeadcount) {
    reasons.push(`${offer.requiresHeadcount} staff (you have ${state.employees.length})`);
  }
  if (offer.requiresWarehouse && warehousesOf(state).length === 0) {
    reasons.push("a distribution centre to hold the stock");
  }
  return { ok: reasons.length === 0, reasons };
}
function available(state, productId) {
  let units = 0;
  for (const warehouse of warehousesOf(state)) units += warehouse.stock[productId] ?? 0;
  for (const business of playerBusinesses(state)) units += business.stock[productId] ?? 0;
  return units;
}
function accept(state, offerId) {
  const offer = state.contractOffers.find((o) => o.id === offerId);
  if (!offer) return { ok: false, message: "That offer is no longer on the table." };
  const check = eligibility(state, offer);
  if (!check.ok) return { ok: false, message: `You would need ${check.reasons.join(" and ")}.` };
  learn(state, "signed");
  state.contracts.push({
    id: makeId("contract"),
    client: offer.client,
    productId: offer.productId,
    unitsPerWeek: offer.unitsPerWeek,
    unitPrice: offer.unitPrice,
    weeksTotal: offer.weeks,
    weeksDone: 0,
    missed: 0,
    penalty: offer.penalty,
    reputationPerWeek: offer.reputationPerWeek,
    startedOnDay: state.day,
    status: "active"
  });
  state.contractOffers = state.contractOffers.filter((o) => o.id !== offerId);
  const def = product(offer.productId);
  pushNews(
    state,
    "company",
    `${playerCompany(state).name} signs with ${offer.client}`,
    `${offer.unitsPerWeek} ${def?.name.toLowerCase() ?? "units"} a week for ${offer.weeks} weeks at ${money(offer.unitPrice)} a unit.`
  );
  return { ok: true, message: `Signed with ${offer.client}.` };
}
function decline(state, offerId) {
  state.contractOffers = state.contractOffers.filter((o) => o.id !== offerId);
}
function contractsWeekly(state) {
  for (const contract of contractsOf(state)) {
    const def = product(contract.productId);
    const wanted = contract.unitsPerWeek;
    const taken = draw(state, contract.productId, wanted);
    if (taken >= wanted) {
      const paid = Math.round(wanted * contract.unitPrice);
      post(state, state.playerCompanyId, "sales", `${contract.client} \u2014 contract delivery`, paid, null);
      contract.weeksDone += 1;
      bumpReputation(state, contract.reputationPerWeek);
    } else {
      const paid = Math.round(taken * contract.unitPrice);
      if (paid > 0) post(state, state.playerCompanyId, "sales", `${contract.client} \u2014 short delivery`, paid, null);
      const penalty = Math.round(contract.penalty * penaltyFactor(state));
      post(state, state.playerCompanyId, "other", `${contract.client} \u2014 shortfall penalty`, -penalty, null);
      contract.missed += 1;
      contract.weeksDone += 1;
      bumpReputation(state, -contract.reputationPerWeek * 2);
      pushAlert(
        state,
        contract.missed >= STRIKES ? "critical" : "warning",
        `Short on the ${contract.client} contract`,
        `${taken} of ${wanted} ${def?.name.toLowerCase() ?? "units"} went out. ${money(penalty)} penalty, ${contract.missed} of ${STRIKES} strikes.`,
        null,
        "contracts"
      );
    }
    if (contract.missed >= STRIKES) {
      contract.status = "failed";
      pushNews(
        state,
        "company",
        `${contract.client} cancels its contract`,
        `Three short weeks and the work has gone elsewhere. ${money(contract.penalty)} a week no longer comes in.`,
        { importance: "high" }
      );
    } else if (contract.weeksDone >= contract.weeksTotal) {
      contract.status = "completed";
      const bonus = Math.round(contract.unitsPerWeek * contract.unitPrice * 0.5);
      post(state, state.playerCompanyId, "sales", `${contract.client} \u2014 completion bonus`, bonus, null);
      bumpReputation(state, 4);
      pushNews(
        state,
        "company",
        `${contract.client} contract completed`,
        `${contract.weeksTotal} weeks delivered. A ${money(bonus)} completion bonus, and a client who will come back.`
      );
    }
  }
  state.contracts = state.contracts.filter((c) => c.status === "active" || c.startedOnDay > state.day - 120);
}
function draw(state, productId, wanted) {
  let left = wanted;
  for (const warehouse of warehousesOf(state)) {
    if (left <= 0) break;
    const have = warehouse.stock[productId] ?? 0;
    const take = Math.min(have, left);
    if (take > 0) {
      warehouse.stock[productId] = have - take;
      left -= take;
    }
  }
  for (const business of playerBusinesses(state)) {
    if (left <= 0) break;
    if (business.status !== "open") continue;
    const have = business.stock[productId] ?? 0;
    const take = Math.min(Math.floor(have / 2), left);
    if (take > 0) {
      business.stock[productId] = have - take;
      left -= take;
    }
  }
  return wanted - left;
}
function bumpReputation(state, amount) {
  for (const business of playerBusinesses(state)) {
    if (business.status !== "open") continue;
    business.reputation = clamp(business.reputation + amount * 0.4, 0, 100);
  }
}
function contractOffersWeekly(state) {
  state.contractOffers = state.contractOffers.filter((offer2) => offer2.expiresOnDay > state.day);
  if (state.contractOffers.length >= OFFER_LIMIT) return;
  const offer = makeOffer(state);
  if (!offer) return;
  state.contractOffers.push(offer);
  pushNews(
    state,
    "company",
    `${offer.client} is looking for a supplier`,
    `${offer.unitsPerWeek} units a week for ${offer.weeks} weeks, ${money(offer.unitsPerWeek * offer.unitPrice)} a week.`
  );
}
function weeklyContractValue(state) {
  return sum(contractsOf(state), (c) => c.unitsPerWeek * c.unitPrice);
}

// src/sim/cashflow.ts
var HORIZON = 30;
var WARNING_DAYS = 14;
function commitments(state, days = HORIZON) {
  const out = [];
  const from = state.day;
  for (const loan of state.loans) {
    if (loan.outstanding <= 0) continue;
    for (let day = from + 1; day <= from + days; day += 1) {
      if (day % DAYS_PER_MONTH !== 0) continue;
      out.push({ day, label: `${loan.lender} repayment`, amount: -loan.monthlyPayment });
    }
  }
  return out.sort((a, b) => a.day - b.day);
}
function dailyNet(state) {
  const recent = state.dayHistory.slice(-14);
  if (recent.length === 0) return 0;
  return sum(recent, (day) => day.revenue - day.costs) / recent.length;
}
function forecast(state, days = HORIZON) {
  const company = playerCompany(state);
  const net = dailyNet(state);
  const dated = commitments(state, days);
  const balances = [];
  let balance = company.cash;
  let emptyOnDay = null;
  for (let i = 1; i <= days; i += 1) {
    const day = state.day + i;
    balance += net;
    for (const item of dated) {
      if (item.day === day) balance += item.amount;
    }
    balances.push(balance);
    if (emptyOnDay === null && balance < 0) emptyOnDay = day;
  }
  const runway = emptyOnDay === null ? days : emptyOnDay - state.day;
  return { balances, emptyOnDay, runway, dailyNet: net, commitments: dated };
}
function cashWarning(state) {
  if (state.dayHistory.length < 5) return null;
  const view = forecast(state);
  if (view.emptyOnDay === null) return null;
  const days = view.emptyOnDay - state.day;
  if (days > WARNING_DAYS) return null;
  return `Your company may run out of cash in ${days} day${days === 1 ? "" : "s"}.`;
}

// src/sim/accounts.ts
var ACCOUNT_LIMIT = 24;
var REVENUE = ["sales", "service"];
var DIRECT = ["cogs"];
var OVERHEAD = [
  "wages",
  "rent",
  "utilities",
  "marketing",
  "logistics",
  "training",
  "severance",
  "recruitment",
  "management",
  "outsourcing"
];
function total(state, categories) {
  return sum(categories, (category) => state.period.categories[category] ?? 0);
}
function byCategory(state, category) {
  return state.period.categories[category] ?? 0;
}
function closeMonth(state, days = 30) {
  const to = state.day;
  const from = Math.max(1, state.period.fromDay);
  const trading = state.dayHistory.filter((record) => record.day >= from && record.day <= to);
  if (trading.length < 5) return null;
  const revenue = total(state, REVENUE);
  const costOfSales = total(state, DIRECT);
  const overheads = total(state, OVERHEAD);
  const interest = byCategory(state, "interest");
  const tax = byCategory(state, "tax");
  const company = playerCompany(state);
  const businesses = playerBusinesses(state);
  const account = {
    id: `m${Math.ceil(to / days)}`,
    fromDay: from,
    toDay: to,
    revenue,
    costOfSales,
    grossProfit: revenue - costOfSales,
    wages: byCategory(state, "wages"),
    rent: byCategory(state, "rent"),
    utilities: byCategory(state, "utilities"),
    marketing: byCategory(state, "marketing"),
    logistics: byCategory(state, "logistics"),
    training: byCategory(state, "training") + byCategory(state, "severance"),
    people: byCategory(state, "wages") + byCategory(state, "training") + byCategory(state, "severance") + byCategory(state, "recruitment") + byCategory(state, "management"),
    recruitment: byCategory(state, "recruitment"),
    management: byCategory(state, "management"),
    outsourcing: byCategory(state, "outsourcing"),
    overheads,
    interest,
    tax,
    netProfit: revenue - costOfSales - overheads - interest - tax,
    customers: sum(trading, (record) => record.customers),
    cash: company.cash,
    stock: inventoryValue(state),
    property: propertyValue(state),
    goodwill: goodwillValue(state),
    debt: debtTotal(state),
    netWorth: netWorth(state),
    headcount: state.employees.length,
    locations: businesses.filter((b) => b.status === "open").length,
    byBusiness: businesses.map((business) => {
      const took = state.period.revenueByBusiness[business.id] ?? 0;
      const spent = state.period.costsByBusiness[business.id] ?? 0;
      return { businessId: business.id, name: business.name, revenue: took, costs: spent, profit: took - spent };
    })
  };
  state.accounts.push(account);
  learn(state, "closedMonth");
  if (state.accounts.length > ACCOUNT_LIMIT) state.accounts.shift();
  state.period = emptyPeriod(to + 1);
  return account;
}
function movements(account, before) {
  const rows = [
    { label: "Turnover", now: account.revenue, before: before.revenue, change: 0, higherIsBetter: true },
    { label: "Cost of sales", now: account.costOfSales, before: before.costOfSales, change: 0, higherIsBetter: false },
    { label: "Wages", now: account.wages, before: before.wages, change: 0, higherIsBetter: false },
    { label: "Rent", now: account.rent, before: before.rent, change: 0, higherIsBetter: false },
    { label: "Utilities", now: account.utilities, before: before.utilities, change: 0, higherIsBetter: false },
    { label: "Marketing", now: account.marketing, before: before.marketing, change: 0, higherIsBetter: false },
    { label: "Logistics", now: account.logistics, before: before.logistics, change: 0, higherIsBetter: false },
    { label: "Interest", now: account.interest, before: before.interest, change: 0, higherIsBetter: false }
  ];
  for (const row2 of rows) row2.change = row2.now - row2.before;
  return rows.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}
function grossMarginOf(account) {
  return account.revenue > 0 ? account.grossProfit / account.revenue : 0;
}
function basketOf(account) {
  return account.customers > 0 ? account.revenue / account.customers : 0;
}
function monthInALine(account, before) {
  const result = account.netProfit >= 0 ? "profit" : "loss";
  if (!before) {
    return `Turnover ${Math.round(account.revenue).toLocaleString("en-GB")}, ${result} of ${Math.round(Math.abs(account.netProfit)).toLocaleString("en-GB")} at a gross margin of ${Math.round(grossMarginOf(account) * 100)}%.`;
  }
  const moved = movements(account, before)[0];
  const direction = moved.change > 0 ? "up" : "down";
  return `${result === "profit" ? "Profit" : "Loss"} of ${Math.round(Math.abs(account.netProfit)).toLocaleString("en-GB")} against ${Math.round(Math.abs(before.netProfit)).toLocaleString("en-GB")} last month. ${moved.label} ${direction} ${Math.round(Math.abs(moved.change)).toLocaleString("en-GB")}.`;
}

// src/sim/economy.ts
function economyDaily(state) {
  const economy = state.economy;
  const trend = 100 + economy.growth * 320;
  economy.confidence = clamp(
    economy.confidence + (trend - economy.confidence) * 0.02 + gameRng.range(-1.4, 1.4),
    45,
    165
  );
  economy.inflation = clamp(economy.inflation * 1.00007, 1, 6);
  const rateTarget = clamp(0.02 + (economy.confidence - 100) / 1400 + (economy.inflation - 1) * 0.06, 5e-3, 0.14);
  economy.interestRate = clamp(economy.interestRate + (rateTarget - economy.interestRate) * 0.03, 5e-3, 0.15);
  const unemploymentTarget = clamp(0.11 - (economy.confidence - 100) / 900, 0.025, 0.14);
  economy.unemployment = clamp(
    economy.unemployment + (unemploymentTarget - economy.unemployment) * 0.02,
    0.02,
    0.16
  );
  economy.growth = clamp(economy.growth + gameRng.range(-8e-4, 8e-4), -0.02, 0.06);
  const label = economyLabel(state).label;
  if (label !== economy.lastLabel) {
    const worse = ["Recession", "Slowing"].includes(label);
    pushNews(
      state,
      "economy",
      `Northgate economy: ${label.toLowerCase()}`,
      worse ? `Consumer confidence has fallen to ${Math.round(economy.confidence)}. People are spending less, and cheaper businesses will feel it least.` : `Consumer confidence is at ${Math.round(economy.confidence)}. Households have more to spend than they did.`,
      { importance: "high" }
    );
    economy.lastLabel = label;
  }
  for (const def of DISTRICTS) {
    const districtState = state.districts[def.id];
    if (!districtState) continue;
    const dailyGrowth = def.growth / 360;
    districtState.demandIndex = clamp(
      districtState.demandIndex * (1 + dailyGrowth) + gameRng.range(-2e-3, 2e-3),
      0.55,
      1.85
    );
    districtState.rentIndex = clamp(
      districtState.rentIndex + (districtState.demandIndex - districtState.rentIndex) * 0.01,
      0.6,
      2.2
    );
    districtState.propertyIndex = clamp(
      districtState.propertyIndex * (1 + dailyGrowth * 1.4) + gameRng.range(-15e-4, 25e-4),
      0.55,
      3
    );
  }
  advanceEvents(state);
}
function advanceEvents(state) {
  for (const active2 of [...state.events]) {
    active2.daysLeft -= 1;
    if (active2.daysLeft > 0) continue;
    const def = cityEvent(active2.defId);
    state.events = state.events.filter((event) => event.id !== active2.id);
    if (def) {
      pushAlert(state, "info", `${def.name} has ended`, "Conditions are returning to normal.", null, "news");
    }
  }
  if (state.events.length >= 3) return;
  if (!gameRng.chance(0.17)) return;
  let roll = gameRng.next() * TOTAL_EVENT_WEIGHT;
  let chosen = CITY_EVENTS[0];
  for (const candidate of CITY_EVENTS) {
    roll -= candidate.weight;
    if (roll <= 0) {
      chosen = candidate;
      break;
    }
  }
  if (state.events.some((event) => event.defId === chosen.id)) return;
  const [min, max] = chosen.durationDays;
  const active = {
    id: makeId("evt"),
    defId: chosen.id,
    daysLeft: gameRng.int(min, max)
  };
  state.events.push(active);
  const scope = chosen.districts.length > 0 ? districtNames(chosen.districts) : "the whole city";
  const bad = chosen.demand < 0.95 || chosen.supplyCost > 1.1 || chosen.rent > 1.05;
  pushAlert(state, bad ? "warning" : "info", chosen.name, `${chosen.description} Affects ${scope} for about ${active.daysLeft} days.`, null, "news");
  pushNews(state, "economy", chosen.name, `${chosen.description} Affects ${scope} for about ${active.daysLeft} days.`, {
    importance: bad ? "high" : "normal"
  });
}
function districtNames(ids) {
  const names = ids.map((id) => DISTRICTS.find((d) => d.id === id)?.name).filter((name) => Boolean(name));
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
function revalueProperty(state) {
  for (const building of state.buildings) {
    const districtState = state.districts[building.district];
    const def = DISTRICTS.find((d) => d.id === building.district);
    if (!districtState || !def) continue;
    const conditionFactor = 0.7 + building.condition / 100 * 0.45;
    const base2 = building.size * def.pricePerSqm * conditionFactor;
    building.value = Math.round(base2 * districtState.propertyIndex * state.economy.inflation / 500) * 500;
    building.rent = Math.round(building.size * def.rentPerSqm * conditionFactor * districtState.rentIndex / 5) * 5;
    building.condition = clamp(building.condition - 0.02, 5, 100);
  }
}
function economyLabel(state) {
  const confidence = state.economy.confidence;
  if (confidence >= 125) return { label: "Booming", tone: "good" };
  if (confidence >= 108) return { label: "Growing", tone: "good" };
  if (confidence >= 92) return { label: "Stable", tone: "neutral" };
  if (confidence >= 75) return { label: "Slowing", tone: "bad" };
  return { label: "Recession", tone: "bad" };
}

// src/sim/achievements.ts
function ratio(current, target) {
  return target <= 0 ? 0 : Math.max(0, Math.min(1, current / target));
}
var ACHIEVEMENTS = [
  {
    id: "first-employee",
    name: "First employee",
    description: "Hire your first member of staff.",
    progress: (state) => ratio(state.employees.length, 1)
  },
  {
    id: "doors-open",
    name: "Open for business",
    description: "Open your first business.",
    progress: (state) => ratio(playerBusinesses(state).filter((b) => b.status === "open").length, 1)
  },
  {
    id: "first-profit",
    name: "First profitable day",
    description: "Finish a day in profit.",
    progress: (state) => ratio(state.dayHistory.filter((d) => d.profit > 0).length, 1)
  },
  {
    id: "profit-10k",
    name: "\u20AC10,000 profit",
    description: "Make \u20AC10,000 of cumulative profit.",
    progress: (state) => ratio(sum(state.dayHistory, (d) => d.profit), 1e4)
  },
  {
    id: "revenue-1m",
    name: "First million in revenue",
    description: "Take \u20AC1,000,000 in total revenue.",
    progress: (state) => ratio(state.stats.revenueTotal, 1e6)
  },
  {
    id: "three-locations",
    name: "Three locations",
    description: "Operate three businesses at once.",
    progress: (state) => ratio(playerBusinesses(state).length, 3)
  },
  {
    id: "ten-locations",
    name: "Ten locations",
    description: "Operate ten businesses at once.",
    progress: (state) => ratio(playerBusinesses(state).length, 10)
  },
  {
    id: "staff-25",
    name: "Twenty-five on the payroll",
    description: "Employ twenty-five people.",
    progress: (state) => ratio(state.employees.length, 25)
  },
  {
    id: "staff-100",
    name: "One hundred employees",
    description: "Employ one hundred people.",
    progress: (state) => ratio(state.employees.length, 100)
  },
  {
    id: "landlord",
    name: "Property owner",
    description: "Own three buildings outright.",
    progress: (state) => {
      const player = playerCompany(state);
      return ratio(
        state.buildings.filter((b) => b.status === "owned" && b.occupantCompanyId === player.id).length,
        3
      );
    }
  },
  {
    id: "networth-500k",
    name: "Half a million",
    description: "Reach a net worth of \u20AC500,000.",
    progress: (state) => ratio(netWorth(state), 5e5)
  },
  {
    id: "networth-5m",
    name: "Five million",
    description: "Reach a net worth of \u20AC5,000,000.",
    progress: (state) => ratio(netWorth(state), 5e6)
  },
  {
    id: "market-leader",
    name: "Market leader",
    description: "Own more open businesses than any single competitor.",
    progress: (state) => {
      const mine = playerBusinesses(state).filter((b) => b.status === "open").length;
      if (mine === 0) return 0;
      const rivals = /* @__PURE__ */ new Map();
      for (const business of state.businesses) {
        if (business.companyId === state.playerCompanyId || business.status !== "open") continue;
        rivals.set(business.companyId, (rivals.get(business.companyId) ?? 0) + 1);
      }
      const best = Math.max(0, ...rivals.values());
      return mine > best ? 1 : ratio(mine, best + 1);
    }
  }
];
var TIERS = [
  { name: "Startup", minNetWorth: 0 },
  { name: "Small Business", minNetWorth: 12e4 },
  { name: "Established Business", minNetWorth: 5e5 },
  { name: "Regional Company", minNetWorth: 2e6 },
  { name: "National Company", minNetWorth: 1e7 },
  { name: "Corporation", minNetWorth: 5e7 },
  { name: "Business Empire", minNetWorth: 25e7 }
];
function currentTier(state) {
  const worth = netWorth(state);
  let index = 0;
  for (let i = 0; i < TIERS.length; i += 1) {
    if (worth >= TIERS[i].minNetWorth) index = i;
  }
  const next = TIERS[index + 1] ?? null;
  const floor = TIERS[index].minNetWorth;
  const progress = next ? ratio(worth - floor, next.minNetWorth - floor) : 1;
  return { name: TIERS[index].name, next: next?.name ?? null, progress };
}
function checkAchievements(state) {
  for (const def of ACHIEVEMENTS) {
    if (state.achievements.some((a) => a.id === def.id)) continue;
    if (def.progress(state) < 1) continue;
    state.achievements.push({ id: def.id, unlockedOnDay: state.day });
    pushAlert(state, "success", `Achievement: ${def.name}`, def.description, null, "progress");
  }
}

// src/sim/engine.ts
var Engine = class {
  state;
  accumulator = 0;
  lastFrame = 0;
  frame = null;
  running = false;
  constructor(state) {
    this.state = state;
  }
  replaceState(state) {
    this.state = state;
    this.accumulator = 0;
    emit("reset", void 0);
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.lastFrame = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      const delta2 = clamp((now - this.lastFrame) / 1e3, 0, 0.5);
      this.lastFrame = now;
      this.advance(delta2);
      this.frame = requestAnimationFrame(loop);
    };
    this.frame = requestAnimationFrame(loop);
  }
  stop() {
    this.running = false;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
  }
  setSpeed(index) {
    this.state.speed = clamp(Math.round(index), 0, SPEEDS.length - 1);
  }
  togglePause() {
    this.state.speed = this.state.speed === 0 ? 2 : 0;
  }
  /** Advances the simulation by `seconds` of real time. */
  advance(seconds) {
    const hoursPerSecond = SPEEDS[this.state.speed] ?? 0;
    if (hoursPerSecond <= 0) return;
    this.accumulator += seconds * hoursPerSecond;
    let steps = 0;
    while (this.accumulator >= 1 && steps < 48) {
      this.accumulator -= 1;
      steps += 1;
      this.stepHour();
    }
    if (steps > 0) emit("tick", { day: this.state.day, hour: this.state.hour });
  }
  /** Runs a single in-game hour. Exposed so tests and the debug panel can step. */
  stepHour() {
    const state = this.state;
    const allocations = allocateDemand(state);
    for (const business of state.businesses) {
      const allocation = allocations.get(business.id);
      if (business.companyId === state.playerCompanyId) tradeHour(state, business, allocation);
      else tradeHourAI(state, business, allocation);
    }
    processOrders(state);
    state.hour += 1;
    if (state.hour < 24) return;
    this.settleDay();
    state.hour = 0;
    state.day += 1;
  }
  settleDay() {
    const state = this.state;
    const company = playerCompany(state);
    payWages(state);
    let customers = 0;
    for (const business of playerBusinesses(state)) {
      customers += business.today.customers;
      businessDaily(state, business);
    }
    propertyDaily(state);
    warehouseDaily(state);
    dispatchDaily(state);
    campaignsDaily(state);
    competitorDaily(state);
    decisionsDaily(state);
    employeesDaily(state);
    runAutoRestock(state);
    economyDaily(state);
    revalueProperty(state);
    for (const building of state.buildings) {
      if (building.renovationEndsOnDay !== null && state.day >= building.renovationEndsOnDay) {
        building.renovationEndsOnDay = null;
        building.condition = 100;
        pushAlert(state, "info", "Renovation complete", `${building.address} is back to full condition.`, null, "property");
      }
    }
    const { revenue, costs } = dayTotals(state, state.day);
    const worth = netWorth(state);
    state.dayHistory.push({
      day: state.day,
      revenue,
      costs,
      profit: revenue - costs,
      cash: company.cash,
      netWorth: worth,
      customers
    });
    if (state.dayHistory.length > DAY_HISTORY_LIMIT) state.dayHistory.shift();
    state.stats.peakNetWorth = Math.max(state.stats.peakNetWorth, worth);
    updateCreditRating(state);
    checkAchievements(state);
    goalsDaily(state);
    checkPromotion(state);
    researchDaily(state);
    headOfficeDaily(state);
    if (playerBusinesses(state).some((b) => b.status === "open")) {
      learn(state, "traded");
      learn(state, "soldTo", Math.min(20, customers / 50));
      learn(state, "marketed", Math.min(4, sum(playerBusinesses(state), (b) => b.marketingBudget) / 200));
      const team = state.employees.filter((e) => e.companyId === state.playerCompanyId);
      if (team.length > 0 && sum(team, (e) => e.morale) / team.length > 65) learn(state, "keptTeamHappy");
    }
    tidyDivisions(state);
    mergersDaily(state);
    const warning = cashWarning(state);
    if (warning) pushAlert(state, "critical", "Cashflow warning", warning, null, "finance");
    if (state.day % 7 === 0) this.settleWeek();
    if (state.day % DAYS_PER_MONTH === 0) this.settleMonth();
    this.checkSolvency();
    emit("day", { day: state.day });
  }
  settleWeek() {
    const state = this.state;
    competitorWeekly(state);
    if (contractsUnlocked(state) || state.contracts.length > 0) {
      contractsWeekly(state);
      if (contractsUnlocked(state)) contractOffersWeekly(state);
    }
    const week = state.dayHistory.slice(-7);
    if (week.length >= 3) {
      const revenue = week.reduce((acc, d) => acc + d.revenue, 0);
      const profit = week.reduce((acc, d) => acc + d.profit, 0);
      const customers = week.reduce((acc, d) => acc + d.customers, 0);
      pushNews(
        state,
        "market",
        `Week in review: ${profit >= 0 ? "profit" : "loss"} of \u20AC${Math.abs(Math.round(profit)).toLocaleString("en-GB")}`,
        `\u20AC${Math.round(revenue).toLocaleString("en-GB")} of revenue from ${Math.round(customers).toLocaleString("en-GB")} customers across ${playerBusinesses(state).filter((b) => b.status === "open").length} open locations.`,
        { importance: "normal" }
      );
    }
  }
  settleMonth() {
    const state = this.state;
    const { missed } = settleLoansMonthly(state);
    if (missed > 0) {
      pushAlert(
        state,
        "critical",
        "Missed loan payment",
        `${missed} loan payment${missed > 1 ? "s" : ""} could not be met. Interest has been added and your credit rating has fallen.`,
        null
      );
    }
    const tax = chargeTax(state);
    if (tax > 0) {
      pushAlert(state, "info", "Corporation tax paid", `\u20AC${Math.round(tax).toLocaleString("en-GB")} on last month's profit.`, null, "finance");
    }
    const account = closeMonth(state, DAYS_PER_MONTH);
    if (account) {
      const before = state.accounts[state.accounts.length - 2];
      pushNews(
        state,
        "company",
        `Management accounts: \u20AC${Math.round(account.netProfit).toLocaleString("en-GB")} ${account.netProfit >= 0 ? "profit" : "loss"}`,
        monthInALine(account, before),
        { importance: "high" }
      );
    }
  }
  /** Bankruptcy: the player is warned first, then the game ends. */
  checkSolvency() {
    const state = this.state;
    const company = playerCompany(state);
    if (state.stats.bankrupt && company.cash >= 0 && netWorth(state) > 0) {
      state.stats.bankrupt = false;
      pushAlert(
        state,
        "info",
        "Back in the black",
        "The account is positive again and the company is worth more than it owes. You traded out of it.",
        null
      );
      pushNews(state, "company", "The company has traded out of insolvency", "Cash is positive and net worth is above zero again.", {
        importance: "high"
      });
      return;
    }
    if (company.cash >= 0) return;
    const debt = -company.cash;
    const assets = netWorth(state) + debt;
    if (assets > 0 && debt < assets * 0.35) {
      pushAlert(
        state,
        "critical",
        "Your account is overdrawn",
        `You are \u20AC${Math.round(debt).toLocaleString("en-GB")} in the red. Sell stock or property, cut costs, or take a loan.`,
        null
      );
      return;
    }
    if (!state.stats.bankrupt) {
      state.stats.bankrupt = true;
      state.speed = 0;
      const losing = playerBusinesses(state).filter((b) => sum(b.profitHistory.slice(-7), (p2) => p2) < 0).map((b) => b.name);
      pushAlert(
        state,
        "critical",
        "Bankrupt",
        losing.length > 0 ? `Debts exceeded what the company is worth. The heaviest losses came from ${losing.join(", ")}.` : "Debts exceeded what the company is worth.",
        null
      );
    }
  }
};

// src/sim/city.ts
function pickSuitable(rng, def, size) {
  const categories = [];
  const preference = def.preferences;
  const order = ["retail", "food", "services", "specialized"];
  for (const category of order) {
    const weight = preference[category] ?? 1;
    const sizeFit = category === "food" ? clamp(1.4 - size / 400, 0.2, 1.2) : category === "services" ? clamp(size / 160, 0.3, 1.3) : 1;
    if (rng.chance(clamp(weight * 0.55 * sizeFit, 0.08, 0.95))) categories.push(category);
  }
  if (categories.length === 0) categories.push(order[rng.int(0, order.length - 1)]);
  return categories;
}
function trafficFactor(frontage, corner) {
  const base2 = frontage === "arterial" ? 1.32 : frontage === "street" ? 0.95 : 0.62;
  return corner ? base2 * 1.18 : base2;
}
function generateCity() {
  const rng = new Rng(CITY_SEED ^ 20958);
  const layout = cityLayout();
  const byDistrict = /* @__PURE__ */ new Map();
  for (const plot of layout.plots) {
    const list = byDistrict.get(plot.district) ?? [];
    list.push(plot);
    byDistrict.set(plot.district, list);
  }
  const buildings = [];
  for (const def of DISTRICTS) {
    const plots = (byDistrict.get(def.id) ?? []).slice(0, plotCount(def));
    for (const plot of plots) {
      const size = Math.round(
        clamp(rng.around(70 + def.commercialActivity * 110, 80) * (0.6 + plot.weight * 0.7), 40, 620)
      );
      const floors = size > 280 ? rng.int(1, 2) : rng.int(1, 3);
      const condition = Math.round(clamp(rng.around(72, 22), 25, 100));
      const conditionFactor = 0.7 + condition / 100 * 0.45;
      const position = trafficFactor(plot.frontage, plot.corner);
      const rent = Math.round(size * def.rentPerSqm * conditionFactor * (0.86 + position * 0.22) / 5) * 5;
      const price = Math.round(size * def.pricePerSqm * conditionFactor * (0.88 + position * 0.2) / 500) * 500;
      const footTraffic = Math.round(def.footTraffic * position * rng.range(0.78, 1.22));
      buildings.push({
        id: plot.id,
        address: `${plot.number} ${plot.street}`,
        district: def.id,
        x: plot.x,
        y: plot.y,
        w: plot.w,
        h: plot.h,
        size,
        floors,
        rent,
        price,
        value: price,
        customerCapacity: Math.max(4, Math.round(size / 4.5)),
        storageCapacity: Math.max(120, Math.round(size * 3.6)),
        parking: def.id === "suburbs" || def.id === "warehouse" || def.id === "industrial" ? rng.int(4, 40) : rng.int(0, 8),
        condition,
        footTraffic,
        suitableFor: pickSuitable(rng, def, size),
        status: "available",
        occupantCompanyId: null,
        businessId: null,
        renovationEndsOnDay: null
      });
    }
  }
  return buildings;
}
function reprojectBuildings(buildings) {
  const current = new Map(cityLayout().plots.map((plot) => [plot.id, plot]));
  for (const building of buildings) {
    const plot = current.get(building.id);
    if (!plot) continue;
    building.x = plot.x;
    building.y = plot.y;
    building.w = plot.w;
    building.h = plot.h;
  }
}

// src/sim/save.ts
var STANCE_IDS = STANCES.map((stance) => stance.id);
var INDEX_KEY = "business-manager:saves";
var SLOT_PREFIX = "business-manager:save:";
var AUTOSAVE_ID = "autosave";
function storage() {
  try {
    const probe = "__bm_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}
function listSaves() {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecord).map((entry) => ({
      id: str(entry.id, ""),
      name: str(entry.name, "Save"),
      day: num(entry.day, 1),
      savedAt: num(entry.savedAt, 0),
      netWorth: num(entry.netWorth, 0),
      company: str(entry.company, ""),
      auto: bool(entry.auto, false)
    })).filter((slot) => slot.id !== "").sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}
function writeIndex(slots) {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(INDEX_KEY, JSON.stringify(slots));
  } catch {
  }
}
function saveGame(state, id, name, auto = false) {
  const store = storage();
  if (!store) return { ok: false, message: "This browser is blocking local storage, so saving is unavailable." };
  try {
    store.setItem(SLOT_PREFIX + id, JSON.stringify(state));
  } catch {
    return { ok: false, message: "Saving failed: browser storage is full." };
  }
  const company = state.companies.find((c) => c.id === state.playerCompanyId);
  const slots = listSaves().filter((slot) => slot.id !== id);
  slots.push({
    id,
    name,
    day: state.day,
    savedAt: Date.now(),
    netWorth: netWorth(state),
    company: company?.name ?? "",
    auto
  });
  writeIndex(slots);
  return { ok: true, message: auto ? "Autosaved." : `Saved as \u201C${name}\u201D.` };
}
function loadGame(id) {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(SLOT_PREFIX + id);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const state = migrate(parsed);
    if (state) reseedGameRng(state.seed || Date.now() >>> 0);
    return state;
  } catch {
    return null;
  }
}
function deleteSave(id) {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(SLOT_PREFIX + id);
  } catch {
  }
  writeIndex(listSaves().filter((slot) => slot.id !== id));
}
function renameSave(id, name) {
  const slots = listSaves().map((slot) => slot.id === id ? { ...slot, name: name.trim().slice(0, 40) || slot.name } : slot);
  writeIndex(slots);
}
var GRADE_V2_TO_V3 = {
  0: 0,
  // Junior
  1: 1,
  // Employee
  2: 2,
  // Senior
  3: 4,
  // Team Lead
  4: 5,
  // Manager
  5: 6,
  // Senior Manager
  6: 8
  // Executive
};
function people(input, version) {
  if (!Array.isArray(input)) return [];
  return input.filter(isRecord).map((entry) => {
    const employee = {
      ...entry,
      sickUntilDay: typeof entry.sickUntilDay === "number" ? entry.sickUntilDay : null,
      promotions: num(entry.promotions, 0),
      lastRecognisedOnDay: num(entry.lastRecognisedOnDay, num(entry.hiredOnDay, 0)),
      trainingCourseId: typeof entry.trainingCourseId === "string" ? entry.trainingCourseId : null,
      workload: num(entry.workload, 45)
    };
    let seed = 0;
    for (const character of employee.id) seed = seed * 31 + character.charCodeAt(0) >>> 0;
    const roll = (min, max) => {
      seed = seed * 1664525 + 1013904223 >>> 0;
      return min + seed / 4294967296 * (max - min);
    };
    if (!isRecord(entry.skills)) {
      employee.skills = profileFor(num(entry.skill, 50), employee.role, roll);
      employee.skill = overallSkill(employee.skills);
    } else {
      const saved = entry.skills;
      const inferred = profileFor(num(entry.skill, 50), employee.role, roll);
      const skills = emptySkills();
      for (const id of SKILL_IDS) {
        skills[id] = typeof saved[id] === "number" ? num(saved[id], 50) : inferred[id];
      }
      employee.skills = skills;
      employee.skill = overallSkill(skills);
    }
    if (typeof entry.grade !== "number") {
      employee.grade = employee.role === "manager" ? 5 : Math.min(2, num(entry.promotions, 0) + (employee.skill >= 55 ? 1 : 0));
    } else if (version < 3) {
      employee.grade = GRADE_V2_TO_V3[Math.max(0, Math.min(6, num(entry.grade, 0)))] ?? 0;
    } else {
      employee.grade = Math.max(0, Math.min(GRADES.length - 1, num(entry.grade, 0)));
    }
    return employee;
  });
}
function migrate(input) {
  if (!isRecord(input)) return null;
  const version = num(input.version, 0);
  if (version > SAVE_VERSION) return null;
  if (!Array.isArray(input.buildings) || !Array.isArray(input.companies)) return null;
  if (typeof input.playerCompanyId !== "string") return null;
  const districts = {};
  const savedDistricts = isRecord(input.districts) ? input.districts : {};
  for (const def of DISTRICTS) {
    const entry = savedDistricts[def.id];
    districts[def.id] = isRecord(entry) ? {
      demandIndex: num(entry.demandIndex, 1),
      rentIndex: num(entry.rentIndex, 1),
      propertyIndex: num(entry.propertyIndex, 1)
    } : defaultDistrictState();
  }
  const economy = isRecord(input.economy) ? input.economy : {};
  const settings = isRecord(input.settings) ? input.settings : {};
  const stats = isRecord(input.stats) ? input.stats : {};
  const state = {
    version: SAVE_VERSION,
    seed: num(input.seed, Date.now() >>> 0),
    day: Math.max(1, num(input.day, 1)),
    hour: Math.min(23, Math.max(0, num(input.hour, 8))),
    speed: Math.min(4, Math.max(0, num(input.speed, 0))),
    playerCompanyId: input.playerCompanyId,
    companies: input.companies,
    businesses: Array.isArray(input.businesses) ? input.businesses.map((business) => ({
      ...business,
      // Older saves predate customer segments.
      todayMix: isRecord(business.todayMix) ? business.todayMix : emptyMix(),
      yesterdayMix: isRecord(business.yesterdayMix) ? business.yesterdayMix : emptyMix(),
      // And divisions, which every location starts outside of — reporting
      // directly to the owner, which is what was happening anyway.
      divisionId: typeof business.divisionId === "string" ? business.divisionId : null
    })) : [],
    buildings: Array.isArray(input.buildings) ? input.buildings : [],
    employees: people(input.employees, version),
    applicants: people(input.applicants, version),
    orders: Array.isArray(input.orders) ? input.orders : [],
    campaigns: Array.isArray(input.campaigns) ? input.campaigns : [],
    // A loan saved before borrowing had kinds opens as an ordinary business
    // loan, with nothing yet paid early and its interest history starting now.
    loans: Array.isArray(input.loans) ? input.loans.map((loan) => ({
      ...loan,
      typeId: typeof loan.typeId === "string" ? loan.typeId : "business",
      interestPaid: num(loan.interestPaid, 0),
      earlyRepaid: num(loan.earlyRepaid, 0)
    })) : [],
    ledger: Array.isArray(input.ledger) ? input.ledger : [],
    dayHistory: Array.isArray(input.dayHistory) ? input.dayHistory : [],
    alerts: Array.isArray(input.alerts) ? input.alerts : [],
    events: Array.isArray(input.events) ? input.events : [],
    news: Array.isArray(input.news) ? input.news : [],
    decisions: Array.isArray(input.decisions) ? input.decisions : [],
    decisionHistory: isRecord(input.decisionHistory) ? input.decisionHistory : {},
    reviews: Array.isArray(input.reviews) ? input.reviews : [],
    warehouses: Array.isArray(input.warehouses) ? input.warehouses : [],
    research: isRecord(input.research) && Array.isArray(input.research.done) ? { done: input.research.done, active: input.research.active ?? null } : emptyResearch(),
    // A head office saved before it had floors, a stance and systems opens as
    // what it was: a back office, run the middle way, with nothing automated.
    headOffice: isRecord(input.headOffice) ? {
      ...input.headOffice,
      outsourced: isRecord(input.headOffice.outsourced) ? { ...emptyOutsourcing(), ...input.headOffice.outsourced } : emptyOutsourcing(),
      level: Math.max(1, Math.min(5, num(input.headOffice.level, 1))),
      stance: STANCE_IDS.includes(str(input.headOffice.stance, "")) ? input.headOffice.stance : "hybrid",
      automation: isRecord(input.headOffice.automation) ? { ...emptyAutomation(), ...input.headOffice.automation } : emptyAutomation()
    } : null,
    // A save from before the player was a person gets one, with no particular
    // background — which is exactly how every game before this played.
    founder: isRecord(input.founder) ? (() => {
      const saved = input.founder;
      const base2 = emptyFounder(
        str(saved.name, "You"),
        str(saved.traitId, "allrounder"),
        str(saved.scenarioId, "entrepreneur")
      );
      const skills = isRecord(saved.skills) ? saved.skills : {};
      const progress = isRecord(saved.progress) ? saved.progress : {};
      for (const id of FOUNDER_SKILL_IDS) {
        base2.skills[id] = Math.max(0, Math.min(100, num(skills[id], base2.skills[id])));
        base2.progress[id] = Math.max(0, Math.min(1, num(progress[id], 0)));
      }
      return base2;
    })() : emptyFounder("You", "allrounder", "entrepreneur"),
    divisions: Array.isArray(input.divisions) ? input.divisions.map((division) => ({
      ...division,
      headEmployeeId: typeof division.headEmployeeId === "string" ? division.headEmployeeId : null,
      // A save made before mergers existed has divisions that were bought
      // and never integrated, which is exactly what a null means.
      mergedOnDay: typeof division.mergedOnDay === "number" ? division.mergedOnDay : null
    })) : [],
    mergers: Array.isArray(input.mergers) ? input.mergers : [],
    contracts: Array.isArray(input.contracts) ? input.contracts : [],
    contractOffers: Array.isArray(input.contractOffers) ? input.contractOffers : [],
    accounts: Array.isArray(input.accounts) ? input.accounts : [],
    period: isRecord(input.period) ? input.period : emptyPeriod(num(input.day, 1)),
    approaches: isRecord(input.approaches) ? input.approaches : {},
    goals: Array.isArray(input.goals) ? input.goals : [],
    goalsCompleted: num(input.goalsCompleted, 0),
    levelReached: num(input.levelReached, 1),
    economy: {
      confidence: num(economy.confidence, DEFAULT_ECONOMY.confidence),
      inflation: num(economy.inflation, DEFAULT_ECONOMY.inflation),
      interestRate: num(economy.interestRate, DEFAULT_ECONOMY.interestRate),
      unemployment: num(economy.unemployment, DEFAULT_ECONOMY.unemployment),
      growth: num(economy.growth, DEFAULT_ECONOMY.growth),
      lastLabel: str(economy.lastLabel, DEFAULT_ECONOMY.lastLabel)
    },
    districts,
    supplierSpend: isRecord(input.supplierSpend) ? input.supplierSpend : {},
    achievements: Array.isArray(input.achievements) ? input.achievements : [],
    tutorialStep: num(input.tutorialStep, 0),
    settings: {
      autosave: bool(settings.autosave, DEFAULT_SETTINGS.autosave),
      showTutorial: bool(settings.showTutorial, DEFAULT_SETTINGS.showTutorial),
      compactNumbers: bool(settings.compactNumbers, DEFAULT_SETTINGS.compactNumbers),
      confirmLargeSpend: bool(settings.confirmLargeSpend, DEFAULT_SETTINGS.confirmLargeSpend)
    },
    stats: {
      revenueTotal: num(stats.revenueTotal, 0),
      costsTotal: num(stats.costsTotal, 0),
      customersTotal: num(stats.customersTotal, 0),
      unitsTotal: num(stats.unitsTotal, 0),
      peakNetWorth: num(stats.peakNetWorth, 0),
      bankrupt: bool(stats.bankrupt, false)
    }
  };
  if (!state.companies.some((company) => company.id === state.playerCompanyId)) return null;
  reprojectBuildings(state.buildings);
  return state;
}

// src/ui/dom.ts
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  if (props.class) el.className = props.class;
  if (props.id) el.id = props.id;
  if (props.title) el.title = props.title;
  if (props.text !== void 0) el.textContent = props.text;
  if (props.html !== void 0) el.innerHTML = props.html;
  if (props.style) el.setAttribute("style", props.style);
  if (props.role) el.setAttribute("role", props.role);
  if (props.href && el instanceof HTMLAnchorElement) el.href = props.href;
  if (props.inputmode) el.setAttribute("inputmode", props.inputmode);
  if (props.maxlength !== void 0) el.setAttribute("maxlength", String(props.maxlength));
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
    if (props.type && el instanceof HTMLInputElement) el.type = props.type;
    if (props.value !== void 0) el.value = String(props.value);
    if (props.placeholder && !(el instanceof HTMLSelectElement)) {
      el.placeholder = props.placeholder;
    }
    if (props.disabled) el.disabled = true;
    if (el instanceof HTMLInputElement) {
      if (props.min !== void 0) el.min = String(props.min);
      if (props.max !== void 0) el.max = String(props.max);
      if (props.step !== void 0) el.step = String(props.step);
      if (props.checked) el.checked = true;
    }
  } else if (el instanceof HTMLButtonElement) {
    if (props.disabled) el.disabled = true;
    if (props.value !== void 0) el.value = String(props.value);
  } else if (el instanceof HTMLOptionElement) {
    if (props.value !== void 0) el.value = String(props.value);
    if (props.selected) el.selected = true;
  }
  if (props.data) {
    for (const [key2, value] of Object.entries(props.data)) el.dataset[key2] = value;
  }
  if (props.aria) {
    for (const [key2, value] of Object.entries(props.aria)) el.setAttribute(`aria-${key2}`, value);
  }
  if (props.on) {
    for (const [event, handler] of Object.entries(props.on)) {
      if (typeof handler === "function") {
        el.addEventListener(event, handler);
      }
    }
  }
  append(el, children);
  return el;
}
function append(parent, children) {
  for (const child of children) {
    if (child === null || child === void 0 || child === false) continue;
    parent.appendChild(typeof child === "object" ? child : document.createTextNode(String(child)));
  }
}
function keepingScroll(run) {
  const scroller = document.querySelector(".main");
  if (!scroller) {
    run();
    return;
  }
  const top = scroller.scrollTop;
  run();
  if (top > 0 && scroller.scrollTop !== top) scroller.scrollTop = top;
}
function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}
function button(label, onClick, variant = "btn") {
  return h("button", { class: variant, on: { click: onClick } }, label);
}
function stat(label, value, tone) {
  return h(
    "div",
    { class: "stat" },
    h("span", { class: "stat-label", text: label }),
    h("span", { class: `stat-value${tone ? ` ${tone}` : ""}`, text: value })
  );
}
function hint(text) {
  return h(
    "button",
    {
      class: "hint",
      title: text,
      aria: { label: text },
      on: {
        click: (event) => {
          event.stopPropagation();
          toast(text, "info");
        }
      }
    },
    "?"
  );
}
function statWithHint(label, value, explanation, tone) {
  return h(
    "div",
    { class: "stat" },
    h("span", { class: "stat-label" }, label, hint(explanation)),
    h("span", { class: `stat-value${tone ? ` ${tone}` : ""}`, text: value })
  );
}
function section(title, ...children) {
  return h("section", { class: "panel" }, h("h3", { class: "panel-title", text: title }), ...children);
}
function empty(message) {
  return h("p", { class: "empty", text: message });
}
function bar(value, tone = "") {
  const width = Math.max(0, Math.min(1, value)) * 100;
  return h(
    "div",
    { class: "bar" },
    h("div", { class: `bar-fill ${tone}`, style: `width:${width.toFixed(1)}%` })
  );
}
function table(headers, rows) {
  const thead = h("thead", {}, h("tr", {}, ...headers.map((label) => h("th", { text: label }))));
  const tbody = h(
    "tbody",
    {},
    ...rows.map((cells) => h("tr", {}, ...cells.map((cell) => h("td", {}, cell))))
  );
  return h("div", { class: "table-wrap" }, h("table", {}, thead, tbody));
}
var toastTimer = null;
function toast(message, tone = "info") {
  let host = document.getElementById("toast");
  if (!host) {
    host = h("div", { id: "toast" });
    document.body.appendChild(host);
  }
  host.textContent = message;
  host.className = `toast show ${tone}`;
  if (toastTimer !== null) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    host.className = "toast";
  }, 3200);
}
function modal(options) {
  const body = h("div", { class: "modal-body" });
  const footer = h("div", { class: "modal-footer" });
  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
    options.onClose?.();
  };
  const onKey = (event) => {
    if (event.key === "Escape") close();
  };
  const card = h(
    "div",
    { class: "modal-card", style: options.width ? `max-width:${options.width}px` : "" },
    h(
      "div",
      { class: "modal-head" },
      h("h2", { text: options.title }),
      h("button", { class: "icon-btn", title: "Close", on: { click: close } }, "\u2715")
    ),
    body,
    footer
  );
  const overlay = h(
    "div",
    {
      class: "modal-overlay",
      on: {
        click: (event) => {
          if (event.target === overlay) close();
        }
      }
    },
    card
  );
  document.body.appendChild(overlay);
  document.addEventListener("keydown", onKey);
  return { body, close, footer };
}
function confirmDialog(title, message, confirmLabel) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
      close();
    };
    const { body, footer, close } = modal({ title, width: 460, onClose: () => finish(false) });
    body.appendChild(h("p", { class: "confirm-text", text: message }));
    footer.appendChild(button("Cancel", () => finish(false), "btn ghost"));
    footer.appendChild(button(confirmLabel, () => finish(true), "btn primary"));
  });
}
function numberInput(value, onChange, props = {}) {
  const input = h("input", {
    type: "number",
    value: String(value),
    inputmode: "decimal",
    ...props,
    on: {
      change: () => {
        const parsed = Number(input.value);
        if (Number.isFinite(parsed)) onChange(parsed);
      }
    }
  });
  return input;
}
function select(options, current, onChange) {
  const el = h(
    "select",
    {
      on: {
        change: () => onChange(el.value)
      }
    },
    ...options.map(
      (option) => h("option", { value: option.value, selected: option.value === current }, option.label)
    )
  );
  return el;
}

// src/ui/tutorial.ts
var STEPS = [
  {
    title: "Find a location",
    body: "Open the map and look at what each district offers. Foot traffic sells convenience goods; income sells expensive ones. Tap a building to see its rent, size and who is nearby.",
    done: (state) => state.buildings.some((b) => b.occupantCompanyId === state.playerCompanyId),
    action: { label: "Open the map", route: "map" }
  },
  {
    title: "Rent the unit",
    body: "Renting needs the first month plus a two-month deposit. Buying costs far more but the building keeps its value and can be sold later.",
    done: (state) => state.buildings.some((b) => b.occupantCompanyId === state.playerCompanyId),
    action: { label: "Open the map", route: "map" }
  },
  {
    title: "Create a business",
    body: "Choose a business type that suits the unit and the district. Fit-out and equipment are paid once, up front.",
    done: (state) => playerBusinesses(state).length > 0,
    action: { label: "Go to Businesses", route: "businesses" }
  },
  {
    title: "Order stock",
    body: "Pick a supplier and order. Cheap suppliers have long lead times and let you down more often \u2014 that trade-off is the whole game early on.",
    done: (state) => playerBusinesses(state).some((b) => Object.values(b.stock).some((units) => units > 0) || state.orders.length > 0),
    action: { label: "Go to Inventory", route: "inventory" }
  },
  {
    title: "Hire someone",
    body: "Staff decide how many customers you can actually serve in an hour. One person is enough to open; a queue out of the door is lost revenue.",
    done: (state) => state.employees.length > 0,
    action: { label: "Go to Employees", route: "employees" }
  },
  {
    title: "Set your prices and open",
    body: "The pricing screen estimates daily customers at each price. Undercutting the district wins share but shreds your margin. Then open the doors.",
    done: (state) => playerBusinesses(state).some((b) => b.status === "open"),
    action: { label: "Go to Businesses", route: "businesses" }
  },
  {
    title: "Let time run",
    body: "Press play, or space to pause. Customers arrive hour by hour and money moves in real time. Watch the first day closely.",
    done: (state) => state.dayHistory.length > 0
  },
  {
    title: "Read the result",
    body: "The reports screen explains what happened and why: which costs moved, where customers were lost and what to try next.",
    done: (state) => state.dayHistory.length > 1,
    action: { label: "Go to Reports", route: "reports" }
  },
  {
    title: "Take the advice",
    body: 'The dashboard now has a "What to do next" panel. It reads the same numbers the simulation uses and names the single biggest thing holding each business back. Every line is a shortcut to the screen that fixes it.',
    done: (state) => state.dayHistory.length > 3,
    action: { label: "Go to the dashboard", route: "dashboard" }
  },
  {
    title: "Read the newsroom",
    body: "The city reports itself: economy shifts, competitor moves, suppliers letting you down, and what your customers are saying. Decisions that need an answer wait here too.",
    done: (state) => state.news.length > 4,
    action: { label: "Open the newsroom", route: "news" }
  },
  {
    title: "See who you are up against",
    body: "The market screen shows how big your market really is, what share of it you hold, and which rivals are taking the rest. Later on it is also where you buy them out.",
    done: (state) => state.dayHistory.length > 6,
    action: { label: "Open the market", route: "market" }
  }
];
function renderTutorial(ctx) {
  const state = ctx.state;
  if (!state.settings.showTutorial) return null;
  let index = state.tutorialStep;
  while (index < STEPS.length && STEPS[index].done(state)) index += 1;
  state.tutorialStep = index;
  if (index >= STEPS.length) {
    state.settings.showTutorial = false;
    return null;
  }
  const step = STEPS[index];
  return h(
    "aside",
    { class: "tutorial" },
    h("div", { class: "tutorial-step", text: `Step ${index + 1} of ${STEPS.length}` }),
    h("h4", { text: step.title }),
    h("p", { text: step.body }),
    h(
      "div",
      { class: "btn-row" },
      step.action ? h(
        "button",
        {
          class: "btn small primary",
          on: { click: () => ctx.go(step.action.route) }
        },
        step.action.label
      ) : null,
      h(
        "button",
        {
          class: "btn small ghost",
          on: {
            click: () => {
              state.settings.showTutorial = false;
              ctx.refresh();
            }
          }
        },
        "Skip tutorial"
      )
    )
  );
}

// src/ui/decisionModal.ts
function showDecision(ctx, decision) {
  const speedBefore = ctx.state.speed;
  ctx.engine.setSpeed(0);
  const { body, footer, close } = modal({
    title: decision.title,
    width: 620,
    onClose: () => {
      ctx.engine.setSpeed(speedBefore);
    }
  });
  body.appendChild(h("p", { class: "decision-body", text: decision.body }));
  body.appendChild(
    h("p", {
      class: "tiny muted",
      text: `You have until day ${decision.expiresOnDay}. If you do not decide, the situation resolves itself \u2014 usually not in your favour.`
    })
  );
  const list = h("div", { class: "list", style: "margin-top:12px" });
  for (const option of decision.options) {
    const disabled = Boolean(option.blocked);
    list.appendChild(
      h(
        "button",
        {
          class: `decision-option${disabled ? " disabled" : ""}`,
          disabled,
          title: option.blocked ?? "",
          on: {
            click: () => {
              if (disabled) return;
              const result = resolveDecision(ctx.state, decision.id, option.id);
              toast(result.message, result.ok ? "good" : "bad");
              close();
              ctx.engine.setSpeed(speedBefore);
              ctx.refresh();
            }
          }
        },
        h("span", { class: "decision-option-label", text: option.label }),
        h("span", { class: "decision-option-detail", text: option.blocked ?? option.detail })
      )
    );
  }
  body.appendChild(list);
  footer.appendChild(
    h(
      "button",
      {
        class: "btn ghost",
        on: {
          click: () => {
            close();
            ctx.engine.setSpeed(speedBefore);
          }
        }
      },
      "Decide later"
    )
  );
}

// src/ui/app.ts
var App = class {
  engine;
  root;
  entries = [];
  current = null;
  route = "dashboard";
  params = {};
  main;
  navHost;
  mobileNavHost;
  topbar;
  lastAutosaveDay = 0;
  updateTimer = null;
  tutorialHost = null;
  /**
   * A rebuild that has been held back because the player is in the middle of
   * something — typing in a field, or reading a dialog. It runs the moment they
   * are finished, which is the only reason it is safe to rebuild a whole view
   * on a clock tick at all.
   */
  pendingRebuild = false;
  /** Decisions already put in front of the player, so they open only once. */
  shownDecisions = /* @__PURE__ */ new Set();
  constructor(root2, engine) {
    this.root = root2;
    this.engine = engine;
    this.lastAutosaveDay = engine.state.day;
  }
  register(entry) {
    this.entries.push(entry);
  }
  start() {
    this.build();
    this.go(this.route);
    this.engine.start();
    on("tick", () => this.updateChrome());
    on("day", () => {
      this.maybeAutosave();
      this.refresh();
      this.maybeShowDecision();
    });
    on("alert", (alert) => {
      if (alert.priority === "critical") toast(alert.title, "bad");
      this.updateChrome();
    });
    this.updateTimer = window.setInterval(() => {
      if (this.pendingRebuild && !this.busy()) this.refresh();
      else if (!this.busy()) this.current?.update?.();
      this.updateChrome();
    }, 320);
    document.addEventListener("keydown", (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.code === "Space") {
        event.preventDefault();
        this.engine.togglePause();
        this.updateChrome();
      }
      const index = ["Digit1", "Digit2", "Digit3", "Digit4"].indexOf(event.code);
      if (index >= 0) {
        this.engine.setSpeed(index + 1);
        this.updateChrome();
      }
    });
  }
  stop() {
    this.engine.stop();
    if (this.updateTimer !== null) window.clearInterval(this.updateTimer);
  }
  get state() {
    return this.engine.state;
  }
  ctx() {
    return {
      engine: this.engine,
      state: this.state,
      go: (route2, params) => this.go(route2, params),
      refresh: () => this.refresh(),
      params: this.params
    };
  }
  /**
   * Goes somewhere.
   *
   * The line between navigation and selection is drawn here, and it is drawn at
   * the screen: asking for a *different screen* is navigation, and a new screen
   * rightly starts at the top. Picking a different thing on the screen you are
   * already on is selection — choosing another location from the dropdown,
   * clicking another shop in the list — and selection must never move the
   * reader, because they are still reading the same page.
   *
   * That distinction used to be drawn at the parameters as well, which meant
   * choosing a different shop from halfway down the employee screen threw the
   * player back to the top of it. It was the last of the scroll jumps and it
   * was the least obvious, because from the code's point of view something had
   * genuinely changed.
   */
  go(route2, params = {}) {
    const entry = this.entries.find((item) => item.route === route2) ?? this.entries[0];
    if (!entry) return;
    const movedScreen = entry.route !== this.route;
    this.route = entry.route;
    this.params = params;
    this.mount(entry, movedScreen);
  }
  /**
   * Rebuilds the screen the player is already on.
   *
   * The view is thrown away and built again, which is how this game has always
   * shown new numbers, and it is fast enough. What it must not do is move the
   * player: their scroll position is theirs, and a day passing is not a reason
   * to take it away. So the position is put back, and a rebuild is held off
   * entirely while they are typing or reading a dialog.
   */
  refresh() {
    const entry = this.entries.find((item) => item.route === this.route) ?? this.entries[0];
    if (!entry) return;
    if (this.busy()) {
      this.pendingRebuild = true;
      return;
    }
    this.pendingRebuild = false;
    this.mount(entry, false);
  }
  /**
   * True while the player is doing something a rebuild would interrupt: a
   * dialog is open, or the caret is in a field they are filling in.
   */
  busy() {
    if (document.querySelector(".modal-overlay")) return true;
    const active = document.activeElement;
    if (!active || !this.main.contains(active)) return false;
    return active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement;
  }
  mount(entry, toTop) {
    const scroll = this.main.scrollTop;
    this.current?.destroy?.();
    clear(this.main);
    this.current = entry.factory(this.ctx());
    this.main.appendChild(this.current.el);
    this.main.scrollTop = toTop ? 0 : scroll;
    if (!toTop && scroll > 0) {
      requestAnimationFrame(() => {
        if (this.main.scrollTop !== scroll) this.main.scrollTop = scroll;
      });
    }
    this.renderNav();
    this.updateChrome();
  }
  build() {
    clear(this.root);
    this.topbar = h("header", { class: "topbar" });
    this.navHost = h("nav", { class: "nav" });
    this.mobileNavHost = h("nav", { class: "mobile-nav" });
    this.main = h("main", { class: "main" });
    const brand = h(
      "div",
      { class: "brand" },
      h("div", { class: "brand-mark", text: "BM" }),
      h(
        "div",
        {},
        h("div", { class: "brand-name", text: "Business Manager" }),
        h("div", { class: "brand-sub", text: "Northgate" })
      )
    );
    this.root.appendChild(
      h("div", { class: "shell" }, brand, this.topbar, this.navHost, this.main, this.mobileNavHost)
    );
    this.renderNav();
    this.renderTopbar();
  }
  renderNav() {
    for (const host of [this.navHost, this.mobileNavHost]) {
      clear(host);
      const grouped = host === this.navHost;
      let lastGroup = "";
      for (const entry of this.entries) {
        if (grouped && entry.group && entry.group !== lastGroup) {
          lastGroup = entry.group;
          host.appendChild(h("div", { class: "nav-group", text: entry.group }));
        }
        const count2 = entry.badge?.(this.state) ?? 0;
        host.appendChild(
          h(
            "button",
            {
              class: `nav-item${entry.route === this.route ? " active" : ""}`,
              data: { route: entry.route },
              on: { click: () => this.go(entry.route) }
            },
            h("span", { class: "nav-icon", text: entry.icon }),
            h("span", { text: entry.label }),
            count2 > 0 ? h("span", { class: "nav-badge", text: String(count2) }) : null
          )
        );
      }
    }
  }
  renderTopbar() {
    clear(this.topbar);
    const metric2 = (label, id) => h(
      "div",
      { class: "metric" },
      h("span", { class: "metric-label", text: label }),
      h("span", { class: "metric-value", id }),
      h("span", { class: "metric-sub", id: `${id}-sub` })
    );
    this.topbar.appendChild(metric2("Cash", "hud-cash"));
    this.topbar.appendChild(metric2("Company value", "hud-worth"));
    this.topbar.appendChild(metric2("Profit, 30 days", "hud-month"));
    this.topbar.appendChild(metric2("Today", "hud-today"));
    this.topbar.appendChild(metric2("Level", "hud-level"));
    this.topbar.appendChild(metric2("Date", "hud-date"));
    this.topbar.appendChild(h("div", { class: "topbar-spacer" }));
    const speeds = h("div", { class: "speed-group", id: "hud-speeds" });
    SPEEDS.forEach((_, index) => {
      speeds.appendChild(
        h(
          "button",
          {
            class: "speed-btn",
            data: { speed: String(index) },
            title: index === 0 ? "Pause (space)" : `Speed ${SPEED_LABELS[index]}`,
            on: {
              click: () => {
                this.engine.setSpeed(index);
                this.updateChrome();
              }
            }
          },
          SPEED_LABELS[index]
        )
      );
    });
    this.topbar.appendChild(speeds);
    const bell = h(
      "div",
      { class: "bell" },
      h("button", { class: "icon-btn", title: "Alerts", on: { click: () => this.openAlerts() } }, "\u{1F514}"),
      h("span", { class: "bell-count", id: "hud-alerts", text: "0" })
    );
    this.topbar.appendChild(bell);
    this.updateChrome();
  }
  updateChrome() {
    const state = this.state;
    const company = playerCompany(state);
    const set = (id, value, tone) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = value;
      el.className = `metric-value${tone ? ` ${tone}` : ""}`;
    };
    const setSub = (id, value) => {
      const el = document.getElementById(`${id}-sub`);
      if (el) el.textContent = value;
    };
    set("hud-cash", money(company.cash), company.cash < 0 ? "bad" : void 0);
    const businesses = playerBusinesses(state).filter((b) => b.status === "open").length;
    setSub("hud-cash", `${businesses} open \xB7 ${state.employees.length} staff`);
    const worth = netWorth(state);
    set("hud-worth", moneyShort(worth));
    setSub("hud-worth", currentTier(state).name);
    const month = sum(state.dayHistory.slice(-30), (day) => day.profit);
    set("hud-month", moneySigned(month), month >= 0 ? "good" : "bad");
    const reputation = playerBusinesses(state).filter((b) => b.status === "open");
    setSub(
      "hud-month",
      reputation.length > 0 ? `reputation ${Math.round(sum(reputation, (b) => b.reputation) / reputation.length)}` : "nothing trading"
    );
    const level = levelOf(state);
    const ahead = nextLevel(state);
    set("hud-level", `${level.n} \xB7 ${level.name}`);
    setSub("hud-level", ahead ? `${Math.round(levelProgress(state) * 100)}% to ${ahead.name}` : nextStep(state).title);
    let revenue = 0;
    let costs = 0;
    for (const business of playerBusinesses(state)) {
      revenue += business.today.revenue;
      costs += business.today.cogs + business.today.wages + business.today.rent + business.today.marketing + business.today.otherCosts;
    }
    const profit = revenue - costs;
    set("hud-today", moneySigned(profit), profit >= 0 ? "good" : "bad");
    setSub("hud-today", `${money(revenue)} in`);
    const cal = calendar(state.day);
    set("hud-date", `${clockLabel(state.hour)}`);
    setSub("hud-date", `${cal.weekday.slice(0, 3)} ${cal.dayOfMonth} ${cal.monthName.slice(0, 3)} \xB7 ${economyLabel(state).label}`);
    const speeds = document.getElementById("hud-speeds");
    if (speeds) {
      for (const child of Array.from(speeds.children)) {
        const index = Number(child.dataset.speed);
        child.className = `speed-btn${index === state.speed ? " active" : ""}`;
      }
    }
    const count2 = unreadAlerts(state).length;
    const badge = document.getElementById("hud-alerts");
    if (badge) {
      badge.textContent = String(count2);
      badge.style.display = count2 > 0 ? "" : "none";
    }
    this.renderNavBadges();
    this.renderTutorial();
  }
  renderNavBadges() {
    for (const host of [this.navHost, this.mobileNavHost]) {
      this.entries.forEach((entry) => {
        const item = host.querySelector(`.nav-item[data-route="${entry.route}"]`);
        if (!item) return;
        const count2 = entry.badge?.(this.state) ?? 0;
        const existing = item.querySelector(".nav-badge");
        if (count2 > 0) {
          if (existing) existing.textContent = String(count2);
          else item.appendChild(h("span", { class: "nav-badge", text: String(count2) }));
        } else if (existing) {
          existing.remove();
        }
      });
    }
  }
  renderTutorial() {
    this.tutorialHost?.remove();
    this.tutorialHost = renderTutorial(this.ctx());
    if (this.tutorialHost) document.body.appendChild(this.tutorialHost);
  }
  /**
   * The notification centre.
   *
   * Everything the simulation wanted to tell the player, in one place, worst
   * first — and every row goes somewhere. An alert you cannot act on is just
   * noise, so clicking one closes the centre and opens the screen the problem
   * lives on: the shop it is about, or the system that raised it.
   */
  openAlerts() {
    const { body, close } = modal({ title: "Notifications", width: 640 });
    const alerts = distinctAlerts(this.state);
    if (alerts.length === 0) {
      body.appendChild(h("p", { class: "empty", text: "Nothing needs your attention right now." }));
    }
    const order = ["critical", "warning", "info", "success"];
    for (const priority of order) {
      const group = alerts.filter((alert) => alert.priority === priority);
      if (group.length === 0) continue;
      body.appendChild(
        h("div", { class: `alert-heading ${priority}` }, `${PRIORITY_LABELS[priority]} \u2014 ${group.length}`)
      );
      for (const alert of group) {
        const where = this.destinationOf(alert);
        const row2 = h(
          "div",
          { class: "alert-row clickable-row" },
          h("span", { class: `alert-dot ${alert.priority}` }),
          h(
            "div",
            { style: "flex:1" },
            h("div", { class: "alert-title", text: alert.title }),
            h("div", { class: "alert-detail", text: alert.detail }),
            h("div", { class: "alert-go", text: `\u2192 ${this.labelOf(where.route)}` })
          ),
          h("span", { class: "alert-time", text: `Day ${alert.day} ${clockLabel(alert.hour)}` })
        );
        row2.addEventListener("click", () => {
          close();
          this.go(where.route, where.params);
        });
        body.appendChild(row2);
      }
    }
    markAlertsRead(this.state);
    this.updateChrome();
  }
  /** Where an alert takes the player when they click it. */
  destinationOf(alert) {
    if (alert.businessId) return { route: "businesses", params: { business: alert.businessId } };
    if (alert.view) return { route: alert.view };
    return { route: "dashboard" };
  }
  labelOf(route2) {
    return this.entries.find((entry) => entry.route === route2)?.label ?? "Dashboard";
  }
  /**
   * A new decision interrupts once, pausing the clock. Closing it without
   * choosing leaves it open in the newsroom until it expires.
   */
  maybeShowDecision() {
    if (document.querySelector(".modal-overlay")) return;
    const decision = this.state.decisions.find((d) => !this.shownDecisions.has(d.id));
    if (!decision) return;
    this.shownDecisions.add(decision.id);
    showDecision(this.ctx(), decision);
  }
  maybeAutosave() {
    const state = this.state;
    if (!state.settings.autosave) return;
    if (state.day === this.lastAutosaveDay) return;
    this.lastAutosaveDay = state.day;
    saveGame(state, AUTOSAVE_ID, "Autosave", true);
  }
};

// src/data/scenarios.ts
var SCENARIOS = [
  {
    id: "oneman",
    name: "One-man band",
    tagline: "You are the owner, the staff and the manager.",
    detail: "Barely any money, one small unit, nobody on the payroll but you.",
    focus: "Survive the first month, then find the money for a second pair of hands.",
    difficulty: "hard",
    cash: 26e3,
    locations: 0,
    staffPerLocation: 0,
    reputation: 30,
    awareness: 4,
    creditRating: 44,
    levelReached: 1,
    headOffice: false,
    debtShare: 0,
    extraRivals: 0,
    warmUpDays: 0
  },
  {
    id: "small",
    name: "Small business",
    tagline: "A shop that already trades, and a handful of people in it.",
    detail: "One location open, staffed, with a few weeks of takings behind it.",
    focus: "Stop doing everything yourself. Delegate, and make the place worth owning.",
    difficulty: "ordinary",
    cash: 58e3,
    locations: 1,
    staffPerLocation: 3,
    reputation: 44,
    awareness: 16,
    creditRating: 52,
    levelReached: 1,
    headOffice: false,
    debtShare: 0,
    extraRivals: 0,
    warmUpDays: 20
  },
  {
    id: "entrepreneur",
    name: "Entrepreneur",
    tagline: "Money in the bank and nothing trading yet.",
    detail: "A decent stake, a clean record and the whole city to choose from.",
    focus: "The ordinary game: pick well, open well, and grow at your own pace.",
    difficulty: "ordinary",
    cash: 6e4,
    locations: 0,
    staffPerLocation: 0,
    reputation: 35,
    awareness: 6,
    creditRating: 52,
    levelReached: 1,
    headOffice: false,
    debtShare: 0,
    extraRivals: 0,
    warmUpDays: 0
  },
  {
    id: "startup",
    name: "Startup",
    tagline: "Somebody else\u2019s money, and their expectations with it.",
    detail: "Well funded, badly known, and carrying a loan from day one.",
    focus: "Spend fast enough to grow and slow enough to still be here in a year.",
    difficulty: "hard",
    cash: 15e4,
    locations: 1,
    staffPerLocation: 2,
    reputation: 32,
    awareness: 8,
    creditRating: 58,
    levelReached: 2,
    headOffice: false,
    debtShare: 0.42,
    extraRivals: 3,
    warmUpDays: 10
  },
  {
    id: "established",
    name: "Established business",
    tagline: "You have inherited a going concern, and everything wrong with it.",
    detail: "Three locations, a real payroll, customers who already have opinions \u2014 and a mortgage.",
    focus: "Optimisation. Find what is quietly losing money and fix it.",
    difficulty: "ordinary",
    cash: 3e5,
    locations: 3,
    staffPerLocation: 5,
    reputation: 55,
    awareness: 34,
    creditRating: 66,
    levelReached: 3,
    headOffice: false,
    debtShare: 0.3,
    extraRivals: 4,
    warmUpDays: 45
  },
  {
    id: "empire",
    name: "Business empire",
    tagline: "More locations than one person can see.",
    detail: "Seven locations, a head office, a large payroll and rivals who have noticed you.",
    focus: "Letting go. Structure it, delegate it, and keep it from drifting.",
    difficulty: "sandbox",
    cash: 9e5,
    locations: 7,
    staffPerLocation: 6,
    reputation: 62,
    awareness: 48,
    creditRating: 78,
    levelReached: 5,
    headOffice: true,
    debtShare: 0.5,
    extraRivals: 8,
    warmUpDays: 60
  },
  {
    id: "custom",
    name: "Custom",
    tagline: "Set it up however you like.",
    detail: "Every figure below is yours to choose.",
    focus: "Whatever you decide it is.",
    difficulty: "sandbox",
    cash: 6e4,
    locations: 1,
    staffPerLocation: 3,
    reputation: 40,
    awareness: 12,
    creditRating: 55,
    levelReached: 1,
    headOffice: false,
    debtShare: 0,
    extraRivals: 0,
    warmUpDays: 14
  }
];
function scenario(id) {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[2];
}
var DIFFICULTY_LABELS = {
  gentle: "Forgiving",
  ordinary: "Ordinary",
  hard: "Unforgiving",
  sandbox: "Sandbox"
};

// src/sim/setup.ts
var COMPETITOR_NAMES = [
  { name: "ValuMart", personality: "lowcost" },
  { name: "Aurelia", personality: "premium" },
  { name: "Vertex Group", personality: "aggressive" },
  { name: "Hollis & Sons", personality: "conservative" },
  { name: "Brightline", personality: "marketer" },
  { name: "Kestrel Craft", personality: "quality" },
  { name: "Tallow Holdings", personality: "opportunist" },
  { name: "Ridgeway Retail", personality: "lowcost" },
  { name: "Solene", personality: "premium" },
  { name: "Meridian Ventures", personality: "aggressive" }
];
function createNewGame(companyName, seed = Date.now() >>> 0) {
  reseedGameRng(seed);
  const player = {
    id: makeId("co"),
    name: companyName.trim().slice(0, 40) || "Newco",
    isPlayer: true,
    cash: START_CASH,
    creditRating: 52,
    brandAwareness: 0,
    foundedOnDay: START_DAY,
    personality: null
  };
  const districts = {};
  for (const def of DISTRICTS) districts[def.id] = defaultDistrictState();
  const state = {
    version: SAVE_VERSION,
    seed,
    day: START_DAY,
    hour: START_HOUR,
    speed: 0,
    playerCompanyId: player.id,
    companies: [player],
    businesses: [],
    buildings: generateCity(),
    employees: [],
    applicants: [],
    orders: [],
    campaigns: [],
    loans: [],
    ledger: [],
    dayHistory: [],
    alerts: [],
    events: [],
    news: [],
    decisions: [],
    decisionHistory: {},
    reviews: [],
    warehouses: [],
    accounts: [],
    period: emptyPeriod(START_DAY),
    approaches: {},
    goals: [],
    research: emptyResearch(),
    headOffice: null,
    divisions: [],
    mergers: [],
    founder: emptyFounder("You", "allrounder", "entrepreneur"),
    contracts: [],
    contractOffers: [],
    goalsCompleted: 0,
    levelReached: 1,
    economy: { ...DEFAULT_ECONOMY },
    districts,
    supplierSpend: {},
    achievements: [],
    tutorialStep: 0,
    settings: { ...DEFAULT_SETTINGS },
    stats: {
      revenueTotal: 0,
      costsTotal: 0,
      customersTotal: 0,
      unitsTotal: 0,
      peakNetWorth: START_CASH,
      bankrupt: false
    }
  };
  seedCompetitors(state);
  refreshApplicants(state);
  return state;
}
function seedCompetitors(state) {
  for (const template of COMPETITOR_NAMES) {
    const company = {
      id: makeId("co"),
      name: template.name,
      isPlayer: false,
      cash: gameRng.range(12e4, 48e4),
      creditRating: gameRng.range(45, 88),
      brandAwareness: gameRng.range(15, 70),
      foundedOnDay: 0,
      personality: template.personality
    };
    state.companies.push(company);
    const outlets = gameRng.int(2, 4);
    for (let i = 0; i < outlets; i += 1) {
      const business = openCompetitorOutlet(state, company);
      if (!business) continue;
      business.openedOnDay = 0;
      for (let day = 0; day < 7; day += 1) {
        business.profitHistory.push(gameRng.range(-40, 260));
      }
    }
  }
  state.alerts = [];
}

// src/sim/scenario.ts
function startGame(options) {
  const def = { ...scenario(options.scenarioId), ...options.overrides ?? {} };
  const state = createNewGame(options.companyName, options.seed ?? Date.now() >>> 0);
  state.founder = emptyFounder(options.founderName, options.traitId, def.id);
  const company = playerCompany(state);
  company.cash = Math.max(1e3, Math.round(def.cash));
  company.creditRating = clamp(def.creditRating, 0, 100);
  company.brandAwareness = clamp(def.awareness, 0, 100);
  state.levelReached = clamp(Math.round(def.levelReached), 1, 8);
  state.stats.peakNetWorth = company.cash;
  if (def.extraRivals > 0) addRivals(state, def.extraRivals);
  const engine = new Engine(state);
  const budget = def.locations > 0 ? company.cash * 0.72 / def.locations : 0;
  for (let i = 0; i < def.locations; i += 1) {
    if (!openOneLocation(state, engine, def, i, budget)) break;
  }
  if (def.headOffice) setUpHeadOffice(state);
  if (def.debtShare > 0) inheritDebt(state, def);
  for (let day = 0; day < def.warmUpDays; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) engine.stepHour();
  }
  state.alerts = [];
  state.decisions = [];
  state.news = state.news.slice(0, 6);
  refreshApplicants(state);
  state.speed = 0;
  return state;
}
function openOneLocation(state, engine, def, index, budget) {
  const company = playerCompany(state);
  const taken = new Set(playerBusinesses(state).map((b) => b.buildingId));
  const affordableAt = Math.min(budget, company.cash * 0.8);
  const fits = (building2, type2) => building2.size >= type2.minSize && building2.suitableFor.includes(type2.category) && building2.rent * 3 + type2.setupCost + type2.equipmentCost < affordableAt;
  const affordable = state.buildings.filter((building2) => {
    if (building2.status !== "available" || taken.has(building2.id)) return false;
    return BUSINESS_TYPES.some((type2) => fits(building2, type2));
  });
  if (affordable.length === 0) return false;
  const shortlist = affordable.sort((a, b) => b.footTraffic - a.footTraffic).slice(0, 12);
  const building = shortlist[index % shortlist.length] ?? shortlist[0];
  const options = BUSINESS_TYPES.filter((type2) => fits(building, type2));
  if (options.length === 0) return false;
  const type = gameRng.pick(options);
  if (!rentBuilding(state, building.id).ok) return false;
  const founded = foundBusiness(state, type.id, building.id, `${company.name} ${type.name}`);
  if (!founded.ok) return false;
  const business = playerBusinesses(state).find((b) => b.buildingId === building.id);
  if (!business) return false;
  business.reputation = clamp(def.reputation, 0, 100);
  business.awareness = clamp(def.awareness, 0, 100);
  business.autoRestock = true;
  for (let i = 0; i < def.staffPerLocation; i += 1) {
    const wanted = type.roles[i % type.roles.length];
    const applicant = applicantsFor(state, business).find((a) => a.role === wanted) ?? applicantsFor(state, business)[0];
    if (!applicant) break;
    if (!hire(state, applicant.id, business.id).ok) break;
  }
  if (type.productIds.length > 0) {
    let ordered = false;
    for (const supplierId of rankedSuppliers(business)) {
      const lines = suggestOrder(state, business, supplierId);
      if (lines.length === 0) continue;
      if (placeOrder(state, supplierId, business.id, lines).ok) {
        ordered = true;
        break;
      }
    }
    if (ordered) {
      for (let hour = 0; hour < 24 * 6; hour += 1) {
        engine.stepHour();
        if (sum(Object.values(business.stock), (units) => units) > 0) break;
      }
    }
  }
  const opened = openBusiness(state, business.id);
  if (!opened.ok) {
    const spare = state.applicants.find((a) => type.roles.includes(a.role)) ?? state.applicants[0];
    if (spare) hire(state, spare.id, business.id);
    openBusiness(state, business.id);
  }
  return business.status === "open";
}
function setUpHeadOffice(state) {
  const company = playerCompany(state);
  const unit = state.buildings.find((b) => b.status === "available" && b.size > 90);
  if (!unit) return;
  if (company.cash < HQ_FIT_OUT + unit.rent * 3) return;
  if (!rentBuilding(state, unit.id).ok) return;
  if (!openHeadOffice(state, unit.id, `${company.name} Head Office`).ok) return;
  for (const role2 of ["hr", "accountant"]) {
    const applicant = state.applicants.find((a) => a.role === role2);
    if (applicant) hireToHeadOffice(state, applicant.id);
  }
}
function inheritDebt(state, def) {
  const principal = Math.round(def.cash * def.debtShare / 1e3) * 1e3;
  if (principal < 1e3) return;
  const rate = state.economy.interestRate + 0.034;
  const term = 60;
  state.loans.push({
    id: makeId("loan"),
    lender: "Meridian Business Bank",
    typeId: "business",
    principal,
    outstanding: principal,
    annualRate: rate,
    termMonths: term,
    monthlyPayment: Math.round(monthlyPayment(principal, rate, term)),
    takenOnDay: 1,
    missedPayments: 0,
    interestPaid: 0,
    earlyRepaid: 0
  });
}
function addRivals(state, count2) {
  const rivals = state.companies.filter((c) => !c.isPlayer);
  if (rivals.length === 0) return;
  for (let i = 0; i < count2; i += 1) {
    const company = rivals[i % rivals.length];
    company.cash += 8e4;
  }
}

// src/ui/welcome.ts
function showWelcome(root2, onStart) {
  let screen = "title";
  let scenarioId = "entrepreneur";
  let traitId = "allrounder";
  let companyName = "Newco";
  let founderName = "You";
  const custom = {};
  const render = () => {
    clear(root2);
    const shell2 = h("div", { class: "welcome-shell" });
    const card = h("div", { class: "welcome" });
    shell2.appendChild(card);
    root2.appendChild(shell2);
    card.appendChild(
      h(
        "div",
        { class: "welcome-brand" },
        h("div", { class: "welcome-mark", text: "BM" }),
        h(
          "div",
          {},
          h("h1", { class: "welcome-title", text: "Business Manager" }),
          h("p", {
            class: "welcome-sub",
            text: `${CITY_NAME}, population ${count(CITY_POPULATION)}. Somebody is about to open something.`
          })
        )
      )
    );
    if (screen === "title") renderTitle(card);
    else if (screen === "scenario") renderScenario(card);
    else if (screen === "founder") renderFounder(card);
    else if (screen === "howto") renderHowTo(card);
    else if (screen === "about") renderAbout(card);
    else renderSettings(card);
  };
  const go = (next) => {
    screen = next;
    render();
  };
  function renderTitle(card) {
    const saves = listSaves();
    const menu = h("div", { class: "welcome-menu" });
    menu.appendChild(
      menuItem("New game", "Pick where you want to start from, and who you are.", () => go("scenario"), true)
    );
    if (saves.length > 0) {
      const latest = saves[0];
      menu.appendChild(
        menuItem(
          "Continue",
          `${latest.company} \xB7 day ${latest.day} \xB7 ${money(latest.netWorth)}`,
          () => {
            const loaded = loadGame(latest.id);
            if (!loaded) {
              toast("That save could not be read.", "bad");
              return;
            }
            onStart(loaded);
          }
        )
      );
    } else {
      const item = menuItem("Continue", "No saved game yet.", () => {
      });
      item.classList.add("disabled");
      item.disabled = true;
      menu.appendChild(item);
    }
    menu.appendChild(menuItem("How to play", "What the game is, in about a minute.", () => go("howto")));
    menu.appendChild(menuItem("Settings", "Autosave, number format, confirmations.", () => go("settings")));
    menu.appendChild(menuItem("About", "What this is and how it works underneath.", () => go("about")));
    card.appendChild(menu);
    if (saves.length > 1) {
      const list = h("div", { class: "welcome-saves" });
      list.appendChild(h("div", { class: "welcome-heading", text: "Other saved games" }));
      for (const slot of saves.slice(1, 7)) {
        list.appendChild(
          h(
            "div",
            { class: "save-row" },
            h(
              "div",
              { style: "flex:1;min-width:0" },
              h("div", { text: slot.name + (slot.auto ? " (auto)" : "") }),
              h("div", { class: "save-meta", text: `${slot.company} \xB7 day ${slot.day} \xB7 ${money(slot.netWorth)}` })
            ),
            button(
              "Load",
              () => {
                const loaded = loadGame(slot.id);
                if (!loaded) {
                  toast("That save could not be read.", "bad");
                  return;
                }
                onStart(loaded);
              },
              "btn small primary"
            ),
            button(
              "Delete",
              () => {
                deleteSave(slot.id);
                render();
              },
              "btn small"
            )
          )
        );
      }
      card.appendChild(list);
    }
  }
  function renderScenario(card) {
    card.appendChild(heading("Where do you want to start?", "Each of these is a different problem, not a difficulty setting."));
    const grid = h("div", { class: "scenario-grid" });
    for (const def of SCENARIOS) {
      const chosen = def.id === scenarioId;
      grid.appendChild(
        h(
          "button",
          {
            class: `scenario-card${chosen ? " chosen" : ""}`,
            on: {
              click: () => {
                scenarioId = def.id;
                render();
              }
            }
          },
          h(
            "div",
            { class: "scenario-head" },
            h("span", { class: "scenario-name", text: def.name }),
            h("span", { class: `tag ${difficultyTone(def)}`, text: DIFFICULTY_LABELS[def.difficulty] })
          ),
          h("div", { class: "scenario-tagline", text: def.tagline }),
          h("div", { class: "sub", text: def.detail }),
          h("div", { class: "scenario-focus", text: def.focus }),
          h("div", {
            class: "tiny muted",
            text: `${money(def.cash)} \xB7 ${def.locations === 0 ? "nothing trading yet" : `${def.locations} location${def.locations === 1 ? "" : "s"}`}${def.headOffice ? " \xB7 head office" : ""}${def.debtShare > 0 ? " \xB7 carrying debt" : ""}`
          })
        )
      );
    }
    card.appendChild(grid);
    if (scenarioId === "custom") card.appendChild(renderCustom());
    card.appendChild(
      h(
        "div",
        { class: "welcome-actions" },
        button("Back", () => go("title")),
        button("Next \u2014 who are you?", () => go("founder"), "btn primary")
      )
    );
  }
  function renderCustom() {
    const base2 = scenario("custom");
    const panel = h("div", { class: "custom-panel" });
    panel.appendChild(h("div", { class: "welcome-heading", text: "Set it up yourself" }));
    const field = (label, hint2, key2, min, max, step) => {
      const value = custom[key2] ?? base2[key2];
      return h(
        "label",
        { class: "field custom-field" },
        h("span", { text: label }),
        numberInput(
          value,
          (next) => {
            custom[key2] = Math.max(min, Math.min(max, next));
          },
          { min: String(min), max: String(max), step: String(step) }
        ),
        h("span", { class: "tiny muted", text: hint2 })
      );
    };
    const grid = h("div", { class: "grid cols-3" });
    grid.appendChild(field("Starting cash", "What is in the bank on day one.", "cash", 5e3, 5e6, 5e3));
    grid.appendChild(field("Locations", "Opened and trading before you arrive.", "locations", 0, 12, 1));
    grid.appendChild(field("Staff per location", "Hired into each of them.", "staffPerLocation", 0, 10, 1));
    grid.appendChild(field("Reputation", "What customers already think, 0\u2013100.", "reputation", 0, 100, 5));
    grid.appendChild(field("Awareness", "How many people have heard of you, 0\u2013100.", "awareness", 0, 100, 5));
    grid.appendChild(field("Credit rating", "What the bank thinks, 0\u2013100.", "creditRating", 0, 100, 5));
    grid.appendChild(field("Days of history", "Trading run before you take over.", "warmUpDays", 0, 120, 5));
    grid.appendChild(field("Extra rivals", "How crowded the city already is.", "extraRivals", 0, 10, 1));
    grid.appendChild(field("Level reached", "What the company counts as having earned.", "levelReached", 1, 8, 1));
    panel.appendChild(grid);
    panel.appendChild(
      h("p", {
        class: "tiny muted",
        text: "Everything you set here is built by the game itself \u2014 leases taken, people hired, doors opened, then the clock run forward. A custom company behaves exactly like one you built by hand."
      })
    );
    return panel;
  }
  function renderFounder(card) {
    card.appendChild(
      heading("And who are you?", "What you did before this decides what you are good at \u2014 and what you will have to learn the hard way.")
    );
    const grid = h("div", { class: "scenario-grid" });
    for (const def2 of FOUNDER_TRAITS) {
      const chosen = def2.id === traitId;
      const skills = startingSkills(def2.id);
      const bars = h("div", { class: "trait-skills" });
      for (const skill of FOUNDER_SKILLS) {
        const value = skills[skill.id];
        bars.appendChild(
          h(
            "div",
            { class: "trait-skill" },
            h("span", { class: "trait-skill-name", text: skill.name }),
            bar(value / 100, value >= 60 ? "good" : value <= 25 ? "bad" : ""),
            h("span", { class: "trait-skill-value", text: String(value) })
          )
        );
      }
      grid.appendChild(
        h(
          "button",
          {
            class: `scenario-card${chosen ? " chosen" : ""}`,
            on: {
              click: () => {
                traitId = def2.id;
                render();
              }
            }
          },
          h("div", { class: "scenario-head" }, h("span", { class: "scenario-name", text: def2.name })),
          h("div", { class: "scenario-tagline", text: def2.detail }),
          h("div", { class: "sub", text: def2.plays }),
          bars
        )
      );
    }
    card.appendChild(grid);
    const names = h("div", { class: "grid cols-2", style: "margin-top:14px" });
    const companyInput = h("input", { type: "text", value: companyName, maxlength: 40, placeholder: "Company name" });
    const founderInput = h("input", { type: "text", value: founderName, maxlength: 40, placeholder: "Your name" });
    companyInput.addEventListener("input", () => {
      companyName = companyInput.value;
    });
    founderInput.addEventListener("input", () => {
      founderName = founderInput.value;
    });
    names.appendChild(h("label", { class: "field" }, h("span", { text: "Company name" }), companyInput));
    names.appendChild(h("label", { class: "field" }, h("span", { text: "Your name" }), founderInput));
    card.appendChild(names);
    const def = scenario(scenarioId);
    card.appendChild(
      h("p", {
        class: "tiny muted",
        text: `${def.name} \xB7 ${founderTrait(traitId).name}. ${def.focus}`
      })
    );
    const begin = () => {
      const state = startGame({
        companyName: companyInput.value.trim() || "Newco",
        founderName: founderInput.value.trim() || "You",
        traitId,
        scenarioId,
        overrides: scenarioId === "custom" ? custom : void 0
      });
      onStart(state);
    };
    for (const input of [companyInput, founderInput]) {
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") begin();
      });
    }
    card.appendChild(
      h(
        "div",
        { class: "welcome-actions" },
        button("Back", () => go("scenario")),
        button("Start the company", begin, "btn primary")
      )
    );
  }
  function renderHowTo(card) {
    card.appendChild(heading("How to play", "The whole game in about a minute."));
    const steps = [
      ["Take a lease", "Find a unit on the map or in Real estate. Busy pitches cost more and are worth more \u2014 for a shop. A repair business draws on the people who live nearby, not the ones walking past."],
      ["Open something", "Choose a trade that suits the unit, stock it, hire somebody, open the doors. Nothing sells until they are open."],
      ["Watch the first week", "The dashboard tells you what needs you today and what is worth doing. Both come from the same figures every other screen shows."],
      ["Mind the cash, not the profit", "A profitable company can still run out of money. The cash forecast is the screen that tells you before it happens."],
      ["Hire, then manage", "People have skills, a personality and a career. A brilliant technician is not automatically a manager \u2014 that takes leadership, and leadership is trained."],
      ["Grow, then let go", "Past about four locations you cannot see them all. That is when a head office, divisions and somebody senior to run them stop being optional."]
    ];
    const list = h("div", { class: "howto" });
    steps.forEach(([title, detail], index) => {
      list.appendChild(
        h(
          "div",
          { class: "howto-step" },
          h("span", { class: "howto-number", text: String(index + 1) }),
          h("div", {}, h("div", { class: "howto-title", text: title }), h("div", { class: "sub", text: detail }))
        )
      );
    });
    card.appendChild(list);
    card.appendChild(h("div", { class: "welcome-actions" }, button("Back", () => go("title"), "btn primary")));
  }
  function renderAbout(card) {
    card.appendChild(heading("About", "What this is, and what is underneath it."));
    card.appendChild(
      h(
        "div",
        { class: "about" },
        para(
          `${CITY_NAME} is generated once and stays put: about 390 units across fifteen districts, every one with its own footfall, rent, income and appetite for different trades. The map is drawn rather than pictured, and the traffic on it is routed along a real road graph.`
        ),
        para(
          "Everything the game shows you is derived from one set of numbers. The share on the dashboard is the share the demand model hands out; the performance on a profile page is the figure the simulation multiplies by; the accounts are closed from the same ledger the transactions list shows. Nothing on any screen is decorative."
        ),
        para(
          "The clock runs an hour at a time and produces the same result at every speed. A day is settled before the date changes, so rent, wages and every closing entry land in the right day."
        ),
        para("Saves are versioned and migrated. A game started on an older build keeps playing.")
      )
    );
    card.appendChild(h("div", { class: "welcome-actions" }, button("Back", () => go("title"), "btn primary")));
  }
  function renderSettings(card) {
    card.appendChild(heading("Settings", "These apply to every game, saved or new."));
    const current = readSettings();
    const rows = [
      ["autosave", "Autosave", "Save automatically at the end of each day."],
      ["showTutorial", "Show the tutorial", "The prompts that walk you through the first few steps."],
      ["compactNumbers", "Short numbers", "Write \u20AC1.2m rather than \u20AC1,200,000."],
      ["confirmLargeSpend", "Confirm large spending", "Ask before anything that costs a lot."]
    ];
    const list = h("div", {});
    for (const [key2, label, detail] of rows) {
      const input = h("input", { type: "checkbox" });
      input.checked = current[key2];
      input.addEventListener("change", () => {
        current[key2] = input.checked;
        writeSettings(current);
      });
      list.appendChild(
        h(
          "label",
          { class: "switch" },
          input,
          h("div", {}, h("div", { text: label }), h("div", { class: "sub", text: detail }))
        )
      );
    }
    card.appendChild(list);
    card.appendChild(h("div", { class: "welcome-actions" }, button("Back", () => go("title"), "btn primary")));
  }
  render();
}
function heading(title, detail) {
  return h("div", { class: "welcome-step-head" }, h("h2", { text: title }), h("p", { class: "sub", text: detail }));
}
function para(text) {
  return h("p", { class: "sub", text });
}
function menuItem(label, detail, onClick, primary = false) {
  return h(
    "button",
    { class: `menu-item${primary ? " primary" : ""}`, on: { click: onClick } },
    h("span", { class: "menu-label", text: label }),
    h("span", { class: "menu-detail", text: detail })
  );
}
function difficultyTone(def) {
  if (def.difficulty === "hard") return "bad";
  if (def.difficulty === "sandbox") return "";
  return "good";
}
function readSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
function writeSettings(settings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
  }
}

// src/sim/advice.ts
var SEVERITY_RANK = { critical: 3, warning: 2, opportunity: 1 };
function note(business, id, severity, headline, detail, action, route2, weight, params = {}) {
  return {
    id: business ? `${business.id}:${id}` : id,
    businessId: business?.id ?? null,
    severity,
    headline,
    detail,
    action,
    route: route2,
    params: business && route2 === "businesses" ? { business: business.id, ...params } : params,
    weight
  };
}
function adviceFor(state, business) {
  const out = [];
  const type = businessTypeOrThrow(business.typeId);
  const building = buildingById(state, business.buildingId);
  const yesterday = business.yesterday;
  const dayCosts = yesterday.cogs + yesterday.wages + yesterday.rent + yesterday.marketing + yesterday.otherCosts;
  if (business.status === "setup") {
    const stocked = sum(Object.values(business.stock), (units) => units) > 0 || type.productIds.length === 0;
    const staffed = employeesOf(state, business.id).length > 0;
    const missing = !stocked ? "stock on the shelves" : !staffed ? "somebody to work there" : null;
    out.push(
      note(
        business,
        "not-open",
        "critical",
        `${business.name} is not open yet`,
        missing ? `It still needs ${missing}. Until then it pays rent and earns nothing.` : "Everything it needs is in place \u2014 it is only waiting on you.",
        missing === "stock on the shelves" ? "Order stock" : missing ? "Hire somebody" : "Open the doors",
        missing === "stock on the shelves" ? "inventory" : missing ? "employees" : "businesses",
        100
      )
    );
    return out;
  }
  if (business.status !== "open") return out;
  const own = attractiveness(state, business);
  const factor2 = (label) => own.factors.find((f) => f.label === label)?.value ?? 1;
  if (factor2("Location") < 0.45 && building) {
    out.push(
      note(
        business,
        "location",
        "warning",
        "This unit gets almost no passing trade",
        `Only ${building.footTraffic.toLocaleString("en-GB")} people a day walk past ${building.address}, which is the weakest thing about ${business.name}. A ${type.name.toLowerCase()} lives on footfall.`,
        "Advertise hard to pull people in, or move to a busier unit",
        "property",
        72
      )
    );
  }
  const walkIn = type.category === "retail" || type.category === "food";
  if (!walkIn && building && building.footTraffic > 18e3) {
    out.push(
      note(
        business,
        "wrong-pitch",
        "warning",
        "You are paying for passing trade you cannot use",
        `${building.footTraffic.toLocaleString("en-GB")} people a day walk past ${building.address}, and ${money(building.rent)} a month of your rent is for that footfall. A ${type.name.toLowerCase()} draws on the people who live and work in ${district(building.district).name}, not the ones walking by.`,
        "A quieter unit in the same district would trade the same and cost less",
        "property",
        70
      )
    );
  }
  if (business.awareness < 25 && business.marketingBudget <= 0) {
    out.push(
      note(
        business,
        "awareness",
        "warning",
        "Hardly anyone knows you are there",
        `${Math.round(business.awareness)}% of ${building ? district(building.district).name : "the district"} has heard of ${business.name}, and you are spending nothing on marketing.`,
        "Set a daily marketing budget",
        "marketing",
        78
      )
    );
  }
  const losingStreak = business.profitHistory.slice(-3);
  if (losingStreak.length === 3 && losingStreak.every((p2) => p2 < 0)) {
    const worst = [
      { label: "wages", value: yesterday.wages },
      { label: "rent", value: yesterday.rent },
      { label: "stock", value: yesterday.cogs },
      { label: "marketing", value: yesterday.marketing }
    ].reduce((best, entry) => entry.value > best.value ? entry : best);
    out.push(
      note(
        business,
        "losing",
        "critical",
        `${business.name} is losing money every day`,
        `Yesterday it took ${money(yesterday.revenue)} and spent ${money(dayCosts)}. The largest cost was ${worst.label} at ${money(worst.value)}.`,
        yesterday.revenue < dayCosts * 0.5 ? "Fix demand before cutting costs" : "Trim the biggest cost or raise prices",
        "businesses",
        95
      )
    );
  }
  if (yesterday.lostCustomers > Math.max(4, yesterday.customers * 0.12)) {
    out.push(
      note(
        business,
        "capacity",
        "warning",
        `${business.name} is turning customers away`,
        `${Math.round(yesterday.lostCustomers)} people left without buying yesterday against ${Math.round(yesterday.customers)} served \u2014 roughly ${Math.round(hourlyCapacity(state, business))} customers an hour is all it can handle.`,
        "Hire another pair of hands, or widen the opening hours",
        "employees",
        80
      )
    );
  }
  const stockouts = type.productIds.filter((id) => (business.stock[id] ?? 0) <= 0.5);
  if (stockouts.length > 0) {
    const names = stockouts.map((id) => product(id)?.name).filter(Boolean).slice(0, 3).join(", ");
    out.push(
      note(
        business,
        "stockout",
        stockouts.length >= type.productIds.length / 2 ? "critical" : "warning",
        `${business.name} has sold out of ${stockouts.length} line${stockouts.length === 1 ? "" : "s"}`,
        `${names} ${stockouts.length === 1 ? "is" : "are"} off the shelf. Every customer who came for ${stockouts.length === 1 ? "it" : "them"} walked out again.`,
        business.autoRestock ? "Raise the reorder points" : "Order stock and turn on automatic reordering",
        "inventory",
        88
      )
    );
  }
  const rivals = rivalsOf(state, business);
  if (rivals.length > 0 && type.productIds.length > 0) {
    const mine = priceIndex(business);
    const theirs = sum(rivals, (r) => priceIndex(r)) / rivals.length;
    if (mine > theirs * 1.12) {
      out.push(
        note(
          business,
          "expensive",
          "warning",
          "You are the expensive option here",
          `Your prices sit at ${pct(mine * 100)} of the market while your rivals average ${pct(theirs * 100)}. Price is the strongest single pull for a ${type.name.toLowerCase()}.`,
          "Cut prices, or give people a reason to pay more",
          "businesses",
          66
        )
      );
    } else if (mine < theirs * 0.9 && business.yesterday.lostCustomers > 3) {
      out.push(
        note(
          business,
          "underpriced",
          "opportunity",
          "You are cheap and already full",
          `Your prices are ${pct(mine * 100)} of the market, you are turning people away, and margin is ${pct(grossMargin(business) * 100)}. You are leaving money on the counter.`,
          "Raise prices \u2014 demand can take it",
          "businesses",
          58
        )
      );
    }
  }
  const margin = grossMargin(business);
  if (type.productIds.length > 0 && margin < 0.16 && business.today.revenue + yesterday.revenue > 0) {
    out.push(
      note(
        business,
        "margin",
        "warning",
        "Almost nothing is left after the stock cost",
        `Your gross margin is ${pct(margin * 100)}. Every sale barely covers what the goods cost, so wages and rent come straight out of your pocket.`,
        "Raise prices or find a cheaper supplier",
        "inventory",
        70
      )
    );
  }
  const monthRevenue = sum(business.profitHistory.slice(-30), () => 0) + yesterday.revenue * 30;
  if (building && monthRevenue > 0 && building.rent > monthRevenue * 0.3) {
    out.push(
      note(
        business,
        "rent",
        "warning",
        "The rent is too big for the trade",
        `${money(building.rent)} a month against roughly ${money(monthRevenue)} of takings. Anything over about 30% is very hard to trade out of.`,
        "Grow the takings or find cheaper premises",
        "property",
        62
      )
    );
  }
  const staff = employeesOf(state, business.id);
  if (staff.length === 0) {
    out.push(
      note(
        business,
        "nobody",
        "critical",
        `Nobody works at ${business.name}`,
        "You are covering the floor yourself, which caps it at about half of what one member of staff could serve. Everything above that walks out of the door.",
        "Hire somebody",
        "employees",
        92
      )
    );
  }
  if (staff.length > 0) {
    const morale = sum(staff, (e) => e.morale) / staff.length;
    const stress = sum(staff, (e) => e.stress) / staff.length;
    if (morale < 42 || stress > 72) {
      out.push(
        note(
          business,
          "morale",
          "warning",
          "Your team is close to walking out",
          `Average morale is ${Math.round(morale)}/100 and stress ${Math.round(stress)}/100. Unhappy staff serve worse and hand in their notice.`,
          "Give them a rise, more hands, or shorter hours",
          "employees",
          74
        )
      );
    }
  }
  const sick = staff.filter((e) => isOffSick(state, e));
  if (sick.length > 0) {
    out.push(
      note(
        business,
        "sick",
        sick.length >= Math.max(1, staff.length / 2) ? "critical" : "warning",
        `${sick.length} of ${staff.length} are off sick`,
        `${sick.map((e) => e.name).join(", ")} ${sick.length === 1 ? "is" : "are"} at home. You are paying them and serving fewer customers. Stress is what makes this repeat.`,
        "Cover the shift, or take the pressure off the rest of the team",
        "employees",
        76
      )
    );
  }
  const ready = staff.find((e) => quotePromotion(state, e).blocked === null && e.skill > 62);
  if (ready) {
    out.push(
      note(
        business,
        "promote",
        "opportunity",
        `${ready.name} is ready for more`,
        `Skill ${Math.round(ready.skill)}, ${Math.round(ready.loyalty)}/100 loyal, and long enough in the job. Promoting them lifts the whole team${ready.traits.includes("ambitious") ? " \u2014 and they are ambitious, so they will not wait forever" : ""}.`,
        "Promote them",
        "employees",
        ready.traits.includes("ambitious") ? 60 : 45
      )
    );
  }
  const complaint = topComplaint(state, business.id);
  if (complaint && complaint.count >= 3) {
    out.push(
      note(
        business,
        "reviews",
        "warning",
        `Customers keep complaining about ${DRIVER_LABELS[complaint.driver].toLowerCase()}`,
        `${complaint.count} of the last few reviews say the same thing, and the score is ${business.reviewScore.toFixed(1)}\u2605. Reputation feeds straight back into how many people walk in.`,
        "Fix that one thing before anything else",
        "businesses",
        68
      )
    );
  }
  return out.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.weight - a.weight);
}
function topAdvice(state, limit = 5) {
  const out = [];
  const company = playerCompany(state);
  const businesses = playerBusinesses(state);
  const month = monthlyProfit(state, 30);
  const burn = (month.costs - month.revenue) / 30;
  if (burn > 0 && company.cash > 0) {
    const days = company.cash / burn;
    if (days < 30) {
      out.push(
        note(
          null,
          "runway",
          "critical",
          `About ${Math.round(days)} days of cash left`,
          `You are spending ${money(burn)} a day more than you take. At this rate the account is empty on day ${state.day + Math.round(days)}.`,
          days < 12 ? "Cut costs now, or borrow to buy time" : "Fix the losses while you still have room",
          "finance",
          120
        )
      );
    }
  }
  if (businesses.length === 0) {
    out.push(
      note(
        null,
        "start",
        "opportunity",
        "You have no businesses yet",
        `You are sitting on ${money(company.cash)} and paying for nothing. Rent a unit and open something.`,
        "Find premises on the map",
        "map",
        90
      )
    );
  }
  const attention = ownerAttention(state);
  if (attention < 1) {
    const loose = state.divisions.filter((division) => division.headEmployeeId === null);
    const ready = eligibleHeads(state)[0];
    out.push(
      note(
        null,
        "attention",
        attention < 0.75 ? "critical" : "warning",
        `You are running more than one person can hold`,
        `Attention is at ${attention.toFixed(2)} of 1, and every location is paying about ${Math.round(
          (attentionFactor(state) - 1) * 100
        )}% more in coordination because of it.${ready ? ` ${ready.name} is a ${titleOf(ready)} and is not running anything.` : ""}`,
        loose.length > 0 ? "Put somebody senior over a division" : "Group the locations and delegate",
        "holding",
        95
      )
    );
  }
  for (const division of state.divisions) {
    if (division.headEmployeeId !== null) continue;
    const count2 = divisionBusinesses(state, division.id).length;
    if (count2 < 2) continue;
    out.push(
      note(
        null,
        `division:${division.id}`,
        "opportunity",
        `${division.name} has nobody answerable for it`,
        `${count2} locations with no head. A Senior Manager or an Executive would take them off your desk entirely.`,
        "Appoint somebody to run it",
        "holding",
        70
      )
    );
  }
  const promotable = state.employees.filter((person) => person.companyId === state.playerCompanyId && quotePromotion(state, person).blocked === null).sort((a, b) => b.skill - a.skill)[0];
  if (promotable) {
    const quote = quotePromotion(state, promotable);
    out.push(
      note(
        null,
        "promotable",
        "opportunity",
        `${promotable.name} has earned a step up`,
        `${titleOf(promotable)} on ${Math.round(promotable.skill)} overall. ${quote.title} costs ${money(
          quote.extra
        )} more a month and buys loyalty money alone does not.`,
        "Promote them before somebody else does",
        "employees",
        55,
        promotable.businessId ? { business: promotable.businessId } : {}
      )
    );
  }
  for (const warehouse of warehousesOf(state)) {
    const drivers = employeesOf(state, warehouse.id).filter((e) => e.role === "driver").length;
    if (drivers === 0) {
      out.push(
        note(
          null,
          `wh-driver-${warehouse.id}`,
          "warning",
          `${warehouse.name} has no driver`,
          `It can manage ${BASE_TRIPS} runs a night instead of ${BASE_TRIPS + TRIPS_PER_DRIVER}, so shops go short while stock sits on the racks.`,
          "Hire a driver",
          "logistics",
          72
        )
      );
    }
    if (stockValue(warehouse) < 200 && businesses.some((b) => b.status === "open")) {
      out.push(
        note(
          null,
          `wh-empty-${warehouse.id}`,
          "warning",
          `${warehouse.name} is empty`,
          "You are paying rent, wages and standing charges on a building holding nothing, and your shops are buying from suppliers at shop prices.",
          "Order stock in bulk, or close the centre",
          "logistics",
          75
        )
      );
    }
  }
  if (warehousesOf(state).length > 0 && businesses.filter((b) => b.status === "open").length < 2) {
    out.push(
      note(
        null,
        "wh-premature",
        "warning",
        "A distribution centre for one shop",
        "The rent, the wages and the vans cost more than the deliveries they save until you are running about three locations.",
        "Open more shops, or close the centre",
        "logistics",
        58
      )
    );
  } else if (warehousesOf(state).length === 0 && businesses.filter((b) => b.status === "open" && Object.keys(b.stock).length > 0).length >= 3) {
    out.push(
      note(
        null,
        "wh-worth-it",
        "opportunity",
        "Your shops are each buying separately",
        `${businesses.length} locations, every one paying its own call-out charge and its own minimum order. Buying in bulk into a warehouse and running your own van is usually cheaper at this size.`,
        "Look at distribution",
        "logistics",
        50
      )
    );
  }
  for (const business of businesses) out.push(...adviceFor(state, business));
  if (out.length === 0 && businesses.length > 0) {
    const best = businesses.reduce(
      (a, b) => sum(b.profitHistory.slice(-7), (p2) => p2) > sum(a.profitHistory.slice(-7), (p2) => p2) ? b : a
    );
    out.push(
      note(
        null,
        "expand",
        "opportunity",
        "Everything is running well",
        `${best.name} has been your strongest performer this week and nothing is on fire. This is the moment to open a second location.`,
        "Look for a unit",
        "map",
        40
      )
    );
  }
  return out.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.weight - a.weight).slice(0, limit);
}
function topProblems(state, limit = 3) {
  return topAdvice(state, 60).filter((item) => item.severity !== "opportunity").slice(0, limit);
}
function topOpportunities(state, limit = 4) {
  return topAdvice(state, 60).filter((item) => item.severity === "opportunity").slice(0, limit);
}

// src/ui/chart.ts
var NS = "http://www.w3.org/2000/svg";
function svg(width, height) {
  const el = document.createElementNS(NS, "svg");
  el.setAttribute("viewBox", `0 0 ${width} ${height}`);
  el.setAttribute("preserveAspectRatio", "none");
  el.setAttribute("class", "chart");
  return el;
}
function node(tag, attrs) {
  const el = document.createElementNS(NS, tag);
  for (const [key2, value] of Object.entries(attrs)) el.setAttribute(key2, value);
  return el;
}
function lineChart(values, options = {}) {
  const width = 600;
  const height = options.height ?? 130;
  const el = svg(width, height);
  if (values.length === 0) {
    el.appendChild(
      node("text", { x: String(width / 2), y: String(height / 2), fill: "#64758a", "font-size": "13", "text-anchor": "middle" })
    ).textContent = "No data yet";
    return el;
  }
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const pad = 6;
  const usable = height - pad * 2;
  const stepX = values.length > 1 ? width / (values.length - 1) : width;
  const toY = (value) => pad + (1 - (value - min) / span) * usable;
  if (options.showZero !== false && min < 0 && max > 0) {
    el.appendChild(
      node("line", {
        x1: "0",
        x2: String(width),
        y1: String(toY(0)),
        y2: String(toY(0)),
        stroke: "#33465f",
        "stroke-width": "1",
        "stroke-dasharray": "4 4"
      })
    );
  }
  const points = values.map((value, index) => `${(index * stepX).toFixed(1)},${toY(value).toFixed(1)}`);
  const last = values[values.length - 1];
  const stroke = last >= 0 ? "#4bbf87" : "#e2686d";
  el.appendChild(
    node("polyline", {
      points: `0,${toY(min)} ${points.join(" ")} ${width},${toY(min)}`,
      fill: last >= 0 ? "rgba(75,191,135,0.13)" : "rgba(226,104,109,0.13)",
      stroke: "none"
    })
  );
  el.appendChild(
    node("polyline", {
      points: points.join(" "),
      fill: "none",
      stroke,
      "stroke-width": "2",
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
      "vector-effect": "non-scaling-stroke"
    })
  );
  return el;
}

// src/ui/views/dashboard.ts
function dashboardView(ctx) {
  const el = h("div", { class: "view" });
  const state = ctx.state;
  const company = playerCompany(state);
  const businesses = playerBusinesses(state);
  const open = businesses.filter((b) => b.status === "open");
  const cal = calendar(state.day);
  const todayRevenue = sum(businesses, (b) => b.today.revenue);
  const todayCosts = sum(
    businesses,
    (b) => b.today.cogs + b.today.wages + b.today.rent + b.today.marketing + b.today.otherCosts
  );
  const last30 = state.dayHistory.slice(-30);
  const monthRevenue = sum(last30, (d) => d.revenue);
  const monthProfit = sum(last30, (d) => d.profit);
  const worth = netWorth(state);
  const tier = currentTier(state);
  const economy = economyLabel(state);
  el.appendChild(
    h(
      "div",
      { class: "view-head" },
      h("h1", { text: company.name }),
      h("p", { text: `${cal.label} \xB7 ${clockLabel(state.hour)} \xB7 economy: ${economy.label}` })
    )
  );
  const step = nextStep(state);
  const level = levelOf(state);
  const ahead = nextLevel(state);
  el.appendChild(
    h(
      "section",
      { class: "panel next-step" },
      h("div", { class: "next-step-label", text: "YOUR NEXT STEP" }),
      h("h2", { class: "next-step-title", text: step.title }),
      h("p", { class: "next-step-why", text: step.why }),
      bar(step.progress, step.progress > 0.66 ? "good" : ""),
      h(
        "div",
        { class: "next-step-foot" },
        h("span", {
          class: "next-step-reward",
          text: ahead ? `Reward: ${step.reward} \xB7 Level ${level.n} ${level.name}, ${Math.round(levelProgress(state) * 100)}% towards ${ahead.name}` : `Reward: ${step.reward} \xB7 Level ${level.n} ${level.name}`
        }),
        button("Take me there", () => ctx.go(step.view), "btn primary"),
        button("The ladder", () => ctx.go("progress"))
      )
    )
  );
  if (state.stats.bankrupt) {
    el.appendChild(
      h(
        "section",
        { class: "panel", style: "border-color:var(--bad)" },
        h("h3", { class: "panel-title bad", text: "Bankrupt" }),
        h("p", {
          text: "Your debts are larger than everything the company owns. Sell property and stock to raise cash, or start again from Settings."
        })
      )
    );
  }
  for (const decision of state.decisions) {
    el.appendChild(
      h(
        "section",
        { class: "panel decision-panel" },
        h(
          "div",
          { class: "decision-card" },
          h(
            "div",
            { style: "flex:1;min-width:0" },
            h("div", { class: "panel-title accent-text", text: "Decision needed" }),
            h("div", { class: "card-title", text: decision.title }),
            h("div", { class: "card-sub", text: decision.body })
          ),
          button("Decide", () => showDecision(ctx, decision), "btn primary")
        )
      )
    );
  }
  const problems = topProblems(state, 3);
  const chances = topOpportunities(state, 4);
  const adviceRow = (item, star) => h(
    "button",
    {
      class: `advice-row ${item.severity} clickable-row`,
      on: { click: () => ctx.go(item.route, item.params) }
    },
    star ? h("span", { class: "advice-star", text: "\u2605" }) : h("span", { class: `advice-dot ${item.severity}` }),
    h(
      "div",
      { style: "flex:1;min-width:0;text-align:left" },
      h("div", { class: "advice-headline", text: item.headline }),
      h("div", { class: "advice-detail", text: item.detail }),
      h("div", { class: "advice-action", text: `\u2192 ${item.action}` })
    ),
    h("span", { class: "row-chevron", text: "\u203A" })
  );
  if (problems.length > 0) {
    const panel = section("Needs you today");
    panel.classList.add("urgent");
    for (const item of problems) panel.appendChild(adviceRow(item, false));
    el.appendChild(panel);
  }
  const staff = state.employees.filter((e) => e.companyId === state.playerCompanyId);
  const cash = forecast(state, 14);
  const shortage = sum(open, (b) => staffingSummary(state, b).shortage);
  const lastWeek = sum(state.dayHistory.slice(-7), (d) => d.revenue);
  const weekBefore = sum(state.dayHistory.slice(-14, -7), (d) => d.revenue);
  const growth = weekBefore > 0 ? (lastWeek - weekBefore) / weekBefore : 0;
  const rivals = state.businesses.filter((b) => b.companyId !== state.playerCompanyId && b.status === "open").length;
  const attention = ownerAttention(state);
  const reputation = open.length > 0 ? sum(open, (b) => b.reputation) / open.length : 0;
  const morale = staff.length > 0 ? sum(staff, (e) => e.morale) / staff.length : 0;
  const workload = staff.length > 0 ? sum(staff, (e) => e.workload) / staff.length : 0;
  const performance2 = staff.length > 0 ? sum(staff, (e) => performanceOf(e)) / staff.length : 0;
  el.appendChild(
    h(
      "div",
      { class: "grid cols-4", style: "margin-bottom:14px" },
      block("Financial", [
        ["Cash", money(company.cash), company.cash < 0 ? "bad" : void 0],
        ["Today", moneySigned(todayRevenue - todayCosts), todayRevenue - todayCosts >= 0 ? "good" : "bad"],
        ["Profit, 30 days", moneySigned(monthProfit), monthProfit >= 0 ? "good" : "bad"],
        [
          "Cashflow, 14 days",
          moneySigned(cash.balances[cash.balances.length - 1] - company.cash),
          cash.emptyOnDay !== null ? "bad" : void 0
        ]
      ]),
      block("Business", [
        ["Locations trading", String(open.length), void 0],
        ["Revenue, 30 days", moneyShort(monthRevenue), void 0],
        ["Week on week", state.dayHistory.length >= 14 ? pct(growth * 100, 1) : "\u2014", growth >= 0 ? "good" : "bad"],
        ["Your attention", attention.toFixed(2), attention < 0.8 ? "bad" : attention < 1 ? "warn" : void 0]
      ]),
      block("People", [
        ["On the payroll", String(staff.length), void 0],
        [
          "Average performance",
          staff.length ? `${Math.round(performance2)}/100` : "\u2014",
          performance2 < 45 && staff.length > 0 ? "bad" : void 0
        ],
        [
          "Morale \xB7 workload",
          staff.length ? `${Math.round(morale)} \xB7 ${Math.round(workload)}` : "\u2014",
          staff.length > 0 && (morale < 45 || workload > 80) ? "bad" : void 0
        ],
        [
          "Short of the plan",
          shortage > 0 ? `${shortage} ${shortage === 1 ? "person" : "people"}` : "nobody",
          shortage > 0 ? "bad" : "good"
        ]
      ]),
      block("Market", [
        ["Share of your markets", open.length ? pct(groupShare(state) * 100, 1) : "\u2014", void 0],
        [
          "Reputation",
          open.length ? `${Math.round(reputation)}/100` : "\u2014",
          reputation < 40 && open.length > 0 ? "bad" : void 0
        ],
        ["Rival outlets", String(rivals), void 0],
        [
          "Consumer confidence",
          String(Math.round(state.economy.confidence)),
          state.economy.confidence < 92 ? "bad" : state.economy.confidence > 108 ? "good" : void 0
        ]
      ])
    )
  );
  const left = h("div", {});
  const right = h("div", {});
  left.appendChild(
    section(
      "Daily profit",
      lineChart(state.dayHistory.slice(-45).map((d) => d.profit)),
      h("p", {
        class: "tiny muted",
        text: state.dayHistory.length === 0 ? "Nothing has been settled yet. Press play and let a day run." : `Last ${Math.min(45, state.dayHistory.length)} days. Best ${money(Math.max(...state.dayHistory.map((d) => d.profit)))}, worst ${money(Math.min(...state.dayHistory.map((d) => d.profit)))}.`
      })
    )
  );
  if (open.length > 0) {
    const panel = section("Your locations");
    const groups = groupStructure(state).filter((row2) => row2.businesses.some((b) => b.status === "open"));
    for (const group of groups) {
      const inGroup = group.businesses.filter((b) => b.status === "open");
      if (groups.length > 1 || group.division) {
        panel.appendChild(
          h("div", {
            class: "group-heading",
            text: group.division ? `${group.division.name.toUpperCase()} \u2014 ${inGroup.length} location${inGroup.length === 1 ? "" : "s"} \xB7 ${group.head ? `${group.head.name} runs it` : "nobody running it"}` : `REPORTS TO YOU \u2014 ${inGroup.length} location${inGroup.length === 1 ? "" : "s"}`
          })
        );
      }
      panel.appendChild(
        table(
          ["Business", "District", "Customers", "Revenue", "Profit", "Share"],
          inGroup.map((business) => {
            const type = businessType(business.typeId);
            const building = state.buildings.find((b) => b.id === business.buildingId);
            const profit = business.yesterday.revenue ? business.yesterday.revenue - (business.yesterday.cogs + business.yesterday.wages + business.yesterday.rent + business.yesterday.marketing + business.yesterday.otherCosts) : 0;
            return [
              h("button", {
                class: "division-link",
                text: `${type?.icon ?? ""} ${business.name}`,
                on: { click: () => ctx.go("businesses", { business: business.id }) }
              }),
              building?.address ?? "\u2014",
              count(business.today.customers),
              money(business.today.revenue),
              h("span", {
                class: profit >= 0 ? "good" : "bad",
                text: state.dayHistory.length ? moneySigned(profit) : "\u2014"
              }),
              pct(marketShare(state, business.id) * 100)
            ];
          })
        )
      );
    }
    panel.appendChild(
      h("p", {
        class: "tiny muted",
        text: "Customers and revenue are today so far; profit is yesterday\u2019s settled figure."
      })
    );
    left.appendChild(panel);
  } else {
    left.appendChild(
      section(
        "Your businesses",
        empty("You are not trading yet. Open the map, find a unit you can afford, and create your first business."),
        h(
          "div",
          { class: "btn-row" },
          h("button", { class: "btn primary", on: { click: () => ctx.go("map") } }, "Open the map")
        )
      )
    );
  }
  if (chances.length > 0) {
    const panel = section("Worth doing");
    for (const item of chances) panel.appendChild(adviceRow(item, true));
    right.appendChild(panel);
  }
  const alerts = distinctAlerts(state).slice(0, 7);
  const alertPanel = section("Alerts");
  if (alerts.length === 0) alertPanel.appendChild(empty("Nothing needs your attention."));
  for (const alert of alerts) {
    const target = alert.businessId ? () => ctx.go("businesses", { business: alert.businessId }) : () => ctx.go("reports");
    alertPanel.appendChild(
      h(
        "button",
        { class: "alert-row clickable-row", on: { click: target } },
        h("span", { class: `alert-dot ${alert.priority}` }),
        h(
          "div",
          { style: "flex:1;min-width:0;text-align:left" },
          h("div", { class: "alert-title", text: alert.title }),
          h("div", { class: "alert-detail", text: alert.detail })
        ),
        h("span", { class: "row-chevron", text: "\u203A" })
      )
    );
  }
  right.appendChild(alertPanel);
  const feed = recentNews(state, 5);
  const newsPanel = section("Latest news");
  if (feed.length === 0) {
    newsPanel.appendChild(empty("The city has not reported anything yet."));
  }
  for (const item of feed) {
    newsPanel.appendChild(
      h(
        "div",
        { class: "news-mini" },
        h("span", { class: "news-icon", text: NEWS_ICONS[item.category] }),
        h(
          "div",
          { style: "flex:1;min-width:0" },
          h("div", { class: "alert-title", text: item.headline }),
          h("div", { class: "alert-detail", text: item.body })
        )
      )
    );
  }
  newsPanel.appendChild(
    h("div", { class: "btn-row", style: "margin-top:8px" }, button("Open the newsroom", () => ctx.go("news"), "btn small ghost"))
  );
  right.appendChild(newsPanel);
  right.appendChild(
    section(
      "Balance sheet",
      stat("Cash", money(company.cash), company.cash < 0 ? "bad" : void 0),
      stat("Stock", money(inventoryValue(state))),
      stat("Property", money(propertyValue(state))),
      stat("Debt", money(-debtTotal(state)), debtTotal(state) > 0 ? "bad" : "muted"),
      stat("Net worth", money(worth), worth >= 0 ? "good" : "bad"),
      statWithHint(
        "Credit rating",
        `${Math.round(company.creditRating)}/100`,
        "What lenders think of you. Built from profitability, debt and whether you have missed payments. It decides which loans you are offered and at what rate."
      )
    )
  );
  const goalPanel = section("Goals");
  if (state.goals.length === 0) {
    goalPanel.appendChild(
      empty(
        playerBusinesses(state).some((b) => b.status === "open") ? "Nothing on the board right now. A new goal will come along within a few days." : "Open a business and the city will start setting you targets."
      )
    );
  }
  for (const goal2 of state.goals) {
    const progress = goalProgress(state, goal2);
    const now = readMetric(state, goal2.metric, goal2.businessId);
    const daysLeft = goal2.expiresOnDay - state.day;
    goalPanel.appendChild(
      h(
        "div",
        { class: "goal-row" },
        h(
          "div",
          { class: "goal-head" },
          h("span", { class: "goal-title", text: goal2.title }),
          h("span", {
            class: `tag ${daysLeft <= 3 ? "bad" : daysLeft <= 7 ? "warn" : ""}`,
            text: `${Math.max(0, daysLeft)}d left`
          })
        ),
        bar(progress, progress > 0.66 ? "good" : progress < 0.2 ? "bad" : "warn"),
        h("div", {
          class: "goal-meta",
          text: `${goalNumber(goal2.metric, now)} of ${goalNumber(goal2.metric, goal2.target)} \xB7 ${goal2.rewardText}`
        })
      )
    );
  }
  right.appendChild(goalPanel);
  right.appendChild(
    section(
      "Progression",
      stat("Tier", tier.name),
      tier.next ? stat("Next", tier.next, "muted") : stat("Next", "Top tier reached", "good"),
      bar(tier.progress, "good"),
      h("p", { class: "tiny muted", text: `${state.achievements.length} achievements unlocked \xB7 ${state.goalsCompleted} goal${state.goalsCompleted === 1 ? "" : "s"} met.` })
    )
  );
  const economyPanel = section(
    "City economy",
    statWithHint(
      "Consumer confidence",
      `${Math.round(state.economy.confidence)}`,
      "How freely the city is spending. 100 is normal. Below that people buy less and trade down to cheaper options.",
      economy.tone === "good" ? "good" : economy.tone === "bad" ? "bad" : void 0
    ),
    statWithHint(
      "Interest rate",
      pct(state.economy.interestRate * 100, 2),
      "The base rate. Loan offers are priced off it, so borrowing gets dearer as it rises."
    ),
    statWithHint(
      "Unemployment",
      pct(state.economy.unemployment * 100, 1),
      "When it is low, staff are scarce and wages rise. When it is high, applicants are cheaper but the city has less money to spend."
    ),
    statWithHint(
      "Price level",
      `${((state.economy.inflation - 1) * 100).toFixed(1)}% above day 1`,
      "Cumulative inflation. Wages, rent and wholesale prices all follow it, so a price you set months ago is quietly getting cheaper."
    )
  );
  if (state.events.length > 0) {
    for (const active of state.events) {
      const def = cityEvent(active.defId);
      if (!def) continue;
      economyPanel.appendChild(
        h(
          "div",
          { style: "margin-top:8px" },
          h("span", { class: `tag ${def.demand < 1 ? "bad" : "good"}`, text: def.name }),
          h("div", { class: "tiny muted", text: `${def.description} ${active.daysLeft} days left.` })
        )
      );
    }
  }
  right.appendChild(economyPanel);
  el.appendChild(h("div", { class: "grid cols-2" }, left, right));
  return { el };
}
function block(name, rows) {
  const el = h("div", { class: "kpi-block" }, h("div", { class: "kpi-label", text: name }));
  for (const [label, value, tone] of rows) {
    el.appendChild(
      h(
        "div",
        { class: "kpi-row" },
        h("span", { class: "kpi-row-label", text: label }),
        h("span", { class: `kpi-row-value${tone ? ` ${tone}` : ""}`, text: value })
      )
    );
  }
  return el;
}
function goalNumber(metric2, value) {
  if (metric2 === "reviewScore") return `${value.toFixed(1)}\u2605`;
  if (metric2 === "marketShare") return `${value.toFixed(1)}%`;
  if (metric2 === "cash" || metric2 === "weeklyProfit" || metric2 === "netWorth") return money(value);
  if (metric2 === "staffMorale" || metric2 === "awareness" || metric2 === "reputation") return `${Math.round(value)}/100`;
  return count(value);
}

// src/ui/views/newBusiness.ts
function typesForBuilding(building) {
  return BUSINESS_TYPES.filter(
    (type) => building.size >= type.minSize && building.suitableFor.includes(type.category)
  ).sort((a, b) => a.setupCost + a.equipmentCost - (b.setupCost + b.equipmentCost));
}
function openFoundBusinessDialog(ctx, building) {
  const state = ctx.state;
  const company = playerCompany(state);
  const options = typesForBuilding(building);
  const { body, footer, close } = modal({ title: `New business \u2014 ${building.address}`, width: 700 });
  if (options.length === 0) {
    body.appendChild(
      h("p", {
        class: "empty",
        text: `Nothing suitable fits here. The unit is ${building.size} m\xB2 and suits ${building.suitableFor.map((c) => CATEGORY_NAMES[c]).join(", ")}. Look for a larger unit or a different district.`
      })
    );
    return;
  }
  let selected = options[0];
  const detail = h("div", {});
  const nameInput = h("input", {
    type: "text",
    value: `${company.name} ${selected.name}`,
    maxlength: 40,
    placeholder: "Business name"
  });
  const list = h("div", { class: "list" });
  const renderList = () => {
    list.innerHTML = "";
    for (const type of options) {
      const total2 = type.setupCost + type.equipmentCost;
      const affordable = company.cash >= total2;
      list.appendChild(
        h(
          "div",
          {
            class: `card clickable${type.id === selected.id ? " selected" : ""}`,
            style: type.id === selected.id ? "border-color:var(--accent-2)" : "",
            on: {
              click: () => {
                selected = type;
                nameInput.value = `${company.name} ${type.name}`;
                renderList();
                renderDetail();
              }
            }
          },
          h(
            "div",
            { class: "card-head" },
            h(
              "div",
              {},
              h("div", { class: "card-title", text: `${type.icon} ${type.name}` }),
              h("div", { class: "card-sub", text: type.description })
            ),
            h("span", {
              class: `tag${affordable ? "" : " bad"}`,
              text: money(total2)
            })
          )
        )
      );
    }
  };
  const renderDetail = () => {
    detail.innerHTML = "";
    const def = district(building.district);
    const total2 = selected.setupCost + selected.equipmentCost;
    const monthlyRent = building.status === "rented" ? building.rent : 0;
    const staffCost = selected.roles.length * 2300;
    const preference = def.preferences[selected.category] ?? 1;
    const fit = preference >= 1.3 ? "Strong fit" : preference >= 0.95 ? "Reasonable fit" : "Poor fit";
    const mix = districtMix(def, selected.category);
    const leading = leadingSegment(mix);
    const basket = basketFactor(mix);
    const sensitivity = SEGMENTS.reduce(
      (acc, segment) => acc + mix[segment.id] * weightsOf(segment).priceSensitivity,
      0
    );
    detail.appendChild(
      h(
        "div",
        { class: "panel" },
        h("h3", { class: "panel-title", text: "What this costs" }),
        stat("Fit-out", money(selected.setupCost)),
        stat("Equipment", money(selected.equipmentCost)),
        stat("Total up front", money(total2), company.cash >= total2 ? "good" : "bad"),
        stat("Rent from here on", monthlyRent > 0 ? `${money(monthlyRent)}/mo` : "Owned \u2014 no rent"),
        stat("Wages once staffed", `about ${money(staffCost)}/mo`),
        stat("Cash after opening", money(company.cash - total2), company.cash - total2 > 5e3 ? void 0 : "bad")
      )
    );
    detail.appendChild(
      h(
        "div",
        { class: "panel" },
        h("h3", { class: "panel-title", text: "Location fit" }),
        stat("District", def.name),
        stat("Demand for this category", fit, preference >= 1.2 ? "good" : preference < 0.9 ? "bad" : void 0),
        stat("Foot traffic here", `${count(building.footTraffic)}/day`),
        // Footfall is only half the story. Who those people are decides what
        // they will pay and how much they will carry home, which is why a
        // convenience store on a student high street can be busy and broke.
        statWithHint(
          "Who shops here",
          leading.name,
          leading.description
        ),
        statWithHint(
          "Typical basket",
          `${basket.toFixed(2)}\xD7 the city norm`,
          "How much the people around this unit spend per visit, against the average customer in Northgate. Below one means plenty of customers and not much money.",
          basket >= 1.05 ? "good" : basket < 0.92 ? "bad" : void 0
        ),
        statWithHint(
          "Shopping on price",
          sensitivity >= 1.08 ? "Yes, heavily" : sensitivity >= 0.95 ? "Somewhat" : "Barely",
          "How hard this crowd hunts for a lower price. A price-driven crowd will walk past a better shop to save twenty cents.",
          sensitivity >= 1.08 ? "bad" : sensitivity < 0.95 ? "good" : void 0
        ),
        stat("Average income", `${money(def.averageIncome)}/yr`),
        stat("Space", `${building.size} m\xB2 (needs ${selected.minSize} m\xB2)`),
        stat("Storage", `${count(building.storageCapacity)} units`)
      )
    );
    const sells = selected.productIds.length > 0 ? selected.productIds.map((id) => product(id)?.name ?? id).join(", ") : "No stock \u2014 this is a service business.";
    detail.appendChild(
      h(
        "div",
        { class: "panel" },
        h("h3", { class: "panel-title", text: "How it runs" }),
        h("p", { class: "tiny muted", text: `Sells: ${sells}` }),
        h("p", {
          class: "tiny muted",
          text: `Roles you can hire: ${selected.roles.map((r) => role(r).name).join(", ")}.`
        }),
        h("p", {
          class: "tiny muted",
          text: `Opens ${selected.defaultOpenFrom}:00\u2013${selected.defaultOpenTo}:00. One member of staff serves about ${selected.customersPerStaffHour} customers an hour.`
        })
      )
    );
  };
  body.appendChild(h("label", { class: "field" }, h("span", { text: "Business name" }), nameInput));
  body.appendChild(h("div", { class: "grid cols-2" }, list, detail));
  renderList();
  renderDetail();
  const confirm = h(
    "button",
    {
      class: "btn primary",
      on: {
        click: () => {
          const result = foundBusiness(state, selected.id, building.id, nameInput.value);
          toast(result.message, result.ok ? "good" : "bad");
          if (!result.ok) return;
          close();
          if (result.businessId) ctx.go("businesses", { business: result.businessId });
          else ctx.refresh();
        }
      }
    },
    "Create business"
  );
  footer.appendChild(h("button", { class: "btn ghost", on: { click: close } }, "Cancel"));
  footer.appendChild(confirm);
}

// src/ui/views/mapView.ts
function mapView(ctx) {
  const el = h("div", { class: "view" });
  const panelHost = h("div", {});
  const map = new CityMap(ctx.state, persistentCamera);
  const modeRow = h("div", { class: "map-modes" });
  const legend = h("div", { class: "map-legend" });
  const setMode = (mode) => {
    map.setMode(mode);
    for (const child of Array.from(modeRow.children)) {
      const el2 = child;
      el2.className = `map-mode${el2.dataset.mode === mode ? " active" : ""}`;
    }
    renderLegend(legend, mode);
  };
  for (const mode of MAP_MODES) {
    modeRow.appendChild(
      h(
        "button",
        { class: "map-mode", data: { mode: mode.id }, on: { click: () => setMode(mode.id) } },
        mode.label
      )
    );
  }
  const checkButton = h("button", { class: "icon-btn", title: "Check the map: footprints, junctions, routes and anything wrong" }, "\u2317");
  checkButton.addEventListener("click", () => {
    const on2 = !map.getDebug();
    map.setDebug(on2);
    checkButton.classList.toggle("active", on2);
    if (!on2) return;
    const report = map.checkMap();
    toast(
      report.problems.length === 0 ? `Map checked: ${report.counts.structures} buildings, ${report.counts.nodes} junctions, no problems.` : `Map checked: ${report.problems.length} problems found.`
    );
  });
  const controls = h(
    "div",
    { class: "map-controls" },
    h("button", { class: "icon-btn", title: "Zoom in", on: { click: () => map.zoomBy(1.35) } }, "\uFF0B"),
    h("button", { class: "icon-btn", title: "Zoom out", on: { click: () => map.zoomBy(1 / 1.35) } }, "\u2212"),
    h(
      "button",
      {
        class: "icon-btn",
        title: "Back to your businesses",
        on: {
          click: () => {
            const mine = ctx.state.buildings.find((b) => b.occupantCompanyId === ctx.state.playerCompanyId);
            if (mine) map.focus(mine, 5);
            else toast("You do not have any premises yet.");
          }
        }
      },
      "\u25CE"
    ),
    checkButton
  );
  const shell2 = h("div", { class: "map-shell" }, map.canvas, modeRow, controls, legend);
  map.onSelect = (building) => {
    renderBuildingPanel(ctx, panelHost, building, map);
  };
  el.appendChild(
    h(
      "div",
      { class: "view-head" },
      h("h1", { text: "Northgate" }),
      h("p", { text: "Tap a unit to inspect it. Drag to pan, pinch or scroll to zoom." })
    )
  );
  el.appendChild(shell2);
  el.appendChild(panelHost);
  el.appendChild(districtTable(ctx));
  requestAnimationFrame(() => {
    map.resize();
    setMode("standard");
    const preselect = ctx.params.building;
    if (preselect) {
      const building = ctx.state.buildings.find((b) => b.id === preselect);
      if (building) {
        map.focus(building, 6);
        map.select(building.id);
        renderBuildingPanel(ctx, panelHost, building, map);
      }
    }
  });
  return {
    el,
    update: () => map.setState(ctx.state),
    destroy: () => map.destroy()
  };
}
var persistentCamera = { x: 0.5, y: 0.46, zoom: 1 };
function renderLegend(host, mode) {
  const def = MAP_MODES.find((m) => m.id === mode);
  host.innerHTML = "";
  host.appendChild(h("strong", { text: def?.label ?? "" }));
  host.appendChild(h("div", { class: "tiny muted", text: def?.legend ?? "" }));
  const rows = mode === "standard" || mode === "commercial" ? [
    ["#4bbf87", "Yours"],
    ["#e2686d", "Competitor"],
    ["#6f9bd0", "Available"]
  ] : [
    ["rgb(58,110,180)", "Low"],
    ["rgb(150,170,140)", "Medium"],
    ["rgb(240,80,50)", "High"]
  ];
  for (const [colour, label] of rows) {
    host.appendChild(
      h(
        "div",
        { class: "legend-row" },
        h("span", { class: "legend-swatch", style: `background:${colour}` }),
        h("span", { text: label })
      )
    );
  }
}
function renderBuildingPanel(ctx, host, building, map) {
  host.innerHTML = "";
  if (!building) return;
  const state = ctx.state;
  const def = district(building.district);
  const business = building.businessId ? state.businesses.find((b) => b.id === building.businessId) : void 0;
  const rivals = state.buildings.filter((b) => b.district === building.district && b.status === "competitor").length;
  const total2 = state.buildings.filter((b) => b.district === building.district).length;
  const competition = rivals / Math.max(1, total2);
  const competitionLabel = competition > 0.4 ? "High" : competition > 0.18 ? "Medium" : "Low";
  const isMine = building.occupantCompanyId === state.playerCompanyId;
  const suitable = building.suitableFor.map((category) => CATEGORY_NAMES[category]).join(", ");
  const actions = h("div", { class: "btn-row", style: "margin-top:12px" });
  if (building.status === "available") {
    actions.appendChild(
      button(
        `Rent \u2014 ${money(building.rent)}/mo`,
        async () => {
          const ok = await confirmDialog(
            "Sign the lease?",
            `${building.address} costs ${money(building.rent)} per month. You pay ${money(building.rent * 3)} now: the first month plus a two-month deposit.`,
            "Sign lease"
          );
          if (!ok) return;
          const result = rentBuilding(state, building.id);
          toast(result.message, result.ok ? "good" : "bad");
          if (result.ok) ctx.refresh();
        },
        "btn primary"
      )
    );
    actions.appendChild(
      button(`Buy \u2014 ${money(building.value)}`, async () => {
        const ok = await confirmDialog(
          "Buy this building?",
          `${building.address} is on the market for ${money(building.value)}. You keep the asset and pay no rent, but it is a large amount of cash.`,
          "Buy building"
        );
        if (!ok) return;
        const result = buyBuilding(state, building.id);
        toast(result.message, result.ok ? "good" : "bad");
        if (result.ok) ctx.refresh();
      })
    );
  }
  if (isMine && !business) {
    actions.appendChild(
      button(
        "Create a business here",
        () => openFoundBusinessDialog(ctx, building),
        "btn primary"
      )
    );
    if (building.status === "rented") {
      actions.appendChild(
        button("End lease", async () => {
          const ok = await confirmDialog("End the lease?", `You get ${money(building.rent * 1.5)} of the deposit back.`, "End lease");
          if (!ok) return;
          const result = endLease(state, building.id);
          toast(result.message, result.ok ? "good" : "bad");
          if (result.ok) ctx.refresh();
        }, "btn ghost")
      );
    }
    if (building.status === "owned") {
      actions.appendChild(
        button("Sell building", async () => {
          const ok = await confirmDialog(
            "Sell this building?",
            `You would receive about ${money(Math.round(building.value * 0.94))} after agent fees.`,
            "Sell"
          );
          if (!ok) return;
          const result = sellBuilding(state, building.id);
          toast(result.message, result.ok ? "good" : "bad");
          if (result.ok) ctx.refresh();
        }, "btn ghost")
      );
    }
  }
  if (isMine && building.condition < 97 && building.renovationEndsOnDay === null) {
    actions.appendChild(
      button(`Renovate \u2014 ${money(renovationCost(building))}`, async () => {
        const ok = await confirmDialog(
          "Start renovation?",
          `Six days of work brings ${building.address} back to full condition. Customers notice a tired unit.`,
          "Start work"
        );
        if (!ok) return;
        const result = renovate(state, building.id);
        toast(result.message, result.ok ? "good" : "bad");
        if (result.ok) ctx.refresh();
      })
    );
  }
  if (business && business.companyId === state.playerCompanyId) {
    actions.appendChild(button("Manage business", () => ctx.go("businesses", { business: business.id }), "btn primary"));
  }
  actions.appendChild(
    button("Focus on map", () => {
      map.focus(building, 6);
      map.select(building.id);
    }, "btn ghost")
  );
  const statusTag = building.occupantCompanyId === state.playerCompanyId ? h("span", { class: "tag good", text: building.status === "owned" ? "Owned" : "Leased" }) : building.status === "competitor" ? h("span", { class: "tag bad", text: "Competitor" }) : h("span", { class: "tag accent", text: "Available" });
  const panel = section(
    "Building",
    h(
      "div",
      { class: "card-head" },
      h(
        "div",
        {},
        h("div", { class: "card-title", text: building.address }),
        h("div", { class: "card-sub", text: `${def.name} \xB7 ${building.size} m\xB2 \xB7 ${building.floors} floor${building.floors > 1 ? "s" : ""}` })
      ),
      statusTag
    ),
    h(
      "div",
      { class: "grid cols-2" },
      h(
        "div",
        {},
        stat("Rent", `${money(building.rent)}/mo`),
        stat("Purchase price", money(building.value)),
        stat("Condition", `${Math.round(building.condition)}/100`, building.condition < 50 ? "bad" : void 0),
        stat("Storage", `${count(building.storageCapacity)} units`),
        stat("Customer capacity", count(building.customerCapacity)),
        stat("Parking", count(building.parking))
      ),
      h(
        "div",
        {},
        stat("Foot traffic", `${count(building.footTraffic)}/day`),
        stat("Average income", `${money(def.averageIncome)}/yr`),
        stat("District population", count(def.population)),
        stat("Competition", competitionLabel, competition > 0.4 ? "bad" : void 0),
        stat("Growth", pct(def.growth * 100, 1)),
        stat("Suitable for", suitable || "\u2014")
      )
    ),
    business ? h("p", {
      class: "tiny muted",
      text: business.companyId === state.playerCompanyId ? `Your business "${business.name}" trades here.` : `Occupied by ${state.companies.find((c) => c.id === business.companyId)?.name ?? "a competitor"}.`
    }) : null,
    building.renovationEndsOnDay !== null ? h("p", { class: "tiny muted", text: `Renovation finishes on day ${building.renovationEndsOnDay}.` }) : null,
    h("p", { class: "tiny muted", text: def.description }),
    actions
  );
  host.appendChild(panel);
}
function districtTable(ctx) {
  const state = ctx.state;
  const rows = [...state.buildings.reduce((acc, building) => {
    const entry = acc.get(building.district) ?? { available: 0, competitors: 0, mine: 0, rent: 0, count: 0 };
    entry.count += 1;
    entry.rent += building.rent;
    if (building.status === "available") entry.available += 1;
    if (building.status === "competitor") entry.competitors += 1;
    if (building.occupantCompanyId === state.playerCompanyId) entry.mine += 1;
    acc.set(building.district, entry);
    return acc;
  }, /* @__PURE__ */ new Map())];
  return section(
    "Districts",
    table(
      ["District", "Population", "Income", "Foot traffic", "Avg rent", "Free units", "Rivals", "Yours"],
      rows.map(([id, entry]) => {
        const def = district(id);
        const row2 = [
          def.name,
          count(def.population),
          moneyShort(def.averageIncome),
          count(def.footTraffic),
          money(entry.rent / Math.max(1, entry.count)),
          String(entry.available),
          String(entry.competitors),
          entry.mine > 0 ? h("span", { class: "tag good", text: String(entry.mine) }) : "\u2014"
        ];
        return row2;
      })
    ),
    h("p", {
      class: "tiny muted",
      text: "Cheap rent usually means low foot traffic. The trick is finding the district where what you sell matches what people there can afford."
    }),
    rows.length === 0 ? empty("No districts loaded.") : null
  );
}

// src/ui/views/progress.ts
function progressView(ctx) {
  const el = h("div", { class: "view" });
  const render = () => {
    el.replaceChildren();
    const state = ctx.state;
    const level = levelOf(state);
    const next = nextLevel(state);
    const step = nextStep(state);
    const stepPanel = h(
      "section",
      { class: "panel next-step" },
      h("div", { class: "next-step-label", text: "YOUR NEXT STEP" }),
      h("h2", { class: "next-step-title", text: step.title }),
      h("p", { class: "next-step-why", text: step.why }),
      bar(step.progress, step.progress > 0.66 ? "good" : ""),
      h(
        "div",
        { class: "next-step-foot" },
        h("span", { class: "next-step-reward", text: `Reward: ${step.reward}` }),
        h(
          "button",
          { class: "btn primary", on: { click: () => ctx.go(step.view) } },
          "Take me there"
        )
      )
    );
    el.appendChild(stepPanel);
    const cap = locationCap(state);
    const everReached = unlockedLevel(state);
    const levelPanel = section(
      `Level ${level.n} \u2014 ${level.name}`,
      h("p", { class: "muted", text: level.blurb }),
      next ? h(
        "div",
        {},
        h("div", { class: "sub", text: `Towards ${next.name}` }),
        bar(levelProgress(state)),
        h(
          "div",
          { class: "grid cols-2" },
          ...measures(state, next).map(
            (row2) => h(
              "div",
              { class: "measure" },
              stat(row2.label, `${row2.format(row2.now)} of ${row2.format(row2.need)}`, row2.now >= row2.need ? "good" : void 0),
              bar(row2.progress, row2.now >= row2.need ? "good" : "")
            )
          )
        )
      ) : h("p", { class: "good", text: "Top of the ladder. There is nothing above this." }),
      h("div", { class: "sub", text: "What this level lets you do" }),
      h("ul", { class: "unlock-list" }, ...level.unlocks.map((text) => h("li", { text }))),
      stat("Locations you may run", cap === Infinity ? "No limit" : String(cap)),
      everReached > level.n ? h("p", {
        class: "sub",
        text: `You have been a ${LEVELS[everReached - 1].name.toLowerCase()}, and nothing you unlocked has been taken away \u2014 but on today's figures the company is back at ${level.name.toLowerCase()}.`
      }) : null
    );
    el.appendChild(levelPanel);
    const binding = bindingMeasure(state);
    if (binding && next) {
      el.appendChild(
        section(
          "What is holding you back",
          h("p", {
            text: `${binding.label}: ${binding.format(binding.now)}. A ${next.name.toLowerCase()} needs ${binding.format(binding.need)}.`
          }),
          bar(binding.progress)
        )
      );
    }
    const ladder = h("div", { class: "ladder" });
    for (const def of LEVELS) {
      const reached = def.n <= level.n;
      ladder.appendChild(
        h(
          "div",
          { class: `ladder-row${reached ? " reached" : ""}${def.n === level.n ? " current" : ""}` },
          h("div", { class: "ladder-n", text: String(def.n) }),
          h(
            "div",
            {},
            h("div", { class: "ladder-name", text: def.name }),
            h("div", { class: "sub", text: def.unlocks.join(" \xB7 ") }),
            def.n > level.n ? h("div", {
              class: "sub muted",
              text: `Needs ${money(def.requires.netWorth)}, ${def.requires.locations} locations, ${def.requires.headcount} staff, ${money(def.requires.monthlyProfit)} a month`
            }) : null
          )
        )
      );
    }
    el.appendChild(section("The ladder", ladder));
    const goals = state.goals;
    el.appendChild(
      section(
        "Current objectives",
        goals.length === 0 ? empty("Nothing on the board. New objectives appear as the company changes.") : h(
          "div",
          {},
          ...goals.map(
            (goal2) => h(
              "div",
              { class: "measure" },
              stat(goal2.title, goal2.rewardText),
              h("div", { class: "sub", text: goal2.detail }),
              bar(goalProgress(state, goal2))
            )
          )
        )
      )
    );
    const earned = new Set(state.achievements.map((a) => a.id));
    el.appendChild(
      section(
        `Achievements \u2014 ${earned.size} of ${ACHIEVEMENTS.length}`,
        h(
          "div",
          { class: "grid cols-2" },
          ...ACHIEVEMENTS.map(
            (achievement) => h(
              "div",
              { class: `award${earned.has(achievement.id) ? " earned" : ""}` },
              h("div", { class: "award-name", text: achievement.name }),
              h("div", { class: "sub", text: achievement.description })
            )
          )
        )
      )
    );
  };
  function signature() {
    const state = ctx.state;
    return `${state.day}|${state.levelReached}|${state.goals.length}|${state.goalsCompleted}|${state.achievements.length}`;
  }
  render();
  let shown = signature();
  return {
    el,
    update: () => {
      const now = signature();
      if (now === shown) return;
      shown = now;
      keepingScroll(render);
    }
  };
}

// src/ui/views/headOffice.ts
function headOfficeView(ctx) {
  const el = h("div", { class: "view" });
  const render = () => {
    el.replaceChildren();
    const state = ctx.state;
    const hq = state.headOffice;
    el.appendChild(
      h(
        "div",
        { class: "view-head" },
        h("h1", { text: hq ? hq.name : "Head office" }),
        h("p", {
          text: hq ? "Personnel, the books, the brand and the systems, run once for the whole company." : "Three shops do not need three personnel departments. This is where you stop paying for that."
        })
      )
    );
    if (!hq) {
      renderOpening(ctx, el);
      return;
    }
    const building = buildingById(state, hq.buildingId);
    const staff = centralStaff(state);
    const states = functionStates(state);
    const locations = playerBusinesses(state).filter((b) => b.status === "open").length;
    const floor = hqLevel(state);
    const next = nextHqLevel(state);
    el.appendChild(
      section(
        "Overview",
        h(
          "div",
          { class: "grid cols-4" },
          stat("Address", building?.address ?? "\u2014"),
          stat("Desks", `${staff.length} of ${floor.desks} taken`, staff.length >= floor.desks ? "bad" : void 0),
          stat("Supporting", `${locations} location${locations === 1 ? "" : "s"}`),
          stat("Standing cost", `${money(overheadBill(state) + outsourcingBill(state))}/mo`)
        )
      )
    );
    const floors = section("How much head office there is");
    const strip = h("div", { class: "scale-strip" });
    for (const step of HQ_LEVELS) {
      strip.appendChild(
        h(
          "div",
          { class: `scale-step${step.n === floor.n ? " here" : ""}${step.n <= floor.n ? " reached" : ""}` },
          h("span", { class: "scale-name", text: step.name }),
          h("span", { class: "scale-from", text: `${step.desks} desks` }),
          h("span", { class: "scale-bar" })
        )
      );
    }
    floors.appendChild(strip);
    floors.appendChild(
      h("p", {
        class: "tiny muted",
        style: "margin:8px 0 0",
        text: next ? `${floor.detail} A ${next.name.toLowerCase()} costs ${money(next.upgrade)} to fit out and ${money(next.running)} a month to run \u2014 for ${next.desks} desks, ${Math.round((next.reach - 1) * 100)}% more out of the same people, and systems up to tier ${next.automationCap}.` : `${floor.detail} There is nothing above this.`
      })
    );
    if (next) {
      floors.appendChild(
        h(
          "div",
          { class: "btn-row" },
          button(
            `Fit out a ${next.name.toLowerCase()} \u2014 ${money(next.upgrade)}`,
            () => {
              const result = upgradeHeadOffice(state);
              toast(result.message, result.ok ? "good" : "bad");
              keepingScroll(render);
            },
            playerCompany(state).cash >= next.upgrade ? "btn primary" : "btn"
          )
        )
      );
    }
    el.appendChild(floors);
    const stance = stanceOf(state);
    const decides = section("Who decides");
    decides.appendChild(
      h("p", {
        class: "sub",
        style: "margin:-4px 0 10px",
        text: "There is no right answer to this and the game will not suggest one. The centre is cheaper and more consistent; the shops read their own street better. You cannot have both."
      })
    );
    for (const option of STANCES) {
      const chosen = option.id === stance.id;
      decides.appendChild(
        h(
          "button",
          {
            class: `stance-card${chosen ? " chosen" : ""}`,
            on: {
              click: () => {
                if (chosen) return;
                const result = setStance(state, option.id);
                toast(result.message, result.ok ? "good" : "bad");
                keepingScroll(render);
              }
            }
          },
          h(
            "div",
            { class: "stance-head" },
            h("span", { class: "stance-name", text: option.name }),
            h("span", { class: "stance-tag", text: chosen ? "current" : "switch to this" })
          ),
          h("div", { class: "sub", text: option.detail }),
          h("div", {
            class: "tiny muted",
            text: `Central functions worth ${Math.round(option.central * 100)}% \xB7 coordination bill ${Math.round(option.coordination * 100)}% \xB7 every shop reads its own street at ${Math.round(option.local * 100)}%`
          })
        )
      );
    }
    el.appendChild(decides);
    const panel = section("Central functions");
    for (const row2 of states) {
      const { def } = row2;
      const inHouse = row2.people.length;
      panel.appendChild(
        h(
          "div",
          { class: "function-row" },
          h(
            "div",
            { class: "function-main" },
            h(
              "div",
              { class: "function-head" },
              h("span", { class: "function-name", text: def.name }),
              h("span", {
                class: "tag",
                text: `systems: ${AUTOMATION_TIERS[row2.automation].name.toLowerCase()}`
              }),
              h("span", {
                class: `function-cover ${row2.cover >= 0.99 ? "good" : row2.cover <= 0 ? "bad" : ""}`,
                text: row2.cover <= 0 ? "not covered" : `${Math.round(row2.cover * 100)}% covered`
              })
            ),
            h("div", { class: "sub", text: def.detail }),
            bar(row2.cover, row2.cover >= 0.99 ? "good" : row2.cover <= 0 ? "bad" : ""),
            h("div", {
              class: row2.cover > 0 ? "function-says" : "sub muted",
              text: row2.cover > 0 ? `${def.says} \u2014 at ${Math.round(row2.cover * 100)}% of that.` : def.says
            }),
            h("div", {
              class: "sub",
              text: row2.outsourced ? `Bought in for ${money(row2.cost)} a month. A supplier is never as good as somebody who works here.` : `${inHouse} of ${coverNeeded(state, def)} ${def.role === "accountant" ? "accountants" : `${def.name.toLowerCase()} people`} needed at this size \xB7 ${money(row2.cost)}/mo in wages`
            })
          ),
          h(
            "div",
            { class: "function-actions" },
            button(
              row2.outsourced ? "Bring back in house" : `Buy it in \u2014 ${money(outsourceCost(state, def))}/mo`,
              () => {
                const result = setOutsourced(state, def.id, !row2.outsourced);
                toast(result.message, result.ok ? "good" : "bad");
                keepingScroll(render);
              },
              "btn small"
            ),
            // Systems are the third way to cover a function: they never notice
            // anything, and they never hand in their notice either.
            AUTOMATION_TIERS[row2.automation + 1] ? button(
              `${AUTOMATION_TIERS[row2.automation + 1].name} systems \u2014 ${money(AUTOMATION_TIERS[row2.automation + 1].cost)}`,
              () => {
                const result = investInAutomation(state, def.id);
                toast(result.message, result.ok ? "good" : "bad");
                keepingScroll(render);
              },
              canAutomate(state, def.id).ok ? "btn small primary" : "btn small"
            ) : h("span", { class: "tiny muted", text: "fully automated" })
          )
        )
      );
    }
    el.appendChild(panel);
    el.appendChild(
      section(
        "Who works here",
        staff.length === 0 ? empty("Nobody yet. Take somebody on below, or buy a function in and pay a supplier instead.") : table(
          ["Name", "Function", "Fit", "Performance", "Salary"],
          staff.map((person) => [
            person.name,
            FUNCTIONS.find((f) => f.role === person.role)?.name ?? person.role,
            `${Math.round(roleFit(person.skills, person.role))}/100`,
            `${Math.round(performanceOf(person))}%`,
            `${money(person.salary)}/mo`
          ])
        )
      )
    );
    const central = new Set(FUNCTIONS.map((f) => f.role));
    const applicants = state.applicants.filter((a) => central.has(a.role));
    el.appendChild(
      section(
        "Available centrally",
        applicants.length === 0 ? empty("Nobody suitable is looking this week. The pool turns over daily.") : table(
          ["Name", "Function", "Fit", "Salary", ""],
          applicants.map((person) => [
            person.name,
            FUNCTIONS.find((f) => f.role === person.role)?.name ?? person.role,
            `${Math.round(roleFit(person.skills, person.role))}/100`,
            `${money(person.salary)}/mo`,
            button(
              "Take on",
              () => {
                const result = hireToHeadOffice(state, person.id);
                toast(result.message, result.ok ? "good" : "bad");
                ctx.refresh();
              },
              "btn small primary"
            )
          ])
        )
      )
    );
    el.appendChild(
      section(
        "Close the head office",
        h("p", {
          class: "sub",
          text: "Everything it does centrally goes back to being done in the shops, or not at all. Move or let go of the people here first."
        }),
        button(
          "Close it",
          () => {
            const result = closeHeadOffice(state);
            toast(result.message, result.ok ? "good" : "bad");
            ctx.refresh();
          },
          "btn danger"
        )
      )
    );
  };
  const signature = () => {
    const state = ctx.state;
    const hq = state.headOffice;
    return [
      state.day,
      hq?.id ?? "",
      hq?.level ?? 0,
      hq?.stance ?? "",
      hq ? FUNCTIONS.map((f) => hq.automation[f.id] ?? 0).join("") : "",
      centralStaff(state).length,
      outsourcingBill(state),
      state.applicants.length
    ].join("|");
  };
  render();
  let shown = signature();
  return {
    el,
    update: () => {
      const now = signature();
      if (now === shown) return;
      shown = now;
      keepingScroll(render);
    }
  };
}
function renderOpening(ctx, el) {
  const state = ctx.state;
  const held = state.buildings.filter(
    (building) => building.occupantCompanyId === state.playerCompanyId && !building.businessId && !state.warehouses.some((w) => w.buildingId === building.id)
  );
  el.appendChild(
    section(
      "What a head office is for",
      h(
        "div",
        {},
        ...FUNCTIONS.map(
          (def) => h(
            "div",
            { class: "finding" },
            h("span", { class: "finding-dot good" }),
            h(
              "div",
              { style: "flex:1;min-width:0" },
              h("div", { class: "finding-title", text: def.name }),
              h("div", { class: "sub", text: `${def.detail} ${def.says}.` })
            )
          )
        )
      ),
      h("p", {
        class: "sub",
        text: `Cover is measured against how many shops you run, and not in proportion \u2014 six shops need three HR people, not six. Fitting out a head office costs ${money(HQ_FIT_OUT)} on top of the lease.`
      })
    )
  );
  if (held.length === 0) {
    el.appendChild(
      section(
        "You need a unit for it",
        h("p", { text: "Take a lease on somewhere with nothing trading in it, then come back here." }),
        button("Find a unit", () => ctx.go("property"), "btn primary")
      )
    );
    return;
  }
  let chosen = held[0].id;
  const picker = select(
    held.map((building) => ({ value: building.id, label: `${building.address} \u2014 ${money(building.rent)}/mo` })),
    chosen,
    (value) => {
      chosen = value;
    }
  );
  const company = playerCompany(state);
  const affordable = company.cash >= HQ_FIT_OUT;
  el.appendChild(
    section(
      "Open one",
      h("label", { class: "field" }, h("span", { text: "In which unit" }), picker),
      h("p", {
        class: affordable ? "sub" : "bad",
        text: affordable ? `Fit-out costs ${money(HQ_FIT_OUT)}. You have ${money(company.cash)}.` : `Fit-out costs ${money(HQ_FIT_OUT)} and you have ${money(company.cash)}.`
      }),
      button(
        "Open the head office",
        () => {
          const check = canOpenHeadOffice(state, chosen);
          if (!check.ok) {
            toast(check.message, "bad");
            return;
          }
          const result = openHeadOffice(state, chosen, `${company.name} Head Office`);
          toast(result.message, result.ok ? "good" : "bad");
          ctx.refresh();
        },
        affordable ? "btn primary" : "btn"
      )
    )
  );
}

// src/sim/acquisitions.ts
var APPROACH_COOLDOWN = 21;
var RESERVE = {
  lowcost: 1.05,
  premium: 1.35,
  aggressive: 1.25,
  conservative: 1.12,
  marketer: 1.18,
  quality: 1.32,
  opportunist: 0.98
};
function valueBusiness(state, business) {
  const type = businessTypeOrThrow(business.typeId);
  const building = buildingById(state, business.buildingId);
  const history = business.profitHistory.slice(-30);
  const dailyProfit = history.length > 0 ? sum(history, (p2) => p2) / history.length : 0;
  const annualProfit = dailyProfit * 360;
  const multiple = 2 + clamp(business.reputation / 100, 0, 1) * 1.2;
  const goodwill = Math.max(0, annualProfit * multiple) * clamp(history.length / 21, 0.25, 1);
  const age = Math.max(0, state.day - business.openedOnDay);
  const fixtures = (type.setupCost + type.equipmentCost) * clamp(1 - age / 1800, 0.35, 1);
  const stock = sum(Object.entries(business.stock), ([productId, units]) => {
    const def = product(productId);
    const cost = business.costBasis[productId] ?? def?.wholesalePrice ?? 0;
    return units * cost;
  });
  const premises = building ? building.status === "owned" && building.occupantCompanyId === business.companyId ? building.value : building.rent * 2 : 0;
  const fair = Math.round(goodwill + fixtures + stock + premises);
  return { goodwill, fixtures, stock, premises, fair, annualProfit, history: history.length };
}
function approachStatus(state, businessId) {
  const business = businessById(state, businessId);
  if (!business) return null;
  if (business.companyId === state.playerCompanyId) return null;
  const seller = state.companies.find((c) => c.id === business.companyId);
  const valuation = valueBusiness(state, business);
  const personality = seller?.personality ?? "conservative";
  const reserve = Math.round(valuation.fair * RESERVE[personality]);
  const refusedOn = state.approaches[businessId];
  const listensAgainOnDay = typeof refusedOn === "number" ? refusedOn + APPROACH_COOLDOWN : null;
  let blocked = null;
  if (business.status !== "open") blocked = "That business is not trading.";
  else if (listensAgainOnDay !== null && state.day < listensAgainOnDay) {
    blocked = `They turned you down on day ${refusedOn}. They will not talk again until day ${listensAgainOnDay}.`;
  }
  return { valuation, reserve, blocked, listensAgainOnDay };
}
function makeOffer2(state, businessId, amount) {
  const business = businessById(state, businessId);
  if (!business) return { ok: false, accepted: false, message: "That business no longer exists." };
  const status = approachStatus(state, businessId);
  if (!status) return { ok: false, accepted: false, message: "You already own that." };
  if (status.blocked) return { ok: false, accepted: false, message: status.blocked };
  const company = playerCompany(state);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, accepted: false, message: "Name a figure first." };
  }
  if (company.cash < amount) {
    return { ok: false, accepted: false, message: `You have ${money(company.cash)}. Borrow the difference or offer less.` };
  }
  const seller = state.companies.find((c) => c.id === business.companyId);
  const recent = business.profitHistory.slice(-14);
  const dailyProfit = recent.length > 0 ? sum(recent, (p2) => p2) / recent.length : 0;
  const distress = dailyProfit < 0 ? clamp(0.88 + dailyProfit / 400, 0.7, 0.95) : 1;
  const threshold = status.reserve * distress * negotiationFactor(state) * gameRng.range(0.97, 1.05);
  if (amount < threshold) {
    state.approaches[businessId] = state.day;
    pushNews(state, "competitor", `${seller?.name ?? "The owner"} turned down your offer`, `You offered ${money(amount)} for ${business.name}. They want more, and they will not talk again for ${APPROACH_COOLDOWN} days.`, {
      importance: "normal"
    });
    return {
      ok: true,
      accepted: false,
      message: `${seller?.name ?? "They"} rejected ${money(amount)}. They will not listen again until day ${state.day + APPROACH_COOLDOWN}.`
    };
  }
  learn(state, "acquired");
  transferBusiness(state, business, seller ?? null, amount);
  return {
    ok: true,
    accepted: true,
    message: `${business.name} is yours for ${money(amount)}. The staff and the stock came with it.`
  };
}
function transferBusiness(state, business, seller, amount) {
  const company = playerCompany(state);
  const type = businessTypeOrThrow(business.typeId);
  const building = buildingById(state, business.buildingId);
  if (amount > 0) {
    post(state, company.id, "property", `Acquisition \u2014 ${business.name}`, -amount, business.id);
    if (seller) seller.cash += amount;
  }
  business.companyId = company.id;
  business.reputation = clamp(business.reputation - 6, 0, 100);
  business.awareness = clamp(business.awareness - 8, 0, 100);
  business.autoRestock = true;
  if (building) {
    building.occupantCompanyId = company.id;
    if (building.status === "competitor") building.status = "rented";
  }
  if (business.employeeIds.length === 0) {
    const headcount = Math.max(1, Math.min(type.roles.length, 3));
    for (let i = 0; i < headcount; i += 1) {
      const person = generateApplicant(state, type.roles[i % type.roles.length]);
      person.businessId = business.id;
      person.companyId = company.id;
      person.hiredOnDay = state.day;
      person.lastRecognisedOnDay = state.day;
      person.loyalty = clamp(person.loyalty - 15, 0, 100);
      person.morale = clamp(person.morale - 10, 0, 100);
      state.employees.push(person);
      business.employeeIds.push(person.id);
    }
  }
  if (type.productIds.length > 0 && sum(Object.values(business.stock), (u) => u) <= 0) {
    for (const productId of type.productIds) {
      const def = product(productId);
      if (!def) continue;
      business.stock[productId] = 40;
      business.costBasis[productId] = def.wholesalePrice;
      business.reorderPoints[productId] = 15;
    }
  }
  const team = business.employeeIds.map((id) => state.employees.find((e) => e.id === id)).filter(Boolean).map((e) => `${e?.name} (${role(e.role).name})`).join(", ");
  pushNews(state, "company", `You have bought ${business.name}`, `${money(amount)} to ${seller?.name ?? "the previous owner"}. The lease, the fittings and the team came with it${team ? `: ${team}` : ""}.`, {
    businessId: business.id,
    importance: "high"
  });
  pushAlert(
    state,
    "info",
    `${business.name} is yours`,
    "Check the pricing and the staffing \u2014 you have inherited whatever the last owner was doing.",
    business.id
  );
}
var GROUP_PREMIUM = 1.18;
function valueCompany(state, companyId) {
  const company = state.companies.find((c) => c.id === companyId);
  if (!company || company.isPlayer) return null;
  const businesses = state.businesses.filter((b) => b.companyId === companyId && b.status === "open");
  const parts = sum(businesses, (business) => valueBusiness(state, business).fair);
  const fair = Math.round(parts * (businesses.length > 1 ? GROUP_PREMIUM : 1));
  const reserve = Math.round(fair * RESERVE[company.personality ?? "conservative"]);
  let blocked = null;
  if (businesses.length === 0) blocked = "They have nothing trading.";
  else if (businesses.length < 2) blocked = "One location is not a company. Make an offer for the shop itself.";
  else {
    const refusedOn = state.approaches[companyId];
    if (typeof refusedOn === "number" && state.day < refusedOn + APPROACH_COOLDOWN) {
      blocked = `They turned you down on day ${refusedOn}. They will not talk again until day ${refusedOn + APPROACH_COOLDOWN}.`;
    }
  }
  return { company, businesses, parts, fair, reserve, blocked };
}
function companyTargets(state) {
  return state.companies.filter((company) => !company.isPlayer).map((company) => valueCompany(state, company.id)).filter((row2) => row2 !== null && row2.businesses.length > 1).sort((a, b) => a.fair - b.fair);
}
function makeCompanyOffer(state, companyId, amount) {
  const valuation = valueCompany(state, companyId);
  if (!valuation) return { ok: false, accepted: false, message: "No such company." };
  if (valuation.blocked) return { ok: false, accepted: false, message: valuation.blocked };
  const buyer = playerCompany(state);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, accepted: false, message: "Name a figure first." };
  }
  if (buyer.cash < amount) {
    return { ok: false, accepted: false, message: `You have ${money(buyer.cash)}. Borrow the difference or offer less.` };
  }
  const daily = sum(valuation.businesses, (business) => {
    const recent = business.profitHistory.slice(-14);
    return recent.length > 0 ? sum(recent, (p2) => p2) / recent.length : 0;
  });
  const distress = daily < 0 ? clamp(0.88 + daily / 1600, 0.68, 0.95) : 1;
  const threshold = valuation.reserve * distress * negotiationFactor(state) * gameRng.range(0.97, 1.05);
  if (amount < threshold) {
    state.approaches[companyId] = state.day;
    pushNews(state, "competitor", `${valuation.company.name} is not for sale at that price`, `You offered ${money(amount)} for the whole company. They will not talk again for ${APPROACH_COOLDOWN} days.`, {
      importance: "normal"
    });
    return {
      ok: true,
      accepted: false,
      message: `${valuation.company.name} rejected ${money(amount)}. They will not listen again until day ${state.day + APPROACH_COOLDOWN}.`
    };
  }
  learn(state, "acquired", 3);
  const division = createDivision(state, valuation.company.name, valuation.company.name);
  post(state, buyer.id, "property", `Acquisition \u2014 ${valuation.company.name}`, -amount, null);
  valuation.company.cash += amount;
  for (const business of valuation.businesses) {
    transferBusiness(state, business, null, 0);
    business.divisionId = division.id;
  }
  pushNews(
    state,
    "company",
    `You have bought ${valuation.company.name}`,
    `${money(amount)} for ${valuation.businesses.length} locations, their leases, their stock and their people. They stay together as a division \u2014 put somebody senior over it before it drifts.`,
    { importance: "high" }
  );
  pushAlert(
    state,
    "warning",
    `${division.name} needs somebody running it`,
    `${valuation.businesses.length} locations have just landed on your desk. A Senior Manager or an Executive can take them off it.`,
    null,
    "holding"
  );
  return {
    ok: true,
    accepted: true,
    message: `${valuation.company.name} is yours for ${money(amount)}. ${valuation.businesses.length} locations, kept together as a division.`
  };
}
function acquisitionTargets(state, limit = 12) {
  const mine = playerBusinesses(state);
  const myDistricts = new Set(
    mine.map((b) => buildingById(state, b.buildingId)?.district).filter(Boolean)
  );
  return state.businesses.filter((b) => b.companyId !== state.playerCompanyId && b.status === "open").map((business) => ({ business, valuation: valueBusiness(state, business) })).sort((a, b) => {
    const aNear = myDistricts.has(buildingById(state, a.business.buildingId)?.district ?? "downtown") ? 1 : 0;
    const bNear = myDistricts.has(buildingById(state, b.business.buildingId)?.district ?? "downtown") ? 1 : 0;
    if (aNear !== bNear) return bNear - aNear;
    return a.valuation.fair - b.valuation.fair;
  }).slice(0, limit);
}

// src/ui/views/holding.ts
function holdingView(ctx) {
  const el = h("div", { class: "view" });
  const render = () => {
    el.replaceChildren();
    const state = ctx.state;
    const company = playerCompany(state);
    const attention = ownerAttention(state);
    const trading = playerBusinesses(state).filter((b) => b.status !== "closed");
    el.appendChild(
      h(
        "div",
        { class: "view-head" },
        h("h1", { text: company.name }),
        h("p", {
          text: `${trading.length} location${trading.length === 1 ? "" : "s"} \xB7 ${state.divisions.length} division${state.divisions.length === 1 ? "" : "s"} \xB7 ${state.employees.length} people`
        })
      )
    );
    const attentionPanel = section("What you can actually keep an eye on");
    attentionPanel.appendChild(bar(attention, attention >= 1 ? "good" : attention > 0.75 ? "warn" : "bad"));
    attentionPanel.appendChild(
      h("p", {
        class: attention >= 1 ? "sub" : "warn",
        style: "margin:8px 0 0",
        text: attention >= 1 ? `Comfortable. You carry about ${attentionSpan(state).toFixed(
          1
        )} locations before anything starts slipping, and you are inside that.` : `Stretched. You carry about ${attentionSpan(state).toFixed(
          1
        )} locations; past that everything still happens and every location pays about ${Math.round(
          (attentionFactor(state) - 1) * 100
        )}% more in coordination for the privilege. Putting somebody senior over a group is the only thing that fixes it.`
      })
    );
    const delegated = state.divisions.filter((division) => division.headEmployeeId !== null).reduce((total2, division) => total2 + divisionBusinesses(state, division.id).filter((b) => b.status !== "closed").length, 0);
    attentionPanel.appendChild(
      h(
        "div",
        { class: "grid cols-3", style: "margin-top:12px" },
        stat("Reporting to you directly", String(unassignedBusinesses(state).filter((b) => b.status !== "closed").length)),
        stat("Run by somebody else", String(delegated), delegated > 0 ? "good" : "muted"),
        stat("Location ceiling", locationCap(state) === Infinity ? "no limit" : `${trading.length} of ${locationCap(state)}`)
      )
    );
    el.appendChild(attentionPanel);
    const structure = section("The structure");
    const rows = groupStructure(state);
    if (rows.length === 0) {
      structure.appendChild(empty("Nothing trading yet. Open a business and it will appear here."));
    }
    for (const row2 of rows) {
      const head = row2.division ? divisionHead(state, row2.division) : null;
      const card = h("div", { class: "division-card" });
      card.appendChild(
        h(
          "div",
          { class: "division-head" },
          h("span", { class: "division-name", text: row2.division ? row2.division.name : "Reports to you directly" }),
          h("span", {
            class: `division-lead ${head ? "good" : row2.division ? "bad" : "muted"}`,
            text: head ? `${head.name} \xB7 ${titleOf(head)} \xB7 covers ${gradeOf(head).span}` : row2.division ? "nobody running it" : `${row2.businesses.length} on your own desk`
          })
        )
      );
      card.appendChild(
        h("div", {
          class: "sub",
          text: `${row2.businesses.length} location${row2.businesses.length === 1 ? "" : "s"} \xB7 ${row2.headcount} people \xB7 ${money(
            row2.revenue
          )} revenue yesterday \xB7 ${moneySigned(row2.profit)} profit`
        })
      );
      for (const business of row2.businesses) {
        const building = buildingById(state, business.buildingId);
        const type = businessTypeOrThrow(business.typeId);
        card.appendChild(
          h(
            "div",
            { class: "division-row" },
            h(
              "button",
              {
                class: "division-link",
                on: { click: () => ctx.go("businesses", { business: business.id }) }
              },
              `${type.icon} ${business.name}`
            ),
            h("span", { class: "sub", text: building ? district(building.district).name : "\u2014" }),
            // Moving a location between groups is a reorganisation, and it is
            // the same act whichever direction it goes in.
            select(
              [
                { value: "", label: "Reports to you" },
                ...state.divisions.map((d) => ({ value: d.id, label: d.name }))
              ],
              business.divisionId ?? "",
              (value) => {
                const result = assignToDivision(state, business.id, value || null);
                toast(result.message, result.ok ? "good" : "bad");
                keepingScroll(render);
              }
            )
          )
        );
      }
      if (row2.division) {
        const division = row2.division;
        const actions = h("div", { class: "btn-row" });
        actions.appendChild(
          button(head ? "Change who runs it" : "Put somebody over it", () => openHeadPicker(ctx, division.id, render), head ? "btn small" : "btn small primary")
        );
        actions.appendChild(
          button("Rename", () => {
            askForName("Rename this division", division.name, (name) => {
              const result = renameDivision(state, division.id, name);
              toast(result.message, result.ok ? "good" : "bad");
              keepingScroll(render);
            });
          }, "btn small")
        );
        card.appendChild(actions);
      }
      structure.appendChild(card);
    }
    if (trading.length >= 2) {
      structure.appendChild(
        h(
          "div",
          { class: "btn-row" },
          button("Start a new division", () => {
            askForName("Name the new division", "New division", (name) => {
              const made = createDivision(state, name, GROUPED_BY_HAND);
              toast(`${made.name} created. Move locations into it from the lists above.`, "good");
              keepingScroll(render);
            });
          }, "btn small")
        )
      );
    }
    el.appendChild(structure);
    el.appendChild(mergerPanel(ctx, render));
    const targets = companyTargets(state);
    const buying = section("Rivals you could buy whole");
    buying.appendChild(
      h("p", {
        class: "sub",
        style: "margin:-4px 0 10px",
        text: "Four approaches to four owners is four negotiations. Buying the company behind them is one \u2014 and it costs more, because you are paying for a going concern rather than four leases. What arrives stays together as a division."
      })
    );
    if (unlockedLevel(state) < 5) {
      buying.appendChild(
        empty("Buying a company whole is something a national company does. Keep growing \u2014 it opens at level 5.")
      );
    } else if (targets.length === 0) {
      buying.appendChild(empty("Nobody out there runs more than one location right now."));
    } else {
      buying.appendChild(
        table(
          ["Company", "Locations", "Parts", "As a going concern", ""],
          targets.slice(0, 8).map((row2) => [
            h("div", {}, h("div", { text: row2.company.name }), h("div", { class: "tiny muted", text: row2.blocked ?? "" })),
            String(row2.businesses.length),
            money(row2.parts),
            money(row2.fair),
            button(
              "Make an offer",
              () => openCompanyOffer(ctx, row2.company.id, render),
              row2.blocked ? "btn small" : "btn small primary"
            )
          ])
        )
      );
    }
    el.appendChild(buying);
  };
  const signature = () => {
    const state = ctx.state;
    return [
      state.day,
      state.divisions.map((d) => `${d.id}:${d.headEmployeeId ?? ""}:${d.mergedOnDay ?? ""}`).join(","),
      playerBusinesses(state).map((b) => `${b.id}:${b.divisionId ?? ""}`).join(","),
      state.employees.length,
      state.mergers.map((m) => `${m.id}:${m.letGo}:${Math.round(m.progress * 100)}`).join(",")
    ].join("|");
  };
  render();
  let shown = signature();
  return {
    el,
    update: () => {
      const now = signature();
      if (now === shown) return;
      shown = now;
      keepingScroll(render);
    }
  };
}
function mergerPanel(ctx, rerender) {
  const state = ctx.state;
  const panel = section("Becoming one company");
  panel.appendChild(
    h("p", {
      class: "sub",
      style: "margin:-4px 0 10px",
      text: "A company you bought is still their company with your name on the cheque: their systems, their back office, their way of doing things. Merging is the work of making it one \u2014 expensive while it happens, and the only thing that makes a group cheaper to run than the same shops apart."
    })
  );
  const running = activeMerger(state);
  if (running) {
    const division = state.divisions.find((d) => d.id === running.divisionId);
    const style = mergerStyle(running.style);
    const left = Math.max(0, running.days - (state.day - running.startedOnDay));
    const card = h("div", { class: "division-card" });
    card.appendChild(
      h(
        "div",
        { class: "division-head" },
        h("span", { class: "division-name", text: `${division?.name ?? "Integration"} \u2014 ${style.name.toLowerCase()}` }),
        h("span", { class: "division-lead warn", text: `${Math.round(running.progress * 100)}% through` })
      )
    );
    card.appendChild(bar(running.progress, running.progress > 0.7 ? "good" : "warn"));
    card.appendChild(
      h(
        "div",
        { class: "grid cols-4", style: "margin-top:12px" },
        stat("Days left", String(left)),
        stat("Spent so far", money(running.spent + running.severanceSpent)),
        stat("Made redundant", `${running.letGo} of ${running.duplicateIds.length}`),
        stat(
          "Culture gap",
          `${Math.round(running.cultureGap)}/100`,
          running.cultureGap > 45 ? "bad" : running.cultureGap > 20 ? "muted" : "good"
        )
      )
    );
    card.appendChild(
      h("p", {
        class: running.cultureGap > 35 ? "warn" : "sub",
        style: "margin:10px 0 0",
        text: running.cultureGap > 35 ? "Morale is down on both sides while this runs, and hardest on the side being merged in. Watch for resignations \u2014 the people you most want to keep are the ones with somewhere else to go." : "Morale is down while this runs and will come back when it is done. Nothing here is permanent except the saving."
      })
    );
    card.appendChild(
      h(
        "div",
        { class: "btn-row" },
        button(
          "Call it off",
          () => {
            const result = abandonMerger(state, running.id);
            toast(result.message, result.ok ? "info" : "bad");
            keepingScroll(rerender);
          },
          "btn small"
        )
      )
    );
    panel.appendChild(card);
  }
  const candidates = mergerCandidates(state).filter((division) => !mergerFor(state, division.id));
  if (candidates.length === 0 && !running) {
    panel.appendChild(
      empty(
        "Nothing to merge with. A merger needs a division that was once somebody else\u2019s company \u2014 buy one whole, and the decision about what to do with it appears here."
      )
    );
  }
  for (const division of candidates) {
    const plan = mergerPlan(state, division.id, "blend");
    if (!plan) continue;
    const card = h("div", { class: "division-card" });
    card.appendChild(
      h(
        "div",
        { class: "division-head" },
        h("span", { class: "division-name", text: division.name }),
        h("span", { class: "division-lead muted", text: `was ${division.acquiredFrom}` })
      )
    );
    card.appendChild(
      h("div", {
        class: "sub",
        text: `${plan.locations} location${plan.locations === 1 ? "" : "s"} \xB7 ${plan.headcount} people \xB7 ${plan.duplicates.length} job${plan.duplicates.length === 1 ? "" : "s"} that exist twice \xB7 culture gap ${plan.culture.gap}/100`
      })
    );
    for (const reason of plan.culture.reasons.slice(0, 2)) {
      card.appendChild(h("div", { class: "tiny muted", text: `\xB7 ${reason}` }));
    }
    card.appendChild(
      h(
        "div",
        { class: "btn-row" },
        button(
          "Look at merging it in",
          () => openMergerPlan(ctx, division.id, rerender),
          plan.blocked ? "btn small" : "btn small primary"
        )
      )
    );
    if (plan.blocked) card.appendChild(h("div", { class: "tiny warn", text: plan.blocked }));
    panel.appendChild(card);
  }
  const done = mergerHistory(state);
  if (done.length > 0) {
    panel.appendChild(
      table(
        ["Merged in", "How", "Took", "Cost", "Off the coordination bill"],
        done.slice(0, 6).map((merger) => [
          merger.fromCompany,
          mergerStyle(merger.style).name,
          `${(merger.completedOnDay ?? 0) - merger.startedOnDay} days`,
          money(merger.spent + merger.severanceSpent),
          `\u2212${(merger.savingLockedIn * 100).toFixed(1)}%`
        ])
      )
    );
  }
  return panel;
}
function openMergerPlan(ctx, divisionId, rerender) {
  const state = ctx.state;
  const { body, close } = modal({ title: "Merging two companies into one", width: 640 });
  let chosen = MERGER_STYLES[1].id;
  const detail = h("div", {});
  const paint = () => {
    detail.replaceChildren();
    const plan = mergerPlan(state, divisionId, chosen);
    if (!plan) {
      detail.appendChild(h("p", { text: "That division no longer exists." }));
      return;
    }
    detail.appendChild(h("p", { class: "sub", text: plan.style.detail }));
    detail.appendChild(
      h(
        "div",
        { class: "grid cols-4" },
        stat("How long", `${plan.days} days`),
        stat("To run it", money(plan.integrationCost)),
        stat("Redundancies", `${plan.cuts} of ${plan.duplicates.length}`),
        stat("Severance", money(plan.severance))
      )
    );
    detail.appendChild(
      h(
        "div",
        { class: "grid cols-3", style: "margin-top:10px" },
        stat("Wages saved", `${money(plan.wageSaving)}/mo`, plan.wageSaving > 0 ? "good" : "muted"),
        stat("Shared overhead", `${money(plan.overheadSaving)}/mo`, plan.overheadSaving > 0 ? "good" : "muted"),
        stat(
          "Pays for itself in",
          plan.payback === null ? "never" : `${plan.payback} months`,
          plan.payback === null ? "bad" : plan.payback <= 18 ? "good" : "muted"
        )
      )
    );
    detail.appendChild(
      h("p", {
        class: plan.head ? "sub" : "warn",
        text: plan.head ? `${plan.head.name} runs ${plan.division.name} and will carry the integration. That is most of it off your desk, and it is why this takes ${plan.days} days rather than longer.` : `Nobody runs ${plan.division.name}, so this lands on you \u2014 it takes longer, and it counts against your attention like another two locations would. Put somebody senior over the division first if you can.`
      })
    );
    const culture = h("div", { style: "margin-top:8px" });
    culture.appendChild(
      h("div", {
        class: plan.culture.gap > 45 ? "bad" : plan.culture.gap > 20 ? "warn" : "good",
        text: `Culture gap ${plan.culture.gap}/100`
      })
    );
    for (const reason of plan.culture.reasons) {
      culture.appendChild(h("div", { class: "tiny muted", text: `\xB7 ${reason}` }));
    }
    detail.appendChild(culture);
    if (plan.duplicates.length > 0) {
      detail.appendChild(
        h("p", {
          class: "sub",
          style: "margin-top:10px",
          text: `${plan.duplicates.length} job${plan.duplicates.length === 1 ? "" : "s"} exist twice once the two are one. Nobody is ever counted as spare if their location cannot do its trade without them \u2014 these are central functions the head office already covers, and the cover a shop stops needing when it shares systems with everywhere else.`
        })
      );
      detail.appendChild(
        table(
          ["Whose job exists twice", "Where", "Redundancy"],
          plan.duplicates.slice(0, 6).map((person) => [
            h("div", {}, h("div", { text: person.name }), h("div", { class: "tiny muted", text: titleOf(person) })),
            state.businesses.find((b) => b.id === person.businessId)?.name ?? "\u2014",
            money(redundancyPay(state, person))
          ])
        )
      );
    } else {
      detail.appendChild(
        h("p", {
          class: "sub",
          style: "margin-top:10px",
          text: "Nobody is spare. What you bought was already lean, so this merger is about overhead and coherence rather than headcount \u2014 which also means it is a far easier one to live through."
        })
      );
    }
    if (plan.blocked) {
      detail.appendChild(h("p", { class: "bad", text: plan.blocked }));
      return;
    }
    detail.appendChild(
      h(
        "div",
        { class: "btn-row" },
        button(
          `Start the integration \u2014 ${plan.style.name.toLowerCase()}`,
          () => {
            const result = startMerger(state, divisionId, chosen);
            toast(result.message, result.ok ? "good" : "bad");
            if (result.ok) close();
            rerender();
          },
          "btn primary"
        ),
        button("Not yet", () => close())
      )
    );
  };
  const choices = h("div", { class: "btn-row" });
  for (const style of MERGER_STYLES) {
    choices.appendChild(
      button(
        style.name,
        () => {
          chosen = style.id;
          for (const child of Array.from(choices.children)) child.classList.remove("primary");
          const index = MERGER_STYLES.findIndex((s) => s.id === style.id);
          choices.children[index]?.classList.add("primary");
          paint();
        },
        `btn small${style.id === chosen ? " primary" : ""}`
      )
    );
  }
  body.appendChild(h("p", { class: "sub", text: "Three ways to do it, and the difference between them is how much of it the people go through." }));
  body.appendChild(choices);
  body.appendChild(detail);
  paint();
}
function askForName(title, current, done) {
  const { body, close } = modal({ title, width: 420 });
  const input = h("input", { type: "text", value: current, maxlength: 40 });
  body.appendChild(h("label", { class: "field" }, h("span", { text: "Name" }), input));
  body.appendChild(
    h(
      "div",
      { class: "btn-row" },
      button(
        "Save",
        () => {
          const name = input.value.trim();
          if (!name) {
            toast("A division needs a name.", "bad");
            return;
          }
          close();
          done(name);
        },
        "btn primary"
      ),
      button("Cancel", () => close())
    )
  );
  input.focus();
  input.select();
}
function openHeadPicker(ctx, divisionId, rerender) {
  const state = ctx.state;
  const { body, close } = modal({ title: "Who runs this division", width: 560 });
  const candidates = eligibleHeads(state);
  if (candidates.length === 0) {
    body.appendChild(
      h("p", {
        text: "Nobody in the company is senior enough. Running a division takes a Senior Manager at least, and the only way there is leadership \u2014 a brilliant cook with no leadership will never reach it, however good the cooking gets. Send somebody on a leadership course."
      })
    );
    const near = state.employees.filter((person) => person.companyId === state.playerCompanyId && gradeOf(person).n >= 3).sort((a, b) => b.skills.leadership - a.skills.leadership).slice(0, 3);
    if (near.length > 0) {
      body.appendChild(h("p", { class: "sub", text: "Closest to it:" }));
      for (const person of near) {
        body.appendChild(
          h(
            "div",
            { class: "stat" },
            h("span", { class: "stat-label", text: `${person.name} \u2014 ${titleOf(person)}` }),
            h("span", { class: "stat-value muted", text: `leadership ${Math.round(person.skills.leadership)}` })
          )
        );
      }
    }
    body.appendChild(h("div", { class: "btn-row" }, button("Go to the people", () => {
      close();
      ctx.go("employees");
    }, "btn primary")));
    return;
  }
  for (const person of candidates) {
    body.appendChild(
      h(
        "div",
        { class: "staff-row" },
        h(
          "div",
          { style: "flex:1;min-width:0" },
          h("div", { class: "staff-name", text: person.name }),
          h("div", {
            class: "sub",
            text: `${titleOf(person)} \xB7 covers ${gradeOf(person).span} \xB7 performance ${Math.round(performanceOf(person))}`
          })
        ),
        button(
          "Hand it to them",
          () => {
            const result = appointHead(state, divisionId, person.id);
            toast(result.message, result.ok ? "good" : "bad");
            close();
            rerender();
          },
          "btn small primary"
        )
      )
    );
  }
  body.appendChild(
    h(
      "div",
      { class: "btn-row" },
      button("Take it back on your own desk", () => {
        const result = appointHead(state, divisionId, null);
        toast(result.message, result.ok ? "good" : "bad");
        close();
        rerender();
      })
    )
  );
}
function openCompanyOffer(ctx, companyId, rerender) {
  const state = ctx.state;
  const { body, close } = modal({ title: "Offer for a whole company", width: 560 });
  const targets = companyTargets(state);
  const row2 = targets.find((entry) => entry.company.id === companyId);
  if (!row2) {
    body.appendChild(h("p", { text: "That company is no longer available." }));
    return;
  }
  body.appendChild(
    h(
      "div",
      {},
      stat("Company", row2.company.name),
      stat("Locations", String(row2.businesses.length)),
      stat("Sum of the parts", money(row2.parts)),
      stat("As a going concern", money(row2.fair)),
      stat("Your cash", money(playerCompany(state).cash))
    )
  );
  body.appendChild(
    h("p", {
      class: "sub",
      text: "They will not say what they would accept. Offer too little and they stop talking for three weeks; an owner losing money will take less than one who is not."
    })
  );
  if (row2.blocked) {
    body.appendChild(h("p", { class: "bad", text: row2.blocked }));
    return;
  }
  let amount = row2.fair;
  body.appendChild(
    h("label", { class: "field" }, h("span", { text: "Your offer" }), numberInput(amount, (value) => {
      amount = value;
    }, { min: "0" }))
  );
  body.appendChild(
    h(
      "div",
      { class: "btn-row" },
      button(
        "Make the offer",
        () => {
          const result = makeCompanyOffer(state, companyId, amount);
          toast(result.message, result.accepted ? "good" : result.ok ? "info" : "bad");
          close();
          if (result.accepted) ctx.refresh();
          else rerender();
        },
        "btn primary"
      )
    )
  );
}

// src/ui/views/founder.ts
function founderView(ctx) {
  const el = h("div", { class: "view" });
  const render = () => {
    el.replaceChildren();
    const state = ctx.state;
    const founder = state.founder;
    const company = playerCompany(state);
    if (!founder) {
      el.appendChild(
        h("div", { class: "view-head" }, h("h1", { text: "You" }))
      );
      el.appendChild(section("Nothing on file", empty("This company was started before the game kept a record of who runs it.")));
      return;
    }
    const trait2 = founderTrait(founder.traitId);
    const started = scenario(founder.scenarioId);
    const open = playerBusinesses(state).filter((b) => b.status === "open");
    el.appendChild(
      h(
        "div",
        { class: "view-head" },
        h("h1", { text: founder.name }),
        h("p", {
          text: `${trait2.name} \xB7 started as ${started.name.toLowerCase()} \xB7 ${company.name} \xB7 day ${state.day}`
        })
      )
    );
    el.appendChild(
      section(
        "Where the company has got to under you",
        h(
          "div",
          { class: "grid cols-4" },
          stat("Level", `${levelOf(state).n} \xB7 ${levelOf(state).name}`),
          stat("Locations", String(open.length)),
          stat("People", String(state.employees.length)),
          stat("Payroll", `${money(sum(state.employees, (e) => e.salary))}/mo`)
        )
      )
    );
    const panel = section("What you are good at");
    panel.appendChild(
      h("p", {
        class: "sub",
        style: "margin:-4px 0 10px",
        text: "Nothing here is spent or allocated. You get better at the things you actually do, and the first twenty points come far faster than the last twenty."
      })
    );
    const worth = {
      management: `you can hold about ${attentionSpan(state).toFixed(1)} locations before anything drifts`,
      finance: `${rateDiscount(state) >= 0 ? `${pct(rateDiscount(state) * 100, 2)} off every rate quoted` : `${pct(-rateDiscount(state) * 100, 2)} added to every rate quoted`}, and ${pct((lendingFactor(state) - 1) * 100)} on what the bank will lend`,
      sales: `${pct((marketingSkillFactor(state) - 1) * 100)} on what marketing buys`,
      operations: `${pct((1 - operationsFactor(state)) * 100)} off the coordination bill`,
      strategy: `research finishes ${pct((researchSpeed(state) - 1) * 100)} sooner`,
      leadership: `${moraleFromOwner(state) >= 0 ? "+" : ""}${Math.round(moraleFromOwner(state))} morale for everybody on the payroll`,
      negotiation: `${pct((1 - negotiationFactor(state)) * 100)} off supplier prices and sellers' reserves`
    };
    for (const def of FOUNDER_SKILLS) {
      const value = skillOf(state, def.id);
      const toNext = founder.progress[def.id] ?? 0;
      panel.appendChild(
        h(
          "div",
          { class: "founder-skill" },
          h(
            "div",
            { class: "founder-skill-head" },
            h("span", { class: "founder-skill-name", text: def.name }),
            h("span", { class: "founder-skill-value", text: `${Math.round(value)}/100` })
          ),
          bar(value / 100, value >= 70 ? "good" : value <= 25 ? "bad" : ""),
          h("div", { class: "sub", text: def.detail }),
          h("div", { class: "founder-skill-worth", text: `Right now: ${worth[def.id] ?? def.says}.` }),
          value < 100 ? h("div", { class: "tiny muted", text: `${Math.round(toNext * 100)}% of the way to the next point.` }) : h("div", { class: "tiny good", text: "As far as this one goes." })
        )
      );
    }
    el.appendChild(panel);
    const attention = ownerAttention(state);
    el.appendChild(
      section(
        "What you can actually keep an eye on",
        bar(attention, attention >= 1 ? "good" : attention > 0.75 ? "warn" : "bad"),
        h("p", {
          class: attention >= 1 ? "sub" : "warn",
          style: "margin:8px 0 0",
          text: attention >= 1 ? `Comfortable. At management ${Math.round(skillOf(state, "management"))} you can hold about ${attentionSpan(
            state
          ).toFixed(1)} locations, and you are inside that.` : `Stretched. At management ${Math.round(skillOf(state, "management"))} you can hold about ${attentionSpan(
            state
          ).toFixed(1)} locations, and you are past it. Getting better at managing raises that ceiling; putting somebody senior over a division moves the work off it entirely.`
        })
      )
    );
    el.appendChild(
      section(
        "Where you came from",
        h("p", { class: "sub", text: trait2.detail }),
        h("p", { text: trait2.plays }),
        h("p", {
          class: "tiny muted",
          text: `${started.name}: ${started.focus}`
        })
      )
    );
  };
  const signature = () => {
    const founder = ctx.state.founder;
    if (!founder) return "none";
    return `${ctx.state.day}|${FOUNDER_SKILLS.map((s) => Math.round(founder.skills[s.id])).join(",")}`;
  };
  render();
  let shown = signature();
  return {
    el,
    update: () => {
      const now = signature();
      if (now === shown) return;
      shown = now;
      keepingScroll(render);
    }
  };
}

// src/ui/views/contracts.ts
function contractsView(ctx) {
  const el = h("div", { class: "view" });
  const render = () => {
    el.replaceChildren();
    const state = ctx.state;
    el.appendChild(
      h(
        "div",
        { class: "view-head" },
        h("h1", { text: "Contracts" }),
        h("p", { text: "Supply somebody else, every week, for a price agreed in advance." })
      )
    );
    if (!contractsUnlocked(state)) {
      el.appendChild(
        h(
          "section",
          { class: "panel panel-danger" },
          h("h3", { class: "panel-title", text: "Nobody is offering you one yet" }),
          h("p", {
            text: `Clients put work out to companies that can be relied on. You are a ${levelOf(
              state
            ).name.toLowerCase()}; offers start arriving at growing company.`
          }),
          button("What would it take?", () => ctx.go("progress"), "btn primary")
        )
      );
    }
    const running = contractsOf(state);
    el.appendChild(
      section(
        `Running \u2014 ${money(weeklyContractValue(state))} a week`,
        running.length === 0 ? empty("Nothing signed. Offers appear below as clients look for suppliers.") : table(
          ["Client", "Supplying", "A week", "Weeks", "Stock to hand", "Strikes"],
          running.map((contract) => {
            const def = product(contract.productId);
            const have = available(state, contract.productId);
            const short = have < contract.unitsPerWeek;
            return [
              contract.client,
              `${contract.unitsPerWeek} \xD7 ${def?.name ?? contract.productId}`,
              money(contract.unitsPerWeek * contract.unitPrice),
              h(
                "div",
                {},
                h("span", { text: `${contract.weeksDone} of ${contract.weeksTotal}` }),
                bar(contract.weeksDone / Math.max(1, contract.weeksTotal))
              ),
              h("span", { class: short ? "bad" : "good", text: `${have}` }),
              h("span", {
                class: contract.missed > 0 ? "bad" : "muted",
                text: `${contract.missed} of ${STRIKES}`
              })
            ];
          })
        )
      )
    );
    const offers = state.contractOffers;
    const cards = h("div", { class: "grid cols-2" });
    for (const offer of offers) {
      const def = product(offer.productId);
      const check = eligibility(state, offer);
      const have = available(state, offer.productId);
      cards.appendChild(
        h(
          "div",
          { class: "panel" },
          h("h4", { text: offer.client }),
          stat("Supplying", `${offer.unitsPerWeek} \xD7 ${def?.name ?? offer.productId} a week`),
          stat("Price a unit", money(offer.unitPrice)),
          stat("Worth a week", money(offer.unitsPerWeek * offer.unitPrice)),
          stat("Term", `${offer.weeks} weeks`),
          stat("Penalty if short", money(offer.penalty), "bad"),
          stat("Needs", `${offer.requiresHeadcount} staff${offer.requiresWarehouse ? ", a distribution centre" : ""}`),
          stat(
            "You hold now",
            `${have} units`,
            have >= offer.unitsPerWeek ? "good" : "bad"
          ),
          check.ok ? h("p", { class: "sub", text: "You can service this today." }) : h("p", { class: "bad", text: `You would need ${check.reasons.join(" and ")}.` }),
          h(
            "div",
            { class: "row" },
            button(
              "Accept",
              () => {
                const result = accept(state, offer.id);
                toast(result.message);
                if (result.ok) ctx.refresh();
                render();
              },
              check.ok ? "btn primary" : "btn"
            ),
            button("Decline", () => {
              decline(state, offer.id);
              render();
            })
          )
        )
      );
    }
    el.appendChild(
      section(
        "On the table",
        offers.length === 0 ? empty("No offers this week. Clients come looking as the company grows.") : cards
      )
    );
    el.appendChild(
      section(
        "How they work",
        h(
          "ul",
          { class: "unlock-list" },
          h("li", { text: "Every week the units come off the warehouse racks first, then off the shelves \u2014 but never more than half a shop\u2019s stock, so a contract cannot empty a shop." }),
          h("li", { text: "A full delivery is paid in full and lifts reputation. A short one is paid for what went out, charges the penalty, and costs reputation." }),
          h("li", { text: `Three short weeks and the client leaves. Finish the term and there is a completion bonus.` })
        )
      )
    );
  };
  function signature() {
    const state = ctx.state;
    return `${state.day}|${state.contracts.length}|${state.contractOffers.length}|${state.contracts.map((c) => c.weeksDone + ":" + c.missed).join()}`;
  }
  render();
  let shown = signature();
  return {
    el,
    update: () => {
      const now = signature();
      if (now === shown) return;
      shown = now;
      keepingScroll(render);
    }
  };
}

// src/ui/views/research.ts
function researchView(ctx) {
  const el = h("div", { class: "view" });
  const render = () => {
    el.replaceChildren();
    const state = ctx.state;
    el.appendChild(
      h(
        "div",
        { class: "view-head" },
        h("h1", { text: "Research and development" }),
        h("p", { text: "Money spent now against a cost that never comes back." })
      )
    );
    if (!researchUnlocked(state)) {
      el.appendChild(
        h(
          "section",
          { class: "panel panel-danger" },
          h("h3", { class: "panel-title", text: "Not open to you yet" }),
          h("p", {
            text: `R&D needs a company large enough to carry it. You are a ${levelOf(
              state
            ).name.toLowerCase()}; the first branches open at regional company, and the tree widens from there. The whole tree is below so you can see what you are working towards.`
          }),
          button("What would it take?", () => ctx.go("progress"), "btn primary")
        )
      );
    }
    const active = state.research.active;
    if (active) {
      const node2 = RESEARCH_BY_ID.get(active.id);
      el.appendChild(
        section(
          "In progress",
          h("h4", { text: node2?.name ?? active.id }),
          h("p", { class: "sub", text: node2?.says ?? "" }),
          bar(researchProgress(state)),
          h("p", { class: "sub", text: `Finishes on day ${active.endsOnDay} \u2014 ${active.endsOnDay - state.day} days to go.` })
        )
      );
    }
    const open = openBranches(state);
    const isOpen = (id) => open.some((branch) => branch.id === id);
    for (const branch of BRANCHES) {
      const nodes = RESEARCH.filter((node2) => node2.branch === branch.id);
      const rows = h("div", {});
      for (const node2 of nodes) {
        const done2 = isDone(state, node2.id);
        const check = canStart(state, node2.id);
        rows.appendChild(
          h(
            "div",
            { class: `research-node${done2 ? " done" : ""}` },
            h(
              "div",
              { class: "research-head" },
              h("span", { class: "research-name", text: node2.name }),
              h("span", { class: "research-says", text: node2.says })
            ),
            h("p", { class: "sub", text: node2.detail }),
            done2 ? h("span", { class: "good", text: "Done \u2014 the effect is live." }) : h(
              "div",
              { class: "row" },
              h("span", { class: "sub", text: `${money(node2.cost)} \xB7 ${node2.days} days` }),
              button(
                "Start",
                () => {
                  const result = startResearch(state, node2.id);
                  toast(result.message);
                  render();
                },
                check.ok ? "btn primary" : "btn"
              ),
              check.ok ? null : h("span", { class: "sub muted", text: check.reason })
            )
          )
        );
      }
      const panel = section(
        `${branch.name} \u2014 ${branch.detail}`,
        isOpen(branch.id) ? null : h("p", { class: "sub muted", text: "Closed to a company this size." }),
        rows
      );
      if (!isOpen(branch.id)) panel.classList.add("locked");
      el.appendChild(panel);
    }
    const done = state.research.done.length;
    el.appendChild(
      section(
        "What you have bought",
        done === 0 ? empty("Nothing finished yet.") : h(
          "div",
          {},
          ...state.research.done.map((id) => {
            const node2 = RESEARCH_BY_ID.get(id);
            return stat(node2?.name ?? id, node2?.says ?? "", "good");
          })
        )
      )
    );
  };
  function signature() {
    const state = ctx.state;
    return `${state.day}|${state.research.done.length}|${state.research.active?.id ?? ""}`;
  }
  render();
  let shown = signature();
  return {
    el,
    update: () => {
      const now = signature();
      if (now === shown) return;
      shown = now;
      keepingScroll(render);
    }
  };
}

// src/ui/views/news.ts
var FILTERS = [
  { id: "all", label: "Everything" },
  { id: "company", label: "Your company" },
  { id: "competitor", label: "Competition" },
  { id: "economy", label: "Economy" },
  { id: "staff", label: "Staff" },
  { id: "supplier", label: "Suppliers" },
  { id: "market", label: "Market" },
  { id: "property", label: "Property" }
];
function newsView(ctx) {
  const el = h("div", { class: "view" });
  const state = ctx.state;
  let filter = "all";
  el.appendChild(
    h(
      "div",
      { class: "view-head" },
      h("h1", { text: "Newsroom" }),
      h("p", { text: "Everything the simulation has done that you would want to know about" })
    )
  );
  if (state.decisions.length > 0) {
    const panel = section("Waiting on you");
    for (const decision of state.decisions) {
      panel.appendChild(
        h(
          "div",
          { class: "decision-card" },
          h(
            "div",
            { style: "flex:1;min-width:0" },
            h("div", { class: "card-title", text: decision.title }),
            h("div", { class: "card-sub", text: decision.body }),
            h("div", { class: "tiny muted", text: `Expires on day ${decision.expiresOnDay}.` })
          ),
          button("Decide", () => showDecision(ctx, decision), "btn primary")
        )
      );
    }
    el.appendChild(panel);
  }
  const feedHost = h("div", {});
  const filterRow = h("div", { class: "filter-row" });
  const renderFeed = () => {
    feedHost.innerHTML = "";
    const items = recentNews(state, 40, filter === "all" ? void 0 : filter);
    if (items.length === 0) {
      feedHost.appendChild(
        empty(
          state.day <= 1 ? "Nothing has happened yet. Let the clock run and the city will start reporting." : "Nothing in this category yet."
        )
      );
      return;
    }
    for (const item of items) {
      const cal = calendar(item.day);
      feedHost.appendChild(
        h(
          "article",
          { class: `news-item${item.importance === "high" ? " hot" : ""}` },
          h("span", { class: "news-icon", text: NEWS_ICONS[item.category] }),
          h(
            "div",
            { style: "flex:1;min-width:0" },
            h(
              "div",
              { class: "news-meta" },
              h("span", { class: "news-category", text: NEWS_LABELS[item.category] }),
              h("span", { text: `Day ${item.day} \xB7 ${cal.weekday} ${clockLabel(item.hour)}` })
            ),
            h("div", { class: "news-headline", text: item.headline }),
            h("div", { class: "news-body", text: item.body }),
            item.businessId ? h(
              "button",
              {
                class: "btn small ghost",
                style: "margin-top:6px",
                on: { click: () => ctx.go("businesses", { business: item.businessId }) }
              },
              "Open that business"
            ) : null
          )
        )
      );
    }
  };
  for (const option of FILTERS) {
    filterRow.appendChild(
      h(
        "button",
        {
          class: `map-mode${option.id === filter ? " active" : ""}`,
          data: { filter: option.id },
          on: {
            click: () => {
              filter = option.id;
              for (const child of Array.from(filterRow.children)) {
                const el2 = child;
                el2.className = `map-mode${el2.dataset.filter === filter ? " active" : ""}`;
              }
              renderFeed();
            }
          }
        },
        option.label
      )
    );
  }
  const feed = section("The feed");
  feed.appendChild(filterRow);
  feed.appendChild(feedHost);
  el.appendChild(feed);
  renderFeed();
  return { el };
}

// src/ui/views/market.ts
function marketView(ctx) {
  const el = h("div", { class: "view" });
  const state = ctx.state;
  const mine = playerBusinesses(state).filter((b) => b.status === "open");
  el.appendChild(
    h(
      "div",
      { class: "view-head" },
      h("h1", { text: "Market" }),
      h("p", { text: "Where you stand, and who is standing in your way" })
    )
  );
  const markets = section("Your markets");
  if (mine.length === 0) {
    markets.appendChild(
      empty("You are not trading yet, so you have no share of anything. Open a business and this fills in.")
    );
  } else {
    for (const business of mine) {
      const building = buildingById(state, business.buildingId);
      if (!building) continue;
      const type = businessTypeOrThrow(business.typeId);
      const share = typeShare(business.typeId);
      const shares = marketRows(state, business.id);
      const peers = state.businesses.filter((other) => {
        if (other.status !== "open" || other.typeId !== business.typeId) return false;
        const otherBuilding = buildingById(state, other.buildingId);
        return otherBuilding?.district === building.district;
      });
      let dailyPool = 0;
      const savedHour = state.hour;
      for (let hour = 0; hour < 24; hour += 1) {
        state.hour = hour;
        dailyPool += districtPool(state, building.district, type.category) * share;
      }
      state.hour = savedHour;
      const ownShare = marketShare(state, business.id);
      const leader = shares.find((row2) => row2.businessId !== business.id) ?? null;
      const background = shares.find((row2) => row2.businessId === null)?.share ?? 0;
      markets.appendChild(
        h(
          "div",
          { class: "card", style: "margin-bottom:10px" },
          h(
            "div",
            { class: "card-head" },
            h(
              "div",
              {},
              h("div", { class: "card-title", text: `${type.icon} ${business.name}` }),
              h("div", {
                class: "card-sub",
                text: `${type.name} in ${district(building.district).name} \xB7 market of about ${count(dailyPool)} customers a day`
              })
            ),
            h("span", {
              class: `tag ${ownShare > 0.2 ? "good" : ownShare < 0.06 ? "bad" : ""}`,
              text: `${pct(ownShare * 100, 1)} share`
            })
          ),
          bar(ownShare, ownShare > 0.2 ? "good" : ownShare < 0.06 ? "bad" : ""),
          h(
            "p",
            { class: "tiny muted", style: "margin-top:8px" },
            leader && leader.share > ownShare ? `${leader.name} leads here. ` : peers.length > 1 ? "You have the largest share of the named businesses here. " : "No named rival trades here. ",
            `${pct(background * 100, 1)} of this market goes to outlets the game does not name individually.`
          ),
          // Everybody in this market, you included, on one list — which is
          // the only way a share figure means anything.
          table(
            ["Business", "Owner", "Price level", "Reviews", "Share"],
            shares.map((row2) => {
              const peer = row2.businessId ? state.businesses.find((entry) => entry.id === row2.businessId) : null;
              const owner = peer ? state.companies.find((c) => c.id === peer.companyId) : null;
              return [
                h("span", { class: row2.isPlayer ? "good" : peer ? "" : "muted", text: row2.name }),
                owner?.name ?? (peer ? "\u2014" : "unnamed operators"),
                peer ? pct(priceIndex(peer) * 100) : "\u2014",
                peer ? `${peer.reviewScore.toFixed(1)}\u2605` : "\u2014",
                h("span", { class: row2.isPlayer ? "good" : "", text: pct(row2.share * 100, 1) })
              ];
            })
          )
        )
      );
    }
  }
  el.appendChild(markets);
  const rivals = competitorBusinesses(state);
  const byCompany = /* @__PURE__ */ new Map();
  for (const business of rivals) {
    const list = byCompany.get(business.companyId) ?? [];
    list.push(business);
    byCompany.set(business.companyId, list);
  }
  const rows = [...byCompany.entries()].map(([companyId, businesses]) => {
    const company = state.companies.find((c) => c.id === companyId);
    const districts = new Set(
      businesses.map((b) => buildingById(state, b.buildingId)?.district).filter(Boolean)
    );
    const avgPrice = sum(businesses, (b) => priceIndex(b)) / businesses.length;
    const avgReview = sum(businesses, (b) => b.reviewScore) / businesses.length;
    const meetsYou = businesses.some((rival) => {
      const rivalBuilding = buildingById(state, rival.buildingId);
      return mine.some((own) => {
        const ownBuilding = buildingById(state, own.buildingId);
        return ownBuilding?.district === rivalBuilding?.district && own.typeId === rival.typeId;
      });
    });
    return { company, businesses, districts: districts.size, avgPrice, avgReview, meetsYou };
  }).sort((a, b) => b.businesses.length - a.businesses.length);
  const playerOpen = mine.length;
  const biggest = rows[0]?.businesses.length ?? 0;
  el.appendChild(
    section(
      "Competitors",
      h(
        "div",
        { class: "grid cols-3", style: "margin-bottom:12px" },
        stat("Your open locations", String(playerOpen), playerOpen > biggest ? "good" : void 0),
        stat("Largest competitor", `${biggest} locations`),
        stat("Companies trading", String(rows.length + 1))
      ),
      rows.length === 0 ? empty("No competitors are trading right now.") : table(
        ["Company", "Strategy", "Locations", "Districts", "Price level", "Reviews", ""],
        rows.map((row2) => [
          h(
            "div",
            {},
            h("div", { text: row2.company?.name ?? "Unknown" }),
            h("div", { class: "tiny muted", text: `${money(row2.company?.cash ?? 0)} cash` })
          ),
          row2.company?.personality ? PERSONALITY_LABELS[row2.company.personality] : "\u2014",
          String(row2.businesses.length),
          String(row2.districts),
          pct(row2.avgPrice * 100),
          `${row2.avgReview.toFixed(1)}\u2605`,
          row2.meetsYou ? h("span", { class: "tag bad", text: "Competes with you" }) : h("span", { class: "tag", text: "Elsewhere" })
        ])
      ),
      h("p", {
        class: "tiny muted",
        text: "Competitors set their own prices, marketing and expansion from what they can observe. A low price level means they are undercutting the market, not that they are cheap to beat."
      })
    )
  );
  const catchments = section("Who lives in each district");
  catchments.appendChild(
    h("p", {
      class: "tiny muted",
      text: "Every district produces the same number of customers whoever they are \u2014 but not the same customers. Students fill a shop and barely fill a till; professionals do the opposite. This is the catchment, before your own shop is taken into account."
    })
  );
  catchments.appendChild(
    table(
      ["District", "Mostly", ...SEGMENTS.map((seg) => seg.name), "Spend"],
      DISTRICTS.map((def) => {
        const mix = districtMix(def, "retail");
        return [
          def.name,
          h("span", {}, leadingSegment(mix).name, hint(leadingSegment(mix).description)),
          ...SEGMENTS.map(
            (seg) => h("span", {
              class: mix[seg.id] > 0.34 ? "good" : mix[seg.id] < 0.06 ? "muted" : "",
              text: pct(mix[seg.id] * 100)
            })
          ),
          h("span", {
            class: basketFactor(mix) > 1.04 ? "good" : basketFactor(mix) < 0.96 ? "bad" : "",
            text: pct(basketFactor(mix) * 100)
          })
        ];
      })
    )
  );
  catchments.appendChild(
    h("p", {
      class: "tiny muted",
      text: "Spend is what an average basket here is worth against the city average. It is already in every revenue figure the game shows you."
    })
  );
  el.appendChild(catchments);
  const targets = acquisitionTargets(state, 10);
  const buyPanel = section("Businesses you could buy");
  buyPanel.appendChild(
    h("p", {
      class: "tiny muted",
      text: "Buying a rival gets you a trading shop, its lease, its fittings and its team on the same day \u2014 at a price that reflects all four. Owners who are losing money are easier to persuade; one who is doing well will hold out."
    })
  );
  if (targets.length === 0) {
    buyPanel.appendChild(empty("Nobody else is trading in the city right now."));
  } else {
    buyPanel.appendChild(
      table(
        ["Business", "Owner", "District", "Trading", "Rough value", ""],
        targets.map(({ business, valuation }) => {
          const building = buildingById(state, business.buildingId);
          const owner = state.companies.find((c) => c.id === business.companyId);
          const type = businessTypeOrThrow(business.typeId);
          const daily = business.profitHistory.slice(-14);
          const avg = daily.length > 0 ? sum(daily, (p2) => p2) / daily.length : 0;
          const status = approachStatus(state, business.id);
          return [
            h(
              "div",
              {},
              h("div", { text: `${type.icon} ${business.name}` }),
              h("div", { class: "tiny muted", text: `${business.reviewScore.toFixed(1)}\u2605 \xB7 ${Math.round(business.reputation)}/100 reputation` })
            ),
            owner?.name ?? "\u2014",
            building ? district(building.district).name : "\u2014",
            h("span", { class: avg >= 0 ? "good" : "bad", text: `${money(avg)}/day` }),
            money(valuation.fair),
            status?.blocked ? h("span", { class: "tag warn", text: "Not talking" }) : button("Make an offer", () => showOffer(ctx, business.id), "btn small")
          ];
        })
      )
    );
  }
  el.appendChild(buyPanel);
  return { el };
}
function showOffer(ctx, businessId) {
  const state = ctx.state;
  const business = state.businesses.find((b) => b.id === businessId);
  const status = approachStatus(state, businessId);
  if (!business || !status) return;
  const owner = state.companies.find((c) => c.id === business.companyId);
  const { valuation } = status;
  const { body, footer, close } = modal({ title: `Offer for ${business.name}`, width: 560 });
  body.appendChild(
    h("p", {
      class: "decision-body",
      text: `${owner?.name ?? "The owner"} has not put it up for sale. What you pay has to be worth more to them than keeping it.`
    })
  );
  body.appendChild(
    h(
      "div",
      { class: "panel" },
      h("h3", { class: "panel-title", text: "What you would be buying" }),
      stat("Trade (goodwill)", money(valuation.goodwill)),
      stat("Fittings and equipment", money(valuation.fixtures)),
      stat("Stock on the shelves", money(valuation.stock)),
      stat("Lease or freehold", money(valuation.premises)),
      stat("Rough value", money(valuation.fair), "good"),
      h("p", {
        class: "tiny muted",
        style: "margin-top:8px",
        text: valuation.history >= 21 ? `Valued on ${valuation.history} days of trading \u2014 about ${money(valuation.annualProfit)} of profit a year.` : `Only ${valuation.history} days of trading to go on, so the price leans on the assets rather than the profit.`
      })
    )
  );
  let amount = Math.round(valuation.fair * 1.15 / 100) * 100;
  body.appendChild(
    h(
      "label",
      { class: "field" },
      h("span", { text: "Your offer" }),
      numberInput(amount, (value) => {
        amount = value;
      }, { step: "500", min: "0" })
    )
  );
  body.appendChild(
    h("p", {
      class: "tiny muted",
      text: `You are holding ${money(playerCompany(state).cash)}. A refusal closes the conversation for ${APPROACH_COOLDOWN} days, so lowballing has a real cost.`
    })
  );
  footer.appendChild(button("Walk away", () => close(), "btn ghost"));
  footer.appendChild(
    button(
      "Make the offer",
      () => {
        const result = makeOffer2(state, businessId, amount);
        toast(result.message, result.accepted ? "good" : "bad");
        close();
        if (result.accepted) ctx.go("businesses", { business: businessId });
        else ctx.refresh();
      },
      "btn primary"
    )
  );
}

// src/ui/views/businesses.ts
function businessesView(ctx) {
  const el = h("div", { class: "view" });
  const state = ctx.state;
  const businesses = playerBusinesses(state);
  el.appendChild(
    h(
      "div",
      { class: "view-head" },
      h("h1", { text: "Businesses" }),
      h("p", { text: `${businesses.length} location${businesses.length === 1 ? "" : "s"}` })
    )
  );
  if (businesses.length === 0) {
    el.appendChild(
      section(
        "No businesses yet",
        empty("Find premises on the map first, then create a business in the unit you have taken on."),
        h("div", { class: "btn-row" }, button("Open the map", () => ctx.go("map"), "btn primary"))
      )
    );
    return { el };
  }
  const selectedId = ctx.params.business ?? businesses[0].id;
  const selected = businessById(state, selectedId) ?? businesses[0];
  const list = h("div", { class: "list", style: "margin-bottom:14px" });
  for (const business of businesses) {
    const type = businessTypeOrThrow(business.typeId);
    const building = state.buildings.find((b) => b.id === business.buildingId);
    const yesterday = business.yesterday;
    const profit = yesterday.revenue - (yesterday.cogs + yesterday.wages + yesterday.rent + yesterday.marketing + yesterday.otherCosts);
    list.appendChild(
      h(
        "div",
        {
          class: `card clickable${business.id === selected.id ? "" : ""}`,
          style: business.id === selected.id ? "border-color:var(--accent-2)" : "",
          on: { click: () => ctx.go("businesses", { business: business.id }) }
        },
        h(
          "div",
          { class: "card-head" },
          h(
            "div",
            {},
            h("div", { class: "card-title", text: `${type.icon} ${business.name}` }),
            h("div", {
              class: "card-sub",
              text: `${building?.address ?? ""} \xB7 ${building ? district(building.district).name : ""}`
            })
          ),
          h("span", {
            class: `tag ${business.status === "open" ? "good" : business.status === "setup" ? "warn" : ""}`,
            text: business.status === "setup" ? "Not open" : business.status
          })
        ),
        h(
          "div",
          { style: "display:flex;gap:16px;flex-wrap:wrap;font-size:12px" },
          h("span", { class: "muted", text: `Today: ${money(business.today.revenue)}` }),
          h("span", { class: "muted", text: `Customers: ${count(business.today.customers)}` }),
          h("span", {
            class: profit >= 0 ? "good" : "bad",
            text: `Yesterday: ${moneySigned(profit)}`
          })
        )
      )
    );
  }
  el.appendChild(list);
  el.appendChild(detailPanel(ctx, selected));
  return { el };
}
function detailPanel(ctx, business) {
  const state = ctx.state;
  const type = businessTypeOrThrow(business.typeId);
  const building = state.buildings.find((b) => b.id === business.buildingId);
  const staff = employeesOf(state, business.id);
  const power = staffPower(state, business);
  const host = h("div", {});
  const actions = h("div", { class: "btn-row" });
  if (business.status === "open") {
    actions.appendChild(
      button("Close temporarily", () => {
        const result = closeBusiness(state, business.id);
        toast(result.message, "info");
        ctx.refresh();
      })
    );
  } else {
    actions.appendChild(
      button(
        "Open for business",
        () => {
          const result = openBusiness(state, business.id);
          toast(result.message, result.ok ? "good" : "bad");
          if (result.ok) {
            if (state.speed === 0) ctx.engine.setSpeed(2);
            ctx.refresh();
          }
        },
        "btn primary"
      )
    );
  }
  actions.appendChild(button("Order stock", () => ctx.go("inventory", { business: business.id })));
  actions.appendChild(button("Hire staff", () => ctx.go("employees", { business: business.id })));
  if (building) actions.appendChild(button("Show on map", () => ctx.go("map", { building: building.id })));
  actions.appendChild(
    button(
      "Shut down",
      async () => {
        const ok = await confirmDialog(
          "Shut this business down?",
          `Staff are paid off, remaining stock is cleared at half its cost, and ${business.name} is gone for good. The premises stay yours.`,
          "Shut it down"
        );
        if (!ok) return;
        const result = shutDownBusiness(state, business.id);
        toast(result.message, "info");
        ctx.go("businesses");
      },
      "btn danger"
    )
  );
  host.appendChild(
    section(
      "Overview",
      h(
        "div",
        { class: "grid cols-3" },
        h(
          "div",
          {},
          stat("Type", type.name),
          stat("Location", building?.address ?? "\u2014"),
          stat("District", building ? district(building.district).name : "\u2014"),
          stat("Opened", business.openedOnDay > 0 ? `Day ${business.openedOnDay}` : "Not yet")
        ),
        h(
          "div",
          {},
          statWithHint(
            "Reputation",
            `${Math.round(business.reputation)}/100`,
            "How well regarded the business is. It follows your review scores over time and feeds straight back into how many people walk in."
          ),
          stat("Reviews", `${business.reviewScore.toFixed(1)}\u2605 (${count(business.reviewCount)})`),
          statWithHint(
            "Service quality",
            `${Math.round(business.serviceQuality)}/100`,
            "How well the place is being run right now: the skill, morale and number of people on the floor today. It moves reviews within days.",
            business.serviceQuality < 45 ? "bad" : void 0
          ),
          statWithHint(
            "Awareness",
            pct(business.awareness),
            "The share of the district that knows this business exists. It grows slowly from customers who have been in, and quickly from marketing."
          )
        ),
        h(
          "div",
          {},
          stat("Staff", `${staff.length}`),
          stat("Can serve", `${Math.round(hourlyCapacity(state, business))}/hour`),
          stat("Market share", pct(marketShare(state, business.id) * 100, 1)),
          stat("Gross margin", pct(grossMargin(business) * 100))
        )
      ),
      actions
    )
  );
  host.appendChild(managementPanel(ctx, business));
  const notes = adviceFor(state, business);
  if (notes.length > 0) {
    const panel = section("What is holding this back");
    for (const item of notes.slice(0, 4)) {
      panel.appendChild(
        h(
          "button",
          {
            class: `advice-row ${item.severity} clickable-row`,
            on: { click: () => ctx.go(item.route, item.params) }
          },
          h("span", { class: `advice-dot ${item.severity}` }),
          h(
            "div",
            { style: "flex:1;min-width:0;text-align:left" },
            h("div", { class: "advice-headline", text: item.headline }),
            h("div", { class: "advice-detail", text: item.detail }),
            h("div", { class: "advice-action", text: `\u2192 ${item.action}` })
          ),
          h("span", { class: "row-chevron", text: "\u203A" })
        )
      );
    }
    host.appendChild(panel);
  } else if (business.status === "open") {
    host.appendChild(
      section(
        "What is holding this back",
        h("p", { class: "tiny muted", text: "Nothing. Stock, staffing, pricing and reputation all look healthy here." })
      )
    );
  }
  const today = business.today;
  const yesterday = business.yesterday;
  const yesterdayProfit = yesterday.revenue - (yesterday.cogs + yesterday.wages + yesterday.rent + yesterday.marketing + yesterday.otherCosts);
  host.appendChild(
    h(
      "div",
      { class: "grid cols-2" },
      section(
        "Today so far",
        stat("Customers served", count(today.customers)),
        stat("Turned away", count(today.lostCustomers), today.lostCustomers > today.customers * 0.15 ? "bad" : "muted"),
        stat("Revenue", money(today.revenue)),
        stat("Units sold", count(today.units))
      ),
      section(
        "Yesterday",
        stat("Revenue", money(yesterday.revenue)),
        stat("Cost of goods", money(-yesterday.cogs)),
        stat("Wages", money(-yesterday.wages)),
        stat("Rent & utilities", money(-(yesterday.rent + yesterday.otherCosts))),
        stat("Marketing", money(-yesterday.marketing)),
        stat("Profit", moneySigned(yesterdayProfit), yesterdayProfit >= 0 ? "good" : "bad")
      )
    )
  );
  if (type.productIds.length > 0) {
    const rows = type.productIds.map((productId) => {
      const def = product(productId);
      if (!def) return [];
      const price = business.prices[productId] ?? def.marketPrice;
      const cost = business.costBasis[productId] ?? def.wholesalePrice;
      const margin = price > 0 ? (price - cost) / price : 0;
      const input = numberInput(
        Number(price.toFixed(2)),
        (value) => {
          setPrice(state, business.id, productId, value);
          ctx.refresh();
        },
        { step: "0.05", min: "0.05" }
      );
      return [
        def.name,
        moneyCents(cost),
        input,
        h("span", { class: margin < 0.1 ? "bad" : margin > 0.4 ? "good" : "", text: pct(margin * 100) }),
        count(business.stock[productId] ?? 0),
        count(business.incoming[productId] ?? 0)
      ];
    });
    host.appendChild(
      section(
        "Products and pricing",
        table(["Product", "Cost", "Your price", "Margin", "In stock", "On order"], rows),
        priceAnalysis(ctx, business)
      )
    );
  } else {
    const fee = business.prices.service ?? type.serviceFee;
    host.appendChild(
      section(
        "Service pricing",
        h(
          "label",
          { class: "field" },
          h("span", { text: "Fee per job" }),
          numberInput(Number(fee.toFixed(2)), (value) => {
            setPrice(state, business.id, "service", value);
            ctx.refresh();
          }, { step: "1", min: "1" })
        ),
        priceAnalysis(ctx, business)
      )
    );
  }
  host.appendChild(crowdPanel(ctx, business));
  host.appendChild(reviewPanel(ctx, business));
  host.appendChild(competitivePanel(ctx, business));
  const staffRows = staff.map((employee) => [
    employee.name,
    role(employee.role).name,
    `${Math.round(employee.skill)}`,
    `${Math.round(employee.morale)}`,
    money(employee.salary)
  ]);
  host.appendChild(
    h(
      "div",
      { class: "grid cols-2" },
      section(
        "Team",
        staff.length === 0 ? empty("Nobody works here yet. Without staff you can serve about four customers an hour yourself.") : table(["Name", "Role", "Skill", "Morale", "Salary"], staffRows),
        h("p", {
          class: "tiny muted",
          text: `Present today: ${power.present} of ${power.headcount}. Capacity ${Math.round(hourlyCapacity(state, business))} customers/hour.`
        }),
        h("div", { class: "btn-row" }, button("Manage staff", () => ctx.go("employees", { business: business.id })))
      ),
      section(
        "Operations",
        h(
          "label",
          { class: "field" },
          h("span", { text: "Opening hour" }),
          numberInput(business.openFrom, (value) => {
            setHours(state, business.id, value, business.openTo);
            ctx.refresh();
          }, { min: "0", max: "23", step: "1" })
        ),
        h(
          "label",
          { class: "field" },
          h("span", { text: "Closing hour" }),
          numberInput(business.openTo, (value) => {
            setHours(state, business.id, business.openFrom, value);
            ctx.refresh();
          }, { min: "1", max: "24", step: "1" })
        ),
        h(
          "label",
          { class: "field" },
          h("span", { text: "Marketing budget per day" }),
          numberInput(business.marketingBudget, (value) => {
            setMarketingBudget(state, business.id, value);
            ctx.refresh();
          }, { min: "0", step: "10" })
        ),
        building ? stat(
          "Storage used",
          `${Math.round(storageUsed(business))} / ${count(building.storageCapacity)}`,
          storageUsed(business) > building.storageCapacity * 0.9 ? "bad" : void 0
        ) : null,
        h("p", {
          class: "tiny muted",
          text: "Longer hours reach more customers but cost more in wages. Marketing raises awareness, which fades if you stop."
        })
      )
    )
  );
  return host;
}
function reviewPanel(ctx, business) {
  const reviews = reviewsFor(ctx.state, business.id, 6);
  const complaint = topComplaint(ctx.state, business.id);
  const panel = section("Customer reviews");
  panel.appendChild(
    h(
      "div",
      { class: "review-summary" },
      h("div", { class: "review-score", text: business.reviewScore.toFixed(1) }),
      h(
        "div",
        {},
        h("div", { class: "review-stars", text: stars(business.reviewScore) }),
        h("div", { class: "tiny muted", text: `${business.reviewCount.toLocaleString("en-GB")} reviews` }),
        complaint ? h("div", {
          class: "tiny bad",
          text: `Most common complaint: ${DRIVER_LABELS[complaint.driver]} (${complaint.count} of the last few).`
        }) : null
      )
    )
  );
  if (reviews.length === 0) {
    panel.appendChild(empty("Nobody has left a review yet. Serve a few more customers."));
    return panel;
  }
  for (const review of reviews) {
    panel.appendChild(
      h(
        "div",
        { class: "review-row" },
        h("span", { class: `review-row-stars${review.stars >= 4 ? " good" : review.stars <= 2 ? " bad" : ""}`, text: stars(review.stars) }),
        h(
          "div",
          { style: "flex:1;min-width:0" },
          h("div", { class: "review-text", text: `\u201C${review.text}\u201D` }),
          h("div", { class: "tiny muted", text: `Day ${review.day} \xB7 on ${DRIVER_LABELS[review.driver]}` })
        )
      )
    );
  }
  return panel;
}
function stars(score) {
  const filled = Math.max(0, Math.min(5, Math.round(score)));
  return "\u2605".repeat(filled) + "\u2606".repeat(5 - filled);
}
function managementPanel(ctx, business) {
  const state = ctx.state;
  const plan = staffingSummary(state, business);
  const panel = section(`The team \u2014 ${plan.size.name.toLowerCase()} business`);
  panel.appendChild(
    h(
      "div",
      { class: "grid cols-4" },
      statWithHint(
        "People",
        `${plan.current}`,
        "Everybody on the payroll at this location."
      ),
      statWithHint(
        "The trade needs",
        `${plan.required}`,
        "How many it takes to serve the customers this shop is actually getting, at the pace one person works and the hours the doors are open.",
        plan.shortage > 0 ? "bad" : void 0
      ),
      statWithHint(
        "Comfortable at",
        `${plan.recommended}`,
        "Enough to cover peaks, holidays and somebody being off sick without turning customers away."
      ),
      statWithHint(
        "Workload",
        `${Math.round(plan.workload)}%`,
        "How hard the team was worked yesterday. Above eighty they start making mistakes, getting ill, and leaving.",
        plan.workload > 82 ? "bad" : plan.workload < 45 ? "muted" : void 0
      )
    )
  );
  const rows = h("div", { style: "margin-top:10px" });
  for (const row2 of plan.rows) {
    const short = row2.current < row2.required;
    const spare = row2.current > row2.recommended;
    rows.appendChild(
      h(
        "div",
        { class: "staff-row" },
        h("span", { class: `finding-dot ${short ? "bad" : spare ? "warn" : "good"}` }),
        h(
          "div",
          { style: "flex:1;min-width:0" },
          h("div", { class: "staff-name", text: row2.name }),
          h("div", {
            class: "sub",
            text: row2.fit === null ? "nobody in the seat" : `${fitLabel(row2.fit)} \u2014 fit ${Math.round(row2.fit)}/100`
          })
        ),
        h("span", { class: "staff-count", text: `${row2.current} of ${row2.required} \xB7 ${row2.recommended} ideal` }),
        h("span", {
          class: `staff-gap ${short ? "bad" : spare ? "warn" : "good"}`,
          text: short ? `${row2.required - row2.current} short` : spare ? `${row2.current - row2.recommended} spare` : "covered"
        })
      )
    );
  }
  panel.appendChild(rows);
  const size = sizeOf(state, business);
  const bigger = nextSize(size);
  const scale = h("div", { class: "scale-strip" });
  for (const step of SIZES) {
    scale.appendChild(
      h(
        "div",
        { class: `scale-step${step.id === size.id ? " here" : ""}${step.from <= size.from ? " reached" : ""}` },
        h("span", { class: "scale-name", text: step.name }),
        h("span", { class: "scale-from", text: step.from === 0 ? "from 1" : `from ${step.from}` }),
        h("span", { class: "scale-bar" })
      )
    );
  }
  panel.appendChild(h("div", { class: "sub", style: "margin-top:14px", text: "Where this business has got to" }));
  panel.appendChild(scale);
  panel.appendChild(
    h("p", {
      class: "tiny muted",
      style: "margin:6px 0 0",
      text: bigger ? `${size.detail} ${Math.max(1, bigger.from - plan.current)} more ${bigger.from - plan.current === 1 ? "person" : "people"} and this is a ${bigger.name.toLowerCase()} business \u2014 which is not this one several times over. ${bigger.detail}` : `${size.detail} There is nothing bigger than this.`
    })
  );
  const load = supervisionLoad(state, business);
  const capacity = supervisionCapacity(state, business);
  const cover2 = plan.managementCover;
  panel.appendChild(h("div", { class: "sub", style: "margin-top:14px", text: "Management cover" }));
  panel.appendChild(bar(Math.min(1, cover2), cover2 >= 1 ? "good" : cover2 > 0.6 ? "warn" : "bad"));
  panel.appendChild(
    h("p", {
      class: "tiny muted",
      style: "margin:6px 0 0",
      text: load <= 0 ? "Nobody here needs managing yet \u2014 you are the management, which is exactly what a small business is." : `${Math.round(load)} ${Math.round(load) === 1 ? "person needs" : "people need"} managing, weighted by who they are, and the grades on this payroll cover about ${Math.round(capacity)}. A Team Lead covers 5, a Manager 11, an Executive 34.${cover2 < 1 ? ` Everything still happens, about ${Math.round((1 - managementFactor(state, business)) * 100)}% slower.` : ""}`
    })
  );
  const chart = orgChart(state, business);
  if (chart.length > 0 && plan.current > 1) {
    panel.appendChild(h("div", { class: "sub", style: "margin-top:14px", text: "Who answers to whom" }));
    const tree = h("div", { class: "org-tree" });
    const draw2 = (node2, depth) => {
      const grade2 = gradeOf(node2.person);
      tree.appendChild(
        h(
          "div",
          { class: `org-node depth-${Math.min(depth, 3)}${depth === 0 ? " top" : ""}` },
          h("span", { class: "org-name", text: node2.person.name }),
          h("span", {
            class: "org-role",
            text: grade2.span > 0 ? `${titleOf(node2.person)} \xB7 covers ${grade2.span}` : titleOf(node2.person)
          })
        )
      );
      for (const child of node2.reports) draw2(child, depth + 1);
    };
    for (const root2 of chart) draw2(root2, 0);
    panel.appendChild(tree);
    panel.appendChild(
      h("p", {
        class: "tiny muted",
        style: "margin:6px 0 0",
        text: "Read from grade and department rather than stored, so the chart can never disagree with the payroll. Promote somebody and it changes \u2014 there is nothing here to drag about."
      })
    );
  }
  const departments = departmentsOf(state, business);
  if (departments.length > 0) {
    panel.appendChild(h("div", { class: "sub", style: "margin-top:12px", text: "Departments" }));
    for (const row2 of departments) {
      panel.appendChild(
        h(
          "div",
          { class: "staff-row" },
          h(
            "div",
            { style: "flex:1;min-width:0" },
            h("div", { class: "staff-name", text: row2.name }),
            h("div", { class: "sub", text: row2.detail })
          ),
          h("span", { class: "staff-count", text: `${row2.people.length} \xB7 ${money(row2.payroll)}/mo` }),
          h("span", {
            class: `staff-gap ${row2.performance > 66 ? "good" : row2.performance < 42 ? "bad" : ""}`,
            text: `${Math.round(row2.performance)}%`
          })
        )
      );
    }
  }
  const problems = findings(state, business);
  const chances = opportunities(state, business);
  if (problems.length > 0 || chances.length > 0) {
    panel.appendChild(h("div", { class: "sub", style: "margin-top:12px", text: "What to do about it" }));
    for (const item of [...problems, ...chances]) {
      panel.appendChild(
        h(
          "div",
          { class: "finding" },
          h("span", { class: `finding-dot ${item.level}` }),
          h(
            "div",
            { style: "flex:1;min-width:0" },
            h("div", { class: "finding-title", text: item.title }),
            h("div", { class: "sub", text: item.detail })
          )
        )
      );
    }
  }
  panel.appendChild(
    h(
      "div",
      { class: "row", style: "margin-top:10px" },
      button("Manage the people here", () => ctx.go("employees", { business: business.id }), "btn primary")
    )
  );
  return panel;
}
function priceAnalysis(ctx, business) {
  const state = ctx.state;
  const type = businessTypeOrThrow(business.typeId);
  const steps = [0.8, 0.9, 1, 1.1, 1.25, 1.5];
  const current = priceIndex(business);
  const rows = steps.map((factor2) => {
    const overrides = {};
    for (const productId of type.productIds) {
      const def = product(productId);
      if (!def) continue;
      overrides[productId] = (business.prices[productId] ?? def.marketPrice) * factor2;
    }
    if (type.serviceFee > 0) {
      overrides.service = (business.prices.service ?? type.serviceFee) * factor2;
    }
    const customers = estimateDailyCustomers(state, business, overrides);
    const perCustomer = revenuePerCustomer(business, factor2);
    const cogs = costPerCustomer(business);
    const gross = customers * (perCustomer - cogs);
    return {
      factor: factor2,
      customers,
      revenue: customers * perCustomer,
      gross
    };
  });
  const best = rows.reduce((a, b) => b.gross > a.gross ? b : a, rows[0]);
  return h(
    "div",
    {},
    h("h4", { class: "panel-title", style: "margin-top:14px", text: "What happens if you change price" }),
    table(
      ["Price", "Est. customers/day", "Est. revenue/day", "Est. gross profit/day"],
      rows.map((row2) => [
        h("span", {
          class: row2.factor === 1 ? "tag accent" : "",
          text: row2.factor === 1 ? "Current" : `${row2.factor > 1 ? "+" : ""}${Math.round((row2.factor - 1) * 100)}%`
        }),
        count(row2.customers),
        money(row2.revenue),
        h("span", { class: row2 === best ? "good" : "", text: money(row2.gross) })
      ])
    ),
    h("p", {
      class: "tiny muted",
      text: `You are currently charging ${Math.round(current * 100)}% of the market price. These are estimates at today's demand; competitors will react to a big move.`
    })
  );
}
function revenuePerCustomer(business, factor2) {
  const type = businessTypeOrThrow(business.typeId);
  let total2 = type.serviceFee > 0 ? (business.prices.service ?? type.serviceFee) * factor2 : 0;
  const defs = type.productIds.map((id) => product(id)).filter((d) => Boolean(d));
  const appeal = sum(defs, (d) => d.appeal);
  if (appeal <= 0) return total2;
  for (const def of defs) {
    const price = (business.prices[def.id] ?? def.marketPrice) * factor2;
    total2 += def.appeal / appeal * def.unitsPerBasket * price;
  }
  return total2;
}
function costPerCustomer(business) {
  const type = businessTypeOrThrow(business.typeId);
  const defs = type.productIds.map((id) => product(id)).filter((d) => Boolean(d));
  const appeal = sum(defs, (d) => d.appeal);
  if (appeal <= 0) return 0;
  let total2 = 0;
  for (const def of defs) {
    const cost = business.costBasis[def.id] ?? def.wholesalePrice;
    total2 += def.appeal / appeal * def.unitsPerBasket * cost;
  }
  return total2;
}
function competitivePanel(ctx, business) {
  const state = ctx.state;
  const own = attractiveness(state, business);
  const rivals = rivalsOf(state, business);
  const panel = section("Competitive position");
  panel.appendChild(
    h("p", {
      class: "tiny muted",
      text: rivals.length === 0 ? "Nobody else in this district sells what you sell. Enjoy it while it lasts." : `${rivals.length} rival${rivals.length === 1 ? "" : "s"} compete for the same customers here.`
    })
  );
  for (const factor2 of own.factors) {
    const relative = clamp(factor2.value / 2, 0, 1);
    panel.appendChild(
      h(
        "div",
        { style: "margin:8px 0" },
        h(
          "div",
          { style: "display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px" },
          h("span", { text: factor2.label }),
          h("span", { class: "muted", text: factor2.hint })
        ),
        bar(relative, factor2.value >= 1.05 ? "good" : factor2.value < 0.85 ? "bad" : "")
      )
    );
  }
  if (rivals.length > 0) {
    panel.appendChild(
      table(
        ["Competitor", "Owner", "Price level", "Reviews", "Pull"],
        rivals.map((rival) => {
          const owner = state.companies.find((c) => c.id === rival.companyId);
          const score = attractiveness(state, rival).score;
          const total2 = own.score + sum(rivals, (r) => attractiveness(state, r).score);
          return [
            rival.name,
            owner?.name ?? "\u2014",
            pct(priceIndex(rival) * 100),
            `${rival.reviewScore.toFixed(1)}\u2605`,
            pct(score / Math.max(1e-4, total2) * 100)
          ];
        })
      )
    );
  }
  return panel;
}
function crowdPanel(ctx, business) {
  const state = ctx.state;
  const building = state.buildings.find((b) => b.id === business.buildingId);
  const type = businessTypeOrThrow(business.typeId);
  const panel = section("Who comes in");
  const served = normaliseMix(business.yesterdayMix);
  const total2 = SEGMENTS.reduce((acc, s) => acc + served[s.id], 0);
  const catchment = building ? districtMix(district(building.district), type.category) : null;
  if (total2 <= 0) {
    panel.appendChild(
      empty(
        catchment ? `Nobody yesterday. The district around you is mostly ${leadingSegment(catchment).name.toLowerCase()}.` : "Nobody yesterday."
      )
    );
  }
  for (const seg of SEGMENTS) {
    const share = served[seg.id] ?? 0;
    const local = catchment ? catchment[seg.id] : 0;
    if (share < 0.01 && local < 0.04) continue;
    panel.appendChild(
      h(
        "div",
        { style: "margin:9px 0" },
        h(
          "div",
          { style: "display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;gap:10px" },
          h("span", {}, seg.name, hint(seg.description)),
          h("span", {
            class: share > local * 1.15 ? "good" : share < local * 0.85 ? "bad" : "muted",
            text: `${pct(share * 100)} of your customers \xB7 ${pct(local * 100)} of the district`
          })
        ),
        bar(share, share > local * 1.15 ? "good" : share < local * 0.85 ? "bad" : "")
      )
    );
  }
  if (total2 > 0) {
    const lead = leadingSegment(served);
    const spend = basketFactor(served);
    panel.appendChild(
      h("p", {
        class: "tiny muted",
        style: "margin-top:10px",
        text: `Mostly ${lead.name.toLowerCase()}. ${lead.description} This crowd spends about ${pct(spend * 100)} of what an average Northgate customer does, which is already in your takings.`
      })
    );
  }
  if (catchment) {
    const missing = SEGMENTS.filter((seg) => catchment[seg.id] > 0.12 && (served[seg.id] ?? 0) < catchment[seg.id] * 0.6);
    if (missing.length > 0 && total2 > 0) {
      panel.appendChild(
        h("p", {
          class: "tiny bad",
          text: `You are under-trading with ${missing.map((m) => m.name.toLowerCase()).join(" and ")} compared with who lives here. Opening hours, price and the state of the place are what decide that.`
        })
      );
    }
  }
  return panel;
}

// src/ui/views/employees.ts
function employeesView(ctx) {
  const el = h("div", { class: "view" });
  const state = ctx.state;
  const businesses = playerBusinesses(state);
  el.appendChild(
    h(
      "div",
      { class: "view-head" },
      h("h1", { text: "Employees" }),
      h("p", {
        text: `${state.employees.length} on the payroll \xB7 ${money(sum(state.employees, (e) => e.salary))}/month`
      })
    )
  );
  if (businesses.length === 0) {
    el.appendChild(section("No businesses", empty("Create a business before hiring anyone.")));
    return { el };
  }
  const selectedId = ctx.params.business ?? businesses[0].id;
  const business = businessById(state, selectedId) ?? businesses[0];
  const staff = employeesOf(state, business.id);
  const capacity = staffCapacityOf(business);
  el.appendChild(
    section(
      "Location",
      select(
        businesses.map((b) => ({ value: b.id, label: b.name })),
        business.id,
        (value) => ctx.go("employees", { business: value })
      ),
      h(
        "div",
        { class: "grid cols-3", style: "margin-top:12px" },
        stat("Team size", `${staff.length} / ${capacity}`),
        stat("Wage bill", `${money(sum(staff, (e) => e.salary))}/mo`),
        stat("Average morale", staff.length ? `${Math.round(sum(staff, (e) => e.morale) / staff.length)}/100` : "\u2014")
      )
    )
  );
  const teamPanel = section("Your team");
  if (staff.length === 0) {
    teamPanel.appendChild(
      empty("Nobody works here. Without staff you can serve about four customers an hour yourself, which is not a business.")
    );
  } else {
    teamPanel.appendChild(
      table(
        ["Name", "Role", "Skill", "Morale", "Stress", "Salary", ""],
        staff.map((employee) => [
          h(
            "div",
            {},
            h("div", { text: employee.name }),
            h("div", {
              class: "tiny muted",
              text: employee.traits.map((t) => trait(t).name).join(", ") || "No notable traits"
            })
          ),
          h(
            "div",
            {},
            h("div", { text: roleTitle(employee) }),
            sickDaysLeft(state, employee) > 0 ? h("span", { class: "tag warn", text: `Off sick \xB7 ${sickDaysLeft(state, employee)}d` }) : employee.trainingEndsOnDay !== null ? h("span", { class: "tag", text: "On a course" }) : quotePromotion(state, employee).blocked === null ? h("span", { class: "tag accent", text: "Ready to step up" }) : null
          ),
          `${Math.round(employee.skill)}`,
          h("span", {
            class: employee.morale < 40 ? "bad" : employee.morale > 70 ? "good" : "",
            text: `${Math.round(employee.morale)}`
          }),
          h("span", { class: employee.stress > 65 ? "bad" : "", text: `${Math.round(employee.stress)}` }),
          h(
            "div",
            {},
            h("div", { text: money(employee.salary) }),
            h("div", { class: "tiny muted", text: `${money(dailyWage(employee))}/day` })
          ),
          button("Manage", () => openEmployeeDialog(ctx, employee), "btn small")
        ])
      )
    );
    teamPanel.appendChild(
      h("p", {
        class: "tiny muted",
        text: "Morale falls when pay is below the market rate or the team is stretched. Below 38 people start looking elsewhere."
      })
    );
  }
  el.appendChild(teamPanel);
  const applicants = applicantsFor(state, business);
  const applicantPanel = section("Applicants");
  applicantPanel.appendChild(
    h("p", {
      class: "tiny muted",
      text: `${businessTypeOrThrow(business.typeId).name} uses these roles: ${businessTypeOrThrow(business.typeId).roles.map((r) => role(r).name).join(", ")}. It lives on ${businessTypeOrThrow(business.typeId).keySkills.map((id) => SKILLS.find((s) => s.id === id)?.name.toLowerCase() ?? id).join(" and ")}, so that is what the ranking below is sorted on. Recruitment costs ${money(RECRUITMENT_FEE)} plus a week of wages up front.`
    })
  );
  if (applicants.length === 0) {
    applicantPanel.appendChild(empty("Nobody suitable applied today. The pool refreshes each day."));
  } else {
    const type = businessTypeOrThrow(business.typeId);
    const ranked = [...applicants].sort((a, b) => tradeFitOf(b, type) - tradeFitOf(a, type));
    applicantPanel.appendChild(
      table(
        ["Name", "Role", "Suits this trade", "Skill", "Traits", "Asking salary", ""],
        ranked.map((applicant) => [
          h(
            "div",
            {},
            h("div", { text: applicant.name }),
            h("div", { class: "tiny muted", text: `${applicant.age}, ${titleOf(applicant).toLowerCase()}` })
          ),
          role(applicant.role).name,
          h(
            "div",
            { style: "min-width:120px" },
            h("div", {
              class: "tiny",
              text: `${Math.round(tradeFitOf(applicant, type))} \xB7 ${type.keySkills.map((id) => SKILLS.find((s) => s.id === id)?.name.toLowerCase() ?? id).join(", ")}`
            }),
            bar(tradeFitOf(applicant, type) / 100, tradeFitOf(applicant, type) > 62 ? "good" : tradeFitOf(applicant, type) < 38 ? "bad" : "")
          ),
          skillCell(applicant.skill),
          h("div", { class: "tiny muted", text: applicant.traits.map((t) => trait(t).name).join(", ") }),
          money(applicant.salary),
          button(
            "Hire",
            () => {
              const result = hire(state, applicant.id, business.id);
              toast(result.message, result.ok ? "good" : "bad");
              if (result.ok) ctx.refresh();
            },
            "btn small primary"
          )
        ])
      )
    );
  }
  el.appendChild(applicantPanel);
  if (state.employees.length > 0) {
    const byRole = ROLES.map((roleDef) => ({
      label: roleDef.name,
      value: state.employees.filter((e) => e.role === roleDef.id).length
    })).filter((row2) => row2.value > 0);
    el.appendChild(
      section(
        "Across the company",
        table(
          ["Role", "People", "Average skill", "Average morale", "Monthly cost"],
          byRole.map((row2) => {
            const people2 = state.employees.filter((e) => role(e.role).name === row2.label);
            return [
              row2.label,
              String(people2.length),
              `${Math.round(sum(people2, (e) => e.skill) / people2.length)}`,
              `${Math.round(sum(people2, (e) => e.morale) / people2.length)}`,
              money(sum(people2, (e) => e.salary))
            ];
          })
        )
      )
    );
  }
  return { el };
}
function skillCell(value) {
  return h(
    "div",
    { style: "min-width:70px" },
    h("div", { class: "tiny", text: String(Math.round(value)) }),
    bar(value / 100, value > 70 ? "good" : value < 40 ? "bad" : "")
  );
}
function figure(label, value, caption, inverted = false) {
  const good = inverted ? value < 62 : value > 66;
  const bad = inverted ? value > 82 : value < 38;
  return h(
    "div",
    { class: "profile-figure" },
    h("span", { class: "profile-figure-label", text: label }),
    h("span", { class: `profile-figure-value${good ? " good" : bad ? " bad" : ""}`, text: `${Math.round(value)}%` }),
    bar(value / 100, good ? "good" : bad ? "bad" : ""),
    h("span", { class: "sub", text: caption })
  );
}
function openEmployeeDialog(ctx, employee) {
  const state = ctx.state;
  const { body, footer, close } = modal({ title: employee.name, width: 520 });
  const businesses = playerBusinesses(state);
  const performance2 = performanceOf(employee);
  const fit = roleFit(employee.skills, employee.role);
  const site = employee.businessId ? state.businesses.find((b) => b.id === employee.businessId)?.name ?? (state.headOffice?.id === employee.businessId ? state.headOffice.name : null) ?? state.warehouses.find((w) => w.id === employee.businessId)?.name ?? null : null;
  body.appendChild(
    h(
      "div",
      { class: "panel profile-head" },
      h(
        "div",
        {},
        h("div", { class: "profile-role", text: roleTitle(employee) }),
        h("div", { class: "sub", text: `${department(departmentOf(employee.role)).name}${site ? ` \xB7 ${site}` : " \xB7 not posted anywhere"}` })
      ),
      h(
        "div",
        { class: "profile-figures" },
        figure("Performance", performance2, performanceLabel(performance2)),
        figure("Morale", employee.morale, employee.morale < 40 ? "At risk" : employee.morale > 72 ? "Happy" : "Settled"),
        figure("Workload", employee.workload, employee.workload > 82 ? "Flat out" : employee.workload > 62 ? "Busy" : "Comfortable", true)
      )
    )
  );
  const skillPanel = h(
    "div",
    { class: "panel" },
    h("h3", { class: "panel-title", text: "Skills" }),
    h("p", {
      class: "tiny muted",
      style: "margin:-4px 0 10px",
      text: `${fitLabel(fit)} \u2014 they fit ${role(employee.role).name.toLowerCase()} ${Math.round(fit)}/100. What the job leans on is marked.`
    })
  );
  const weights = ROLE_SKILLS[employee.role];
  for (const def of SKILLS) {
    const weight = weights[def.id] ?? 0;
    const value = employee.skills[def.id] ?? 0;
    skillPanel.appendChild(
      h(
        "div",
        { class: `skill-row${weight > 0.2 ? " wanted" : ""}` },
        h(
          "div",
          { class: "skill-head" },
          h("span", { class: "skill-name", text: def.name }),
          weight > 0.2 ? h("span", { class: "skill-tag", text: "this job" }) : null,
          h("span", { class: "skill-value", text: String(Math.round(value)) })
        ),
        bar(value / 100, value > 70 ? "good" : value < 35 ? "bad" : "")
      )
    );
  }
  body.appendChild(skillPanel);
  body.appendChild(
    h(
      "div",
      { class: "panel" },
      h("h3", { class: "panel-title", text: "The rest of the file" }),
      stat("Age", String(employee.age)),
      stat("Overall level", `${Math.round(employee.skill)}/100`),
      stat("Years in the trade", employee.experience.toFixed(1)),
      stat("Productivity", `${Math.round(employee.productivity)}/100`),
      stat("Reliability", `${Math.round(employee.reliability)}/100`),
      stat("Stress", `${Math.round(employee.stress)}/100`, employee.stress > 65 ? "bad" : void 0),
      stat("Loyalty", `${Math.round(employee.loyalty)}/100`),
      stat("Courses completed", String(employee.trainingDays)),
      stat("Grade", `${gradeOf(employee).n} of 6 \u2014 ${gradeOf(employee).name}`),
      stat("Promotions", String(employee.promotions)),
      stat("Salary", `${money(employee.salary)}/mo`),
      sickDaysLeft(state, employee) > 0 ? stat("Off sick", `back on day ${employee.sickUntilDay}`, "bad") : stat("At work", "yes", "muted")
    )
  );
  if (employee.traits.length > 0) {
    const traits = h("div", { class: "panel" }, h("h3", { class: "panel-title", text: "Traits" }));
    for (const id of employee.traits) {
      const def = trait(id);
      traits.appendChild(
        h("div", { class: "stat" }, h("span", { class: "stat-label", text: def.name }), h("span", { class: "stat-value muted", text: def.effect }))
      );
    }
    body.appendChild(traits);
  }
  const quote = quotePromotion(state, employee);
  const bonus = Math.round(employee.salary * BONUS_MONTHS / 10) * 10;
  const here = gradeOf(employee);
  const career = h("div", { class: "panel" }, h("h3", { class: "panel-title", text: "Where they can get to" }));
  for (const step of GRADES) {
    const isHere = step.n === here.n;
    const done = step.n < here.n;
    const wall = step.n > here.n ? gradeBlocker(employee, step) : null;
    career.appendChild(
      h(
        "div",
        { class: `ladder-row${isHere ? " here" : ""}${done ? " done" : ""}` },
        h("span", {
          class: "ladder-name",
          text: isHere ? titleOf(employee) : step.n === 0 ? "Junior" : step.name
        }),
        h("span", {
          class: `ladder-state${wall && step.n === here.n + 1 ? " bad" : ""}`,
          text: done ? "done" : isHere ? "here" : step.leadership > 0 ? `needs leadership ${step.leadership}${step.n === here.n + 1 ? ` \u2014 they are on ${Math.round(employee.skills.leadership)}` : ""}` : `needs an overall level of ${step.skill}`
        })
      )
    );
  }
  career.appendChild(
    h("p", {
      class: "tiny muted",
      style: "margin:8px 0",
      text: quote.blocked ?? `Promoting them to ${quote.title} costs ${money(quote.extra)} more a month and buys real loyalty.`
    })
  );
  if (!quote.blocked && quote.role !== employee.role) {
    career.appendChild(
      h("p", {
        class: "tiny warn",
        style: "margin:0 0 8px",
        text: `That is a different job, not a bigger version of this one \u2014 ${employee.name} would stop doing what they are currently the best in the building at.`
      })
    );
  }
  const careerRow = h("div", { class: "btn-row" });
  const promoteBtn = button(
    quote.blocked ? "Promote" : `Promote to ${quote.title}`,
    () => {
      const result = promote(state, employee.id);
      toast(result.message, result.ok ? "good" : "bad");
      close();
      ctx.refresh();
    },
    "btn primary"
  );
  if (quote.blocked) promoteBtn.disabled = true;
  careerRow.appendChild(promoteBtn);
  careerRow.appendChild(
    button(`Pay a ${money(bonus)} bonus`, () => {
      const result = payBonus(state, employee.id);
      toast(result.message, result.ok ? "good" : "bad");
      close();
      ctx.refresh();
    })
  );
  career.appendChild(careerRow);
  body.appendChild(career);
  const rate = marketRate(state, employee);
  body.appendChild(
    h(
      "label",
      { class: "field" },
      h("span", { text: `Monthly salary (market rate for a ${titleOf(employee).toLowerCase()}: ${money(rate)})` }),
      numberInput(
        employee.salary,
        (value) => {
          const result = setSalary(state, employee.id, value);
          toast(result.message, result.ok ? "good" : "bad");
          ctx.refresh();
        },
        { step: "50", min: "0" }
      )
    )
  );
  if (businesses.length > 1) {
    body.appendChild(
      h(
        "label",
        { class: "field" },
        h("span", { text: "Assigned to" }),
        select(
          businesses.map((b) => ({ value: b.id, label: b.name })),
          employee.businessId ?? businesses[0].id,
          (value) => {
            const result = transfer(state, employee.id, value);
            toast(result.message, result.ok ? "good" : "bad");
            close();
            ctx.refresh();
          }
        )
      )
    );
  }
  const training = h("div", { class: "panel" }, h("h3", { class: "panel-title", text: "Training" }));
  if (employee.trainingEndsOnDay !== null) {
    const onCourse = employee.trainingCourseId ? COURSE_BY_ID.get(employee.trainingCourseId) : null;
    training.appendChild(
      h("p", {
        class: "tiny muted",
        style: "margin:0",
        text: onCourse ? `On ${onCourse.name.toLowerCase()} until day ${employee.trainingEndsOnDay}. ${onCourse.detail}` : `In training until day ${employee.trainingEndsOnDay}.`
      })
    );
  } else {
    const suggested = suggestedCourse(employee);
    training.appendChild(
      h("p", {
        class: "tiny muted",
        style: "margin:0 0 8px",
        text: `A course puts them on one skill and takes them off the floor while it runs. Each one after the first does a little less. ${suggested.name} would do them the most good where they are.`
      })
    );
    for (const course of COURSES) {
      const weight = ROLE_SKILLS[employee.role][course.skill] ?? 0;
      training.appendChild(
        h(
          "div",
          { class: `course-row${course.id === suggested.id ? " suggested" : ""}` },
          h(
            "div",
            { style: "flex:1;min-width:0" },
            h("div", { class: "course-name", text: course.name }),
            h("div", {
              class: "sub",
              text: `${course.days} days \xB7 ${money(trainingCost(course))} \xB7 ${weight > 0.2 ? "this job leans on it" : "not what this job needs"}`
            })
          ),
          button(
            "Send",
            () => {
              const result = startTraining(state, employee.id, course.id);
              toast(result.message, result.ok ? "good" : "bad");
              close();
              ctx.refresh();
            },
            course.id === suggested.id ? "btn small primary" : "btn small"
          )
        )
      );
    }
  }
  body.appendChild(training);
  footer.appendChild(
    button(
      "Dismiss",
      async () => {
        const ok = await confirmDialog(
          `Dismiss ${employee.name}?`,
          "Severance is based on length of service, and the rest of the team will notice.",
          "Dismiss"
        );
        if (!ok) return;
        const result = fire(state, employee.id);
        toast(result.message, result.ok ? "good" : "bad");
        close();
        ctx.refresh();
      },
      "btn danger"
    )
  );
}

// src/ui/views/inventory.ts
function inventoryView(ctx) {
  const el = h("div", { class: "view" });
  const state = ctx.state;
  const businesses = playerBusinesses(state);
  el.appendChild(
    h("div", { class: "view-head" }, h("h1", { text: "Inventory" }), h("p", { text: "Stock, reorder points and purchasing" }))
  );
  if (businesses.length === 0) {
    el.appendChild(section("No businesses", empty("Create a business before ordering stock.")));
    return { el };
  }
  const selectedId = ctx.params.business ?? businesses[0].id;
  const business = businessById(state, selectedId) ?? businesses[0];
  const type = businessTypeOrThrow(business.typeId);
  const building = state.buildings.find((b) => b.id === business.buildingId);
  el.appendChild(
    section(
      "Location",
      select(
        businesses.map((b) => ({ value: b.id, label: b.name })),
        business.id,
        (value) => ctx.go("inventory", { business: value })
      ),
      building ? h(
        "div",
        { style: "margin-top:12px" },
        stat(
          "Storage used",
          `${Math.round(storageUsed(business))} / ${count(building.storageCapacity)} units`,
          storageUsed(business) > building.storageCapacity * 0.9 ? "bad" : void 0
        ),
        bar(storageUsed(business) / Math.max(1, building.storageCapacity), storageUsed(business) > building.storageCapacity * 0.9 ? "bad" : "")
      ) : null,
      h(
        "label",
        { class: "switch" },
        h("input", {
          type: "checkbox",
          checked: business.autoRestock,
          on: {
            change: (event) => {
              business.autoRestock = event.target.checked;
              toast(business.autoRestock ? "Automatic reordering is on." : "Automatic reordering is off.");
            }
          }
        }),
        h(
          "span",
          {},
          h("span", { text: "Reorder automatically" }),
          h("span", {
            class: "tiny muted",
            style: "display:block",
            text: "Each night, anything at or below its reorder point is topped up from the cheapest supplier that carries it."
          })
        )
      )
    )
  );
  if (type.productIds.length === 0) {
    el.appendChild(
      section(
        "No stock needed",
        empty(`${type.name} is a service business. It has no inventory \u2014 your costs are staff, rent and marketing.`)
      )
    );
    return { el };
  }
  el.appendChild(
    section(
      "Stock levels",
      table(
        ["Product", "Category", "In stock", "On order", "Reorder at", "Unit cost", "Your price", "Value"],
        type.productIds.map((productId) => {
          const def = product(productId);
          if (!def) return [];
          const units = business.stock[productId] ?? 0;
          const incoming = business.incoming[productId] ?? 0;
          const cost = business.costBasis[productId] ?? def.wholesalePrice;
          const low = units <= (business.reorderPoints[productId] ?? 0);
          return [
            h(
              "div",
              {},
              h("div", { text: def.name }),
              def.shelfLife > 0 ? h("div", { class: "tiny muted", text: `Perishable \u2014 ${def.shelfLife} days` }) : null
            ),
            CATEGORY_LABELS[def.category],
            h("span", { class: low ? "bad" : "", text: count(units) }),
            incoming > 0 ? h("span", { class: "tag accent", text: count(incoming) }) : "\u2014",
            numberInput(
              business.reorderPoints[productId] ?? 0,
              (value) => {
                setReorderPoint(state, business.id, productId, value);
              },
              { min: "0", step: "5", style: "max-width:90px" }
            ),
            moneyCents(cost),
            moneyCents(business.prices[productId] ?? def.marketPrice),
            money(units * cost)
          ];
        })
      )
    )
  );
  el.appendChild(orderPanel(ctx, business));
  const orders = state.orders.filter((order) => order.businessId === business.id).slice().reverse();
  const now = absoluteHour(state);
  el.appendChild(
    section(
      "Orders",
      orders.length === 0 ? empty("No orders yet.") : table(
        ["Supplier", "Items", "Value", "Status", "Arrives"],
        orders.slice(0, 14).map((order) => [
          supplier(order.supplierId)?.name ?? order.supplierId,
          order.lines.map((line) => `${line.quantity}\xD7 ${product(line.productId)?.name ?? line.productId}`).join(", "),
          money(order.total),
          h("span", {
            class: `tag ${order.status === "delivered" ? "good" : order.status === "delayed" ? "bad" : "accent"}`,
            text: order.status
          }),
          order.status === "delivered" ? "\u2014" : hoursLabel(order.arrivesOnTick - now)
        ])
      )
    )
  );
  el.appendChild(
    section(
      "Suppliers",
      table(
        ["Supplier", "Price", "Lead time", "Reliability", "Quality", "Minimum order", "Carries"],
        SUPPLIERS.map((def) => {
          const spend = state.supplierSpend[def.id] ?? 0;
          const discounted = spend >= def.volumeThreshold;
          return [
            h(
              "div",
              {},
              h("div", { text: def.name }),
              h("div", { class: "tiny muted", text: def.description })
            ),
            h(
              "div",
              {},
              h("div", { text: pct(def.priceMultiplier * 100) }),
              discounted ? h("div", { class: "tiny good", text: `\u2212${Math.round(def.volumeDiscount * 100)}% volume discount` }) : h("div", { class: "tiny muted", text: `${money(def.volumeThreshold - spend)} to discount` })
            ),
            hoursLabel(def.leadTimeHours),
            h("span", { class: def.reliability < 0.88 ? "bad" : "good", text: pct(def.reliability * 100) }),
            pct(def.quality * 100),
            money(def.minimumOrderValue),
            def.categories.map((category) => CATEGORY_LABELS[category]).join(", ")
          ];
        })
      ),
      h("p", {
        class: "tiny muted",
        text: "A cheap supplier that misses a delivery costs more than an expensive one that never does \u2014 an empty shelf sells nothing."
      })
    )
  );
  return { el };
}
function orderPanel(ctx, business) {
  const state = ctx.state;
  const type = businessTypeOrThrow(business.typeId);
  const available2 = SUPPLIERS.filter(
    (def) => type.productIds.some((id) => {
      const productDef = product(id);
      return productDef ? def.categories.includes(productDef.category) : false;
    })
  );
  const panel = section("Place an order");
  if (available2.length === 0) {
    panel.appendChild(empty("No supplier carries what this business sells."));
    return panel;
  }
  let supplierId = available2[0].id;
  const quantities = {};
  const linesHost = h("div", {});
  const summary = h("div", {});
  const refreshSummary = () => {
    const requested = Object.entries(quantities).filter(([, quantity]) => quantity > 0).map(([productId, quantity]) => ({ productId, quantity }));
    const quote = quoteOrder(state, supplierId, business.id, requested);
    summary.innerHTML = "";
    summary.appendChild(
      h(
        "div",
        {},
        stat("Units", count(quote.units)),
        stat("Goods", money(quote.goodsCost)),
        stat("Delivery", money(quote.deliveryCost)),
        stat("Total", money(quote.total), quote.total > 0 ? void 0 : "muted"),
        stat("Arrives in", hoursLabel(quote.leadTimeHours))
      )
    );
    for (const problem of quote.problems) {
      summary.appendChild(h("p", { class: "tiny bad", text: problem }));
    }
    summary.appendChild(
      h(
        "div",
        { class: "btn-row" },
        button(
          "Place order",
          () => {
            const result = placeOrder(state, supplierId, business.id, requested);
            toast(result.message, result.ok ? "good" : "bad");
            if (result.ok) ctx.refresh();
          },
          `btn primary${quote.problems.length > 0 ? " disabled" : ""}`
        ),
        button("Suggest quantities", () => {
          for (const productId of type.productIds) quantities[productId] = 0;
          for (const line of suggestOrder(state, business, supplierId)) quantities[line.productId] = line.quantity;
          renderLines();
          refreshSummary();
        }),
        button("Clear", () => {
          for (const productId of Object.keys(quantities)) quantities[productId] = 0;
          renderLines();
          refreshSummary();
        }, "btn ghost")
      )
    );
    const orderButton = summary.querySelector(".btn.primary");
    if (orderButton instanceof HTMLButtonElement) orderButton.disabled = quote.problems.length > 0;
  };
  const renderLines = () => {
    linesHost.innerHTML = "";
    const def = supplier(supplierId);
    const rows = type.productIds.map((productId) => {
      const productDef = product(productId);
      if (!productDef || !def?.categories.includes(productDef.category)) return null;
      const price = unitPrice(state, supplierId, productId);
      const input = numberInput(
        quantities[productId] ?? 0,
        (value) => {
          quantities[productId] = Math.max(0, Math.floor(value));
          refreshSummary();
        },
        { min: "0", step: "10", style: "max-width:110px" }
      );
      return [
        productDef.name,
        moneyCents(price),
        count(business.stock[productId] ?? 0),
        input,
        moneyCents(price * (quantities[productId] ?? 0))
      ];
    }).filter((row2) => row2 !== null);
    if (rows.length === 0) {
      linesHost.appendChild(empty(`${def?.name ?? "This supplier"} does not carry anything this business sells.`));
      return;
    }
    linesHost.appendChild(table(["Product", "Unit price", "In stock", "Order", "Line total"], rows));
  };
  panel.appendChild(
    h(
      "label",
      { class: "field" },
      h("span", { text: "Supplier" }),
      select(
        available2.map((def) => ({
          value: def.id,
          label: `${def.name} \u2014 ${pct(def.priceMultiplier * 100)} of list, ${hoursLabel(def.leadTimeHours)} lead time`
        })),
        supplierId,
        (value) => {
          supplierId = value;
          renderLines();
          refreshSummary();
        }
      )
    )
  );
  panel.appendChild(linesHost);
  panel.appendChild(summary);
  panel.appendChild(
    h("p", {
      class: "tiny muted",
      text: `Space left: ${Math.round(storageFree(state, business))} units. Anything that does not fit on arrival is credited back.`
    })
  );
  renderLines();
  refreshSummary();
  return panel;
}

// src/ui/views/logistics.ts
function logisticsView(ctx) {
  const el = h("div", { class: "view" });
  const state = ctx.state;
  const warehouses = warehousesOf(state);
  const shops = playerBusinesses(state).filter((b) => b.status !== "closed");
  el.appendChild(
    h(
      "div",
      { class: "view-head" },
      h("h1", { text: "Distribution" }),
      h("p", {
        text: warehouses.length > 0 ? `${warehouses.length} distribution centre${warehouses.length === 1 ? "" : "s"} supplying ${shops.length} location${shops.length === 1 ? "" : "s"}` : "Buy in bulk once, deliver to your own shops overnight"
      })
    )
  );
  if (warehouses.length === 0) el.appendChild(pitchPanel(ctx));
  for (const warehouse of warehouses) el.appendChild(warehousePanel(ctx, warehouse));
  el.appendChild(convertPanel(ctx));
  return { el };
}
function pitchPanel(ctx) {
  const state = ctx.state;
  const shops = playerBusinesses(state).filter((b) => b.status === "open");
  const spent = sum(
    state.ledger.filter((entry) => entry.category === "logistics" && entry.day > state.day - 30),
    (entry) => -entry.amount
  );
  return section(
    "Why a distribution centre",
    h("p", {
      class: "tiny muted",
      text: "Every supplier delivery carries a call-out charge and its own lead time, and each shop ordering separately misses the volume discount. A warehouse buys once, in bulk, and your own van restocks the shelves overnight."
    }),
    h(
      "div",
      { class: "grid cols-3", style: "margin:12px 0" },
      stat("Your locations", String(shops.length), shops.length >= 3 ? "good" : void 0),
      stat("Delivery charges, last 30 days", money(spent)),
      stat("Fit-out cost", money(FIT_OUT_COST))
    ),
    h("p", {
      class: "tiny muted",
      text: shops.length >= 3 ? "At your size this usually pays for itself: bulk pricing, no minimum order per shop, and a supplier letting you down stops being a crisis." : "With one or two shops this is normally a waste of money \u2014 the rent and the wages cost more than the deliveries you would save. It becomes worth it at about three locations."
    })
  );
}
function warehousePanel(ctx, warehouse) {
  const state = ctx.state;
  const building = buildingById(state, warehouse.buildingId);
  const capacity = capacityOf(state, warehouse);
  const used = usedSpace(warehouse);
  const staff = employeesOf(state, warehouse.id);
  const drivers = staff.filter((e) => e.role === "driver").length;
  const trips = tripsPerDay(state, warehouse);
  const plan = planDispatch(state, warehouse);
  const panel = section(warehouse.name);
  panel.appendChild(
    h("p", {
      class: "tiny muted",
      text: building ? `${building.address}, ${district(building.district).name} \xB7 ${money(building.rent)}/mo` : "Premises unknown"
    })
  );
  panel.appendChild(
    h(
      "div",
      { class: "grid cols-4", style: "margin:12px 0" },
      stat("Space used", `${count(used)} / ${count(capacity)}`, used > capacity * 0.92 ? "bad" : void 0),
      stat("Stock at cost", money(stockValue(warehouse))),
      stat("Runs a day", `${trips}`, drivers === 0 ? "bad" : "good"),
      stat("Staff", `${staff.length}`)
    )
  );
  panel.appendChild(bar(capacity > 0 ? used / capacity : 0, used > capacity * 0.92 ? "bad" : "good"));
  panel.appendChild(h("h4", { class: "panel-title", style: "margin-top:14px", text: "Tonight's run" }));
  if (!warehouse.autoDispatch) {
    panel.appendChild(empty("Automatic dispatch is off, so nothing leaves the racks tonight."));
  } else if (plan.length === 0) {
    panel.appendChild(
      empty(
        stockValue(warehouse) <= 0 ? "The racks are empty. Order stock in below and your shops can draw on it." : "Every shop is above its reorder point, so the vans stay in."
      )
    );
  } else {
    const byBusiness = /* @__PURE__ */ new Map();
    for (const line of plan) byBusiness.set(line.businessId, (byBusiness.get(line.businessId) ?? 0) + line.units);
    panel.appendChild(
      table(
        ["Shop", "Units going out", ""],
        [...byBusiness.entries()].map(([businessId, units]) => {
          const business = businessById(state, businessId);
          return [
            business?.name ?? "Unknown",
            count(units),
            button("Open", () => ctx.go("businesses", { business: businessId }), "btn small ghost")
          ];
        })
      )
    );
    panel.appendChild(
      h("p", {
        class: "tiny muted",
        text: `${byBusiness.size} run${byBusiness.size === 1 ? "" : "s"} at ${money(TRIP_COST)} each. ${drivers === 0 ? `Without a driver you can only manage ${BASE_TRIPS} runs a day; each driver adds ${TRIPS_PER_DRIVER}.` : `${drivers} driver${drivers === 1 ? "" : "s"} on the payroll.`}`
      })
    );
  }
  const stockRows = Object.entries(warehouse.stock).filter(([, units]) => units > 0.5).sort((a, b) => b[1] - a[1]).map(([productId, units]) => {
    const def = product(productId);
    return [
      def?.name ?? productId,
      count(units),
      money((warehouse.costBasis[productId] ?? def?.wholesalePrice ?? 0) * units),
      def && def.shelfLife > 0 ? h("span", { class: "tag warn", text: `${def.shelfLife}d shelf life` }) : "\u2014"
    ];
  });
  panel.appendChild(h("h4", { class: "panel-title", style: "margin-top:14px", text: "On the racks" }));
  panel.appendChild(
    stockRows.length > 0 ? table(["Product", "Units", "At cost", ""], stockRows) : empty("Nothing on the racks yet.")
  );
  panel.appendChild(bulkOrder(ctx, warehouse));
  panel.appendChild(staffPanel(ctx, warehouse));
  const actions = h("div", { class: "btn-row", style: "margin-top:14px" });
  actions.appendChild(
    h(
      "label",
      { class: "switch" },
      h("input", { type: "checkbox", checked: warehouse.autoDispatch, on: { change: () => {
        warehouse.autoDispatch = !warehouse.autoDispatch;
        ctx.refresh();
      } } }),
      h("span", { text: "Send the vans out automatically" })
    )
  );
  actions.appendChild(
    button(
      "Close this centre",
      async () => {
        const ok = await confirmDialog(
          `Close ${warehouse.name}?`,
          "Staff are paid off and everything on the racks is cleared at half what it cost. The premises stay yours.",
          "Close it"
        );
        if (!ok) return;
        const result = closeWarehouse(state, warehouse.id);
        toast(result.message, result.ok ? "good" : "bad");
        ctx.refresh();
      },
      "btn danger"
    )
  );
  panel.appendChild(actions);
  return panel;
}
function bulkOrder(ctx, warehouse) {
  const state = ctx.state;
  const products = stockableProducts(state);
  const host = h("div", { style: "margin-top:14px" }, h("h4", { class: "panel-title", text: "Order in bulk" }));
  if (products.length === 0) {
    host.appendChild(empty("None of your businesses sell stock, so there is nothing to hold here."));
    return host;
  }
  let supplierId = SUPPLIERS[0].id;
  const quantities = {};
  const figures = h("div", { style: "margin-top:10px" });
  const problemsHost = h("div", {});
  const currentLines = () => Object.entries(quantities).filter(([, quantity]) => quantity > 0).map(([productId, quantity]) => ({ productId, quantity }));
  const place = button(
    "Place bulk order",
    () => {
      const result = placeBulkOrder(state, supplierId, warehouse.id, currentLines());
      toast(result.message, result.ok ? "good" : "bad");
      if (result.ok) ctx.refresh();
    },
    "btn primary"
  );
  const refresh = () => {
    const quote = quoteBulk(state, supplierId, warehouse.id, currentLines());
    figures.innerHTML = "";
    figures.appendChild(
      h(
        "div",
        {},
        stat("Units", count(quote.units)),
        stat("Goods", money(quote.goodsCost)),
        stat("Delivery", money(quote.deliveryCost)),
        stat("Total", money(quote.total)),
        stat(
          "Against shop-by-shop",
          quote.units > 0 ? `saves ${money(Math.max(0, quote.retailEquivalent - quote.total))}` : "\u2014",
          quote.retailEquivalent > quote.total ? "good" : "muted"
        ),
        stat("Space after delivery", `${count(Math.max(0, freeSpace(state, warehouse) - quote.volume))} free`)
      )
    );
    problemsHost.innerHTML = "";
    for (const problem of quote.problems) {
      problemsHost.appendChild(h("p", { class: "tiny bad", text: problem }));
    }
    place.disabled = quote.problems.length > 0;
  };
  host.appendChild(
    h(
      "label",
      { class: "field" },
      h("span", { text: "Supplier" }),
      select(
        SUPPLIERS.map((def) => ({
          value: def.id,
          label: `${def.name} \u2014 ${pct(def.priceMultiplier * 100)} of list, ${def.leadTimeHours}h, min \u20AC${def.minimumOrderValue}`
        })),
        supplierId,
        (value) => {
          supplierId = value;
          refresh();
        }
      )
    )
  );
  const rows = products.map((productId) => {
    const def = product(productId);
    quantities[productId] = quantities[productId] ?? 0;
    return [
      def?.name ?? productId,
      money(def?.wholesalePrice ?? 0),
      count(warehouse.stock[productId] ?? 0),
      numberInput(0, (value) => {
        quantities[productId] = Math.max(0, Math.round(value));
        refresh();
      }, { step: "50", min: "0" })
    ];
  });
  host.appendChild(table(["Product", "List price", "On the racks", "Order"], rows));
  host.appendChild(figures);
  host.appendChild(problemsHost);
  host.appendChild(h("div", { class: "btn-row", style: "margin-top:10px" }, place));
  refresh();
  return host;
}
function staffPanel(ctx, warehouse) {
  const state = ctx.state;
  const staff = employeesOf(state, warehouse.id);
  const host = h("div", { style: "margin-top:14px" }, h("h4", { class: "panel-title", text: "People" }));
  host.appendChild(
    staff.length > 0 ? table(
      ["Name", "Role", "Skill", "Salary"],
      staff.map((employee) => [
        employee.name,
        role(employee.role).name,
        `${Math.round(employee.skill)}`,
        `${money(employee.salary)}/mo`
      ])
    ) : empty("Nobody works here. Without a driver the centre manages only a couple of runs a day.")
  );
  const applicants = state.applicants.filter(
    (a) => a.role === "warehouse" || a.role === "driver" || a.role === "manager"
  );
  host.appendChild(
    applicants.length > 0 ? table(
      ["Applicant", "Role", "Skill", "Asking", ""],
      applicants.slice(0, 5).map((applicant) => [
        applicant.name,
        role(applicant.role).name,
        `${Math.round(applicant.skill)}`,
        `${money(applicant.salary)}/mo`,
        button(
          "Hire",
          () => {
            const result = hireToWarehouse(state, applicant.id, warehouse.id);
            toast(result.message, result.ok ? "good" : "bad");
            ctx.refresh();
          },
          "btn small primary"
        )
      ])
    ) : empty("No warehouse staff or drivers are looking for work today.")
  );
  return host;
}
function convertPanel(ctx) {
  const state = ctx.state;
  const company = playerCompany(state);
  const candidates = state.buildings.filter(
    (b) => b.occupantCompanyId === company.id && !b.businessId && !state.warehouses.some((w) => w.buildingId === b.id)
  );
  const panel = section("Premises you could rack out");
  if (candidates.length === 0) {
    panel.appendChild(
      empty("You hold no empty units. Take a lease on something with plenty of storage \u2014 the industrial and warehouse districts are cheapest per unit of space.")
    );
    panel.appendChild(
      h("div", { class: "btn-row" }, button("Find premises", () => ctx.go("property"), "btn primary"))
    );
    return panel;
  }
  panel.appendChild(
    table(
      ["Address", "District", "Storage", "Rent", ""],
      candidates.map((building) => {
        const check = canConvert(state, building.id);
        return [
          building.address,
          district(building.district).name,
          count(building.storageCapacity),
          `${money(building.rent)}/mo`,
          check.ok ? button(
            `Rack it out \u2014 ${money(FIT_OUT_COST)}`,
            () => {
              const result = openWarehouse(state, building.id, `${company.name} Distribution`);
              toast(result.message, result.ok ? "good" : "bad");
              ctx.refresh();
            },
            "btn small primary"
          ) : h("span", { class: "tiny muted", text: check.message })
        ];
      })
    )
  );
  return panel;
}

// src/ui/views/marketing.ts
function marketingView(ctx) {
  const el = h("div", { class: "view" });
  const state = ctx.state;
  const company = playerCompany(state);
  const businesses = playerBusinesses(state);
  el.appendChild(
    h(
      "div",
      { class: "view-head" },
      h("h1", { text: "Marketing" }),
      h("p", { text: `Brand awareness ${pct(company.brandAwareness)} across Northgate` })
    )
  );
  if (businesses.length === 0) {
    el.appendChild(section("No businesses", empty("There is nothing to advertise yet.")));
    return { el };
  }
  const selectedId = ctx.params.business ?? businesses[0].id;
  const business = businessById(state, selectedId) ?? businesses[0];
  const building = state.buildings.find((b) => b.id === business.buildingId);
  const districtDef = building ? district(building.district) : null;
  el.appendChild(
    section(
      "Business",
      select(
        businesses.map((b) => ({ value: b.id, label: b.name })),
        business.id,
        (value) => ctx.go("marketing", { business: value })
      ),
      h(
        "div",
        { style: "margin-top:12px" },
        stat("Awareness in the district", pct(business.awareness)),
        bar(business.awareness / 100, business.awareness > 55 ? "good" : ""),
        stat("Reputation", `${Math.round(business.reputation)}/100`),
        stat("Reviews", `${business.reviewScore.toFixed(1)}\u2605`)
      ),
      h(
        "label",
        { class: "field", style: "margin-top:12px" },
        h("span", { text: "Baseline marketing spend per day (always-on)" }),
        numberInput(business.marketingBudget, (value) => {
          setMarketingBudget(state, business.id, value);
          ctx.refresh();
        }, { min: "0", step: "10" })
      ),
      districtDef ? h("p", {
        class: "tiny muted",
        text: `${districtDef.name}: ${Math.round(districtDef.ageMix.young * 100)}% under 30, ${Math.round(
          districtDef.ageMix.adult * 100
        )}% 30\u201360, ${Math.round(districtDef.ageMix.senior * 100)}% over 60. Pick channels that reach those people.`
      }) : null
    )
  );
  const running = state.campaigns.filter((campaign) => campaign.businessId === business.id);
  const runningPanel = section("Running campaigns");
  if (running.length === 0) {
    runningPanel.appendChild(empty("No campaigns are running for this business."));
  } else {
    runningPanel.appendChild(
      table(
        ["Channel", "Cost/day", "Days left", "Awareness/day", ""],
        running.map((campaign) => {
          const channel = marketingChannel(campaign.channelId);
          return [
            channel?.name ?? campaign.channelId,
            money(campaign.dailyCost),
            String(campaign.daysLeft),
            `+${expectedDailyAwareness(state, campaign.channelId, business.id).toFixed(1)}%`,
            button(
              "Stop",
              () => {
                stopCampaign(state, campaign.id);
                toast("Campaign stopped.");
                ctx.refresh();
              },
              "btn small danger"
            )
          ];
        })
      )
    );
  }
  el.appendChild(runningPanel);
  const channelPanel = section("Available channels");
  channelPanel.appendChild(
    h("p", {
      class: "tiny muted",
      text: "Effectiveness depends on whether the channel reaches the people who live and work near this business. The percentage is how well it matches this district."
    })
  );
  for (const channel of MARKETING_CHANNELS) {
    const match = building ? audienceMatch(channel.id, building.district) : 0;
    const daily = expectedDailyAwareness(state, channel.id, business.id);
    const days = numberInput(channel.minimumDays, () => {
    }, {
      min: String(channel.minimumDays),
      max: "60",
      step: "1",
      style: "max-width:100px"
    });
    channelPanel.appendChild(
      h(
        "div",
        { class: "card", style: "margin-top:8px" },
        h(
          "div",
          { class: "card-head" },
          h(
            "div",
            {},
            h("div", { class: "card-title", text: channel.name }),
            h("div", { class: "card-sub", text: channel.description })
          ),
          h("span", {
            class: `tag ${match > 0.6 ? "good" : match < 0.35 ? "bad" : ""}`,
            text: `${pct(match * 100)} match`
          })
        ),
        h(
          "div",
          { class: "grid cols-3" },
          stat("Cost", `${money(channel.dailyCost)}/day`),
          stat("Reach", pct(channel.reach * 100)),
          stat("Awareness gain", `+${daily.toFixed(1)}%/day`, daily > 1.2 ? "good" : daily < 0.35 ? "bad" : void 0)
        ),
        h(
          "div",
          { style: "display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin-top:8px" },
          h("label", { class: "field", style: "margin:0" }, h("span", { text: `Days (min ${channel.minimumDays})` }), days),
          button(
            "Book campaign",
            () => {
              const result = startCampaign(state, channel.id, business.id, Number(days.value));
              toast(result.message, result.ok ? "good" : "bad");
              if (result.ok) ctx.refresh();
            },
            "btn primary"
          )
        )
      )
    );
  }
  el.appendChild(channelPanel);
  el.appendChild(
    section(
      "Total marketing spend",
      stat("Campaigns", `${money(sum(state.campaigns, (c) => c.dailyCost))}/day`),
      stat("Baseline budgets", `${money(sum(businesses, (b) => b.marketingBudget))}/day`),
      h("p", {
        class: "tiny muted",
        text: "Awareness decays by about 2.5% a day when you stop spending, so short bursts fade quickly."
      })
    )
  );
  return { el };
}

// src/ui/views/finance.ts
function financeView(ctx) {
  const el = h("div", { class: "view" });
  const state = ctx.state;
  const company = playerCompany(state);
  el.appendChild(
    h("div", { class: "view-head" }, h("h1", { text: "Finance" }), h("p", { text: "Profit and loss, balance sheet, borrowing" }))
  );
  const view = forecast(state);
  const dangerous = view.emptyOnDay !== null && view.emptyOnDay - state.day <= WARNING_DAYS;
  el.appendChild(
    h(
      "section",
      { class: `panel${dangerous ? " panel-danger" : ""}` },
      h("h3", { class: "panel-title", text: "Cash forecast \u2014 the next 30 days" }),
      dangerous ? h("p", {
        class: "bad",
        text: `\u26A0\uFE0F CASHFLOW WARNING: your company may run out of cash in ${(view.emptyOnDay ?? state.day) - state.day} days.`
      }) : h("p", {
        class: "sub",
        text: view.emptyOnDay === null ? `Nothing in the next ${HORIZON} days empties the account at the current rate.` : `The account runs dry on day ${view.emptyOnDay}.`
      }),
      lineChart(view.balances, { height: 110 }),
      h(
        "div",
        { class: "grid cols-3" },
        stat("Cash now", money(company.cash)),
        stat("Trading, a day", moneySigned(view.dailyNet), view.dailyNet >= 0 ? "good" : "bad"),
        stat("Days of cover", view.emptyOnDay === null ? `${HORIZON}+` : String(view.runway), dangerous ? "bad" : void 0)
      ),
      view.commitments.length > 0 ? table(
        ["Day", "Already committed", "Amount"],
        view.commitments.map((item) => [String(item.day), item.label, moneySigned(item.amount)])
      ) : h("p", { class: "sub muted", text: "Nothing lands in a lump: rent, wages, utilities and stock are all in the daily rate." })
    )
  );
  const COST_GROUPS = [
    {
      name: "Cost of sales",
      lines: [{ label: "cogs", text: "Goods sold" }]
    },
    {
      name: "People",
      lines: [
        { label: "wages", text: "Payroll" },
        { label: "recruitment", text: "Recruitment" },
        { label: "training", text: "Training" },
        { label: "severance", text: "Severance" },
        { label: "management", text: "Management and coordination" },
        { label: "outsourcing", text: "Outsourced central services" }
      ]
    },
    {
      name: "Premises and equipment",
      lines: [
        { label: "rent", text: "Rent" },
        { label: "utilities", text: "Energy and standing charges" },
        { label: "equipment", text: "Equipment and servicing" }
      ]
    },
    {
      name: "Getting it sold and shifted",
      lines: [
        { label: "marketing", text: "Marketing" },
        { label: "logistics", text: "Distribution" }
      ]
    },
    {
      name: "Finance and tax",
      lines: [
        { label: "interest", text: "Interest" },
        { label: "tax", text: "Tax" }
      ]
    }
  ];
  const costDays = 30;
  const since = state.day - costDays;
  const spend = /* @__PURE__ */ new Map();
  for (const entry of state.ledger) {
    if (entry.day < since) continue;
    if (entry.amount >= 0) continue;
    spend.set(entry.category, (spend.get(entry.category) ?? 0) + -entry.amount);
  }
  const revenue30 = sum(state.dayHistory.slice(-costDays), (day) => day.revenue);
  const outgoings = sum(
    COST_GROUPS.flatMap((group) => group.lines),
    (line) => spend.get(line.label) ?? 0
  );
  const share = (value) => revenue30 > 0 ? pct(value / revenue30 * 100, 1) : "\u2014";
  const costRows = [];
  for (const group of COST_GROUPS) {
    const used = group.lines.filter((line) => (spend.get(line.label) ?? 0) > 0);
    if (used.length === 0) continue;
    const groupTotal = sum(used, (line) => spend.get(line.label) ?? 0);
    costRows.push([
      h("strong", { text: group.name }),
      h("strong", { text: money(groupTotal) }),
      h("strong", { text: share(groupTotal) })
    ]);
    if (used.length > 1) {
      for (const line of used) {
        const value = spend.get(line.label) ?? 0;
        costRows.push([h("span", { class: "muted", text: `\u2003${line.text}` }), money(value), share(value)]);
      }
    }
  }
  costRows.push([
    h("strong", { text: "Everything it costs to trade" }),
    h("strong", { text: money(outgoings) }),
    h("strong", { text: share(outgoings) })
  ]);
  el.appendChild(
    section(
      "Where the money went \u2014 last 30 days",
      outgoings <= 0 ? empty("Nothing has been spent yet. Costs appear here as soon as the company is trading.") : table(["", "Amount", "Of turnover"], costRows),
      outgoings > 0 ? h("p", {
        class: "tiny muted",
        text: "Operating costs only. Buying a building, fitting out a shop and drawing or repaying a loan all move cash without being costs of trading \u2014 counting those here would make every expansion look like a disaster."
      }) : null
    )
  );
  const periods = [
    { label: "Yesterday", days: 1 },
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 }
  ];
  el.appendChild(
    section(
      "Profit and loss",
      table(
        ["Period", "Revenue", "Costs", "Profit", "Margin"],
        periods.map((period) => {
          const slice = state.dayHistory.slice(-period.days);
          const revenue = sum(slice, (d) => d.revenue);
          const costs = sum(slice, (d) => d.costs);
          const profit = revenue - costs;
          return [
            period.label,
            money(revenue),
            money(costs),
            h("span", { class: profit >= 0 ? "good" : "bad", text: moneySigned(profit) }),
            revenue > 0 ? pct(profit / revenue * 100, 1) : "\u2014"
          ];
        })
      ),
      state.dayHistory.length === 0 ? empty("No days have been settled yet.") : null
    )
  );
  el.appendChild(
    section(
      "Cash balance, day by day",
      lineChart(state.dayHistory.slice(-60).map((d) => d.cash), { showZero: true }),
      h("p", { class: "tiny muted", text: "Closing cash balance per day." })
    )
  );
  const breakdown = /* @__PURE__ */ new Map();
  const recentDay = state.day - 7;
  for (const entry of state.ledger) {
    if (entry.day < recentDay) continue;
    breakdown.set(entry.category, (breakdown.get(entry.category) ?? 0) + entry.amount);
  }
  const rows = [...breakdown.entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  el.appendChild(
    h(
      "div",
      { class: "grid cols-2" },
      section(
        "Where the money went (last 7 days)",
        rows.length === 0 ? empty("Nothing has moved yet.") : table(
          ["Category", "Amount"],
          rows.map(([category, amount]) => [
            LEDGER_LABELS[category],
            h("span", { class: isRevenue(category) ? "good" : "bad", text: moneySigned(amount) })
          ])
        )
      ),
      section(
        "Balance sheet",
        stat("Cash", money(company.cash), company.cash < 0 ? "bad" : void 0),
        stat("Stock at cost", money(inventoryValue(state))),
        stat("Property", money(propertyValue(state))),
        stat("Business goodwill", money(goodwillValue(state)), "muted"),
        stat("Debt", money(-debtTotal(state)), debtTotal(state) > 0 ? "bad" : "muted"),
        stat("Net worth", money(netWorth(state)), netWorth(state) >= 0 ? "good" : "bad"),
        stat("Credit rating", `${Math.round(company.creditRating)}/100`),
        h("p", {
          class: "tiny muted",
          text: `Corporation tax is ${Math.round(TAX_RATE * 100)}% of monthly profit, charged on the first of the month. Losses are not refunded.`
        })
      )
    )
  );
  const loanPanel = section("Borrowing");
  loanPanel.appendChild(
    h("p", {
      class: "tiny muted",
      text: `The bank will lend up to about ${money(borrowingHeadroom(state))} more against what you own. Missing a payment damages your credit rating badly.`
    })
  );
  if (state.loans.length > 0) {
    for (const loan of state.loans) {
      loanPanel.appendChild(loanCard(ctx, loan));
    }
  } else {
    loanPanel.appendChild(empty("No borrowing. Every euro in the business is yours."));
  }
  loanPanel.appendChild(h("div", { class: "sub", style: "margin-top:14px", text: "What you could borrow" }));
  for (const offer of loanOffers(state)) {
    const amountInput = numberInput(
      Math.max(1e3, Math.min(offer.maxPrincipal, Math.round(offer.maxPrincipal / 2 / 1e3) * 1e3)),
      () => {
      },
      { min: "1000", max: String(Math.max(1e3, offer.maxPrincipal)), step: "1000" }
    );
    const schedule = offer.maxPrincipal > 0 ? monthlyPayment(Number(amountInput.value), offer.annualRate, offer.termMonths) : 0;
    loanPanel.appendChild(
      h(
        "div",
        { class: `card${offer.blocked ? " muted-card" : ""}`, style: "margin-top:8px" },
        h(
          "div",
          { class: "card-head" },
          h(
            "div",
            {},
            h("div", { class: "card-title", text: offer.type.name }),
            h("div", { class: "card-sub", text: offer.type.detail })
          ),
          h("span", {
            class: `tag ${offer.blocked ? "bad" : "good"}`,
            text: offer.blocked ? "not available" : "available"
          })
        ),
        h("div", {
          class: "sub",
          text: `${offer.lender} \xB7 up to ${money(offer.maxPrincipal)} \xB7 ${pct(offer.annualRate * 100, 2)} over ${offer.termMonths} months \xB7 about ${money(schedule)} a month`
        }),
        offer.blocked ? h("div", { class: "tiny warn", text: offer.blocked }) : h(
          "div",
          { style: "display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin-top:8px" },
          h(
            "label",
            { class: "field", style: "flex:1;min-width:150px;margin:0" },
            h("span", { text: "How much" }),
            amountInput
          ),
          button(
            "Borrow",
            () => {
              const result = takeLoan(state, offer.id, Number(amountInput.value));
              toast(result.message, result.ok ? "good" : "bad");
              if (result.ok) ctx.refresh();
            },
            "btn primary"
          )
        )
      )
    );
  }
  el.appendChild(loanPanel);
  const ledger = [...state.ledger].reverse().slice(0, 60);
  el.appendChild(
    section(
      "Recent transactions",
      ledger.length === 0 ? empty("The ledger is empty.") : table(
        ["Day", "Time", "Category", "Detail", "Amount"],
        ledger.map((entry) => [
          String(entry.day),
          clockLabel(entry.hour),
          LEDGER_LABELS[entry.category],
          entry.label,
          h("span", { class: entry.amount >= 0 ? "good" : "bad", text: moneySigned(entry.amount) })
        ])
      ),
      h("p", {
        class: "tiny muted",
        text: `Every euro the company moves is recorded here. ${playerBusinesses(state).length} businesses contribute to these figures.`
      })
    )
  );
  return { el };
}
function loanCard(ctx, loan) {
  const state = ctx.state;
  const type = loanType(loan.typeId);
  const months = monthsRemaining(loan.outstanding, loan.annualRate, loan.monthlyPayment);
  const owed = interestRemaining(loan.outstanding, loan.annualRate, loan.monthlyPayment);
  const paidOff = loan.principal > 0 ? 1 - loan.outstanding / loan.principal : 0;
  const card = h("div", { class: "card loan-card" });
  card.appendChild(
    h(
      "div",
      { class: "card-head" },
      h(
        "div",
        {},
        h("div", { class: "card-title", text: loan.lender }),
        h("div", { class: "card-sub", text: `${type.name} \xB7 taken on day ${loan.takenOnDay}` })
      ),
      loan.missedPayments > 0 ? h("span", { class: "tag bad", text: `${loan.missedPayments} missed` }) : h("span", { class: "tag good", text: "up to date" })
    )
  );
  card.appendChild(bar(clamp(paidOff, 0, 1), paidOff > 0.66 ? "good" : ""));
  card.appendChild(
    h("div", {
      class: "tiny muted",
      style: "margin-top:4px",
      text: `${money(loan.principal - loan.outstanding)} of ${money(loan.principal)} repaid${loan.earlyRepaid > 0 ? `, ${money(loan.earlyRepaid)} of it ahead of schedule` : ""}.`
    })
  );
  card.appendChild(
    h(
      "div",
      { class: "grid cols-4", style: "margin-top:10px" },
      stat("Still owed", money(loan.outstanding)),
      stat("Rate", pct(loan.annualRate * 100, 2)),
      stat("Every month", money(loan.monthlyPayment)),
      stat("Months left", Number.isFinite(months) ? String(months) : "never at this rate")
    )
  );
  card.appendChild(
    h(
      "div",
      { class: "grid cols-2", style: "margin-top:2px" },
      statWithHint(
        "Interest still to pay",
        Number.isFinite(owed) ? money(owed) : "\u2014",
        "What this loan costs from here if you simply let it run: every remaining monthly payment added up, less the principal still owed. Paying early is how you make this number smaller."
      ),
      statWithHint(
        "Interest paid so far",
        money(loan.interestPaid),
        "What this loan has already cost you, on top of the money you borrowed."
      )
    )
  );
  const custom = numberInput(Math.round(loan.outstanding / 4), () => updateQuote(), {
    min: "0",
    max: String(Math.ceil(loan.outstanding)),
    step: "100"
  });
  const verdict = h("div", { class: "tiny muted", style: "margin-top:6px" });
  const describe = (amount) => {
    const quote = quoteRepayment(state, loan.id, amount);
    if (!quote) return "";
    if (quote.blocked) return quote.blocked;
    const saved = Math.max(0, Math.round(quote.monthsBefore - quote.monthsAfter));
    if (quote.outstandingAfter <= 0) {
      return `${money(quote.amount)} clears it outright, ${saved} month${saved === 1 ? "" : "s"} early, and saves ${money(
        quote.interestSaved
      )} of interest you would otherwise have paid.`;
    }
    return `${money(quote.amount)} leaves ${money(quote.outstandingAfter)} owing, takes ${saved} month${saved === 1 ? "" : "s"} off the term, and saves ${money(quote.interestSaved)} of interest. The monthly payment does not change \u2014 that is what shortens it.`;
  };
  const updateQuote = () => {
    verdict.textContent = describe(Number(custom.value));
  };
  const pay = (amount) => {
    const result = repayLoan(state, loan.id, amount);
    toast(result.message, result.ok ? "good" : "bad");
    if (result.ok) ctx.refresh();
  };
  const row2 = h("div", { class: "btn-row", style: "margin-top:10px" });
  for (const share of [0.25, 0.5, 1]) {
    const amount = Math.round(loan.outstanding * share);
    const affordable = playerCompany(state).cash >= amount;
    row2.appendChild(
      button(
        `${Math.round(share * 100)}% \u2014 ${money(amount)}`,
        () => pay(amount),
        affordable ? share === 1 ? "btn small primary" : "btn small" : "btn small"
      )
    );
  }
  card.appendChild(row2);
  card.appendChild(
    h(
      "div",
      { style: "display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin-top:8px" },
      h(
        "label",
        { class: "field", style: "flex:1;min-width:150px;margin:0" },
        h("span", { text: "Or an amount of your own" }),
        custom
      ),
      button("Pay that off", () => pay(Number(custom.value)), "btn")
    )
  );
  updateQuote();
  card.appendChild(verdict);
  return card;
}

// src/ui/views/property.ts
function propertyView(ctx) {
  const el = h("div", { class: "view" });
  const state = ctx.state;
  const company = playerCompany(state);
  const mine = state.buildings.filter((b) => b.occupantCompanyId === company.id);
  const owned = mine.filter((b) => b.status === "owned");
  const leased = mine.filter((b) => b.status === "rented");
  el.appendChild(
    h(
      "div",
      { class: "view-head" },
      h("h1", { text: "Real estate" }),
      h("p", {
        text: `${owned.length} owned \xB7 ${leased.length} leased \xB7 ${money(sum(owned, (b) => b.value))} of property`
      })
    )
  );
  const portfolio = section("Your premises");
  if (mine.length === 0) {
    portfolio.appendChild(empty("You do not hold any premises yet."));
  } else {
    portfolio.appendChild(
      table(
        ["Address", "District", "Size", "Status", "Rent", "Value", "Condition", ""],
        mine.map((building) => {
          const business = building.businessId ? state.businesses.find((b) => b.id === building.businessId) : void 0;
          return [
            h(
              "div",
              {},
              h("div", { text: building.address }),
              business ? h("div", { class: "tiny muted", text: business.name }) : h("div", { class: "tiny muted", text: "Empty" })
            ),
            district(building.district).name,
            `${building.size} m\xB2`,
            h("span", {
              class: `tag ${building.status === "owned" ? "good" : "accent"}`,
              text: building.status === "owned" ? "Owned" : "Leased"
            }),
            building.status === "rented" ? `${money(building.rent)}/mo` : "\u2014",
            money(building.value),
            h("span", {
              class: building.condition < 50 ? "bad" : "",
              text: building.renovationEndsOnDay !== null ? `Work until day ${building.renovationEndsOnDay}` : `${Math.round(building.condition)}/100`
            }),
            buildingActions(ctx, building)
          ];
        })
      )
    );
    portfolio.appendChild(
      h("p", {
        class: "tiny muted",
        text: "Owning removes rent and gives you an asset that moves with the district; leasing keeps cash free for stock and staff."
      })
    );
  }
  el.appendChild(portfolio);
  let districtFilter = "all";
  let sortBy = "value";
  const marketHost = h("div", {});
  const renderMarket = () => {
    marketHost.innerHTML = "";
    let available2 = state.buildings.filter((b) => b.status === "available");
    if (districtFilter !== "all") available2 = available2.filter((b) => b.district === districtFilter);
    available2.sort((a, b) => {
      if (sortBy === "rent") return a.rent - b.rent;
      if (sortBy === "price") return a.value - b.value;
      if (sortBy === "size") return b.size - a.size;
      if (sortBy === "value") {
        return b.footTraffic / Math.max(1, b.rent) - a.footTraffic / Math.max(1, a.rent);
      }
      return b.footTraffic - a.footTraffic;
    });
    marketHost.appendChild(
      table(
        ["Address", "District", "Size", "Foot traffic", "Rent", "Price", "Condition", ""],
        available2.slice(0, 40).map((building) => [
          h(
            "div",
            {},
            h("div", { text: building.address }),
            building.rent * 3 > company.cash ? h("span", { class: "tag bad", text: `${money(building.rent * 3)} up front` }) : null
          ),
          district(building.district).name,
          `${building.size} m\xB2`,
          count(building.footTraffic),
          `${money(building.rent)}/mo`,
          money(building.value),
          `${Math.round(building.condition)}`,
          h(
            "div",
            { class: "btn-row" },
            button("View", () => ctx.go("map", { building: building.id }), "btn small"),
            button(
              "Rent",
              async () => {
                const ok = await confirmDialog(
                  "Sign the lease?",
                  `${building.address} costs ${money(building.rent)} per month. ${money(building.rent * 3)} is due now.`,
                  "Sign lease"
                );
                if (!ok) return;
                const result = rentBuilding(state, building.id);
                toast(result.message, result.ok ? "good" : "bad");
                if (result.ok) ctx.refresh();
              },
              "btn small primary"
            )
          )
        ])
      )
    );
    if (available2.length === 0) marketHost.appendChild(empty("Nothing available with these filters."));
    else if (available2.length > 40) {
      marketHost.appendChild(h("p", { class: "tiny muted", text: `Showing 40 of ${available2.length} available units.` }));
    }
  };
  el.appendChild(
    section(
      "Available units",
      h(
        "div",
        { class: "grid cols-2" },
        h(
          "label",
          { class: "field" },
          h("span", { text: "District" }),
          select(
            [{ value: "all", label: "All districts" }, ...DISTRICTS.map((d) => ({ value: d.id, label: d.name }))],
            districtFilter,
            (value) => {
              districtFilter = value;
              renderMarket();
            }
          )
        ),
        h(
          "label",
          { class: "field" },
          h("span", { text: "Sort by" }),
          select(
            [
              { value: "value", label: "Best value" },
              { value: "traffic", label: "Busiest" },
              { value: "rent", label: "Cheapest rent" },
              { value: "price", label: "Cheapest to buy" },
              { value: "size", label: "Largest" }
            ],
            sortBy,
            (value) => {
              sortBy = value;
              renderMarket();
            }
          )
        )
      ),
      marketHost
    )
  );
  renderMarket();
  el.appendChild(
    section(
      "District property market",
      table(
        ["District", "Rent/m\xB2", "Price/m\xB2", "Growth", "Value index", "Free units"],
        DISTRICTS.map((def) => {
          const districtState = state.districts[def.id];
          const free = state.buildings.filter((b) => b.district === def.id && b.status === "available").length;
          return [
            def.name,
            money(def.rentPerSqm * (districtState?.rentIndex ?? 1)),
            money(def.pricePerSqm * (districtState?.propertyIndex ?? 1)),
            pct(def.growth * 100, 1),
            h("span", {
              class: (districtState?.propertyIndex ?? 1) > 1.02 ? "good" : "",
              text: pct((districtState?.propertyIndex ?? 1) * 100)
            }),
            String(free)
          ];
        })
      )
    )
  );
  return { el };
}
function buildingActions(ctx, building) {
  const state = ctx.state;
  const row2 = h("div", { class: "btn-row" });
  row2.appendChild(button("Map", () => ctx.go("map", { building: building.id }), "btn small"));
  if (building.condition < 97 && building.renovationEndsOnDay === null) {
    row2.appendChild(
      button(
        `Renovate ${money(renovationCost(building))}`,
        async () => {
          const ok = await confirmDialog("Start renovation?", "Six days of work restores the unit to full condition.", "Start");
          if (!ok) return;
          const result = renovate(state, building.id);
          toast(result.message, result.ok ? "good" : "bad");
          if (result.ok) ctx.refresh();
        },
        "btn small"
      )
    );
  }
  if (building.status === "rented" && !building.businessId) {
    row2.appendChild(
      button(
        "End lease",
        async () => {
          const ok = await confirmDialog("End the lease?", `You get ${money(building.rent * 1.5)} of the deposit back.`, "End lease");
          if (!ok) return;
          const result = endLease(state, building.id);
          toast(result.message, result.ok ? "good" : "bad");
          if (result.ok) ctx.refresh();
        },
        "btn small ghost"
      )
    );
  }
  if (building.status === "rented") {
    row2.appendChild(
      button(
        `Buy ${money(building.value)}`,
        async () => {
          const ok = await confirmDialog(
            "Buy the freehold?",
            `Buying ${building.address} for ${money(building.value)} ends the rent and turns it into an asset.`,
            "Buy"
          );
          if (!ok) return;
          const result = buyBuilding(state, building.id);
          toast(result.message, result.ok ? "good" : "bad");
          if (result.ok) ctx.refresh();
        },
        "btn small"
      )
    );
  }
  if (building.status === "owned" && !building.businessId) {
    row2.appendChild(
      button(
        "Sell",
        async () => {
          const ok = await confirmDialog(
            "Sell this building?",
            `You would receive about ${money(Math.round(building.value * 0.94))} after fees.`,
            "Sell"
          );
          if (!ok) return;
          const result = sellBuilding(state, building.id);
          toast(result.message, result.ok ? "good" : "bad");
          if (result.ok) ctx.refresh();
        },
        "btn small danger"
      )
    );
  }
  return row2;
}

// src/ui/views/reports.ts
function reportsView(ctx) {
  const el = h("div", { class: "view" });
  const state = ctx.state;
  const businesses = playerBusinesses(state);
  el.appendChild(
    h("div", { class: "view-head" }, h("h1", { text: "Reports" }), h("p", { text: "What happened, and why" }))
  );
  if (state.dayHistory.length === 0) {
    el.appendChild(section("Nothing to report", empty("No day has been settled yet. Let the clock run.")));
    return { el };
  }
  const yesterday = state.dayHistory[state.dayHistory.length - 1];
  const previous = state.dayHistory[state.dayHistory.length - 2];
  const cal = calendar(yesterday.day);
  const headline = section(`Day ${yesterday.day} \u2014 ${cal.label}`);
  headline.appendChild(
    h(
      "div",
      { class: "grid cols-4" },
      metric("Revenue", money(yesterday.revenue), previous ? delta(yesterday.revenue, previous.revenue) : ""),
      metric("Costs", money(yesterday.costs), previous ? delta(yesterday.costs, previous.costs, true) : ""),
      metric("Profit", moneySigned(yesterday.profit), previous ? delta(yesterday.profit, previous.profit) : "", yesterday.profit >= 0 ? "good" : "bad"),
      metric("Customers", count(yesterday.customers), previous ? delta(yesterday.customers, previous.customers) : "")
    )
  );
  if (previous) {
    headline.appendChild(explainChange(ctx, yesterday.day, previous.day));
  }
  el.appendChild(headline);
  el.appendChild(accountsPanel(ctx));
  el.appendChild(
    h(
      "div",
      { class: "grid cols-2" },
      section("Profit trend", lineChart(state.dayHistory.slice(-45).map((d) => d.profit))),
      section("Net worth", lineChart(state.dayHistory.slice(-45).map((d) => d.netWorth), { showZero: false }))
    )
  );
  for (const business of businesses) {
    const type = businessTypeOrThrow(business.typeId);
    const stats = business.yesterday;
    const profit = stats.revenue - (stats.cogs + stats.wages + stats.rent + stats.marketing + stats.otherCosts);
    const lostShare = stats.customers + stats.lostCustomers > 0 ? stats.lostCustomers / (stats.customers + stats.lostCustomers) : 0;
    const own = attractiveness(state, business);
    const rivals = rivalsOf(state, business);
    const weakest = [...own.factors].sort((a, b) => a.value - b.value)[0];
    const outOfStock = type.productIds.filter((id) => (business.stock[id] ?? 0) <= 0);
    const advice = [];
    if (stats.revenue === 0 && business.status !== "open") {
      advice.push("The business is not open. Nothing will happen until it is.");
    }
    if (lostShare > 0.15) {
      advice.push(
        `${pct(lostShare * 100)} of customers were turned away. More staff on shift, or longer hours, converts them.`
      );
    }
    if (outOfStock.length > 0) {
      advice.push(
        `Out of stock: ${outOfStock.map((id) => product(id)?.name ?? id).join(", ")}. Raise the reorder point or switch to a faster supplier.`
      );
    }
    if (weakest && weakest.value < 0.85) {
      advice.push(`Your weakest point against rivals is ${weakest.label.toLowerCase()} (${weakest.hint}).`);
    }
    if (profit < 0 && stats.rent > stats.revenue * 0.3) {
      advice.push("Rent is eating more than 30% of revenue. This location may simply be too expensive for what it takes.");
    }
    if (profit > 0 && lostShare < 0.05 && business.awareness < 40) {
      advice.push("You have spare capacity and low awareness \u2014 marketing would fill it.");
    }
    if (advice.length === 0) advice.push("Nothing is obviously wrong. Consider raising prices slightly to test the ceiling.");
    el.appendChild(
      section(
        `${type.icon} ${business.name}`,
        h(
          "div",
          { class: "grid cols-4" },
          metric("Revenue", money(stats.revenue), ""),
          metric("Profit", moneySigned(profit), "", profit >= 0 ? "good" : "bad"),
          metric("Customers", count(stats.customers), ""),
          metric("Turned away", count(stats.lostCustomers), "", lostShare > 0.15 ? "bad" : void 0)
        ),
        h(
          "div",
          { class: "grid cols-2", style: "margin-top:12px" },
          h(
            "div",
            {},
            h("h4", { class: "panel-title", text: "Cost structure" }),
            costRow("Cost of goods", stats.cogs, stats.revenue),
            costRow("Wages", stats.wages, stats.revenue),
            costRow("Rent & utilities", stats.rent + stats.otherCosts, stats.revenue),
            costRow("Marketing", stats.marketing, stats.revenue)
          ),
          h(
            "div",
            {},
            h("h4", { class: "panel-title", text: "What you could do" }),
            ...advice.map((line) => h("p", { class: "tiny muted", text: `\u2022 ${line}` })),
            h("p", {
              class: "tiny muted",
              text: `${rivals.length} direct rival${rivals.length === 1 ? "" : "s"} in this district.`
            })
          )
        )
      )
    );
  }
  const tier = currentTier(state);
  const achievementPanel = section("Progression");
  achievementPanel.appendChild(stat("Tier", tier.name));
  achievementPanel.appendChild(bar(tier.progress, "good"));
  achievementPanel.appendChild(
    table(
      ["Achievement", "Progress", "Status"],
      ACHIEVEMENTS.map((def) => {
        const unlocked = state.achievements.find((a) => a.id === def.id);
        const progress = def.progress(state);
        return [
          h("div", {}, h("div", { text: def.name }), h("div", { class: "tiny muted", text: def.description })),
          bar(progress, unlocked ? "good" : ""),
          unlocked ? h("span", { class: "tag good", text: `Day ${unlocked.unlockedOnDay}` }) : h("span", { class: "tag", text: pct(progress * 100) })
        ];
      })
    )
  );
  el.appendChild(achievementPanel);
  return { el };
}
function metric(label, value, change, tone) {
  return h(
    "div",
    { class: "kpi" },
    h("div", { class: "kpi-label", text: label }),
    h("div", { class: `kpi-value${tone ? ` ${tone}` : ""}`, text: value }),
    h("div", { class: "kpi-sub", text: change })
  );
}
function delta(current, previous, invert = false) {
  if (previous === 0) return "";
  const change = (current - previous) / Math.abs(previous) * 100;
  const arrow = change >= 0 ? "\u25B2" : "\u25BC";
  const good = invert ? change < 0 : change >= 0;
  return `${arrow} ${Math.abs(change).toFixed(0)}% ${good ? "vs yesterday" : "vs yesterday"}`;
}
function costRow(label, amount, revenue) {
  const share = revenue > 0 ? amount / revenue : 0;
  return h(
    "div",
    { style: "margin:6px 0" },
    h(
      "div",
      { style: "display:flex;justify-content:space-between;font-size:12px" },
      h("span", { class: "muted", text: label }),
      h("span", { text: `${money(amount)} (${pct(share * 100)})` })
    ),
    bar(share, share > 0.45 ? "bad" : share > 0.3 ? "warn" : "")
  );
}
function explainChange(ctx, day, previousDay) {
  const state = ctx.state;
  const totals = /* @__PURE__ */ new Map();
  for (const entry of state.ledger) {
    if (entry.day !== day && entry.day !== previousDay) continue;
    const bucket = totals.get(entry.category) ?? { now: 0, before: 0 };
    if (entry.day === day) bucket.now += entry.amount;
    else bucket.before += entry.amount;
    totals.set(entry.category, bucket);
  }
  const movers = [...totals.entries()].map(([category, bucket]) => ({ category, change: bucket.now - bucket.before })).filter((row2) => Math.abs(row2.change) > 1).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 6);
  if (movers.length === 0) {
    return h("p", { class: "tiny muted", text: "Nothing changed materially compared with the day before." });
  }
  return h(
    "div",
    { style: "margin-top:12px" },
    h("h4", { class: "panel-title", text: "Why the result moved" }),
    table(
      ["Category", "Change vs previous day"],
      movers.map((row2) => [
        LEDGER_LABELS[row2.category],
        h("span", {
          class: (isRevenue(row2.category) ? row2.change > 0 : row2.change > 0) ? "good" : "bad",
          text: moneySigned(row2.change)
        })
      ])
    ),
    h("p", {
      class: "tiny muted",
      text: `Total swing: ${moneySigned(sum(movers, (m) => m.change))}.`
    })
  );
}
function accountsPanel(ctx) {
  const state = ctx.state;
  const panel = section("Management accounts");
  if (state.accounts.length === 0) {
    panel.appendChild(
      empty(
        `The books are closed at the end of each month. The first set is due on day ${Math.ceil(state.day / 30) * 30}.`
      )
    );
    return panel;
  }
  let index = state.accounts.length - 1;
  const body = h("div", {});
  const render = () => {
    const account = state.accounts[index];
    const before = state.accounts[index - 1];
    body.innerHTML = "";
    body.appendChild(
      h("p", {
        class: "tiny muted",
        text: `Days ${account.fromDay}\u2013${account.toDay} \xB7 ${account.locations} location${account.locations === 1 ? "" : "s"} \xB7 ${account.headcount} on the payroll`
      })
    );
    const pl = h("div", {});
    const line = (label, value, tone) => stat(label, money(value), tone);
    pl.appendChild(line("Turnover", account.revenue));
    pl.appendChild(line("Cost of sales", -account.costOfSales));
    pl.appendChild(
      stat(
        `Gross profit (${Math.round(grossMarginOf(account) * 100)}%)`,
        money(account.grossProfit),
        account.grossProfit >= 0 ? "good" : "bad"
      )
    );
    pl.appendChild(line("Wages", -account.wages));
    pl.appendChild(line("Rent", -account.rent));
    pl.appendChild(line("Utilities", -account.utilities));
    pl.appendChild(line("Marketing", -account.marketing));
    pl.appendChild(line("Logistics", -account.logistics));
    if (account.training > 0) pl.appendChild(line("Training and severance", -account.training));
    if (account.recruitment > 0) pl.appendChild(line("Recruitment", -account.recruitment));
    if (account.management > 0) pl.appendChild(line("Management and coordination", -account.management));
    if (account.outsourcing > 0) pl.appendChild(line("Outsourced services", -account.outsourcing));
    if (account.interest > 0) pl.appendChild(line("Interest", -account.interest));
    if (account.tax > 0) pl.appendChild(line("Corporation tax", -account.tax));
    pl.appendChild(
      stat("Net profit", moneySigned(account.netProfit), account.netProfit >= 0 ? "good" : "bad")
    );
    const balance = h("div", {});
    balance.appendChild(stat("Cash", money(account.cash), account.cash < 0 ? "bad" : void 0));
    balance.appendChild(stat("Stock", money(account.stock)));
    balance.appendChild(stat("Property", money(account.property)));
    balance.appendChild(stat("Goodwill", money(account.goodwill)));
    balance.appendChild(stat("Debt", money(-account.debt), account.debt > 0 ? "bad" : "muted"));
    balance.appendChild(stat("Net worth", money(account.netWorth), "good"));
    balance.appendChild(stat("Customers served", count(account.customers)));
    balance.appendChild(stat("Average basket", money(basketOf(account))));
    balance.appendChild(
      stat(
        "Revenue per head",
        account.headcount > 0 ? money(account.revenue / account.headcount) : "\u2014"
      )
    );
    body.appendChild(
      h(
        "div",
        { class: "grid cols-2", style: "margin-top:10px" },
        h("div", {}, h("h4", { class: "panel-title", text: "Profit and loss" }), pl),
        h("div", {}, h("h4", { class: "panel-title", text: "At the close" }), balance)
      )
    );
    if (before) {
      body.appendChild(h("h4", { class: "panel-title", style: "margin-top:14px", text: "Against last month" }));
      body.appendChild(
        table(
          ["", "This month", "Last month", "Change"],
          movements(account, before).slice(0, 6).map((row2) => [
            row2.label,
            money(row2.now),
            money(row2.before),
            h("span", {
              class: row2.change === 0 ? "muted" : row2.change > 0 === row2.higherIsBetter ? "good" : "bad",
              text: moneySigned(row2.change)
            })
          ])
        )
      );
    }
    if (account.byBusiness.length > 0) {
      body.appendChild(h("h4", { class: "panel-title", style: "margin-top:14px", text: "By location" }));
      body.appendChild(
        table(
          ["Business", "Turnover", "Costs", "Contribution"],
          account.byBusiness.slice().sort((a, b) => b.profit - a.profit).map((row2) => [
            row2.name,
            money(row2.revenue),
            money(row2.costs),
            h("span", { class: row2.profit >= 0 ? "good" : "bad", text: moneySigned(row2.profit) })
          ])
        )
      );
      body.appendChild(
        h("p", {
          class: "tiny muted",
          text: "Contribution is what each site earned after everything charged to it. Company-wide costs \u2014 an empty lease, a distribution centre, interest, tax \u2014 sit outside this table and are in the profit and loss above."
        })
      );
    }
  };
  if (state.accounts.length > 1) {
    panel.appendChild(
      h(
        "label",
        { class: "field" },
        h("span", { text: "Month" }),
        select(
          state.accounts.map((account, i) => ({
            value: String(i),
            label: `Days ${account.fromDay}\u2013${account.toDay}`
          })),
          String(index),
          (value) => {
            index = Number(value);
            render();
          }
        )
      )
    );
  }
  panel.appendChild(body);
  render();
  return panel;
}

// src/ui/views/settings.ts
function settingsView(ctx) {
  const el = h("div", { class: "view" });
  const state = ctx.state;
  const company = playerCompany(state);
  el.appendChild(h("div", { class: "view-head" }, h("h1", { text: "Settings" }), h("p", { text: "Saves and preferences" })));
  const savePanel = section("Saved games");
  const nameInput = h("input", {
    type: "text",
    value: `${company.name} \u2014 day ${state.day}`,
    maxlength: 40,
    placeholder: "Save name"
  });
  savePanel.appendChild(
    h(
      "div",
      { style: "display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin-bottom:12px" },
      h("label", { class: "field", style: "flex:1;min-width:180px;margin:0" }, h("span", { text: "Save as" }), nameInput),
      button(
        "Save now",
        () => {
          const result = saveGame(state, makeId("save"), nameInput.value.trim() || `Day ${state.day}`);
          toast(result.message, result.ok ? "good" : "bad");
          ctx.refresh();
        },
        "btn primary"
      )
    )
  );
  const saves = listSaves();
  if (saves.length === 0) {
    savePanel.appendChild(empty("No saved games yet."));
  }
  for (const slot of saves) {
    savePanel.appendChild(
      h(
        "div",
        { class: "save-row" },
        h(
          "div",
          { style: "flex:1;min-width:0" },
          h("div", { text: slot.name + (slot.auto ? " (auto)" : "") }),
          h("div", {
            class: "save-meta",
            text: `${slot.company} \xB7 day ${slot.day} \xB7 ${money(slot.netWorth)} \xB7 ${new Date(slot.savedAt).toLocaleString()}`
          })
        ),
        button(
          "Load",
          async () => {
            const ok = await confirmDialog("Load this save?", "Anything unsaved in the current game is lost.", "Load");
            if (!ok) return;
            const loaded = loadGame(slot.id);
            if (!loaded) {
              toast("That save could not be read.", "bad");
              return;
            }
            ctx.engine.replaceState(loaded);
            toast(`Loaded \u201C${slot.name}\u201D.`, "good");
            ctx.go("dashboard");
          },
          "btn small"
        ),
        button(
          "Rename",
          () => {
            const next = window.prompt("New name", slot.name);
            if (next === null) return;
            renameSave(slot.id, next);
            ctx.refresh();
          },
          "btn small ghost"
        ),
        button(
          "Delete",
          async () => {
            const ok = await confirmDialog("Delete this save?", `\u201C${slot.name}\u201D cannot be recovered.`, "Delete");
            if (!ok) return;
            deleteSave(slot.id);
            ctx.refresh();
          },
          "btn small danger"
        )
      )
    );
  }
  el.appendChild(savePanel);
  el.appendChild(
    section(
      "Preferences",
      toggle("Autosave at the end of each day", state.settings.autosave, (value) => {
        state.settings.autosave = value;
        if (value) saveGame(state, AUTOSAVE_ID, "Autosave", true);
      }),
      toggle("Show the tutorial", state.settings.showTutorial, (value) => {
        state.settings.showTutorial = value;
        if (value) state.tutorialStep = 0;
        ctx.refresh();
      }),
      toggle("Confirm large purchases", state.settings.confirmLargeSpend, (value) => {
        state.settings.confirmLargeSpend = value;
      })
    )
  );
  el.appendChild(
    section(
      "New game",
      h("p", { class: "tiny muted", text: "Starts again from day 1 with fresh capital and a new set of competitors." }),
      h(
        "div",
        { class: "btn-row" },
        button(
          "Start a new game",
          async () => {
            const ok = await confirmDialog(
              "Start a new game?",
              "The current game continues to exist only if you have saved it.",
              "Start over"
            );
            if (!ok) return;
            const name = window.prompt("Company name", "Newco");
            if (name === null) return;
            ctx.engine.replaceState(createNewGame(name));
            toast("New game started.", "good");
            ctx.go("dashboard");
          },
          "btn danger"
        )
      )
    )
  );
  el.appendChild(
    section(
      "About",
      stat("Company", company.name),
      stat("Day", String(state.day)),
      stat("Total revenue", money(state.stats.revenueTotal)),
      stat("Total costs", money(state.stats.costsTotal)),
      stat("Customers served", String(Math.round(state.stats.customersTotal))),
      stat("Peak net worth", money(state.stats.peakNetWorth)),
      h("p", {
        class: "tiny muted",
        text: "Keyboard: space pauses, 1\u20134 set the speed. The simulation runs the same at every speed."
      })
    )
  );
  return { el };
}
function toggle(label, value, onChange) {
  const input = h("input", {
    type: "checkbox",
    checked: value,
    on: {
      change: () => onChange(input.checked)
    }
  });
  return h("label", { class: "switch" }, input, h("span", { text: label }));
}

// src/main.ts
var root = document.getElementById("app");
if (!root) throw new Error("#app is missing from the page");
var app = null;
function boot(state) {
  app?.stop();
  const engine = new Engine(state);
  app = new App(root, engine);
  globalThis.__BM__ = {
    engine,
    state,
    app,
    grades: GRADES.length,
    map: () => CityMap.current
  };
  app.register({ route: "dashboard", label: "Dashboard", icon: "\u25A6", group: "Overview", factory: dashboardView });
  app.register({ route: "founder", label: "You", icon: "\u{1F464}", group: "Overview", factory: founderView });
  app.register({
    route: "news",
    label: "Newsroom",
    icon: "\u{1F4F0}",
    group: "Overview",
    factory: newsView,
    badge: (s) => s.decisions.length
  });
  app.register({
    route: "businesses",
    label: "Businesses",
    icon: "\u{1F3EC}",
    group: "Company",
    factory: businessesView,
    badge: (s) => playerBusinesses(s).filter((b) => b.status === "setup").length
  });
  app.register({ route: "employees", label: "Employees", icon: "\u{1F465}", group: "Company", factory: employeesView });
  app.register({ route: "inventory", label: "Inventory", icon: "\u{1F4E6}", group: "Company", factory: inventoryView });
  app.register({ route: "logistics", label: "Distribution", icon: "\u{1F69A}", group: "Company", factory: logisticsView });
  app.register({ route: "headoffice", label: "Head office", icon: "\u{1F3DB}", group: "Company", factory: headOfficeView });
  app.register({
    route: "holding",
    label: "Holding",
    icon: "\u{1F3D7}",
    group: "Company",
    factory: holdingView,
    // A division nobody is answerable for is the thing this screen exists to
    // fix, so it says how many there are without being opened.
    badge: (s) => s.divisions.filter((d) => d.headEmployeeId === null).length
  });
  app.register({ route: "finance", label: "Finance", icon: "\u{1F4B6}", group: "Economy", factory: financeView });
  app.register({
    route: "reports",
    label: "Reports",
    icon: "\u{1F4CA}",
    group: "Economy",
    factory: reportsView,
    badge: (s) => unreadAlerts(s).filter((a) => a.priority !== "info").length
  });
  app.register({ route: "marketing", label: "Marketing", icon: "\u{1F4E3}", group: "Economy", factory: marketingView });
  app.register({ route: "property", label: "Real estate", icon: "\u{1F3E2}", group: "Build", factory: propertyView });
  app.register({ route: "progress", label: "Progress", icon: "\u{1F3C6}", group: "Growth", factory: progressView });
  app.register({
    route: "contracts",
    label: "Contracts",
    icon: "\u{1F4DD}",
    group: "Growth",
    factory: contractsView,
    badge: (s) => s.contractOffers.length
  });
  app.register({ route: "research", label: "Research", icon: "\u{1F52C}", group: "Growth", factory: researchView });
  app.register({ route: "map", label: "Map", icon: "\u{1F5FA}", group: "World", factory: mapView });
  app.register({ route: "market", label: "Competition", icon: "\u2694", group: "World", factory: marketView });
  app.register({ route: "settings", label: "Settings", icon: "\u2699", group: "World", factory: settingsView });
  app.start();
}
showWelcome(root, boot);
//# sourceMappingURL=main.js.map
