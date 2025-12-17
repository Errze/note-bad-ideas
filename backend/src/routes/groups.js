import express from "express";
import { groupService as groups } from "../services/index.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    res.json(await groups.list());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load groups" });
  }
});

router.post("/", async (req, res) => {
  try {
    const created = await groups.create(req.body?.title);
    res.status(201).json(created);
  } catch (e) {
    if (e.message === "INVALID_TITLE") return res.status(400).json({ error: "Invalid title" });
    if (e.message === "GROUP_EXISTS") return res.status(409).json({ error: "Group exists" });
    console.error(e);
    res.status(500).json({ error: "Failed to create group" });
  }
});

router.patch("/:groupId", async (req, res) => {
  try {
    const updated = await groups.rename(req.params.groupId, req.body?.title);
    res.json(updated);
  } catch (e) {
    if (e.message === "GROUP_NOT_FOUND") return res.status(404).json({ error: "Group not found" });
    if (e.message === "GROUP_EXISTS") return res.status(409).json({ error: "Group exists" });
    if (e.message === "INVALID_TITLE") return res.status(400).json({ error: "Invalid title" });
    console.error(e);
    res.status(500).json({ error: "Failed to rename group" });
  }
});

router.delete("/:groupId", async (req, res) => {
  try {
    const cascade = String(req.query.cascade ?? "true") === "true";
    res.json(await groups.delete(req.params.groupId, { cascade }));
  } catch (e) {
    if (e.message === "GROUP_NOT_FOUND") return res.status(404).json({ error: "Group not found" });
    if (e.message === "GROUP_NOT_EMPTY") return res.status(409).json({ error: "Group not empty" });
    console.error(e);
    res.status(500).json({ error: "Failed to delete group" });
  }
});

export default router;
