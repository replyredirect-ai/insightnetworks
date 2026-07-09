import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, CreditCard, LifeBuoy, User, LogOut, ChevronDown,
} from "lucide-react";
import fullLogo from "../assets/insight-logo-full.png";
import xceednetApi from "../services/xceednetApi";

const TABS = [
  { to: "/subscriber", label: "Overview", icon: LayoutDashboard, end: true, testid: "tab-overview" },
  { to: "/subscriber/invoices", label: "Invoices", icon: FileText, testid: "tab-invoices" },
  { to: "/subscriber/payments", label: "Payments", icon: CreditCard, testid: "tab-payments" },
  { to: "/subscriber/tickets", label: "Support Tickets", icon: LifeBuoy, testid: "tab-tickets" },
  { to: "/subscriber/profile", label: "Profile & Password", icon: User, testid: "tab-profile" },
];

export default function SubscriberLayout() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!xceednetApi.isAuthenticated() || xceednetApi.getUserType() !== "subscriber") {
      navigate("/subscriber-login");
      return;
    }
    xceednetApi.getSubscriberProfile()
      .then((r) => setProfile(r?.data || null))
      .catch(() => setProfile(null));
  }, [navigate]);

  const handleLogout = () => {
    xceednetApi.clearAuth();
    navigate("/dashboard");
  };

  const displayName = profile?.name || profile?.username || "Subscriber";
  const isOnline = !!profile?.is_online;
  const accountNo = profile?.account_no;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" data-testid="subscriber-portal-layout">
      {/* Top header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img
                src={fullLogo}
                alt="Insight Networks"
                data-testid="portal-logo"
                className="h-11 w-auto object-contain"
              />
              <div className="hidden sm:block pl-4 border-l border-slate-200">
                <div className="text-[10px] font-semibold tracking-[0.2em] uppercase text-slate-500">
                  Customer Portal
                </div>
                <div className="text-xs text-slate-400 font-medium">Manage your account</div>
              </div>
            </div>

            {/* Right side — user menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                onBlur={() => setTimeout(() => setMenuOpen(false), 200)}
                data-testid="user-menu-button"
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 border-2 border-transparent hover:border-slate-200 transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1E88FF] to-[#0A1A33] flex items-center justify-center text-white font-bold text-sm">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <div className="text-sm font-semibold text-[#0A1A33]">{displayName}</div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-green-500" : "bg-slate-400"}`} />
                    <span className="text-xs text-slate-500">
                      {isOnline ? "Online" : "Offline"}
                      {accountNo ? ` · ${accountNo}` : ""}
                    </span>
                  </div>
                </div>
                <ChevronDown size={16} className="text-slate-400" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-40">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="text-sm font-semibold text-[#0A1A33]">{displayName}</div>
                    <div className="text-xs text-slate-500">{profile?.email || profile?.username}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    data-testid="logout-button"
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tab bar */}
          <nav className="flex items-center gap-1 overflow-x-auto -mb-px" data-testid="portal-tabs">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.end}
                  data-testid={tab.testid}
                  className={({ isActive }) =>
                    `relative flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${
                      isActive
                        ? "text-[#1E88FF] border-[#1E88FF]"
                        : "text-slate-500 hover:text-[#0A1A33] border-transparent hover:border-slate-200"
                    }`
                  }
                >
                  <Icon size={17} />
                  {tab.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <Outlet context={{ profile, refreshProfile: () => {
          xceednetApi.getSubscriberProfile()
            .then((r) => setProfile(r?.data || null))
            .catch(() => {});
        } }} />
      </main>
    </div>
  );
}
