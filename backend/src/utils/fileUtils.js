import fs from "fs/promises";

// Чтение JSON из файла
export async function readJSON(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    // Если файла нет — возвращаем null (чтобы код не падал)
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

// Запись JSON в файл (с форматированием)
export async function writeJSON(filePath, data) {
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, json, "utf8");
}