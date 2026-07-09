import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Phone, MapPin, Lock, Save, RefreshCw, KeyRound } from "lucide-react";
import xceednetApi from "../../services/xceednetApi";

const EDITABLE_FIELDS = [
  { key: "email", label: "Email", type: "email", icon: Mail, placeholder: "you@example.com" },
  { key: "mobile1", label: "Primary Mobile", type: "tel", icon: Phone, placeholder: "9926625075" },
  { key: "mobile2", label: "Alternate Mobile", type: "tel", icon: Phone, placeholder: "Optional" },
  { key: "address1", label: "Address Line 1", type: "text", icon: MapPin, placeholder: "Street, area" },
  { key: "address2", label: "Address Line 2", type: "text", icon: MapPin, placeholder: "Landmark, apt" },
  { key: "city", label: "City", type: "text", icon: MapPin },
  { key: "state", label: "State", type: "text", icon: MapPin },
  { key: "pincode", label: "Pincode", type: "text", icon: MapPin },
];

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [saveErr, setSaveErr] = useState(null);

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);
  const [pwErr, setPwErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await xceednetApi.getSubscriberProfile();
        const data = r?.data || {};
        setProfile(data);
        const initial = {};
        EDITABLE_FIELDS.forEach(({ key }) => { initial[key] = data[key] || ""; });
        setForm(initial);
      } catch (err) {
        if (err.status === 401) {
          xceednetApi.clearAuth();
          navigate("/subscriber-login");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveMsg(null); setSaveErr(null); setSaving(true);
    try {
      const changed = {};
      EDITABLE_FIELDS.forEach(({ key }) => {
        const original = (profile?.[key] || "").toString();
        const current = (form[key] || "").toString();
        if (current !== original) changed[key] = current;
      });
      if (Object.keys(changed).length === 0) {
        setSaveErr("No changes to save.");
        return;
      }
      const r = await xceednetApi.updateSubscriberProfile(changed);
      setSaveMsg(r?.message || "Profile updated successfully.");
      // Refresh profile
      const fresh = await xceednetApi.getSubscriberProfile();
      setProfile(fresh?.data || {});
    } catch (err) {
      setSaveErr(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handlePwChange = (e) => setPwForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null); setPwErr(null);
    if (!pwForm.current || !pwForm.next) {
      setPwErr("Please enter your current and new password."); return;
    }
    if (pwForm.next.length < 6) {
      setPwErr("New password must be at least 6 characters."); return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwErr("New password and confirmation do not match."); return;
    }
    setPwSaving(true);
    try {
      await xceednetApi.changeSubscriberPassword(pwForm.current, pwForm.next);
      setPwMsg("Password updated successfully. Please use the new password on next login.");
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setPwErr(err.message || "Failed to change password.");
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-24"><RefreshCw className="text-[#1E88FF] animate-spin" size={32} /></div>;
  }

  return (
    <div className="max-w-3xl" data-testid="profile-page">
      {/* Read-only summary */}
      <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-500 uppercase">Name</div>
            <div className="text-sm font-semibold text-[#0A1A33]">{profile?.name || "\u2014"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase">Username</div>
            <div className="text-sm font-semibold text-[#0A1A33] font-mono">{profile?.username || "\u2014"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase">Account No</div>
            <div className="text-sm font-semibold text-[#0A1A33]">{profile?.account_no || "\u2014"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase">Current Package</div>
            <div className="text-sm font-semibold text-[#0A1A33]">{profile?.location_package_name || "\u2014"}</div>
          </div>
        </div>
      </div>

      {/* Editable form */}
      <form onSubmit={handleSave} className="bg-white border-2 border-slate-200 rounded-2xl p-6 mb-6" data-testid="profile-form">
        <h2 className="text-lg font-bold text-[#0A1A33] mb-4">Contact & Address</h2>

        {saveMsg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{saveMsg}</div>
        )}
        {saveErr && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{saveErr}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {EDITABLE_FIELDS.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.key} className={f.key.startsWith("address") ? "sm:col-span-2" : ""}>
                <label htmlFor={f.key} className="block text-sm font-semibold text-[#0A1A33] mb-1.5">{f.label}</label>
                <div className="relative">
                  <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id={f.key}
                    name={f.key}
                    type={f.type}
                    value={form[f.key] || ""}
                    onChange={handleChange}
                    placeholder={f.placeholder || ""}
                    data-testid={`profile-${f.key}`}
                    className="w-full pl-9 pr-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-[#1E88FF] focus:outline-none text-sm"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end mt-6">
          <button
            type="submit"
            disabled={saving}
            data-testid="save-profile"
            className="inline-flex items-center gap-2 bg-[#1E88FF] hover:bg-[#156cd1] disabled:bg-slate-400 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      {/* Change password */}
      <form onSubmit={handleChangePassword} className="bg-white border-2 border-slate-200 rounded-2xl p-6" data-testid="password-form">
        <h2 className="text-lg font-bold text-[#0A1A33] mb-1 flex items-center gap-2">
          <KeyRound size={20} className="text-[#1E88FF]" />
          Change Password
        </h2>
        <p className="text-sm text-slate-500 mb-4">Keep your account secure with a strong password</p>

        {pwMsg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{pwMsg}</div>
        )}
        {pwErr && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{pwErr}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { key: "current", label: "Current Password" },
            { key: "next", label: "New Password" },
            { key: "confirm", label: "Confirm New Password" },
          ].map((p) => (
            <div key={p.key}>
              <label htmlFor={`pw-${p.key}`} className="block text-sm font-semibold text-[#0A1A33] mb-1.5">{p.label}</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id={`pw-${p.key}`}
                  name={p.key}
                  type="password"
                  value={pwForm[p.key]}
                  onChange={handlePwChange}
                  data-testid={`pw-${p.key}`}
                  className="w-full pl-9 pr-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-[#1E88FF] focus:outline-none text-sm"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-6">
          <button
            type="submit"
            disabled={pwSaving}
            data-testid="save-password"
            className="inline-flex items-center gap-2 bg-[#1E88FF] hover:bg-[#156cd1] disabled:bg-slate-400 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors"
          >
            <KeyRound size={16} />
            {pwSaving ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}
