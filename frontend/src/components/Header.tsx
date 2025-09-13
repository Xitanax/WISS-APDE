import { Link, NavLink } from "react-router-dom";
import { Book, FileText, LogIn, LogOut, User, Briefcase, Calendar, Shield } from "lucide-react";

export default function Header({ token, role, onLogout }:{
  token?: string | null; role?: "admin" | "applicant" | null; onLogout: () => void;
}) {
  const navLink = ({ isActive }: any) =>
    "px-3 py-2 rounded-lg " + (isActive ? "bg-slate-900 text-white" : "hover:bg-slate-200");
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        <Link to="/" className="font-semibold text-slate-900 tracking-tight">🍫 Chocadies</Link>
        <nav className="hidden md:flex items-center gap-2 text-sm">
          <NavLink className={navLink} to="/jobs"><Briefcase size={16}/> Jobs</NavLink>
          {token && role==="applicant" && (
            <>
              <NavLink className={navLink} to="/applications"><FileText size={16}/> Bewerbungen</NavLink>
              <NavLink className={navLink} to="/meetings"><Calendar size={16}/> Meetings</NavLink>
            </>
          )}
          {token && role==="admin" && (
            <NavLink className={navLink} to="/admin"><Shield size={16}/> Admin</NavLink>
          )}
          <a className={navLink as any} href="/api/docs" target="_blank" rel="noreferrer"><Book size={16}/> API-Docs</a>
        </nav>
        <div className="flex items-center gap-2">
          {!token ? (
            <Link className="btn" to="/auth"><LogIn size={16}/> Anmelden</Link>
          ) : (
            <button className="btn" onClick={onLogout}><LogOut size={16}/> Logout</button>
          )}
        </div>
      </div>
    </header>
  );
}
