import PageHeader from "../components/PageHeader";
import CtaBanner from "../components/CtaBanner";
import { SERVICES } from "../data/site";
import { ArrowRight } from "lucide-react";

export default function Services() {
  return (
    <div data-testid="services-page">
      <PageHeader
        eyebrow="Our Services"
        title="Engineering the backbone of"
        accent="modern business."
        subtitle="From fibre splicing in the field to firewall policies in the data centre — Insight Networks delivers every layer of connectivity your business depends on."
      />

      <section className="container mx-auto px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          {SERVICES.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                data-testid={`services-detail-${s.title.toLowerCase().replace(/\s+/g, "-")}`}
                className="group bg-white border border-slate-200 rounded-2xl p-8 lg:p-10 hover:border-[#1E88FF] hover:shadow-xl hover:shadow-[#1E88FF]/10 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 rounded-xl bg-[#1E88FF]/10 flex items-center justify-center group-hover:bg-[#1E88FF] transition-colors">
                    <Icon size={26} className="text-[#1E88FF] group-hover:text-white transition-colors" />
                  </div>
                  <span className="font-display text-5xl font-bold text-slate-100 group-hover:text-[#1E88FF]/20 transition-colors">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-2xl font-semibold text-[#0A1A33]">{s.title}</h3>
                <p className="mt-3 text-slate-600 leading-relaxed">{s.detail}</p>
                <div className="mt-6 inline-flex items-center gap-2 text-[#1E88FF] font-semibold text-sm group-hover:gap-3 transition-all">
                  Learn more <ArrowRight size={16} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <CtaBanner />
    </div>
  );
}
