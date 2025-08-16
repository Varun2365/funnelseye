const mongoose = require('mongoose');

// Define the MongoDB connection URI.
const mongoURI = 'mongodb://localhost:27017/FunnelsEye'; 

/**
 * Connects to the MongoDB database using Mongoose.
 * This function handles the connection logic, including success and error logging.
 */
const connectDB = async () => {
    try {

        await mongoose.connect(mongoURI);

        console.log('MongoDB Connected Successfully!');
    } catch (err) {
        // Log any connection errors.
        console.error('MongoDB Connection Failed:', err.message);
        // Exit process with failure (optional, but common in backend apps)
        process.exit(1);
    }
};



module.exports = {connectDB};