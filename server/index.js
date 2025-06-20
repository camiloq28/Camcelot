const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const clientRoutes = require('./routes/client');
const usersRoute = require('./routes/users');
const planRoutes = require('./routes/planRoutes');
const workflowRoutes = require('./routes/workflows');
const integrationRoutes = require('./routes/integrations');
const metaRoutes = require('./routes/integrations/meta');
const greenhouseRoutes = require('./routes/integrations/greenhouse');



const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Connect routes

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/plan', planRoutes); 
app.use('/api', workflowRoutes);
app.use('/api', usersRoute);
app.use('/api/integrations', integrationRoutes);
app.use('/api/integrations/meta', metaRoutes);
app.use('/api/integrations/greenhouse', greenhouseRoutes);
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Handle unmatched routes with a JSON 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
