import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, CreditCard, LifeBuoy, User, LogOut,
  Menu, X, Shield, Wifi
} from "lucide-react";
import xceednetApi from "../services/xceednetApi";

const NAV_ITEMS = [
  { to: "/subscriber", label: "Overview", icon: LayoutDashboard, end: true, testid: "nav-overview" },
  { to: "/subscriber/invoices", label: "Invoices", icon: FileText, testid: "nav-invoices" },
  { to: "/subscriber/payments", label: "Payments", icon: CreditCard, testid: "nav-payments" },
  { to: "/subscriber/tickets", label: "Support Tickets", icon: LifeBuoy, testid: "nav-tickets" },
  { to: "/subscriber/profile", label: "Profile & Password", icon: User, testid: "nav-profile" },
];

export default function SubscriberLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!xceednetApi.isAuthenticated() || xceednetApi.getUserType() !== "subscriber") {
      navigate("/subscriber-login");
      return;
    }
    // Best-effort fetch of profile for sidebar header (fails silently)
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

  return (
    <div className="min-h-screen bg-slate-50" data-testid="subscriber-portal-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        data-testid="subscriber-sidebar"
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <div className="font-display text-xl font-bold text-[#0A1A33]">
                insight <span className="text-[#1E88FF]">NETWORKS</span>
              </div>
              <div className="text-[10px] tracking-widest uppercase text-slate-500 mt-1">
                Customer Portal
              </div>
            </div>
            <button
              className="lg:hidden p-2 text-slate-500 hover:text-slate-700"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X size={20} />
            </button>
          </div>

          {/* User summary */}
          <div className="px-6 py-5 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#1E88FF]/10 flex items-center justify-center">
                <User size={20} className="text-[#1E88FF]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#0A1A33] truncate">{displayName}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOnline ? "bg-green-500" : "bg-slate-400"
                    }`}
                  />
                  <span className="text-xs text-slate-500">
                    {isOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  data-testid={item.testid}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[#1E88FF] text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-[#0A1A33]"
                    }`
                  }
                >
                  <Icon size={18} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200 space-y-2">
            <div className="flex items-center gap-2 px-4 py-2 text-xs text-slate-500">
              <Shield size={14} />
              <span className="truncate">{xceednetApi.getLocationDomain()}</span>
            </div>
            <button
              onClick={handleLogout}
              data-testid="logout-button"
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:ml-72">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              className="p-2 text-slate-600 hover:text-[#0A1A33]"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              data-testid="open-sidebar"
            >
              <Menu size={22} />
            </button>
            <div className="font-display font-bold text-[#0A1A33]">
              insight <span className="text-[#1E88FF]">NETWORKS</span>
            </div>
            <div className="w-9" />
          </div>
        </header>

        <main className="px-4 sm:px-6 lg:px-10 py-8 max-w-6xl mx-auto">
          <Outlet context={{ profile, refreshProfile: () => {
            xceednetApi.getSubscriberProfile()
              .then((r) => setProfile(r?.data || null))
              .catch(() => {});
          } }} />
          <div className="mt-10 pt-6 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-500">
            <Wifi size={12} />
            <span>Data fetched securely from XceedNet · {xceednetApi.getLocationDomain()}</span>
          </div>
        </main>
      </div>
    </div>
  );
}
