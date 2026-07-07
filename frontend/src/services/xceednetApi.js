// XceedNet API Service - Using Backend Proxy
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

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

  // Make API request to backend proxy
  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    // Add authentication token to headers if available
    if (this.token) {
      headers['Authentication'] = this.token;
    }

    try {
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      // Check for API errors
      if (!response.ok) {
        throw new Error(data.message || data.error || data.detail || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // Subscriber Login - via backend proxy
  async subscriberLogin(username, password) {
    try {
      const response = await this.request('/api/subscriber/login', {
        method: 'POST',
        body: JSON.stringify({
          username,
          password
        })
      });
      
      return response;
    } catch (error) {
      console.error('Subscriber login error:', error);
      throw error;
    }
  }

  // Admin Login - via backend proxy
  async adminLogin(email, password) {
    try {
      const response = await this.request('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password
        })
      });
      
      return response;
    } catch (error) {
      console.error('Admin login error:', error);
      throw error;
    }
  }

  // Get Subscriber Data - via backend proxy
  async getSubscriberData(subscriberId = null) {
    try {
      const endpoint = subscriberId 
        ? `/api/subscriber/data?subscriber_id=${subscriberId}`
        : '/api/subscriber/data';
      
      return await this.request(endpoint, {
        method: 'GET'
      });
    } catch (error) {
      console.error('Get subscriber data error:', error);
      throw error;
    }
  }

  // Get Dashboard Stats (Admin) - via backend proxy
  async getDashboardStats() {
    try {
      return await this.request('/api/dashboard/stats', {
        method: 'GET'
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      throw error;
    }
  }

  // Get Subscribers List (Admin) - via backend proxy
  async getSubscribersList(page = 1, perPage = 50) {
    try {
      return await this.request(`/api/subscribers/list?page=${page}&per_page=${perPage}`, {
        method: 'GET'
      });
    } catch (error) {
      console.error('Get subscribers list error:', error);
      throw error;
    }
  }

  // Get Packages List - via backend proxy
  async getPackagesList() {
    try {
      return await this.request('/api/packages/list', {
        method: 'GET'
      });
    } catch (error) {
      console.error('Get packages list error:', error);
      throw error;
    }
  }

  // Get Packages List - via backend proxy
  async getPackagesList() {
    try {
      return await this.request('/api/packages/list', {
        method: 'GET'
      });
    } catch (error) {
      console.error('Get packages list error:', error);
      throw error;
    }
  }

  // ===== LEGACY METHODS (Direct XceedNet API calls) =====
  // These methods call XceedNet directly and may face CORS issues
  // Use backend proxy methods above for production

  // Dashboard APIs
  async getLocationDashboard() {
    return this.getDashboardStats();
  }

  // Subscriber APIs
  async getSubscribers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.getSubscribersList();
  }

  async getSubscriber(id) {
    return this.getSubscriberData(id);
  }

  async updateSubscriber(id, data) {
    // TODO: Implement via proxy if needed
    throw new Error('updateSubscriber not yet implemented via proxy');
  }

  async createSubscriber(data) {
    // TODO: Implement via proxy if needed
    throw new Error('createSubscriber not yet implemented via proxy');
  }

  async deleteSubscriber(id) {
    // TODO: Implement via proxy if needed
    throw new Error('deleteSubscriber not yet implemented via proxy');
  }

  // Package APIs
  async getPackages() {
    return this.getPackagesList();
  }

  async getPackage(id) {
    // TODO: Implement via proxy if needed
    throw new Error('getPackage not yet implemented via proxy');
  }

  async createPackage(data) {
    // TODO: Implement via proxy if needed
    throw new Error('createPackage not yet implemented via proxy');
  }

  async updatePackage(id, data) {
    // TODO: Implement via proxy if needed
    throw new Error('updatePackage not yet implemented via proxy');
  }

  async deletePackage(id) {
    // TODO: Implement via proxy if needed
    throw new Error('deletePackage not yet implemented via proxy');
  }

  // Node APIs
  async getNodes() {
    // TODO: Implement via proxy if needed
    throw new Error('getNodes not yet implemented via proxy');
  }

  async getNode(id) {
    // TODO: Implement via proxy if needed
    throw new Error('getNode not yet implemented via proxy');
  }

  // Online Subscribers
  async getOnlineSubscribers(params = {}) {
    // TODO: Implement via proxy if needed
    throw new Error('getOnlineSubscribers not yet implemented via proxy');
  }

  async disconnectOnlineSubscribers(radacctids) {
    // TODO: Implement via proxy if needed
    throw new Error('disconnectOnlineSubscribers not yet implemented via proxy');
  }
}

export default new XceedNetAPI();
