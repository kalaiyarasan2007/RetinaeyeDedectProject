# 🏥 RetinaGuard AI — Complete Project Explanation

> **Prepared for:** Viva / Presentation / Project Review  
> **Style:** Beginner-friendly, structured, professional  
> **Note:** This document only explains what is already implemented — no assumptions, no additions.

---

## 1. 📌 Project Title & Overview

### Project Name: **RetinaGuard AI**

**What does this project do?**

RetinaGuard AI is a **medical web application** that helps doctors and admins detect **Diabetic Retinopathy (DR)** — an eye disease caused by diabetes — by analyzing retinal (eye) scan images using Artificial Intelligence.

**In simple words:**
> A doctor uploads a patient's eye fundus image → the AI system analyzes it → the system tells the doctor which stage of the disease the patient has, the risk level, and what treatment steps to take.

**Who uses it?**
- **Doctor** — uploads scans, sees results, writes clinical notes, confirms diagnoses
- **Admin** — manages the overall system and patient records

---

## 2. 🛠️ Technologies Used

| Layer | Technology |
|-------|-----------|
| **Frontend (UI)** | React (TypeScript), Vite, Wouter (routing), Framer Motion (animations) |
| **Styling** | Tailwind CSS + ShadCN UI components |
| **State / Data Fetching** | TanStack React Query |
| **Backend (API Server)** | Node.js + Express (TypeScript) |
| **Database** | PostgreSQL (via Drizzle ORM) |
| **Database Schema Validation** | Zod + drizzle-zod |
| **ML / Flask API** | Python + Flask + TensorFlow/Keras |
| **ML Model** | EfficientNetB4-based Keras model (`dr_model.h5`) — 5-class DR classifier |
| **Image Analysis (Node side)** | Custom pixel-level retinal image analysis (`image-analysis.ts`) |
| **Charts** | Recharts (bar chart, pie chart) |
| **Monorepo Management** | pnpm workspaces |
| **Text-to-Speech** | Browser Web Speech API (built-in, no library) |

---

## 3. 📁 Project Structure (High-Level)

```
RetinaeyeDedectProject/
├── backend/              ← Python Flask ML API
│   └── app.py            ← Flask server with /health and /predict routes
├── predict.py            ← ML model loader + inference logic
├── artifacts/
│   ├── api-server/       ← Node.js/Express REST API (TypeScript)
│   │   └── src/
│   │       ├── routes/   ← patients, scans, analytics, reports, health
│   │       └── lib/      ← ai-simulation.ts, image-analysis.ts
│   └── retina-guard/     ← React Frontend (TypeScript)
│       └── src/
│           ├── pages/    ← Login, Dashboard, UploadAnalyze, ScanResult, etc.
│           ├── components/ ← DeleteButton, Layout, UI components
│           └── lib/      ← auth.tsx, utils.ts, api-client
├── lib/
│   ├── db/               ← PostgreSQL schema (patients, scans tables)
│   ├── api-spec/         ← OpenAPI YAML specification
│   ├── api-client-react/ ← Auto-generated React hooks (Orval)
│   └── api-zod/          ← Zod validators for API request bodies
└── scripts/
    └── seed.ts           ← Seeds database with 8 sample patients & scans
```

---

## 4. 🗄️ Database Design

There are **two main tables** in the PostgreSQL database:

### Table 1: `patients`

| Column | Type | Description |
|--------|------|-------------|
| `id` | Auto number | Unique patient ID |
| `name` | Text | Patient full name |
| `age` | Integer | Patient age |
| `gender` | Text | male / female / other |
| `diabetesType` | Text | type1 / type2 / gestational / null |
| `contactInfo` | Text | Phone or email |
| `isDeleted` | Boolean | Soft-delete flag (default: false) |
| `createdAt` | Timestamp | Registration date & time |

### Table 2: `scans`

