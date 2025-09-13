import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import swaggerUi from "swagger-ui-express";

export function mountApiDocs(app) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const specPath = path.join(__dirname, "..", "openapi.yaml");
  let yamlText = "";
  try {
    yamlText = fs.readFileSync(specPath, "utf8");
  } catch {
    console.error("[docs] openapi.yaml not found at", specPath);
    yamlText = "openapi: 3.0.3\ninfo:\n  title: Chocadies API\n  version: '0.0.0'\npaths: {}";
  }
  let spec;
  try {
    spec = YAML.parse(yamlText);
  } catch (e) {
    console.error("[docs] YAML parse error:", e);
    spec = { openapi: "3.0.3", info: { title: "Chocadies API (invalid openapi.yaml)", version: "0.0.0" }, paths: {} };
  }

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(spec, {
    explorer: true,
    swaggerOptions: { persistAuthorization: true }
  }));

  app.get("/api/openapi.yaml", (_req, res) => {
    res.type("text/yaml").send(yamlText);
  });
}
