import { useEffect } from "react";
import { useLocation, Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

export const Layout = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main key={pathname} className="flex-1 pt-24 page-fade">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
