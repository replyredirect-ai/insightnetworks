import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, Wifi, Package, TrendingUp, AlertCircle, CheckCircle,
  Search, Plus, LogOut, RefreshCw, Edit, Trash2, DollarSign
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import xceednetApi from "../services/xceednetApi";

const DASHBOARD_BG = "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjV8MHwxfHNlYXJjaHwyfHxkYXRhJTIwY2VudGVyJTIwdGVjaG5vbG9neXxlbnwwfHx8fDE3ODIyMjc0MTl8MA&ixlib=rb-4.1.0&q=85";

// Mock dashboard data matching XceedNet API
const mockDashboardData = {
  all_subscribers_count: 1247,
  online_subscribers_count: 892,
  active_subscribers_count: 1180,
  disabled_subscribers_count: 45,
  expired_subscribers_count: 22,
  expiring_today_subscribers_count: 8,
  registered_today: 12,
  registered_this_month: 156,
  packages_sold_today: 15,
  packages_sold_this_month: 298,
  active_invoices_amount: "₹2,45,000",
  active_payments_amount: "₹1,87,500",
  total_balance_amount_due: "₹57,500",
  all_active_tickets: 23,
  tickets_overdue: 3,
};

const mockSubscribers = [
  { id: 1, name: "Rajesh Kumar", username: "rajesh_123", package: "Premium 100 Mbps", status: "active", balance: "₹0", expiry: "2026-02-15" },
  { id: 2, name: "Priya Sharma", username: "priya_456", package: "Basic 50 Mbps", status: "active", balance: "₹0", expiry: "2026-02-10" },
  { id: 3, name: "Amit Patel", username: "amit_789", package: "Ultra 200 Mbps", status: "expired", balance: "₹999", expiry: "2026-01-01" },
  { id: 4, name: "Sunita Verma", username: "sunita_321", package: "Premium 100 Mbps", status: "active", balance: "₹0", expiry: "2026-02-20" },
  { id: 5, name: "Rahul Singh", username: "rahul_654", package: "Basic 50 Mbps", status: "disabled", balance: "₹599", expiry: "2026-01-28" },
];

const mockPackages = [
  { id: 1, name: "Basic 50 Mbps", subscribers: 420, price: "₹599", bandwidth: "50 Mbps" },
  { id: 2, name: "Premium 100 Mbps", subscribers: 580, price: "₹999", bandwidth: "100 Mbps" },
  { id: 3, name: "Ultra 200 Mbps", subscribers: 247, price: "₹1499", bandwidth: "200 Mbps" },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(mockDashboardData);
  const [subscribers, setSubscribers] = useState(mockSubscribers);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // In real implementation, fetch from API
    // const fetchData = async () => {
    //   try {
    //     const data = await xceednetApi.getLocationDashboard();
    //     setDashboardData(data);
    //   } catch (error) {
    //     console.error('Error fetching dashboard data:', error);
    //   }
    // };
    // fetchData();
  }, []);

  const handleLogout = () => {
    xceednetApi.clearAuth();
    navigate('/dashboard');
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
    sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div data-testid="admin-dashboard-page">
      <PageHeader
        eyebrow="Admin Dashboard"
        title="Location Management"
        accent="Console"
        subtitle="Monitor subscribers, manage packages, and oversee network operations."
        backgroundImage={DASHBOARD_BG}
      />

      <section className="container mx-auto px-6 lg:px-8 py-12">
        {/* Top Actions */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#0A1A33]">Dashboard Overview</h2>
            <p className="text-slate-600 mt-1">Real-time network statistics and subscriber metrics</p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 border-2 border-slate-300 text-slate-700 hover:border-red-500 hover:text-red-500 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Subscribers */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Users size={32} />
              <span className="text-blue-100 text-sm font-semibold">Total</span>
            </div>
            <p className="text-4xl font-bold mb-1">{dashboardData.all_subscribers_count}</p>
            <p className="text-blue-100 text-sm">Subscribers</p>
          </div>

          {/* Online Now */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Wifi size={32} />
              <span className="text-green-100 text-sm font-semibold">Live</span>
            </div>
            <p className="text-4xl font-bold mb-1">{dashboardData.online_subscribers_count}</p>
            <p className="text-green-100 text-sm">Online Now</p>
          </div>

          {/* Revenue */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <DollarSign size={32} />
              <span className="text-purple-100 text-sm font-semibold">This Month</span>
            </div>
            <p className="text-4xl font-bold mb-1">{dashboardData.active_invoices_amount}</p>
            <p className="text-purple-100 text-sm">Total Invoices</p>
          </div>

          {/* Tickets */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <AlertCircle size={32} />
              <span className="text-orange-100 text-sm font-semibold">Active</span>
            </div>
            <p className="text-4xl font-bold mb-1">{dashboardData.all_active_tickets}</p>
            <p className="text-orange-100 text-sm">Support Tickets</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
            <p className="text-sm text-slate-600 mb-1">Registered Today</p>
            <p className="text-2xl font-bold text-[#0A1A33]">{dashboardData.registered_today}</p>
          </div>
          <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
            <p className="text-sm text-slate-600 mb-1">Expiring Today</p>
            <p className="text-2xl font-bold text-orange-600">{dashboardData.expiring_today_subscribers_count}</p>
          </div>
          <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
            <p className="text-sm text-slate-600 mb-1">Packages Sold</p>
            <p className="text-2xl font-bold text-green-600">{dashboardData.packages_sold_today}</p>
          </div>
          <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
            <p className="text-sm text-slate-600 mb-1">Pending Dues</p>
            <p className="text-2xl font-bold text-red-600">{dashboardData.total_balance_amount_due}</p>
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
                    <td className="py-3 px-4 text-sm font-medium text-[#0A1A33]">{sub.name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{sub.username}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{sub.package}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(sub.status)}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-[#0A1A33]">{sub.balance}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{new Date(sub.expiry).toLocaleDateString()}</td>
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

        {/* Package Overview */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-[#0A1A33] mb-6">Package Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mockPackages.map((pkg) => (
              <div key={pkg.id} className="border-2 border-slate-200 rounded-xl p-6 hover:border-[#1E88FF] transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-[#0A1A33] text-lg">{pkg.name}</h4>
                    <p className="text-sm text-slate-600">{pkg.bandwidth}</p>
                  </div>
                  <Package className="text-[#1E88FF]" size={24} />
                </div>
                <p className="text-3xl font-bold text-[#1E88FF] mb-2">{pkg.price}</p>
                <p className="text-sm text-slate-600 mb-4">{pkg.subscribers} active subscribers</p>
                <button className="w-full px-4 py-2 border-2 border-[#1E88FF] text-[#1E88FF] rounded-lg hover:bg-[#1E88FF] hover:text-white transition-colors text-sm font-semibold">
                  Manage Package
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
