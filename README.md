# 🌾 Farm Ledger – Farm Management & Accounting System

A modern, responsive, full-stack Agricultural ERP and Ledger System built from scratch using **HTML, CSS, JavaScript, Node.js, Express.js, MongoDB, and Mongoose**.

---

## 🌟 Key Features

### 👨‍🌾 1. Farmer Dashboard (Farm Admin)
- **Executive Financial KPI Overview**: Real-time summary cards for Total Crop Revenue, Total Input Expenses, Total Worker Wages Paid, Outstanding Worker Dues, Net Profit/Loss, and Profit Margin.
- **Interactive Visualizations**:
  - **Monthly Financial Trends Chart**: Revenue vs Operational Expenses (Inputs + Labor) vs Net Profit.
  - **Expense Breakdown Chart**: Doughnut chart analyzing Seeds, Fertilizers, Fuel, Machinery Rental, and Labor Wages.
- **Workforce & Wage Management**:
  - Add, edit, or archive farm hands.
  - Custom daily wage rates, contact info, and specializations (Tractor Operator, Harvester, Greenhouse Care, Irrigation Specialist).
  - Live calculated balances (Total Earned, Total Paid, Pending Wage Dues per worker).
- **Attendance & Workday Register**:
  - Record attendance with status flags: **Present (Full Day - 100%)**, **Half Day (50%)**, **Overtime (1.375x+)**, and **Absent (0%)**.
  - Log field activities, crops worked on, and hours worked.
  - Automatic calculation of earned wages for the day.
- **Wage Disbursements & Payouts**:
  - Record payouts directly to workers via **Cash, UPI, Bank Transfer (NEFT/IMPS)**, or Cheque with reference numbers and voucher receipts.
  - Instant balance deduction and sync with Worker's portal.
- **Crop Expenses & Input Costs**:
  - Categorized tracking of Seeds, Fertilizers, Pesticides, Irrigation fittings, Fuel/Diesel, Machinery hire, and Freight.
  - Searchable expense logs with vendor details and payment mode.
- **Crop Harvest Sales & Revenue**:
  - Log harvested produce sales with quantity, unit (kg, quintal, ton, crates, bags), unit price, total realized revenue, buyer/APMC Mandi details, and payment collection status.
- **Unified Double-Entry Financial Ledger**:
  - Chronological audit stream of all farm cash inflows (crop sales) and outflows (input costs + wage disbursements).
  - Search and filter by transaction type, category, or party with net cash-flow calculations.
- **Production & Financial Reports**:
  - Filter by date range: Last 7 Days, Last 30 Days, Current Season, Year-to-Date, or All-Time.
  - Crop performance margin breakdown and expense category percentages.
  - **1-Click CSV Export** and **Print-Ready Clean Report Layout**.

---

### 🚜 2. Worker Dashboard (Personalized & Isolated)
- **Role-Based Isolation**: Workers securely access **only their own** attendance and wage ledger.
- **Live Sync with Farm Ledger**: Any attendance marked or payment disbursed by the Farmer immediately reflects on the Worker's dashboard upon clicking "Sync" or on page reload.
- **Personal Financial Overview**:
  - **Total Wages Earned**: Total accumulated wages from logged workdays.
  - **Payments Received**: Total payouts received from the farm owner.
  - **Pending / Outstanding Wages**: Highlighted alert box showing unpaid balance.
  - **Workdays & Hours Logged**: Present days, half days, overtime hours.
- **Interactive Monthly Earnings Chart**: Compare monthly wages earned vs payments received.
- **Personal Attendance History**: Filterable history showing date, shift status, hours worked, and daily wage earned.
- **Personal Payment Receipts**: Complete voucher log of all cash payouts, UPI transfers, and bank deposits received.

---

### 🔒 3. Security & Architecture
- **JWT (JSON Web Tokens)**: Secure token-based authentication stored in `localStorage` and passed in `Authorization: Bearer <token>` headers.
- **Role-Based Access Control (RBAC)**: Dedicated server-side middleware `protect`, `requireFarmer`, and `requireWorker` ensuring workers cannot access farmer endpoints or other workers' records.
- **Bcryptjs Password Hashing**: Passwords salted and hashed with 10 rounds prior to database insertion; passwords excluded from API JSON responses.
- **Shared MongoDB Backend**: Unified relational models linked via Mongoose `ObjectId` references.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: `v18.0.0` or later (`node -v`)
- **MongoDB**: Local MongoDB instance running on `mongodb://127.0.0.1:27017` or a MongoDB Atlas URI

### 2. Installation
```bash
# Clone or navigate to the directory
cd "d:/IBSL-Farmer Management"

# Install dependencies
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/farm_ledger
JWT_SECRET=super_secret_farm_ledger_jwt_key_2026_dev
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

### 4. Seed Realistic Demo Data
Run the standalone database seeder to populate the farm, workers, attendance records, expenses, and crop sales:
```bash
npm run seed
```

### 5. Start the Application
```bash
# Start in production mode
npm start

