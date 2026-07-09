import express from "express";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Health check API point
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Determine if running in production mode
  const distPath = path.join(process.cwd(), "dist");
  // Check if running from dist or in production NODE_ENV, and ensures index.html exists in dist
  const isProduction =
    (process.env.NODE_ENV === "production" ||
      process.argv[1]?.includes("dist") ||
      !fs.existsSync(path.join(process.cwd(), "index.html"))) &&
    fs.existsSync(path.join(distPath, "index.html"));

  if (!isProduction) {
    console.log("Starting in DEVELOPMENT mode using Vite middleware...");
    // Lazy-load Vite dynamically to prevent module resolution errors in production
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        port: PORT,
        host: "0.0.0.0"
      },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Fallback for SPA routing in development, serving transformed index.html
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const templatePath = path.resolve(process.cwd(), "index.html");
        if (fs.existsSync(templatePath)) {
          let template = fs.readFileSync(templatePath, "utf-8");
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } else {
          next();
        }
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    console.log("Starting in PRODUCTION mode serving static files...");
    // Elegant fallback and static serving for Production builds
    // All routes redirect to index.html to avoid 404 Page Not Found on browser load or page refresh
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });

  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.error(`🚨 FAIL: Port ${PORT} is already in use. A stale process is likely running. Please restart.`);
    } else {
      console.error("🚨 SERVER HTTP LISTEN ERROR:", err);
    }
  });
}

startServer();
