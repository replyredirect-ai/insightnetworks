import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LifeBuoy, ArrowLeft, Send } from "lucide-react";
import xceednetApi from "../../services/xceednetApi";

const PRIORITIES = [
  { value: "a_low", label: "Low" },
  { value: "b_medium", label: "Medium" },
  { value: "c_high", label: "High" },
  { value: "d_urgent", label: "Urgent" },
];

export default function TicketNew() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ subject: "", description: "", priority: "a_low" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      setError("Please provide both a subject and a description.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const r = await xceednetApi.createSubscriberTicket({
        subject: form.subject.trim(),
        description: form.description.trim(),
        priority: form.priority,
      });
      const id = r?.data?.id;
      if (id) {
        navigate(`/subscriber/tickets/${id}`);
      } else {
        navigate("/subscriber/tickets");
      }
    } catch (err) {
      if (err.status === 401) {
        xceednetApi.clearAuth();
        navigate("/subscriber-login");
        return;
      }
      setError(err.message || "Failed to create ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl" data-testid="ticket-new-page">
      <Link
        to="/subscriber/tickets"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1E88FF] mb-4"
      >
        <ArrowLeft size={16} />
        Back to tickets
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-[#0A1A33] flex items-center gap-3">
          <LifeBuoy className="text-orange-600" size={28} />
          New Support Ticket
        </h1>
        <p className="text-slate-600 mt-1">Tell us how we can help</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border-2 border-slate-200 rounded-2xl p-6 space-y-5"
        data-testid="ticket-new-form"
      >
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <div>
          <label htmlFor="subject" className="block text-sm font-semibold text-[#0A1A33] mb-2">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            id="subject"
            name="subject"
            value={form.subject}
            onChange={handleChange}
            required
            maxLength={120}
            data-testid="ticket-subject"
            placeholder="Brief summary of your issue"
            className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:border-[#1E88FF] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="priority" className="block text-sm font-semibold text-[#0A1A33] mb-2">Priority</label>
          <select
            id="priority"
            name="priority"
            value={form.priority}
            onChange={handleChange}
            data-testid="ticket-priority"
            className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:border-[#1E88FF] focus:outline-none bg-white"
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-[#0A1A33] mb-2">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            required
            rows={6}
            data-testid="ticket-description"
            placeholder="Describe your issue in detail..."
            className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:border-[#1E88FF] focus:outline-none resize-y"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Link
            to="/subscriber/tickets"
            className="px-4 py-2.5 border-2 border-slate-300 text-slate-700 hover:border-slate-400 rounded-lg font-semibold"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            data-testid="submit-ticket"
            className="inline-flex items-center gap-2 bg-[#1E88FF] hover:bg-[#156cd1] disabled:bg-slate-400 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors"
          >
            <Send size={16} />
            {submitting ? "Submitting..." : "Submit Ticket"}
          </button>
        </div>
      </form>
    </div>
  );
}
