import { Link } from "react-router-dom";
import { Check, ArrowRight, Wifi, Zap, MapPin, Users } from "lucide-react";
import PageHeader from "../../components/PageHeader";
import CtaBanner from "../../components/CtaBanner";

const SERVICE_BG = "https://images.unsplash.com/photo-1551434678-e076c223a692?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwyfHxkYXNoYm9hcmQlMjB0ZWNofGVufDB8fHx8MTc4MDY0MjExMnww&ixlib=rb-4.1.0&q=85";

export default function WISPService() {
  const features = [
    { icon: Wifi, title: "Wireless Connectivity", desc: "High-speed internet without cables" },
    { icon: Zap, title: "Fast Deployment", desc: "Quick installation in remote areas" },
    { icon: MapPin, title: "Wide Coverage", desc: "Reach locations fiber can't" },
    { icon: Users, title: "Scalable", desc: "Easy to expand network coverage" },
  ];

  const packages = [
    {
      name: "Home WISP",
      speed: "Up to 50 Mbps",
      features: ["Unlimited data", "Shared bandwidth", "Standard support", "Basic equipment"],
      ideal: "Residential & home offices",
    },
    {
      name: "Business WISP",
      speed: "Up to 100 Mbps",
      features: ["Unlimited data", "Priority bandwidth", "24/7 support", "Professional equipment"],
      ideal: "Small businesses & offices",
      popular: true,
    },
    {
      name: "Enterprise WISP",
      speed: "Up to 200 Mbps",
      features: ["Dedicated bandwidth", "Multiple locations", "SLA guarantee", "Managed services"],
      ideal: "Multi-site enterprises",
    },
  ];

  const advantages = [
    "No underground cabling required",
    "Quick installation (1-3 days)",
    "Cost-effective for remote locations",
    "Easy to relocate",
    "Lower infrastructure costs",
    "Scalable coverage area",
  ];

  return (
    <div>
      <PageHeader
        eyebrow="WISP Service"
        title="Wireless connectivity"
        accent="without boundaries"
        subtitle="High-speed internet delivered wirelessly to locations where fiber infrastructure is unavailable or impractical. Perfect for remote areas and rapid deployments."
        backgroundImage={SERVICE_BG}
      />

      {/* Service Overview */}
      <section className="container mx-auto px-6 lg:px-8 py-20">
        <div className="max-w-4xl">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-[#0A1A33] mb-6">
            What is WISP (Wireless Internet Service Provider)?
          </h2>
          <div className="prose prose-lg text-slate-700 space-y-4">
            <p>
              WISP technology delivers high-speed internet connectivity using wireless transmission instead of 
              traditional fiber optic or copper cables. This makes it ideal for areas where laying physical 
              infrastructure is challenging or cost-prohibitive.
            </p>
            <p>
              Insight Networks' WISP solution uses enterprise-grade Ubiquiti and MikroTik equipment to provide 
              reliable, high-performance wireless connectivity across Bhopal and surrounding regions.
            </p>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="bg-[#F4F7FB] py-20">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-[#0A1A33]">
              WISP Advantages
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
            WISP Packages
          </h2>
          <p className="text-slate-600 mt-4">Flexible wireless plans for every need</p>
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
                  RECOMMENDED
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

      {/* Benefits */}
      <section className="bg-gradient-to-br from-[#0A1A33] to-[#0F2847] text-white py-20">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-center mb-4">
              Why Choose Wireless?
            </h2>
            <p className="text-center text-slate-300 mb-12">
              WISP technology offers unique advantages for specific scenarios
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {advantages.map((advantage) => (
                <div
                  key={advantage}
                  className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20"
                >
                  <Check className="text-[#1E88FF] shrink-0" size={20} />
                  <span className="font-medium">{advantage}</span>
                </div>
              ))}
            </div>
            <div className="text-center mt-12">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 bg-[#1E88FF] hover:bg-[#156cd1] text-white font-semibold px-8 py-4 rounded-full transition-colors"
              >
                Check Coverage in Your Area
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
