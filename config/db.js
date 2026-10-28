const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/farm_ledger';
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(mongoURI, opts).then((conn) => {
      console.log(` MongoDB Connected: ${conn.connection.host} / ${conn.connection.name}`);
      return conn;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    console.error(` MongoDB Connection Error: ${error.message}`);
    if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
      process.exit(1);
    }
    throw error;
  }
};

module.exports = connectDB;
