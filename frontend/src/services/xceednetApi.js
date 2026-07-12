// XceedNet API Service - Communicates with FastAPI backend proxy which in turn talks to XceedNet.
// BACKEND_URL is optional. On Emergent Preview it is set via REACT_APP_BACKEND_URL
// (external Kubernetes ingress). On Vercel we leave it empty so requests use the
// current origin ("/api/...") and vercel.json rewrites proxy them to the backend.
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

// Default location subdomain for subscribers (can be overridden by login response).
const DEFAULT_SUBSCRIBER_DOMAIN = 'bhopal.insightnet.in';

class XceedNetAPI {
  constructor() {
    this.token = localStorage.getItem('xceednet_token');
    this.userType = localStorage.getItem('user_type');
    this.locationDomain = localStorage.getItem('location_domain') || DEFAULT_SUBSCRIBER_DOMAIN;
  }

  setToken(token, userType, locationDomain) {
    this.token = token;
    this.userType = userType;
    localStorage.setItem('xceednet_token', token);
    localStorage.setItem('user_type', userType);
    if (locationDomain) {
      this.locationDomain = locationDomain;
      localStorage.setItem('location_domain', locationDomain);
    }
  }

  setLocationDomain(domain) {
    if (!domain) return;
    this.locationDomain = domain;
    localStorage.setItem('location_domain', domain);
  }

  getLocationDomain() {
    return this.locationDomain || DEFAULT_SUBSCRIBER_DOMAIN;
  }

  clearAuth() {
    this.token = null;
    this.userType = null;
    localStorage.removeItem('xceednet_token');
    localStorage.removeItem('user_type');
    localStorage.removeItem('subscriber_id');
    localStorage.removeItem('user_data');
    localStorage.removeItem('location_domain');
  }

  isAuthenticated() {
    return !!this.token;
  }

  getUserType() {
    return this.userType;
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authentication'] = this.token;
    }
    if (this.locationDomain) {
      headers['X-Location-Domain'] = this.locationDomain;
    }

    let response;
    try {
      response = await fetch(`${BACKEND_URL}${endpoint}`, {
        ...options,
        headers,
      });
    } catch (networkErr) {
      console.error('Network error:', networkErr);
      throw new Error('Network error. Please check your connection and try again.');
    }

    let data = {};
    try {
      data = await response.json();
    } catch (_e) {
      // Non-JSON response
    }

