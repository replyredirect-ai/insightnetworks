import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Wifi, CreditCard, Package, Calendar, Download, Upload, Activity, Clock,
  RefreshCw, FileText, ArrowRight, User, IndianRupee, CheckCircle2, TrendingUp,
  Wallet, Plus,
} from "lucide-react";
import xceednetApi from "../../services/xceednetApi";

function StatusPill({ status }) {
  const map = {
    payment_received: ["bg-green-100", "text-green-700", "Paid"],
    open: ["bg-yellow-100", "text-yellow-700", "Open"],
    payment_pending: ["bg-yellow-100", "text-yellow-700", "Pending"],
    overdue: ["bg-red-100", "text-red-700", "Overdue"],
    voided: ["bg-slate-100", "text-slate-600", "Voided"],
    canceled: ["bg-slate-100", "text-slate-600", "Canceled"],
    closed: ["bg-green-100", "text-green-700", "Closed"],
  };
  const [bg, tx, label] =
    map[(status || "").toLowerCase()] || ["bg-slate-100", "text-slate-600", (status || "").replace(/_/g, " ")];
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${bg} ${tx} capitalize whitespace-nowrap`}>
      {label}
    </span>
  );
}

export default function Overview() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingStatement, setDownloadingStatement] = useState(false);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);
  const [payingInvoiceId, setPayingInvoiceId] = useState(null);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [rechargeLoading, setRechargeLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [p, i, pay] = await Promise.all([
          xceednetApi.getSubscriberDashboard(),
          xceednetApi.getSubscriberInvoices({ length: 100 }),
          xceednetApi.getSubscriberPayments({ length: 100 }),
        ]);
        setProfile(p?.data || p);
        setInvoices(i?.data?.invoices || []);
        setPayments(pay?.data?.payments || []);
        setError(null);
      } catch (err) {
        if (err.status === 401) {
          xceednetApi.clearAuth();
          navigate("/subscriber-login");
          return;
        }
        setError(err.message || "Failed to load account overview.");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const handleDownloadStatement = async () => {
    setDownloadingStatement(true);
    try {
      const filename = `AccountStatement-${profile?.account_no || "insight"}-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      await xceednetApi.downloadAccountStatement(filename);
    } catch (err) {
      setError(err.message || "Failed to download statement.");
    } finally {
      setDownloadingStatement(false);
    }
  };

  const handleDownloadInvoice = async (inv) => {
    setDownloadingInvoiceId(inv.id);
    try {
      await xceednetApi.downloadInvoicePdf(inv.id, `Invoice-${inv.invoice_no || inv.id}.pdf`);
    } catch (err) {
      setError(err.message || "Failed to download invoice.");
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const handlePayInvoice = async (inv) => {
    setPayingInvoiceId(inv.id);
    setError(null);
    try {
      const r = await xceednetApi.initiatePayment({ kind: "invoice", invoice_id: inv.id });
      if (r?.enc_request && r?.transaction_url && r?.access_code) {
        xceednetApi.submitCCavenueForm({
          transaction_url: r.transaction_url,
          enc_request: r.enc_request,
          access_code: r.access_code,
        });
      } else {
        throw new Error("Could not initiate payment.");
      }
    } catch (err) {
      setError(err.message || "Could not initiate payment.");
      setPayingInvoiceId(null);
    }
  };

  const handleRecharge = async (amountValue) => {
    const amount = parseFloat(amountValue);
    if (!amount || amount < 10) {
      setError("Please enter a recharge amount of at least \u20b910.");
      return;
    }
    setError(null);
    setRechargeLoading(true);
    try {
      const r = await xceednetApi.initiatePayment({
        kind: "recharge", amount, remark: "Account recharge",
      });
      if (r?.enc_request && r?.transaction_url && r?.access_code) {
        xceednetApi.submitCCavenueForm({
          transaction_url: r.transaction_url,
          enc_request: r.enc_request,
          access_code: r.access_code,
        });
      } else {
        throw new Error("Could not initiate recharge.");
      }
    } catch (err) {
      setError(err.message || "Could not initiate recharge.");
      setRechargeLoading(false);
    }
  };

  const isPayable = (inv) => {
    const s = (inv.status || "").toLowerCase();
    return s === "open" || s === "payment_pending" || s === "overdue";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="overview-loading">
        <RefreshCw size={40} className="text-[#1E88FF] animate-spin" />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center">
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

  const data = profile || {};
  const ipAddress =
    Array.isArray(data.subscriber_ip_addresses) && data.subscriber_ip_addresses.length > 0
      ? data.subscriber_ip_addresses[0]?.fix_ip_address || "\u2014"
      : "\u2014";
  const isOnline = !!data.is_online;
  const packageName = data.location_package_name || "N/A";
  const packageDataLimit = data.location_package_display_data || "Unlimited Data";

  const daysRemaining = () => {
    if (!data.expires_at) return 0;
    const diff = Math.ceil((new Date(data.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const totalPaid = payments.reduce((sum, p) => {
    const n = parseFloat((p.amount || "").replace(/[^\d.]/g, ""));
    return isNaN(n) ? sum : sum + n;
  }, 0);
  const totalInvoiced = invoices.reduce((sum, i) => {
    const n = parseFloat((i.amount || "").replace(/[^\d.]/g, ""));
    return isNaN(n) ? sum : sum + n;
  }, 0);

  return (
    <div className="space-y-8" data-testid="overview-page">
      {/* Welcome + Download Statement CTA */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 lg:p-8 shadow-sm flex flex-col lg:flex-row items-start lg:items-center gap-6">
        <div className="flex-1">
          <h2 className="text-2xl lg:text-3xl font-display font-bold text-[#0A1A33]">
            Welcome back, {data.name || data.username || "Subscriber"}.
          </h2>
          <p className="text-slate-600 mt-1.5">
            Last login {data.last_login_at ? new Date(data.last_login_at).toLocaleString() : "recently"} &middot; Package: <b>{packageName}</b>
          </p>
        </div>
        <button
          onClick={handleDownloadStatement}
          disabled={downloadingStatement}
          data-testid="download-statement-button"
          className="inline-flex items-center gap-2 bg-[#1E88FF] hover:bg-[#156cd1] disabled:bg-slate-400 text-white font-semibold px-5 py-3 rounded-full shadow-lg shadow-[#1E88FF]/25 hover:shadow-xl transition-all whitespace-nowrap"
        >
          {downloadingStatement ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              Preparing PDF...
            </>
          ) : (
            <>
              <Download size={18} />
              Download Account Statement
            </>
          )}
        </button>
      </div>

      {/* Recharge / Top-up */}
      <div className="bg-gradient-to-r from-[#0A1A33] to-[#1E88FF] rounded-2xl p-6 lg:p-8 shadow-lg text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              <Wallet size={28} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Recharge your account</h3>
              <p className="text-white/80 text-sm mt-1">
                Add funds instantly via UPI, cards, wallets or net-banking. Processed securely by CCAvenue.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {[500, 1000, 2000].map((amt) => (
              <button
                key={amt}
                onClick={() => handleRecharge(amt)}
                disabled={rechargeLoading}
                data-testid={`quick-recharge-${amt}`}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                &#8377;{amt}
              </button>
            ))}
            <div className="flex items-center bg-white rounded-lg overflow-hidden shadow-sm">
              <span className="pl-3 pr-1 text-[#0A1A33] font-semibold text-sm">&#8377;</span>
              <input
                type="number"
                min="10"
                step="1"
                placeholder="Custom"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                data-testid="recharge-custom-amount"
                className="w-24 py-2 px-1 text-[#0A1A33] focus:outline-none text-sm"
              />
              <button
                onClick={() => handleRecharge(rechargeAmount)}
                disabled={rechargeLoading}
                data-testid="recharge-submit"
                className="px-4 py-2 bg-[#0A1A33] hover:bg-black text-white font-semibold text-sm disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {rechargeLoading ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Plus size={14} />
                )}
                Recharge
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
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
          <p className="text-2xl font-bold text-[#0A1A33]">{data.balance_amount_human || "\u20b90.00"}</p>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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

      {/* Financial summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoices</div>
          <div className="text-3xl font-bold text-[#0A1A33] mt-2">{invoices.length}</div>
          <div className="text-sm text-slate-500 mt-1">Since account activation</div>
        </div>
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount Invoiced</div>
          <div className="text-3xl font-bold text-[#0A1A33] mt-2 flex items-center gap-0.5">
            <IndianRupee size={22} className="text-slate-400" />
            {totalInvoiced.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-sm text-slate-500 mt-1">All time</div>
        </div>
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount Paid</div>
          <div className="text-3xl font-bold text-green-700 mt-2 flex items-center gap-0.5">
            <IndianRupee size={22} className="text-green-500" />
            {totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-sm text-slate-500 mt-1">All time</div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      {/* Invoices section */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileText className="text-[#1E88FF]" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0A1A33]">Invoices</h2>
              <p className="text-xs text-slate-500">{invoices.length} invoice{invoices.length === 1 ? "" : "s"} on record</p>
            </div>
          </div>
          <Link
            to="/subscriber-dashboard/invoices"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#1E88FF] hover:text-[#156cd1]"
          >
            View all
            <ArrowRight size={14} />
          </Link>
        </div>
        {invoices.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No invoices yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="overview-invoices-table">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Invoice</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Due By</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 whitespace-nowrap font-semibold text-[#0A1A33]">
                      {inv.invoice_no || `#${inv.id}`}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-sm text-slate-600">{inv.invoice_date || "\u2014"}</td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-sm text-slate-600">{inv.due_by || "\u2014"}</td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right font-semibold text-[#0A1A33]">
                      {inv.amount || "\u2014"}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap"><StatusPill status={inv.status} /></td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-2">
                        {isPayable(inv) && (
                          <button
                            onClick={() => handlePayInvoice(inv)}
                            disabled={payingInvoiceId === inv.id}
                            data-testid={`ov-pay-invoice-${inv.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1E88FF] hover:bg-[#156cd1] text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm"
                          >
                            {payingInvoiceId === inv.id ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <CreditCard size={12} />
                            )}
                            Pay
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadInvoice(inv)}
                          disabled={downloadingInvoiceId === inv.id}
                          data-testid={`download-invoice-${inv.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-[#1E88FF] text-[#1E88FF] hover:bg-[#1E88FF] hover:text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {downloadingInvoiceId === inv.id ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <Download size={12} />
                          )}
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payments section */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <CreditCard className="text-purple-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0A1A33]">Payment History</h2>
              <p className="text-xs text-slate-500">{payments.length} payment{payments.length === 1 ? "" : "s"} on record</p>
            </div>
          </div>
          <Link
            to="/subscriber-dashboard/payments"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#1E88FF] hover:text-[#156cd1]"
          >
            View all
            <ArrowRight size={14} />
          </Link>
        </div>
        {payments.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No payments yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="overview-payments-table">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Payment #</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Mode</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Received By</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 whitespace-nowrap font-semibold text-[#0A1A33]">
                      {p.payment_no || `#${p.id}`}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-sm text-slate-600">{p.payment_date || "\u2014"}</td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right font-semibold text-[#0A1A33]">
                      {p.amount || "\u2014"}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-sm text-slate-600 capitalize">
                      {(p.mode_of_payment || "").replace(/_/g, " ") || "\u2014"}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-slate-600">{p.received_by || "\u2014"}</td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                        <CheckCircle2 size={12} />
                        {p.status || "\u2014"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Account info */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-[#0A1A33] mb-4 flex items-center gap-2">
          <User size={20} className="text-[#1E88FF]" />
          Account Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
          {[
            ["Username", data.username],
            ["Account No", data.account_no],
            ["Email", data.email],
            ["Mobile", data.mobile1],
            ["Location", [data.city, data.state].filter(Boolean).join(", ")],
            ["Status", isOnline ? "Online" : "Offline"],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
              <span className="text-sm text-slate-600">{label}</span>
              <span className="text-sm font-semibold text-[#0A1A33] text-right">{val || "\u2014"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
