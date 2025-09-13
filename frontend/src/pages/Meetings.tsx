import { useEffect, useState } from "react";
import Container from "../components/Container";
import { API, apiUrl, Meeting } from "../lib/api";
import { toIsoLocal } from "../lib/date";

export default function Meetings({ token, role }: { token: string; role: string }) {
  const [list, setList] = useState<Meeting[]>([]);
  const [jobId, setJobId] = useState("");
  const [starts, setStarts] = useState(""); // datetime-local
  const [ends, setEnds] = useState("");
  const [mode, setMode] = useState("online");
  const [loc, setLoc] = useState("");

  async function load() {
    if (role==="applicant") {
      const me = await API.get<Meeting[]>(apiUrl("/v2/meetings/me"), token);
      setList(me);
    }
  }
  useEffect(() => { load().catch(console.error); }, [token, role]);

  async function propose() {
    try {
      const body:any = {
        jobId, startsAt: toIsoLocal(starts), endsAt: toIsoLocal(ends),
        mode, location: loc || (mode==="online" ? "Teams-Link folgt" : "")
      };
      const res = await API.post<any>(apiUrl("/v2/meetings"), body, token);
      alert("Meeting vorgeschlagen: " + res.id);
      await load();
    } catch (e:any) {
      alert("Fehler: " + e?.message);
    }
  }

  return (
    <Container>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="card">
          <h2 className="font-semibold mb-3">Meine Meetings</h2>
          <div className="space-y-3">
            {list.map(m => (
              <div key={m.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium">{m.job?.title}</div>
                    <div className="text-sm text-slate-600">
                      {new Date(m.startsAt).toLocaleString()} – {new Date(m.endsAt).toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500">Status: {m.status} · Modus: {m.mode} · Ort: {m.location}</div>
                  </div>
                </div>
              </div>
            ))}
            {list.length===0 && <div className="text-sm text-slate-500">Keine Meetings.</div>}
          </div>
        </section>

        <section className="card">
          <h2 className="font-semibold mb-3">Neuen Termin vorschlagen</h2>
          <div className="grid gap-2">
            <input className="input" placeholder="Job-ID" value={jobId} onChange={e=>setJobId(e.target.value)} />
            <label className="label">Start</label>
            <input className="input" type="datetime-local" value={starts} onChange={e=>setStarts(e.target.value)} />
            <label className="label">Ende</label>
            <input className="input" type="datetime-local" value={ends} onChange={e=>setEnds(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <select className="input" value={mode} onChange={e=>setMode(e.target.value)}>
                <option value="online">online</option>
                <option value="onsite">onsite</option>
              </select>
              <input className="input" placeholder="Ort / Link" value={loc} onChange={e=>setLoc(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={propose}>Vorschlagen</button>
          </div>
          <p className="text-xs text-slate-500 mt-2">Tipp: Job-ID findest du in /api/public/jobs</p>
        </section>
      </div>
    </Container>
  );
}
