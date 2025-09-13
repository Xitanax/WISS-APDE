import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import Header from "./components/Header";
import Home from "./pages/Home";
import Jobs from "./pages/Jobs";
import Auth from "./pages/Auth";
import Applications from "./pages/Applications";
import Meetings from "./pages/Meetings";
import HR from "./pages/HR";
import AdminUsers from "./pages/AdminUsers";

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [role, setRole] = useState<string | null>(() => localStorage.getItem("role"));
  function onLogin(t: string, r: string) { setToken(t); setRole(r); localStorage.setItem("token", t); localStorage.setItem("role", r); }
  function onLogout(){ setToken(null); setRole(null); localStorage.removeItem("token"); localStorage.removeItem("role"); }

  return (
    <BrowserRouter>
      <Header token={token} role={role as any} onLogout={onLogout}/>
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/jobs" element={<Jobs token={token} role={role}/>} />
        <Route path="/auth" element={<Auth onLogin={onLogin}/>} />
        {role==="applicant" && (
          <>
            <Route path="/applications" element={<Applications token={token!}/>} />
            <Route path="/meetings" element={<Meetings token={token!} role={role!}/>} />
          </>
        )}
        {role==="hr" && (<Route path="/hr" element={<HR token={token!}/>} />)}
        {role==="admin" && (<Route path="/admin" element={<AdminUsers token={token!}/>} />)}
        <Route path="*" element={<Home/>} />
      </Routes>
    </BrowserRouter>
  );
}
