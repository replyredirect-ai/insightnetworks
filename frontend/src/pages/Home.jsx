import { Link } from "react-router-dom";
import { ArrowUpRight, Check, ArrowRight } from "lucide-react";
import { STATS, SERVICES, PLANS } from "../data/site";
import CtaBanner from "../components/CtaBanner";

const HERO_BG = "https://images.pexels.com/photos/8640331/pexels-photo-8640331.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1600";

export default function Home() {
  return (
    <div data-testid="home-page">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_BG})` }}
        />
        <div className="absolute inset-0 hero-overlay" />
        <div className="absolute inset-0 dot-grid opacity-10" />

        <div className="container mx-auto px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-12 gap-10 items-center min-h-[88vh] py-24">
            <div className="lg:col-span-7 text-white">
              <span className="inline-flex items-center gap-2 text-[#1E88FF] text-xs font-semibold tracking-[0.25em] uppercase">
                <span className="h-px w-8 bg-[#1E88FF]" />
                Bhopal · Madhya Pradesh · India
              </span>
              <h1 className="mt-6 font-display text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.02]">
                Smart Networks.<br />
                Stronger Business.<br />
                <span className="text-[#1E88FF]">Better Tomorrow.</span>
              </h1>
              <p className="mt-7 text-lg lg:text-xl text-slate-300 max-w-xl leading-relaxed">
                High-Speed Internet · Reliable Connections · Advanced Solutions for Your Digital World.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  to="/contact"
                  data-testid="hero-primary-cta"
                  className="btn-shine inline-flex items-center gap-2 bg-[#1E88FF] hover:bg-[#156cd1] text-white text-base font-semibold px-7 py-4 rounded-full transition-colors"
                >
                  Get Connected Today
                  <ArrowUpRight size={18} />
                </Link>
                <Link
                  to="/plans"
                  data-testid="hero-secondary-cta"
                  className="inline-flex items-center gap-2 border border-white/30 hover:border-[#1E88FF] hover:text-[#1E88FF] text-white text-base font-semibold px-7 py-4 rounded-full transition-colors"
                >
                  Explore Plans
                  <ArrowRight size={18} />
                </Link>
              </div>

              <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl">
                {STATS.map((s) => (
                  <div key={s.label} className="border-l-2 border-[#1E88FF]/60 pl-4">
                    <div className="font-display text-2xl lg:text-3xl font-bold text-white">{s.value}</div>
                    <div className="text-xs tracking-widest uppercase text-slate-400 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 hidden lg:block">
              <div className="relative float-slow">
                <div className="absolute -inset-4 bg-[#1E88FF]/20 rounded-3xl blur-2xl" />
                <div className="relative bg-white/5 backdrop-blur-xl border border-white/15 rounded-3xl p-8">
                  <p className="text-xs tracking-[0.3em] text-[#1E88FF] font-semibold uppercase">Live network</p>
                  <p className="mt-3 font-display text-3xl font-bold text-white leading-tight">
                    99.95% uptime, measured every minute.
                  </p>
                  <div className="mt-6 space-y-3">
                    {["Throughput", "Latency", "Packet Loss"].map((m, i) => (
                      <div key={m}>
                        <div className="flex justify-between text-xs text-slate-300">
                          <span>{m}</span>
                          <span className="text-[#1E88FF] font-semibold">{["1.0 Gbps", "4 ms", "0.0%"][i]}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-[#1E88FF]" style={{ width: ["98%", "92%", "100%"][i] }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-7 pt-6 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] tracking-widest text-slate-400 uppercase">Edge node</p>
                      <p className="text-white font-semibold">Bhopal-01</p>
                    </div>
                    <div className="flex items-center gap-2 text-[#1E88FF] text-xs font-semibold">
                      <span className="h-2 w-2 rounded-full bg-[#1E88FF] animate-pulse" />
                      OPERATIONAL
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES SHORT */}
      <section className="container mx-auto px-6 lg:px-8 py-20 lg:py-28">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14">
          <div className="max-w-2xl">
            <span className="text-[#1E88FF] text-xs font-semibold tracking-[0.25em] uppercase">Our Services</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0A1A33] leading-tight">
              Built end-to-end for businesses that<br />refuse to go offline.
            </h2>
          </div>
          <Link
            to="/services"
            data-testid="home-services-link"
            className="text-[#1E88FF] font-semibold inline-flex items-center gap-2 hover:gap-3 transition-all"
          >
            All services <ArrowRight size={18} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                data-testid={`service-card-${s.title.toLowerCase().replace(/\s+/g, "-")}`}
                className="group bg-white border border-slate-200 rounded-2xl p-7 hover:border-[#1E88FF] hover:-translate-y-1 hover:shadow-xl hover:shadow-[#1E88FF]/10 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-[#1E88FF]/10 flex items-center justify-center group-hover:bg-[#1E88FF] transition-colors">
                  <Icon size={22} className="text-[#1E88FF] group-hover:text-white transition-colors" />
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold text-[#0A1A33]">{s.title}</h3>
                <p className="mt-2 text-slate-600 text-sm leading-relaxed">{s.summary}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* PLANS PREVIEW */}
      <section className="bg-[#F4F7FB] py-20 lg:py-28">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-[#1E88FF] text-xs font-semibold tracking-[0.25em] uppercase">Our Plans</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0A1A33] leading-tight">
              Pick the speed that matches your <span className="text-[#1E88FF]">ambition</span>.
            </h2>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PLANS.map((p) => (
              <div
                key={p.name}
                data-testid={`plan-card-${p.name.toLowerCase()}`}
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
                  data-testid={`plan-cta-${p.name.toLowerCase()}`}
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
        </div>
      </section>

      <CtaBanner />
    </div>
  );
}
