import { Link } from "react-router-dom";
import { Check, ArrowRight, GraduationCap, Building2, Factory, ShoppingBag, Landmark, Banknote, Briefcase } from "lucide-react";
import PageHeader from "../components/PageHeader";
import CtaBanner from "../components/CtaBanner";

const INDUSTRIES_BG = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMGdyb3d0aHxlbnwwfHx8fDE3ODA2NDIxMTJ8MA&ixlib=rb-4.1.0&q=85";

const industries = [
  {
    name: "Education",
    icon: GraduationCap,
    color: "from-blue-500 to-blue-600",
    description: "Empowering educational institutions with reliable, high-speed connectivity for modern learning environments.",
    challenges: [
      "High bandwidth demand for online classes",
      "Multiple campuses connectivity",
      "Secure student & faculty networks",
      "E-learning platform hosting"
    ],
    solutions: [
      "Dedicated leased lines with guaranteed bandwidth",
      "Campus-wide WiFi deployment",
      "Content filtering and security",
      "24/7 technical support during academic sessions"
    ],
    clients: "Schools • Colleges • Universities • E-learning Platforms"
  },
  {
    name: "Healthcare & Hospitals",
    icon: Building2,
    color: "from-red-500 to-red-600",
    description: "Mission-critical connectivity for healthcare providers with 99.9% uptime guarantee and HIPAA-compliant solutions.",
    challenges: [
      "Zero downtime requirements",
      "Secure patient data transmission",
      "Real-time medical imaging",
      "Telemedicine infrastructure"
    ],
    solutions: [
      "Redundant fiber optic connections",
      "Secure VPN for patient data",
      "Priority technical support",
      "HIPAA-compliant network design"
    ],
    clients: "Hospitals • Clinics • Diagnostic Centers • Telemedicine Providers"
  },
  {
    name: "Manufacturing",
    icon: Factory,
    color: "from-orange-500 to-orange-600",
    description: "Robust industrial networking solutions for smart factories and automated production facilities.",
    challenges: [
      "Industrial IoT connectivity",
      "Real-time monitoring systems",
      "Supply chain integration",
      "Multi-site coordination"
    ],
    solutions: [
      "Industrial-grade network equipment",
      "Low-latency dedicated connections",
      "Redundant backup circuits",
      "Integration with ERP systems"
    ],
    clients: "Manufacturing Plants • Warehouses • Distribution Centers • Industrial Parks"
  },
  {
    name: "Retail Chains",
    icon: ShoppingBag,
    color: "from-green-500 to-green-600",
    description: "Seamless connectivity for retail operations, enabling real-time inventory and omnichannel experiences.",
    challenges: [
      "POS system reliability",
      "Multi-location connectivity",
      "Real-time inventory sync",
      "Customer WiFi services"
    ],
    solutions: [
      "SD-WAN for multi-site connectivity",
      "Secure payment gateway connections",
      "Guest WiFi with captive portal",
      "Cloud POS integration"
    ],
    clients: "Retail Stores • Shopping Malls • Restaurant Chains • E-commerce Warehouses"
  },
  {
    name: "Government",
    icon: Landmark,
    color: "from-purple-500 to-purple-600",
    description: "Secure, reliable connectivity for government offices with compliance to national security standards.",
    challenges: [
      "High security requirements",
      "Inter-department connectivity",
      "Public service portals",
      "Data sovereignty compliance"
    ],
    solutions: [
      "Government-grade encryption",
      "Dedicated dark fiber networks",
      "Compliance with IT Act & CERT-In",
      "Disaster recovery solutions"
    ],
    clients: "Municipal Offices • State Departments • Smart City Projects • Public Services"
  },
  {
    name: "Banking & Finance",
    icon: Banknote,
    color: "from-emerald-500 to-emerald-600",
    description: "Ultra-secure financial-grade connectivity with transaction-level encryption and real-time monitoring.",
    challenges: [
      "Transaction security",
      "Core banking connectivity",
      "ATM network management",
      "Regulatory compliance"
    ],
    solutions: [
      "Bank-grade security protocols",
      "MPLS networks for branches",
      "Redundant backup circuits",
      "RBI & PCI-DSS compliance"
    ],
    clients: "Banks • NBFCs • Insurance Companies • Stock Brokerages • FinTech Startups"
  },
  {
    name: "IT Companies & Tech Parks",
    icon: Briefcase,
    color: "from-cyan-500 to-cyan-600",
    description: "High-performance connectivity for software development, cloud services, and technology enterprises.",
    challenges: [
      "Ultra-high bandwidth needs",
      "Low latency requirements",
      "Cloud infrastructure access",
      "Work-from-home VPN"
    ],
    solutions: [
      "1 Gbps+ dedicated circuits",
      "Direct cloud connectivity",
      "IPv6 ready infrastructure",
      "Managed SD-WAN services"
    ],
    clients: "IT Companies • Tech Parks • BPOs • Software Development Centers • Startups"
  }
];

