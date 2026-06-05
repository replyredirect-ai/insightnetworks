import { useState } from "react";
import PageHeader from "../components/PageHeader";
import CtaBanner from "../components/CtaBanner";
import { SERVICES } from "../data/site";
import { ArrowRight, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

const SERVICES_BG = "https://images.unsplash.com/photo-1604869515882-4d10fa4b0492?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzF8MHwxfHNlYXJjaHwxfHxmaWJlciUyMG9wdGljc3xlbnwwfHx8fDE3ODA2NDIxMTJ8MA&ixlib=rb-4.1.0&q=85";

export default function Services() {
  const [selectedService, setSelectedService] = useState(null);

  return (
    <div data-testid="services-page">
      <PageHeader
        eyebrow="Our Services"
        title="Engineering the backbone of"
        accent="modern business."
        subtitle="From fibre splicing in the field to firewall policies in the data centre — Insight Networks delivers every layer of connectivity your business depends on."
        backgroundImage={SERVICES_BG}
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
                <p className="mt-3 text-slate-600 leading-relaxed">{s.summary}</p>
                <button
                  onClick={() => setSelectedService(s)}
                  data-testid={`learn-more-${s.title.toLowerCase().replace(/\s+/g, "-")}`}
                  className="mt-6 inline-flex items-center gap-2 text-[#1E88FF] font-semibold text-sm group-hover:gap-3 transition-all hover:underline"
                >
                  Learn more <ArrowRight size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Service Detail Modal */}
      <Dialog open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
        <DialogContent className="sm:max-w-2xl bg-white border-slate-200" data-testid="service-detail-modal">
          {selectedService && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-[#1E88FF]/10 flex items-center justify-center shrink-0">
                    <selectedService.icon size={28} className="text-[#1E88FF]" />
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="font-display text-2xl font-bold text-[#0A1A33]">
                      {selectedService.title}
                    </DialogTitle>
                    <DialogDescription className="mt-2 text-slate-600 leading-relaxed">
                      {selectedService.summary}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="mt-6 space-y-4">
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                  <h4 className="text-xs font-semibold tracking-widest uppercase text-[#1E88FF] mb-3">
                    Detailed Overview
                  </h4>
                  <p className="text-slate-700 leading-relaxed">
                    {selectedService.detail}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    onClick={() => setSelectedService(null)}
                    className="text-slate-600 hover:text-[#0A1A33] font-medium transition-colors"
                  >
                    Close
                  </button>
                  <a
                    href="/contact"
                    className="inline-flex items-center gap-2 bg-[#1E88FF] hover:bg-[#156cd1] text-white font-semibold px-6 py-3 rounded-full transition-colors"
                  >
                    Get Started <ArrowRight size={16} />
                  </a>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <CtaBanner />
    </div>
  );
}
