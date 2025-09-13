import { useEffect, useState } from "react";
import Container from "../components/Container";
import { API, apiUrl, Application, Meeting } from "../lib/api";
import { toIsoLocal } from "../lib/date";

export default function Admin({ token }: { token: string }) {
  const [jobId, setJobId] = useState("");
  const [apps, setApps] = useState<Application[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [status, setStatus] = useState("in_review");

  // HR Meeting erstellen
  const [aEmail, setAEmail] = useState("");
  const [mStart, setMStart] = useState("");
  const [mEnd, setMEnd] = useState("");
  const [mMode, setMMode] = useState("onsite");
  const [mLoc, setMLoc] = useState("Zürich HQ");

  // Agency
  const [agName, setAgName] = useState("");
  const [agList, setAgList] = useState<any[]>([]);

  async function load() {
    if (jobId) {
      const a = await API.get<Application[]>(apiUrl(`/v2/applications?jobId=${jobId}`), token);
      setApps(a);
      const m = await API.get<Meeting[]>(apiUrl(`/v2/meetings?jobId=${jobId}`), token);
      setMeetings(m);
    }
    const ag = await API.get<any[]>(apiUrl("/v2/agencies"), token).catch(()=>[]);
    setAgList(ag||[]);
  }
  useEffect(() => { if (jobId) load().catch(console.error); }, [jobId, token]);

  async function setAppStatus(id: string) {
    await API.patch(apiUrl(`/v2/applications/${id}`), { status }, token);
    await load();
  }
  async function delApp(id: string) {
    await API.del(apiUrl(`/v2/applications/${id}`), token);
    await load();
  }
  async function createMeetingHR() {
    const body = {
      jobId, applicantEmail: aEmail,
      startsAt: toIsoLocal(mStart), endsAt: toIsoLocal(mEnd),
      mode: mMode, location: mLoc
    };
    await API.post(apiUrl("/v2/meetings"), body, token);
    await load();
  }
  async function acceptMeeting(id: string) {
    await API.patch(apiUrl(`/v2/meetings/${id}`), { status: "accepted" }, token);
    await load();
  }
  async function delMeeting(id: string) {
    await API.del(apiUrl(`/v2/meetings/${id}`), token);
    await load();
  }

  async function createAgency() {
    const r = await API.post<any>(apiUrl("/v2/agencies"), { name: agName }, token);
    alert("API Key: " + r.apiKey);
    setAgName("");
    await load();
  }
  async function rotateKey(id: string) {
    const r = await API.post<any>(apiUrl(`/v2/agencies/${id}/rotate-key`), {}, token);
    alert("Neuer Key: " + r.apiKey);
    await load();
  }
  async function deleteAgency(id: string) {
    await API.del(apiUrl(`/v2/agencies/${id}`), token);
    await load();
  }

  async function importLinkedIn() {
    if (!jobId) return alert("Job-ID setzen");
    const r = await API.post<any>(apiUrl("/v2/linkedin/import-applicant"), {
      profileUrl: "https://www.linkedin.com/in/jane-doe",
      email: "jane@app.local",
      name: "Jane Doe",
      birthdate: "1993-03-14",
      address: "Limmatstr. 1, 8005 Zürich",
      jobId
    }, token);
    alert("Import ok: " + JSON.stringify(r));
  }

  return (
    <Container>
      <div className="grid gap-6">
        <section className="card">
          <h2 className="font-semibold mb-3">Kontext</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <input className="input" placeholder="Job-ID" value={jobId} onChange={e=>setJobId(e.target.value)} />
            <select className="input" value={status} onChange={e=>setStatus(e.target.value)}>
              <option value="submitted">submitted</option>
              <option value="in_review">in_review</option>
              <option value="rejected">rejected</option>
              <option value="offer">offer</option>
            </select>
            <button className="btn" onClick={load}>Aktualisieren</button>
          </div>
        </section>

        <section className="card">
          <h3 className="font-semibold mb-2">Bewerbungen (Job)</h3>
          <div className="space-y-3">
            {apps.map(a => (
              <div key={a.id} className="rounded-xl border p-3">
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium">{a.applicant?.email}</div>
                    <div className="text-xs text-slate-500">Status: {a.status}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn" onClick={()=>setAppStatus(a.id)}>Status setzen</button>
                    <button className="btn" onClick={()=>delApp(a.id)}>Löschen</button>
                  </div>
                </div>
              </div>
            ))}
            {apps.length===0 && <div className="text-sm text-slate-500">Keine Bewerbungen.</div>}
          </div>
        </section>

        <section className="card">
          <h3 className="font-semibold mb-2">Meetings (Job)</h3>
          <div className="grid md:grid-cols-5 gap-2 mb-3">
            <input className="input md:col-span-2" placeholder="Applicant E-Mail" value={aEmail} onChange={e=>setAEmail(e.target.value)} />
            <input className="input" type="datetime-local" value={mStart} onChange={e=>setMStart(e.target.value)} />
            <input className="input" type="datetime-local" value={mEnd} onChange={e=>setMEnd(e.target.value)} />
            <select className="input" value={mMode} onChange={e=>setMMode(e.target.value)}>
              <option value="onsite">onsite</option>
              <option value="online">online</option>
            </select>
            <input className="input md:col-span-4" placeholder="Ort/Link" value={mLoc} onChange={e=>setMLoc(e.target.value)} />
            <button className="btn btn-primary md:col-span-1" onClick={createMeetingHR}>Meeting anlegen</button>
          </div>

          <div className="space-y-3">
            {meetings.map(m => (
              <div key={m.id} className="rounded-xl border p-3">
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium">{m.applicant?.email}</div>
                    <div className="text-sm text-slate-600">{new Date(m.startsAt).toLocaleString()} – {new Date(m.endsAt).toLocaleString()}</div>
                    <div className="text-xs text-slate-500">Status: {m.status} · {m.mode} · {m.location}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn" onClick={()=>acceptMeeting(m.id)}>Akzeptieren</button>
                    <button className="btn" onClick={()=>delMeeting(m.id)}>Löschen</button>
                  </div>
                </div>
              </div>
            ))}
            {meetings.length===0 && <div className="text-sm text-slate-500">Keine Meetings.</div>}
          </div>
        </section>

        <section className="card">
          <h3 className="font-semibold mb-2">LinkedIn-Import (Dummy)</h3>
          <button className="btn" onClick={importLinkedIn}>Beispiel „Jane Doe“ importieren</button>
        </section>

        <section className="card">
          <h3 className="font-semibold mb-2">Agencies</h3>
          <div className="flex gap-2 mb-3">
            <input className="input" placeholder="Agenturname" value={agName} onChange={e=>setAgName(e.target.value)} />
            <button className="btn btn-primary" onClick={createAgency}>Anlegen</button>
          </div>
          <div className="space-y-3">
            {agList.map((a:any) => (
              <div key={a._id} className="rounded-xl border p-3">
                <div className="flex justify-between">
                  <div className="text-sm">
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-slate-500 break-all">API Key: {a.apiKey}</div>
                    <div className="text-xs text-slate-500">Berechtigungen: {(a.permissions||[]).join(", ")}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn" onClick={()=>rotateKey(a._id)}>Key rotieren</button>
                    <button className="btn" onClick={()=>deleteAgency(a._id)}>Löschen</button>
                  </div>
                </div>
              </div>
            ))}
            {agList.length===0 && <div className="text-sm text-slate-500">Keine Agencies.</div>}
          </div>
          <div className="text-xs text-slate-500 mt-3">
            Partner können dann <code>GET /api/agency/jobs</code> und <code>GET /api/agency/applications</code> mit Header <code>x-api-key</code> aufrufen.
          </div>
        </section>
      </div>
    </Container>
  );
}
