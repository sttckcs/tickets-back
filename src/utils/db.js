const mongoose = require('mongoose');
require('dotenv').config();

const DB_URL = process.env.DB_URL;

const connectDB = async () => {
  try {
    const DB = await mongoose.connect(DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const { name, host } = DB.connection;
    console.log(`Connected to MongoDB: ${name}, in host ${host}`);
  } catch (error) {
    console.error('Failed to connect to MongoDB', error);
    process.exit(1);
  }
};

module.exports = {connectDB};
