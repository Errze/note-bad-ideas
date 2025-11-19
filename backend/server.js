import express from "express";
import cors from "cors";
import notesApi from "./src/api/notesApi.js";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Логирование запросов
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
            health: "/health",
            hello: "/api/hello"
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

// Ваш существующий endpoint
app.get('/api/hello', (req, res) => {
    res.json({message: "Hello from backend :8"});
});

// Подключаем API для заметок
app.use("/api", notesApi);

// Обработка 404
app.use((req, res) => {
    res.status(404).json({ 
        error: "Route not found",
        path: req.path,
        method: req.method
    });
});


// Global error handler
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
    console.log(`❤️  Health check at http://localhost:${PORT}/health`);
    console.log(`👋 Hello endpoint at http://localhost:${PORT}/api/hello`);
});