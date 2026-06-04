import { Link } from "react-router-dom";

export const Logo = ({ variant = "dark", showTagline = true, className = "" }) => {
  const textColor = variant === "dark" ? "text-[#0A1A33]" : "text-white";
  const subColor = variant === "dark" ? "text-slate-500" : "text-slate-300";

  return (
    <Link to="/" data-testid="logo-link" className={`inline-flex items-center gap-2 group ${className}`}>
      <div className="flex flex-col leading-none">
        <div className="flex items-baseline gap-1">
          <span className={`font-display font-extrabold text-2xl tracking-tight ${textColor}`}>
            insight
          </span>
          {/* arrow accent */}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="-translate-y-2">
            <path d="M2 7L12 7M12 7L7 2M12 7L7 12" stroke="#1E88FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className={`font-display text-[10px] font-semibold tracking-[0.32em] mt-0.5 ${textColor}`}>
          N E T W O R K S
        </span>
        {showTagline && (
          <span className={`text-[8px] tracking-[0.18em] mt-1 ${subColor} font-medium`}>
            CONNECTING TODAY. POWERING TOMORROW.
          </span>
        )}
      </div>
    </Link>
  );
};

export default Logo;
