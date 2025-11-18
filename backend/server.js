import express from "express";
// import { Storage } from "./storage/index.js";

const app = express();
const PORT = 3001;
app.use(express.json());

app.get('/api/hello', (req, res) => {
    res.json({message: "Hello from backend :8"});
});

app.get('/', (req, res) => {
    res.send(`<h1>Hello, world, Node.js!</h1>`);
});

// app.get("/notes/:group", async (req, res) => {
//   try {
//     const notes = await Storage.getNotes(req.params.group);
//     res.json(notes);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Ошибка при чтении заметок" });
//   }
// });

// app.post("/notes/:group", async (req, res) => {
//   try {
//     const newNote = await Storage.createNote(req.params.group, req.body);
//     res.json(newNote);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Ошибка при создании заметки" });
//   }
// });

// app.delete("/notes/:group/:id", async (req, res) => {
//   await Storage.deleteNote(req.params.group, req.params.id);
//   res.json({ ok: true });
// });

app.listen(PORT, () => {
    console.log(`Backend работает на http://localhost:${PORT}`);
});