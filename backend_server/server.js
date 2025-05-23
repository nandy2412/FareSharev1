require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dbConnect = require('./config/db');

const userRoutes = require('./routes/users');
const rideRoutes = require('./routes/rides');
const groupRoutes = require('./routes/groups');
const historyRoutes = require('./routes/history');
const driverRoutes = require('./routes/drivers');
const reviewRoutes = require('./routes/reviews')

const app = express();
const PORT = process.env.PORT || 5000;

dbConnect();
app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/reviews', reviewRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status||500).json({ message: err.message });
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));