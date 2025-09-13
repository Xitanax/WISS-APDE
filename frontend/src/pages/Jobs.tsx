import { useEffect, useState } from "react";
import Container from "../components/Container";
import { API, apiUrl, Job } from "../lib/api";

export default function Jobs({ token, role }: { token?: string | null; role?: string | null }) {
  const [publicJobs, setPublicJobs] = useState<Job[]>([]);
  const [jobsHR, setJobsHR] = useState<any[]>([]);
  const [title, setTitle] = useState(""); const [desc, setDesc] = useState("");
  const [note, setNote] = useState(""); // Applicant Note

  useEffect(() => {
    API.get<Job[]>(apiUrl("/public/jobs")).then(setPublicJobs).catch(console.error);
    if (role === "hr" && token) {
      API.get<any[]>(apiUrl("/v2/jobs"), token).then(setJobsHR).catch(console.error);
    }
  }, [role, token]);

  async function apply(jobId: string) {
    if (!token) return alert("Bitte zuerst anmelden.");
    try {
      const res = await API.post<any>(apiUrl("/v2/applications"), { jobId, note: note || undefined }, token);
      alert("Bewerbung erstellt: " + res.id);
      setNote("");
    } catch (e: any) {
      alert("Fehler: " + e?.message);
    }
  }

  async function createJob() {
    if (!token) return;
    const res = await API.post<any>(apiUrl("/v2/jobs"), { title, description: desc }, token);
    setJobsHR([res, ...jobsHR]); setTitle(""); setDesc("");
  }
  async function delJob(id: string) {
    if (!token) return;
    await API.del(apiUrl(`/v2/jobs/${id}`), token);
    setJobsHR(jobsHR.filter(j => (j._id||j.id) !== id));
  }
  async function publish(id: string) {
    if (!token) return;
    await API.post(apiUrl(`/v2/linkedin/publish/${id}`), {}, token);
    const list = await API.get<any[]>(apiUrl("/v2/jobs"), token);
    setJobsHR(list);
  }
  async function unpublish(id: string) {
    if (!token) return;
    await API.del(apiUrl(`/v2/linkedin/publish/${id}`), token);
    const list = await API.get<any[]>(apiUrl("/v2/jobs"), token);
    setJobsHR(list);
  }

  return (
    <Container>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="card">
          <h2 className="font-semibold mb-3">Offene Stellen</h2>
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="label mb-1">Begleitnotiz zur Bewerbung</div>
              <textarea className="input h-24" placeholder="Kurze Nachricht..." value={note} onChange={e=>setNote(e.target.value)} />
            </div>
            {publicJobs.map(j => (
              <div key={j.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{j.title}</div>
                    <div className="text-sm text-slate-600">{j.description}</div>
                  </div>
                  <button className="btn-primary btn" onClick={() => apply(j.id)}>Bewerben</button>
                </div>
              </div>
            ))}
            {publicJobs.length===0 && <div className="text-sm text-slate-500">Keine offenen Stellen.</div>}
          </div>
        </section>

        {role==="hr" && (
          <section className="card">
            <h2 className="font-semibold mb-3">HR: Jobs & LinkedIn</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              <input className="input" placeholder="Titel" value={title} onChange={e=>setTitle(e.target.value)} />
              <input className="input" placeholder="Beschreibung" value={desc} onChange={e=>setDesc(e.target.value)} />
            </div>
            <button className="btn btn-primary mb-4" onClick={createJob}>Job anlegen</button>
            <div className="space-y-3">
              {jobsHR.map(j => {
                const id = (j._id || j.id) as string;
                return (
                  <div key={id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{j.title}</div>
                        <div className="text-xs text-slate-500">ID: {id}</div>
                        <div className="text-sm text-slate-600">LinkedIn: <b>{j.linkedinPostId ?? "–"}</b></div>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn" onClick={() => publish(id)}>Publish</button>
                        <button className="btn" onClick={() => unpublish(id)}>Unpublish</button>
                        <button className="btn" onClick={() => delJob(id)}>Löschen</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </Container>
  );
}
