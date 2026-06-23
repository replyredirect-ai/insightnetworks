import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Activity, Wifi, CreditCard, Package, Calendar, TrendingUp, 
  Download, Upload, Clock, LogOut, RefreshCw, User, Shield
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import xceednetApi from "../services/xceednetApi";

const DASHBOARD_BG = "https://images.unsplash.com/photo-1608222351212-18fe0ec7b13b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwzfHxkYXNoYm9hcmQlMjBhbmFseXRpY3N8ZW58MHx8fHwxNzgyMjI3NDE5fDA&ixlib=rb-4.1.0&q=85";

// Mock data matching XceedNet API structure
const mockSubscriberData = {
  id: 1,
  name: "Demo User",
  username: "demo_user",
  email: "demo@insightnet.in",
  mobile1: "9876543210",
  address1: "Block-B Aashima Royal City",
  city: "Bhopal",
  state: "Madhya Pradesh",
  zip: "462043",
  status: "package_assigned",
  is_online: true,
  location_package_name: "Premium 100 Mbps",
  location_package_display_valid_for: "30 Days",
  location_package_display_data: "Unlimited",
  renewed_at: "2026-01-05T10:30:00.000+05:30",
  expires_at: "2026-02-05T10:30:00.000+05:30",
  balance_amount_human: "₹0",
  balance_amount_cents: 0,
  bytes_uploaded_total_human: "45.2 GB",
  bytes_downloaded_total_human: "128.5 GB",
  data_used_total_human: "173.7 GB",
  data_used_today_human: "2.3 GB",
  data_used_monthly_human: "173.7 GB",
  package_time_used_today: "8.5 Hours",
  subscriber_ip_addresses: ["192.168.1.100"],
  last_login_at: "2026-01-05T14:23:00.000+05:30"
};

const mockPackages = [
  { id: 1, name: "Basic 50 Mbps", price: "₹599", speed: "50 Mbps", validity: "30 Days" },
  { id: 2, name: "Premium 100 Mbps", price: "₹999", speed: "100 Mbps", validity: "30 Days" },
  { id: 3, name: "Ultra 200 Mbps", price: "₹1499", speed: "200 Mbps", validity: "30 Days" },
];

