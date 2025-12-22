import express from "express";
import cors from "cors";

import groupsRouter from "./routes/groups.js";
import groupNotes from "./routes/notes.js";
import aiRouter from "./routes/ai.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger.js"
import settingsRoutes from "./routes/settings.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/settings", settingsRoutes);

// Логирование запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use("/api/groups", groupsRouter);
app.use("/api/groups", groupNotes);

// AI proxy routes
app.use("/api/ai", aiRouter);

// Корневой маршрут
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Notes Manager API",
    version: "1.0.0",
    availableEndpoints: {
      groups: "/api/groups",
      notes: "/api/groups/:groupId/notes",
      ai: "/api/ai",
      health: "/health",
      hello: "/api/hello",
    },
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "notes-manager-api",
  });
});

app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from backend :8" });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
    method: req.method,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
});
