const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Basic test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'WorkTime ERP API is running' });
});

// Placeholder for auth and user routes
// app.use('/api/auth', require('./routes/authRoutes'));
// app.use('/api/punches', require('./routes/punchRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
