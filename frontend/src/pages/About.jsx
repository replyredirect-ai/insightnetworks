import PageHeader from "../components/PageHeader";
import CtaBanner from "../components/CtaBanner";
import { VALUES, STATS } from "../data/site";

const TEAM_IMG = "https://customer-assets.emergentagent.com/job_repo-editor-12/artifacts/ho8dvx1m_ChatGPT%20Image%20Jun%2020%2C%202026%2C%2012_29_41%20PM.png";
const CITY_IMG = "https://images.unsplash.com/photo-1724243040324-aa945e452d8b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzR8MHwxfHNlYXJjaHwyfHxtb2Rlcm4lMjBjaXR5JTIwc2t5bGluZXxlbnwwfHx8fDE3ODA1NjQ2MzB8MA&ixlib=rb-4.1.0&q=85";
const ABOUT_BG = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzF8MHwxfHNlYXJjaHwyfHxvZmZpY2UlMjB0ZWFtd29ya3xlbnwwfHx8fDE3ODA2NDIxMTJ8MA&ixlib=rb-4.1.0&q=85";

export default function About() {
  return (
    <div data-testid="about-page">
      <PageHeader
        eyebrow="About Us"
        title="A Bhopal-born network company"
        accent="powering tomorrow."
        subtitle="Insight Networks is built by engineers who grew up watching the internet transform their city. We exist to give every Indian business a connection it can bet its future on."
        backgroundImage={ABOUT_BG}
      />

      <section className="container mx-auto px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div className="relative">
            <div className="absolute -inset-4 bg-[#1E88FF]/15 rounded-3xl blur-2xl" />
            <img
              src={TEAM_IMG}
              alt="Insight Networks team"
              className="relative rounded-2xl w-full h-[460px] object-cover border border-slate-200"
            />
          </div>
          <div>
            <span className="text-[#1E88FF] text-xs font-semibold tracking-[0.25em] uppercase">Our Story</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-[#0A1A33] leading-tight">
              Born in Bhopal. Built for businesses everywhere.
            </h2>
            <p className="mt-5 text-slate-600 leading-relaxed">
              We started Insight Networks with one simple belief: a great business deserves a great network. Today we run leased lines, fibre rings, security stacks and cloud links for hundreds of organisations across Madhya Pradesh — and we do it with a local engineer always within reach.
            </p>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Our customers stay because we obsess over the small things: the patch cable colour, the OTDR trace, the failover drill, the after-midnight call. That obsession is what turns a wire into a network you can trust.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-[#F4F7FB] py-20 lg:py-28">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="text-[#1E88FF] text-xs font-semibold tracking-[0.25em] uppercase">What we stand for</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-[#0A1A33] leading-tight">
              Three principles that shape every decision.
            </h2>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="bg-white border border-slate-200 rounded-2xl p-7 hover:border-[#1E88FF] transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-[#1E88FF]/10 flex items-center justify-center">
                    <Icon size={22} className="text-[#1E88FF]" />
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold text-[#0A1A33]">{v.title}</h3>
                  <p className="mt-2 text-slate-600 text-sm leading-relaxed">{v.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Numbers */}
      <section className="relative bg-[#0A1A33] text-white overflow-hidden">
        <img src={CITY_IMG} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A1A33] via-[#0A1A33]/90 to-transparent" />
        <div className="container mx-auto px-6 lg:px-8 relative py-20 lg:py-28">
          <div className="max-w-2xl mb-12">
            <span className="text-[#1E88FF] text-xs font-semibold tracking-[0.25em] uppercase">By the numbers</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold leading-tight">
              The network speaks for itself.
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="border-l-2 border-[#1E88FF] pl-5">
                  <Icon size={22} className="text-[#1E88FF] mb-3" />
                  <div className="font-display text-3xl lg:text-4xl font-bold">{s.value}</div>
                  <div className="text-xs tracking-widest uppercase text-slate-400 mt-2">{s.label}</div>
                  <p className="mt-3 text-sm text-slate-300 leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TECHNOLOGY PARTNERS */}
      <section className="container mx-auto px-6 lg:px-8 py-20 lg:py-28">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-[#1E88FF] text-xs font-semibold tracking-[0.25em] uppercase">Technology Partners</span>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0A1A33] leading-tight">
            Powered by industry leaders
          </h2>
          <p className="mt-4 text-slate-600">
            We partner with the world's leading technology providers to deliver enterprise-grade solutions
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 max-w-6xl mx-auto">
          {[
            { name: "MikroTik", badge: "Certified", color: "bg-gradient-to-br from-red-600 to-red-700" },
            { name: "Cisco", badge: "Partner", color: "bg-gradient-to-br from-blue-600 to-blue-700" },
            { name: "Juniper", badge: "Networks", color: "bg-gradient-to-br from-green-600 to-emerald-700" },
            { name: "Ubiquiti", badge: "Elite", color: "bg-gradient-to-br from-slate-700 to-slate-800" },
            { name: "GPON", badge: "Technology", color: "bg-gradient-to-br from-amber-500 to-orange-600" },
            { name: "IPv6", badge: "Ready", color: "bg-gradient-to-br from-purple-600 to-purple-700" }
          ].map((tech) => (
            <div
              key={tech.name}
              className={`${tech.color} text-white rounded-2xl p-6 text-center hover:scale-105 hover:shadow-2xl transition-all group relative overflow-hidden`}
            >
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all" />
              <div className="relative">
                <div className="font-display text-2xl font-bold mb-2">
                  {tech.name}
                </div>
                <div className="text-xs font-semibold tracking-wider uppercase opacity-90">
                  {tech.badge}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <a
            href="/technology-partners"
            className="inline-flex items-center gap-2 text-[#1E88FF] hover:text-[#156cd1] font-semibold transition-colors"
          >
            View All Technology Partners
            <span className="text-xl">→</span>
          </a>
        </div>
      </section>

      <CtaBanner />
    </div>
  );
}
