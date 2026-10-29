# Farm Ledger - Model Context Protocol (MCP) Architecture

This document outlines the **Model Context Protocol (MCP)** architecture for integrating Farm Ledger with external LLMs, agentic IDEs, and autonomous agricultural assistants (such as Claude Desktop, Antigravity IDE, Cursor, and Gemini CLI).

---

## 1. Overview & Architecture Diagram

MCP (Model Context Protocol) is an open standard that allows AI models to access tools and data sources safely through standard protocols (Standard I/O or Server-Sent Events / SSE).

```
┌────────────────────────────────────────────────────────┐
│             External AI / MCP Client                   │
│      (Claude Desktop / Cursor / Antigravity IDE)       │
└──────────────────────────┬─────────────────────────────┘
                           │ MCP Protocol (JSON-RPC over stdio / SSE)
                           ▼
┌────────────────────────────────────────────────────────┐
│          Farm Ledger MCP Server (mcp/server.js)        │
│   • Exposes MCP Tool Manifest & JSON Schemas           │
│   • Validates Farmer Authentication Context            │
└──────────────────────────┬─────────────────────────────┘
                           │ Secure MongoDB Queries
                           ▼
┌────────────────────────────────────────────────────────┐
│            Farm Ledger Database Layer                  │
│   • Crops (Crop)           • Expenses (CropExpense)    │
│   • Sales (CropSale)       • Wages (Attendance/Payment)│
│   • Workers/Farmers (User) • Strict Tenant Isolation   │
└────────────────────────────────────────────────────────┘
```

---

## 2. Standard MCP Tool Catalog

Farm Ledger exposes 8 standardized MCP tools defined in [`utils/assistantTools.js`](file:///d:/IBSL-Farmer%20Management%20-%20Copy/utils/assistantTools.js):

| Tool Name | Parameters | Purpose |
| :--- | :--- | :--- |
| `get_financial_budget_summary` | *(none)* | Live unified ledger: revenue, crop expenses, worker wages, net profit/loss, margin, and cash flow. |
| `get_crop_expenses` | `cropName?`, `category?`, `limit?` | Detailed crop expenses (seeds, fertilizers, pesticides, fuel, machinery, etc.). |
| `get_worker_wages_and_dues` | `workerName?` | Attendance days, earned wages, paid wages, and pending dues per worker. |
| `get_crop_sales_and_income` | `cropName?` | Harvest sales volume, prices, total revenue, and buyer pending balances. |
| `get_registered_crops` | `status?` | Active crops, acreages, varieties, sowing dates, and harvest estimates. |
| `get_workers_directory` | *(none)* | Registered farm laborers with daily wage rates, phones, and specialties. |
| `get_recent_transactions` | `limit?` | Latest chronologically sorted sales, expenses, and wage payouts. |
| `get_farmer_profile` | *(none)* | Farmer metadata (name, farm name, location, and acreage). |

---

## 3. Tool Definition Schema (Example)

```json
{
  "name": "get_worker_wages_and_dues",
  "description": "Fetch worker attendance, earned wages, paid wages, and pending unpaid dues for the authenticated farmer.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "workerName": {
        "type": "string",
        "description": "Optional worker name to check specific worker dues (e.g. प्रणव, आदित्य, संभाजी, Pranav)"
      }
    },
    "required": []
  }
}
```

---

## 4. MCP Configuration for Claude Desktop / Agentic IDEs

To connect Claude Desktop or an MCP host to your local Farm Ledger system, add the following to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "farm-ledger": {
      "command": "node",
      "args": ["d:/IBSL-Farmer Management - Copy/mcp/server.js"],
      "env": {
        "MONGODB_URI": "mongodb+srv://.../farm_ledger",
        "FARMER_EMAIL": "nileshrahane8@gmail.com"
      }
    }
  }
}
```

---

## 5. Security & Isolation Guarantee

1. **Farmer-Wise Isolation**: All tools enforce `{ farmer: farmerId }` or `{ farmerId: farmerId }` constraints. No cross-tenant access is permitted.
2. **Never Invent Data**: Tool handlers return strictly aggregated numbers from MongoDB. If no matching records exist, tools return `{ recordsCount: 0 }` with exact zero balances.
3. **No External Credentials in Frontend**: LLM tool orchestration is executed entirely on the protected backend server.
