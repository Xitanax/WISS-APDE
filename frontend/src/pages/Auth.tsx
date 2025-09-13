import Container from "../components/Container";
import { API, apiUrl } from "../lib/api";
import { useState } from "react";

export default function Auth({ onLogin }:{ onLogin: (token:string, role:string)=>void }) {
  const [email, setEmail] = useState("bob@app.local");
  const [pw, setPw] = useState("secret123");
  const [rEmail, setREmail] = useState("");
  const [rPw, setRPw] = useState("");
  const [rBirth, setRBirth] = useState("");
  const [rAddr, setRAddr] = useState("");

  async function login() {
    try {
      const res = await API.post<any>(apiUrl("/auth/login"), { email, password: pw });
      onLogin(res.token, res.role);
    } catch (e:any) { alert("Login fehlgeschlagen: " + e?.message); }
  }
  async function register() {
    try {
      await API.post<any>(apiUrl("/public/register"), { email: rEmail, password: rPw, birthdate: rBirth || undefined, address: rAddr || undefined });
      alert("Registrierung ok. Jetzt anmelden.");
    } catch (e:any) { alert("Registrierung fehlgeschlagen: " + e?.message); }
  }

  return (
    <Container>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold mb-3">Anmelden</h2>
          <div className="space-y-2">
            <div><div className="label">E-Mail</div><input className="input" value={email} onChange={e=>setEmail(e.target.value)} /></div>
            <div><div className="label">Passwort</div><input className="input" type="password" value={pw} onChange={e=>setPw(e.target.value)} /></div>
            <button className="btn btn-primary" onClick={login}>Login</button>
          </div>
          <p className="mt-3 text-xs text-slate-500">Admin/HR gemäß deinen Nutzern; Applicant kann sich selbst registrieren.</p>
        </div>
        <div className="card">
          <h2 className="font-semibold mb-3">Registrieren (Applicant)</h2>
          <div className="grid gap-2">
            <div><div className="label">E-Mail</div><input className="input" value={rEmail} onChange={e=>setREmail(e.target.value)} /></div>
            <div><div className="label">Passwort</div><input className="input" type="password" value={rPw} onChange={e=>setRPw(e.target.value)} /></div>
            <div><div className="label">Geburtsdatum</div><input className="input" type="date" value={rBirth} onChange={e=>setRBirth(e.target.value)} /></div>
            <div><div className="label">Adresse</div><input className="input" value={rAddr} onChange={e=>setRAddr(e.target.value)} /></div>
            <button className="btn btn-primary" onClick={register}>Registrieren</button>
          </div>
        </div>
      </div>
    </Container>
  );
}
