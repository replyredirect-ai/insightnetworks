import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Services from "@/pages/Services";
import Plans from "@/pages/Plans";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Dashboard from "@/pages/Dashboard";
import SubscriberLogin from "@/pages/SubscriberLogin";
import AdminLogin from "@/pages/AdminLogin";
import SubscriberDashboard from "@/pages/SubscriberDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import ProtectedRoute from "@/components/ProtectedRoute";
import TechnologyPartners from "@/pages/TechnologyPartners";
import Industries from "@/pages/Industries";
import LeasedLine from "@/pages/services/LeasedLine";
import WISP from "@/pages/services/WISP";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/services/leased-line" element={<LeasedLine />} />
            <Route path="/services/wisp" element={<WISP />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/technology-partners" element={<TechnologyPartners />} />
            <Route path="/industries" element={<Industries />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/customer-portal" element={<Dashboard />} />
            <Route path="/subscriber-login" element={<SubscriberLogin />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route 
              path="/subscriber-dashboard" 
              element={
                <ProtectedRoute requiredType="subscriber">
                  <SubscriberDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin-dashboard" 
              element={
                <ProtectedRoute requiredType="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
