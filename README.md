# IEM ApplySphere
**Smart Admission Application, Readiness & Review Portal**

> **Academic Project Notice**: *IEM ApplySphere is a Software Engineering academic Proof of Concept (POC) demonstrating modern MEAN-stack web application development, explainable rule-based readiness evaluation, dual-mode secure document storage, and server-controlled status workflows. It is an independent academic project and NOT the official production admission portal of the Institute of Engineering & Management (IEM).*

---

## 1. Project Overview

**IEM ApplySphere** is a centralized, role-based higher education admission management system. Built on the MEAN stack (MongoDB, Express.js, Angular, Node.js), it replaces fragmented admission procedures with a deterministic, auditable, and transparent digital workflow.

Key platform pillars include:
- **Candidate Hub**: Self-service applicant registration, authenticated session management, and single-application lifecycle tracking.
- **Application Workspace**: Multi-section autosaved draft form capturing personal details, contact address, secondary/higher secondary academics, and institutional B.Tech programme preferences.
- **Explainable Application Readiness Engine**: A 100-point server-authoritative scoring model that deterministically evaluates profile completeness and document attachments, giving applicants actionable feedback on missing items.
- **Dual-Mode Secure Document Vault**: Strict MIME-validated document handling supporting both local disk storage for localhost development and direct client uploads to **Vercel Private Blob** storage via short-lived signed URLs for production.
- **Server-Controlled Status Workflow**: An immutable finite-state machine (`DRAFT` → `SUBMITTED` → `UNDER_REVIEW` → `SELECTED` / `REJECTED`) enforcing role-based transitions and preserving audit history.
- **Admin Operations Console**: Comprehensive administrative workspace featuring keyword candidate search, workflow status filters, synchronized B.Tech programme filters, server-side pagination, and real-time MongoDB aggregation analytics.

---

## 2. Live Production Deployment

The project is deployed in production across independent Vercel environments backed by MongoDB Atlas and Vercel Private Blob:

