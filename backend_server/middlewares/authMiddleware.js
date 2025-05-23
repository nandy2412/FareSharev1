//authMiddleware.js

const admin = require('../config/firebase-admin');

//Getting the authentication headers from the requests that are coming in
module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Missing Authorization header' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;  // contains uid, email, name, etc.
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};