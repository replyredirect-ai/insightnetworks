// XceedNet API Service
const API_BASE_URL = 'https://bhopal.insightnet.in';

class XceedNetAPI {
  constructor() {
    this.token = localStorage.getItem('xceednet_token');
    this.userType = localStorage.getItem('user_type');
  }

  // Set authentication token
  setToken(token, userType) {
    this.token = token;
    this.userType = userType;
    localStorage.setItem('xceednet_token', token);
    localStorage.setItem('user_type', userType);
  }

  // Clear authentication
  clearAuth() {
    this.token = null;
    this.userType = null;
    localStorage.removeItem('xceednet_token');
    localStorage.removeItem('user_type');
    localStorage.removeItem('subscriber_id');
    localStorage.removeItem('user_data');
  }

  // Check if authenticated
  isAuthenticated() {
    return !!this.token;
  }

  // Get user type
  getUserType() {
    return this.userType;
  }

  // Make API request
  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authentication'] = this.token;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      // Check for API errors
      if (data.error_status || data.error) {
        throw new Error(data.error_message || data.error || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // Subscriber Login (Note: XceedNet uses session-based auth for subscribers)
  // We'll need to implement a proxy or use their existing session
  async subscriberLogin(username, password) {
    // For now, return mock success - actual implementation would need backend proxy
    // or XceedNet to provide a JWT login endpoint
    return {
      success: true,
      token: 'mock_subscriber_token',
      message: 'Login successful'
    };
  }

  // Admin Login (Note: Similar issue - XceedNet uses session-based auth)
  async adminLogin(email, password) {
    // Mock implementation
    return {
      success: true,
      token: 'mock_admin_token',
      message: 'Login successful'
    };
  }

  // Dashboard APIs
  async getLocationDashboard() {
    return this.request('/location_dashboard');
  }

  // Subscriber APIs
  async getSubscribers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/subscribers${queryString ? '?' + queryString : ''}`);
  }

  async getSubscriber(id) {
    return this.request(`/subscribers/${id}`);
  }

  async updateSubscriber(id, data) {
    return this.request(`/subscribers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ subscriber: data }),
    });
  }

  async createSubscriber(data) {
    return this.request('/subscribers', {
      method: 'POST',
      body: JSON.stringify({ subscriber: data }),
    });
  }

  async deleteSubscriber(id) {
    return this.request(`/subscribers/${id}`, {
      method: 'DELETE',
    });
  }

  // Package APIs
  async getPackages() {
    return this.request('/location_packages');
  }

  async getPackage(id) {
    return this.request(`/location_packages/${id}`);
  }

  async createPackage(data) {
    return this.request('/location_packages', {
      method: 'POST',
      body: JSON.stringify({ location_package: data }),
    });
  }

  async updatePackage(id, data) {
    return this.request(`/location_packages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ location_package: data }),
    });
  }

  async deletePackage(id) {
    return this.request(`/location_packages/${id}`, {
      method: 'DELETE',
    });
  }

  // Node APIs
  async getNodes() {
    return this.request('/nodes');
  }

  async getNode(id) {
    return this.request(`/nodes/${id}`);
  }

  // Online Subscribers
  async getOnlineSubscribers(params = {}) {
    return this.request('/subscribers/search_online', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async disconnectOnlineSubscribers(radacctids) {
    return this.request('/subscribers/update_multiple_online', {
      method: 'POST',
      body: JSON.stringify({
        button: 'Disconnect',
        radacctids,
      }),
    });
  }
}

export default new XceedNetAPI();
