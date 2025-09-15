

import axios from 'axios';
import qs from 'qs';

class ZohoService {
  constructor() {
    this.baseURL = 'https://www.zohoapis.in/crm/v2';
    this.authURL = 'https://accounts.zoho.in/oauth/v2';
    this.accessToken = null;
    this.refreshToken = process.env.ZOHO_REFRESH_TOKEN; // This will work in Vercel
    console.log('Initial Loaded Refresh Token from .env:', this.refreshToken);
  }

  // Get refresh token dynamically (handles cases where env loads after constructor)
  getRefreshToken() {
    return this.refreshToken || process.env.ZOHO_REFRESH_TOKEN;
  }

  // Step 1: Get authorization URL (run this once to get initial tokens)
  getAuthURL() {
    const params = {
      scope: process.env.ZOHO_SCOPE,
      client_id: process.env.ZOHO_CLIENT_ID,
      response_type: 'code',
      redirect_uri: process.env.ZOHO_REDIRECT_URI,
      access_type: 'offline'
    };
    return `${this.authURL}/auth?${qs.stringify(params)}`;
  }

  // Step 2: Exchange authorization code for tokens (run once)
  async getTokens(authCode) {
    console.log('🔄 Attempting to exchange auth code for tokens...');
    console.log('Auth Code:', authCode);
    console.log('Client ID:', process.env.ZOHO_CLIENT_ID);
    console.log('Redirect URI:', process.env.ZOHO_REDIRECT_URI);

    try {
      const tokenData = {
        grant_type: 'authorization_code',
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        redirect_uri: process.env.ZOHO_REDIRECT_URI,
        code: authCode
      };

      console.log('Token request data:', { ...tokenData, client_secret: 'HIDDEN' });

      const response = await axios.post(`${this.authURL}/token`, qs.stringify(tokenData), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      console.log('✅ Token exchange successful!');
      console.log('Response data:', response.data);

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;

      // NOTE: In Vercel, you need to manually update environment variables
      // Copy this refresh token and add it to Vercel Environment Variables
      console.log('🎉 Access Token:', this.accessToken);
      console.log('🎉 NEW REFRESH TOKEN - ADD THIS TO VERCEL ENV VARS:', this.refreshToken);

      return response.data;
    } catch (error) {
      console.error('❌ Error getting tokens:');
      console.error('Status:', error.response?.status);
      console.error('Status Text:', error.response?.statusText);
      console.error('Error Data:', error.response?.data);
      console.error('Full Error:', error.message);
      throw error;
    }
  }

  // Step 3: Refresh access token when expired
  async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available. Please check ZOHO_REFRESH_TOKEN environment variable.');
    }
    console.log('Refreshing token with:', refreshToken); // Debug
    try {
      const response = await axios.post(`${this.authURL}/token`, qs.stringify({
        refresh_token: refreshToken,
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        grant_type: 'refresh_token'
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      this.accessToken = response.data.access_token;
      // Update the stored refresh token in case it changed
      this.refreshToken = refreshToken;
      console.log('✅ Token refreshed successfully');
      return response.data;
    } catch (error) {
      console.error('Error refreshing token:', error.response?.data || error.message);
      throw error;
    }
  }

  // Step 4: Make API call with auto token refresh
async makeAPICall(method, endpoint, data = null) {
  const makeRequest = async () => {
    const response = await axios({
      method,
      url: `${this.baseURL}${endpoint}`,
      data,
      headers: {
        'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('API Response Data:', response.data);
    return response;
  };

  try {
    // If no access token, refresh first
    if (!this.accessToken) {
      console.log('No access token found, refreshing...');
      await this.refreshAccessToken();
    }
    
    return await makeRequest();
  } catch (error) {
    console.error('API Call Error:', error.response?.data || error.message);
    if (error.response?.status === 401 || error.response?.data?.code === 'INVALID_TOKEN') {
      console.log('Token invalid, refreshing and retrying...');
      await this.refreshAccessToken();
      return await makeRequest();
    }
    throw error;
  }
}

async createOrUpdateLead(leadData, leadId = null) {
  try {
    console.log('Formatted Lead Data:', leadData);
    let response;
    let action;
    let finalId;

    if (leadId) {
      // Direct update if leadId is provided
      const updateData = { data: [{ id: leadId, ...leadData }] };
      response = await this.makeAPICall('PUT', '/Leads', updateData);
      action = 'updated';
      finalId = leadId;
    } else {
      // Search for existing lead by Mobile
      const searchResponse = await this.makeAPICall('GET', `/Leads/search?criteria=Mobile:equals:${leadData.Mobile}`);
      if (searchResponse.data && searchResponse.data.data && searchResponse.data.data.length > 0) {
        finalId = searchResponse.data.data[0].id;
        const updateData = { data: [{ id: finalId, ...leadData }] };
        response = await this.makeAPICall('PUT', '/Leads', updateData);
        action = 'updated';
      } else {
        // Create new lead if no match found
        const createData = { data: [leadData] };
        response = await this.makeAPICall('POST', '/Leads', createData);
        action = 'created';
        finalId = response.data.data[0].details.id; // Extract leadId from creation response
      }
    }

    // Check for SUCCESS in response
    if (response.data && response.data.data && response.data.data[0] && response.data.data[0].code !== 'SUCCESS') {
      console.error('Zoho API Failed:', response.data.data[0]);
      throw new Error(`Zoho API Error: ${JSON.stringify(response.data.data[0])}`);
    }

    console.log('Zoho Response:', response.data);
    return { action, id: finalId, response: response.data };
  } catch (error) {
    console.error('Lead Error Details:', error.response?.data || error.message);
    throw error;
  }
}

  // Utility function to format lead data
formatLeadData(data) {
  const formatted = {
    First_Name: data.fullName ? data.fullName.split(' ')[0] : 'Unknown',
    Last_Name: data.fullName ? data.fullName.split(' ').slice(1).join(' ') || 'User' : 'User',
    Mobile: (data.phoneNumber || data.mobile) ? `+91${data.phoneNumber || data.mobile}` : null,
    Email: data.email || null,
    Lead_Source: 'Website',
    Lead_Status: data.fullName ? 'Qualified' : 'Not Contacted',
    Description: `Loan Application - ${data.loanType || 'Unknown Type'}`,
    Loan_Type: data.loanType || null, // Must match predefined picklist values (e.g., "Personal Loan")
    Monthly_Income: parseFloat(data.monthlyIncome) ? parseFloat(data.monthlyIncome).toFixed(2) : null, // 2 decimal places
    Employment_Type: data.employmentType || null, // Must match predefined picklist values (e.g., "Salaried")
    Date_of_Birth: data.dateOfBirth ? `${data.dateOfBirth}T00:00:00+05:30` : null, // Full DateTime with IST timezone
    City_Pincode: data.cityPincode || null,
    Application_ID: data.applicationId || null,
    Application_Stage: data.fullName ? 'Form Completed' : 'OTP Verified' // Must match predefined picklist values
  };

  Object.keys(formatted).forEach(key => {
    if (formatted[key] === null || formatted[key] === undefined) delete formatted[key];
  });

  return formatted;
}
}

export default new ZohoService();