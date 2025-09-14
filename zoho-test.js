// zoho-test.js - Simple test script
import dotenv from 'dotenv';
import axios from 'axios';
import qs from 'qs';

dotenv.config();

console.log('🧪 ZOHO CRM TEST SCRIPT');
console.log('======================\n');

// Check environment variables
console.log('📋 Checking Environment Variables:');
console.log('Client ID:', process.env.ZOHO_CLIENT_ID ? '✅ Found' : '❌ Missing');
console.log('Client Secret:', process.env.ZOHO_CLIENT_SECRET ? '✅ Found' : '❌ Missing');
console.log('Redirect URI:', process.env.ZOHO_REDIRECT_URI);
console.log('');

// Generate auth URL
const generateAuthURL = (domain = 'com') => {
  const params = {
    scope: process.env.ZOHO_SCOPE,
    client_id: process.env.ZOHO_CLIENT_ID,
    response_type: 'code',
    redirect_uri: process.env.ZOHO_REDIRECT_URI,
    access_type: 'offline'
  };

  return `https://accounts.zoho.${domain}/oauth/v2/auth?${qs.stringify(params)}`;
};

console.log('🔗 Authorization URLs:');
console.log('COM Domain:', generateAuthURL('com'));
console.log('IN Domain:', generateAuthURL('in'));
console.log('');

// Test token exchange function
const testTokenExchange = async (authCode, domain = 'com') => {
  console.log(`🔄 Testing token exchange with .${domain} domain...`);
  
  try {
    const response = await axios.post(`https://accounts.zoho.${domain}/oauth/v2/token`, qs.stringify({
      grant_type: 'authorization_code',
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      redirect_uri: process.env.ZOHO_REDIRECT_URI,
      code: authCode
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.data.access_token) {
      console.log(`✅ SUCCESS with .${domain} domain!`);
      console.log('Access Token:', response.data.access_token.substring(0, 20) + '...');
      console.log('Refresh Token:', response.data.refresh_token.substring(0, 20) + '...');
      console.log('\n🎉 Add this to your .env file:');
      console.log(`ZOHO_REFRESH_TOKEN=${response.data.refresh_token}`);
      return true;
    } else {
      console.log(`❌ Failed with .${domain} domain:`, response.data);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error with .${domain} domain:`, error.response?.data || error.message);
    return false;
  }
};

console.log('📝 INSTRUCTIONS:');
console.log('1. Copy one of the authorization URLs above');
console.log('2. Open it in your browser and authorize the app');
console.log('3. Copy the "code" parameter from the redirect URL');
console.log('4. Run: node zoho-test.js YOUR_AUTH_CODE_HERE');
console.log('');

// If auth code provided, test both domains
const authCode = process.argv[2];
if (authCode) {
  console.log('🚀 Testing with auth code:', authCode.substring(0, 20) + '...');
  console.log('');
  
  (async () => {
    const comSuccess = await testTokenExchange(authCode, 'com');
    if (!comSuccess) {
      console.log('');
      await testTokenExchange(authCode, 'in');
    }
  })();
} else {
  console.log('💡 No auth code provided. Follow the instructions above.');
}