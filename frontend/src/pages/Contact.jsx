import { useState } from "react";
import { Phone, Mail, MapPin, Globe, Send } from "lucide-react";
import { toast, Toaster } from "sonner";
import PageHeader from "../components/PageHeader";
import { CONTACT } from "../data/site";

const INITIAL = { name: "", email: "", phone: "", company: "", plan: "Premium", message: "" };
const RECIPIENT_EMAIL = "contact@insightnet.in";

const ADDRESS_LINES = [
  "Block-B Aashima Royal City,",
  "Bhopal-462043,",
  "Madhya Pradesh, India",
];

export default function Contact() {
  const [form, setForm] = useState(INITIAL);
  const [sending, setSending] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = (e) => {
    e.preventDefault();
    setSending(true);

    const subject = `New enquiry from ${form.name || "website visitor"} — ${form.plan}`;
    const bodyLines = [
      `Name: ${form.name}`,
      `Email: ${form.email}`,
      `Phone: ${form.phone || "—"}`,
      `Company: ${form.company || "—"}`,
      `Interested Plan: ${form.plan}`,
      "",
      "Message:",
      form.message,
      "",
      "— Sent via insightnet.in contact form",
    ];
    const mailto = `mailto:${RECIPIENT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;

    // Open the user's default email client with pre-filled message
    window.location.href = mailto;

    toast.success("Opening your email app... please tap Send to deliver your message.");
    setTimeout(() => {
      setForm(INITIAL);
      setSending(false);
    }, 800);
  };

  return (
    <div data-testid="contact-page">
      <Toaster position="top-right" richColors />
      <PageHeader
        eyebrow="Contact"
        title="Let&apos;s connect your"
        accent="business."
        subtitle="Tell us what you need, and a network architect will respond within 24 hours with a tailored proposal."
      />

      <section className="container mx-auto px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid lg:grid-cols-5 gap-10">
          {/* Form */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-8 lg:p-10 shadow-sm">
            <h2 className="font-display text-2xl font-semibold text-[#0A1A33]">Send us a message</h2>
            <p className="mt-2 text-slate-500 text-sm">We respond to every enquiry — guaranteed.</p>

            <form onSubmit={onSubmit} className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5" data-testid="contact-form">
              <Field label="Full Name" name="name" value={form.name} onChange={onChange} required testId="contact-input-name" />
              <Field label="Email" name="email" type="email" value={form.email} onChange={onChange} required testId="contact-input-email" />
              <Field label="Phone" name="phone" value={form.phone} onChange={onChange} testId="contact-input-phone" />
              <Field label="Company" name="company" value={form.company} onChange={onChange} testId="contact-input-company" />

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold tracking-widest uppercase text-slate-500 mb-2">Interested Plan</label>
                <select
                  name="plan"
                  data-testid="contact-input-plan"
                  value={form.plan}
                  onChange={onChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-[#0A1A33] focus:border-[#1E88FF] focus:ring-2 focus:ring-[#1E88FF]/20 outline-none transition"
                >
                  <option>Basic — 50 Mbps</option>
                  <option>Premium — 100 Mbps</option>
                  <option>Ultra — 200 Mbps</option>
                  <option>Custom / Enterprise</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold tracking-widest uppercase text-slate-500 mb-2">Message</label>
                <textarea
                  name="message"
                  data-testid="contact-input-message"
                  rows="5"
                  value={form.message}
                  onChange={onChange}
                  required
                  placeholder="Tell us a bit about your connectivity needs..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-[#0A1A33] focus:border-[#1E88FF] focus:ring-2 focus:ring-[#1E88FF]/20 outline-none transition resize-none"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  data-testid="contact-submit-button"
                  disabled={sending}
                  className="btn-shine w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#0A1A33] hover:bg-[#1E88FF] disabled:opacity-60 text-white font-semibold px-8 py-4 rounded-full transition-colors"
                >
                  {sending ? "Sending..." : "Send Enquiry"}
                  <Send size={16} />
                </button>
              </div>
            </form>
          </div>

          {/* Info */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            <InfoCard icon={Phone} title="Call us" lines={[CONTACT.phone]} href={`tel:${CONTACT.phoneRaw}`} testId="contact-info-phone" />
            <InfoCard icon={Mail} title="Email" lines={[CONTACT.email]} href={`mailto:${CONTACT.email}`} testId="contact-info-email" />
            <InfoCard icon={Globe} title="Website" lines={[CONTACT.web]} href={`https://${CONTACT.web}`} testId="contact-info-web" />
            <InfoCard icon={MapPin} title="Visit us" lines={ADDRESS_LINES} testId="contact-info-address" />
          </div>
        </div>
      </section>

      {/* Map placeholder */}
      <section className="container mx-auto px-6 lg:px-8 pb-24">
        <div className="rounded-3xl overflow-hidden border border-slate-200">
          <iframe
            title="Insight Networks location"
            src="https://www.google.com/maps?q=Aashima+Royal+City+Bhopal&output=embed"
            width="100%"
            height="420"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>
    </div>
  );
}

const Field = ({ label, testId, ...props }) => (
  <div>
    <label className="block text-xs font-semibold tracking-widest uppercase text-slate-500 mb-2">{label}</label>
    <input
      {...props}
      data-testid={testId}
      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-[#0A1A33] placeholder:text-slate-400 focus:border-[#1E88FF] focus:ring-2 focus:ring-[#1E88FF]/20 outline-none transition"
    />
  </div>
);

const InfoCard = ({ icon: Icon, title, lines, href, testId }) => {
  const content = (
    <>
      <div className="w-11 h-11 rounded-xl bg-[#1E88FF]/10 flex items-center justify-center">
        <Icon size={20} className="text-[#1E88FF]" />
      </div>
      <div className="mt-4">
        <p className="text-xs font-semibold tracking-widest uppercase text-slate-500">{title}</p>
        {lines.map((l) => (
          <p key={l} className="mt-1 text-[#0A1A33] font-medium leading-relaxed">{l}</p>
        ))}
      </div>
    </>
  );
  const cls = "block bg-white border border-slate-200 rounded-2xl p-6 hover:border-[#1E88FF] hover:shadow-md transition-all";
  return href ? (
    <a href={href} data-testid={testId} className={cls}>{content}</a>
  ) : (
    <div data-testid={testId} className={cls}>{content}</div>
  );
};
