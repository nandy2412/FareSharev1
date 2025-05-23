const mongoose = require('mongoose');

module.exports = () => {
  //Connecting the MongoDB using the variables saved in the .env file
  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('MongoDB connected')) //Logging on the console if the db is connected or not
  .catch(err => { console.error(err); process.exit(1); });
};