// XceedNet API Service - Communicates with FastAPI backend proxy which in turn talks to XceedNet.
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

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
