import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity, Wifi, CreditCard, Package, Calendar, TrendingUp,
  Download, Upload, Clock, LogOut, RefreshCw, User, Shield
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import xceednetApi from "../services/xceednetApi";

const DASHBOARD_BG = "https://images.unsplash.com/photo-1606857521015-7f9fcf423740?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBkYXNoYm9hcmQlMjB0ZWNobm9sb2d5fGVufDB8fHx8MTc4MjIyNzQxOXww&ixlib=rb-4.1.0&q=85";

export default function SubscriberDashboard() {
  const navigate = useNavigate();
  const [subscriberData, setSubscriberData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!xceednetApi.isAuthenticated() || xceednetApi.getUserType() !== 'subscriber') {
      navigate('/subscriber-login');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await xceednetApi.getSubscriberDashboard();
        const data = response?.data || response;
        setSubscriberData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching subscriber data:', err);
        if (err.status === 401) {
          xceednetApi.clearAuth();
          navigate('/subscriber-login');
          return;
        }
        setError(err.message || 'Failed to load subscriber data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    xceednetApi.clearAuth();
    navigate('/dashboard');
  };

  const daysRemaining = () => {
    if (!subscriberData?.expires_at) return 0;
    const expiry = new Date(subscriberData.expires_at);
    const today = new Date();
    const diff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  if (loading) {
    return (
      <div data-testid="subscriber-dashboard-page">
        <PageHeader
          eyebrow="Subscriber Dashboard"
          title="Loading your"
          accent="dashboard..."
          subtitle="Please wait while we fetch your account information."
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

  if (error || !subscriberData) {
    return (
      <div data-testid="subscriber-dashboard-page">
        <PageHeader
          eyebrow="Subscriber Dashboard"
          title="Error loading"
          accent="dashboard"
          subtitle={error || "Unable to load subscriber data"}
          backgroundImage={DASHBOARD_BG}
        />
        <section className="container mx-auto px-6 lg:px-8 py-20">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8">
              <p className="text-red-700 mb-4">{error}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="btn-shine bg-[#1E88FF] hover:bg-[#156cd1] text-white px-6 py-3 rounded-full"
                >
                  Retry
                </button>
                <button
                  onClick={handleLogout}
                  className="border-2 border-slate-300 text-slate-700 hover:border-red-500 hover:text-red-500 px-6 py-3 rounded-full transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const ipAddress = Array.isArray(subscriberData.subscriber_ip_addresses) && subscriberData.subscriber_ip_addresses.length > 0
    ? subscriberData.subscriber_ip_addresses[0]
    : '—';
  const isOnline = !!subscriberData.is_online;
  const packageName = subscriberData.location_package_name || 'N/A';
  const packageDataLimit = subscriberData.location_package_display_data || 'Unlimited Data';
  const availablePackages = Array.isArray(subscriberData.available_susbcriber_packages)
    ? subscriberData.available_susbcriber_packages
    : [];

  return (
    <div data-testid="subscriber-dashboard-page">
      <PageHeader
        eyebrow="Subscriber Dashboard"
        title="Welcome back,"
        accent={subscriberData.name || subscriberData.username || 'User'}
        subtitle="Manage your account, monitor usage, and view billing information."
        backgroundImage={DASHBOARD_BG}
      />

      <section className="container mx-auto px-6 lg:px-8 py-12">
        {/* Top Actions */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#0A1A33]">Account Overview</h2>
            <p className="text-slate-600 mt-1">
              Last login: {subscriberData.last_login_at ? new Date(subscriberData.last_login_at).toLocaleString() : 'N/A'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
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
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isOnline ? 'bg-green-100' : 'bg-slate-100'}`}>
                <Wifi className={isOnline ? 'text-green-600' : 'text-slate-500'} size={24} />
              </div>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${isOnline ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-slate-600 mb-1">Connection Status</h3>
            <p className="text-2xl font-bold text-[#0A1A33]">{subscriberData.status ? subscriberData.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Active'}</p>
            <p className="text-xs text-slate-500 mt-2">IP: {ipAddress}</p>
          </div>

          {/* Current Package */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
              <Package className="text-[#1E88FF]" size={24} />
            </div>
            <h3 className="text-sm font-semibold text-slate-600 mb-1">Current Package</h3>
            <p className="text-xl font-bold text-[#0A1A33]">{packageName}</p>
            <p className="text-xs text-slate-500 mt-2">{packageDataLimit}</p>
          </div>

          {/* Account Balance */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
              <CreditCard className="text-purple-600" size={24} />
            </div>
            <h3 className="text-sm font-semibold text-slate-600 mb-1">Account Balance</h3>
            <p className="text-2xl font-bold text-[#0A1A33]">{subscriberData.balance_amount_human || '—'}</p>
            <p className="text-xs text-green-600 mt-2">
              {(subscriberData.balance_amount_cents ?? 0) > 0 ? 'Amount due' : 'No pending dues'}
            </p>
          </div>

          {/* Validity */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mb-4">
              <Calendar className="text-orange-600" size={24} />
            </div>
            <h3 className="text-sm font-semibold text-slate-600 mb-1">Validity Remaining</h3>
            <p className="text-2xl font-bold text-[#0A1A33]">{daysRemaining()} Days</p>
            <p className="text-xs text-slate-500 mt-2">
              Expires: {subscriberData.expires_at ? new Date(subscriberData.expires_at).toLocaleDateString() : '—'}
            </p>
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
            <p className="text-3xl font-bold text-blue-900 mb-2">{subscriberData.data_used_today_human || '0 Bytes'}</p>
            <div className="flex items-center gap-2 text-xs text-blue-700">
              <Clock size={14} />
              <span>{subscriberData.package_time_used_today || '0 Hours'} session time</span>
            </div>
          </div>

          {/* Monthly Usage */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-purple-900">This Month</h3>
              <TrendingUp className="text-purple-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-purple-900 mb-2">{subscriberData.data_used_monthly_human || '0 Bytes'}</p>
            <div className="space-y-1 mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-700 flex items-center gap-1">
                  <Upload size={12} /> Upload
                </span>
                <span className="font-semibold text-purple-900">{subscriberData.bytes_uploaded_monthly_human || '0 Bytes'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-700 flex items-center gap-1">
                  <Download size={12} /> Download
                </span>
                <span className="font-semibold text-purple-900">{subscriberData.bytes_downloaded_monthly_human || '0 Bytes'}</span>
              </div>
            </div>
          </div>

          {/* Total Usage */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-green-900">Total Usage</h3>
              <Activity className="text-green-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-green-900 mb-2">{subscriberData.data_used_total_human || '0 Bytes'}</p>
            <p className="text-xs text-green-700">Since account activation</p>
          </div>
        </div>

        {/* Account Information & Available Packages */}
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
                <span className="text-sm font-semibold text-[#0A1A33]">{subscriberData.username || '—'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Account No:</span>
                <span className="text-sm font-semibold text-[#0A1A33]">{subscriberData.account_no || '—'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Email:</span>
                <span className="text-sm font-semibold text-[#0A1A33]">{subscriberData.email || '—'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Mobile:</span>
                <span className="text-sm font-semibold text-[#0A1A33]">{subscriberData.mobile1 || '—'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Location:</span>
                <span className="text-sm font-semibold text-[#0A1A33]">
                  {[subscriberData.city, subscriberData.state].filter(Boolean).join(', ') || '—'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-slate-600">Status:</span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${isOnline ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                  {isOnline ? 'Online' : 'Offline'}
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
              {availablePackages.length === 0 && (
                <p className="text-sm text-slate-500">No additional packages available at the moment.</p>
              )}
              {availablePackages.map((pkg) => {
                const isCurrent = pkg.name?.startsWith(packageName);
                return (
                  <div
                    key={pkg.location_package_id}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isCurrent ? 'border-[#1E88FF] bg-blue-50' : 'border-slate-200 hover:border-[#1E88FF]'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-[#0A1A33]">{pkg.name}</h4>
                        <p className="text-xs text-slate-600">
                          {pkg.bandwidth_down}{pkg.bandwidth_down_unit}bps down • {pkg.valid_for} {pkg.validity_unit}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-[#1E88FF]">{pkg.price_after_tax}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
          <Shield size={14} />
          <span>Data fetched securely from XceedNet · Location: {xceednetApi.getLocationDomain()}</span>
        </div>
      </section>
    </div>
  );
}
