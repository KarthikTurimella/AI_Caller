import fs from "fs";
import path from "path";

const MEDIA_DIR = path.resolve(process.cwd(), "media");

export function ensureMediaDir() {
  if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });
  return MEDIA_DIR;
}

export function mediaFilePath(filename) {
  return path.join(ensureMediaDir(), filename);
}
