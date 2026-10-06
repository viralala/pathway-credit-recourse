# Setu Account Aggregator (AA) Integration Guide

This document outlines the architecture, setup, data minimization policy, and developer workflow for the Setu Account Aggregator integration in Pathway Credit Recourse.

---

## 1. Overview & Architecture

Pathway integrates with the **Setu AA Gateway (v2)** to enable authenticated applicants to optionally import verified bank cash flow indicators instead of manually entering every field.

```
User Browser (Applicant Workbench)
        │
        ├──> [Explicit Consent Modal & Notice]
        │
        ▼
Next.js Server API (`POST /api/setu/consent`)
        │
        ▼ (Secure Server-Only Credentials: Client ID, Client Secret, Product Instance ID)
Setu AA Gateway Sandbox (`https://fiu-sandbox.setu.co`)
        │
        ├──> [User Approves in Setu AA Sandbox Consent UI]
        │
        ▼
Next.js Server API (`POST /api/setu/data` or Webhook `/api/setu/webhook`)
        │
        ├──> [Fetch Decrypted Bank Statement in Memory]
        │
        ├──> [Normalize into Derived Summary Indicators (Income, Obligations, FOIR)]
        │
        ├──> [DISCARD RAW TRANSACTIONS & PII]
        │
        ▼
Review Screen (Applicant verifies derived values before applying)
        │
        ▼
Existing Pathway Invariant ML Model & Recourse Pipeline
```

---

## 2. Obtaining Setu Sandbox Credentials

1. Register or sign in to **[Setu Bridge](https://bridge.setu.co/)**.
2. Navigate to the **Data (Account Aggregator)** product under your sandbox organisation.
3. Create a **Financial Information User (FIU)** application to obtain:
   - `Client ID`
   - `Client Secret` (or `Client API Key`)
   - `Product Instance ID`
4. Set your sandbox redirect and webhook callback URLs:
   - Redirect URL: `http://localhost:3000/` (or your deployment URL)
   - Webhook URL: `http://localhost:3000/api/setu/webhook` (using ngrok/localtunnel for local webhook testing)

---

## 3. Environment Variables

Add the following server-only environment variables to your local `.env.local` file (never commit real secrets):

```bash
# Setu AA Sandbox Configuration (Server-Side Only)
SETU_CLIENT_ID=your_sandbox_client_id
SETU_CLIENT_SECRET=your_sandbox_client_secret
SETU_PRODUCT_INSTANCE_ID=your_sandbox_product_instance_id

# Base Gateway URL (defaults to Sandbox)
SETU_BASE_URL=https://fiu-sandbox.setu.co

# Optional: Webhook signature verification token
SETU_WEBHOOK_SECRET=your_optional_webhook_secret
```

> **Security Rule:** Never prefix Setu secrets with `NEXT_PUBLIC_`. All Setu API communication is strictly restricted to Next.js server runtime contexts.

---

## 4. Consent Flow & Parameters

1. **Consent Mode:** `STORE`
2. **Fetch Type:** `ONETIME` (Single instant pull; no recurring background queries)
3. **FI Types:** `DEPOSIT` (Savings & Current accounts)
4. **Consent Types:** `SUMMARY`, `PROFILE`, `TRANSACTIONS`
5. **Data Range:** Past 6 Months ($180$ days)
6. **Purpose Code:** `101` (*Credit assessment and loan recourse planning*)

---

## 5. Data Minimization & Privacy Policy

Pathway adheres strictly to privacy-by-design and data minimization:

| Category | Pathway Storage Policy |
| :--- | :--- |
| **Derived Monthly Income** | **Stored** (median regular monthly salary inflow) |
| **Derived Monthly Obligations** | **Stored** (recurring loan/EMI outflows) |
| **Derived Debt Ratio (FOIR)** | **Stored** |
| **Detected Account Count** | **Stored** |
| **Raw Bank Transactions** | **DISCARDED** (Never stored permanently) |
| **Full Bank Account Numbers** | **DISCARDED** |
| **Banking Passwords / OTPs** | **NEVER TOUCHED** (Handled solely by Bank/AA) |

---

## 6. How Sandbox / Mock Financial Data Works

- In the **Setu AA Sandbox**, you can test with standard mock FIP accounts (HDFC, SBI, Bank of Baroda).
- When entering mobile number `9876543210` in sandbox, the system pre-populates simulated monthly credits (salary) and debits (EMI).
- For local unit/integration tests where live credentials are not set, Pathway includes built-in mock FIP statement generators ensuring test suites run deterministically without external network flakiness.

---

## 7. Testing & Verification

Run the full automated test suite:

```bash
npm test
```

Run linter:

```bash
npm run lint
```

Run production build:

```bash
npm run build
```

---

## 8. Sandbox vs Production Differences

| Dimension | Sandbox | Production |
| :--- | :--- | :--- |
| **Base URL** | `https://fiu-sandbox.setu.co` | `https://fiu.setu.co` |
| **Data Provider (FIP)** | Simulated Mock FIPs | Real live banking institutions |
| **Compliance** | Sandbox testing | Sahamati & RBI AA Onboarding certification |
| **Customer Phone** | Any test number (e.g. `9876543210`) | Real customer Aadhaar-linked mobile |
