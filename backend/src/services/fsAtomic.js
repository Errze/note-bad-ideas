import fs from "fs/promises";
import path from "path";

/**
 * Атомарно пишет JSON:
 * 1) mkdir для директории
 * 2) пишет во временный файл рядом (same dir)
 * 3) rename -> target (rename обычно атомарен в пределах одного FS)
 */
export async function atomicWriteJson(filePath, data) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  const tmpPath =
    filePath + `.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const payload = JSON.stringify(data, null, 2);

  // Важно: tmp в той же директории, иначе rename не будет атомарным.
  await fs.writeFile(tmpPath, payload, "utf-8");

  // На Windows rename не перезаписывает существующий файл так же удобно,
  // поэтому удалим старый (если есть) и переименуем tmp -> target.
  try {
    await fs.rename(tmpPath, filePath);
  } catch (e) {
    // fallback: если целевой уже существует и мешает
    try {
      await fs.unlink(filePath);
    } catch (_) {
      // игнорируем ENOENT
    }
    await fs.rename(tmpPath, filePath);
  }
}