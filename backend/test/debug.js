import * as Notes from "../storage/noteStorage.js";

console.log('🔍 Debug импорта:');
console.log('Notes:', Notes);
console.log('Keys:', Object.keys(Notes));
console.log('getAllNotes:', typeof Notes.getAllNotes);
console.log('createNote:', typeof Notes.createNote);