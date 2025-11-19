import express from "express";
import cors from "cors";
import notesApi from "./notesApi.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Логирование запросов ДО роутов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Корневой маршрут
app.get("/", (req, res) => {
    res.json({
        message: "Welcome to Notes Manager API",
        version: "1.0.0", 
        availableEndpoints: {
            api: "/api",
            health: "/health"
        }
    });
});

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ 
        status: "OK", 
        timestamp: new Date().toISOString(),
        service: "notes-manager-api"
    });
});

// Endpoint для создания групп (добавьте перед notesApi)
app.post('/api/groups', (req, res) => {
  const { groupName } = req.body;
  
  if (!groupName || !groupName.trim()) {
    return res.status(400).json({ error: 'Group name is required' });
  }
  
  res.json({ 
    success: true, 
    message: `Group '${groupName}' will be created when you add the first note`,
    groupName: groupName.trim()
  });
});

// Подключаем API для заметок (ТОЛЬКО ОДИН РАЗ)
app.use("/api", notesApi);

// Обработка 404 (после всех роутов)
app.use((req, res) => {
    res.status(404).json({ 
        error: "Route not found",
        path: req.path,
        method: req.method
    });
});

// Global error handler (после всех middleware)
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        error: "Internal server error",
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 API server running on http://localhost:${PORT}`);
    console.log(`📝 Notes API available at http://localhost:${PORT}/api/groups/:groupId/notes`);
    console.log(`👥 Groups API available at http://localhost:${PORT}/api/groups`);
    console.log(`❤️  Health check at http://localhost:${PORT}/health`);
});