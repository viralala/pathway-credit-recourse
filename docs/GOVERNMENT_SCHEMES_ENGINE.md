# Government Credit Opportunity / Scheme Matching Engine

Pathway's **Government Scheme Matching Engine** is a data-driven decision-support capability that evaluates an applicant's situation against published eligibility criteria of Central and State credit-linked subsidies, collateral guarantees, and concessional finance schemes.

---

## 1. Core Architecture & Philosophy

```
User Profile & Inputs
        +
Setu Financial Inflows
        +
Loan Financing Goals
        │
        ▼
[ Normalized Applicant Profile ]
        │
        ▼
[ Government Scheme Matching Engine ]
 ├── Scheme Provider Layer (Curated Database / Open Data)
 ├── Generic Rule Engine (Whitelisted Operators)
 └── Deterministic Ranking & Relevance Scoring
        │
        ▼
[ Alternative Pathways Results ]
 ├── Matched published criteria (✓)
 ├── Missing criteria to verify (•)
 ├── Official Source & Application Portal Links
 └── Verified Timestamps & Disclaimers
```

### Key Design Invariants
1. **Model Independence**: The machine learning credit scoring model (`lib/model.ts`), recourse engine (`lib/recourse.ts`), timeline simulator (`lib/timeline.ts`), and risk pricing (`lib/pricing.ts`) remain **100% separate and unmodified**.
2. **No Scraped Data**: Pathway **does NOT scrape myScheme** or crawl government websites. All schemes are sourced from authorized, machine-readable datasets and official gazettes/portals with recorded verification timestamps.
3. **Transparent Decision Support (Not Loan Guarantees)**: Match results are labeled as *Likely Match*, *Potential Match*, or *Information Needed* based on published criteria. Matches are explicitly marked with disclaimers that final sanction and approval are determined by the implementing agency or lender.
4. **Data-Driven Architecture**: Schemes are stored in PostgreSQL (`government_schemes`) and evaluated dynamically by a generic rule engine—**no hardcoded scheme lists inside React components**.

---

## 2. Scheme Domain Model & Rule Engine

### Scheme Record Structure (`government_schemes`)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique scheme identifier |
| `slug` | TEXT | Human-readable unique key (e.g. `pmegp`, `pmmy-mudra`) |
| `name` | TEXT | Full scheme title |
| `government_level` | TEXT | `'central'` or `'state'` |
| `ministry` | TEXT | Nodal ministry or department |
| `state` | TEXT | Applicable state (e.g. `'Maharashtra'` or `NULL` for All India) |
| `category` | TEXT | Category (`'business'`, `'msme'`, `'artisan'`, `'women_entrepreneur'`, etc.) |
| `purposes` | JSONB | List of supported loan purposes |
| `beneficiary_types`| JSONB | Target beneficiary entities |
| `benefits` | JSONB | Array of benefits (subsidies, guarantees, interest subventions) |
| `eligibility_rules`| JSONB | Structured rule definition object |
| `required_documents`| JSONB | Checklist of verifiable application documents |
| `official_source_url`| TEXT | Verified official government portal link |
| `application_url` | TEXT | Official online application link |
| `version` | TEXT | Scheme rules version identifier (e.g. `'2026.1'`) |
| `last_verified_at`| TIMESTAMPTZ | Audit timestamp of last verified criteria review |
| `active` | BOOLEAN | Enable / disable toggle for scheme availability |
| `priority` | INTEGER | Ranking weight |

### Supported Rule Operators
The generic rule engine (`lib/schemes/matcher.ts`) executes deterministic evaluations using safe, whitelisted operators:
- `equals`, `notEquals`: Exact value matching.
- `greaterThan`, `greaterThanOrEqual`, `lessThan`, `lessThanOrEqual`: Numerical boundary checks.
- `range`: Two-element array `[min, max]` interval evaluation.
- `in`, `notIn`, `contains`: Category/purpose array containment.
- `boolean`, `exists`: Flag or document presence verification.

---

## 3. Handling Missing Information (Actionable Guidance)

When an applicant has not provided a specific parameter (e.g., enterprise stage or artisan status):
- The engine does **NOT** falsely reject the applicant as "not eligible."
- Instead, it returns `matchStatus: "insufficient_information"` or `"potential_match"` and flags the item in `missingInformation: [...]` under **"Still to verify"**.
- This gives applicants actionable clarity on what additional documentation or status declarations are required.

---

## 4. Initial Verified Seed Schemes

| Scheme Name | Ministry / Level | Core Benefit | Official Portal |
| :--- | :--- | :--- | :--- |
| **PMEGP** | MoMSME / Central | 15%-35% margin money subsidy up to ₹50L | [KVIC PMEGP Portal](https://www.kviconline.gov.in/pmegpep/pmegphome/index.jsp) |
| **PMMY (MUDRA)** | DFS, MoF / Central | Collateral-free micro loans up to ₹10L | [MUDRA Portal](https://www.mudra.org.in/) |
| **CGTMSE** | MoMSME & SIDBI / Central | Credit guarantee cover up to ₹5 Crore | [CGTMSE Portal](https://www.cgtmse.in/) |
| **PM Vishwakarma** | MoMSME / Central | Concessional 5% loans up to ₹3L + ₹15k toolkit grant | [PM Vishwakarma Portal](https://pmvishwakarma.gov.in/) |
| **Stand-Up India** | DFS, MoF / Central | ₹10L to ₹1Cr greenfield loans for SC/ST/Women | [Stand-Up Mitra](https://www.standupmitra.in/) |
| **Maharashtra CMEGP** | Directorate of Industries / Maharashtra | 15%-35% state capital subsidy up to ₹50L | [Maha CMEGP Portal](https://maha-cmegp.gov.in/) |

---

## 5. API Endpoints

- `GET /api/schemes`: Lists active schemes with optional query filters (`?category=`, `?state=`, `?governmentLevel=`, `?purpose=`).
- `POST /api/schemes/match`: Evaluates an applicant profile against published scheme criteria server-side. For authenticated users, saves match history with Row Level Security.
- `GET /api/schemes/:id`: Returns full metadata, benefits, and required documents for a specific scheme.

---

## 6. Security & Privacy

1. **Server-Side Rule Execution**: Rule parsing and applicant profile evaluation run strictly on the server or in memory.
2. **Row Level Security**: The `government_scheme_matches` table is protected by PostgreSQL RLS (`auth.uid() = user_id`).
3. **Input Sanitization**: All applicant payloads and scheme records are strictly validated via Zod schemas (`lib/schemes/validation.ts`).
4. **Data Minimization**: No raw financial transactions or unnecessary PII are stored during matching.
