import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PATHS = {
  src: path.resolve(__dirname, "."),
  backend: path.resolve(__dirname, ".."),
  data: path.resolve(__dirname, "../storage"),
  groups: path.resolve(__dirname, "../storage/groups"),
};
