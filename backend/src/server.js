require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const membersRoutes = require('./routes/members');
const subscriptionsRoutes = require('./routes/subscriptions');
const paymentsRoutes = require('./routes/payments');
const plansRoutes = require('./routes/plans');
const accessLogsRoutes = require('./routes/accessLogs');
const expensesRoutes = require('./routes/expenses');
const usersRoutes = require('./routes/users');
const terminalRoutes = require('./routes/terminal');
const auditRoutes = require('./routes/audit');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/members', membersRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/access-logs', accessLogsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/terminal', terminalRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ Gym Atlas API running on http://localhost:${PORT}`);
});
