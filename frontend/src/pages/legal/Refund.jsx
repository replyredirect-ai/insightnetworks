import PageHeader from "../../components/PageHeader";
import { Clock, RefreshCw, XCircle, IndianRupee, HelpCircle, CheckCircle2 } from "lucide-react";

const SECTIONS = [
  {
    icon: Clock,
    title: "1. Cooling-off Period",
    body: [
      "You may cancel a newly-provisioned connection within 7 calendar days of activation for a full refund of the plan value, PROVIDED no more than 5 GB of data has been consumed.",
      "Router / ONT rental for the cooling-off window (₹50/day) will be deducted from the refund.",
      "Installation charges are non-refundable once the field visit has taken place.",
    ],
  },
  {
    icon: RefreshCw,
    title: "2. Prorated Refunds on Mid-Cycle Cancellation",
    body: [
      "For monthly plans: unused days from the invoice date are refunded at (Plan Amount / Days-in-Cycle) × Unused-Days.",
      "For quarterly / annual plans: refund is calculated month-wise. Fractional months are not refunded.",
      "GST paid to the government is non-refundable unless a credit note is issued in the same GST period.",
    ],
  },
  {
    icon: XCircle,
    title: "3. Non-Refundable Charges",
    body: [
      "One-time activation and installation charges.",
      "Router / ONT purchase cost (if opted for outright purchase instead of rental).",
      "Late-payment reconnection charges.",
      "Third-party charges (static IP setup, port-forwarding config, etc.) once delivered.",
    ],
  },
  {
    icon: IndianRupee,
    title: "4. Refund Timelines",
    body: [
      "Refund requests must be raised via the subscriber portal or by writing to accounts@insightnet.in with your account number and reason.",
      "Approved refunds are credited to the original payment instrument within 7-10 business days.",
      "UPI / Wallet refunds are usually credited within 3 business days.",
      "For account balance credits (chose against a full refund), the credit is available immediately for future usage.",
    ],
  },
  {
    icon: CheckCircle2,
    title: "5. Chargebacks & Disputes",
    body: [
      "Please reach out to us first — 90% of disputes are resolved within 48 hours without needing a chargeback.",
      "Unauthorised chargebacks may result in immediate service suspension pending investigation.",
      "For payment disputes, our CCAvenue payment gateway provides a case-tracking system. Reference the CCAvenue Order ID in all correspondence.",
    ],
  },
  {
    icon: HelpCircle,
    title: "6. Service Non-Feasibility Refund",
    body: [
      "If we accept payment but subsequently find your address is not serviceable, 100% of the amount paid is refunded within 5 business days.",
      "No installation charges apply in this scenario.",
    ],
  },
];

export default function Refund() {
  return (
    <div data-testid="refund-page">
      <PageHeader
        eyebrow="LEGAL"
        title="Refund &amp;"
        accent="Cancellation Policy"
        subtitle="Fair, transparent rules for cancellations and refunds. Effective 01 January 2026."
        backgroundImage="https://images.unsplash.com/photo-1554224155-1696413565d3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwxfHxpbnZvaWNlJTIwYmlsbGluZ3xlbnwwfHx8Ymx1ZXwxNzY3MjMxMzg2fDA&ixlib=rb-4.1.0&q=85"
      />

      <section className="container mx-auto px-6 lg:px-8 py-16 max-w-5xl">
        <div className="prose prose-slate max-w-none mb-12">
          <p className="text-lg text-slate-700 leading-relaxed">
            We believe a great ISP relationship is built on fair terms — including how we handle cancellations
            and refunds. This policy explains exactly what you&apos;re entitled to and how quickly you&apos;ll get your money back.
          </p>
        </div>

        <div className="space-y-8">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                data-testid={`refund-section-${s.title.replace(/\s+/g, "-").toLowerCase()}`}
                className="bg-white border-2 border-slate-200 rounded-2xl p-6 lg:p-8 shadow-sm hover:shadow-md hover:border-[#1E88FF]/40 transition-all"
              >
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Icon className="text-[#1E88FF]" size={24} />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-display text-xl font-bold text-[#0A1A33] mb-4">{s.title}</h2>
                    <ul className="space-y-2.5">
                      {s.body.map((line, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1E88FF] mt-2 shrink-0" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 bg-gradient-to-br from-[#0A1A33] to-[#0F2847] text-white rounded-2xl p-8 lg:p-10">
          <h3 className="font-display text-2xl font-bold mb-3">Need help with a refund?</h3>
          <p className="text-slate-300 leading-relaxed mb-6 max-w-2xl">
            Reach out to our accounts team — most refunds are approved on the same business day.
          </p>
          <div className="flex flex-wrap gap-4">
            <a href="mailto:accounts@insightnet.in" className="inline-flex items-center gap-2 bg-[#1E88FF] hover:bg-[#156cd1] text-white font-semibold px-5 py-3 rounded-full transition-colors">
              Email Accounts
            </a>
            <a href="tel:+919302452424" className="inline-flex items-center gap-2 border-2 border-white/30 hover:border-white text-white font-semibold px-5 py-3 rounded-full transition-colors">
              Call +91 93024 52424
            </a>
          </div>
        </div>

        <p className="text-xs text-slate-500 text-center mt-10">
          Effective date: 01 January 2026 &middot; Last updated: 01 January 2026
        </p>
      </section>
    </div>
  );
}
