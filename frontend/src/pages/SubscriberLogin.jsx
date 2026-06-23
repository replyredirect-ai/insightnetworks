import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Lock, ArrowLeft, Shield } from "lucide-react";
import PageHeader from "../components/PageHeader";
import xceednetApi from "../services/xceednetApi";

const LOGIN_BG = "https://images.unsplash.com/photo-1606857521015-7f9fcf423740?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBkYXNoYm9hcmQlMjB0ZWNobm9sb2d5fGVufDB8fHx8MTc4MjIyNzQxOXww&ixlib=rb-4.1.0&q=85";

export default function SubscriberLogin() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
    remember: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      // Authenticate with XceedNet API
      const response = await xceednetApi.subscriberLogin(
        credentials.username,
        credentials.password
      );

      if (response.success) {
        // Store authentication token
        xceednetApi.setToken(response.token, 'subscriber');
        
        // Store subscriber ID if provided
        if (response.subscriber_id) {
          localStorage.setItem('subscriber_id', response.subscriber_id);
        }

        // Redirect to subscriber dashboard
        navigate('/subscriber-dashboard');
      } else {
        setError(response.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Login failed. Please check your credentials and try again.');
      console.error('Login error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div data-testid="subscriber-login-page">
      <PageHeader
        eyebrow="Subscriber Dashboard"
        title="Access your account"
        accent="securely."
        subtitle="Login to your Insight Networks subscriber dashboard to manage your account, view bills, and monitor usage."
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

          <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 lg:p-10 shadow-xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-[#1E88FF]/10 flex items-center justify-center mx-auto mb-4">
                <User size={32} className="text-[#1E88FF]" />
              </div>
              <h2 className="font-display text-2xl font-bold text-[#0A1A33] mb-2">
                Subscriber Dashboard Login
              </h2>
              <p className="text-slate-600 text-sm">
                Enter your credentials to access your dashboard
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} data-testid="subscriber-login-form">
              <div className="space-y-5">
                {/* Username Field */}
                <div>
                  <label htmlFor="username" className="block text-sm font-semibold text-[#0A1A33] mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User size={18} className="text-slate-400" />
                    </div>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={credentials.username}
                      onChange={handleChange}
                      required
                      data-testid="username-input"
                      className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#1E88FF] focus:outline-none focus:ring-2 focus:ring-[#1E88FF]/20 transition-colors"
                      placeholder="Enter your username"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-[#0A1A33] mb-2">
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
                      className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#1E88FF] focus:outline-none focus:ring-2 focus:ring-[#1E88FF]/20 transition-colors"
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
                    className="w-4 h-4 text-[#1E88FF] border-slate-300 rounded focus:ring-[#1E88FF] focus:ring-2"
                  />
                  <label htmlFor="remember" className="ml-2 text-sm text-slate-600">
                    Remember me
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="submit-login-button"
                  className="w-full btn-shine bg-[#1E88FF] hover:bg-[#156cd1] disabled:bg-slate-400 text-white font-semibold px-6 py-4 rounded-full transition-all transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Logging in..." : "Login to Dashboard"}
                </button>
              </div>
            </form>

            {/* Security Notice */}
            <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-start gap-3">
                <Shield size={18} className="text-[#1E88FF] mt-0.5 shrink-0" />
                <p className="text-xs text-slate-600">
                  Your connection is secure and encrypted. Your credentials are transmitted securely to Insight Networks servers.
                </p>
              </div>
            </div>

            {/* Help Link */}
            <div className="mt-6 text-center">
              <Link
                to="/contact"
                className="text-sm text-[#1E88FF] hover:underline font-medium"
              >
                Need help logging in?
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
