import { useState, useEffect } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { Menu, X, ArrowUpRight } from "lucide-react";
import Logo from "./Logo";

const links = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/plans", label: "Plans" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/dashboard", label: "Dashboard" },
];

const SCROLL_THRESHOLD_PX = 12;

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD_PX);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header
      data-testid="site-navbar"
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/85 backdrop-blur-xl border-b border-slate-200/70 shadow-sm" : "bg-white/60 backdrop-blur-md"
      }`}
    >
      <div className="container mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-24">
          <Logo showTagline={false} size="h-14" />

          <nav className="hidden lg:flex items-center gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                data-testid={`nav-${l.label.toLowerCase()}-link`}
                className={({ isActive }) =>
                  `relative px-4 py-2 text-sm font-medium transition-colors rounded-full ${
                    isActive ? "text-[#1E88FF]" : "text-slate-700 hover:text-[#0A1A33]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {l.label}
                    {isActive && (
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#1E88FF]" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <Link
              to="/contact"
              data-testid="navbar-cta-button"
              className="btn-shine inline-flex items-center gap-2 bg-[#0A1A33] hover:bg-[#0A1A33]/90 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors"
            >
              Get Connected
              <ArrowUpRight size={16} />
            </Link>
          </div>

          <button
            data-testid="mobile-menu-toggle"
            aria-label="Toggle menu"
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 rounded-lg text-[#0A1A33] hover:bg-slate-100"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {open && (
          <div className="lg:hidden pb-6 border-t border-slate-200/70 pt-4" data-testid="mobile-menu">
            <div className="flex flex-col gap-1">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === "/"}
                  data-testid={`mobile-nav-${l.label.toLowerCase()}-link`}
                  className={({ isActive }) =>
                    `px-4 py-3 text-base font-medium rounded-lg ${
                      isActive ? "text-[#1E88FF] bg-[#1E88FF]/10" : "text-slate-700 hover:bg-slate-100"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
              <Link
                to="/contact"
                data-testid="mobile-navbar-cta-button"
                className="mt-3 inline-flex items-center justify-center gap-2 bg-[#0A1A33] text-white text-sm font-semibold px-5 py-3 rounded-full"
              >
                Get Connected
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