| Column | Type | Description |
|--------|------|-------------|
| `id` | Auto number | Unique scan ID |
| `patientId` | Integer | Links to the patients table |
| `imageData` | Text | Base64 encoded eye image |
| `drStage` | Integer (0–4) | The AI-predicted DR stage |
| `confidenceScore` | Real | AI's confidence (0.0 to 1.0) |
| `riskLevel` | Text | low / medium / high / critical |
| `blindnessRiskScore` | Integer (0–100) | Numeric risk of vision loss |
| `heatmapData` | Text (JSON) | Hotspot coordinates on the retinal image |
| `doctorConfirmed` | Boolean | Has a doctor reviewed this scan? |
| `doctorNotes` | Text | Doctor's written notes |
| `doctorId` | Text | Which doctor confirmed the scan |
| `recommendation` | Text | Medical advice text |
| `isDeleted` | Boolean | Soft-delete flag (default: false) |
| `createdAt` | Timestamp | When the scan was taken |

> **Soft Delete**: Records are never truly erased. Instead, `isDeleted` is set to `true`. All queries filter out deleted records automatically.

---

## 5. 🔐 Module 1 — Authentication (Login)

**File:** `artifacts/retina-guard/src/pages/Login.tsx`

### What it does:
The Login page is the **entry gate** to the system. No one can access any page without logging in.

### How it works:
1. The user sees a **two-column page**:
   - **Left side:** Branding panel with the RetinaGuard AI logo and tagline
   - **Right side:** Login form

2. There are **two quick-select buttons** at the top of the form:
   - **Doctor** button → auto-fills `doctor / doc123`
   - **Admin** button → auto-fills `admin / admin123`

3. The user clicks **"Secure Login"**. The system waits 800ms (to simulate authentication) and then checks:
   - `admin` + `admin123` → grants **admin** role
   - `doctor` + `doc123` → grants **doctor** role
   - Anything else → shows error: `"Invalid credentials"`

4. On success, the `login()` function from `AuthProvider` saves the user object (username + role) into memory (React Context).

### Key Point:
Authentication is **frontend-only** (no server session or JWT). The user's role controls what they can see and do inside the app.

---

## 6. 🏠 Module 2 — Dashboard

**File:** `artifacts/retina-guard/src/pages/Dashboard.tsx`

### What it does:
The Dashboard is the **home screen** after login. It shows a real-time overview of the entire clinic's DR screening activity.

### What is displayed:
1. **4 Stat Cards** at the top:
   - Total Patients registered
   - Total Scans analyzed
   - Critical Cases count (highlighted in red)
   - Average AI Confidence score (in %)

2. **Recent Screenings Table** (bottom):
   - Shows the last 5 scans
   - Columns: Patient Name, Date, DR Stage, Risk Level, Confirmation Status, Action
   - Each row has a **"View Result"** link and a **Delete button**

3. **"New Scan" button** (top-right) — takes the user to the upload page

### How data loads:
- Calls `GET /api/analytics/summary` → gets the 4 stat card values
- Calls `GET /api/scans` → gets the recent scans list
- Both calls use **TanStack React Query** (auto-fetches, caches data)

---

## 7. 📤 Module 3 — Upload & Analyze (Scan Submission)

**File:** `artifacts/retina-guard/src/pages/UploadAnalyze.tsx`

### What it does:
This is where a doctor actually **uploads a patient's retinal image** and triggers the AI analysis.

### Step-by-step user flow:

**Step 1 — Select Patient**
- A dropdown lists all registered patients (fetched live from database)
- Doctor picks the patient whose eye is being scanned

**Step 2 — Upload Image**
- A **drag-and-drop zone** allows the doctor to drag a `.jpg` or `.png` eye image
- Alternatively, they can click to open a file picker
- Once an image is dropped, a **preview** appears immediately in the zone
- There is also a **"Load Demo Image"** button for testing (pre-loads a sample retina image)

