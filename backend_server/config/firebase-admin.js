const admin = require('firebase-admin');
const serviceAccount = require('../firebaseserviceaccount.json'); //Loading the service account key (private)

//Initializing the admin application using the certficate from the service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;
