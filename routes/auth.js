import express from "express";
import zohoService from "../services/zohoService.js";

const router = express.Router();

// Static OTP for testing
const STATIC_OTP = "123456";

// Step 1: Request OTP
router.post("/send-otp", async (req, res) => {
  const { mobile, loanType } = req.body;

  if (!mobile || !loanType) {
    return res.status(400).json({ success: false, message: "Mobile and loan type are required" });
  }

  // Here we would call MSG91 later
  console.log(`Sending OTP to ${mobile} for ${loanType}`);

  return res.json({ success: true, message: "OTP sent successfully (static OTP: 123456)" });
});

// Step 2: Verify OTP and store initial data in Zoho CRM
// Step 2: Verify OTP and store initial data in Zoho CRM
router.post("/verify-otp", async (req, res) => {
  const { mobile, otp, loanType } = req.body;

  if (!mobile || !loanType || !otp) {
    return res.status(400).json({ success: false, message: "Mobile, loan type, and OTP are required" });
  }

  if (otp !== STATIC_OTP) {
    return res.status(400).json({ success: false, message: "Invalid OTP" });
  }

  try {
    const leadData = zohoService.formatLeadData({ mobile, loanType });
    const result = await zohoService.createOrUpdateLead(leadData);

    if (result.action === 'created' || result.action === 'updated') {
      console.log(`Lead ${result.action} in Zoho CRM with ID: ${result.id}`);
      return res.json({
        success: true,
        message: "OTP verified successfully",
        data: { mobile, loanType },
        zohoResult: { action: result.action, leadId: result.id }
      });
    } else {
      throw new Error("Failed to create or update lead in Zoho CRM");
    }
  } catch (error) {
    console.error('Error storing data in Zoho CRM:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP and store initial data in Zoho CRM",
      errorDetails: error.response?.data || error.message
    });
  }
});

// Step 3: Store complete application data
router.post("/submit-application", async (req, res) => {
  const {
    fullName,
    email,
    dateOfBirth,
    employmentType,
    monthlyIncome,
    cityPincode,
    phoneNumber,
    loanType,
    applicationId,
    leadId // From frontend
  } = req.body;

  // Validation
  if (!fullName || !email || !dateOfBirth || !employmentType || !monthlyIncome || !cityPincode || !phoneNumber || !loanType || !applicationId) {
    return res.status(400).json({
      success: false,
      message: "All required fields (fullName, email, dateOfBirth, employmentType, monthlyIncome, cityPincode, phoneNumber, loanType, applicationId) must be provided"
    });
  }

  try {
    const leadData = zohoService.formatLeadData({
      fullName,
      email,
      dateOfBirth,
      employmentType,
      monthlyIncome,
      cityPincode,
      phoneNumber,
      loanType,
      applicationId
    });

    // Ensure leadId is used if provided, otherwise search might create a new lead
    const result = await zohoService.createOrUpdateLead(leadData, leadId || undefined);
    console.log(`Lead ${result.action} in Zoho CRM with complete data. ID: ${result.id}`);

    return res.json({
      success: true,
      message: "Application submitted successfully",
      data: { applicationId, loanType },
      zohoResult: { action: result.action, leadId: result.id }
    });
  } catch (error) {
    console.error('Error storing complete application in Zoho CRM:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to submit application. Please try again.",
      errorDetails: error.response?.data || error.message
    });
  }
});

// Zoho OAuth callback (for initial setup)
router.get("/zoho/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Authorization code not found');
  }

  try {
    const tokens = await zohoService.getTokens(code);
    res.send(`
      <h2>Zoho CRM Integration Setup Complete!</h2>
      <p>Access token and refresh token have been generated.</p>
      <p>Check your server console for the tokens.</p>
      <p><strong>Important:</strong> Store the refresh token securely in your environment variables.</p>
    `);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Get Zoho authorization URL (for initial setup)
router.get("/zoho-auth-url", (req, res) => {
  const authURL = zohoService.getAuthURL();
  res.json({ authURL });
});

export default router;