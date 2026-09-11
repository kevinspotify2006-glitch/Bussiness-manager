// src/sim/state.ts
var SAVE_VERSION = 1;
var START_CASH = 6e4;
var START_DAY = 1;
var START_HOUR = 8;
var LEDGER_LIMIT = 600;
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
function playerBusinesses(state) {
  return state.businesses.filter((b) => b.companyId === state.playerCompanyId);
}
function competitorBusinesses(state) {
  return state.businesses.filter((b) => b.companyId !== state.playerCompanyId);
}
function employeesOf(state, businessId) {
  return state.employees.filter((e) => e.businessId === businessId);
}

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
var CITY_POPULATION = DISTRICTS.reduce((total, d) => total + d.population, 0);

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
var TOTAL_EVENT_WEIGHT = CITY_EVENTS.reduce((total, event) => total + event.weight, 0);

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
  const total = Math.max(0, Math.round(hours));
  if (total < 24) return `${total}h`;
  const days = Math.floor(total / 24);
  const rest = total % 24;
  return rest ? `${days}d ${rest}h` : `${days}d`;
}

// src/sim/util.ts
function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
function approach(current, target, rate) {
  return current + (target - current) * clamp(rate, 0, 1);
}
function sum(items, pick) {
  let total = 0;
  for (const item of items) {
    const value = pick(item);
    if (Number.isFinite(value)) total += value;
  }
  return total;
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
  const cached = typeShareCache.get(typeId);
  if (cached !== void 0) return cached;
  const type = businessTypeOrThrow(typeId);
  const peers = BUSINESS_TYPES.filter((other) => other.category === type.category);
  const total = peers.reduce((acc, other) => acc + other.baseCustomers, 0);
  const share = total > 0 ? type.baseCustomers / total : 1;
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
  const score = factors.reduce((acc, factor) => acc * factor.value, 1);
  return { score: Math.max(1e-4, score), factors };
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
    const key = `${building.district}|${business.typeId}`;
    const list = groups.get(key);
    if (list) list.push(business);
    else groups.set(key, [business]);
  }
  for (const [key, members] of groups) {
    const [districtId, typeId] = key.split("|");
    const category = businessTypeOrThrow(typeId).category;
    const share = typeShare(typeId);
    const pool = districtPool(state, districtId, category) * share;
    if (pool <= 0) continue;
    const scores = members.map((business) => attractiveness(state, business).score);
    const simulatedTotal = scores.reduce((acc, score) => acc + score, 0);
    const background = backgroundOutlets(districtId, category, 0) * share * BACKGROUND_SCORE;
    const total = simulatedTotal + background;
    if (total <= 0) continue;
    members.forEach((business, index) => {
      const memberShare = scores[index] / total;
      result.set(business.id, {
        businessId: business.id,
        customers: pool * memberShare,
        share: memberShare,
        poolSize: pool
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
  const total = own + rivalTotal + background;
  if (total <= 0) return 0;
  let daily = 0;
  const saved = state.hour;
  for (let hour = 0; hour < 24; hour += 1) {
    state.hour = hour;
    if (!isTradingHour(state, business)) continue;
    daily += districtPool(state, building.district, category) * share;
  }
  state.hour = saved;
  return daily * (own / total);
}
var ALL_DISTRICT_IDS = DISTRICTS.map((d) => d.id);

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
function post(state, companyId, category, label, amount, businessId = null) {
  if (!Number.isFinite(amount) || amount === 0) return;
  const company = companyById(state, companyId);
  if (!company) return;
  company.cash += amount;
  if (!company.isPlayer) return;
  if (amount > 0) state.stats.revenueTotal += amount;
  else state.stats.costsTotal += -amount;
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
  let total = 0;
  for (const business of playerBusinesses(state)) {
    for (const [productId, units] of Object.entries(business.stock)) {
      const def = product(productId);
      if (def) total += def.wholesalePrice * units;
    }
  }
  return total;
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
  let total = 0;
  for (const business of playerBusinesses(state)) {
    if (business.status !== "open") continue;
    const recent = business.profitHistory.slice(-30);
    if (recent.length === 0) continue;
    const average = sum(recent, (value) => value) / recent.length;
    total += Math.max(0, average * 120);
  }
  return total;
}
function netWorth(state) {
  return playerCompany(state).cash + inventoryValue(state) + propertyValue(state) + goodwillValue(state) - debtTotal(state);
}
function loanOffers(state) {
  const base2 = state.economy.interestRate;
  return [
    {
      id: "starter",
      lender: "Northgate Credit Union",
      maxPrincipal: 3e4,
      annualRate: base2 + 0.045,
      termMonths: 24,
      minimumCreditRating: 30
    },
    {
      id: "business",
      lender: "Meridian Business Bank",
      maxPrincipal: 15e4,
      annualRate: base2 + 0.031,
      termMonths: 48,
      minimumCreditRating: 55
    },
    {
      id: "expansion",
      lender: "Halcyon Capital",
      maxPrincipal: 75e4,
      annualRate: base2 + 0.022,
      termMonths: 84,
      minimumCreditRating: 72
    }
  ];
}
function monthlyPayment(principal, annualRate, months) {
  const monthly = annualRate / 12;
  if (monthly <= 0) return principal / months;
  const factor = Math.pow(1 + monthly, months);
  return principal * monthly * factor / (factor - 1);
}
function borrowingHeadroom(state) {
  const company = playerCompany(state);
  const secured = propertyValue(state) * 0.7 + goodwillValue(state) * 0.4;
  const rating = clamp(company.creditRating / 100, 0.1, 1);
  return Math.max(0, (secured + 25e3 * rating) * (0.6 + rating) - debtTotal(state));
}
function takeLoan(state, offerId, principal) {
  const offer = loanOffers(state).find((o) => o.id === offerId);
  if (!offer) return { ok: false, message: "Unknown loan offer." };
  const company = playerCompany(state);
  if (company.creditRating < offer.minimumCreditRating) {
    return {
      ok: false,
      message: `${offer.lender} requires a credit rating of ${offer.minimumCreditRating}; yours is ${Math.round(company.creditRating)}.`
    };
  }
  const amount = Math.round(clamp(principal, 1e3, offer.maxPrincipal));
  if (amount > borrowingHeadroom(state)) {
    return { ok: false, message: "The bank will not lend this much against your current assets." };
  }
  const loan = {
    id: makeId("loan"),
    lender: offer.lender,
    principal: amount,
    outstanding: amount,
    annualRate: offer.annualRate,
    termMonths: offer.termMonths,
    monthlyPayment: Math.round(monthlyPayment(amount, offer.annualRate, offer.termMonths)),
    takenOnDay: state.day,
    missedPayments: 0
  };
  state.loans.push(loan);
  post(state, company.id, "loan", `${offer.lender} loan`, amount);
  return { ok: true, message: `${offer.lender} approved \u20AC${amount.toLocaleString("en-GB")}.` };
}
function repayLoan(state, loanId, amount) {
  const loan = state.loans.find((l) => l.id === loanId);
  if (!loan) return { ok: false, message: "Loan not found." };
  const company = playerCompany(state);
  const payment = Math.min(amount, loan.outstanding, company.cash);
  if (payment <= 0) return { ok: false, message: "Not enough cash to repay." };
  loan.outstanding -= payment;
  post(state, company.id, "loan", `Repayment \u2014 ${loan.lender}`, -payment);
  if (loan.outstanding < 1) {
    state.loans = state.loans.filter((l) => l.id !== loan.id);
    company.creditRating = clamp(company.creditRating + 4, 0, 100);
    return { ok: true, message: `${loan.lender} loan cleared. Credit rating improved.` };
  }
  return { ok: true, message: `Repaid \u20AC${Math.round(payment).toLocaleString("en-GB")}.` };
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
  const tax = profit * TAX_RATE;
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
  { id: "marketer", name: "Marketing Employee", baseSalary: 2950, description: "Makes every euro of marketing spend go further." }
];
var byId5 = new Map(ROLES.map((role2) => [role2.id, role2]));
function role(id) {
  const found = byId5.get(id);
  if (!found) throw new Error(`Unknown role: ${id}`);
  return found;
}
var TRAITS = [
  { id: "hardworker", name: "Hard worker", effect: "+15% productivity", productivity: 1.15, reliability: 1.04, moraleDrift: 0, learning: 1, salaryExpectation: 1.02 },
  { id: "lazy", name: "Lazy", effect: "\u221218% productivity", productivity: 0.82, reliability: 0.94, moraleDrift: 0.4, learning: 0.8, salaryExpectation: 0.94 },
  { id: "ambitious", name: "Ambitious", effect: "Learns fast, expects raises", productivity: 1.07, reliability: 1, moraleDrift: -0.6, learning: 1.3, salaryExpectation: 1.14 },
  { id: "loyal", name: "Loyal", effect: "Rarely resigns", productivity: 1, reliability: 1.06, moraleDrift: 0.5, learning: 1, salaryExpectation: 0.95 },
  { id: "unreliable", name: "Unreliable", effect: "Often absent", productivity: 0.95, reliability: 0.74, moraleDrift: -0.2, learning: 0.95, salaryExpectation: 0.9 },
  { id: "fastlearner", name: "Fast learner", effect: "Training pays off twice as fast", productivity: 1, reliability: 1, moraleDrift: 0, learning: 1.9, salaryExpectation: 1.05 },
  { id: "perfectionist", name: "Perfectionist", effect: "+ service quality, \u2212 speed", productivity: 0.92, reliability: 1.05, moraleDrift: -0.3, learning: 1.1, salaryExpectation: 1.06 },
  { id: "teamplayer", name: "Team player", effect: "Lifts colleagues\u2019 morale", productivity: 1.02, reliability: 1.02, moraleDrift: 0.3, learning: 1, salaryExpectation: 1 },
  { id: "difficult", name: "Difficult", effect: "Drags colleagues\u2019 morale down", productivity: 1.03, reliability: 0.98, moraleDrift: -0.5, learning: 1, salaryExpectation: 1.03 },
  { id: "friendly", name: "Customer-friendly", effect: "+ service quality", productivity: 1.01, reliability: 1.01, moraleDrift: 0.2, learning: 1, salaryExpectation: 1.04 }
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

// src/sim/alerts.ts
function pushAlert(state, priority, title, detail, businessId = null) {
  const existing = state.alerts.find(
    (alert2) => alert2.title === title && alert2.businessId === businessId && alert2.day === state.day
  );
  if (existing) {
    existing.detail = detail;
    existing.hour = state.hour;
    existing.read = false;
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
    read: false
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
  info: 2
};
function distinctAlerts(state) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const alert of sortedAlerts(state)) {
    const key = `${alert.title}|${alert.businessId ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
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

// src/sim/employees.ts
var APPLICANT_POOL = 14;
var RECRUITMENT_FEE = 420;
var TRAINING_COST_PER_DAY = 180;
var TRAINING_DAYS = 5;
function dailyWage(employee) {
  return employee.salary / 30;
}
function rollTraits() {
  const count2 = gameRng.chance(0.35) ? 2 : 1;
  const picked = gameRng.sample(TRAITS, count2);
  return picked.map((t) => t.id);
}
function generateApplicant(state, forcedRole) {
  const roleDef = forcedRole ? role(forcedRole) : gameRng.pick(ROLES);
  const skill = Math.round(clamp(gameRng.around(52, 26), 8, 99));
  const experience = Math.round(clamp(gameRng.around(skill / 12, 4), 0, 30));
  const traits = rollTraits();
  const traitDefs = traits.map(trait);
  const productivityMod = traitDefs.reduce((acc, t) => acc * t.productivity, 1);
  const reliabilityMod = traitDefs.reduce((acc, t) => acc * t.reliability, 1);
  const salaryMod = traitDefs.reduce((acc, t) => acc * t.salaryExpectation, 1);
  const marketPressure = 1 + clamp(0.08 - state.economy.unemployment, -0.05, 0.09) * 2.2;
  return {
    id: makeId("emp"),
    name: `${gameRng.pick(FIRST_NAMES)} ${gameRng.pick(LAST_NAMES)}`,
    age: Math.round(clamp(19 + experience + gameRng.range(0, 14), 18, 64)),
    role: roleDef.id,
    salary: Math.round(
      roleDef.baseSalary * (0.72 + skill / 125) * salaryMod * marketPressure * state.economy.inflation / 10
    ) * 10,
    skill,
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
  const upfront = RECRUITMENT_FEE + dailyWage(applicant) * 7;
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
  post(state, company.id, "wages", `Recruitment \u2014 ${applicant.name}`, -RECRUITMENT_FEE, businessId);
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
  const roleDef = role(employee.role);
  const next = Math.round(clamp(salary, roleDef.baseSalary * 0.5, roleDef.baseSalary * 4) / 10) * 10;
  const change = next - employee.salary;
  employee.salary = next;
  if (change > 0) {
    employee.morale = clamp(employee.morale + change / roleDef.baseSalary * 45, 0, 100);
    employee.loyalty = clamp(employee.loyalty + change / roleDef.baseSalary * 30, 0, 100);
    return { ok: true, message: `${employee.name} accepted the raise.` };
  }
  employee.morale = clamp(employee.morale + change / roleDef.baseSalary * 70, 0, 100);
  employee.loyalty = clamp(employee.loyalty + change / roleDef.baseSalary * 60, 0, 100);
  return { ok: true, message: `${employee.name} was not pleased about the pay cut.` };
}
function startTraining(state, employeeId) {
  const employee = state.employees.find((e) => e.id === employeeId);
  if (!employee) return { ok: false, message: "Employee not found." };
  if (employee.trainingEndsOnDay !== null) return { ok: false, message: "Already in training." };
  const cost = TRAINING_COST_PER_DAY * TRAINING_DAYS;
  const company = playerCompany(state);
  if (company.cash < cost) return { ok: false, message: `Training costs \u20AC${cost}.` };
  employee.trainingEndsOnDay = state.day + TRAINING_DAYS;
  post(state, company.id, "training", `Training \u2014 ${employee.name}`, -cost, employee.businessId);
  return { ok: true, message: `${employee.name} starts a ${TRAINING_DAYS}-day course.` };
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
  manager: { capacity: 0.15, service: 0.4, manager: true }
};
function staffPower(state, business) {
  const type = businessTypeOrThrow(business.typeId);
  const staff = employeesOf(state, business.id);
  const result = {
    capacityPerHour: 0,
    service: 0.55,
    present: 0,
    headcount: staff.length,
    morale: 0
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
    const moraleFactor = clamp(0.55 + employee.morale / 130, 0.5, 1.3);
    const power = (employee.productivity * 0.6 + employee.skill * 0.4) / 100;
    const contribution = power * moraleFactor;
    const weights = ROLE_WEIGHTS[employee.role];
    if (weights.manager) managers += contribution;
    capacity += contribution * weights.capacity;
    service += contribution * weights.service;
    for (const t of employee.traits) {
      if (t === "friendly" || t === "perfectionist") service += contribution * 0.18;
    }
  }
  const managerBoost = 1 + clamp(managers, 0, 2.5) * 0.16;
  result.capacityPerHour = capacity * type.customersPerStaffHour * managerBoost;
  result.service = clamp(0.55 + service * 0.32 * managerBoost, 0.35, 1.45);
  result.morale = moraleTotal / staff.length / 100;
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
  if (employee.role === "manager") return null;
  return employee.promotions === 0 ? employee.role : "manager";
}
function roleTitle(employee) {
  const name = role(employee.role).name;
  if (employee.role === "manager" || employee.promotions === 0) return name;
  return `Senior ${name}`;
}
function quotePromotion(state, employee) {
  const target = promotionTarget(employee);
  const sideways = target === employee.role;
  const salary = Math.round(employee.salary * (sideways ? 1.14 : 1.28) / 10) * 10;
  const quote = {
    role: target ?? employee.role,
    title: target === "manager" ? role("manager").name : `Senior ${role(employee.role).name}`,
    salary,
    extra: salary - employee.salary,
    blocked: null
  };
  if (!target) quote.blocked = "They already run the place.";
  else if (employee.skill < (sideways ? 45 : 62)) quote.blocked = `They need skill ${sideways ? 45 : 62} for that \u2014 train them first.`;
  else if (state.day - employee.hiredOnDay < 20) quote.blocked = "They have not been here long enough.";
  else if (state.day - employee.lastRecognisedOnDay < 30) quote.blocked = "They were recognised recently.";
  return quote;
}
function promote(state, employeeId) {
  const employee = state.employees.find((e) => e.id === employeeId);
  if (!employee) return { ok: false, message: "Unknown employee." };
  const quote = quotePromotion(state, employee);
  if (quote.blocked) return { ok: false, message: quote.blocked };
  const from = roleTitle(employee);
  employee.role = quote.role;
  employee.salary = quote.salary;
  employee.promotions += 1;
  employee.lastRecognisedOnDay = state.day;
  employee.morale = clamp(employee.morale + 20, 0, 100);
  employee.loyalty = clamp(employee.loyalty + 26, 0, 100);
  employee.stress = clamp(employee.stress + 6, 0, 100);
  employee.skill = clamp(employee.skill + 2, 0, 100);
  const title = roleTitle(employee);
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
      for (const other of colleagues) other.morale = clamp(other.morale - 5, 0, 100);
      const worst = colleagues.reduce((a, b) => b.morale < a.morale ? b : a);
      pushNews(state, "staff", `A row at ${state.businesses.find((b) => b.id === employee.businessId)?.name ?? "work"}`, `${employee.name} fell out with ${worst.name}. Morale across the team has taken a knock.`, {
        businessId: employee.businessId
      });
    }
  }
}
function employeesDaily(state) {
  for (const employee of [...state.employees]) {
    const roleDef = role(employee.role);
    const traitDefs = employee.traits.map(trait);
    const business = state.businesses.find((b) => b.id === employee.businessId);
    if (employee.trainingEndsOnDay !== null && state.day >= employee.trainingEndsOnDay) {
      const learning = traitDefs.reduce((acc, t) => acc * t.learning, 1);
      const gain = 9 * learning / (1 + employee.trainingDays * 0.45);
      employee.skill = clamp(employee.skill + gain, 0, 100);
      employee.productivity = clamp(employee.productivity + gain * 0.8, 0, 100);
      employee.trainingDays += 1;
      employee.trainingEndsOnDay = null;
      employee.morale = clamp(employee.morale + 5, 0, 100);
      pushAlert(state, "info", `${employee.name} finished training`, `Skill is now ${Math.round(employee.skill)}.`, employee.businessId);
    }
    const payRatio = employee.salary / (roleDef.baseSalary * state.economy.inflation);
    const payEffect = clamp((payRatio - 1) * 30, -16, 14);
    const moraleDrift = traitDefs.reduce((acc, t) => acc + t.moraleDrift, 0);
    let workload = -3;
    if (business && business.status === "open") {
      const type = businessTypeOrThrow(business.typeId);
      const colleagues = Math.max(1, business.employeeIds.length);
      const openHours = Math.max(1, business.openTo - business.openFrom);
      const capacity = colleagues * type.customersPerStaffHour * openHours;
      const served = business.yesterday.customers + business.yesterday.lostCustomers;
      const utilisation = capacity > 0 ? served / capacity : 0;
      workload = clamp((utilisation - 0.7) * 26, -5, 14);
    }
    employee.stress = clamp(employee.stress + workload * 0.5 - 2 + gameRng.range(-2, 2), 0, 100);
    employee.morale = clamp(
      employee.morale + payEffect * 0.35 + moraleDrift - employee.stress * 0.06 + gameRng.range(-2, 2),
      0,
      100
    );
    employee.loyalty = clamp(employee.loyalty + (employee.morale - 55) * 0.05, 0, 100);
    employee.experience += 1 / 360;
    peopleEvents(state, employee);
    const risk = clamp((35 - employee.morale) / 260 + (30 - employee.loyalty) / 900, 0, 0.22);
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
  let total = 0;
  for (const business of state.businesses) {
    if (business.companyId !== state.playerCompanyId) continue;
    const staff = employeesOf(state, business.id);
    const amount = staff.reduce((acc, e) => acc + dailyWage(e), 0);
    if (amount <= 0) continue;
    business.today.wages += amount;
    post(state, business.companyId, "wages", `Wages \u2014 ${business.name}`, -amount, business.id);
    total += amount;
  }
  return total;
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
  post(state, company.id, "rent", `Deposit & first month \u2014 ${building.address}`, -upfront);
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
  post(state, company.id, "rent", `Deposit returned \u2014 ${building.address}`, refund);
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
  let total = 0;
  for (const [productId, units] of Object.entries(business.stock)) {
    const def = product(productId);
    if (def) total += def.volume * units;
  }
  return total;
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
  return Math.min(power.capacityPerHour + owner, floorLimit);
}
function tradeHour(state, business, allocation) {
  if (business.status !== "open" || !isTradingHour(state, business)) return;
  const arrivals = allocation?.customers ?? 0;
  if (arrivals <= 0) return;
  const type = businessTypeOrThrow(business.typeId);
  const capacity = hourlyCapacity(state, business);
  const served = Math.min(arrivals, capacity);
  const turnedAway = Math.max(0, arrivals - capacity);
  let revenue = 0;
  let cogs = 0;
  let units = 0;
  let unmet = 0;
  if (type.productIds.length === 0) {
    const fee = business.prices.service ?? type.serviceFee;
    revenue = served * fee;
  } else {
    const defs = type.productIds.map((id) => product(id)).filter((d) => Boolean(d));
    const appealTotal = sum(defs, (d) => d.appeal);
    if (appealTotal <= 0) return;
    for (const def of defs) {
      const share = def.appeal / appealTotal;
      const wanted = served * share * def.unitsPerBasket;
      if (wanted <= 0) continue;
      const available = business.stock[def.id] ?? 0;
      const sold = Math.min(wanted, available);
      if (sold > 0) {
        business.stock[def.id] = available - sold;
        const price = business.prices[def.id] ?? def.marketPrice;
        revenue += sold * price;
        cogs += sold * (business.costBasis[def.id] ?? def.wholesalePrice);
        units += sold;
      }
      unmet += wanted - sold;
    }
    if (type.serviceFee > 0) revenue += served * (business.prices.service ?? type.serviceFee);
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
  const utilities = building.rent * UTILITY_RATE / 30 * (building.status === "owned" ? 1.1 : 1);
  if (dailyRent > 0) {
    post(state, business.companyId, "rent", `Rent \u2014 ${business.name}`, -dailyRent, business.id);
    business.today.rent += dailyRent;
  }
  if (utilities > 0) {
    post(state, business.companyId, "utilities", `Utilities \u2014 ${business.name}`, -utilities, business.id);
    business.today.otherCosts += utilities;
  }
  if (business.marketingBudget > 0 && business.status === "open") {
    post(state, business.companyId, "marketing", `Marketing \u2014 ${business.name}`, -business.marketingBudget, business.id);
    business.today.marketing += business.marketingBudget;
  }
  const power = staffPower(state, business);
  const targetService = clamp(
    power.headcount === 0 ? 25 : 30 + power.service * 45 + (building.condition - 60) * 0.25,
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
    const total = business.reviewScore * business.reviewCount + raw * newReviews;
    business.reviewCount += newReviews;
    business.reviewScore = clamp(total / business.reviewCount, 1, 5);
    writeReviews(state, business, raw, availability);
    business.reputation = approach(business.reputation, (business.reviewScore - 1) / 4 * 100, 0.16);
  } else if (business.status === "open") {
    business.reputation = approach(business.reputation, 30, 0.03);
  }
  const districtDef = district(building.district);
  const reachPerEuro = 26e3 / Math.max(4e3, districtDef.population);
  const gain = Math.sqrt(business.marketingBudget) * reachPerEuro * 0.9;
  const wordOfMouth = business.today.customers / Math.max(400, districtDef.population * 0.02) * 6;
  business.awareness = clamp(business.awareness * 0.975 + gain + wordOfMouth, 0, 100);
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
  const revenue = customers * revenuePerCustomer2;
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
  pushAlert(state, "info", "A competitor closed", message, null);
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
  pushAlert(state, "warning", "A competitor opened nearby", `${company.name} opened ${type.name.toLowerCase()} "${business.name}" in ${where}.`, null);
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

// src/sim/procurement.ts
var DELIVERY_RATE = 0.18;
var DELIVERY_CALLOUT = 15;
function unitPrice(state, supplierId, productId, districtEventCost = 1) {
  const def = supplier(supplierId);
  const productDef = product(productId);
  if (!def || !productDef) return 0;
  const spend = state.supplierSpend[supplierId] ?? 0;
  const discount = spend >= def.volumeThreshold ? def.volumeDiscount : 0;
  return Number(
    (productDef.wholesalePrice * def.priceMultiplier * (1 - discount) * state.economy.inflation * districtEventCost).toFixed(2)
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
  const total = Number((goodsCost + deliveryCost).toFixed(2));
  if (total > playerCompany(state).cash) problems.push("Not enough cash for this order.");
  return {
    lines,
    units,
    volume: Number(volume.toFixed(1)),
    goodsCost: Number(goodsCost.toFixed(2)),
    deliveryCost,
    total,
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
        const total = current + accepted;
        business.costBasis[line.productId] = total > 0 ? (current * currentCost + accepted * line.unitPrice) / total : line.unitPrice;
        business.stock[line.productId] = total;
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
  return channel.reach * channel.conversion * match * headroom * 100 * 0.42;
}
function startCampaign(state, channelId, businessId, days) {
  const channel = marketingChannel(channelId);
  const business = businessById(state, businessId);
  if (!channel || !business) return { ok: false, message: "Unknown campaign." };
  if (business.companyId !== state.playerCompanyId) return { ok: false, message: "That is not your business." };
  const length = Math.max(channel.minimumDays, Math.round(days));
  const total = channel.dailyCost * length;
  const company = playerCompany(state);
  if (company.cash < total) {
    return { ok: false, message: `That campaign costs ${total.toLocaleString("en-GB")} euro in total.` };
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
    const total = Math.round(unit * quantity);
    return base(
      "bulk-stock",
      `Clearance ${def.name.toLowerCase()} offered to ${business.name}`,
      `A wholesaler is clearing ${quantity} units of ${def.name} at ${moneyCents(unit)} each \u2014 35% below the going rate. It has to be collected today, and it will take ${Math.round(
        quantity * def.volume
      )} units of your storage.`,
      state,
      [
        { id: "buy", label: `Take all ${quantity} for ${money(total)}`, detail: "Cheap stock, but cash and shelf space are tied up." },
        { id: "decline", label: "Pass", detail: "Keep the space and the cash." }
      ],
      { businessId: business.id, productId },
      { quantity, unit, total },
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
    const total = decision.numbers.total ?? Math.round(unit * quantity);
    const company = playerCompany(state);
    if (company.cash < total) return "Not enough cash to take the pallet.";
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
    const factor = optionId === "grant" ? 1.08 : optionId === "partial" ? 1.04 : 1;
    const moraleShift = optionId === "grant" ? 16 : optionId === "partial" ? 6 : -15;
    for (const employee of staff) {
      employee.salary = Math.round(employee.salary * factor);
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
    const available = state.buildings.filter((b) => b.status === "available" && b.footTraffic > 15e3);
    if (available.length === 0) return null;
    const building = available.reduce((best, b) => b.footTraffic > best.footTraffic ? b : best, available[0]);
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
  const total = eligible.reduce((acc, def) => acc + def.weight, 0);
  let roll = gameRng.next() * total;
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
  pushAlert(state, "warning", decision.title, "A decision is waiting for you.", decision.context.businessId ?? null);
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
  const total = sum(peers, (peer) => attractiveness(state, peer).score) + backgroundOutlets(building.district, type.category, 0) * share;
  return total > 0 ? attractiveness(state, business).score / total : 0;
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
      pushAlert(state, "info", `Goal met: ${active.title}`, active.rewardText, active.businessId);
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
      pushAlert(state, "info", `${def.name} has ended`, "Conditions are returning to normal.", null);
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
  pushAlert(state, bad ? "warning" : "info", chosen.name, `${chosen.description} Affects ${scope} for about ${active.daysLeft} days.`, null);
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
    pushAlert(state, "info", `Achievement: ${def.name}`, def.description, null);
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
        pushAlert(state, "info", "Renovation complete", `${building.address} is back to full condition.`, null);
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
    if (state.day % 7 === 0) this.settleWeek();
    if (state.day % DAYS_PER_MONTH === 0) this.settleMonth();
    this.checkSolvency();
    emit("day", { day: state.day });
  }
  settleWeek() {
    const state = this.state;
    competitorWeekly(state);
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
      pushAlert(state, "info", "Corporation tax paid", `\u20AC${Math.round(tax).toLocaleString("en-GB")} on last month's profit.`, null);
    }
    const month = state.dayHistory.slice(-30);
    if (month.length >= 10) {
      const revenue = month.reduce((acc, d) => acc + d.revenue, 0);
      const profit = month.reduce((acc, d) => acc + d.profit, 0);
      pushNews(
        state,
        "company",
        `Monthly accounts closed: \u20AC${Math.round(profit).toLocaleString("en-GB")} ${profit >= 0 ? "profit" : "loss"}`,
        `Turnover \u20AC${Math.round(revenue).toLocaleString("en-GB")}. Rent, payroll, loan payments and tax have all been settled.`,
        { importance: "high" }
      );
    }
  }
  /** Bankruptcy: the player is warned first, then the game ends. */
  checkSolvency() {
    const state = this.state;
    const company = playerCompany(state);
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

// src/sim/save.ts
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
function people(input) {
  if (!Array.isArray(input)) return [];
  return input.filter(isRecord).map((entry) => ({
    ...entry,
    sickUntilDay: typeof entry.sickUntilDay === "number" ? entry.sickUntilDay : null,
    promotions: num(entry.promotions, 0),
    lastRecognisedOnDay: num(entry.lastRecognisedOnDay, num(entry.hiredOnDay, 0))
  }));
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
    businesses: Array.isArray(input.businesses) ? input.businesses : [],
    buildings: input.buildings,
    employees: people(input.employees),
    applicants: people(input.applicants),
    orders: Array.isArray(input.orders) ? input.orders : [],
    campaigns: Array.isArray(input.campaigns) ? input.campaigns : [],
    loans: Array.isArray(input.loans) ? input.loans : [],
    ledger: Array.isArray(input.ledger) ? input.ledger : [],
    dayHistory: Array.isArray(input.dayHistory) ? input.dayHistory : [],
    alerts: Array.isArray(input.alerts) ? input.alerts : [],
    events: Array.isArray(input.events) ? input.events : [],
    news: Array.isArray(input.news) ? input.news : [],
    decisions: Array.isArray(input.decisions) ? input.decisions : [],
    decisionHistory: isRecord(input.decisionHistory) ? input.decisionHistory : {},
    reviews: Array.isArray(input.reviews) ? input.reviews : [],
    approaches: isRecord(input.approaches) ? input.approaches : {},
    goals: Array.isArray(input.goals) ? input.goals : [],
    goalsCompleted: num(input.goalsCompleted, 0),
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
    for (const [key, value] of Object.entries(props.data)) el.dataset[key] = value;
  }
  if (props.aria) {
    for (const [key, value] of Object.entries(props.aria)) el.setAttribute(`aria-${key}`, value);
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
      this.current?.update?.();
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
      go: (route, params) => this.go(route, params),
      refresh: () => this.refresh(),
      params: this.params
    };
  }
  go(route, params = {}) {
    const entry = this.entries.find((item) => item.route === route) ?? this.entries[0];
    if (!entry) return;
    this.route = entry.route;
    this.params = params;
    this.current?.destroy?.();
    clear(this.main);
    this.current = entry.factory(this.ctx());
    this.main.appendChild(this.current.el);
    this.main.scrollTop = 0;
    this.renderNav();
    this.updateChrome();
  }
  refresh() {
    this.go(this.route, this.params);
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
      for (const entry of this.entries) {
        const count2 = entry.badge?.(this.state) ?? 0;
        host.appendChild(
          h(
            "button",
            {
              class: `nav-item${entry.route === this.route ? " active" : ""}`,
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
    this.topbar.appendChild(metric2("Net worth", "hud-worth"));
    this.topbar.appendChild(metric2("Today", "hud-today"));
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
      const items = Array.from(host.children);
      this.entries.forEach((entry, index) => {
        const item = items[index];
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
  openAlerts() {
    const { body } = modal({ title: "Alerts", width: 620 });
    const alerts = distinctAlerts(this.state);
    if (alerts.length === 0) {
      body.appendChild(h("p", { class: "empty", text: "Nothing needs your attention right now." }));
    }
    for (const alert of alerts) {
      body.appendChild(
        h(
          "div",
          { class: "alert-row" },
          h("span", { class: `alert-dot ${alert.priority}` }),
          h(
            "div",
            { style: "flex:1" },
            h("div", { class: "alert-title", text: alert.title }),
            h("div", { class: "alert-detail", text: alert.detail })
          ),
          h("span", { class: "alert-time", text: `Day ${alert.day} ${clockLabel(alert.hour)}` })
        )
      );
    }
    markAlertsRead(this.state);
    this.updateChrome();
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

// src/sim/city.ts
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
function plotCount(def) {
  const area = def.w * def.h;
  return Math.round(clamp(area * 900 * (0.6 + def.commercialActivity * 0.7), 8, 26));
}
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
function generateCity() {
  const rng = new Rng(CITY_SEED);
  const buildings = [];
  for (const def of DISTRICTS) {
    const count2 = plotCount(def);
    const columns = Math.max(2, Math.round(Math.sqrt(count2 * (def.w / def.h))));
    const rows = Math.max(2, Math.ceil(count2 / columns));
    const padding = 6e-3;
    const cellW = (def.w - padding * 2) / columns;
    const cellH = (def.h - padding * 2) / rows;
    const streetName = `${rng.pick(STREET_NAMES)} ${rng.pick(STREET_SUFFIX)}`;
    const altStreet = `${rng.pick(STREET_NAMES)} ${rng.pick(STREET_SUFFIX)}`;
    for (let index = 0; index < count2; index += 1) {
      const column = index % columns;
      const row = Math.floor(index / columns);
      if (row >= rows) break;
      const gap = 16e-4;
      const w = cellW - gap * 2;
      const h2 = cellH - gap * 2;
      const x = def.x + padding + column * cellW + gap;
      const y = def.y + padding + row * cellH + gap;
      const edge = column === 0 || column === columns - 1 || row === 0 || row === rows - 1;
      const corner = (column === 0 || column === columns - 1) && (row === 0 || row === rows - 1);
      const trafficFactor = corner ? 1.45 : edge ? 1.15 : 0.72;
      const size = Math.round(
        clamp(rng.around(70 + def.commercialActivity * 110, 90) * (edge ? 1.1 : 1), 40, 620)
      );
      const floors = size > 280 ? rng.int(1, 2) : rng.int(1, 3);
      const condition = Math.round(clamp(rng.around(72, 22), 25, 100));
      const conditionFactor = 0.7 + condition / 100 * 0.45;
      const rent = Math.round(size * def.rentPerSqm * conditionFactor * (edge ? 1.12 : 0.94) / 5) * 5;
      const price = Math.round(size * def.pricePerSqm * conditionFactor * (edge ? 1.1 : 0.95) / 500) * 500;
      const footTraffic = Math.round(def.footTraffic * trafficFactor * rng.range(0.75, 1.25));
      const number = 2 * (index + 1) + rng.int(0, 1);
      const address = `${number} ${index % 2 === 0 ? streetName : altStreet}`;
      buildings.push({
        id: `${def.id}-${index + 1}`,
        address,
        district: def.id,
        x,
        y,
        w,
        h: h2,
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
    approaches: {},
    goals: [],
    goalsCompleted: 0,
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

// src/ui/welcome.ts
function showWelcome(root2, onStart) {
  clear(root2);
  const saves = listSaves();
  const nameInput = h("input", {
    type: "text",
    value: "Newco",
    maxlength: 40,
    placeholder: "Company name"
  });
  const start = () => {
    const name = nameInput.value.trim() || "Newco";
    onStart(createNewGame(name));
  };
  nameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") start();
  });
  const saveList = h("div", {});
  if (saves.length > 0) {
    saveList.appendChild(h("h3", { class: "panel-title", style: "margin-top:18px", text: "Continue" }));
    for (const slot of saves.slice(0, 6)) {
      saveList.appendChild(
        h(
          "div",
          { class: "save-row" },
          h(
            "div",
            { style: "flex:1;min-width:0" },
            h("div", { text: slot.name + (slot.auto ? " (auto)" : "") }),
            h("div", {
              class: "save-meta",
              text: `${slot.company} \xB7 day ${slot.day} \xB7 ${money(slot.netWorth)}`
            })
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
              showWelcome(root2, onStart);
            },
            "btn small ghost"
          )
        )
      );
    }
  }
  root2.appendChild(
    h(
      "div",
      { class: "welcome" },
      h(
        "div",
        { class: "welcome-card" },
        h("div", { class: "brand-mark", style: "margin-bottom:14px" }, "BM"),
        h("h1", { class: "welcome-title", text: "Business Manager" }),
        h("p", {
          class: "welcome-sub",
          text: `${CITY_NAME}, population ${count(CITY_POPULATION)}. You have ${money(
            START_CASH
          )} and no employees. Established chains already hold the best pitches. Find a gap, open something, and try to still be trading next month.`
        }),
        h(
          "div",
          { class: "panel" },
          h("label", { class: "field" }, h("span", { text: "What is your company called?" }), nameInput),
          h(
            "div",
            { class: "btn-row" },
            button("Start a new company", start, "btn primary")
          ),
          h("p", {
            class: "tiny muted",
            style: "margin-top:12px",
            text: "A short tutorial walks through the first business. You can skip it at any point."
          })
        ),
        saveList
      )
    )
  );
  nameInput.focus();
  nameInput.select();
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
var MAX_ZOOM = 14;
function heat(value) {
  const t = clamp(value, 0, 1);
  if (t < 0.5) {
    const k2 = t / 0.5;
    return `rgb(${Math.round(58 + k2 * 92)}, ${Math.round(110 + k2 * 60)}, ${Math.round(180 - k2 * 40)})`;
  }
  const k = (t - 0.5) / 0.5;
  return `rgb(${Math.round(150 + k * 90)}, ${Math.round(170 - k * 90)}, ${Math.round(140 - k * 90)})`;
}
var CityMap = class {
  canvas;
  ctx;
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
    this.ctx = context;
    this.attach();
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
  zoomBy(factor) {
    this.camera.zoom = clamp(this.camera.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    this.clampCamera();
    this.draw();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(240, rect.width);
    const height = clamp(width * 0.62, 260, 720);
    this.cssW = width;
    this.cssH = height;
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.style.height = `${height}px`;
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    this.draw();
  }
  destroy() {
    this.resizeObserver?.disconnect();
    if (this.frame !== null) cancelAnimationFrame(this.frame);
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
      const inside = world.x >= building.x - pad && world.x <= building.x + building.w + pad && world.y >= building.y - pad && world.y <= building.y + building.h + pad;
      if (!inside) continue;
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
    if (this.frame !== null) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.paint();
    });
  }
  paint() {
    if (this.cssW === 0) this.resize();
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssW, this.cssH);
    ctx.fillStyle = "#0c1723";
    ctx.fillRect(0, 0, this.cssW, this.cssH);
    const s = this.scale();
    const showDetail = s > 900;
    const showLabels = s > 520;
    for (const def of DISTRICTS) {
      this.paintDistrict(def, showLabels);
    }
    for (const building of this.state.buildings) {
      this.paintBuilding(building, showDetail);
    }
    if (showLabels) {
      for (const def of DISTRICTS) this.paintDistrictLabel(def);
    }
  }
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
  paintDistrict(def, showLabels) {
    const ctx = this.ctx;
    const topLeft = this.toScreen(def.x, def.y);
    const s = this.scale();
    const w = def.w * s;
    const h2 = def.h * s;
    if (topLeft.x + w < -40 || topLeft.x > this.cssW + 40) return;
    if (topLeft.y + h2 < -40 || topLeft.y > this.cssH + 40) return;
    const value = this.districtValue(def);
    ctx.fillStyle = value >= 0 ? heat(value) : "#16202d";
    ctx.globalAlpha = value >= 0 ? 0.5 : 1;
    ctx.fillRect(topLeft.x, topLeft.y, w, h2);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = value >= 0 ? "rgba(255,255,255,0.18)" : "#243141";
    ctx.lineWidth = 1;
    ctx.strokeRect(topLeft.x + 0.5, topLeft.y + 0.5, w - 1, h2 - 1);
    if (!showLabels && w > 46) {
      ctx.fillStyle = "rgba(230,237,245,0.55)";
      ctx.font = "600 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(def.short, topLeft.x + w / 2, topLeft.y + h2 / 2 + 3);
    }
  }
  paintDistrictLabel(def) {
    const ctx = this.ctx;
    const topLeft = this.toScreen(def.x, def.y);
    const s = this.scale();
    const w = def.w * s;
    if (topLeft.x + w < 0 || topLeft.x > this.cssW) return;
    ctx.fillStyle = "rgba(230,237,245,0.85)";
    ctx.font = "600 11px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(def.name, topLeft.x + 6, topLeft.y + 14);
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
        return building.status === "available" ? "#6f9bd0" : "#3b4a5d";
      default:
        return building.status === "available" ? "#55677e" : "#3b4a5d";
    }
  }
  paintBuilding(building, showDetail) {
    const ctx = this.ctx;
    const topLeft = this.toScreen(building.x, building.y);
    const s = this.scale();
    const w = Math.max(2, building.w * s);
    const h2 = Math.max(2, building.h * s);
    if (topLeft.x + w < 0 || topLeft.x > this.cssW || topLeft.y + h2 < 0 || topLeft.y > this.cssH) return;
    ctx.fillStyle = this.buildingColour(building);
    ctx.fillRect(topLeft.x, topLeft.y, w, h2);
    const selected = building.id === this.selectedId;
    const hovered = building.id === this.hoverId;
    if (selected || hovered) {
      ctx.strokeStyle = selected ? "#ffffff" : "rgba(255,255,255,0.6)";
      ctx.lineWidth = selected ? 2 : 1.5;
      ctx.strokeRect(topLeft.x - 1, topLeft.y - 1, w + 2, h2 + 2);
    }
    if (!showDetail || w < 26 || h2 < 14) return;
    const business = building.businessId ? businessById(this.state, building.businessId) : void 0;
    if (business) {
      const type = businessType(business.typeId);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(topLeft.x, topLeft.y, w, h2);
      ctx.fillStyle = "#e6edf5";
      ctx.font = `${Math.min(13, h2 * 0.5)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(type?.icon ?? "\u2022", topLeft.x + w / 2, topLeft.y + h2 / 2 + 4);
      if (h2 > 30 && w > 60) {
        ctx.fillStyle = "rgba(230,237,245,0.85)";
        ctx.font = "600 9px system-ui, sans-serif";
        ctx.fillText(this.truncate(business.name, w), topLeft.x + w / 2, topLeft.y + h2 - 5);
      }
    } else if (h2 > 24 && w > 54) {
      ctx.fillStyle = "rgba(230,237,245,0.7)";
      ctx.font = "9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(this.truncate(building.address, w), topLeft.x + w / 2, topLeft.y + h2 / 2 + 3);
    }
  }
  truncate(text, width) {
    const max = Math.max(3, Math.floor(width / 5.6));
    return text.length > max ? `${text.slice(0, max - 1)}\u2026` : text;
  }
};
function marketShare(state, businessId) {
  const business = state.businesses.find((b) => b.id === businessId);
  if (!business) return 0;
  const building = state.buildings.find((b) => b.id === business.buildingId);
  if (!building) return 0;
  const category = businessType(business.typeId)?.category;
  const peers = state.businesses.filter((other) => {
    if (other.status !== "open" || other.id === business.id) return false;
    if (other.typeId !== business.typeId) return false;
    const otherBuilding = state.buildings.find((b) => b.id === other.buildingId);
    return otherBuilding?.district === building.district;
  });
  const own = attractiveness(state, business).score;
  const simulated = peers.reduce((acc, peer) => acc + attractiveness(state, peer).score, 0);
  const background = category ? backgroundOutlets(building.district, category, 0) * typeShare(business.typeId) : 0;
  const total = own + simulated + background;
  return total > 0 ? own / total : 0;
}

// src/sim/advice.ts
var SEVERITY_RANK = { critical: 3, warning: 2, opportunity: 1 };
function note(business, id, severity, headline, detail, action, route, weight, params = {}) {
  return {
    id: business ? `${business.id}:${id}` : id,
    businessId: business?.id ?? null,
    severity,
    headline,
    detail,
    action,
    route,
    params: business && route === "businesses" ? { business: business.id, ...params } : params,
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
  const factor = (label) => own.factors.find((f) => f.label === label)?.value ?? 1;
  if (factor("Location") < 0.45 && building) {
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
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
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
  el.appendChild(
    h(
      "div",
      { class: "grid cols-4", style: "margin-bottom:14px" },
      kpi("Cash", money(company.cash), `${count(state.employees.length)} on payroll`, company.cash < 0 ? "bad" : void 0),
      kpi("Profit today", moneySigned(todayRevenue - todayCosts), `${money(todayRevenue)} revenue`, todayRevenue - todayCosts >= 0 ? "good" : "bad"),
      kpi("Last 30 days", moneySigned(monthProfit), `${money(monthRevenue)} revenue`, monthProfit >= 0 ? "good" : "bad"),
      kpi("Net worth", moneyShort(worth), tier.name)
    )
  );
  const advice = topAdvice(state, 4);
  if (advice.length > 0) {
    const panel = section("What to do next");
    for (const item of advice) {
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
    el.appendChild(panel);
  }
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
    left.appendChild(
      section(
        "Your businesses",
        table(
          ["Business", "District", "Customers", "Revenue", "Profit", "Share"],
          open.map((business) => {
            const type = businessType(business.typeId);
            const building = state.buildings.find((b) => b.id === business.buildingId);
            const profit = business.yesterday.revenue ? business.yesterday.revenue - (business.yesterday.cogs + business.yesterday.wages + business.yesterday.rent + business.yesterday.marketing + business.yesterday.otherCosts) : 0;
            const row = h("span", {
              class: profit >= 0 ? "good" : "bad",
              text: state.dayHistory.length ? moneySigned(profit) : "\u2014"
            });
            return [
              h("span", { text: `${type?.icon ?? ""} ${business.name}` }),
              building?.address ?? "\u2014",
              count(business.today.customers),
              money(business.today.revenue),
              row,
              pct(marketShare(state, business.id) * 100)
            ];
          })
        ),
        h("p", { class: "tiny muted", text: "Customers and revenue are today so far; profit is yesterday\u2019s settled figure." })
      )
    );
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
function kpi(label, value, sub, tone) {
  return h(
    "div",
    { class: "kpi" },
    h("div", { class: "kpi-label", text: label }),
    h("div", { class: `kpi-value${tone ? ` ${tone}` : ""}`, text: value }),
    h("div", { class: "kpi-sub", text: sub })
  );
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
      const total = type.setupCost + type.equipmentCost;
      const affordable = company.cash >= total;
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
              text: money(total)
            })
          )
        )
      );
    }
  };
  const renderDetail = () => {
    detail.innerHTML = "";
    const def = district(building.district);
    const total = selected.setupCost + selected.equipmentCost;
    const monthlyRent = building.status === "rented" ? building.rent : 0;
    const staffCost = selected.roles.length * 2300;
    const preference = def.preferences[selected.category] ?? 1;
    const fit = preference >= 1.3 ? "Strong fit" : preference >= 0.95 ? "Reasonable fit" : "Poor fit";
    detail.appendChild(
      h(
        "div",
        { class: "panel" },
        h("h3", { class: "panel-title", text: "What this costs" }),
        stat("Fit-out", money(selected.setupCost)),
        stat("Equipment", money(selected.equipmentCost)),
        stat("Total up front", money(total), company.cash >= total ? "good" : "bad"),
        stat("Rent from here on", monthlyRent > 0 ? `${money(monthlyRent)}/mo` : "Owned \u2014 no rent"),
        stat("Wages once staffed", `about ${money(staffCost)}/mo`),
        stat("Cash after opening", money(company.cash - total), company.cash - total > 5e3 ? void 0 : "bad")
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
    )
  );
  const shell = h("div", { class: "map-shell" }, map.canvas, modeRow, controls, legend);
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
  el.appendChild(shell);
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
  const total = state.buildings.filter((b) => b.district === building.district).length;
  const competition = rivals / Math.max(1, total);
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
        const row = [
          def.name,
          count(def.population),
          moneyShort(def.averageIncome),
          count(def.footTraffic),
          money(entry.rent / Math.max(1, entry.count)),
          String(entry.available),
          String(entry.competitors),
          entry.mine > 0 ? h("span", { class: "tag good", text: String(entry.mine) }) : "\u2014"
        ];
        return row;
      })
    ),
    h("p", {
      class: "tiny muted",
      text: "Cheap rent usually means low foot traffic. The trick is finding the district where what you sell matches what people there can afford."
    }),
    rows.length === 0 ? empty("No districts loaded.") : null
  );
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
function makeOffer(state, businessId, amount) {
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
  const threshold = status.reserve * distress * gameRng.range(0.97, 1.05);
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
  post(state, company.id, "property", `Acquisition \u2014 ${business.name}`, -amount, business.id);
  if (seller) seller.cash += amount;
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
      const peers = state.businesses.filter((other) => {
        if (other.status !== "open" || other.typeId !== business.typeId) return false;
        const otherBuilding = buildingById(state, other.buildingId);
        return otherBuilding?.district === building.district;
      });
      const scores = peers.map((peer) => ({ peer, score: attractiveness(state, peer).score }));
      const background = backgroundOutlets(building.district, type.category, 0) * share;
      const total = sum(scores, (entry) => entry.score) + background;
      let dailyPool = 0;
      const savedHour = state.hour;
      for (let hour = 0; hour < 24; hour += 1) {
        state.hour = hour;
        dailyPool += districtPool(state, building.district, type.category) * share;
      }
      state.hour = savedHour;
      const ownScore = scores.find((entry) => entry.peer.id === business.id)?.score ?? 0;
      const ownShare = total > 0 ? ownScore / total : 0;
      const leader = scores.reduce((best, entry) => entry.score > best.score ? entry : best, scores[0]);
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
            leader && leader.peer.id !== business.id ? `${leader.peer.name} leads here on pull. ` : peers.length > 1 ? "You have the strongest pull of the named businesses here. " : "No named rival trades here. ",
            `${Math.round(background)} other outlets in the district also serve this market.`
          ),
          peers.length > 1 ? table(
            ["Business", "Owner", "Price level", "Reviews", "Pull"],
            scores.slice().sort((a, b) => b.score - a.score).map(({ peer, score }) => {
              const owner = state.companies.find((c) => c.id === peer.companyId);
              const isYou = peer.companyId === state.playerCompanyId;
              return [
                h("span", { class: isYou ? "good" : "", text: peer.name }),
                owner?.name ?? "\u2014",
                pct(priceIndex(peer) * 100),
                `${peer.reviewScore.toFixed(1)}\u2605`,
                pct(score / Math.max(1e-4, total) * 100, 1)
              ];
            })
          ) : null
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
        rows.map((row) => [
          h(
            "div",
            {},
            h("div", { text: row.company?.name ?? "Unknown" }),
            h("div", { class: "tiny muted", text: `${money(row.company?.cash ?? 0)} cash` })
          ),
          row.company?.personality ? PERSONALITY_LABELS[row.company.personality] : "\u2014",
          String(row.businesses.length),
          String(row.districts),
          pct(row.avgPrice * 100),
          `${row.avgReview.toFixed(1)}\u2605`,
          row.meetsYou ? h("span", { class: "tag bad", text: "Competes with you" }) : h("span", { class: "tag", text: "Elsewhere" })
        ])
      ),
      h("p", {
        class: "tiny muted",
        text: "Competitors set their own prices, marketing and expansion from what they can observe. A low price level means they are undercutting the market, not that they are cheap to beat."
      })
    )
  );
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
        const result = makeOffer(state, businessId, amount);
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
function priceAnalysis(ctx, business) {
  const state = ctx.state;
  const type = businessTypeOrThrow(business.typeId);
  const steps = [0.8, 0.9, 1, 1.1, 1.25, 1.5];
  const current = priceIndex(business);
  const rows = steps.map((factor) => {
    const overrides = {};
    for (const productId of type.productIds) {
      const def = product(productId);
      if (!def) continue;
      overrides[productId] = (business.prices[productId] ?? def.marketPrice) * factor;
    }
    if (type.serviceFee > 0) {
      overrides.service = (business.prices.service ?? type.serviceFee) * factor;
    }
    const customers = estimateDailyCustomers(state, business, overrides);
    const perCustomer = revenuePerCustomer(business, factor);
    const cogs = costPerCustomer(business);
    const gross = customers * (perCustomer - cogs);
    return {
      factor,
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
      rows.map((row) => [
        h("span", {
          class: row.factor === 1 ? "tag accent" : "",
          text: row.factor === 1 ? "Current" : `${row.factor > 1 ? "+" : ""}${Math.round((row.factor - 1) * 100)}%`
        }),
        count(row.customers),
        money(row.revenue),
        h("span", { class: row === best ? "good" : "", text: money(row.gross) })
      ])
    ),
    h("p", {
      class: "tiny muted",
      text: `You are currently charging ${Math.round(current * 100)}% of the market price. These are estimates at today's demand; competitors will react to a big move.`
    })
  );
}
function revenuePerCustomer(business, factor) {
  const type = businessTypeOrThrow(business.typeId);
  let total = type.serviceFee > 0 ? (business.prices.service ?? type.serviceFee) * factor : 0;
  const defs = type.productIds.map((id) => product(id)).filter((d) => Boolean(d));
  const appeal = sum(defs, (d) => d.appeal);
  if (appeal <= 0) return total;
  for (const def of defs) {
    const price = (business.prices[def.id] ?? def.marketPrice) * factor;
    total += def.appeal / appeal * def.unitsPerBasket * price;
  }
  return total;
}
function costPerCustomer(business) {
  const type = businessTypeOrThrow(business.typeId);
  const defs = type.productIds.map((id) => product(id)).filter((d) => Boolean(d));
  const appeal = sum(defs, (d) => d.appeal);
  if (appeal <= 0) return 0;
  let total = 0;
  for (const def of defs) {
    const cost = business.costBasis[def.id] ?? def.wholesalePrice;
    total += def.appeal / appeal * def.unitsPerBasket * cost;
  }
  return total;
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
  for (const factor of own.factors) {
    const relative = clamp(factor.value / 2, 0, 1);
    panel.appendChild(
      h(
        "div",
        { style: "margin:8px 0" },
        h(
          "div",
          { style: "display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px" },
          h("span", { text: factor.label }),
          h("span", { class: "muted", text: factor.hint })
        ),
        bar(relative, factor.value >= 1.05 ? "good" : factor.value < 0.85 ? "bad" : "")
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
          const total = own.score + sum(rivals, (r) => attractiveness(state, r).score);
          return [
            rival.name,
            owner?.name ?? "\u2014",
            pct(priceIndex(rival) * 100),
            `${rival.reviewScore.toFixed(1)}\u2605`,
            pct(score / Math.max(1e-4, total) * 100)
          ];
        })
      )
    );
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
      text: `${businessTypeOrThrow(business.typeId).name} uses these roles: ${businessTypeOrThrow(business.typeId).roles.map((r) => role(r).name).join(", ")}. Recruitment costs ${money(RECRUITMENT_FEE)} plus a week of wages up front.`
    })
  );
  if (applicants.length === 0) {
    applicantPanel.appendChild(empty("Nobody suitable applied today. The pool refreshes each day."));
  } else {
    applicantPanel.appendChild(
      table(
        ["Name", "Role", "Skill", "Reliability", "Traits", "Asking salary", ""],
        applicants.map((applicant) => [
          h("div", {}, h("div", { text: applicant.name }), h("div", { class: "tiny muted", text: `${applicant.age} years old` })),
          role(applicant.role).name,
          skillCell(applicant.skill),
          skillCell(applicant.reliability),
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
    })).filter((row) => row.value > 0);
    el.appendChild(
      section(
        "Across the company",
        table(
          ["Role", "People", "Average skill", "Average morale", "Monthly cost"],
          byRole.map((row) => {
            const people2 = state.employees.filter((e) => role(e.role).name === row.label);
            return [
              row.label,
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
function openEmployeeDialog(ctx, employee) {
  const state = ctx.state;
  const { body, footer, close } = modal({ title: employee.name, width: 520 });
  const roleDef = role(employee.role);
  const businesses = playerBusinesses(state);
  body.appendChild(
    h(
      "div",
      { class: "panel" },
      stat("Role", roleTitle(employee)),
      stat("Age", String(employee.age)),
      stat("Skill", `${Math.round(employee.skill)}/100`),
      stat("Productivity", `${Math.round(employee.productivity)}/100`),
      stat("Reliability", `${Math.round(employee.reliability)}/100`),
      stat("Morale", `${Math.round(employee.morale)}/100`, employee.morale < 40 ? "bad" : void 0),
      stat("Stress", `${Math.round(employee.stress)}/100`, employee.stress > 65 ? "bad" : void 0),
      stat("Loyalty", `${Math.round(employee.loyalty)}/100`),
      stat("Courses completed", String(employee.trainingDays)),
      stat("Promotions", String(employee.promotions)),
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
  const career = h("div", { class: "panel" }, h("h3", { class: "panel-title", text: "Career" }));
  career.appendChild(
    h("p", {
      class: "tiny muted",
      style: "margin:0 0 8px",
      text: quote.blocked ?? `Promoting them to ${quote.title} costs ${money(quote.extra)} more a month and buys real loyalty.`
    })
  );
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
  const marketRate = Math.round(roleDef.baseSalary * state.economy.inflation);
  body.appendChild(
    h(
      "label",
      { class: "field" },
      h("span", { text: `Monthly salary (market rate for this role: ${money(marketRate)})` }),
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
  if (employee.trainingEndsOnDay !== null) {
    body.appendChild(h("p", { class: "tiny muted", text: `In training until day ${employee.trainingEndsOnDay}.` }));
  } else {
    body.appendChild(
      h("p", {
        class: "tiny muted",
        text: `A ${TRAINING_DAYS}-day course costs ${money(TRAINING_COST_PER_DAY * TRAINING_DAYS)} and raises skill. Each additional course does less than the one before.`
      })
    );
    footer.appendChild(
      button("Send on a course", () => {
        const result = startTraining(state, employee.id);
        toast(result.message, result.ok ? "good" : "bad");
        close();
        ctx.refresh();
      })
    );
  }
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
  const available = SUPPLIERS.filter(
    (def) => type.productIds.some((id) => {
      const productDef = product(id);
      return productDef ? def.categories.includes(productDef.category) : false;
    })
  );
  const panel = section("Place an order");
  if (available.length === 0) {
    panel.appendChild(empty("No supplier carries what this business sells."));
    return panel;
  }
  let supplierId = available[0].id;
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
    }).filter((row) => row !== null);
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
        available.map((def) => ({
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
      "Cash flow",
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
    loanPanel.appendChild(
      table(
        ["Lender", "Outstanding", "Rate", "Monthly", "Missed", ""],
        state.loans.map((loan) => [
          loan.lender,
          money(loan.outstanding),
          pct(loan.annualRate * 100, 2),
          money(loan.monthlyPayment),
          loan.missedPayments > 0 ? h("span", { class: "bad", text: String(loan.missedPayments) }) : "0",
          button(
            "Repay 25%",
            () => {
              const result = repayLoan(state, loan.id, loan.outstanding * 0.25);
              toast(result.message, result.ok ? "good" : "bad");
              ctx.refresh();
            },
            "btn small"
          )
        ])
      )
    );
  }
  for (const offer of loanOffers(state)) {
    const eligible = company.creditRating >= offer.minimumCreditRating;
    const amountInput = numberInput(Math.min(offer.maxPrincipal, Math.round(borrowingHeadroom(state))), () => {
    }, {
      min: "1000",
      max: String(offer.maxPrincipal),
      step: "1000"
    });
    loanPanel.appendChild(
      h(
        "div",
        { class: "card", style: "margin-top:8px" },
        h(
          "div",
          { class: "card-head" },
          h(
            "div",
            {},
            h("div", { class: "card-title", text: offer.lender }),
            h("div", {
              class: "card-sub",
              text: `Up to ${money(offer.maxPrincipal)} \xB7 ${pct(offer.annualRate * 100, 2)} over ${offer.termMonths} months \xB7 needs credit ${offer.minimumCreditRating}`
            })
          ),
          h("span", { class: `tag ${eligible ? "good" : "bad"}`, text: eligible ? "Eligible" : "Not eligible" })
        ),
        h(
          "div",
          { style: "display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap" },
          h("label", { class: "field", style: "flex:1;min-width:150px;margin:0" }, h("span", { text: "Amount" }), amountInput),
          button(
            "Borrow",
            () => {
              const amount = Number(amountInput.value);
              const result = takeLoan(state, offer.id, amount);
              toast(result.message, result.ok ? "good" : "bad");
              if (result.ok) ctx.refresh();
            },
            "btn primary"
          )
        ),
        h("p", {
          class: "tiny muted",
          text: `A ${money(Number(amountInput.value) || 0)} loan would cost about ${money(
            monthlyPayment(Number(amountInput.value) || 0, offer.annualRate, offer.termMonths)
          )} a month.`
        })
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
    let available = state.buildings.filter((b) => b.status === "available");
    if (districtFilter !== "all") available = available.filter((b) => b.district === districtFilter);
    available.sort((a, b) => {
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
        available.slice(0, 40).map((building) => [
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
    if (available.length === 0) marketHost.appendChild(empty("Nothing available with these filters."));
    else if (available.length > 40) {
      marketHost.appendChild(h("p", { class: "tiny muted", text: `Showing 40 of ${available.length} available units.` }));
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
  const row = h("div", { class: "btn-row" });
  row.appendChild(button("Map", () => ctx.go("map", { building: building.id }), "btn small"));
  if (building.condition < 97 && building.renovationEndsOnDay === null) {
    row.appendChild(
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
    row.appendChild(
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
    row.appendChild(
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
    row.appendChild(
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
  return row;
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
  const movers = [...totals.entries()].map(([category, bucket]) => ({ category, change: bucket.now - bucket.before })).filter((row) => Math.abs(row.change) > 1).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 6);
  if (movers.length === 0) {
    return h("p", { class: "tiny muted", text: "Nothing changed materially compared with the day before." });
  }
  return h(
    "div",
    { style: "margin-top:12px" },
    h("h4", { class: "panel-title", text: "Why the result moved" }),
    table(
      ["Category", "Change vs previous day"],
      movers.map((row) => [
        LEDGER_LABELS[row.category],
        h("span", {
          class: (isRevenue(row.category) ? row.change > 0 : row.change > 0) ? "good" : "bad",
          text: moneySigned(row.change)
        })
      ])
    ),
    h("p", {
      class: "tiny muted",
      text: `Total swing: ${moneySigned(sum(movers, (m) => m.change))}.`
    })
  );
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
  globalThis.__BM__ = { engine, state, app };
  app.register({ route: "dashboard", label: "Dashboard", icon: "\u25A6", factory: dashboardView });
  app.register({ route: "map", label: "Map", icon: "\u{1F5FA}", factory: mapView });
  app.register({
    route: "news",
    label: "Newsroom",
    icon: "\u{1F4F0}",
    factory: newsView,
    badge: (s) => s.decisions.length
  });
  app.register({ route: "market", label: "Market", icon: "\u2694", factory: marketView });
  app.register({
    route: "businesses",
    label: "Businesses",
    icon: "\u{1F3EC}",
    factory: businessesView,
    badge: (s) => playerBusinesses(s).filter((b) => b.status === "setup").length
  });
  app.register({ route: "employees", label: "Employees", icon: "\u{1F465}", factory: employeesView });
  app.register({ route: "inventory", label: "Inventory", icon: "\u{1F4E6}", factory: inventoryView });
  app.register({ route: "marketing", label: "Marketing", icon: "\u{1F4E3}", factory: marketingView });
  app.register({ route: "finance", label: "Finance", icon: "\u{1F4B6}", factory: financeView });
  app.register({ route: "property", label: "Real estate", icon: "\u{1F3E2}", factory: propertyView });
  app.register({
    route: "reports",
    label: "Reports",
    icon: "\u{1F4CA}",
    factory: reportsView,
    badge: (s) => unreadAlerts(s).filter((a) => a.priority !== "info").length
  });
  app.register({ route: "settings", label: "Settings", icon: "\u2699", factory: settingsView });
  app.start();
}
showWelcome(root, boot);
//# sourceMappingURL=main.js.map
