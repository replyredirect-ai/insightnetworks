import { Link } from "react-router-dom";
import { Phone, Mail, Globe, MapPin } from "lucide-react";
import Logo from "./Logo";

export const Footer = () => {
  return (
    <footer data-testid="site-footer" className="bg-[#051024] text-slate-300 pt-20 pb-8 relative overflow-hidden">
      <div className="absolute inset-0 glow-radial opacity-60 pointer-events-none" />
      <div className="container mx-auto px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-5 inline-block">
              <Logo showTagline={true} size="h-28" />
            </div>
            <p className="mt-6 text-sm text-slate-400 leading-relaxed max-w-xs">
              Building India&apos;s most reliable enterprise network. From fiber to firewalls, we keep your business connected.
            </p>
          </div>

          <div>
            <h4 className="font-display text-white text-sm font-semibold tracking-wider uppercase mb-5">Company</h4>
            <ul className="space-y-3 text-sm">
              <li><Link data-testid="footer-link-home" to="/" className="hover:text-[#1E88FF] transition-colors">Home</Link></li>
              <li><Link data-testid="footer-link-about" to="/about" className="hover:text-[#1E88FF] transition-colors">About Us</Link></li>
              <li><Link data-testid="footer-link-services" to="/services" className="hover:text-[#1E88FF] transition-colors">Services</Link></li>
              <li><Link data-testid="footer-link-plans" to="/plans" className="hover:text-[#1E88FF] transition-colors">Plans</Link></li>
              <li><Link data-testid="footer-link-contact" to="/contact" className="hover:text-[#1E88FF] transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-white text-sm font-semibold tracking-wider uppercase mb-5">Services</h4>
            <ul className="space-y-3 text-sm">
              <li>Internet Leased Line</li>
              <li>Fiber Connectivity</li>
              <li>Network Solutions</li>
              <li>Security Solutions</li>
              <li>Cloud Services</li>
              <li>24/7 Support</li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-white text-sm font-semibold tracking-wider uppercase mb-5">Legal</h4>
            <ul className="space-y-3 text-sm">
              <li><Link data-testid="footer-link-privacy" to="/privacy" className="hover:text-[#1E88FF] transition-colors">Privacy Policy</Link></li>
              <li><Link data-testid="footer-link-terms" to="/terms" className="hover:text-[#1E88FF] transition-colors">Terms of Service</Link></li>
              <li><Link data-testid="footer-link-refund" to="/refund" className="hover:text-[#1E88FF] transition-colors">Refund &amp; Cancellation</Link></li>
              <li><Link data-testid="footer-link-industries" to="/industries" className="hover:text-[#1E88FF] transition-colors">Industries</Link></li>
              <li><Link data-testid="footer-link-partners" to="/technology-partners" className="hover:text-[#1E88FF] transition-colors">Technology Partners</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-white text-sm font-semibold tracking-wider uppercase mb-5">Reach Us</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <Phone size={16} className="text-[#1E88FF] mt-0.5 shrink-0" />
                <a href="tel:+919302452424" data-testid="footer-phone" className="hover:text-[#1E88FF]">+91 93024 52424</a>
              </li>
              <li className="flex items-start gap-3">
                <Mail size={16} className="text-[#1E88FF] mt-0.5 shrink-0" />
                <a href="mailto:contact@insightnet.in" data-testid="footer-email" className="hover:text-[#1E88FF]">contact@insightnet.in</a>
              </li>
              <li className="flex items-start gap-3">
                <Globe size={16} className="text-[#1E88FF] mt-0.5 shrink-0" />
                <a href="https://www.insightnet.in" data-testid="footer-web" className="hover:text-[#1E88FF]">www.insightnet.in</a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={16} className="text-[#1E88FF] mt-0.5 shrink-0" />
                <span>Block-B Aashima Royal City, Bhopal-462043, Madhya Pradesh, India</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-16 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Insight Networks. All rights reserved.</p>
          <p className="tracking-widest">CONNECTING TODAY. POWERING TOMORROW.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
