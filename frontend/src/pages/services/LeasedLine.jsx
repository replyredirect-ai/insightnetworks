import { Link } from "react-router-dom";
import { Check, ArrowRight, Zap, Shield, Clock, TrendingUp } from "lucide-react";
import PageHeader from "../components/PageHeader";
import CtaBanner from "../components/CtaBanner";

const SERVICE_BG = "https://images.unsplash.com/photo-1604869515882-4d10fa4b0492?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzF8MHwxfHNlYXJjaHwxfHxmaWJlciUyMG9wdGljc3xlbnwwfHx8fDE3ODA2NDIxMTJ8MA&ixlib=rb-4.1.0&q=85";

export default function LeasedLineService() {
  const features = [
    { icon: Zap, title: "Dedicated Bandwidth", desc: "100% guaranteed speeds with no contention" },
    { icon: Shield, title: "99.9% Uptime SLA", desc: "Enterprise-grade reliability guarantee" },
    { icon: Clock, title: "24/7 Support", desc: "Round-the-clock technical assistance" },
    { icon: TrendingUp, title: "Scalable", desc: "Easy bandwidth upgrades as you grow" },
  ];

  const packages = [
    {
      name: "Business",
      speed: "10-50 Mbps",
      features: ["Dedicated 1:1 bandwidth", "Static IP included", "24/7 support", "99.9% uptime SLA"],
      ideal: "Small to medium businesses",
    },
    {
      name: "Enterprise",
      speed: "100-500 Mbps",
      features: ["Dedicated 1:1 bandwidth", "Multiple static IPs", "Priority support", "Custom routing"],
      ideal: "Large enterprises & data centers",
      popular: true,
    },
    {
      name: "Corporate",
      speed: "1 Gbps+",
      features: ["Dedicated 1:1 bandwidth", "Redundant connectivity", "Managed services", "SLA guarantee"],
      ideal: "Mission-critical operations",
    },
  ];

  const useCases = [
    "Banks & Financial Institutions",
    "Healthcare & Hospitals",
    "Educational Institutions",
    "IT Companies & Data Centers",
    "Government Offices",
    "Manufacturing Units",
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Internet Leased Line"
        title="Dedicated fiber connectivity"
        accent="for your enterprise"
        subtitle="Get guaranteed bandwidth with symmetric upload/download speeds and 99.9% uptime SLA. Perfect for businesses that can't afford downtime."
        backgroundImage={SERVICE_BG}
      />

      {/* Service Overview */}
      <section className="container mx-auto px-6 lg:px-8 py-20">
        <div className="max-w-4xl">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-[#0A1A33] mb-6">
            What is an Internet Leased Line?
          </h2>
          <div className="prose prose-lg text-slate-700 space-y-4">
            <p>
              An Internet Leased Line (ILL) is a premium internet connectivity solution that provides dedicated, 
              uncontended bandwidth directly to your business premises. Unlike shared broadband connections, 
              leased lines offer symmetric speeds (equal upload and download) with guaranteed performance 24/7.
            </p>
            <p>
              Insight Networks delivers enterprise-grade fiber optic leased lines with industry-leading SLAs, 
              backed by our 24/7 Network Operations Center and expert technical team.
            </p>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="bg-[#F4F7FB] py-20">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-[#0A1A33]">
              Enterprise Features
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {features.map((feature) => (
              <div key={feature.title} className="bg-white rounded-2xl p-6 border-2 border-slate-200 hover:border-[#1E88FF] transition-all">
                <div className="w-12 h-12 rounded-xl bg-[#1E88FF]/10 flex items-center justify-center mb-4">
                  <feature.icon className="text-[#1E88FF]" size={24} />
                </div>
                <h3 className="font-display text-lg font-bold text-[#0A1A33] mb-2">{feature.title}</h3>
                <p className="text-slate-600 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="container mx-auto px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-[#0A1A33]">
            Leased Line Packages
          </h2>
          <p className="text-slate-600 mt-4">Choose the bandwidth that matches your business needs</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {packages.map((pkg) => (
            <div
              key={pkg.name}
              className={`rounded-2xl p-8 border-2 ${
                pkg.popular
                  ? "border-[#1E88FF] bg-gradient-to-br from-blue-50 to-white shadow-xl"
                  : "border-slate-200 bg-white"
              }`}
            >
              {pkg.popular && (
                <div className="inline-block bg-[#1E88FF] text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
                  MOST POPULAR
                </div>
              )}
              <h3 className="font-display text-2xl font-bold text-[#0A1A33]">{pkg.name}</h3>
              <div className="text-3xl font-bold text-[#1E88FF] my-4">{pkg.speed}</div>
              <p className="text-sm text-slate-600 mb-6">Ideal for: {pkg.ideal}</p>
              <ul className="space-y-3 mb-8">
                {pkg.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="text-[#1E88FF] shrink-0 mt-0.5" size={18} />
                    <span className="text-sm text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/contact"
                className="block w-full text-center bg-[#0A1A33] hover:bg-[#1E88FF] text-white font-semibold py-3 rounded-full transition-colors"
              >
                Get Quote
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-gradient-to-br from-[#0A1A33] to-[#0F2847] text-white py-20">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-center mb-12">
              Perfect For
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {useCases.map((useCase) => (
                <div
                  key={useCase}
                  className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20"
                >
                  <Check className="text-[#1E88FF] shrink-0" size={20} />
                  <span className="font-medium">{useCase}</span>
                </div>
              ))}
            </div>
            <div className="text-center mt-12">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 bg-[#1E88FF] hover:bg-[#156cd1] text-white font-semibold px-8 py-4 rounded-full transition-colors"
              >
                Request Consultation
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <CtaBanner />
    </div>
  );
}