**Step 3 — Analyze**
- A summary panel on the right shows: selected patient name, filename, file size
- Doctor clicks **"Analyze Scan"** button (disabled until both patient and image are selected)
- A **scanning animation** screen appears:
  - Shows the uploaded image with a glowing ring and a **moving scan line**
  - Shows text: *"Running AI Model..."*
  - This lasts ~2.5 seconds (simulated processing delay)

**Step 4 — Redirect**
- After analysis completes, the app automatically navigates to:
  `/scans/{new-scan-id}` — the Scan Result page

### How it sends data:
- The image is converted to **Base64** (a text representation of the image)
- A `POST /api/scans/analyze` request is sent with:
  ```json
  {
    "patientId": 3,
    "imageData": "data:image/png;base64,iVBOR..."
  }
  ```

---

## 8. ⚙️ Module 4 — API Communication (Frontend ↔ Backend)

### Node.js API Server (`artifacts/api-server/`)

The **Node.js/Express API** is the central brain that handles all data operations.

#### API Endpoints:

| Method | Endpoint | What it does |
|--------|----------|-------------|
| `GET` | `/api/healthz` | Server health check |
| `GET` | `/api/patients` | Get all active patients |
| `POST` | `/api/patients` | Register a new patient |
| `GET` | `/api/patients/:id` | Get one patient's details |
| `DELETE` | `/api/patients/:id` | Soft-delete a patient |
| `GET` | `/api/scans` | Get all active scans |
| `POST` | `/api/scans/analyze` | Analyze a retinal image → creates scan record |
| `GET` | `/api/scans/:id` | Get a specific scan result |
| `PATCH` | `/api/scans/:id` | Doctor confirms or adds notes to a scan |
| `DELETE` | `/api/scans/:id` | Soft-delete a scan |
| `GET` | `/api/reports/:scanId` | Get full medical report for a scan |
| `GET` | `/api/analytics/summary` | Get dashboard statistics |

#### Auto-generated API Client:
The file `lib/api-client-react/src/generated/api.ts` contains **auto-generated React hooks** (using Orval tool from the OpenAPI spec). So instead of writing raw `fetch()` calls, the frontend uses clean hooks like:
- `useGetPatients()` 
- `useAnalyzeScan()`
- `useDeleteScan()`
- `useGetAnalyticsSummary()`

### Python Flask API (`backend/app.py`)

This is a **separate Python server** that runs the real Keras ML model.

| Method | Endpoint | What it does |
|--------|----------|-------------|
| `GET` | `/health` | Confirms Flask API is running |
| `POST` | `/predict` | Accepts an image file, runs the Keras model, returns DR prediction |

---

## 9. 🤖 Module 5 — AI Analysis Logic

There are **two AI analysis layers** in this project:

### Layer 1: Python Flask + Keras Model (`predict.py` + `backend/app.py`)

This is the **real deep learning pipeline**:

1. **Model Loading** (`load_model()`):
   - Loads `model/dr_model.h5` — a pretrained Keras model (EfficientNetB4-based)
   - Loaded **once** on first request and **cached in memory** for speed

2. **Image Preprocessing** (`preprocess_image()`):
   - Opens the image with PIL
   - Converts to RGB (removes transparency, handles grayscale)
   - Resizes to **224×224 pixels** using high-quality Lanczos resampling
   - Normalizes pixel values from 0–255 → **0.0 to 1.0**
   - Adds a batch dimension: shape becomes `(1, 224, 224, 3)`

3. **Prediction** (`predict_dr()`):
   - Runs `model.predict()` → outputs a shape `(1, 5)` array (5 class probabilities)
   - Uses `argmax` to find the class with the **highest probability**
   - Returns: `prediction` (label), `stage` (0–4), `confidence` (score), `all_probabilities` (all 5 scores)

4. **Error Handling**:
   - `400` — No image / empty filename
   - `415` — Unsupported format (only allows jpg, jpeg, png, tif, bmp)
   - `503` — Model file not found
   - `500` — Unexpected inference error

### Layer 2: Node.js Image Analysis (`artifacts/api-server/src/lib/image-analysis.ts` + `ai-simulation.ts`)

