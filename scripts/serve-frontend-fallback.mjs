import http from "node:http";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || "127.0.0.1";
const fallbackFile = join(root, "frontend", "fallback-app.html");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

function contentType(pathname) {
  const extension = pathname.slice(pathname.lastIndexOf("."));
  return mimeTypes[extension] || "application/octet-stream";
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${host}:${port}`);
    if (url.pathname === "/health") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ status: "ok", mode: "frontend-fallback" }));
      return;
    }

    const requestedPath = decodeURIComponent(url.pathname);
    if (requestedPath.startsWith("/assets/")) {
      const assetPath = join(root, "frontend", requestedPath);
      const asset = await readFile(assetPath);
      response.writeHead(200, { "content-type": contentType(assetPath) });
      response.end(asset);
      return;
    }

    const html = await readFile(fallbackFile, "utf8");
    response.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    });
    response.end(html);
  } catch (error) {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end(`ReySoft-Asistencia fallback server error:\n${error instanceof Error ? error.message : String(error)}`);
  }
});

server.listen(port, host, () => {
  console.log(`ReySoft-Asistencia fallback frontend running at http://${host}:${port}`);
  console.log("Install npm later to run the full Vite/React development server.");
});

