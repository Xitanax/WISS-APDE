// backend/src/apiDocs.js
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import swaggerUi from "swagger-ui-express";

/**
 * Mounts:
 *   - GET  /api/openapi.yaml  (liefert YAML-Text)
 *   - GET  /api/docs          (Swagger-UI)
 *
 * Robust gegen:
 *   - fehlende openapi.yaml
 *   - YAML-Parsefehler
 *   - ungültige/teilweise Specs
 */
export function mountApiDocs(app) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const specPath = path.join(__dirname, "..", "openapi.yaml");

  let yamlText = "";
  try {
    yamlText = fs.readFileSync(specPath, "utf8");
  } catch (e) {
    console.warn("[docs] openapi.yaml nicht gefunden – fallback minimal spec");
    yamlText = [
      "openapi: 3.0.3",
      "info:",
      "  title: Chocadies API (docs missing)",
      "  version: '0.0.0'",
      "paths: {}",
      "",
    ].join("\n");
  }

  let spec;
  try {
    spec = YAML.parse(yamlText);
  } catch (e) {
    console.warn("[docs] YAML parse error – Swagger zeigt leere Spec. Fehler:", e.message);
    spec = {
      openapi: "3.0.3",
      info: { title: "Chocadies API (invalid openapi.yaml)", version: "0.0.0" },
      paths: {},
      "x-parseError": e.message,
    };
  }

  // YAML roher Text – immer lieferbar
  app.get("/api/openapi.yaml", (_req, res) => {
    res.type("text/yaml").send(yamlText);
  });

  // Swagger-UI – mit persistAuthorization
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      explorer: true,
      swaggerOptions: { persistAuthorization: true },
    })
  );

  console.log("[docs] mounted /api/openapi.yaml & /api/docs");
}
