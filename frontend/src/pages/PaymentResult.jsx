import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw, ArrowRight,
  IndianRupee, Home, FileText,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import xceednetApi from "../services/xceednetApi";

const BANNER_BG =
  "https://images.unsplash.com/photo-1520869562399-e772f042f422?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHRlY2hub2xvZ3klMjBkYXNoYm9hcmR8ZW58MHx8fGJsdWV8MTc4MjMxOTM4Nnww&ixlib=rb-4.1.0&q=85";

function StatusPanel({ status }) {
  const map = {
    Success: {
      Icon: CheckCircle2, tone: "green",
      title: "Payment Successful",
      subtitle: "Thank you! Your payment has been received.",
    },
    Failure: {
      Icon: XCircle, tone: "red",
      title: "Payment Failed",
      subtitle: "We couldn’t complete your payment. Please try again or use a different method.",
    },
    Aborted: {
      Icon: AlertTriangle, tone: "amber",
      title: "Payment Cancelled",
      subtitle: "You cancelled the payment before it completed.",
    },
    Invalid: {
      Icon: AlertTriangle, tone: "red",
      title: "Payment Invalid",
      subtitle: "Something looked off with this transaction. Please contact support.",
    },
    Initiated: {
      Icon: Clock, tone: "blue",
      title: "Payment Pending",
      subtitle: "We haven’t received a confirmation yet. If you completed the payment, it will reflect here shortly.",
    },
  };
  const info = map[status] || map.Invalid;
  const toneClasses = {
    green: ["bg-green-100", "text-green-700", "border-green-200"],
    red: ["bg-red-100", "text-red-700", "border-red-200"],
    amber: ["bg-amber-100", "text-amber-700", "border-amber-200"],
    blue: ["bg-blue-100", "text-blue-700", "border-blue-200"],
  }[info.tone];
  const [bg, tx, bd] = toneClasses;
  const Icon = info.Icon;

  return (
    <div className={`border-2 ${bd} ${bg} rounded-2xl p-8 text-center`}>
      <div className={`w-16 h-16 mx-auto rounded-full ${bg} flex items-center justify-center mb-4`}>
        <Icon size={40} className={tx} />
      </div>
      <h2 className={`text-2xl font-display font-bold ${tx}`}>{info.title}</h2>
      <p className="text-slate-700 mt-2">{info.subtitle}</p>
    </div>
  );
}

export default function PaymentResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const orderId = params.get("order_id") || "";
  const initialStatus = params.get("status") || "Invalid";
  const message = params.get("message") || "";

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!xceednetApi.isAuthenticated() || xceednetApi.getUserType() !== "subscriber") {
      navigate("/subscriber-login");
      return;
    }
    if (!orderId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const r = await xceednetApi.getPayment(orderId);
        setPayment(r?.data || null);
      } catch (e) {
        setError(e.message || "Payment not found");
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId, navigate]);

  const status = payment?.status || initialStatus;
  const amount = payment?.amount ?? null;
  const kind = payment?.kind;
  const invoiceNo = payment?.invoice_no;
  const tracking = payment?.tracking_id;
  const bankRef = payment?.bank_ref_no;
  const paymentMode = payment?.payment_mode;
  const failureMsg = payment?.failure_message || message;
  const xceednetSync = payment?.xceednet_sync;

  return (
    <div>
      <PageHeader
        eyebrow="PAYMENT"
        title="Transaction"
        accent="Receipt"
        subtitle="Your payment status is shown below. A copy of the receipt is available in your Payment History."
        backgroundImage={BANNER_BG}
      />
      <section className="bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-10 py-10" data-testid="payment-result">
          {loading ? (
            <div className="flex justify-center py-16">
              <RefreshCw size={40} className="text-[#1E88FF] animate-spin" />
            </div>
          ) : (
            <>
              <StatusPanel status={status} />

              <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 mt-6">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                  Transaction Details
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <dt className="text-sm text-slate-600">Order ID</dt>
                    <dd className="text-sm font-semibold text-[#0A1A33] font-mono">{orderId || "—"}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <dt className="text-sm text-slate-600">Status</dt>
                    <dd className="text-sm font-semibold text-[#0A1A33]">{status}</dd>
                  </div>
                  {amount != null && (
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <dt className="text-sm text-slate-600">Amount</dt>
                      <dd className="text-sm font-semibold text-[#0A1A33] flex items-center gap-0.5">
                        <IndianRupee size={14} className="text-slate-400" />
                        {Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </dd>
                    </div>
                  )}
                  {kind && (
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <dt className="text-sm text-slate-600">Type</dt>
                      <dd className="text-sm font-semibold text-[#0A1A33] capitalize">{kind}</dd>
                    </div>
                  )}
                  {invoiceNo && (
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <dt className="text-sm text-slate-600">Invoice</dt>
                      <dd className="text-sm font-semibold text-[#0A1A33]">{invoiceNo}</dd>
                    </div>
                  )}
                  {tracking && (
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <dt className="text-sm text-slate-600">CCAvenue Ref</dt>
                      <dd className="text-sm font-semibold text-[#0A1A33] font-mono">{tracking}</dd>
                    </div>
                  )}
                  {bankRef && (
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <dt className="text-sm text-slate-600">Bank Ref</dt>
                      <dd className="text-sm font-semibold text-[#0A1A33] font-mono">{bankRef}</dd>
                    </div>
                  )}
                  {paymentMode && (
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <dt className="text-sm text-slate-600">Payment Mode</dt>
                      <dd className="text-sm font-semibold text-[#0A1A33]">{paymentMode}</dd>
                    </div>
                  )}
                </dl>

                {failureMsg && status !== "Success" && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <b>Reason:</b> {failureMsg}
                  </div>
                )}

                {status === "Success" && xceednetSync?.attempted && (
                  <div className={`mt-4 p-3 rounded-lg text-sm ${xceednetSync.success ? "bg-green-50 border border-green-200 text-green-700" : "bg-amber-50 border border-amber-200 text-amber-700"}`}>
                    <b>Account update:</b>{" "}
                    {xceednetSync.success
                      ? "Your invoice has been marked as paid on our system."
                      : `${xceednetSync.message || "Your payment is recorded but the account sync is pending — our team will reconcile it shortly."}`}
                  </div>
                )}

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3 mt-6">
                <Link
                  to="/subscriber-dashboard"
                  className="inline-flex items-center gap-2 bg-[#1E88FF] hover:bg-[#156cd1] text-white px-5 py-3 rounded-full font-semibold shadow-sm"
                >
                  <Home size={16} />
                  Back to Dashboard
                </Link>
                <Link
                  to="/subscriber-dashboard/payments"
                  className="inline-flex items-center gap-2 border-2 border-[#1E88FF] text-[#1E88FF] hover:bg-[#1E88FF] hover:text-white px-5 py-3 rounded-full font-semibold"
                >
                  <FileText size={16} />
                  View Payment History
                  <ArrowRight size={14} />
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
