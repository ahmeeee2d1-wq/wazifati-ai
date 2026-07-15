import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const rootArg = process.argv.find((value) => value.startsWith("--root="));
const root = rootArg ? path.resolve(scriptRoot, rootArg.slice(7)) : scriptRoot;
const host = "127.0.0.1";
const port = 4173;
const testMode = process.argv.includes("--test");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${host}:${port}`);
  if (testMode && url.pathname === "/__shutdown") {
    response.writeHead(200).end();
    server.close();
    return;
  }
  if (request.method !== "GET") {
    response.writeHead(405, { Allow: "GET" }).end();
    return;
  }

  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const target = path.resolve(root, `.${pathname}`);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end();
    return;
  }
  try {
    const body = await fs.readFile(target);
    response.writeHead(200, {
      "Content-Type": mime[path.extname(target).toLowerCase()] || "application/octet-stream",
      "Content-Length": body.length,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") console.error("Port 4173 is already in use. Close the previous Wazifati window and try again.");
  else console.error(error.message);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`Wazifati AI is running at http://${host}:${port}`);
  console.log("Keep this window open. Press Ctrl+C to stop.");
});
