import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "src")));


app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "index.html"));
});

const PORT = 3221;
app.listen(PORT, () => console.log(`Frontend running on http://localhost:${PORT}`));
