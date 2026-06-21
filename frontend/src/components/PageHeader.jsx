import { useEffect, useState } from "react";

export const PageHeader = ({ eyebrow, title, subtitle, accent, backgroundImage }) => {
  const [imageLoaded, setImageLoaded] = useState(!backgroundImage);

  useEffect(() => {
    if (backgroundImage) {
      const img = new Image();
      img.src = backgroundImage;
      img.onload = () => setImageLoaded(true);
    }
  }, [backgroundImage]);

  return (
    <section className="relative bg-gradient-to-br from-[#0A1A33] via-[#0F2847] to-[#0A1A33] text-white overflow-hidden min-h-[420px] flex items-center">
      {/* Background Image with Transparency */}
      {backgroundImage && (
        <>
          <div 
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0A1A33]/65 via-[#0A1A33]/55 to-[#0A1A33]/70" />
        </>
      )}
      
      <div className="absolute inset-0 glow-radial opacity-20" />
      
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