When the frontend calls `POST /api/scans/analyze`:
- The Node server runs its own **pixel-level retinal image analysis** on the Base64 image
- This analysis produces: `drStage`, `confidenceScore`, and `heatmapPoints`
- These values are passed to `buildAnalysisResult()` which then determines:
  - **Risk Level**: Stage 0 = low, 1 = medium, 2 = high, 3-4 = critical
  - **Blindness Risk Score**: Based on stage (0→5, 1→20, 2→40, 3→65, 4→90) with slight random variance
  - **Recommendation text**: One of 5 clinical recommendation messages

> If no image is provided, a fallback simulation randomly picks a DR stage using weighted probabilities.

**The 5 DR Stages:**

| Stage | Name | Risk |
|-------|------|------|
| 0 | No DR | Low |
| 1 | Mild NPDR | Medium |
| 2 | Moderate NPDR | High |
| 3 | Severe NPDR | Critical |
| 4 | Proliferative DR | Critical |

---

## 10. 📊 Module 6 — Scan Result Page

**File:** `artifacts/retina-guard/src/pages/ScanResult.tsx`

### What it shows:
This is the **most feature-rich page** in the system. After analysis, the doctor sees:

**Left Panel — Retinal Image + Heatmap:**
- The uploaded retinal image is displayed
- An **SVG heatmap overlay** is drawn on top:
  - **Red circles** = high-intensity damage areas
  - **Yellow circles** = medium-intensity damage areas
  - These are placed based on `heatmapData` (JSON coordinates from the database)

**Right Panel — Diagnostic Cards:**
- **DR Stage Card**: Big number (0–4), stage label, confidence %, blindness risk score
- **AI Recommendation Card**: Plain-English advice for the detected stage
- **Doctor Review Panel** (only shown if user is a Doctor AND scan is not yet confirmed):
  - A text area to enter clinical notes
  - "Confirm Diagnosis" button

**If Doctor Confirms:**
- The `PATCH /api/scans/:id` API is called with `doctorConfirmed: true`, doctor notes, and doctor ID
- The confirmation panel is replaced by a **green "Confirmed by Dr. [name]"** badge

**Critical Alert:**
- If `drStage >= 3`, a bold red warning banner appears at the top

### 🌐 Multi-language Support (Unique Feature):
The scan result page supports **5 languages**:

| Language | Code |
|----------|------|
| English | `en-US` |
| Tamil | `ta-IN` |
| Hindi | `hi-IN` |
| Telugu | `te-IN` |
| Malayalam | `ml-IN` |

The doctor can switch the language using a **dropdown selector**. All labels, stage names, risk levels, recommendations, and UI strings instantly switch to the selected language.

### 🔊 Text-to-Speech (Voice Narration):
- A **"Listen" button** reads the scan result aloud using the browser's `SpeechSynthesis` API
- The narration is spoken in the selected language (e.g., Tamil voice for Tamil text)
- A **"Stop" button** cancels speech mid-way

### 🖨️ Print Report:
- A **"Print Report"** link navigates to `/reports/:scanId` — a printable, formatted medical report

---

## 11. 👥 Module 7 — Patient Management

**File:** `artifacts/retina-guard/src/pages/Patients.tsx`

### What it does:
The Patient Directory page allows viewing and managing all registered patients.