# Or start in watch mode for development
npm run dev
```

Open your browser at:
👉 **[http://localhost:5000](http://localhost:5000)**

---

## 🔑 Demo Login Credentials

The application includes **1-Click Demo Buttons** on the login screen for instant testing:

| Role | Name | Email | Password |
|---|---|---|---|
| **Farmer (Admin)** | Rajesh Verma | `farmer@farmledger.com` | `password123` |
| **Worker 1** | Ramesh Kumar (Machinery) | `ramesh@farmledger.com` | `password123` |
| **Worker 2** | Suresh Patel (Harvester) | `suresh@farmledger.com` | `password123` |
| **Worker 3** | Anita Devi (Horticulture) | `anita@farmledger.com` | `password123` |
| **Worker 4** | Manoj Singh (Irrigation) | `manoj@farmledger.com` | `password123` |

*(You can also click the **"Seed Demo Data"** button at any time in the app header to reset and refresh sample records).*

---

## 🛠️ API Reference

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register a new Farmer account
- `POST /api/auth/login` - Authenticate Farmer or Worker and issue JWT
- `GET /api/auth/me` - Retrieve authenticated user profile and farm details
- `PUT /api/auth/profile` - Update user / farm profile details

### Farmer Routes (`/api/farmer`) *(Requires Farmer JWT)*
- `GET /api/farmer/dashboard-summary` - Aggregate KPIs, monthly trends, expense breakdown
- `GET /api/farmer/workers` - List workers with calculated balances and attendance stats
- `POST /api/farmer/workers` - Create a new worker account
- `PUT /api/farmer/workers/:id` - Update worker details or rate
- `DELETE /api/farmer/workers/:id` - Deactivate or remove worker
- `GET /api/farmer/attendance` - Query attendance register with filters
- `POST /api/farmer/attendance` - Mark attendance with automatic wage computation
- `PUT /api/farmer/attendance/:id` - Edit attendance entry
- `DELETE /api/farmer/attendance/:id` - Delete attendance entry
- `GET /api/farmer/payments` - List wage disbursements
- `POST /api/farmer/payments` - Record wage payout to a worker
- `DELETE /api/farmer/payments/:id` - Delete payment entry
- `GET /api/farmer/expenses` - List crop expenses
- `POST /api/farmer/expenses` - Log crop input cost
- `PUT /api/farmer/expenses/:id` - Edit expense
- `DELETE /api/farmer/expenses/:id` - Delete expense
- `GET /api/farmer/sales` - List crop harvest sales and revenue
- `POST /api/farmer/sales` - Record harvest sale
- `PUT /api/farmer/sales/:id` - Update sale
- `DELETE /api/farmer/sales/:id` - Delete sale
- `GET /api/farmer/transactions` - Unified chronological cash flow ledger
- `GET /api/farmer/reports` - Period reports with crop and expense breakdowns

### Worker Routes (`/api/worker`) *(Requires Worker JWT)*
- `GET /api/worker/dashboard-summary` - Personal earnings, payments, pending dues, workdays
- `GET /api/worker/attendance` - Personal attendance log
- `GET /api/worker/payments` - Personal payment receipts

### System Routes (`/api/seed`)
- `POST /api/seed` - On-demand database seeder

---

## 📁 Project Directory Structure

```
d:\IBSL-Farmer Management\
├── .env.example              # Environment variables template
├── .env                      # Local environment configuration
├── package.json              # Dependencies and run scripts
├── README.md                 # Complete documentation
├── server.js                 # Express server & API route mounting
├── config/
│   └── db.js                 # Mongoose connection module
├── models/
│   ├── User.js               # Farmer & Worker schemas with bcrypt hashing
│   ├── Attendance.js         # Daily workdays, status, hours & wage calculations
│   ├── Payment.js            # Wage disbursements paid to workers
│   ├── CropExpense.js        # Input costs (seeds, fertilizers, fuel, machinery)
│   └── CropSale.js           # Harvest sales, buyers, revenue
├── middleware/
│   ├── auth.js               # JWT bearer token verification
│   └── roles.js              # Role authorization guards (requireFarmer, requireWorker)
├── routes/
│   ├── auth.js               # Auth endpoints (register, login, me)
│   ├── farmer.js             # Farmer dashboard, CRUD, analytics & reports
│   ├── worker.js             # Worker personal dashboard, attendance & payments
│   └── seed.js               # In-app demo seeder endpoint
├── utils/
│   └── seeder.js             # Standalone realistic demo data generator
└── public/
    ├── index.html            # Responsive single-page application
    ├── css/
    │   └── style.css         # Modern design system, glassmorphism, responsive styles
    └── js/
        ├── api.js            # Centralized API service client
        ├── auth.js           # Auth controller, role switcher, demo credentials
        ├── farmer.js         # Farmer dashboard controller & Chart.js rendering
        ├── worker.js         # Worker dashboard controller & personal analytics
        └── app.js            # App orchestrator, modal dialogs & toast alerts
```

---

## 🧪 Testing and Verification

The system includes automated tests and browser verification checks confirming:
1. Complete registration and login flows for Farmer and Worker.
2. Worker creation, daily attendance recording with wage calculation, and wage payout disbursements.
3. Crop expense logging and crop sale revenue calculations.
4. Net profit/loss tracking and monthly trend chart rendering.
5. Instant synchronization: Changes made by the Farmer immediately appear in the Worker portal.
