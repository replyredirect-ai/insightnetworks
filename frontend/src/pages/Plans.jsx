import { Link } from "react-router-dom";
import { Check, ArrowUpRight } from "lucide-react";
import PageHeader from "../components/PageHeader";
import CtaBanner from "../components/CtaBanner";
import { PLANS } from "../data/site";

const FEATURE_MATRIX = [
  { label: "Unlimited Data", values: [true, true, true] },
  { label: "High Speed", values: [true, true, true] },
  { label: "24/7 Support", values: [true, true, true] },
  { label: "Priority Support", values: [false, true, true] },
  { label: "Static IP", values: [false, false, true] },
  { label: "Dedicated Account Manager", values: [false, false, true] },
  { label: "Free Installation", values: [false, true, true] },
];

export default function Plans() {
  return (
    <div data-testid="plans-page">
      <PageHeader
        eyebrow="Our Plans"
        title="Bandwidth that scales with"
        accent="your business."
        subtitle="Three straight-forward plans. No fine print, no fair-use clauses, no surprise throttles. Just real, dedicated bandwidth."
      />

      <section className="container mx-auto px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS.map((p) => (
            <div
              key={p.name}
              data-testid={`plans-card-${p.name.toLowerCase()}`}
              className={`relative rounded-2xl p-8 transition-all ${
                p.popular
                  ? "bg-[#0A1A33] text-white border-2 border-[#1E88FF] md:scale-105 shadow-xl shadow-[#1E88FF]/20"
                  : "bg-white text-[#0A1A33] border border-slate-200"
              }`}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1E88FF] text-white text-[10px] font-bold tracking-widest px-4 py-1.5 rounded-full">
                  POPULAR
                </div>
              )}
              <p className={`text-xs font-semibold tracking-[0.25em] uppercase ${p.popular ? "text-[#1E88FF]" : "text-slate-500"}`}>
                {p.name}
              </p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-6xl font-bold">{p.speed}</span>
                <span className={`font-display text-xl font-semibold ${p.popular ? "text-slate-300" : "text-slate-500"}`}>
                  {p.unit}
                </span>
              </div>
              <p className={`mt-2 text-sm ${p.popular ? "text-slate-300" : "text-slate-500"}`}>Contact for Pricing</p>
              <p className={`mt-4 text-sm ${p.popular ? "text-slate-300" : "text-slate-600"}`}>{p.blurb}</p>

              <ul className="mt-7 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <Check size={16} className="text-[#1E88FF] shrink-0" />
                    <span className={p.popular ? "text-slate-200" : "text-slate-700"}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/contact"
                data-testid={`plans-cta-${p.name.toLowerCase()}`}
                className={`mt-8 inline-flex items-center justify-center w-full gap-2 font-semibold px-5 py-3.5 rounded-full transition-colors ${
                  p.popular
                    ? "bg-[#1E88FF] hover:bg-[#156cd1] text-white"
                    : "bg-[#0A1A33] hover:bg-[#0A1A33]/90 text-white"
                }`}
              >
                Get Started <ArrowUpRight size={16} />
              </Link>
            </div>
          ))}
        </div>

        {/* Comparison */}
        <div className="mt-24 max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[#1E88FF] text-xs font-semibold tracking-[0.25em] uppercase">Compare</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-[#0A1A33]">
              See exactly what&apos;s included
            </h2>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-4 bg-slate-50 border-b border-slate-200">
              <div className="p-5 text-xs font-semibold tracking-widest uppercase text-slate-500">Feature</div>
              {PLANS.map((p) => (
                <div key={p.name} className="p-5 text-center text-xs font-semibold tracking-widest uppercase text-[#0A1A33]">
                  {p.name}
                </div>
              ))}
            </div>
            {FEATURE_MATRIX.map((row, idx) => (
              <div key={row.label} className={`grid grid-cols-4 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"} border-b border-slate-100 last:border-0`}>
                <div className="p-5 text-sm text-slate-700">{row.label}</div>
                {row.values.map((v, i) => (
                  <div key={i} className="p-5 text-center">
                    {v ? <Check size={18} className="inline text-[#1E88FF]" /> : <span className="text-slate-300">—</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBanner />
    </div>
  );
}
