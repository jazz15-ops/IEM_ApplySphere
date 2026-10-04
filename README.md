# IEM ApplySphere
**Smart Admission Application, Readiness & Review Portal**

> **Academic Project Notice**: *IEM ApplySphere is a Software Engineering academic Proof of Concept (POC) demonstrating modern MEAN-stack web application development, explainable rule-based scoring engines, and server-controlled status workflows. It is NOT the official production IEM admission portal.*

---

## 1. Project Overview

**IEM ApplySphere** is a streamlined admission portal built for higher education institutes. It provides candidate registration and login, a draft application workspace, an **Explainable Application Readiness Engine**, secure document upload, a server-controlled multi-stage status workflow, and an admission admin console featuring real-time MongoDB aggregation analytics.

---

## 2. Technology Stack

| Layer / Concern | Technology | Usage / Details |
| :--- | :--- | :--- |
| **Frontend Framework** | **Angular** (v19.x) | Standalone components, reactive signals, HttpClient, RxJS |
| **Backend Runtime** | **Node.js** (v24.x) / **Express.js** (v5.x) | RESTful API server architecture |
| **Database & ODM** | **MongoDB** / **Mongoose** (v9.x) | Document-oriented storage & aggregation pipelines |
| **Authentication** | **JSON Web Token (JWT)** | Stateless bearer token authentication & RBAC middleware |
| **Password Security** | **bcryptjs** | Salted password hashing (cost factor 10) |
| **File Storage** | **Multer** | Local multipart/form-data upload handling with MIME validation |

---

## 3. Main Features

- **Applicant Registration & Login**: Self-service registration with automatic assignment of `applicant` role and secure bcrypt password hashing.
- **JWT Authentication & RBAC**: Role-Based Access Control protecting endpoints (`applicant` vs `admin`).
- **Admission Application Draft Workspace**: Multi-section autosaved draft form capturing personal information, contact address, academic history (Class 10/12), and program preferences.
- **Secure Local Document Upload**: Upload engine for Class 10 Marksheet, Class 12 Marksheet, ID Proof, and Passport Photo with strict MIME-type whitelist and 5MB size limits.
- **Explainable Application Readiness Engine**: Real-time 100-point scoring algorithm calculating application completeness and returning detailed missing item feedback.
- **Application Submission Workflow**: Readiness-gated submission mechanism converting editable draft state to an immutable `SUBMITTED` state.
- **Server-Controlled Status Workflow**: State transition machine enforcing allowed transitions (`DRAFT` → `SUBMITTED` → `UNDER_REVIEW` → `SELECTED` / `REJECTED`) with an audit history log.
- **Admin Application Review Console**: Full administrative dashboard with keyword search, status filtering, department filtering, and pagination.
- **Secure Admin Document Viewer**: Authenticated Blob streaming mechanism allowing administrators to inspect applicant marksheets and identity files without exposing static public URLs.
- **MongoDB Aggregation Analytics**: Statistical overview driven by `$match`, `$group`, and `$sort` pipelines displaying status distribution, department counts, decision rates, and review pipeline workload.

---

## 4. Explainable Readiness Scoring Model

The readiness engine calculates a deterministic **100-point score** based on data presence and document uploads:

| Category | Maximum Points | Scoring Logic & Conditions |
| :--- | :---: | :--- |
| **Personal & Address Information** | **20 pts** | Pro-rated across 12 core fields (first/last name, DOB, gender, phone, email, nationality, address, city, state, postal code, country) |
| **Academic Details** | **20 pts** | Class 10 details complete (10 pts) + Class 12 details complete (10 pts) |
| **Program Selection** | **10 pts** | Program Level, Program Name, and Preferred Department selected (10 pts) |
| **Marksheets Uploaded** | **20 pts** | Class 10 Marksheet uploaded (10 pts) + Class 12 Marksheet uploaded (10 pts) |
| **ID Proof Uploaded** | **15 pts** | Valid Government ID Proof file attached (15 pts) |
| **Passport Photo Uploaded** | **15 pts** | Valid Passport Photo file attached (15 pts) |

