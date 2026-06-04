import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

export const CtaBanner = () => {
  return (
    <section className="container mx-auto px-6 lg:px-8 py-20 lg:py-28">
      <div data-testid="cta-banner" className="relative overflow-hidden rounded-3xl bg-[#0A1A33] text-white p-10 lg:p-16">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#1E88FF]/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#1E88FF]/20 rounded-full blur-3xl" />
        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
              Let&apos;s build a <span className="text-[#1E88FF]">stronger connected</span> future together.
            </h2>
            <p className="mt-4 text-slate-300 text-base">
              Talk to our network architects and get a tailored connectivity blueprint within 24 hours.
            </p>
          </div>
          <Link
            to="/contact"
            data-testid="cta-banner-button"
            className="btn-shine inline-flex items-center gap-2 bg-[#1E88FF] hover:bg-[#156cd1] text-white text-base font-semibold px-7 py-4 rounded-full transition-colors shrink-0"
          >
            Get Connected Today
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CtaBanner;
