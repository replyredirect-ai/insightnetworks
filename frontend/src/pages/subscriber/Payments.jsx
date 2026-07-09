import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, RefreshCw, IndianRupee, CheckCircle2 } from "lucide-react";
import xceednetApi from "../../services/xceednetApi";

export default function Payments() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await xceednetApi.getSubscriberPayments({ length: 100 });
        setPayments(r?.data?.payments || []);
        setError(null);
      } catch (err) {
        if (err.status === 401) {
          xceednetApi.clearAuth();
          navigate("/subscriber-login");
          return;
        }
        setError(err.message || "Failed to load payments.");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const totalPaid = payments.reduce((sum, p) => {
    const n = parseFloat((p.amount || "").replace(/[^\d.]/g, ""));
    return isNaN(n) ? sum : sum + n;
  }, 0);

  return (
    <div data-testid="payments-page">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-5">
          <div className="text-xs font-semibold text-slate-500 uppercase">Total Payments</div>
          <div className="text-2xl font-bold text-[#0A1A33] mt-1">{payments.length}</div>
        </div>
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-5">
          <div className="text-xs font-semibold text-slate-500 uppercase">Total Paid</div>
          <div className="text-2xl font-bold text-[#0A1A33] mt-1 flex items-center gap-1">
            <IndianRupee size={20} className="text-slate-400" />
            {totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-5">
          <div className="text-xs font-semibold text-slate-500 uppercase">Last Payment</div>
          <div className="text-2xl font-bold text-[#0A1A33] mt-1">
            {payments[0]?.payment_date || "\u2014"}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><RefreshCw className="text-[#1E88FF] animate-spin" size={32} /></div>
        ) : payments.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <CreditCard size={40} className="mx-auto mb-3 text-slate-300" />
            <p>No payments yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="payments-table">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment #</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mode</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Received By</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-[#0A1A33]">
                      {p.payment_no || `#${p.id}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{p.payment_date || "\u2014"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-[#0A1A33]">
                      {p.amount || "\u2014"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 capitalize">
                      {(p.mode_of_payment || "").replace(/_/g, " ") || "\u2014"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {p.received_by || "\u2014"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
    </div>
  );
}
