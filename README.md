# ☀️ Casagrand Athens - Solar Generation Monitor & Log (CGSolarLog)

A modern, responsive solar power monitoring web app and log management system built for the rooftop inverter substations at **Casagrand Athens** (Blocks A, B, F and future expansions).

Designed with a **Smart Pro-Rata Interpolation Engine** to handle intermittent/irregular technician readings, lifetime power calculations since commissioning (**18-Jul-2026**), financial savings (₹ INR), and carbon offsets (CO₂).

---

## 🚀 Key Features

1. **Executive Generation Metrics**:
   - **Lifetime Power Generated**: Total kWh / MWh generated since plant inception (18-Jul-2026).
   - **Month-to-Date (MTD) & Daily Average**: Real-time generation velocity.
   - **Financial Savings**: Calculated in INR (₹) using configurable grid tariff (default: ₹8.50/unit).
   - **Environmental Impact**: CO₂ emissions avoided (metric tons) and equivalent trees planted.
   - **Total Installed Capacity**: 59 kWp across Blocks A (8 kWp), B (20 kWp), and F (31 kWp).

2. **Smart Pro-Rata & Gap Interpolation Engine**:
   - Maintenance staff don't need to log every day. Whenever a technician logs a reading after a 4-day, 7-day, or multi-week gap, the system **automatically distributes the cumulative meter delta evenly across the missing dates**.
   - Clear distinction between **Direct Inverter Readings** and **Pro-Rata Estimated Days** across all charts and audit tables.

3. **Substation Health Status**:
   - Real-time status cards for each block showing the last recorded date, last meter value, days elapsed, and a 1-click **Log Meter** shortcut.

4. **Interactive Multi-Timeframe Visualizations**:
   - **Daily Generation Curve**: Area chart with 7D / 30D / All-Time filters, block filters, and pro-rata indicators.
   - **Monthly Breakdown**: Stacked and Grouped bar charts comparing block outputs.
   - **Block Share & Efficiency**: Donut chart and **Specific Yield (kWh/kWp)** benchmark rankings.

5. **Inverter Audit Trail Table**:
   - Searchable, paginated history table with toggles for *Direct Readings Only* vs *Continuous Day-by-Day Series*.
   - One-click CSV export.

6. **Technician Entry Modal**:
   - Protected by a 4-digit security PIN (default: `1234`).
   - Live gap detection and pro-rata preview before submitting.

7. **Free Backend & Google Sheets Sync**:
   - Free Google Apps Script Web App acting as a serverless REST API for Google Sheets.
   - Works 100% offline / locally out of the box with realistic seed data before connecting the live sheet.

---

## 🛠️ Local Development

To run the application locally:

```bash
# 1. Install dependencies
npm install

# 2. Start Vite dev server
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 🌐 Deploy to Netlify (Free Tier)

This repository includes `netlify.toml` for zero-configuration Netlify deployment.

### Method 1: Git Integration (Recommended)
1. Push this project to GitHub / GitLab.
2. Log into [Netlify](https://app.netlify.com).
3. Click **"Add new site"** > **"Import an existing project"**.
4. Select your repository.
5. Netlify will auto-detect the build command (`npm run build`) and publish directory (`dist`). Click **Deploy Site**!

### Method 2: Netlify CLI
```bash
npx netlify deploy --prod
```

---

## 📊 Google Sheet & Google Apps Script Setup (2 Minutes)

1. Create a new Google Sheet at [sheets.new](https://sheets.new) and title it **Casagrand Athens Solar Log**.
2. In the top menu, go to **Extensions > Apps Script**.
3. In the CGSolarLog web app, click **Google Sheet Setup** (or open `src/services/gasScriptCode.js`), copy the script code, and paste it into `Code.gs`.
4. Click **Deploy > New deployment**.
5. Select type: **Web app**.
6. Set *Execute as*: **Me**, and *Who has access*: **Anyone**.
7. Click **Deploy**, authorize permissions, and copy the Web App URL (ends with `/exec`).
8. In the CGSolarLog web app, open **Settings** (⚙️), paste the URL into **Google Apps Script Web App URL**, and click **Test Sync** -> **Save Configuration**!