    if (!response.ok) {
      const message = data.message || data.error || data.detail || `Request failed (${response.status})`;
      const err = new Error(message);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  // ---------------- Auth ----------------

  async subscriberLogin(username, password, domain) {
    const body = { username, password };
    if (domain) body.domain = domain;
    return this.request('/api/subscriber/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async adminLogin(email, password) {
    return this.request('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // ---------------- Subscriber ----------------

  async getSubscriberDashboard() {
    return this.request('/api/subscriber/dashboard', { method: 'GET' });
  }

  // Backwards-compat alias
  async getSubscriberData() {
    return this.getSubscriberDashboard();
  }

  // Invoices
  async getSubscriberInvoices({ q = '', start = 0, length = 25 } = {}) {
    const params = new URLSearchParams({ q, start: String(start), length: String(length) });
    return this.request(`/api/subscriber/invoices?${params.toString()}`, { method: 'GET' });
  }

  async getSubscriberInvoice(id) {
    return this.request(`/api/subscriber/invoices/${id}`, { method: 'GET' });
  }

  getInvoicePdfUrl(id) {
    // For anchor download — include the token as a query hint would be insecure;
    // use the fetch-based downloader below instead.
    return `${BACKEND_URL}/api/subscriber/invoices/${id}/pdf`;
  }

  async downloadInvoicePdf(id, filename) {
    const headers = {};
    if (this.token) headers['Authentication'] = this.token;
    if (this.locationDomain) headers['X-Location-Domain'] = this.locationDomain;
    const response = await fetch(`${BACKEND_URL}/api/subscriber/invoices/${id}/pdf`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      let msg = `Failed to download PDF (${response.status})`;
      try {
        const err = await response.json();
        msg = err.detail || err.message || msg;
      } catch { /* ignore */ }
      throw new Error(msg);
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `Invoice-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  async printInvoicePdf(id) {
    // Fetch PDF, open in a hidden iframe and invoke the browser print dialog.
    const headers = {};
    if (this.token) headers['Authentication'] = this.token;
    if (this.locationDomain) headers['X-Location-Domain'] = this.locationDomain;
    const response = await fetch(`${BACKEND_URL}/api/subscriber/invoices/${id}/pdf`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      throw new Error(`Failed to load invoice for printing (${response.status})`);
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch {
        // Fallback: open the PDF in a new tab so the user can print manually
        window.open(url, '_blank');
      }
    };
    // Clean up after ~60s
    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch { /* noop */ }
      window.URL.revokeObjectURL(url);
    }, 60000);
  }

  async printAccountStatement() {
    const headers = {};
    if (this.token) headers['Authentication'] = this.token;
    if (this.locationDomain) headers['X-Location-Domain'] = this.locationDomain;
    const response = await fetch(`${BACKEND_URL}/api/subscriber/statement/pdf`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      throw new Error(`Failed to load statement for printing (${response.status})`);
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      try { iframe.contentWindow.focus(); iframe.contentWindow.print(); }
      catch { window.open(url, '_blank'); }
    };
    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch { /* noop */ }
      window.URL.revokeObjectURL(url);
    }, 60000);
  }

  async downloadAccountStatement(filename) {
    const headers = {};
    if (this.token) headers['Authentication'] = this.token;
    if (this.locationDomain) headers['X-Location-Domain'] = this.locationDomain;
    const response = await fetch(`${BACKEND_URL}/api/subscriber/statement/pdf`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      let msg = `Failed to download statement (${response.status})`;
      try {
        const err = await response.json();
        msg = err.detail || err.message || msg;
      } catch { /* ignore */ }
      throw new Error(msg);
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `AccountStatement.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  // Payments (CCAvenue)
  async initiatePayment({ kind, invoice_id, amount, remark } = {}) {
    return this.request('/api/payments/initiate', {
      method: 'POST',
      body: JSON.stringify({ kind, invoice_id, amount, remark }),
    });
  }

  async getPayment(orderId) {
    return this.request(`/api/payments/${orderId}`, { method: 'GET' });
  }

  // Build and submit a hidden form to CCAvenue's transaction endpoint.
  submitCCavenueForm({ transaction_url, enc_request, access_code }) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = transaction_url;

    const addField = (name, value) => {
      const i = document.createElement('input');
      i.type = 'hidden';
      i.name = name;
      i.value = value;
      form.appendChild(i);
    };

    addField('encRequest', enc_request);
    addField('access_code', access_code);

    document.body.appendChild(form);
    form.submit();
  }

  // Payments
  async getSubscriberPayments({ q = '', start = 0, length = 25 } = {}) {
    const params = new URLSearchParams({ q, start: String(start), length: String(length) });
    return this.request(`/api/subscriber/payments?${params.toString()}`, { method: 'GET' });
  }

  // Profile
  async getSubscriberProfile() {
    return this.request('/api/subscriber/profile', { method: 'GET' });
  }

  async updateSubscriberProfile(fields) {
    return this.request('/api/subscriber/profile', {
      method: 'PATCH',
      body: JSON.stringify(fields),
    });
  }

  async changeSubscriberPassword(currentPassword, newPassword) {
    return this.request('/api/subscriber/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  }

  // Tickets
  async getSubscriberTickets({ start = 0, length = 50 } = {}) {
    const params = new URLSearchParams({ start: String(start), length: String(length) });
    return this.request(`/api/subscriber/tickets?${params.toString()}`, { method: 'GET' });
  }

  async createSubscriberTicket({ subject, description, priority = 'a_low', due_by } = {}) {
    return this.request('/api/subscriber/tickets', {
      method: 'POST',
      body: JSON.stringify({ subject, description, priority, due_by }),
    });
  }

  async getSubscriberTicket(id) {
    return this.request(`/api/subscriber/tickets/${id}`, { method: 'GET' });
  }

  async replySubscriberTicket(id, message) {
    return this.request(`/api/subscriber/tickets/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  // ---------------- Admin ----------------

  async getAdminLocations() {
    return this.request('/api/admin/locations', { method: 'GET' });
  }

  async getDashboardStats() {
    return this.request('/api/admin/dashboard', { method: 'GET' });
  }

  async getSubscribersList({ q = '', start = 0, length = 25 } = {}) {
    const params = new URLSearchParams({ q, start: String(start), length: String(length) });
    return this.request(`/api/subscribers/list?${params.toString()}`, { method: 'GET' });
  }

  async getPackagesList() {
    return this.request('/api/packages/list', { method: 'GET' });
  }
}

export default new XceedNetAPI();
