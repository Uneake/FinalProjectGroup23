import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/quizApp";

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

export default mongoose;