### Features:
- **Search bar** — filters patients by name in real-time (client-side filtering)
- **Patient table** with columns: Patient ID (formatted as #PT-0001), Name, Age/Gender, Diabetes Type, Registration Date, Action
- **"Add Patient" button** → opens a **modal form** with fields:
  - Full Name (required)
  - Age (required, 1–120)
  - Gender (male/female/other)
  - Diabetes Type (type1/type2/gestational/none)
  - Contact Info (phone/email)
- **"View History"** link → goes to `PatientDetail` page (shows all scans for that patient)
- **Delete button** → soft-deletes the patient

---

## 12. 📈 Module 8 — Analytics Page

**File:** `artifacts/retina-guard/src/pages/Analytics.tsx`

### What it shows:
Visual charts derived from all scans in the database:

1. **DR Stage Distribution Bar Chart**
   - Shows how many scans belong to each stage (Stage 0 to Stage 4)
   - Teal-colored bars using Recharts `BarChart`

2. **Risk Level Breakdown Donut Chart**
   - Shows the % of scans at each risk level (low, medium, high, critical)
   - Color-coded: green, yellow, orange, red

All data comes from `GET /api/analytics/summary`.

---

## 13. 📄 Module 9 — Report Page

**File:** `artifacts/retina-guard/src/pages/Report.tsx`

### What it does:
A **printable, formatted medical report** for a specific scan.

**Data shown:**
- Patient details (name, age, gender, diabetes type)
- Scan details (date, DR stage name, confidence, risk, blindness risk)
- AI recommendation
- Treatment plan (from server-side `TREATMENT_PLANS` lookup)
- Risk description
- Doctor confirmation status and notes

**Treatment Plans by Stage (stored in `reports.ts`):**
- Stage 0: Annual eye exam, maintain HbA1c < 7%
- Stage 1: Every 6-9 months, glycemic control
- Stage 2: Referral within 3-6 months, consider laser photocoagulation
- Stage 3: Urgent referral within 1-4 weeks, anti-VEGF therapy
- Stage 4: Emergency referral to vitreoretinal surgeon, immediate surgery evaluation

---

## 14. 🗑️ Module 10 — Global Delete Functionality

**File:** `artifacts/retina-guard/src/components/DeleteButton.tsx`

### What it does:
A **reusable delete button component** that can be placed anywhere in the app.

### How it works:
1. A **red trash icon button** appears on any item (patient or scan)
2. User clicks it → an **AlertDialog (confirmation modal)** appears:
   - Title: e.g., *"Delete Scan?"*
   - Description: *"This will permanently delete this scan..."*
   - Two buttons: **Cancel** and **Delete** (red)
3. User clicks Delete → the `onDelete()` function is called (which calls the API)
4. On success: a **toast notification** appears: *"Record deleted successfully"*
5. On failure: *"Delete failed. Try again."*
6. The UI updates **instantly** without any page reload (React Query refetch)

**It is used in:** Dashboard, Patients page, Scan Result page, Patient Detail page.

---

## 15. 🔄 Complete Data Flow (Step-by-Step)

```
[User types username/password]
        ↓
[Frontend validates role → stores in React Context]
        ↓
[Dashboard loads → GET /api/analytics/summary + GET /api/scans]
        ↓ (Doctor clicks "New Scan")
[UploadAnalyze page → Doctor selects patient from GET /api/patients]
        ↓ (Doctor uploads image)
[Image converted to Base64 in browser]
        ↓ (Doctor clicks "Analyze Scan")
[POST /api/scans/analyze → { patientId, imageData }]
        ↓
[Node.js Server receives request]
        ↓
[image-analysis.ts performs pixel analysis on Base64 image]
        ↓
[buildAnalysisResult() maps analysis to DR stage, risk, heatmap]
        ↓
[INSERT into scans table in PostgreSQL]
        ↓
[Server returns the new scan record (including scan ID)]
        ↓
[Frontend navigates to /scans/{id}]
        ↓
[GET /api/scans/{id} → fetch scan + patient data]
        ↓
[ScanResult page displays: image, heatmap overlay, DR stage,
 confidence, risk, recommendation, doctor review panel]
        ↓ (Doctor types notes + clicks "Confirm Diagnosis")
[PATCH /api/scans/{id} → { doctorConfirmed: true, doctorNotes, doctorId }]
        ↓
[UPDATE scans table in PostgreSQL]
        ↓
[UI updates to show "Confirmed by Dr. [name]" badge]
        ↓ (Doctor clicks "Print Report")
[GET /api/reports/{scanId} → returns full report with treatment plan]
        ↓
[Report page renders a printer-friendly medical document]
```

---

## 16. 🧑‍⚕️ Real-Time Example Walkthrough

> **Scenario:** Dr. Rajan logs in and screens a new patient, Priya Sharma, for Diabetic Retinopathy.

**Step 1 — Login**
Dr. Rajan opens the app. He clicks the **"Doctor"** quick-select button on the login page. The credentials are auto-filled (`doctor` / `doc123`). He clicks **"Secure Login"**. After 0.8 seconds, he is taken to the Dashboard.

**Step 2 — Dashboard**
The dashboard shows: 8 patients, 8 scans analyzed, 2 critical cases, 89.4% average confidence. He can see recent screenings in the table.

**Step 3 — Upload**
Dr. Rajan clicks **"New Scan"**. The Upload & Analyze page opens.
- He selects **Priya Sharma** from the patient dropdown.
- He drags a JPEG fundus image of her eye into the upload zone. A preview appears.
- The summary panel shows: Patient: Priya Sharma, Image: priya_eye.jpg, Size: 1.42 MB.
- He clicks **"Analyze Scan"**.

**Step 4 — Scanning Animation**
The app shows the scanning screen. Priya's image is displayed in a glowing circle with a moving teal scan line and pulsing icon. Text reads: *"Running AI Model..."*. After 2.5 seconds, the system completes.

**Step 5 — Scan Result**
The app navigates to `/scans/9`. The result shows:
- **DR Stage: 2** (Moderate NPDR)
- **Risk: High** (orange badge)
- **AI Confidence: 91.0%**
- **Blindness Risk: 42/100**
- A retinal image with red/yellow heatmap spots showing affected areas
- **AI Recommendation:** *"Noticeable changes were found in your retina. Please see an eye specialist within 3 to 6 months..."*

**Step 6 — Language Change**
Dr. Rajan switches the language to **Tamil (தமிழ்)** so he can explain the results to the patient. All text on the page switches to Tamil instantly.

**Step 7 — Voice Narration**
He clicks **"கேளுங்கள்"** (Listen). The browser speaks the diagnosis result aloud in Tamil.

**Step 8 — Doctor Confirms**
Dr. Rajan types in the notes area: *"Referred to Dr. Arun, retinal specialist. Laser evaluation scheduled in 3 months."* He clicks **"நோய் கண்டறிதலை உறுதிப்படுத்து"** (Confirm Diagnosis).

The panel changes to a **green "Confirmed by Dr. doctor"** badge with his notes displayed.

**Step 9 — Print Report**
Dr. Rajan clicks **"அறிக்கை அச்சிடு"** (Print Report). The report page opens showing the full printable medical report including patient info, scan data, risk description, and treatment plan.

**Step 10 — Done**
The scan is saved in the database with `doctorConfirmed = true`, ready for future reference.

---

## 17. 📋 Summary: Key Features

| Feature | Status |
|---------|--------|
| Doctor & Admin Login (role-based) | ✅ Implemented |
| Dashboard with live stats | ✅ Implemented |
| Patient registration & management | ✅ Implemented |
| Drag-and-drop retinal image upload | ✅ Implemented |
| AI-based DR stage detection (0–4 stages) | ✅ Implemented |
| Heatmap overlay on retinal image | ✅ Implemented |
| Confidence score & blindness risk score | ✅ Implemented |
| Doctor review & confirmation workflow | ✅ Implemented |
| Multi-language support (5 languages) | ✅ Implemented |
| Text-to-speech narration in local language | ✅ Implemented |
| Analytics charts (Bar + Pie) | ✅ Implemented |
| Printable medical report with treatment plan | ✅ Implemented |
| Soft-delete for patients & scans | ✅ Implemented |
| Confirmation modal before delete | ✅ Implemented |
| Instant UI updates without page reload | ✅ Implemented |
| Python Flask + Keras ML inference API | ✅ Implemented |
| OpenAPI spec + auto-generated API client | ✅ Implemented |
| Database seeding with sample data | ✅ Implemented |
