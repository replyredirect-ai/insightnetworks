import { Link } from "react-router-dom";
import { Check, ArrowRight, Award, Shield, Zap } from "lucide-react";
import PageHeader from "../components/PageHeader";
import CtaBanner from "../components/CtaBanner";

const TECH_BG = "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjV8MHwxfHNlYXJjaHwyfHxkYXRhJTIwY2VudGVyJTIwdGVjaG5vbG9neXxlbnwwfHx8fDE3ODIyMjc0MTl8MA&ixlib=rb-4.1.0&q=85";

const partners = [
  {
    name: "MikroTik",
    logo: "🔴",
    color: "from-red-500 to-red-600",
    certification: "Certified Partner",
    description: "Industry-leading routing, switching, and wireless solutions for enterprise networks.",
    features: [
      "Advanced routing protocols (OSPF, BGP)",
      "High-performance switches",
      "Wireless access points",
      "Network security appliances"
    ]
  },
  {
    name: "Cisco",
    logo: "🔵",
    color: "from-blue-600 to-blue-700",
    certification: "Technology Partner",
    description: "World's leading enterprise networking equipment and solutions provider.",
    features: [
      "Enterprise-grade routers & switches",
      "Network security solutions",
      "Data center infrastructure",
      "SD-WAN technology"
    ]
  },
  {
    name: "Juniper Networks",
    logo: "🟢",
    color: "from-green-600 to-green-700",
    certification: "Authorized Partner",
    description: "High-performance networking solutions for service providers and enterprises.",
    features: [
      "Core routing platforms",
      "Security solutions",
      "Data center switching",
      "Network automation"
    ]
  },
  {
    name: "Ubiquiti",
    logo: "⚪",
    color: "from-slate-600 to-slate-700",
    certification: "Elite Partner",
    description: "Innovative wireless and networking products for businesses of all sizes.",
    features: [
      "UniFi wireless systems",
      "Point-to-point links",
      "Surveillance solutions",
      "Network management platforms"
    ]
  },
  {
    name: "GPON Technology",
    logo: "🟡",
    color: "from-amber-500 to-amber-600",
    certification: "Certified",
    description: "Gigabit Passive Optical Network technology for fiber-to-the-home deployments.",
    features: [
      "High-speed fiber connectivity",
      "Cost-effective deployment",
      "Long-distance coverage",
      "Scalable architecture"
    ]
  },
  {
    name: "IPv6",
    logo: "🟣",
    color: "from-purple-600 to-purple-700",
    certification: "Ready & Compliant",
    description: "Next-generation internet protocol supporting unlimited addressing and modern applications.",
    features: [
      "Future-proof infrastructure",
      "Enhanced security features",
      "Improved routing efficiency",
      "IoT device support"
    ]
  }
];

export default function TechnologyPartners() {
  return (
    <div>
      <PageHeader
        eyebrow="Technology Partners"
        title="Powered by industry"
        accent="leaders"
        subtitle="We partner with the world's leading technology providers to deliver enterprise-grade networking solutions backed by global standards and certifications."
        backgroundImage={TECH_BG}
      />

      {/* Why Partners Matter */}
      <section className="container mx-auto px-6 lg:px-8 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-[#0A1A33] mb-6">
            Enterprise-Grade Technology Stack
          </h2>
          <p className="text-lg text-slate-700 leading-relaxed">
            At Insight Networks, we don't compromise on quality. Every piece of equipment in our network is 
            carefully selected from industry-leading manufacturers, ensuring maximum reliability, performance, 
            and support for your mission-critical operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12">
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#1E88FF]/10 flex items-center justify-center mx-auto mb-4">
              <Award className="text-[#1E88FF]" size={24} />
            </div>
            <h3 className="font-display text-lg font-bold text-[#0A1A33] mb-2">Certified Expertise</h3>
            <p className="text-sm text-slate-600">Official partnerships and certified engineers</p>
          </div>
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#1E88FF]/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="text-[#1E88FF]" size={24} />
            </div>
            <h3 className="font-display text-lg font-bold text-[#0A1A33] mb-2">Proven Reliability</h3>
            <p className="text-sm text-slate-600">Industry-tested solutions with global support</p>
          </div>
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#1E88FF]/10 flex items-center justify-center mx-auto mb-4">
              <Zap className="text-[#1E88FF]" size={24} />
            </div>
            <h3 className="font-display text-lg font-bold text-[#0A1A33] mb-2">Latest Technology</h3>
            <p className="text-sm text-slate-600">Access to cutting-edge networking innovations</p>
          </div>
        </div>
      </section>

      {/* Partners Grid */}
      <section className="bg-[#F4F7FB] py-20">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-[#0A1A33]">
              Our Technology Partners
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {partners.map((partner) => (
              <div
                key={partner.name}
                className="bg-white rounded-2xl p-8 border-2 border-slate-200 hover:border-[#1E88FF] hover:shadow-xl transition-all group"
              >
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${partner.color} flex items-center justify-center mb-6 text-4xl group-hover:scale-110 transition-transform`}>
                  {partner.logo}
                </div>
                
                <div className="mb-4">
                  <h3 className="font-display text-2xl font-bold text-[#0A1A33] mb-2">
                    {partner.name}
                  </h3>
                  <span className="inline-block px-3 py-1 bg-[#1E88FF]/10 text-[#1E88FF] text-xs font-bold rounded-full">
                    {partner.certification}
                  </span>
                </div>

                <p className="text-slate-700 mb-6 leading-relaxed">
                  {partner.description}
                </p>

                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-[#0A1A33] mb-3">Key Capabilities:</h4>
                  {partner.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <Check className="text-[#1E88FF] shrink-0 mt-0.5" size={16} />
                      <span className="text-sm text-slate-600">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-[#0A1A33] to-[#0F2847] text-white py-20">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display text-3xl lg:text-4xl font-bold mb-6">
              Experience Enterprise Technology
            </h2>
            <p className="text-lg text-slate-300 mb-8">
              Let our certified engineers design a solution using world-class equipment 
              tailored to your business needs.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 bg-[#1E88FF] hover:bg-[#156cd1] text-white font-semibold px-8 py-4 rounded-full transition-colors"
            >
              Schedule Consultation
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <CtaBanner />
    </div>
  );
}
