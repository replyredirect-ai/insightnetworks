import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Download, RefreshCw, Search, IndianRupee } from "lucide-react";
import xceednetApi from "../../services/xceednetApi";

function StatusPill({ status }) {
  const map = {
    payment_received: ["bg-green-100", "text-green-700", "Paid"],
    open: ["bg-yellow-100", "text-yellow-700", "Open"],
    payment_pending: ["bg-yellow-100", "text-yellow-700", "Pending"],
    overdue: ["bg-red-100", "text-red-700", "Overdue"],
    voided: ["bg-slate-100", "text-slate-600", "Voided"],
  };
  const [bg, tx, label] =
    map[status] || ["bg-slate-100", "text-slate-600", (status || "").replace(/_/g, " ")];
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${bg} ${tx} capitalize`}>
      {label}
    </span>
  );
}

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchInvoices = async (search = "") => {
    try {
      setLoading(true);
      const r = await xceednetApi.getSubscriberInvoices({ q: search, length: 100 });
      const list = r?.data?.invoices || [];
      setInvoices(list);
      setTotal(r?.data?.filtered ?? list.length);
      setError(null);
    } catch (err) {
      if (err.status === 401) {
        xceednetApi.clearAuth();
        navigate("/subscriber-login");
        return;
      }
      setError(err.message || "Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchInvoices(q);
  };

  const handleDownload = async (inv) => {
    setDownloadingId(inv.id);
    try {
      await xceednetApi.downloadInvoicePdf(inv.id, `Invoice-${inv.invoice_no || inv.id}.pdf`);
    } catch (err) {
      setError(err.message || "Failed to download invoice PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div data-testid="invoices-page">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <p className="text-sm text-slate-600">
          {total > 0 ? `Showing ${total} invoice${total === 1 ? "" : "s"} in your account` : "Your billing history"}
        </p>
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search invoice #, amount..."
              data-testid="invoice-search-input"
              className="pl-9 pr-4 py-2 border-2 border-slate-200 rounded-lg text-sm focus:border-[#1E88FF] focus:outline-none w-64 bg-white"
            />
          </div>
        </form>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><RefreshCw className="text-[#1E88FF] animate-spin" size={32} /></div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <FileText size={40} className="mx-auto mb-3 text-slate-300" />
            <p>No invoices found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="invoices-table">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due By</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-[#0A1A33]">{inv.invoice_no || `#${inv.id}`}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{inv.invoice_date || "\u2014"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{inv.due_by || "\u2014"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-[#0A1A33] flex items-center justify-end gap-0.5">
                      <IndianRupee size={14} className="text-slate-400" />
                      <span>{(inv.amount || "").replace(/^\u20b9/, "")}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap"><StatusPill status={inv.status} /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleDownload(inv)}
                        disabled={downloadingId === inv.id}
                        data-testid={`download-invoice-${inv.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-[#1E88FF] text-[#1E88FF] hover:bg-[#1E88FF] hover:text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {downloadingId === inv.id ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Download size={14} />
                        )}
                        PDF
                      </button>
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
