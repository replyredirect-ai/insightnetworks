import { Link } from "react-router-dom";
import markImg from "../assets/insight-logo-mark.png";
import fullImg from "../assets/insight-logo-full.png";

/**
 * Logo - official Insight Networks logo.
 *
 * Props
 *   showTagline   true → full lockup with tagline (for footer / hero)
 *                 false → compact mark (insight + arrow + NETWORKS, no tagline)
 *   size         tailwind height class
 */
export const Logo = ({ showTagline = false, size, className = "" }) => {
  const src = showTagline ? fullImg : markImg;
  const h = size || (showTagline ? "h-24" : "h-12");
  return (
    <Link
      to="/"
      data-testid="logo-link"
      aria-label="Insight Networks — home"
      className={`inline-flex items-center ${className}`}
    >
      <img
        src={src}
        alt="Insight Networks"
        className={`${h} w-auto object-contain`}
      />
      <span className="sr-only">
        Insight Networks — Connecting Today. Powering Tomorrow.
      </span>
    </Link>
  );
};

export default Logo;
