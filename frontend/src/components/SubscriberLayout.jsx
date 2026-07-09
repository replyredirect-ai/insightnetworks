import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, CreditCard, LifeBuoy, User, LogOut,
} from "lucide-react";
import PageHeader from "./PageHeader";
import xceednetApi from "../services/xceednetApi";

const BANNER_BG =
  "https://images.unsplash.com/photo-1520869562399-e772f042f422?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHRlY2hub2xvZ3klMjBkYXNoYm9hcmR8ZW58MHx8fGJsdWV8MTc4MjMxOTM4Nnww&ixlib=rb-4.1.0&q=85";

const TABS = [
  { to: "/subscriber-dashboard", label: "Account Overview", icon: LayoutDashboard, end: true, testid: "tab-overview" },
  { to: "/subscriber-dashboard/invoices", label: "Invoices", icon: FileText, testid: "tab-invoices" },
  { to: "/subscriber-dashboard/payments", label: "Payments", icon: CreditCard, testid: "tab-payments" },
  { to: "/subscriber-dashboard/tickets", label: "Support Tickets", icon: LifeBuoy, testid: "tab-tickets" },
  { to: "/subscriber-dashboard/profile", label: "Profile & Password", icon: User, testid: "tab-profile" },
];

const HEADERS = {
  "/subscriber-dashboard": {
    eyebrow: "SUBSCRIBER DASHBOARD",
    title: "Your Account,",
    accent: "One View.",
    subtitle:
      "Track your usage, download invoices, manage payments and raise support tickets — everything in one secure place.",
  },
  "/subscriber-dashboard/invoices": {
    eyebrow: "BILLING",
    title: "Invoices &",
    accent: "Downloads",
    subtitle:
      "View every tax invoice from your Insight Networks account and download a professional PDF copy any time.",
  },
  "/subscriber-dashboard/payments": {
    eyebrow: "TRANSACTIONS",
    title: "Payment",
    accent: "History",
    subtitle: "A complete record of every recharge and payment made against your account.",
  },
  "/subscriber-dashboard/tickets": {
    eyebrow: "CUSTOMER SUPPORT",
    title: "Get Help,",
    accent: "Fast.",
    subtitle: "Raise a support ticket and our team will get back to you shortly.",
  },
  "/subscriber-dashboard/profile": {
    eyebrow: "MY ACCOUNT",
    title: "Profile &",
    accent: "Security",
    subtitle:
      "Update your contact details and change your account password to keep your account secure.",
  },
};

export default function SubscriberLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!xceednetApi.isAuthenticated() || xceednetApi.getUserType() !== "subscriber") {
      navigate("/subscriber-login");
      return;
    }
    xceednetApi.getSubscriberProfile()
      .then((r) => setProfile(r?.data || null))
      .catch(() => setProfile(null));
  }, [navigate]);

  const activeHeader = useMemo(() => {
    // Match longest-prefix from HEADERS keys
    const pathname = location.pathname.replace(/\/$/, "");
    // Exact match first, then longest prefix
    if (HEADERS[pathname]) return HEADERS[pathname];
    const keys = Object.keys(HEADERS).sort((a, b) => b.length - a.length);
    for (const k of keys) {
      if (pathname.startsWith(k)) return HEADERS[k];
    }
    return HEADERS["/subscriber-dashboard"];
  }, [location.pathname]);

  const handleLogout = () => {
    xceednetApi.clearAuth();
    navigate("/");
  };

  const displayName = profile?.name || profile?.username || "Subscriber";
  const accountNo = profile?.account_no;
  const isOnline = !!profile?.is_online;

  return (
    <div data-testid="subscriber-portal-layout">
      {/* PageHeader banner (matches website theme) */}
      <PageHeader
        eyebrow={activeHeader.eyebrow}
        title={activeHeader.title}
        accent={activeHeader.accent}
        subtitle={activeHeader.subtitle}
        backgroundImage={BANNER_BG}
      />

      {/* Tab bar + user chip */}
      <section className="sticky top-24 z-20 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between gap-4 pt-3">
            {/* User chip */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1E88FF] to-[#0A1A33] flex items-center justify-center text-white font-bold text-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-semibold text-[#0A1A33]">{displayName}</div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-green-500" : "bg-slate-400"}`} />
                  <span className="text-xs text-slate-500">
                    {isOnline ? "Online" : "Offline"}{accountNo ? ` · ${accountNo}` : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              data-testid="logout-button"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>

          {/* Tabs */}
          <nav
            className="flex items-center gap-1 overflow-x-auto mt-3 -mb-px"
            data-testid="portal-tabs"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.end}
                  data-testid={tab.testid}
                  className={({ isActive }) =>
                    `relative flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${
                      isActive
                        ? "text-[#1E88FF] border-[#1E88FF]"
                        : "text-slate-500 hover:text-[#0A1A33] border-transparent hover:border-slate-200"
                    }`
                  }
                >
                  <Icon size={16} />
                  {tab.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </section>

      {/* Content */}
      <section className="bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10">
          <Outlet
            context={{
              profile,
              refreshProfile: () => {
                xceednetApi.getSubscriberProfile()
                  .then((r) => setProfile(r?.data || null))
                  .catch(() => {});
              },
            }}
          />
        </div>
      </section>
    </div>
  );
}
