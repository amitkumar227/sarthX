# 🇮🇳 SarthX - Next-Gen Citizen Welfare & MyScheme Discovery Portal

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Languages](https://img.shields.io/badge/Languages-13%20Indian%20Languages-orange.svg)](#-13-language-localization)
[![Bhashini AI](https://img.shields.io/badge/AI-Bhashini%20Voice%20Sahayak-green.svg)](#-bhashini-ai-voice-sahayak)
[![OCR](https://img.shields.io/badge/OCR-Tesseract.js%20WASM-purple.svg)](#-client-side-ocr-document-scanner)
[![Hosting](https://img.shields.io/badge/Deploy-GitHub%20Pages-brightgreen.svg)](#-deploy-on-github-pages)

**SarthX** is a modern, hyper-accessible citizen welfare discovery platform inspired by [myScheme.gov.in](https://www.myscheme.gov.in). It bridges the digital divide for millions of rural and urban Indian citizens by leveraging voice recognition in vernacular languages, client-side OCR for identity documents, and real-time eligibility matching.

---

## 🌟 Key Features

### 1. 🌐 13-Language Native Localization
Instant client-side translation across 13 scheduled Indian languages:
- **English**, **हिंदी (Hindi)**, **বাংলা (Bengali)**, **मराठी (Marathi)**, **తెలుగు (Telugu)**, **தமிழ் (Tamil)**, **ગુજરાતી (Gujarati)**, **اردو (Urdu)**, **ಕನ್ನಡ (Kannada)**, **മലയാളം (Malayalam)**, **ਪੰਜਾਬੀ (Punjabi)**, **ଓଡ଼ିଆ (Odia)**, **অসমীয়া (Assamese)**.
- Persisted selection across sessions and pages using `localStorage`.

### 2. 🗣️ Bhashini AI Voice Sahayak & Natural Language Search
- Voice-first conversational search powered by Digital India's **Bhashini API** pipeline architecture with native Web Speech API fallback.
- Natural query parser understanding citizen needs (e.g., *"I am a small farmer needing loan subsidy"* or *"मैं एक छात्रा हूँ मुझे स्कॉलरशिप चाहिए"*).

### 3. 📑 50+ Verified Central & State Welfare Schemes
- Filter by category: Agriculture, Education, Banking & Loans, Health, Women & Children, Housing, Social Welfare, Skills & Employment.
- Filter by jurisdiction: All-India Central schemes or State-specific (Uttar Pradesh, Maharashtra, Bihar, Tamil Nadu, Karnataka, etc.).
- **Dual Action**: In-depth official criteria modal + Direct 1-Click Apply link to official portals (`pmkisan.gov.in`, `jansamarth.in`, `pmaymis.gov.in`, `scholarships.gov.in`, etc.).

### 4. 🎯 7-Step AI Eligibility Matcher
- Multi-parameter eligibility engine evaluating age, gender, caste category, employment status, annual income, state, and land ownership.
- Generates a quantified compatibility score (0-100%) and instant recommendations.

### 5. 🧮 Government Loan & Subsidy EMI Calculator
- Interactive amortization calculator specialized for public welfare loan programs:
  - **PM Mudra Yojana** (Shishu, Kishore, Tarun)
  - **PM SVANidhi** (Street Vendors)
  - **PM Awas Yojana (PMAY)** Credit Linked Subsidy Scheme (CLSS)
  - **PM Kisan Credit Card (KCC)**
  - **PM Vidyalaxmi** (Education Loan)
  - **Stand-Up India** (SC/ST & Women Entrepreneurs)
- Dynamic visual split bar showing Principal vs. Government Interest Subsidy vs. Net Interest Payable, with direct redirection to the JanSamarth National Credit Portal.

### 6. 📸 Client-Side OCR Document Scanner
- 100% private, client-side document text extraction using **Tesseract.js v5 (WebAssembly)**.
- Zero server transmission: Aadhaar cards, PAN cards, income certificates, and Kisan cards are parsed directly inside the user's browser.
- Automatically detects Age/DOB, Gender, State, and Income brackets and allows 1-click export directly into the AI Eligibility Matcher.

### 7. 📋 Smart Document Checklist Matrix
- Interactive cross-reference guide showing required documents (Aadhaar, Ration Card, Income Certificate, Land Records, etc.) and matching schemes unlocked by each document.

---

## 🏗️ Architecture & Tech Stack

```
sarthx-myscheme-portal/
├── index.html            # Landing page with Voice Sahayak & Hero Search
├── schemes.html          # Schemes directory with real-time filters & Direct Apply
├── aimatcher.html        # 7-Step eligibility wizard
├── calculator.html       # Welfare loan & subsidy EMI calculator
├── ocr-scanner.html      # Tesseract.js client-side document scanner
├── eligibility.html      # Document checklist & scheme unlock matrix
├── css/
│   └── style.css         # GovTech design system, responsive layout, dark theme
├── js/
│   ├── schemes-data.js   # 50+ scheme database with official apply links
│   ├── bhashini.js       # Voice recognition & intent matching engine
│   └── translations.js   # 13 Indian languages i18n dictionary & switcher
└── img/                  # Assets & graphics
```

- **Frontend**: HTML5, Modern CSS3 (CSS Grid, Flexbox, Glassmorphism, CSS Variables)
- **Programming**: Vanilla JavaScript (ES6+), zero heavy frameworks
- **AI / Machine Learning**:
  - **Bhashini ASR & TTS** Pipeline Architecture (with browser SpeechRecognition fallback)
  - **Tesseract.js v5 (WASM)** client-side Optical Character Recognition
- **Data**: Verified catalog based on open data from [data.gov.in](https://data.gov.in) and [myscheme.gov.in](https://www.myscheme.gov.in)

---

## 🚀 Getting Started

### Run Locally
Since SarthX is built with vanilla web technologies, no build tools or package managers are required:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/<your-username>/sarthx-myscheme-portal.git
   cd sarthx-myscheme-portal
   ```

2. **Open in Browser**:
   - Double click `index.html` to open directly in any modern browser (Chrome, Edge, Firefox, Safari).
   - *Or* run a local server (recommended for camera access on OCR):
     ```bash
     # Using Python
     python -m http.server 8000
     # Open http://localhost:8000 in your browser
     ```
     *Or using VS Code Live Server extension.*

---

## 🌐 Deploy on GitHub Pages (Free Live Website)

You can host this website on GitHub Pages for free in 1 minute:

1. Push this repository to GitHub.
2. Go to your repository on GitHub: **Settings** $\rightarrow$ **Pages** (under the "Code and automation" section).
3. Under **Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` / `(root)`
4. Click **Save**.
5. Your website will be live at: `https://<your-username>.github.io/sarthx-myscheme-portal/`

---

## 🔒 Privacy & Security
- **No Data Stored**: All personal inputs, profile wizard data, and uploaded identity documents stay entirely in the browser memory.
- **OCR Processing**: Images are processed via WebAssembly inside the client browser. No photos or document scans are uploaded to any external server.

---

## 🤝 Contributing & Disclaimer
- **Disclaimer**: SarthX is an independent GovTech initiative built for public convenience and educational discovery. Official scheme applications and subsidies are processed through respective government portals (`.gov.in` / JanSamarth).
