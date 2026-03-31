const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/admission_crm')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
const masterRoutes = require('./src/routes/master');
const admissionRoutes = require('./src/routes/admission');
const dashboardRoutes = require('./src/routes/dashboard');
const authRoutes = require('./src/routes/auth');

app.use('/api/master', masterRoutes);
app.use('/api/admission', admissionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
