import { GroupService } from "./groupService.js";
import { NoteService } from "./noteService.js";

export const groupService = new GroupService();
export const noteService = new NoteService(groupService);
