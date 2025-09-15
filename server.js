

// import express from 'express';
// import cors from 'cors';
// import bodyParser from 'body-parser';
// import dotenv from 'dotenv';

// dotenv.config();
// const app = express();
// app.use(cors());
// app.use(bodyParser.json());

// // Routes
// import authRoutes from './routes/auth.js';
// app.use('/api/auth', authRoutes);

// // For local development only
// const PORT = process.env.PORT || 5000;
// if (process.env.NODE_ENV !== 'production') {
//   app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// }

// // Export for Vercel
// export default app;

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

// Only load .env file in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Health check route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Credpe Backend Server is running!', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    hasZohoConfig: !!(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_REFRESH_TOKEN)
  });
});

// Routes with error handling
try {
  const authRoutes = await import('./routes/auth.js');
  app.use('/api/auth', authRoutes.default);
  console.log('Auth routes loaded successfully');
} catch (error) {
  console.error('Failed to load auth routes:', error.message);
  
  // Fallback routes
  app.use('/api/auth/*', (req, res) => {
    res.status(500).json({ 
      success: false, 
      message: 'Auth service temporarily unavailable',
      error: error.message
    });
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// For local development only
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// Export for Vercel
export default app;