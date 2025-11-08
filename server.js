import { createServer } from "http";
import { parse } from "url";
import next from "next/dist/server/next.js";
import path from "path";
import { fileURLToPath } from "url";

// Asegurar cwd correcto en Azure
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.chdir(__dirname);

const port = process.env.PORT || 8080;
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`🚀 Quanta Portal running on http://localhost:${port}`);
  });
});
