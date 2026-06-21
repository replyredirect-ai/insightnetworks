import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Lock, ArrowLeft, AlertCircle } from "lucide-react";
import PageHeader from "../components/PageHeader";

const LOGIN_BG = "https://images.unsplash.com/photo-1551434678-e076c223a692?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwyfHxkYXNoYm9hcmQlMjB0ZWNofGVufDB8fHx8MTc4MDY0MjExMnww&ixlib=rb-4.1.0&q=85";

export default function AdminLogin() {
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
    remember: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Create form data to submit to XceedNet admin portal
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://bhopal.insightnet.in/users/sign_in';
    form.target = '_blank';

    // Add email field
    const emailInput = document.createElement('input');
    emailInput.type = 'hidden';
    emailInput.name = 'user[email]';
    emailInput.value = credentials.email;
    form.appendChild(emailInput);

    // Add password field
    const passwordInput = document.createElement('input');
    passwordInput.type = 'hidden';
    passwordInput.name = 'user[password]';
    passwordInput.value = credentials.password;
    form.appendChild(passwordInput);

    // Add remember me if checked
    if (credentials.remember) {
      const rememberInput = document.createElement('input');
      rememberInput.type = 'hidden';
      rememberInput.name = 'user[remember_me]';
      rememberInput.value = '1';
      form.appendChild(rememberInput);
    }

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    setTimeout(() => setIsSubmitting(false), 1000);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div data-testid="admin-login-page">
      <PageHeader
        eyebrow="Admin Dashboard"
        title="Administrative access"
        accent="portal."
        subtitle="Secure login for Insight Networks administrators to manage subscribers, billing, and system operations."
        backgroundImage={LOGIN_BG}
      />

      <section className="container mx-auto px-6 lg:px-8 py-20 lg:py-28">
        <div className="max-w-md mx-auto">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-[#1E88FF] font-medium mb-8 transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </Link>

          <div className="bg-gradient-to-br from-[#0A1A33] to-[#0F2847] border-2 border-[#1E88FF] rounded-3xl p-8 lg:p-10 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-[#1E88FF]/20 flex items-center justify-center mx-auto mb-4">
                <Shield size={32} className="text-[#1E88FF]" />
              </div>
              <h2 className="font-display text-2xl font-bold text-white mb-2">
                Admin Dashboard Login
              </h2>
              <p className="text-slate-300 text-sm">
                Authorized personnel only
              </p>
            </div>

            {/* Warning Banner */}
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-200">
                  This is a restricted area. Unauthorized access attempts are logged and monitored.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} data-testid="admin-login-form">
              <div className="space-y-5">
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
                    Admin Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Shield size={18} className="text-slate-400" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={credentials.email}
                      onChange={handleChange}
                      required
                      data-testid="email-input"
                      className="w-full pl-11 pr-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white placeholder-slate-400 focus:border-[#1E88FF] focus:outline-none focus:ring-2 focus:ring-[#1E88FF]/20 transition-colors"
                      placeholder="admin@insightnet.in"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-white mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock size={18} className="text-slate-400" />
                    </div>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={credentials.password}
                      onChange={handleChange}
                      required
                      data-testid="password-input"
                      className="w-full pl-11 pr-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white placeholder-slate-400 focus:border-[#1E88FF] focus:outline-none focus:ring-2 focus:ring-[#1E88FF]/20 transition-colors"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="remember"
                    name="remember"
                    checked={credentials.remember}
                    onChange={handleChange}
                    data-testid="remember-checkbox"
                    className="w-4 h-4 text-[#1E88FF] bg-white/10 border-white/20 rounded focus:ring-[#1E88FF] focus:ring-2"
                  />
                  <label htmlFor="remember" className="ml-2 text-sm text-slate-300">
                    Remember me on this device
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="submit-login-button"
                  className="w-full btn-shine bg-[#1E88FF] hover:bg-[#156cd1] disabled:bg-slate-600 text-white font-semibold px-6 py-4 rounded-full transition-all transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Authenticating..." : "Login to Admin Dashboard"}
                </button>
              </div>
            </form>

            {/* Security Notice */}
            <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-start gap-3">
                <Shield size={18} className="text-[#1E88FF] mt-0.5 shrink-0" />
                <p className="text-xs text-slate-300">
                  All admin activities are logged for security and compliance purposes. Your session is encrypted end-to-end.
                </p>
              </div>
            </div>

            {/* Help Link */}
            <div className="mt-6 text-center">
              <Link
                to="/contact"
                className="text-sm text-[#1E88FF] hover:underline font-medium"
              >
                Contact IT Support
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