| Component | Target URL | Environment Details |
| :--- | :--- | :--- |
| **Frontend Web App** | [https://iem-applysphere.vercel.app](https://iem-applysphere.vercel.app) | Angular 19 SPA deployed on Vercel with client-side SPA rewrites |
| **Backend REST API** | [https://iem-applysphere-api.vercel.app](https://iem-applysphere-api.vercel.app) | Express 5 serverless Node.js backend on Vercel |
| **API Health Check** | [https://iem-applysphere-api.vercel.app/api/health](https://iem-applysphere-api.vercel.app/api/health) | Public health monitoring endpoint |
| **Database** | MongoDB Atlas | Cloud-hosted MongoDB cluster with connection pooling |
| **Document Storage** | Vercel Private Blob | Private object storage using signed PUT/GET token URLs |

---

## 3. Technology Stack

| Layer / Concern | Technology | Installed Version / Specification | Role in Architecture |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **Angular** | `^19.2.0` | Standalone components, reactive signals, inject API, Angular Router |
| **Frontend Build System** | **Angular CLI** | `^19.2.27` | Application builder with asset bundling and environment file replacements |
| **Language (Client)** | **TypeScript** | `~5.7.2` | Strongly typed client models, interfaces, and service contracts |
| **Reactive Programming** | **RxJS** | `~7.8.0` | Asynchronous HTTP streams, event transformations, and observables |
| **Styling & Design System** | **Vanilla SCSS** | CSS3 Custom Properties | Navy/white institutional design system, responsive grids, mobile navbars |
| **Backend Runtime** | **Node.js** | `v18.x`+ (Tested on `v24.x`) | Asynchronous event-driven server runtime |
| **Web API Framework** | **Express.js** | `^5.2.1` | RESTful routing, centralized error handling, and JSON parsing |
| **Database ODM** | **Mongoose** | `^9.10.4` | Schema modeling, validation, unique constraints, and aggregation |
| **Database Engine** | **MongoDB** | Community `7.x`/`8.x` / Atlas | Document storage engine with connection pooling |
| **Authentication** | **JSON Web Token** | `^9.0.3` (`jsonwebtoken`) | Stateless HMAC-SHA256 bearer tokens with 24-hour expiration |
| **Password Security** | **bcryptjs** | `^3.0.3` | Salted one-way password hashing (10 salt rounds) |
| **Local File Handling** | **Multer** | `^2.4.0` | Multipart form-data parser for localhost document uploads |
| **Cloud Object Storage** | **@vercel/blob** | `^2.8.2` | Signed PUT/GET URL generation for private cloud document storage |
| **Cross-Origin Security** | **CORS** | `^2.8.6` | Configured CORS headers across development and production origins |

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT BROWSER                                │
│  Angular 19 SPA (Standalone Components, Signals, Route Guards)          │
└──────────────────┬──────────────────────────────────────┬───────────────┘
                   │ 1. REST Calls (JSON)                 │ 2. Direct PUT (Prod)
                   ▼                                      ▼
┌─────────────────────────────────────┐        ┌──────────────────────────┐
│      EXPRESS.JS REST BACKEND        │        │   VERCEL PRIVATE BLOB    │
│  • JWT Auth & Role Middleware       │        │  Private Object Storage  │
│  • Readiness Calculation Engine     │        │  (Direct Browser Upload) │
│  • Status Workflow Transition Engine│        └────────────▲─────────────┘
│  • MongoDB Aggregation Analytics    │                     │
│  • Storage Service (Signed URLs)    │                     │
└──────────────────┬──────────────────┘                     │
                   │ Mongoose ODM                           │ 3. Signed GET Preview
                   ▼                                        │    (5 min valid)
┌─────────────────────────────────────┐                     │
│          MONGODB / ATLAS            │                     │
│  • Users (Auth & Roles)             │                     │
│  • Applications (Data & Metadata)   ├─────────────────────┘
│  • Document References (No Binaries)│
└─────────────────────────────────────┘
```

### Architectural Separation
1. **Application Data vs. Binary Storage**: MongoDB stores applicant profile data, academic records, status timelines, and document **metadata only** (`originalName`, `storedName`, `relativePath`, `storageProvider`, `mimeType`, `size`, `uploadedAt`). Raw binary files are never stored in database documents.
2. **Dual-Environment Document Storage**:
   - **Local Development**: Browser uploads files to Express via Multer (`multipart/form-data`), saving files to `uploads/applications/:applicationId/` on the local filesystem.
   - **Production (Vercel)**: Bypasses the 4.5 MB serverless function payload limit. The browser requests a short-lived signed PUT URL from the backend, uploads directly to Vercel Private Blob, and confirms completion with backend head verification.

---

## 5. Main Features

### Applicant Portal
- **Self-Service Registration & Login**: Applicant account creation with password hashing and automatic role assignment (`role: 'applicant'`).
- **Single Application Constraint**: Strict one-to-one mapping between candidate account and admission application (`applicant: { type: ObjectId, unique: true }`).
- **Draft Application Workspace**: Multi-section form supporting intermediate draft saves and real-time form validation.
- **Comprehensive Academic Profiling**:
  - Personal Information: Name, Date of Birth, Gender, Mobile Phone, Email, Nationality.
  - Address Information: Address Line 1/2, City, State, Postal Code, Country.
  - Academic History: Class 10 and Class 12 Board, Institution Name, Passing Year (1970–2035), and Percentage (0–100%).
  - B.Tech Programme Selection: Degree (`Bachelor of Technology (B.Tech)`) and Preferred Specialisation.
- **Four Dedicated Document Slots**:
  1. Class 10 Marksheet (`.pdf`, `.jpg`, `.jpeg`, `.png` — max 5 MB)
  2. Class 12 Marksheet (`.pdf`, `.jpg`, `.jpeg`, `.png` — max 5 MB)
  3. Government ID Proof (`.pdf`, `.jpg`, `.jpeg`, `.png` — max 5 MB)
  4. Passport Photograph (`.jpg`, `.jpeg`, `.png` only — max 5 MB)
- **Explainable Readiness Engine**: Real-time score indicator (0–100%) showing points breakdown and itemized missing checklist.
- **Submission Gating & Immutability**: Submission button unlocked only when readiness reaches exactly 100%. Upon submission, the form and document slots become strictly read-only.
- **Status & Timeline Tracking**: Live candidate dashboard showing review status (`DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `SELECTED`, `REJECTED`) with decision timestamps.

### Administrative Console
- **Secure Administrator Access**: Protected by server-side `allowRoles('admin')` middleware.
- **Real-Time Analytics Dashboard**: Real-time aggregations calculating pipeline totals, status breakdown, department distribution, and decision percentages.
- **Candidate Search & Filter Grid**:
  - Global Search: Searches across Application Number, Candidate Name, and Candidate Email.
  - Workflow Status Filter: Filters records by `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `SELECTED`, or `REJECTED`.
  - Synchronized B.Tech Programme Filter: Filters against all 14 official IEM B.Tech specialisations.
  - Server-Side Pagination: Configurable limit and page controls, safely constrained up to 50 records per page.
- **Comprehensive Candidate Review View**: Deep-dive evaluation page (`/admin/applications/:applicationId`) displaying full applicant data, academic marks, readiness scores, and document review links.
- **Authenticated Document Inspection**: Document streaming and signed preview links allow administrators to inspect candidate credentials without exposing public bucket URLs.
- **Authoritative Workflow Transitions**: Controlled action buttons allowing staff to move candidate from `SUBMITTED` to `UNDER_REVIEW`, followed by terminal decisions (`SELECTED` or `REJECTED`).

---

## 6. Standard B.Tech Programmes & Specialisations

The application form and the administrative filter share a single, unified source of truth defined in [`client/src/app/core/constants/programs.constant.ts`](client/src/app/core/constants/programs.constant.ts):

1. **CSE** — Computer Science and Engineering
2. **CSE (AIML)** — Computer Science and Engineering (Artificial Intelligence and Machine Learning)
3. **CSE (AI)** — Computer Science and Engineering (Artificial Intelligence)
4. **CSE (IoT)** — Computer Science and Engineering (Internet of Things)
5. **CSE (IoTCSBT)** — Computer Science and Engineering (Internet of Things and Cyber Security including Blockchain Technology)
6. **CSE (Cyber Security)** — Computer Science and Engineering (Cyber Security)
7. **CSE (DS)** — Computer Science and Engineering (Data Science)
8. **CSE (AI & DS)** — Computer Science and Engineering (Artificial Intelligence and Data Science)
9. **CSBS** — Computer Science and Business Systems
10. **IT** — Information Technology
11. **ECE** — Electronics and Communication Engineering
12. **EE** — Electrical Engineering
13. **EEE** — Electrical and Electronics Engineering
14. **ME** — Mechanical Engineering

> **Backward Compatibility**: The Admin Dashboard dropdown supports all 14 standard options while preserving legacy database records (e.g., historical department values) when viewed in candidate detail mode or filtered under `"All B.Tech Programmes"`.

---

## 7. Explainable Readiness Scoring Model

The readiness engine ([`server/src/services/readiness.service.js`](server/src/services/readiness.service.js)) evaluates application completeness using a 100% deterministic, rule-based algorithm:

| Category | Max Points | Scoring Conditions & Requirements |
| :--- | :---: | :--- |
| **Personal & Address Information** | **20 pts** | Pro-rated across 12 required fields: First Name, Last Name, DOB, Gender, Phone, Email, Nationality, Address Line 1, City, State, Postal Code, Country. |
| **Academic History** | **20 pts** | 10 pts for Class 10 (Board, Institution, Year, Percentage) + 10 pts for Class 12 (Board, Institution, Year, Percentage). |
| **Program Selection** | **10 pts** | Program Level (`Undergraduate`), Program Name (`Bachelor of Technology (B.Tech)`), and Preferred B.Tech Specialisation selected. |
| **Marksheets Attached** | **20 pts** | 10 pts for Class 10 Marksheet upload + 10 pts for Class 12 Marksheet upload. |
| **Government ID Proof** | **15 pts** | Valid Government ID Proof file attached (PDF, JPEG, or PNG). |
| **Passport Photograph** | **15 pts** | Valid Passport Photograph attached (JPEG or PNG image only). |
| **Total Readiness Score** | **100 pts** | Bounded integer score from `0` to `100`. |

### Exact Submission Rule
```javascript
const canSubmit = readinessScore === 100 && missingItems.length === 0;
```
An application can only be submitted to the institution when **every single item is completed** and the readiness score is **100%**. Partial or incomplete drafts cannot be submitted.

---

## 8. Authoritative Status Workflow

All status transitions are enforced by the server-side state machine ([`server/src/services/statusWorkflow.service.js`](server/src/services/statusWorkflow.service.js)):

```
┌─────────┐      Applicant Submit       ┌───────────┐
│  DRAFT  │ ──────────────────────────> │ SUBMITTED │
└─────────┘     (Score Must Be 100%)    └─────┬─────┘
                                              │
                                              │ Admin: Start Review
                                              ▼
                                       ┌──────────────┐
                                       │ UNDER_REVIEW │
                                       └──┬────────┬──┘
                                          │        │
                     Admin: Select        │        │ Admin: Reject
                     ┌────────────────────┘        └────────────────────┐
                     ▼                                                  ▼
              ┌──────────────┐                                   ┌──────────────┐
              │   SELECTED   │ (Terminal State)                  │   REJECTED   │ (Terminal State)
              └──────────────┘                                   └──────────────┘
```

- **`DRAFT`**: Initial editable candidate state.
- **`SUBMITTED`**: Transitioned by applicant upon achieving 100% readiness. Automatically locks form fields and document uploads (`submittedAt` timestamp recorded).
- **`UNDER_REVIEW`**: Transitioned by administrator upon starting evaluation (`reviewStartedAt` timestamp recorded).
- **`SELECTED` / `REJECTED`**: Terminal decision states executed by administrator (`decisionAt` timestamp recorded). No further transitions are permitted.
- **Audit History**: Every state change appends a structured record to `statusHistory`:
  ```json
  {
    "status": "UNDER_REVIEW",
    "changedAt": "2026-11-10T12:00:00.000Z",
    "changedBy": "6543210fedcba9876543210a",
    "changedByRole": "admin"
  }
  ```

---

## 9. Document Storage Architecture

### Dual-Environment Storage Matrix

```
[Client Upload Action]
         │
         ├─── Development (localhost) ──> Express API (Multer) ──> Local Filesystem: uploads/applications/:id/
         │
         └─── Production (Vercel) ─────> Request Signed PUT ────> Direct PUT to Vercel Private Blob
                                                 │
                                                 └──────────────> Confirm with Backend (Head Check)
```

| Feature | Local Development | Production Environment |
| :--- | :--- | :--- |
| **Storage Engine** | Local Disk Storage via Multer | Vercel Private Blob Storage |
| **Upload Pipeline** | Client `POST` (multipart/form-data) to Express | Direct Client `PUT` to Pre-Signed Blob URL |
| **Payload Limits** | 5 MB upload limit handled in Multer | Bypasses 4.5 MB Vercel Serverless Function limit; enforces 5 MB limit on Blob token |
| **Security & Authorization** | JWT Bearer token verified by Express authentication middleware | JWT Bearer token authorization + Signed PUT Token (15-minute validity) / Signed GET Token (5-minute validity) |
| **Verification** | Verified on disk via `fs.existsSync` | Verified via `@vercel/blob` `head()` before updating MongoDB |
| **Document Preview** | Streamed via Express binary pipeline | Short-lived signed GET URL (5-minute expiration) |
| **File Type Whitelist** | Class 10/12/ID: PDF, JPEG, PNG<br>Photo: JPEG, PNG only | Class 10/12/ID: PDF, JPEG, PNG<br>Photo: JPEG, PNG only |

---

## 10. Admin Analytics Engine

The administrative analytics console is powered by real-time MongoDB aggregation pipelines ([`server/src/controllers/adminAnalytics.controller.js`](server/src/controllers/adminAnalytics.controller.js)):

1. **Status Breakdown Aggregation**:
   ```javascript
   Application.aggregate([
     { $group: { _id: '$status', count: { $sum: 1 } } }
   ]);
   ```
2. **Department / Programme Distribution Aggregation**:
   ```javascript
   Application.aggregate([
     {
       $group: {
         _id: {
           $cond: [
             { $or: [{ $eq: ['$preferredDepartment', ''] }, { $eq: ['$preferredDepartment', null] }] },
             'Not Selected',
             '$preferredDepartment'
           ]
         },
         count: { $sum: 1 }
       }
     },
     { $sort: { count: -1, _id: 1 } }
   ]);
   ```
3. **Calculated Ratios**:
   - Total System Applications
   - Selection Rate: `Math.round((selectedCount / decidedApplications) * 100)`
   - Review Pipeline Workload: Awaiting Review (`SUBMITTED`), Active Review (`UNDER_REVIEW`), Completed Decisions (`SELECTED` + `REJECTED`).

---

## 11. Project Directory Structure

```text
IEM-ApplySphere/
├── client/                                 # Angular 19 Frontend Workspace
│   ├── public/                             # Public static assets
│   │   ├── favicon.ico                     # Application icon
│   │   └── iem-logo.png                    # Official IEM institutional emblem
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── constants/
│   │   │   │   │   └── programs.constant.ts  # 14 standard B.Tech programmes
│   │   │   │   ├── guards/
│   │   │   │   │   ├── auth.guard.ts         # JWT authentication guard
│   │   │   │   │   └── role.guard.ts         # Role authorization guard (applicant / admin)
│   │   │   │   ├── interceptors/
│   │   │   │   │   └── auth.interceptor.ts   # Bearer token HTTP request injector
│   │   │   │   └── services/
│   │   │   │       ├── admin.service.ts      # Admin review, analytics, & filter service
│   │   │   │       ├── application.service.ts # Applicant draft, upload, & submit service
│   │   │   │       └── auth.service.ts       # Registration, login, & session signals
│   │   │   ├── features/
│   │   │   │   ├── admin/
│   │   │   │   │   └── admin-review-detail.component.ts # Candidate evaluation workspace
│   │   │   │   ├── application/
│   │   │   │   │   └── application-form.component.ts    # Multi-section draft application form
│   │   │   │   ├── auth/
│   │   │   │   │   ├── login/login.component.ts         # Candidate/admin login view
│   │   │   │   │   └── register/register.component.ts   # Candidate registration view
│   │   │   │   └── dashboard/
│   │   │   │       ├── admin-dashboard.component.ts     # Admin analytics & filter console
│   │   │   │       └── applicant-dashboard.component.ts # Candidate status & readiness hub
│   │   │   ├── app.component.ts            # Root application component
│   │   │   ├── app.config.ts               # Application routing & HTTP client providers
│   │   │   └── app.routes.ts               # Route table with RBAC guards
│   │   ├── environments/
│   │   │   ├── environment.ts              # Local development configuration (localhost:3000)
│   │   │   └── environment.prod.ts         # Production API configuration (Vercel backend)
│   │   ├── index.html                      # HTML5 page template
│   │   ├── main.ts                         # Angular bootstrapping entry point
│   │   └── styles.scss                     # Global institutional design system & utilities
│   ├── angular.json                        # Angular CLI workspace configuration
│   ├── package.json                        # Frontend dependencies & scripts
│   ├── tsconfig.json                       # Base TypeScript configuration
│   └── vercel.json                         # Client-side SPA route rewrite rules
├── server/                                 # Express.js REST API Backend
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                       # Serverless-safe MongoDB connection helper
│   │   ├── controllers/
│   │   │   ├── admin.controller.js         # Admin application search, review, & detail
│   │   │   ├── adminAnalytics.controller.js# Real-time MongoDB aggregation pipeline
│   │   │   ├── adminStatus.controller.js   # Admin status transition handler
│   │   │   ├── application.controller.js   # Candidate draft, status, & submission handler
│   │   │   ├── auth.controller.js          # Registration, login, & session controller
│   │   │   ├── document.controller.js      # Dual-mode document upload & stream controller
│   │   │   └── readiness.controller.js     # Readiness score endpoint handler
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js          # JWT verification & req.user attachment
│   │   │   ├── role.middleware.js          # Role-based endpoint authorization
│   │   │   └── upload.middleware.js        # Multer disk upload config & MIME validation
│   │   ├── models/
│   │   │   ├── Application.js              # Application Mongoose schema & constraints
│   │   │   └── User.js                     # User Mongoose schema & password exclusion
│   │   ├── routes/
│   │   │   ├── admin.routes.js             # /api/admin & /api/admin/applications routes
│   │   │   ├── application.routes.js       # /api/applications applicant routes
│   │   │   ├── auth.routes.js              # /api/auth registration & login routes
│   │   │   └── test.routes.js              # Diagnostic testing routes
│   │   ├── scripts/
│   │   │   ├── seedAdmin.js                # Administrator database seeder script
│   │   │   ├── testAdminAnalytics.js       # Analytics aggregation test suite
│   │   │   ├── testAdminReview.js          # Admin review & filtering test suite
│   │   │   ├── testApplication.js          # Application draft lifecycle test suite
│   │   │   ├── testAuth.js                 # Authentication & security test suite
│   │   │   ├── testDocumentUpload.js       # Document upload & validation test suite
│   │   │   ├── testReadiness.js            # Readiness score verification suite
│   │   │   └── testStatusWorkflow.js       # Status workflow state machine test suite
│   │   ├── services/
│   │   │   ├── readiness.service.js        # 100-pt deterministic readiness engine
│   │   │   ├── statusWorkflow.service.js   # Authoritative workflow state transitions
│   │   │   └── storage.service.js          # Local disk & Vercel Blob storage manager
│   │   ├── app.js                          # Express application initialization & middleware
│   │   └── server.js                       # Local HTTP server entry point (port 3000)
│   ├── .env.example                        # Template for environment configuration
│   └── package.json                        # Backend dependencies & scripts
├── uploads/                                # Local runtime document storage (Git-ignored)
│   └── .gitkeep
├── .gitignore                              # Git exclusion rules
└── README.md                               # Project documentation & evaluation guide
```

---

## 12. REST API Specification

### Health Check
- `GET /api/health` — Public endpoint returning service health status and timestamp.

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new applicant account.
- `POST /api/auth/login` — Authenticate applicant or admin; returns JWT token.
- `GET /api/auth/me` — Retrieve authenticated user profile (requires Bearer token).

### Applicant Application & Readiness (`/api/applications`)
- `POST /api/applications` — Create a new application draft (`applicant` role only).
- `GET /api/applications/me` — Retrieve current applicant's application.
- `PATCH /api/applications/me` — Update editable draft application fields.
- `GET /api/applications/me/readiness` — Calculate and return readiness score (0–100%) and missing items.
- `POST /api/applications/me/submit` — Submit application (requires 100% readiness; locks record).
- `GET /api/applications/me/status` — Get application status and timeline history.

### Applicant Document Vault (`/api/applications/me/documents`)
- `GET /api/applications/me/documents` — Get document slots metadata.
- `GET /api/applications/me/documents/:documentType/view-url` — Get private signed viewing URL (Blob) or streaming URL (Local).
- `GET /api/applications/me/documents/:documentType/file` — Stream document binary content.
- `POST /api/applications/me/documents/:documentType/signed-upload-url` — Generate pre-signed PUT URL for Vercel Private Blob.
- `POST /api/applications/me/documents/:documentType/confirm` — Finalize Blob upload after browser PUT and update metadata.
- `POST /api/applications/me/documents/:documentType` — Multipart Multer upload for local development.
- `DELETE /api/applications/me/documents/:documentType` — Remove an attached document from draft application.

### Admin Operations & Analytics (`/api/admin`)
- `GET /api/admin/analytics` — Real-time MongoDB statistical overview and review pipeline metrics.
- `GET /api/admin/applications` — List applications with search (`search`), status filter (`status`), programme filter (`department`), and pagination (`page`, `limit`).
- `GET /api/admin/applications/:applicationId` — Retrieve complete candidate application file.
- `GET /api/admin/applications/:applicationId/documents/:documentType/view-url` — Get signed inspection URL for applicant document.
- `GET /api/admin/applications/:applicationId/documents/:documentType/file` — Stream applicant document for administrative verification.
- `PATCH /api/admin/applications/:applicationId/status` — Execute status transition (`UNDER_REVIEW`, `SELECTED`, `REJECTED`).

---

## 13. Local Setup & Installation

### Prerequisites
1. **Node.js**: `v18.x` or higher (v24.x recommended).
2. **npm**: `v9.x` or higher.
3. **MongoDB**: Local MongoDB Community Server running on `mongodb://localhost:27017` or a MongoDB Atlas connection URI.

### Step 1: Clone Repository
```powershell
git clone https://github.com/jazz15-ops/IEM_ApplySphere.git
cd IEM_ApplySphere
```

### Step 2: Configure Backend Environment
Copy the template configuration in `server/`:
```powershell
cd server
copy .env.example .env
```
Edit `server/.env` with safe development credentials:
```ini
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/iem_applysphere
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=24h

ADMIN_NAME=System Administrator
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace_with_a_strong_password
ADMIN_PHONE=9876543210
```

### Step 3: Install Backend Dependencies
```powershell
npm install
```

### Step 4: Seed Initial Administrator
Ensure MongoDB is running, then run the seeder:
```powershell
npm run seed:admin
```
*(Creates the administrator account defined by `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your `.env` file).*

### Step 5: Install Frontend Dependencies
Open a new terminal window in the project root:
```powershell
cd client
npm install
```

### Step 6: Start Backend Server
In the `server` directory:
```powershell
npm start
```
*API server will listen on `http://localhost:3000`.*

### Step 7: Start Frontend Application
In the `client` directory:
```powershell
npm start
```
*Navigate your browser to `http://localhost:4200`.*

---

## 14. Testing & Verification Suite

The repository contains 7 specialized automated test scripts in [`server/src/scripts/`](server/src/scripts/) verifying core business logic, database constraints, and API security:

```powershell
# Run individual test suites from server/
node src/scripts/testAuth.js
node src/scripts/testApplication.js
node src/scripts/testDocumentUpload.js
node src/scripts/testReadiness.js
node src/scripts/testStatusWorkflow.js
node src/scripts/testAdminReview.js
node src/scripts/testAdminAnalytics.js
```

| Test Script | Test Coverage & Validations |
| :--- | :--- |
| **`testAuth.js`** | User registration, password hashing verification, JWT token issuance, login credential validation, role-based access restrictions. |
| **`testApplication.js`** | Draft creation, auto-population from user session, single-application constraint enforcement, year/percentage boundary validation. |
| **`testDocumentUpload.js`** | MIME-type whitelist enforcement, 5 MB file size limit, document replacement, slot deletion, and binary streaming. |
| **`testReadiness.js`** | 100-point deterministic readiness scoring, missing item tracking, category sub-scores, and submission eligibility gating. |
| **`testStatusWorkflow.js`** | Authoritative workflow validation, rejection of invalid transitions, status history audit logging, and state immutability. |
| **`testAdminReview.js`** | Administrative search across candidate fields, status filtering, programme filtering, server-side pagination, and document inspection. |
| **`testAdminAnalytics.js`** | Real-time MongoDB `$group`, `$sort`, and `$cond` aggregation pipelines, zero-state stability, and pipeline workload metrics. |

---

## 15. Security & Data Integrity Design

- **Password Security**: Passwords salted and hashed with `bcryptjs` before database persistence. Password hashes are marked `{ select: false }` on the Mongoose User model to prevent accidental leaks in query results.
- **Stateless JWT Authorization**: Protected routes require an `Authorization: Bearer <token>` header. Token payloads include user ID, email, and role, expiring automatically in 24 hours.
- **Server-Side Role-Based Access Control**: `allowRoles('admin')` and `allowRoles('applicant')` middleware enforce separation of privileges on every sensitive endpoint.
- **Data Isolation**: Candidates are scoped to their own application document via `req.user.id`. Direct object references are forbidden.
- **Submission Immutability**: Applications with status other than `DRAFT` reject any further client modification, preserving audit integrity.
- **Secure File Storage**: Uploaded files undergo MIME type verification against strict whitelists (PDF/JPEG/PNG). Production files are stored in Private Vercel Blob stores with access governed by pre-signed, short-lived tokens (15-minute upload validity for PUT, 5-minute preview validity for GET).
- **Environment & Credential Hygiene**: Real credentials, `.env` files, and local document uploads are git-ignored. The codebase uses strict environment variables for production secrets.

---

## 16. End-to-End Evaluation Demonstration Flow

Follow this end-to-end walkthrough for lab evaluation, viva demonstration, or examiner testing:

```
[1. Candidate Registration] ──> [2. Candidate Login] ──> [3. Fill Application Form]
                                                                  │
[6. Submit (Locks Form)] <── [5. Reach 100% Readiness] <── [4. Upload 4 Documents]
          │
          ▼
[7. Admin Sign In] ──> [8. Search & Filter Candidate] ──> [9. Inspect Candidate & Files]
                                                                  │
[12. Applicant Re-Login & Result] <── [11. Decision: Select/Reject] <── [10. Start Review]
```

1. **Candidate Registration**: Open `http://localhost:4200/register` (or live site). Fill in name, email, phone, and password. Submit to create an applicant account.
2. **Candidate Login**: Sign in at `/login`. You are automatically redirected to the **Applicant Candidate Hub** (`/applicant/dashboard`).
3. **Draft Application**: Click **Application Workspace** (`/applicant/application`). Complete Personal Information, Address Details, Class 10/12 Academic Details, and choose your **Preferred B.Tech Specialisation**.
4. **Save Draft**: Click **Save Draft Application**. Verify that data is safely stored in MongoDB.
5. **Document Upload**: Attach all 4 required document slots (Class 10 Marksheet, Class 12 Marksheet, ID Proof, and Passport Photo).
6. **Explainable Readiness**: Observe the real-time Readiness Index reaching **100%** with all items checked off.
7. **Lock & Submit**: Click **Submit Application**. Confirm the modal dialog. Verify that status switches to `SUBMITTED`, an application number is generated, and all fields become read-only.
8. **Admin Sign In**: Log out and sign in using your administrator credentials. You are redirected to the **Admin Operations Console** (`/admin/dashboard`).
9. **Analytics & Filter**: View updated real-time pipeline metrics. Use the B.Tech Programme filter dropdown to select your candidate's specialisation (e.g., `CSE — Computer Science and Engineering`).
10. **Review Candidate**: Click **Review Candidate →** to open the candidate's review file (`/admin/applications/:id`).
11. **Document Inspection**: Click the document preview buttons to securely stream and verify candidate marksheets and identity proofs.
12. **Start Review**: Click **Start Review**. The status transitions to `UNDER_REVIEW`.
13. **Final Decision**: Click **Select Candidate** (or **Reject Application**). The status transitions to `SELECTED`, and timestamps are locked.
14. **Candidate Verification**: Log back in as the applicant. The candidate hub displays the final admission decision banner with institutional confirmation.

---

## 17. Scope & Academic POC Boundaries

As an academic Software Engineering Proof of Concept, the platform implements core admission management, readiness evaluation, and review capabilities while scoping out the following auxiliary commercial concerns:
- Integrated online payment gateway for application fee processing.
- SMS / Telecom carrier OTP delivery (authentication relies on email credentials and JWT sessions).
- Machine learning / heuristic admission chance prediction algorithms.
- Automated optical character recognition (OCR) parsing of marksheets.

---

## 18. Authors & Institutional Context

Developed as an academic Software Engineering project for the **Institute of Engineering & Management (IEM)**.

- **Institution**: Institute of Engineering & Management (IEM), Kolkata
- **Department**: Department of Computer Science & Engineering / Information Technology
- **Repository**: [https://github.com/jazz15-ops/IEM_ApplySphere](https://github.com/jazz15-ops/IEM_ApplySphere)
- **Usage Context**: Academic Software Engineering POC
