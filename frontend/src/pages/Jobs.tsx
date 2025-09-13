import { useEffect, useState } from "react";
import Container from "../components/Container";
import { API, apiUrl, Job } from "../lib/api";

export default function Jobs({ token, role }: { token?: string | null; role?: string | null }) {
  const [publicJobs, setPublicJobs] = useState<Job[]>([]);
  const [jobsAdmin, setJobsAdmin] = useState<any[]>([]);
  const [title, setTitle] = useState(""); const [desc, setDesc] = useState("");

  useEffect(() => {
    API.get<Job[]>(apiUrl("/public/jobs")).then(setPublicJobs).catch(console.error);
    if (role === "admin" && token) {
      API.get<any[]>(apiUrl("/v2/jobs"), token).then(setJobsAdmin).catch(console.error);
    }
  }, [role, token]);

  async function apply(jobId: string) {
    if (!token) return alert("Bitte zuerst anmelden.");
    try {
      const res = await API.post<any>(apiUrl("/v2/applications"), { jobId }, token);
      alert("Bewerbung erstellt: " + res.id);
    } catch (e: any) {
      alert("Fehler: " + e?.message);
    }
  }

  async function createJob() {
    if (!token) return;
    const res = await API.post<any>(apiUrl("/v2/jobs"), { title, description: desc }, token);
    setJobsAdmin([res, ...jobsAdmin]);
    setTitle(""); setDesc("");
  }
  async function delJob(id: string) {
    if (!token) return;
    await API.del(apiUrl(`/v2/jobs/${id}`), token);
    setJobsAdmin(jobsAdmin.filter(j => (j._id||j.id) !== id));
  }
  async function publish(id: string) {
    if (!token) return;
    await API.post(apiUrl(`/v2/linkedin/publish/${id}`), {}, token);
    const list = await API.get<any[]>(apiUrl("/v2/jobs"), token);
    setJobsAdmin(list);
  }
  async function unpublish(id: string) {
    if (!token) return;
    await API.del(apiUrl(`/v2/linkedin/publish/${id}`), token);
    const list = await API.get<any[]>(apiUrl("/v2/jobs"), token);
    setJobsAdmin(list);
  }

  return (
    <Container>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="card">
          <h2 className="font-semibold mb-3">Offene Stellen</h2>
          <div className="space-y-3">
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

        {role==="admin" && (
          <section className="card">
            <h2 className="font-semibold mb-3">Admin: Jobs & LinkedIn</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              <input className="input" placeholder="Titel" value={title} onChange={e=>setTitle(e.target.value)} />
              <input className="input" placeholder="Beschreibung" value={desc} onChange={e=>setDesc(e.target.value)} />
            </div>
            <button className="btn btn-primary mb-4" onClick={createJob}>Job anlegen</button>

            <div className="space-y-3">
              {jobsAdmin.map(j => {
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