export default function SubscriberDashboard() {
  const navigate = useNavigate();
  const [subscriberData, setSubscriberData] = useState(mockSubscriberData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // In real implementation, fetch subscriber data from API
    // const fetchData = async () => {
    //   try {
    //     const subscriberId = localStorage.getItem('subscriber_id');
    //     const data = await xceednetApi.getSubscriber(subscriberId);
    //     setSubscriberData(data.data);
    //   } catch (error) {
    //     console.error('Error fetching subscriber data:', error);
    //   }
    // };
    // fetchData();
  }, []);

  const handleLogout = () => {
    xceednetApi.clearAuth();
    navigate('/dashboard');
  };

  const daysRemaining = () => {
    const expiry = new Date(subscriberData.expires_at);
    const today = new Date();
    const diff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <div data-testid="subscriber-dashboard-page">
      <PageHeader
        eyebrow="Subscriber Dashboard"
        title="Welcome back,"
        accent={subscriberData.name}
        subtitle="Manage your account, monitor usage, and view billing information."
        backgroundImage={DASHBOARD_BG}
      />

      <section className="container mx-auto px-6 lg:px-8 py-12">
        {/* Top Actions */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#0A1A33]">Account Overview</h2>
            <p className="text-slate-600 mt-1">Last login: {new Date(subscriberData.last_login_at).toLocaleString()}</p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 border-2 border-slate-300 text-slate-700 hover:border-red-500 hover:text-red-500 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Connection Status */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Wifi className="text-green-600" size={24} />
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                {subscriberData.is_online ? 'Online' : 'Offline'}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-slate-600 mb-1">Connection Status</h3>
            <p className="text-2xl font-bold text-[#0A1A33]">Active</p>
            <p className="text-xs text-slate-500 mt-2">IP: {subscriberData.subscriber_ip_addresses[0]}</p>
          </div>

          {/* Current Package */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
              <Package className="text-[#1E88FF]" size={24} />
            </div>
            <h3 className="text-sm font-semibold text-slate-600 mb-1">Current Package</h3>
            <p className="text-xl font-bold text-[#0A1A33]">{subscriberData.location_package_name}</p>
            <p className="text-xs text-slate-500 mt-2">Unlimited Data</p>
          </div>

          {/* Account Balance */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
              <CreditCard className="text-purple-600" size={24} />
            </div>
            <h3 className="text-sm font-semibold text-slate-600 mb-1">Account Balance</h3>
            <p className="text-2xl font-bold text-[#0A1A33]">{subscriberData.balance_amount_human}</p>
            <p className="text-xs text-green-600 mt-2">No pending dues</p>
          </div>

          {/* Validity */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mb-4">
              <Calendar className="text-orange-600" size={24} />
            </div>
            <h3 className="text-sm font-semibold text-slate-600 mb-1">Validity Remaining</h3>
            <p className="text-2xl font-bold text-[#0A1A33]">{daysRemaining()} Days</p>
            <p className="text-xs text-slate-500 mt-2">Expires: {new Date(subscriberData.expires_at).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Usage Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Data Usage Today */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-blue-900">Today's Usage</h3>
              <Activity className="text-blue-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-blue-900 mb-2">{subscriberData.data_used_today_human}</p>
            <div className="flex items-center gap-2 text-xs text-blue-700">
              <Clock size={14} />
              <span>{subscriberData.package_time_used_today} session time</span>
            </div>
          </div>

          {/* Monthly Usage */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-purple-900">This Month</h3>
              <TrendingUp className="text-purple-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-purple-900 mb-2">{subscriberData.data_used_monthly_human}</p>
            <div className="space-y-1 mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-700 flex items-center gap-1">
                  <Upload size={12} /> Upload
                </span>
                <span className="font-semibold text-purple-900">{subscriberData.bytes_uploaded_total_human}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-700 flex items-center gap-1">
                  <Download size={12} /> Download
                </span>
                <span className="font-semibold text-purple-900">{subscriberData.bytes_downloaded_total_human}</span>
              </div>
            </div>
          </div>

          {/* Total Usage */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-green-900">Total Usage</h3>
              <Activity className="text-green-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-green-900 mb-2">{subscriberData.data_used_total_human}</p>
            <p className="text-xs text-green-700">Since account activation</p>
          </div>
        </div>

        {/* Account Information & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Account Details */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-[#0A1A33] mb-4 flex items-center gap-2">
              <User size={20} className="text-[#1E88FF]" />
              Account Information
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Username:</span>
                <span className="text-sm font-semibold text-[#0A1A33]">{subscriberData.username}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Email:</span>
                <span className="text-sm font-semibold text-[#0A1A33]">{subscriberData.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Mobile:</span>
                <span className="text-sm font-semibold text-[#0A1A33]">{subscriberData.mobile1}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Location:</span>
                <span className="text-sm font-semibold text-[#0A1A33]">{subscriberData.city}, {subscriberData.state}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-slate-600">Status:</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Available Packages */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-[#0A1A33] mb-4 flex items-center gap-2">
              <Package size={20} className="text-[#1E88FF]" />
              Available Packages
            </h3>
            <div className="space-y-3">
              {mockPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    pkg.name === subscriberData.location_package_name
                      ? 'border-[#1E88FF] bg-blue-50'
                      : 'border-slate-200 hover:border-[#1E88FF]'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-[#0A1A33]">{pkg.name}</h4>
                      <p className="text-xs text-slate-600">{pkg.speed} • {pkg.validity}</p>
                    </div>
                    <span className="text-lg font-bold text-[#1E88FF]">{pkg.price}</span>
                  </div>
                  {pkg.name === subscriberData.location_package_name ? (
                    <button className="w-full mt-2 px-4 py-2 bg-[#1E88FF] text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2">
                      <RefreshCw size={16} />
                      Renew Package
                    </button>
                  ) : (
                    <button className="w-full mt-2 px-4 py-2 border-2 border-[#1E88FF] text-[#1E88FF] text-sm font-semibold rounded-lg hover:bg-[#1E88FF] hover:text-white transition-colors">
                      Change to this Plan
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
