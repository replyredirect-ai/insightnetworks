export const PageHeader = ({ eyebrow, title, subtitle, accent }) => {
  return (
    <section className="relative bg-gradient-to-br from-[#0A1A33] via-[#0F2847] to-[#0A1A33] text-white overflow-hidden min-h-[420px] flex items-center">
      <div className="absolute inset-0 glow-radial opacity-80" />
      <div className="absolute inset-0 dot-grid opacity-20" />
      
      {/* Glass-morphism Banner Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="glass-banner-overlay w-full max-w-7xl mx-6 lg:mx-8 h-[85%] rounded-3xl border border-white/10 backdrop-blur-sm bg-white/5 shadow-2xl shadow-black/20"></div>
      </div>
      
      <div className="container mx-auto px-6 lg:px-8 relative py-24 lg:py-32">
        <div className="max-w-3xl">
          {eyebrow && (
            <span className="inline-flex items-center gap-2 text-[#1E88FF] text-xs font-semibold tracking-[0.25em] uppercase">
              <span className="h-px w-8 bg-[#1E88FF]" />
              {eyebrow}
            </span>
          )}
          <h1 className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
            {title} {accent && <span className="text-[#1E88FF]">{accent}</span>}
          </h1>
          {subtitle && (
            <p className="mt-6 text-lg text-slate-300 leading-relaxed max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default PageHeader;
