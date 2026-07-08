import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Services from "@/pages/Services";
import Plans from "@/pages/Plans";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Dashboard from "@/pages/Dashboard";
import SubscriberLogin from "@/pages/SubscriberLogin";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import ProtectedRoute from "@/components/ProtectedRoute";
import TechnologyPartners from "@/pages/TechnologyPartners";
import Industries from "@/pages/Industries";
import LeasedLine from "@/pages/services/LeasedLine";
import WISP from "@/pages/services/WISP";

// Subscriber Portal (with sidebar layout)
import SubscriberLayout from "@/components/SubscriberLayout";
import Overview from "@/pages/subscriber/Overview";
import Invoices from "@/pages/subscriber/Invoices";
import Payments from "@/pages/subscriber/Payments";
import Tickets from "@/pages/subscriber/Tickets";
import TicketNew from "@/pages/subscriber/TicketNew";
import TicketDetail from "@/pages/subscriber/TicketDetail";
import Profile from "@/pages/subscriber/Profile";

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
              path="/admin-dashboard"
              element={
                <ProtectedRoute requiredType="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            {/* Legacy dashboard path — redirect to new portal */}
            <Route path="/subscriber-dashboard" element={<Navigate to="/subscriber" replace />} />
          </Route>

          {/* Subscriber portal — its own layout (sidebar), no marketing chrome */}
          <Route
            path="/subscriber"
            element={
              <ProtectedRoute requiredType="subscriber">
                <SubscriberLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Overview />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="payments" element={<Payments />} />
            <Route path="tickets" element={<Tickets />} />
            <Route path="tickets/new" element={<TicketNew />} />
            <Route path="tickets/:id" element={<TicketDetail />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          <Route path="*" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
