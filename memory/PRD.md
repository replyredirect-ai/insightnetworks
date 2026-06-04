# Insight Networks — Marketing Website PRD

## Original Problem Statement
Build a full marketing website from the provided brochure (Insight Networks — ISP based in Bhopal, MP, India). Tagline: "CONNECTING TODAY. POWERING TOMORROW." Hero: "Smart Networks. Stronger Business. Better Tomorrow."

## User Choices (locked)
- Static marketing site (no backend) — contact form is mocked client-side
- Multi-page routes (Home, Services, Plans, About, Contact)
- Plans display "Contact for Pricing" (no numeric prices)
- No 3rd-party email integration
- Logo: styled text-based placeholder (real logo file to be provided later)

## Architecture
- Frontend: React 19 + React Router v7 + Tailwind + Shadcn UI components (where applicable) + lucide-react icons + sonner for toasts
- No backend modifications — original FastAPI server retained
- Single shared Layout (Navbar + Footer) wrapping all routes

## Brand
- Primary: `#1E88FF` (electric blue)
- Dark: `#0A1A33` (navy)
- Surface: `#FFFFFF` / `#F4F7FB`
- Fonts: Outfit (display) + IBM Plex Sans (body)

## Implemented (2026-02)
- Logo component (styled "insight NETWORKS" with arrow accent)
- Sticky glass Navbar with mobile hamburger
- Dark Footer with quick links, services list, contact info
- Home page: hero with fiber-optic image, stats strip, services preview (6 cards), plans preview, CTA banner
- Services page: detail grid with numbered cards (6 services)
- Plans page: 3 plan cards + feature comparison matrix
- About page: story section, values, "by the numbers" band with city skyline
- Contact page: form with success toast (mocked), info cards (tel/mailto/web links), embedded Google Map
- Page-level fade transitions
- Data-testid on all interactive elements
- Tested via testing_agent_v3 — 33/33 frontend checks pass

## Pages
- `/` Home
- `/services` Services
- `/plans` Plans
- `/about` About
- `/contact` Contact (mocked form)

## Backlog (P1/P2)
- P1: Replace placeholder text logo with real logo image when user provides
- P1: Wire up contact form to a real backend + email notification (Resend/SendGrid) if user opts in later
- P2: Add testimonials / case studies section
- P2: Add coverage area map (Bhopal & MP cities served)
- P2: Add live chat / WhatsApp click-to-chat integration
- P2: Blog / news section
- P2: SEO meta tags + sitemap.xml + Open Graph images per page

## Next Tasks
- Await user feedback on look & feel
- Receive logo asset from user → swap into `src/components/Logo.jsx`
- Optional: enable backend-stored contact form submissions
