import { Link } from "react-router-dom";
import { ArrowRight, CreditCard, Activity, Headphones, User, FileText, Shield, Users } from "lucide-react";
import PageHeader from "../components/PageHeader";
import CtaBanner from "../components/CtaBanner";

const PORTAL_BG = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NDh8MHwxfHNlYXJjaHwxfHxkYXNoYm9hcmQlMjBhbmFseXRpY3N8ZW58MHx8fHwxNzgyMjQyMTg1fDA&ixlib=rb-4.1.0&q=85";

const PORTAL_FEATURES = [
  {
    icon: CreditCard,
    title: "Online Bill Payment",
    description: "Pay your bills securely online with multiple payment options. View payment history and download invoices.",
  },
  {
    icon: Activity,
    title: "Data Usage Monitoring",
    description: "Track your internet usage in real-time. Monitor bandwidth consumption and set usage alerts.",
  },
  {
    icon: Headphones,
    title: "Support Ticket Management",
    description: "Raise support tickets, track their status, and communicate directly with our technical team.",
  },
  {
    icon: User,
    title: "Account Information",
    description: "View and update your account details, contact information, and service preferences.",
  },
  {
    icon: FileText,
    title: "Service Requests",
    description: "Request plan changes, additional services, or connection modifications directly through the portal.",
  },
  {
    icon: Shield,
    title: "Secure Access",
    description: "Your data is protected with enterprise-grade security. All transactions are encrypted and secure.",
  },
];

export default function Dashboard() {
  return (
    <div data-testid="dashboard-page">
      <PageHeader
        eyebrow="Dashboard"
        title="Manage your account"
        accent="anytime, anywhere."
        subtitle="Access your account, monitor usage, pay bills, and manage support tickets through our secure dashboard portal."
        backgroundImage={PORTAL_BG}
      />

      {/* Portal Access Cards */}
      <section className="container mx-auto px-6 lg:px-8 py-20 lg:py-28">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-[#1E88FF] text-xs font-semibold tracking-[0.25em] uppercase">Portal Access</span>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0A1A33] leading-tight">
            Choose your dashboard
          </h2>
          <p className="mt-4 text-slate-600">
            Select the appropriate dashboard to access your account and manage your services.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Admin Dashboard Card - LEFT SIDE */}
          <div 
            className="group relative bg-gradient-to-br from-[#0A1A33] to-[#0F2847] text-white border-2 border-[#1E88FF] rounded-3xl p-10 hover:shadow-2xl hover:shadow-[#1E88FF]/30 transition-all duration-300"
            data-testid="admin-dashboard-card"
          >
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#1E88FF]/20 rounded-full blur-2xl group-hover:bg-[#1E88FF]/30 transition-all" />
            
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-[#1E88FF]/20 flex items-center justify-center group-hover:bg-[#1E88FF] transition-colors mb-6">
                <Shield size={32} className="text-[#1E88FF] group-hover:text-white transition-colors" />
              </div>
              
              <h3 className="font-display text-2xl font-bold mb-3">
                Admin Dashboard
              </h3>
              
              <p className="text-slate-300 leading-relaxed mb-6">
                Comprehensive admin dashboard for subscriber management, billing operations, CRM, and system configuration.
              </p>

              <ul className="space-y-2 mb-8">
                <li className="flex items-center gap-2 text-sm text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1E88FF]" />
                  Subscriber management & provisioning
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1E88FF]" />
                  Billing & payment processing
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1E88FF]" />
                  CRM & support ticket handling
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1E88FF]" />
                  System configuration & reports
                </li>
              </ul>

              <Link
                to="/admin-login"
                data-testid="admin-login-button"
                className="w-full btn-shine inline-flex items-center justify-center gap-2 bg-[#1E88FF] hover:bg-[#156cd1] text-white font-semibold px-6 py-4 rounded-full transition-colors group-hover:scale-105 transform duration-300"
              >
                Login to Admin Dashboard
                <ArrowRight size={18} />
              </Link>

              <p className="mt-4 text-xs text-slate-400 text-center">
                Admin access requires authorized credentials
              </p>
            </div>
          </div>

          {/* Subscriber Dashboard Card - RIGHT SIDE */}
          <div 
            className="group relative bg-white border-2 border-slate-200 rounded-3xl p-10 hover:border-[#1E88FF] hover:shadow-2xl hover:shadow-[#1E88FF]/20 transition-all duration-300"
            data-testid="subscriber-dashboard-card"
          >
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#1E88FF]/10 rounded-full blur-2xl group-hover:bg-[#1E88FF]/20 transition-all" />
            
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-[#1E88FF]/10 flex items-center justify-center group-hover:bg-[#1E88FF] transition-colors mb-6">
                <Users size={32} className="text-[#1E88FF] group-hover:text-white transition-colors" />
              </div>
              
              <h3 className="font-display text-2xl font-bold text-[#0A1A33] mb-3">
                Subscriber Dashboard
              </h3>
              
              <p className="text-slate-600 leading-relaxed mb-6">
                Access your account dashboard, view bills, monitor data usage, manage support tickets, and update your profile.
              </p>

              <ul className="space-y-2 mb-8">
                <li className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1E88FF]" />
                  Bill payment & invoice download
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1E88FF]" />
                  Real-time usage monitoring
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1E88FF]" />
                  Support ticket management
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1E88FF]" />
                  Service request submission
                </li>
              </ul>

              <Link
                to="/subscriber-login"
                data-testid="subscriber-login-button"
                className="w-full btn-shine inline-flex items-center justify-center gap-2 bg-[#1E88FF] hover:bg-[#156cd1] text-white font-semibold px-6 py-4 rounded-full transition-colors group-hover:scale-105 transform duration-300"
              >
                Login to Subscriber Dashboard
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>

        {/* Portal Info */}
        <div className="mt-12 max-w-2xl mx-auto text-center">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
            <p className="text-sm text-slate-600">
              <strong className="text-[#0A1A33]">Secure Portal:</strong> Your connection to the dashboard is encrypted and secure. 
              All portal functions are powered by Insight Networks, maintaining your existing credentials and account data.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-[#F4F7FB] py-20 lg:py-28">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[#1E88FF] text-xs font-semibold tracking-[0.25em] uppercase">Portal Features</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0A1A33] leading-tight">
              Everything you need to manage your account
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PORTAL_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  data-testid={`feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
                  className="bg-white border border-slate-200 rounded-2xl p-7 hover:border-[#1E88FF] hover:shadow-lg transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#1E88FF]/10 flex items-center justify-center mb-5">
                    <Icon size={22} className="text-[#1E88FF]" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-[#0A1A33] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Help Section */}
      <section className="container mx-auto px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-br from-[#0A1A33] to-[#0F2847] rounded-3xl p-12 text-center text-white">
          <h3 className="font-display text-3xl font-bold mb-4">
            Need help accessing the portal?
          </h3>
          <p className="text-slate-300 max-w-2xl mx-auto mb-8">
            If you're having trouble logging in or need assistance with the portal, our support team is here to help 24/7.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/contact"
              className="inline-flex items-center justify-center gap-2 bg-[#1E88FF] hover:bg-[#156cd1] text-white font-semibold px-8 py-4 rounded-full transition-colors"
            >
              <Headphones size={20} />
              Contact Support
            </a>
            <a
              href="tel:+919302452424"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/30 hover:border-white hover:bg-white/10 text-white font-semibold px-8 py-4 rounded-full transition-colors"
            >
              Call +91 93024 52424
            </a>
          </div>
        </div>
      </section>

      <CtaBanner />
    </div>
  );
}
