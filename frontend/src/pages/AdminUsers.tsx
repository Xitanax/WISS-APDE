import { useEffect, useState } from "react";
import Container from "../components/Container";
import { API, apiUrl } from "../lib/api";
type U = { id: string; email: string; role: "admin"|"hr"|"applicant"; name?: string|null; birthdate?: string|null; address?: string|null; };

export default function AdminUsers({ token }:{ token: string }) {
  const [list, setList] = useState<U[]>([]);
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [role, setRole] = useState<"admin"|"hr"|"applicant">("hr");

  // Agencies
  const [agName, setAgName] = useState(""); const [agList, setAgList] = useState<any[]>([]);

  async function load(){
    const users = await API.get<U[]>(apiUrl("/v2/users"), token);
    setList(users);
    const ag = await API.get<any[]>(apiUrl("/v2/agencies"), token).catch(()=>[]);
    setAgList(ag||[]);
  }
  useEffect(()=>{ load().catch(console.error); },[token]);

  async function createUser() {
    await API.post(apiUrl("/v2/users"), { email, password: pw, role }, token);
    setEmail(""); setPw(""); setRole("hr"); await load();
  }
  async function setRoleUser(id: string) {
    const r = prompt("Neue Rolle (admin|hr|applicant):", "hr");
    if(!r) return;
    await API.patch(apiUrl(`/v2/users/${id}`), { role: r }, token); await load();
  }
  async function resetPw(id: string) {
    const p = prompt("Neues Passwort:");
    if(!p) return;
    await API.patch(apiUrl(`/v2/users/${id}`), { password: p }, token); await load();
  }
  async function delUser(id: string) {
    if (!confirm("Benutzer löschen?")) return;
    await API.del(apiUrl(`/v2/users/${id}`), token); await load();
  }

  async function createAgency() {
    const r = await API.post<any>(apiUrl("/v2/agencies"), { name: agName }, token);
    alert("API Key: " + r.apiKey); setAgName(""); await load();
  }
  async function rotateKey(id: string) {
    const r = await API.post<any>(apiUrl(`/v2/agencies/${id}/rotate-key`), {}, token);
    alert("Neuer Key: " + r.apiKey); await load();
  }
  async function deleteAgency(id: string) {
    await API.del(apiUrl(`/v2/agencies/${id}`), token); await load();
  }

  return (
    <Container>
      <div className="grid gap-6">
        <section className="card">
          <h2 className="font-semibold mb-3">Benutzerverwaltung (Admin)</h2>
          <div className="grid md:grid-cols-4 gap-2 mb-3">
            <input className="input" placeholder="E-Mail" value={email} onChange={e=>setEmail(e.target.value)} />
            <input className="input" placeholder="Passwort" value={pw} onChange={e=>setPw(e.target.value)} />
            <select className="input" value={role} onChange={e=>setRole(e.target.value as any)}>
              <option value="admin">admin</option>
              <option value="hr">hr</option>
              <option value="applicant">applicant</option>
            </select>
            <button className="btn btn-primary" onClick={createUser}>Anlegen</button>
          </div>
          <div className="space-y-3">
            {list.map(u=>(
              <div key={u.id} className="rounded-xl border p-3 flex justify-between">
                <div className="text-sm">
                  <div className="font-medium">{u.email}</div>
                  <div className="text-xs text-slate-500">Rolle: {u.role}</div>
                </div>
                <div className="flex gap-2">
                  <button className="btn" onClick={()=>setRoleUser(u.id)}>Rolle ändern</button>
                  <button className="btn" onClick={()=>resetPw(u.id)}>Passwort setzen</button>
                  <button className="btn" onClick={()=>delUser(u.id)}>Löschen</button>
                </div>
              </div>
            ))}
            {list.length===0 && <div className="text-sm text-slate-500">Keine Benutzer.</div>}
          </div>
        </section>

        <section className="card">
          <h2 className="font-semibold mb-3">Agencies (externe Partner, Admin)</h2>
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
            Partner greifen <b>nur</b> per API zu: <code>GET /api/agency/jobs</code>, <code>GET /api/agency/applications</code> (Header <code>x-api-key</code> erforderlich).
          </div>
        </section>
      </div>
    </Container>
  );
}