> **Note**: The Readiness Engine is 100% rule-based, deterministic, and explainable — NOT an unexplainable AI/ML model.

---

## 5. Status Workflow

```
 [DRAFT] ---> (Submit) ---> [SUBMITTED] ---> (Start Review) ---> [UNDER_REVIEW] ---> (Decision) ---> [SELECTED] / [REJECTED]
```

- **`DRAFT`**: Editable candidate state.
- **`SUBMITTED`**: Candidate locks application; becomes strictly read-only for applicant.
- **`UNDER_REVIEW`**: Administrative review initiated by admission staff.
- **`SELECTED` / `REJECTED`**: Terminal decision states. No further status changes allowed. All transition rules are enforced server-side.

---

## 6. Project Structure

```text
IEM-ApplySphere/
├── client/                     # Angular 19 SPA Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/           # Services (Auth, Application, Admin), Guards, Interceptors
│   │   │   └── features/       # Auth (Login/Register), Dashboard (Applicant/Admin), Review Detail
│   │   ├── styles.scss         # Global academic design system tokens & styles
│   │   └── index.html          # HTML entry point
│   └── package.json
├── server/                     # Express.js API Server
│   ├── src/
│   │   ├── config/             # DB Connection (Mongoose)
│   │   ├── controllers/        # Auth, Application, Admin, AdminAnalytics Controllers
│   │   ├── middleware/         # Auth JWT, Role RBAC, Multer upload middleware
│   │   ├── models/             # User, Application Mongoose Schemas
│   │   ├── routes/             # Auth, Application, Admin, Test API Routes
│   │   ├── scripts/            # Admin Seeder & Regression Test Scripts
│   │   └── services/           # Readiness Engine & Application Services
│   ├── .env.example            # Environment template
│   └── package.json
├── uploads/                    # Local runtime storage for applicant uploads (Git-ignored)
│   └── .gitkeep
└── README.md
```

---

## 7. Prerequisites

Before running IEM ApplySphere locally, ensure you have:

1. **Node.js**: v18.x or later (v24.x tested)
2. **npm**: v9.x or later
3. **MongoDB Community Server**: Running locally on default port `27017` (`mongodb://localhost:27017`)

---

## 8. Local Setup & Installation

### Step 1: Clone / Extract Project
Open a terminal in `C:\Users\SUMANA\Desktop\IEM-ApplySphere`.

### Step 2: Configure Environment Variables
Copy `server/.env.example` to `server/.env`:
```powershell
cd server
copy .env.example .env
```

### Step 3: Install Backend Dependencies
In the `server` directory:
```powershell
npm install
```

### Step 4: Install Frontend Dependencies
In a new terminal window, navigate to `client`:
```powershell
cd client
npm install
```

### Step 5: Seed Default Admin Account
Ensure MongoDB is running locally, then execute the admin seeder in `server`:
```powershell
cd server
npm run seed:admin
```
*Default Seeded Admin*: `admin@iem.edu` / `AdminPass@123`

### Step 6: Start Backend Server
In the `server` directory:
```powershell
npm start
```
The server will start on `http://localhost:3000`.

### Step 7: Start Frontend Application
In the `client` directory:
```powershell
npm start
```
The Angular application will serve at `http://localhost:4200`.

---

## 9. Environment Variables

The `server/.env` file uses the following configuration:

```ini
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/iem_applysphere

# Authentication & JWT Configuration
JWT_SECRET=iem_applysphere_jwt_secret_key_dev_2026
JWT_EXPIRES_IN=24h

# Default Seeded Admin Credentials
ADMIN_NAME=System Admin
ADMIN_EMAIL=admin@iem.edu
ADMIN_PASSWORD=AdminPass@123
ADMIN_PHONE=9876543210
```

---

## 10. Testing & Verification Suite

