import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { processHierarchyPayload } from "./hierarchyEngine.js";
import { connectHistoryStore, saveSubmission } from "./historyStore.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8080);

const identity = {
  fullName: process.env.FULL_NAME,
  dob: process.env.DOB_DDMMYYYY,
  email: process.env.EMAIL_ID,
  rollNumber: process.env.COLLEGE_ROLL_NUMBER
};

const allowedOrigin = process.env.CLIENT_ORIGIN || "*";

app.use(
  cors({
    origin: allowedOrigin === "*" ? true : allowedOrigin
  })
);
app.use(express.json({ limit: "64kb" }));

app.get("/", (_req, res) => {
  res.json({ status: "online", route: "/bfhl" });
});

app.post("/bfhl", async (req, res) => {
  const response = processHierarchyPayload(req.body, identity);
  await saveSubmission(req.body, response);
  res.json(response);
});

app.use((error, _req, res, _next) => {
  const message = error.type === "entity.parse.failed" ? "Invalid JSON body" : "Request failed";
  res.status(400).json({ error: message });
});

await connectHistoryStore(process.env.MONGO_URI);

app.listen(port, () => {
  console.log(`Hierarchy API listening on ${port}`);
});
