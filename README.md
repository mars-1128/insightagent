# InsightAgent — Autonomous AI Data & Analytics Agent

> **Hackathon Theme:** Theme 9 — Data & Analytics Agents ("Talk to your data like a colleague, not a database")
>
> 🌐 **Live App:** [https://insightagent-mauve.vercel.app](https://insightagent-mauve.vercel.app)  
> ⚙️ **Backend Health:** [https://insightagent-backend-atne.onrender.com/health](https://insightagent-backend-atne.onrender.com/health)  
> 📦 **Repository:** [https://github.com/mars-1128/insightagent](https://github.com/mars-1128/insightagent)

InsightAgent lets non-technical users upload any CSV dataset (or load built-in business datasets) and ask analytical questions in plain English. Unlike a simple chatbot, InsightAgent executes a transparent **Plan → Edit → Tool Selection → Read-Only SQL → Statistics → Chart & Insights** workflow powered by Google Gemini's Interactions API and Supabase PostgreSQL.

---

## 1. Problem Statement
Business managers, educators, NGO staff, and small-business owners frequently need answers from tabular data, yet cannot write SQL or configure BI dashboards. Depending on analysts creates delays, while naive LLM chatbots hallucinate numbers or pose SQL-injection and data-mutation risks.

## 2. Solution Description
InsightAgent is a full-stack autonomous analytics workbench that:
1. Converts natural-language goals into an **editable multi-step execution plan**.
2. Uses **genuine Gemini function calling** (`@google/genai` Interactions API) across 6 specialized analytical tools.
3. Enforces **strict read-only PostgreSQL execution** (`SELECT`/`WITH` allowlist, table-ownership scoping, `BEGIN TRANSACTION READ ONLY`, 5s statement timeout, automatic `LIMIT 500`).
4. **Asks for clarification** with clickable options when a question is ambiguous instead of guessing.
5. **Pauses for human approval** before risky or export actions (or every SQL query when Safe SQL Gate is enabled), allowing users to review, edit, approve, or reject & replan.
6. Streams a **real-time step-by-step trace** (tool inputs, outputs, observations, timing, model failovers) alongside interactive Recharts visualizations (`Bar`, `Line`, `Area`, `Pie`, `Table`), computed statistics, and plain-English insights.

---

## 3. Agent & Tool Architecture

```
USER GOAL (Natural Language)
   │
   ▼
[1. Planner] ──► Generates 3-5 Editable Execution Steps (JSON Schema)
   │               User can edit, reorder, add/delete steps, or enable SQL Gate
   ▼
[2. Agent Loop (Gemini Interactions API + Automatic Model Failover)]
   ├──► Tool: inspect_dataset_schema  (Reads columns, types, distinct values, samples)
   ├──► Tool: request_clarification   (Pauses for user answer if goal is ambiguous)
   ├──► Tool: execute_readonly_sql    (Validated via sqlGuard + READ ONLY PG transaction)
   │          └─ Self-corrects / replans automatically on SQL error or 0-row result
   ├──► Tool: compute_statistics      (Mean, median, stdDev, quartiles, outliers, change %)
   ├──► Tool: render_chart_and_table  (Configures KPIs + Bar/Line/Area/Pie/Scatter/Table)
   └──► Tool: prepare_csv_export      (Human Approval Gate before generating CSV export)
   │
   ▼
[3. Final Result & Audit Log]
   └─ Interactive Charts + Executive Insights + Read-Only SQL Inspector + Audit Trail
```

---

## 4. Security & Reliability Mechanisms
- **Backend-Only Secrets:** `GEMINI_API_KEY`, `DATABASE_URL`, and `JWT_SECRET` live strictly in backend `.env`.
- **SQL & Prompt-Injection Defense (`sqlGuard.js` + `geminiClient.js`):**
  - Untrusted user goals and dataset metadata are wrapped in strict `<untrusted_*>` delimiters.
  - Independent backend SQL validation rejects non-`SELECT` queries, stacked statements (`;`), DDL/DML keywords (`DROP`, `DELETE`, `INSERT`, `UPDATE`, `ALTER`, `COPY`, `PG_SLEEP`), and internal tables (`users`, `datasets`, `agent_runs`, `audit_logs`, `pg_catalog`, `information_schema`).
  - Queries only target the authenticated user's dataset table inside `BEGIN TRANSACTION READ ONLY` with `SET LOCAL statement_timeout = '5000'`.
- **Human-in-the-Loop Approval & Stop Controls:** High/medium-risk actions (`prepare_csv_export`, sensitive column scans, or optional Safe SQL Gate) pause in `awaiting_approval` until approved or rejected; users can stop active runs anytime.
- **Model Resilience:** Automatic retry + cooldown circuit-breaker failover across Gemini 3.x models (`gemini-3.5-flash-lite` / `gemini-3.8-flash` / `gemini-3.5-flash` / `gemini-3.7-flash`).
- **Audit Logging & Idempotency:** Atomic status locks prevent duplicate execution; `audit_logs` records all plans, SQL executions, blocked queries, approvals, rejections, and clarifications.

---

## 5. Tech Stack
- **Frontend:** React 18, Vite, React Router, Tailwind CSS, Recharts, Lucide Icons, Axios + Fetch SSE
- **Backend:** Node.js, Express.js, JWT (`jsonwebtoken`), `bcryptjs`, `zod`, `multer`, `csv-parse`, `express-rate-limit`
- **Database:** Supabase PostgreSQL (`pg`)
- **AI & Agent Layer:** `@google/genai` (Google Gemini Interactions API with stateful/stateless function calling)

---

## 6. Local Setup & Execution

### Prerequisites
- Node.js >= 20
- A Supabase PostgreSQL project (`DATABASE_URL`)
- A Google AI Studio API key (`GEMINI_API_KEY`)

### Backend Setup
```bash
cd backend
npm install
# Create backend/.env (see Environment Variables below)
npm run dev
```
The backend starts on `http://localhost:5000` and automatically initializes PostgreSQL tables.

### Frontend Setup
```bash
cd frontend
npm install
# Create frontend/.env with VITE_API_URL=http://localhost:5000
npm run dev
```
Open `http://localhost:5173`.

---

## 7. Environment Variable Guide

### `backend/.env`
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_random_secret_key
GEMINI_API_KEY=your_google_ai_studio_key
DATABASE_URL=postgresql://postgres:ENCODED_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres
FRONTEND_URL=http://localhost:5173
```
*(Note: If deploying on an IPv4-only cloud host such as Render, use the Supabase **Session Pooler** connection string from Supabase Connect → Session Pooler.)*

### `frontend/.env`
```env
VITE_API_URL=http://localhost:5000
```

---

## 8. Deployment Guide
- **Backend (Render):** Create a Web Service pointing to `backend/`, build command `npm install`, start command `npm start`, and add `JWT_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`, and `FRONTEND_URL` in Render Environment Variables.
- **Frontend (Vercel):** Import the repo, set Root Directory to `frontend`, set `VITE_API_URL` to your Render backend URL, and deploy.

---

## 9. 3–5 Minute Demo Video Script
1. **0:00 – 0:40 | Problem & Workspace:** Log in, show the Datasets manager, click **Load Built-in Demo Datasets** (and show CSV upload), inspect columns & sample rows.
2. **0:40 – 1:45 | Editable Plan & Live Tool Trace:** Ask *"Which product category generated the highest total profit and revenue?"* Click **Plan Only**, edit a step, toggle approval or execute. Show the live SSE trace: `inspect_dataset_schema` → `execute_readonly_sql` → `compute_statistics` → `render_chart_and_table`.
3. **1:45 – 2:35 | Live Chart, Chart Switcher & Read-Only SQL:** Toggle Bar / Pie / Table views, inspect the Executive Insights, KPI strip, and the Read-Only PostgreSQL query inspector.
4. **2:35 – 3:25 | Clarification & Human Approval Gates:**
   - Ask *"Show me the best ones"* → demonstrate the **Clarification Card** asking instead of guessing; click an option to resume.
   - Ask *"Summarize revenue by region and prepare a CSV export"* → demonstrate the **Human Approval Card** (`MEDIUM RISK`), approve it, and download the generated CSV.
5. **3:25 – 4:00 | Audit Log & Security:** Open **Audit & Security** and **Task History** to show full traceability, read-only SQL guarantees, and re-runnable history.