The backend contains 7 standalone automated test scripts located in `server/src/scripts/`:

```powershell
# Run individual test scripts from server/
node src/scripts/testAuth.js
node src/scripts/testApplication.js
node src/scripts/testDocumentUpload.js
$env:PORT=3005; node src/scripts/testReadiness.js
$env:PORT=3006; node src/scripts/testStatusWorkflow.js
$env:PORT=3007; node src/scripts/testAdminReview.js
node src/scripts/testAdminAnalytics.js
```

| Script Name | Verifies |
| :--- | :--- |
| `testAuth.js` | User registration, login, JWT token issuance, password security, RBAC 403 protection |
| `testApplication.js` | Draft creation, retrieval, updates, single application constraint, invalid percentage validation |
| `testDocumentUpload.js` | Multer document uploads, MIME whitelist, 5MB size limit, replace/delete operations, Blob streaming |
| `testReadiness.js` | Readiness calculation logic, 100-pt scoring rules, missing item detection, HTTP readiness endpoint |
| `testStatusWorkflow.js` | Submission rules, readiness check gating, state immutability, server-enforced status transitions |
| `testAdminReview.js` | Admin application listing, keyword search, status/department filters, pagination, document streaming |
| `testAdminAnalytics.js` | MongoDB aggregation pipelines ($match, $group, $sort), zero-state handling, decision rates |

> **Full Regression Results**: All 7 test scripts executed successfully, achieving **101 / 101 passing sub-tests (100%)**.

---

## 11. Security Design

- **Password Hashing**: User passwords hashed using `bcryptjs` before DB persistence.
- **JWT Authorization**: Requests authenticated via `Authorization: Bearer <token>` header.
- **Role-Based Access Control**: Middleware verifies `req.user.role === 'admin'` or `applicant` on protected endpoints.
- **Data Ownership Isolation**: Applicants can only read and modify their own application data.
- **State Immutability**: Server locks application content upon submission (`status !== 'DRAFT'`).
- **Upload Protection**: Strict MIME type checking and 5MB payload limits. Document streaming requires valid JWT authentication.
- **Git Hygiene**: `server/.env` and `uploads/applications/**` are explicitly git-ignored.

---

## 12. POC Scope & Limitations

As an academic Proof of Concept, IEM ApplySphere intentionally excludes:
- Real payment gateway integration (application fees)
- SMS / Email OTP delivery (simulated locally)
- Optical Character Recognition (OCR) for document auto-fill
- Production cloud deployment / scaling architecture
- Machine Learning admission chance prediction

---

## 13. Running the Demo

### Applicant Walkthrough
1. Navigate to `http://localhost:4200/register` and create an applicant account.
2. Log in at `http://localhost:4200/login` as an applicant.
3. Access the **Applicant Dashboard** (`/applicant/dashboard`) to view your readiness status.
4. Click **Application Workspace** (`/applicant/application`), fill in personal, contact, Class 10, Class 12, and program choices.
5. Upload Class 10 Marksheet, Class 12 Marksheet, ID Proof, and Passport Photo.
6. Verify your Readiness Score reaches **100%**, then click **Submit Application**.
7. Confirm your application state switches to `SUBMITTED` and input fields become read-only.

### Admin Walkthrough
1. Log in at `http://localhost:4200/login` with admin credentials (`admin@iem.edu` / `AdminPass@123`).
2. Access the **Admin Operations Console** (`/admin/dashboard`).
3. View real-time MongoDB aggregation metrics (Total Applications, Status Breakdown, Decision Summary, Department Counts).
4. Use the search box or status dropdown to filter submitted applications.
5. Click **Review Application** on a candidate row to open the **Admin Review Detail** page (`/admin/applications/:id`).
6. Inspect applicant details, readiness breakdown, and securely view uploaded documents.
7. Click **Start Review** (`UNDER_REVIEW`) and then **Select Candidate** (`SELECTED`) or **Reject Application** (`REJECTED`) to update status.
