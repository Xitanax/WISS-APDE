import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import swaggerUi from "swagger-ui-express";

export function mountApiDocs(app) {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const specPath = path.join(__dirname, "..", "openapi.yaml");
    const yamlText = fs.readFileSync(specPath, "utf8");
    const spec = YAML.parse(yamlText);
    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(spec, {
      explorer: true,
      swaggerOptions: { persistAuthorization: true }
    }));
    app.get("/api/openapi.yaml", (_req, res) => {
      res.type("text/yaml").send(yamlText);
    });
  } catch (e) {
    console.error("[docs] mount failed, continuing without UI", e);
  }
}
