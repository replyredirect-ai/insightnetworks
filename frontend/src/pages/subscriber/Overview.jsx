import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity, Wifi, CreditCard, Package, Calendar, TrendingUp,
  Download, Upload, Clock, RefreshCw, User, FileText, LifeBuoy
} from "lucide-react";
import { Link } from "react-router-dom";
import xceednetApi from "../../services/xceednetApi";

export default function Overview() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const r = await xceednetApi.getSubscriberDashboard();
        setData(r?.data || r);
        setError(null);
      } catch (err) {
        if (err.status === 401) {
          xceednetApi.clearAuth();
          navigate("/subscriber-login");
          return;
        }
        setError(err.message || "Failed to load overview.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="overview-loading">
        <RefreshCw size={40} className="text-[#1E88FF] animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center" data-testid="overview-error">
        <p className="text-red-700 mb-4">{error || "Unable to load overview"}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-[#1E88FF] hover:bg-[#156cd1] text-white px-6 py-3 rounded-full"
        >
          Retry
        </button>
      </div>
    );
  }

  const ipAddress =
    Array.isArray(data.subscriber_ip_addresses) && data.subscriber_ip_addresses.length > 0
      ? data.subscriber_ip_addresses[0]?.fix_ip_address || "\u2014"
      : "\u2014";
  const isOnline = !!data.is_online;
  const packageName = data.location_package_name || "N/A";
  const packageDataLimit = data.location_package_display_data || "Unlimited Data";

  const daysRemaining = () => {
    if (!data.expires_at) return 0;
    const expiry = new Date(data.expires_at);
    const today = new Date();
    const diff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <div data-testid="overview-page">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-[#0A1A33]">
          Welcome back, {data.name || data.username || "User"}
        </h1>
        <p className="text-slate-600 mt-1">
          Last login: {data.last_login_at ? new Date(data.last_login_at).toLocaleString() : "N/A"}
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isOnline ? "bg-green-100" : "bg-slate-100"}`}>
              <Wifi className={isOnline ? "text-green-600" : "text-slate-500"} size={24} />
            </div>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${isOnline ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"}`}>
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-slate-600 mb-1">Connection</h3>
          <p className="text-lg font-bold text-[#0A1A33]">
            {(data.status || "Active").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          </p>
          <p className="text-xs text-slate-500 mt-2">IP: {ipAddress}</p>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
            <Package className="text-[#1E88FF]" size={24} />
          </div>
          <h3 className="text-sm font-semibold text-slate-600 mb-1">Current Package</h3>
          <p className="text-lg font-bold text-[#0A1A33]">{packageName}</p>
          <p className="text-xs text-slate-500 mt-2">{packageDataLimit}</p>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
            <CreditCard className="text-purple-600" size={24} />
          </div>
          <h3 className="text-sm font-semibold text-slate-600 mb-1">Balance</h3>
          <p className="text-2xl font-bold text-[#0A1A33]">{data.balance_amount_human || "\u2014"}</p>
          <p className="text-xs text-green-600 mt-2">
            {(data.balance_amount_cents ?? 0) > 0 ? "Amount due" : "No pending dues"}
          </p>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mb-4">
            <Calendar className="text-orange-600" size={24} />
          </div>
          <h3 className="text-sm font-semibold text-slate-600 mb-1">Validity</h3>
          <p className="text-2xl font-bold text-[#0A1A33]">{daysRemaining()} Days</p>
          <p className="text-xs text-slate-500 mt-2">
            Expires: {data.expires_at ? new Date(data.expires_at).toLocaleDateString() : "\u2014"}
          </p>
        </div>
      </div>

      {/* Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-blue-900">Today&apos;s Usage</h3>
            <Activity className="text-blue-600" size={20} />
          </div>
          <p className="text-3xl font-bold text-blue-900 mb-2">{data.data_used_today_human || "0 Bytes"}</p>
          <div className="flex items-center gap-2 text-xs text-blue-700">
            <Clock size={14} />
            <span>{data.package_time_used_today || "0 Hours"} session time</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-purple-900">This Month</h3>
            <TrendingUp className="text-purple-600" size={20} />
          </div>
          <p className="text-3xl font-bold text-purple-900 mb-2">{data.data_used_monthly_human || "0 Bytes"}</p>
          <div className="space-y-1 mt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-purple-700 flex items-center gap-1"><Upload size={12} /> Upload</span>
              <span className="font-semibold text-purple-900">{data.bytes_uploaded_monthly_human || "0 Bytes"}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-purple-700 flex items-center gap-1"><Download size={12} /> Download</span>
              <span className="font-semibold text-purple-900">{data.bytes_downloaded_monthly_human || "0 Bytes"}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-green-900">Total Usage</h3>
            <Activity className="text-green-600" size={20} />
          </div>
          <p className="text-3xl font-bold text-green-900 mb-2">{data.data_used_total_human || "0 Bytes"}</p>
          <p className="text-xs text-green-700">Since account activation</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <Link to="/subscriber/invoices" className="bg-white border-2 border-slate-200 rounded-2xl p-6 hover:border-[#1E88FF] hover:shadow-md transition-all">
          <FileText size={28} className="text-[#1E88FF] mb-3" />
          <div className="font-semibold text-[#0A1A33]">View Invoices</div>
          <div className="text-xs text-slate-500 mt-1">Download GST invoices as PDF</div>
        </Link>
        <Link to="/subscriber/payments" className="bg-white border-2 border-slate-200 rounded-2xl p-6 hover:border-[#1E88FF] hover:shadow-md transition-all">
          <CreditCard size={28} className="text-purple-600 mb-3" />
          <div className="font-semibold text-[#0A1A33]">Payment History</div>
          <div className="text-xs text-slate-500 mt-1">Track all your past payments</div>
        </Link>
        <Link to="/subscriber/tickets" className="bg-white border-2 border-slate-200 rounded-2xl p-6 hover:border-[#1E88FF] hover:shadow-md transition-all">
          <LifeBuoy size={28} className="text-orange-600 mb-3" />
          <div className="font-semibold text-[#0A1A33]">Support Tickets</div>
          <div className="text-xs text-slate-500 mt-1">Get help from our team</div>
        </Link>
      </div>

      {/* Account information */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-[#0A1A33] mb-4 flex items-center gap-2">
          <User size={20} className="text-[#1E88FF]" />
          Account Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          {[
            ["Username", data.username],
            ["Account No", data.account_no],
            ["Email", data.email],
            ["Mobile", data.mobile1],
            ["Location", [data.city, data.state].filter(Boolean).join(", ")],
            ["Status", isOnline ? "Online" : "Offline"],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
              <span className="text-sm text-slate-600">{label}:</span>
              <span className="text-sm font-semibold text-[#0A1A33] text-right">{val || "\u2014"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
