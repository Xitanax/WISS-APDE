import { useEffect, useState } from "react";
import Container from "../components/Container";
export default function Home() {
  const [ok, setOk] = useState<string>("");
  useEffect(() => { fetch("/api/health").then(r => r.json()).then(setOk).catch(()=>setOk("error")); }, []);
  return (
    <Container>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card">
          <h1 className="text-xl font-semibold mb-2">Willkommen bei Chocadies 🍫</h1>
          <p className="text-slate-600">Recruiting-Plattform mit Rollen: Admin, HR, Applicants.</p>
          <div className="mt-4 text-sm text-slate-500">Backend Health: <b>{ok || "…"}</b></div>
        </div>
        <div className="card">
          <h2 className="font-semibold mb-2">Links</h2>
          <ul className="list-disc pl-5 text-sm space-y-1">
            <li><a className="link" href="/api/docs" target="_blank" rel="noreferrer">Swagger-UI</a></li>
            <li><a className="link" href="/api/openapi.yaml" target="_blank" rel="noreferrer">OpenAPI YAML</a></li>
          </ul>
        </div>
      </div>
    </Container>
  );
}
