import express from "express";
import cors from "cors";
import sessionRoutes from "./src/routes/Route.js";
import "./config/db.js";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/session", sessionRoutes);

const PORT = process.env.PORT || 3222;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
