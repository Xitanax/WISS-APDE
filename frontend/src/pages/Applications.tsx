import { useEffect, useState } from "react";
import Container from "../components/Container";
import { API, apiUrl, Application } from "../lib/api";
export default function Applications({ token }: { token: string }) {
  const [list, setList] = useState<Application[]>([]);
  useEffect(() => { API.get<Application[]>(apiUrl("/v2/applications/me"), token).then(setList).catch(console.error); }, [token]);
  return (
    <Container>
      <div className="card">
        <h2 className="font-semibold mb-3">Meine Bewerbungen</h2>
        <div className="space-y-3">
          {list.map(a => (
            <div key={a.id} className="rounded-xl border border-slate-200 p-3">
              <div className="font-medium">{a.job?.title}</div>
              <div className="text-sm text-slate-600">{a.job?.description}</div>
              {a.note && <div className="text-xs text-slate-500 mt-1">Notiz: {a.note}</div>}
              <div className="text-xs text-slate-500 mt-1">Status: {a.status}</div>
            </div>
          ))}
          {list.length===0 && <div className="text-sm text-slate-500">Keine Bewerbungen vorhanden.</div>}
        </div>
      </div>
    </Container>
  );
}
