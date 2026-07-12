# Insight Networks — Product Requirements Document

## Source
Continued from GitHub repo `replyredirect-ai/insightnetworks` branch **Final** (commit `ea99c2b`).

## Original Problem Statement
Full marketing website + subscriber/admin portal for Insight Networks (ISP based in Bhopal, MP, India). Tagline: **"CONNECTING TODAY. POWERING TOMORROW."** Hero: **"Smart Networks. Stronger Business. Better Tomorrow."**

## Architecture
- **Frontend**: React 19 + React Router v7 + Tailwind + Shadcn UI + lucide-react + sonner
- **Backend**: FastAPI proxy → XceedNet ISP platform (`admin.insightnet.in` / `bhopal.insightnet.in`)
- **Database**: MongoDB (ticket replies, status checks, payment sessions)
- **Payment Gateway**: CCAvenue (env-based, disabled if keys missing)
- **PDF Generation**: ReportLab (invoices + account statements)

## Marketing Site (`/`, `/services`, `/plans`, `/about`, `/contact`, `/industries`, `/technology-partners`, `/services/leased-line`, `/services/wisp`)
- Sticky glass navbar + dark footer
- Hero with fiber-optic bg, live-network glass card, stats strip
- Services grid, plans grid + comparison matrix, about + values, contact form (mocked)

## Subscriber Portal (`/subscriber-login` → `/dashboard/*`)
- Login accepts username or mobile number (mobile resolved via service admin lookup)
- Overview, Invoices (list + PDF download), Payments, Profile edit + change password
- Support Tickets (list, create, detail with replies stored in Mongo)
- Account Statement PDF (comprehensive multi-section report)
- CCAvenue-based invoice payment + recharge flow (`/api/payments/initiate`, `/payments/callback`, `/payment-result`)

## Admin Portal (`/admin-login`, `/admin`)
- Location dashboard stats
- Subscriber list search
- Package list

## Backend Endpoints (highlights)
- Auth: `POST /api/subscriber/login`, `POST /api/admin/login`
- Subscriber: `/subscriber/{dashboard,profile,invoices,payments,tickets,statement/pdf,change-password}`
- Admin: `/admin/{dashboard,locations}`, `/subscribers/list`, `/packages/list`
- Payments: `/payments/initiate`, `/payments/callback`, `/payments/status/{order_id}`
- Health: `GET /api/`, `/api/status`

## Environment Variables (backend)
- `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS` (already set)
- Required for full functionality (optional in preview):
  - `XCEEDNET_AUTH_BASE_URL`, `XCEEDNET_DEFAULT_SUBSCRIBER_DOMAIN`, `XCEEDNET_DEFAULT_ADMIN_LOCATION`
  - `XCEEDNET_SERVICE_EMAIL`, `XCEEDNET_SERVICE_PASSWORD` (service admin for mobile-lookup + admin-scoped fetches)
  - `CCAVENUE_MERCHANT_ID`, `CCAVENUE_ACCESS_CODE`, `CCAVENUE_WORKING_KEY`, `CCAVENUE_ENVIRONMENT`, `CCAVENUE_REDIRECT_URL`, `CCAVENUE_CANCEL_URL`, `FRONTEND_BASE_URL`

## Current State (2026-01-12)
- Codebase restored from `Final` branch and running
- Backend healthy at `/api/` (returns `{"message":"Insight Networks API Proxy"}`)
- Frontend loads and renders marketing site correctly
- Python deps installed via `--no-deps` due to litellm URL-pinned conflict; all imports resolve

## Backlog / Next
- Await user's next feature request or bug report
- P1: Set real XceedNet + CCAvenue credentials in `/app/backend/.env` to enable authenticated portals
- P2: Testimonials, coverage-area map, WhatsApp click-to-chat, blog
- P2: SEO meta + sitemap.xml + Open Graph images
