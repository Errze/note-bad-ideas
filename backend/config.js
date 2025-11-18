// здесь указываются все пути к файлам, директории
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PATHS = {
  root: path.resolve(__dirname, "."),
  data: path.resolve(__dirname, "./data"),
  groups: path.resolve(__dirname, "./data/groups"),
};