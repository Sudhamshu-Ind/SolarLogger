export const DEFAULT_COMMUNITY = {
  name: "Casagrand Athens",
  location: "Mogappair / Padi, Chennai",
  inceptionDate: "2026-07-18",
};

export const INITIAL_BLOCKS = [
  {
    id: "A",
    name: "Block A (Rooftop Plant)",
    capacityKwp: 8,
    inceptionDate: "2026-07-18",
    initialMeterReading: 0,
    color: "#f59e0b", // Amber
    inverterModel: "Deye SUN-8K-G04 (BLE)",
    status: "Active",
    phase: 1,
  },
  {
    id: "B",
    name: "Block B (Rooftop Plant)",
    capacityKwp: 20,
    inceptionDate: "2026-07-18",
    initialMeterReading: 0,
    color: "#0284c7", // Sky Blue
    inverterModel: "Deye SUN-20K-G04 (BLE)",
    status: "Active",
    phase: 1,
  },
  {
    id: "F",
    name: "Block F (Rooftop Plant)",
    capacityKwp: 31,
    inceptionDate: "2026-07-18",
    initialMeterReading: 0,
    color: "#10b981", // Emerald
    inverterModel: "Deye SUN-31K-G04 (BLE)",
    status: "Active",
    phase: 1,
  },
  {
    id: "G",
    name: "Block G (Rooftop Plant)",
    capacityKwp: 15,
    inceptionDate: "2026-09-03",
    initialMeterReading: 0,
    color: "#a855f7", // Purple
    inverterModel: "Deye SUN-15K-G04 (BLE)",
    status: "Active",
    phase: 2,
  },
  {
    id: "K",
    name: "Block K (Rooftop Plant)",
    capacityKwp: 15,
    inceptionDate: "2026-09-04",
    initialMeterReading: 0,
    color: "#ec4899", // Rose
    inverterModel: "Deye SUN-15K-G04 (BLE)",
    status: "Active",
    phase: 2,
  },
];

export const DEFAULT_SETTINGS = {
  communityName: "Casagrand Athens",
  gridTariffPerKwh: 8.50, // INR ₹ per kWh
  co2FactorKgPerKwh: 0.82, // CEA India standard grid emission factor (~0.82 kg CO2/kWh)
  treesFactorPerKwh: 0.041, // 1 tree absorbs ~20kg CO2 per year (~0.041 trees/kWh)
  adminPin: "SolarAthens",
  gasWebAppUrl: "https://script.google.com/macros/s/AKfycbyx1HquSxaCiCz5SjZ09_DVCkkN7R3YL55ZgPFBynPGTxUmDayd2LhKDGhrWinKBwGv/exec", // Google Apps Script URL
  enableProRataInterpolation: true,
  currencySymbol: "₹",
};
