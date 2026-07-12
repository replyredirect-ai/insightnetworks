import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LifeBuoy, Plus, RefreshCw, MessageCircle } from "lucide-react";
import xceednetApi from "../../services/xceednetApi";

function TicketStatusPill({ status }) {
  const map = {
    open: ["bg-yellow-100", "text-yellow-700"],
    in_progress: ["bg-blue-100", "text-blue-700"],
    closed: ["bg-green-100", "text-green-700"],
    resolved: ["bg-green-100", "text-green-700"],
    on_hold: ["bg-slate-100", "text-slate-600"],
  };
  const [bg, tx] = map[status] || ["bg-slate-100", "text-slate-600"];
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${bg} ${tx}`}>
      {(status || "").replace(/_/g, " ") || "unknown"}
    </span>
  );
}

function PriorityPill({ priority }) {
  const map = {
    a_low: ["bg-slate-100", "text-slate-600", "Low"],
    b_medium: ["bg-blue-100", "text-blue-700", "Medium"],
    c_high: ["bg-orange-100", "text-orange-700", "High"],
    d_urgent: ["bg-red-100", "text-red-700", "Urgent"],
  };
  const [bg, tx, label] =
    map[priority] || ["bg-slate-100", "text-slate-600", (priority || "").replace(/^[a-z]_/, "").replace(/_/g, " ") || "\u2014"];
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${bg} ${tx}`}>
      {label}
    </span>
  );
}

export default function Tickets() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const r = await xceednetApi.getSubscriberTickets({ length: 100 });
      setTickets(r?.data?.tickets || []);
      setError(null);
    } catch (err) {
      if (err.status === 401) {
        xceednetApi.clearAuth();
        navigate("/subscriber-login");
        return;
      }
      setError(err.message || "Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return (
    <div data-testid="tickets-page">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <p className="text-sm text-slate-600">
          {tickets.length} ticket{tickets.length === 1 ? "" : "s"} on record
        </p>
        <Link
          to="/subscriber-dashboard/tickets/new"
          data-testid="new-ticket-button"
          className="inline-flex items-center gap-2 bg-[#1E88FF] hover:bg-[#156cd1] text-white px-4 py-2.5 rounded-lg font-semibold transition-colors shadow-sm"
        >
          <Plus size={18} />
          New Ticket
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><RefreshCw className="text-[#1E88FF] animate-spin" size={32} /></div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <LifeBuoy size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="mb-4">You have no support tickets yet.</p>
            <Link
              to="/subscriber-dashboard/tickets/new"
              className="inline-flex items-center gap-2 bg-[#1E88FF] hover:bg-[#156cd1] text-white px-4 py-2.5 rounded-lg font-semibold"
            >
              <Plus size={18} />
              Create your first ticket
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tickets.map((t, idx) => (
              <Link
                key={t.id || idx}
                to={`/subscriber-dashboard/tickets/${t.id}`}
                data-testid={`ticket-row-${t.id}`}
                className="block px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-slate-500">#{t.ticketid || t.id}</span>
                      {t.priority && <PriorityPill priority={t.priority} />}
                      {t.status && <TicketStatusPill status={t.status} />}
                    </div>
                    <h3 className="font-semibold text-[#0A1A33] truncate">{t.subject || "(no subject)"}</h3>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><MessageCircle size={12} /> Assigned to {t.name || "Support"}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
