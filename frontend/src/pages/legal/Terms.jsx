import PageHeader from "../../components/PageHeader";
import { FileText, Zap, AlertTriangle, Ban, Scale, RefreshCw } from "lucide-react";

const SECTIONS = [
  {
    icon: FileText,
    title: "1. Acceptance of Terms",
    body: [
      "By subscribing to any Insight Networks internet service or using our website, you agree to be bound by these Terms of Service, our Privacy Policy and any additional terms displayed at the point of subscription.",
      "If you do not agree, please discontinue use immediately.",
    ],
  },
  {
    icon: Zap,
    title: "2. Service Provisioning",
    body: [
      "Speeds advertised are peak speeds under ideal conditions. Actual throughput depends on distance from POP, chosen medium and downstream congestion.",
      "Static IPs, if opted for, are governed by our licence category and may be reassigned with 30-day notice.",
      "New connections are activated within 5 business days of successful KYC & payment. Delays due to civic clearances / feasibility are refundable per Section 5.",
    ],
  },
  {
    icon: AlertTriangle,
    title: "3. Acceptable Use",
    body: [
      "Do not use the service for any activity prohibited under Indian law (IT Act 2000, IPC, Copyright Act, etc.).",
      "Do not run open relays, botnets, or unauthorised commercial mail servers on the connection.",
      "P2P and torrenting are permitted for lawful content only; abuse of shared bandwidth may result in traffic shaping.",
      "You are responsible for the security of the equipment installed at your premises.",
    ],
  },
  {
    icon: Ban,
    title: "4. Suspension & Termination",
    body: [
      "Non-payment of dues beyond 15 days after the invoice due-date leads to service suspension.",
      "Repeated abuse of the Acceptable Use Policy is grounds for termination without refund.",
      "You may terminate at any time by written notice; pro-rated refunds are governed by our Refund Policy.",
    ],
  },
  {
    icon: Scale,
    title: "5. Liability & Warranty",
    body: [
      "We commit to a 99.5% monthly uptime SLA for Internet Leased Lines and 99.0% for retail broadband. SLA credits are the sole remedy for downtime.",
      "Insight Networks is NOT liable for indirect, incidental or consequential damages including lost profits, data loss or business interruption.",
      "Force-majeure events (natural disasters, government orders, fibre cuts due to civic works) are excluded from SLA calculations.",
    ],
  },
  {
    icon: RefreshCw,
    title: "6. Modifications to Terms",
    body: [
      "We may update these Terms from time to time. Material changes will be notified via email and the subscriber portal at least 30 days in advance.",
      "Continued use of the service after the effective date constitutes acceptance of the updated Terms.",
    ],
  },
];

export default function Terms() {
  return (
    <div data-testid="terms-page">
      <PageHeader
        eyebrow="LEGAL"
        title="Terms of"
        accent="Service"
        subtitle="The rules and expectations governing your use of Insight Networks internet services. Effective 01 January 2026."
        backgroundImage="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwxfHxsZWdhbCUyMGRvY3VtZW50fGVufDB8fHxibHVlfDE3NjcyMzEzODZ8MA&ixlib=rb-4.1.0&q=85"
      />

      <section className="container mx-auto px-6 lg:px-8 py-16 max-w-5xl">
        <div className="prose prose-slate max-w-none mb-12">
          <p className="text-lg text-slate-700 leading-relaxed">
            These Terms of Service (&ldquo;Terms&rdquo;) form a legal contract between Insight Networks (the
            &ldquo;Company&rdquo;) and you, the subscriber. Please read them carefully. If any clause is unclear,
            our team is happy to walk you through it — email <a className="text-[#1E88FF] hover:underline" href="mailto:contact@insightnet.in">contact@insightnet.in</a>.
          </p>
        </div>

        <div className="space-y-8">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                data-testid={`terms-section-${s.title.replace(/\s+/g, "-").toLowerCase()}`}
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
          <h3 className="font-display text-2xl font-bold mb-3">Governing Law & Jurisdiction</h3>
          <p className="text-slate-300 leading-relaxed max-w-3xl">
            These Terms are governed by the laws of India. Any dispute arising out of or in connection with them
            shall be subject to the exclusive jurisdiction of the courts at Bhopal, Madhya Pradesh.
          </p>
        </div>

        <p className="text-xs text-slate-500 text-center mt-10">
          Effective date: 01 January 2026 &middot; Last updated: 01 January 2026
        </p>
      </section>
    </div>
  );
}
