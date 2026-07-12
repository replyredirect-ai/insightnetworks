# Insight Networks — Product Requirements Document

## Source
Continued from GitHub repo `replyredirect-ai/insightnetworks` branch **Final** (commit `ea99c2b`).

## Original Problem Statement
Marketing website + subscriber/admin portal for Insight Networks (ISP, Bhopal, MP, India).
Tagline: **"CONNECTING TODAY. POWERING TOMORROW."**
Hero: **"Smart Networks. Stronger Business. Better Tomorrow."**

## Architecture
- **Frontend**: React 19 + React Router v7 + Tailwind + Shadcn UI + lucide-react + sonner
- **Backend**: FastAPI proxy → XceedNet ISP platform (`admin.insightnet.in` / `bhopal.insightnet.in`)
- **Database**: MongoDB (ticket replies, status checks, payment sessions)
- **Payment Gateway**: CCAvenue (production keys configured)
- **PDF Generation**: ReportLab + pypng-backed QR

## Environment (backend/.env — all configured)
- Mongo: `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`
- XceedNet: `XCEEDNET_AUTH_BASE_URL`, `XCEEDNET_DEFAULT_SUBSCRIBER_DOMAIN`, `XCEEDNET_DEFAULT_ADMIN_LOCATION`, `XCEEDNET_SERVICE_EMAIL` (`insightnetworks@hotmail.com`), `XCEEDNET_SERVICE_PASSWORD`
- CCAvenue: `CCAVENUE_MERCHANT_ID=1936794`, `_ACCESS_CODE`, `_WORKING_KEY`, `_ENVIRONMENT=production`, `_REDIRECT_URL`, `_CANCEL_URL`, `FRONTEND_BASE_URL`

## Routes
### Marketing
- `/`, `/about`, `/services`, `/services/leased-line`, `/services/wisp`, `/plans`, `/industries`, `/technology-partners`, `/contact`
- **NEW Legal**: `/privacy`, `/terms`, `/refund`

### Portals
- `/subscriber-login` → `/dashboard/*` (Overview, Invoices, Payments, Tickets, Profile, Change Password)
- `/admin-login` → `/admin`

## Changes Made (2026-01-12)
### Bug Fixes
1. **Invoice PDF download** — missing `pypng` dependency (needed by `qrcode` for UPI QR embed) caused 500 errors. Fixed: installed `pypng==0.20220715.0` and pinned in `requirements.txt`. Verified end-to-end: real invoice `INV-57` (id 5234865) returns 562 KB `%PDF-1.4` file.
2. **Admin logout redirect** — was routing to `/dashboard`; corrected to `/admin-login`.

### New Features
1. **Legal pages** — `/privacy`, `/terms`, `/refund` with 6 sections each, Grievance Officer contact, CCAvenue/GST-aware content.
2. **Footer** — expanded from 4 to 5 columns with dedicated "Legal" column linking to Privacy/Terms/Refund/Industries/Partners.
3. **Admin Dashboard welcome banner** — premium gradient banner with: role, location, last login, current date/time meta cards + 8-item quick-access nav (Dashboard, Subscribers, Packages, Billing, Reports, Tickets, Settings, Profile). Logout moved into banner.
4. **Subscriber Dashboard welcome banner** — profile picture (KYC/photo_url fallback), online/offline pill, name, username, last login + 4 meta cards (Package / Valid Till / Current IP / Balance) + 7-item quick-access nav (Dashboard, Overview, Invoices, Payments, Tickets, Profile, Change Pwd).

### Verified E2E (backend + XceedNet live)
- Admin login → JWT
- Dashboard: 60 subscribers, 35 online, ₹3,03,247.82 invoices, 4 active tickets
- Locations: 5 · Packages: 26 · Subscribers list: 60 real records
- Invoice PDF download: 562 KB valid PDF

## Backlog / Next
### P1 (from user's Phase-5-plus request)
- **Invoice PDF redesign** — match the provided sample invoice image (currently the existing design is close but not pixel-identical to the reference)
- **Account Statement redesign** — reuse invoice branding + opening/closing balance calculation
- **Print action** on invoices/statements (window.print with styled print CSS)
- **Additional service detail pages** — Fiber Connectivity, Network Solutions, Security Solutions, Cloud Services, 24/7 Support (currently only Leased Line + WISP)
- **Skeleton loaders** replacing the current spinner-only loading states
- **Dark mode** toggle (feasibility)
- Wire up "Add / Edit / Delete Subscriber" buttons on admin dashboard (currently inert)

### P2
- Testimonials, coverage-area map, WhatsApp click-to-chat button
- SEO meta + sitemap.xml + Open Graph images
- Blog / news section
