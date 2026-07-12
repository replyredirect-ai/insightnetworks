import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, Wifi, Package, TrendingUp, AlertCircle, CheckCircle,
  Search, Plus, LogOut, RefreshCw, Edit, Trash2, DollarSign,
  Shield, MapPin, Clock, Calendar, LayoutDashboard, FileText,
  BarChart3, LifeBuoy, Settings, User as UserIcon,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import xceednetApi from "../services/xceednetApi";

const DASHBOARD_BG = "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjV8MHwxfHNlYXJjaHwyfHxkYXRhJTIwY2VudGVyJTIwdGVjaG5vbG9neXxlbnwwfHx8fDE3ODIyMjc0MTl8MA&ixlib=rb-4.1.0&q=85";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [subscribers, setSubscribers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is authenticated as admin
    if (!xceednetApi.isAuthenticated() || xceednetApi.getUserType() !== 'admin') {
      navigate('/admin-login');
      return;
    }

    // Fetch dashboard data from XceedNet API via proxy
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch dashboard stats
        const statsResponse = await xceednetApi.getDashboardStats();
        const stats = statsResponse?.data || statsResponse;
        setDashboardData(stats);

        // Fetch subscribers list (XceedNet datatable format)
        const subscribersResponse = await xceednetApi.getSubscribersList({ start: 0, length: 50 });
        const raw = subscribersResponse?.data?.data || subscribersResponse?.data || [];
        // XceedNet returns array-of-arrays; map to objects based on the columns order
        // Columns: [subscriberid, username, name, account_no, mobile1, zone, node, package, is_online, renewed_at, expires_at, status, id]
        const mapped = Array.isArray(raw) && raw.length && Array.isArray(raw[0])
          ? raw.map((row) => ({
              subscriberid: row[0],
              username: row[1],
              name: row[2],
              account_no: row[3],
              mobile1: row[4],
              zone: row[5]?.location_zone_name || null,
              node: row[6]?.location_node_name || null,
              location_package_name: row[7]?.location_package_name || null,
              is_online: !!row[8],
              renewed_at: row[9],
              expires_at: row[10],
              status: row[11],
              id: row[12],
            }))
          : Array.isArray(raw)
          ? raw
          : [];
        setSubscribers(mapped);

        setError(null);
      } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
        if (error.status === 401) {
          xceednetApi.clearAuth();
          navigate('/admin-login');
          return;
        }
        setError(error.message || 'Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    xceednetApi.clearAuth();
    navigate('/admin-login');
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'expired': return 'bg-red-100 text-red-700';
      case 'disabled': return 'bg-gray-100 text-gray-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const filteredSubscribers = subscribers.filter(sub =>
    sub.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Show loading state
  if (loading) {
    return (
      <div data-testid="admin-dashboard-page">
        <PageHeader
          eyebrow="Admin Dashboard"
          title="Loading"
          accent="Console"
          subtitle="Please wait while we fetch dashboard data."
          backgroundImage={DASHBOARD_BG}
        />
        <section className="container mx-auto px-6 lg:px-8 py-20">
          <div className="flex items-center justify-center">
            <RefreshCw size={48} className="text-[#1E88FF] animate-spin" />
          </div>
        </section>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div data-testid="admin-dashboard-page">
        <PageHeader
          eyebrow="Admin Dashboard"
          title="Error loading"
          accent="dashboard"
          subtitle={error}
          backgroundImage={DASHBOARD_BG}
        />
        <section className="container mx-auto px-6 lg:px-8 py-20">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8">
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="btn-shine bg-[#1E88FF] hover:bg-[#156cd1] text-white px-6 py-3 rounded-full"
              >
                Retry
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div data-testid="admin-dashboard-page">
      <PageHeader
        eyebrow="ADMIN CONSOLE"
        title="Modern Network"
        accent="Operations Centre"
        subtitle="Monitor subscribers, manage packages, and oversee network operations from a single glass-pane."
        backgroundImage={DASHBOARD_BG}
      />

      <section className="container mx-auto px-6 lg:px-8 py-12">
        {/* Admin Welcome Banner */}
        <div
          data-testid="admin-welcome-banner"
          className="relative overflow-hidden rounded-3xl mb-10 bg-gradient-to-br from-[#0A1A33] via-[#0F2847] to-[#1E88FF] text-white shadow-xl"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(30,136,255,0.35),transparent_50%)]" />
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
          <div className="relative p-6 lg:p-10">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 lg:gap-10 mb-8">
              {/* Avatar */}
              <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-white/10 backdrop-blur border-2 border-white/20 flex items-center justify-center shrink-0 shadow-lg">
                <Shield size={40} className="text-white" />
              </div>
              {/* Admin info */}
              <div className="flex-1">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold tracking-wider uppercase text-blue-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Session
                </span>
                <h2 className="mt-3 font-display text-2xl lg:text-4xl font-bold">
                  Welcome back, <span className="text-[#7CB9FF]">Administrator</span>
                </h2>
                <p className="text-blue-100/80 mt-2 max-w-2xl">
                  You&apos;re signed in to the Insight Networks admin console for {dashboardData?.location_name || "Bhopal"}. Monitor subscribers, manage packages, review tickets, and keep the network humming.
                </p>
              </div>
              {/* Logout (moved into banner) */}
              <button
                onClick={handleLogout}
                data-testid="admin-logout-button"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 border border-white/20 hover:bg-white/20 rounded-xl text-sm font-semibold transition-colors self-start lg:self-auto"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>

            {/* Admin meta grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
              {[
                { icon: Shield, label: "Role", value: "Location Admin" },
                { icon: MapPin, label: "Location", value: dashboardData?.location_name || "Bhopal" },
                { icon: Clock, label: "Last Login", value: new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) },
                { icon: Calendar, label: "Today", value: new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" }) },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <div key={m.label} className="bg-white/10 backdrop-blur border border-white/15 rounded-xl p-3 lg:p-4">
                    <div className="flex items-center gap-2 text-blue-200 text-[10px] font-semibold uppercase tracking-widest mb-1">
                      <Icon size={12} /> {m.label}
                    </div>
                    <p className="text-white font-semibold text-sm lg:text-base truncate">{m.value}</p>
                  </div>
                );
              })}
            </div>

            {/* Quick access */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-blue-200 text-[10px] font-semibold uppercase tracking-widest mb-3">Quick Access</p>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2 lg:gap-3">
                {[
                  { icon: LayoutDashboard, label: "Dashboard" },
                  { icon: Users, label: "Subscribers" },
                  { icon: Package, label: "Packages" },
                  { icon: DollarSign, label: "Billing" },
                  { icon: BarChart3, label: "Reports" },
                  { icon: LifeBuoy, label: "Tickets" },
                  { icon: Settings, label: "Settings" },
                  { icon: UserIcon, label: "Profile" },
                ].map((q) => {
                  const Icon = q.icon;
                  return (
                    <button
                      key={q.label}
                      data-testid={`quick-${q.label.toLowerCase()}`}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/10 border border-white/15 hover:bg-white/20 hover:border-white/30 transition-all group"
                    >
                      <Icon size={20} className="text-blue-100 group-hover:text-white transition-colors" />
                      <span className="text-[11px] font-semibold text-blue-100 group-hover:text-white truncate w-full text-center">{q.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Section header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#0A1A33]">Dashboard Overview</h2>
            <p className="text-slate-600 mt-1">Real-time network statistics and subscriber metrics</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Subscribers */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Users size={32} />
              <span className="text-blue-100 text-sm font-semibold">Total</span>
            </div>
            <p className="text-4xl font-bold mb-1">{dashboardData?.all_subscribers_count || 0}</p>
            <p className="text-blue-100 text-sm">Subscribers</p>
          </div>

          {/* Online Now */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Wifi size={32} />
              <span className="text-green-100 text-sm font-semibold">Live</span>
            </div>
            <p className="text-4xl font-bold mb-1">{dashboardData?.online_subscribers_count || 0}</p>
            <p className="text-green-100 text-sm">Online Now</p>
          </div>

          {/* Revenue */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <DollarSign size={32} />
              <span className="text-purple-100 text-sm font-semibold">This Month</span>
            </div>
            <p className="text-4xl font-bold mb-1">{dashboardData?.active_invoices_amount || '₹0'}</p>
            <p className="text-purple-100 text-sm">Total Invoices</p>
          </div>

          {/* Tickets */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <AlertCircle size={32} />
              <span className="text-orange-100 text-sm font-semibold">Active</span>
            </div>
            <p className="text-4xl font-bold mb-1">{dashboardData?.all_active_tickets || 0}</p>
            <p className="text-orange-100 text-sm">Support Tickets</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
            <p className="text-sm text-slate-600 mb-1">Registered Today</p>
            <p className="text-2xl font-bold text-[#0A1A33]">{dashboardData?.registered_today || 0}</p>
          </div>
          <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
            <p className="text-sm text-slate-600 mb-1">Expiring Today</p>
            <p className="text-2xl font-bold text-orange-600">{dashboardData?.expiring_today_subscribers_count || 0}</p>
          </div>
          <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
            <p className="text-sm text-slate-600 mb-1">Packages Sold</p>
            <p className="text-2xl font-bold text-green-600">{dashboardData?.packages_sold_today || 0}</p>
          </div>
          <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
            <p className="text-sm text-slate-600 mb-1">Pending Dues</p>
            <p className="text-2xl font-bold text-red-600">{dashboardData?.total_balance_amount_due || '₹0'}</p>
          </div>
        </div>

        {/* Subscriber Management */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-[#0A1A33]">Subscriber Management</h3>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E88FF] text-white rounded-lg hover:bg-[#156cd1] transition-colors">
              <Plus size={18} />
              Add Subscriber
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:border-[#1E88FF] focus:outline-none"
            />
          </div>

          {/* Subscribers Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Username</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Package</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Balance</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Expiry</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscribers.map((sub) => (
                  <tr key={sub.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm font-medium text-[#0A1A33]">{sub.name || '—'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{sub.username || '—'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{sub.location_package_name || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(sub.status)}`}>
                        {sub.status || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-[#0A1A33]">—</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : '—'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                          <Edit size={16} className="text-[#1E88FF]" />
                        </button>
                        <button className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 size={16} className="text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Package Overview - Commented out until packages API is integrated */}
        {/* <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-[#0A1A33] mb-6">Package Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <p className="text-slate-600">Package management coming soon...</p>
          </div>
        </div> */}
      </section>
    </div>
  );
}
