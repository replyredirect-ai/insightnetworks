import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, LifeBuoy, RefreshCw, Send, User, Shield } from "lucide-react";
import xceednetApi from "../../services/xceednetApi";

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replyMsg, setReplyMsg] = useState("");
  const [sending, setSending] = useState(false);

  const fetchTicket = useCallback(async () => {
    try {
      setLoading(true);
      const r = await xceednetApi.getSubscriberTicket(id);
      setTicket(r?.data?.ticket || null);
      setReplies(r?.data?.replies || []);
      setError(null);
    } catch (err) {
      if (err.status === 401) {
        xceednetApi.clearAuth();
        navigate("/subscriber-login");
        return;
      }
      setError(err.message || "Failed to load ticket.");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyMsg.trim()) return;
    setSending(true);
    try {
      await xceednetApi.replySubscriberTicket(id, replyMsg.trim());
      setReplyMsg("");
      await fetchTicket();
    } catch (err) {
      setError(err.message || "Failed to send reply.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-24"><RefreshCw className="text-[#1E88FF] animate-spin" size={32} /></div>;
  }

  if (!ticket) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center">
        <p className="text-red-700 mb-4">{error || "Ticket not found"}</p>
        <Link to="/subscriber-dashboard/tickets" className="text-[#1E88FF] font-semibold hover:underline">Back to tickets</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl" data-testid="ticket-detail-page">
      <Link to="/subscriber-dashboard/tickets" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1E88FF] mb-4">
        <ArrowLeft size={16} />
        Back to tickets
      </Link>

      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <div className="font-mono text-xs text-slate-500 mb-1">#{ticket.ticketid || ticket.id}</div>
            <h1 className="text-2xl font-display font-bold text-[#0A1A33]">{ticket.subject}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700 capitalize">
              {(ticket.status || "open").replace(/_/g, " ")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="text-xs text-slate-500 uppercase">Priority</div>
            <div className="text-sm font-semibold text-[#0A1A33] capitalize">
              {(ticket.priority || "").replace(/^[a-z]_/, "") || "Normal"}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase">Created</div>
            <div className="text-sm font-semibold text-[#0A1A33]">
              {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : "\u2014"}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase">Due By</div>
            <div className="text-sm font-semibold text-[#0A1A33]">
              {ticket.due_by ? new Date(ticket.due_by).toLocaleDateString() : "\u2014"}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase">Assigned</div>
            <div className="text-sm font-semibold text-[#0A1A33] truncate">Support</div>
          </div>
        </div>

        {ticket.description && (
          <div className="mt-4">
            <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Original description</div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
          </div>
        )}
      </div>

      {/* Reply thread */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-[#0A1A33] mb-4 flex items-center gap-2">
          <LifeBuoy size={18} className="text-orange-600" />
          Conversation ({replies.length})
        </h2>

        {replies.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">No conversation yet. Add your first reply below.</p>
        ) : (
          <div className="space-y-4" data-testid="ticket-replies">
            {replies.map((r, idx) => {
              const isSubscriber = r.author === "subscriber";
              return (
                <div key={r.id || idx} className={`flex gap-3 ${isSubscriber ? "" : "flex-row-reverse"}`}>
                  <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center ${isSubscriber ? "bg-[#1E88FF]/10" : "bg-orange-100"}`}>
                    {isSubscriber ? <User size={16} className="text-[#1E88FF]" /> : <Shield size={16} className="text-orange-600" />}
                  </div>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${isSubscriber ? "bg-slate-100 text-slate-800" : "bg-blue-50 text-slate-800"}`}>
                    <div className="text-xs font-semibold mb-1 flex items-center justify-between gap-3">
                      <span className={isSubscriber ? "text-[#1E88FF]" : "text-orange-600"}>
                        {isSubscriber ? "You" : "Support Team"}
                      </span>
                      <span className="text-slate-400 font-normal">
                        {r.created_at ? new Date(r.created_at).toLocaleString() : ""}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{r.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reply form */}
      <form
        onSubmit={handleReply}
        className="bg-white border-2 border-slate-200 rounded-2xl p-6"
        data-testid="ticket-reply-form"
      >
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}
        <label htmlFor="reply" className="block text-sm font-semibold text-[#0A1A33] mb-2">
          Add a reply
        </label>
        <textarea
          id="reply"
          value={replyMsg}
          onChange={(e) => setReplyMsg(e.target.value)}
          rows={3}
          data-testid="ticket-reply-input"
          placeholder="Type your reply here..."
          className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:border-[#1E88FF] focus:outline-none resize-y"
        />
        <div className="flex justify-end mt-3">
          <button
            type="submit"
            disabled={sending || !replyMsg.trim()}
            data-testid="submit-reply"
            className="inline-flex items-center gap-2 bg-[#1E88FF] hover:bg-[#156cd1] disabled:bg-slate-400 text-white px-5 py-2 rounded-lg font-semibold transition-colors"
          >
            <Send size={16} />
            {sending ? "Sending..." : "Send Reply"}
          </button>
        </div>
      </form>
    </div>
  );
}
