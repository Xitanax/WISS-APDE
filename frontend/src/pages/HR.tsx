import { useEffect, useState } from "react";
import Container from "../components/Container";
import { API, apiUrl, Application, Meeting, Job } from "../lib/api";
import { toIsoLocal } from "../lib/date";

export default function HR({ token }: { token: string }) {
  const [jobs, setJobs] = useState<(Job & {_id?:string})[]>([]);
  const [jobId, setJobId] = useState<string>("");
  const [apps, setApps] = useState<Application[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [status, setStatus] = useState("in_review");

  // HR Meeting erstellen
  const [aEmail, setAEmail] = useState("");
  const [mStart, setMStart] = useState("");
  const [mEnd, setMEnd] = useState("");
  const [mMode, setMMode] = useState("onsite");
  const [mLoc, setMLoc] = useState("Zürich HQ");

  async function loadJobs() {
    const list = await API.get<any[]>(apiUrl("/v2/jobs"), token);
    setJobs(list);
  }
  async function loadData() {
    const appsUrl = apiUrl(`/v2/applications${jobId ? `?jobId=${jobId}` : ""}`);
    const a = await API.get<Application[]>(appsUrl, token);
    setApps(a);
    if (jobId) {
      const m = await API.get<Meeting[]>(apiUrl(`/v2/meetings?jobId=${jobId}`), token);
      setMeetings(m);
    } else {
      setMeetings([]);
    }
  }
  useEffect(() => { loadJobs().catch(console.error); }, [token]);
  useEffect(() => { loadData().catch(console.error); }, [token, jobId]);

  async function setAppStatus(id: string) {
    await API.patch(apiUrl(`/v2/applications/${id}`), { status }, token);
    await loadData();
  }
  async function editNote(id: string) {
    const note = prompt("Neue Notiz (leer = entfernen)") ?? "";
    await API.patch(apiUrl(`/v2/applications/${id}`), { note: note || null }, token);
    await loadData();
  }
  async function delApp(id: string) {
    await API.del(apiUrl(`/v2/applications/${id}`), token);
    await loadData();
  }
  async function createMeetingHR() {
    const body = { jobId, applicantEmail: aEmail, startsAt: toIsoLocal(mStart), endsAt: toIsoLocal(mEnd), mode: mMode, location: mLoc };
    await API.post(apiUrl("/v2/meetings"), body, token);
    await loadData();
  }
  async function acceptMeeting(id: string) {
    await API.patch(apiUrl(`/v2/meetings/${id}`), { status: "accepted" }, token);
    await loadData();
  }
  async function delMeeting(id: string) {
    await API.del(apiUrl(`/v2/meetings/${id}`), token);
    await loadData();
  }

  return (
    <Container>
      <div className="grid gap-6">
        <section className="card">
          <h2 className="font-semibold mb-3">Kontext</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <select className="input" value={jobId} onChange={e=>setJobId(e.target.value)}>
              <option value="">Alle Jobs</option>
              {jobs.map(j => <option key={(j._id||j.id)} value={(j._id||j.id) as string}>{j.title}</option>)}
            </select>
            <select className="input" value={status} onChange={e=>setStatus(e.target.value)}>
              <option value="submitted">submitted</option>
              <option value="in_review">in_review</option>
              <option value="rejected">rejected</option>
              <option value="offer">offer</option>
            </select>
            <button className="btn" onClick={loadData}>Aktualisieren</button>
          </div>
        </section>

        <section className="card">
          <h3 className="font-semibold mb-2">Bewerbungen {jobId ? "(Job)" : "(alle Jobs)"}</h3>
          <div className="space-y-3">
            {apps.map(a => (
              <div key={a.id} className="rounded-xl border p-3">
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium">{a.applicant?.email}</div>
                    {a.job?.title && <div className="text-xs text-slate-500">Job: {a.job.title}</div>}
                    {a.note && <div className="text-xs text-slate-500">Notiz: {a.note}</div>}
                    <div className="text-xs text-slate-500">Status: {a.status}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn" onClick={()=>setAppStatus(a.id)}>Status setzen</button>
                    <button className="btn" onClick={()=>editNote(a.id)}>Notiz ändern</button>
                    <button className="btn" onClick={()=>delApp(a.id)}>Löschen</button>
                  </div>
                </div>
              </div>
            ))}
            {apps.length===0 && <div className="text-sm text-slate-500">Keine Bewerbungen.</div>}
          </div>
        </section>

        <section className="card">
          <h3 className="font-semibold mb-2">Meetings {jobId ? `(Job)` : `(bitte Job wählen)`}</h3>
          <div className="grid md:grid-cols-5 gap-2 mb-3">
            <input className="input md:col-span-2" placeholder="Applicant E-Mail" value={aEmail} onChange={e=>setAEmail(e.target.value)} disabled={!jobId}/>
            <input className="input" type="datetime-local" value={mStart} onChange={e=>setMStart(e.target.value)} disabled={!jobId}/>
            <input className="input" type="datetime-local" value={mEnd} onChange={e=>setMEnd(e.target.value)} disabled={!jobId}/>
            <select className="input" value={mMode} onChange={e=>setMMode(e.target.value)} disabled={!jobId}>
              <option value="onsite">onsite</option>
              <option value="online">online</option>
            </select>
            <input className="input md:col-span-4" placeholder="Ort/Link" value={mLoc} onChange={e=>setMLoc(e.target.value)} disabled={!jobId}/>
            <button className="btn btn-primary md:col-span-1" onClick={createMeetingHR} disabled={!jobId}>Meeting anlegen</button>
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
            {meetings.length===0 && <div className="text-sm text-slate-500">{jobId ? "Keine Meetings." : "Bitte Job wählen."}</div>}
          </div>
        </section>

        <section className="card">
          <h3 className="font-semibold mb-2">LinkedIn-Import (Dummy)</h3>
          <p className="text-xs text-slate-500 mb-2">Erstellt einen Applicant + optional Bewerbung für den ausgewählten Job.</p>
          <button className="btn" onClick={async ()=>{ if(!jobId){alert("Bitte Job wählen"); return;} const r=await API.post<any>(apiUrl("/v2/linkedin/import-applicant"),{ profileUrl:"https://www.linkedin.com/in/jane-doe", email:"jane@app.local", name:"Jane Doe", birthdate:"1993-03-14", address:"Limmatstr. 1, 8005 Zürich", jobId }, token); alert("Import ok: "+JSON.stringify(r)); await loadData(); }}>Beispiel „Jane Doe“ importieren</button>
        </section>
      </div>
    </Container>
  );
}