export default function Industries() {
  return (
    <div>
      <PageHeader
        eyebrow="Industries We Serve"
        title="Powering India's"
        accent="leading sectors"
        subtitle="Trusted by organizations across industries for mission-critical connectivity solutions tailored to their unique requirements."
        backgroundImage={INDUSTRIES_BG}
      />

      {/* Overview */}
      <section className="container mx-auto px-6 lg:px-8 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-[#0A1A33] mb-6">
            Industry-Specific Solutions
          </h2>
          <p className="text-lg text-slate-700 leading-relaxed">
            Every industry has unique connectivity challenges. With over a decade of experience serving 
            diverse sectors, we understand your specific needs and deliver customized networking solutions 
            that ensure your operations never miss a beat.
          </p>
        </div>
      </section>

      {/* Industries */}
      {industries.map((industry, index) => (
        <section
          key={industry.name}
          id={industry.name.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "")}
          className={`py-20 ${index % 2 === 0 ? 'bg-white' : 'bg-[#F4F7FB]'}`}
        >
          <div className="container mx-auto px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                {/* Icon & Title */}
                <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${industry.color} flex items-center justify-center mb-6`}>
                    <industry.icon className="text-white" size={36} />
                  </div>
                  <h3 className="font-display text-3xl font-bold text-[#0A1A33] mb-4">
                    {industry.name}
                  </h3>
                  <p className="text-lg text-slate-700 mb-6 leading-relaxed">
                    {industry.description}
                  </p>
                  <p className="text-sm text-slate-600 font-semibold mb-6">
                    {industry.clients}
                  </p>
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 bg-[#1E88FF] hover:bg-[#156cd1] text-white font-semibold px-6 py-3 rounded-full transition-colors"
                  >
                    Get Industry Solution
                    <ArrowRight size={16} />
                  </Link>
                </div>

                {/* Challenges & Solutions */}
                <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                  <div className="space-y-6">
                    {/* Challenges */}
                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
                      <h4 className="font-display text-lg font-bold text-[#0A1A33] mb-4">
                        Industry Challenges
                      </h4>
                      <div className="space-y-2">
                        {industry.challenges.map((challenge) => (
                          <div key={challenge} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                            <span className="text-sm text-slate-700">{challenge}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Solutions */}
                    <div className={`bg-gradient-to-br ${industry.color} text-white rounded-2xl p-6`}>
                      <h4 className="font-display text-lg font-bold mb-4">
                        Our Solutions
                      </h4>
                      <div className="space-y-2">
                        {industry.solutions.map((solution) => (
                          <div key={solution} className="flex items-start gap-2">
                            <Check className="shrink-0 mt-0.5" size={18} />
                            <span className="text-sm">{solution}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="bg-gradient-to-br from-[#0A1A33] to-[#0F2847] text-white py-20">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display text-3xl lg:text-4xl font-bold mb-6">
              Ready to Transform Your Connectivity?
            </h2>
            <p className="text-lg text-slate-300 mb-8">
              Let our industry experts design a customized solution for your organization.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 bg-[#1E88FF] hover:bg-[#156cd1] text-white font-semibold px-8 py-4 rounded-full transition-colors"
            >
              Request Consultation
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <CtaBanner />
    </div>
  );
}
