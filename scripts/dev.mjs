// A tiny static server for the demo: ./demo at the root, ./dist at /dist. Port 8400 is this package's own (8400 to 8499); PORT overrides it,
// and the tests' server (8401) and the picture script (8402) take the next ones. `pnpm dev` builds first.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const port = Number(process.env.PORT ?? 8400);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json", ".webp": "image/webp", ".png": "image/png" };

createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  const rel = normalize(path === "/" ? "/index.html" : path).replace(/^([/\\])+/, "");
  const vendor = rel.startsWith("vendor/three/");
  const base = rel.startsWith("dist/") ? root : join(root, "demo");
  const file = vendor ? join(root, "node_modules", "three", "build", rel.slice("vendor/three/".length)) : join(base, rel);
  if (!file.startsWith(root)) { response.writeHead(403).end("no"); return; }
  try {
    response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" }).end(await readFile(file));
  } catch {
    response.writeHead(404, { "content-type": "text/plain" }).end("not found");
  }
}).listen(port, "127.0.0.1", () => console.log(`Kazoku UI demo on http://127.0.0.1:${port}/`));
