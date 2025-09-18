// server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const mysql = require("mysql2/promise");
const { Connector } = require("@google-cloud/cloud-sql-connector");

const app = express();

// CORS: allow localhost (dev) + your Firebase Hosting domain
const allowed = [
  "http://localhost:3000",
  "https://data-application-472423.web.app",
];
app.use(cors({ origin: allowed }));
app.use(express.json());

// Lazy-create a MySQL pool via Cloud SQL Connector
let pool;
async function getPool() {
  if (pool) return pool;

  const connector = new Connector();
  const clientOpts = await connector.getOptions({
    instanceConnectionName: process.env.INSTANCE_CONNECTION_NAME,
    ipType: "PUBLIC", // use "PRIVATE" only if your instance has private IP + VPC connector
  });

  pool = mysql.createPool({
    ...clientOpts,            // socket/host + TLS
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME, // ensure this has NO spaces
    waitForConnections: true,
    connectionLimit: 5,
  });

  return pool;
}

app.get("/health", (_req, res) => res.send("ok"));

app.get("/api/test", async (_req, res, next) => {
  try {
    const db = await getPool();
    const [rows] = await db.query("SELECT NOW() AS now");
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// (optional) basic error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "internal_error" });
});

// IMPORTANT for Cloud Run
const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server running on ${port}`);
});
