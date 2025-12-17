// backend/src/services/index.js
import { PATHS } from "../config.js";
import { GroupService } from "./groupService.js";
import { NoteService } from "./noteService.js";

export const groupService = new GroupService({ storageRoot: PATHS.data });
export const noteService = new NoteService(groupService);
