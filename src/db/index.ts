import mongoose from 'mongoose';

async function connectDB() {
    try {
        if (mongoose.connection.readyState >= 1) return;
        const connect = await mongoose.connect(process.env.MONGO_URL as string || 'mongodb://localhost:27017/processx_db');
        return connect;
    } catch (error) {
        console.log(error);
    }
}

export default connectDB;