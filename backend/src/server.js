
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

app.set("trust proxy", 1);

// Allowed frontend origins
const allowedOrigins = (
  process.env.CLIENT_ORIGINS ||
  [
    "https://update-shop-co.vercel.app",
    "https://update-shop-co-admin.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174",
  ].join(",")
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// CORS must run before API routes
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
    optionsSuccessStatus: 204,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Reuse MongoDB connection between warm serverless invocations
let connectionPromise = null;

async function connectDB() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing");
  }

  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
      })
      .catch((error) => {
        connectionPromise = null;
        throw error;
      });
  }

  await connectionPromise;
}

// Connect database before processing API requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);

    return res.status(503).json({
      message: "Database connection unavailable",
    });
  }
});

// Health endpoint
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "shopco-api",
  });
});

// Existing API routes
app.use("/api", require("./routes"));

// Not found handler
app.use((req, res) => {
  res.status(404).json({
    message: "API route not found",
  });
});

// Central error handler
app.use((error, req, res, next) => {
  console.error("API error:", error.message);

  if (res.headersSent) {
    return next(error);
  }

  res.status(error.status || 500).json({
    message:
      error.status && error.status < 500
        ? error.message
        : "Internal server error",
  });
});

// Local development
if (require.main === module) {
  const PORT = process.env.PORT || 4000;

  app.listen(PORT, () => {
    console.log(`SHOP.CO API running on port ${PORT}`);
  });
}

// Vercel serverless export
module.exports = app;
