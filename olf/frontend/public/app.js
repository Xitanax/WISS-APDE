/* Chocadies SPA – minimal, robust, deutsch */

const state = {
  token: localStorage.getItem("token") || "",
  role: localStorage.getItem("role") || "",
  email: localStorage.getItem("email") || "",
  jobs: [],
};

const views = {
  "#jobs": "view-jobs",
  "#bewerbungen": "view-bewerbungen",
  "#meetings": "view-meetings",
  "#admin-jobs": "view-admin-jobs",
  "#admin-apps": "view-admin-apps",
  "#admin-meetings": "view-admin-meetings",
  "#api-docs": "view-api-docs",
};

const sel = (q) => document.querySelector(q);
const toastEl = sel("#toast");
function toast(msg, ok = true) {
  toastEl.textContent = msg;
  toastEl.classList.toggle("hidden", false);
  toastEl.style.background = ok ? "var(--ok)" : "var(--danger)";
  setTimeout(() => toastEl.classList.add("hidden"), 2500);
}

function authHeader() {
  return state.token ? { Authorization: `Bearer ${state.token}` } : {};
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
      ...authHeader(),
    },
    credentials: "same-origin",
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch { err = { error: res.statusText }; }
    throw Object.assign(new Error(err.error || res.statusText), { status: res.status, payload: err });
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

function updateAuthBox() {
  const box = sel("#auth-box");
  if (state.token) {
    box.innerHTML = `
      <span class="role">${state.email} (${state.role})</span>
      <button id="btn-logout" class="btn ghost">Logout</button>
    `;
    sel("#btn-logout").onclick = () => {
      state.token = ""; state.role = ""; state.email = "";
      localStorage.removeItem("token"); localStorage.removeItem("role"); localStorage.removeItem("email");
      toast("Abgemeldet");
      routeTo("#jobs");
      render();
    };
  } else {
    box.innerHTML = `<button id="btn-login" class="btn">Login</button>`;
    sel("#btn-login").onclick = () => openLogin();
  }
}

function enforceRoleOrRedirect(roleNeeded, fallback="#jobs") {
  if (!state.token || state.role !== roleNeeded) {
    routeTo(fallback);
    toast("Bitte mit passender Rolle einloggen.", false);
    return false;
  }
  return true;
}

// --- Router ---
function routeTo(hash) {
  window.location.hash = hash;
}
function onRoute() {
  const hash = window.location.hash || "#jobs";
  for (const v of Object.values(views)) sel("#"+v).classList.add("hidden");
  const target = views[hash] || views["#jobs"];
  sel("#"+target).classList.remove("hidden");

  // Gate admin corners
  if (hash.startsWith("#admin-") && state.role !== "admin") {
    toast("Admin-Bereich – Zugriff verweigert.", false);
    routeTo("#jobs");
    return;
  }

  // Lazy loaders
  if (hash === "#jobs") loadPublicJobs().catch(console.error);
  if (hash === "#bewerbungen") loadMyApplications().catch(console.error);
  if (hash === "#meetings") { preloadJobsSelects(); loadMyMeetings().catch(console.error); }
  if (hash === "#admin-jobs") { enforceRoleOrRedirect("admin"); loadAdminJobs().catch(console.error); }
  if (hash === "#admin-apps") { enforceRoleOrRedirect("admin"); preloadJobsSelects(); }
  if (hash === "#admin-meetings") { enforceRoleOrRedirect("admin"); preloadJobsSelects(); loadAdminMeetings().catch(console.error); }
  if (hash === "#api-docs") { loadOpenApiSnippet().catch(console.error); }

  render();
}

// --- Auth Dialog ---
function openLogin() {
  const dlg = sel("#dlg-auth");
  const tabLogin = sel("#tab-login");
  const tabReg = sel("#tab-register");
  const paneLogin = sel("#pane-login");
  const paneReg = sel("#pane-register");

  function activate(which) {
    tabLogin.classList.toggle("active", which==="login");
    tabReg.classList.toggle("active", which!=="login");
    paneLogin.classList.toggle("active", which==="login");
    paneReg.classList.toggle("active", which!=="login");
  }

  tabLogin.onclick = (e)=>{ e.preventDefault(); activate("login"); };
  tabReg.onclick = (e)=>{ e.preventDefault(); activate("register"); };

  sel("#btn-do-login").onclick = async ()=>{
    const email = sel("#li-email").value.trim();
    const pass = sel("#li-pass").value;
    try {
      const r = await api("/api/auth/login", { method:"POST", body: JSON.stringify({ email, password: pass }) });
      state.token = r.token; state.role = r.role; state.email = r.email;
      localStorage.setItem("token", r.token); localStorage.setItem("role", r.role); localStorage.setItem("email", r.email);
      toast("Eingeloggt");
      dlg.close();
      updateAuthBox();
      render();
    } catch(e){ toast(e.message||"Login fehlgeschlagen", false); }
  };

  sel("#btn-do-register").onclick = async ()=>{
    const email = sel("#rg-email").value.trim();
    const password = sel("#rg-pass").value;
    const birthdate = sel("#rg-birth").value; // yyyy-MM-dd
    const address = sel("#rg-addr").value.trim();
    if(!email || !password || !birthdate || !address){ toast("Bitte alle Felder ausfüllen.", false); return; }
    try{
      const r = await api("/api/public/register", { method:"POST", body: JSON.stringify({ email, password, birthdate, address }) });
      toast("Registrierung erfolgreich. Bitte einloggen.");
      activate("login");
    }catch(e){ toast(e.message||"Registrierung fehlgeschlagen", false); }
  };

  sel("#btn-close1").onclick = ()=> dlg.close();
  sel("#btn-close2").onclick = ()=> dlg.close();

  dlg.showModal();
}

// --- Public Jobs & Apply ---
async function loadPublicJobs() {
  const list = await api("/api/public/jobs");
  state.jobs = list || [];
  const box = sel("#jobs-list");
  box.innerHTML = "";
  for (const j of state.jobs) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${escapeHtml(j.title)}</h3>
      <div class="muted">${escapeHtml(j.description || "")}</div>
      <div class="row">
        <button class="btn small" data-apply="${j.id}" ${state.role!=="applicant"?"disabled":""}>Bewerben</button>
        <a class="btn ghost small" href="#meetings">Termin vorschlagen</a>
      </div>
    `;
    box.appendChild(card);
  }
  box.onclick = async (e)=>{
    const btn = e.target.closest("button[data-apply]");
    if(!btn) return;
    const jobId = btn.getAttribute("data-apply");
    if(state.role!=="applicant"){ toast("Bitte als Bewerber einloggen.", false); return; }
    try{
      const r = await api("/api/v2/applications", { method:"POST", body: JSON.stringify({ jobId }) });
      toast("Bewerbung eingereicht");
      routeTo("#bewerbungen");
      await loadMyApplications();
    }catch(err){
      if(err?.payload?.error==="already_applied") toast("Für diese Stelle bereits beworben.", false);
      else toast("Bewerbung fehlgeschlagen", false);
    }
  };
}

// --- My Applications ---
async function loadMyApplications() {
  if(state.role!=="applicant"){ sel("#apps-list").innerHTML = `<div class="muted">Bitte als Bewerber einloggen.</div>`; return; }
  const list = await api("/api/v2/applications/me");
  const box = sel("#apps-list");
  box.innerHTML = "";
  for(const a of list){
    const card = document.createElement("div");
    const badge = a.status==="submitted" ? "badge" : a.status==="in_review" ? "badge green" : "badge";
    card.className = "card";
    card.innerHTML = `
      <h3>${escapeHtml(a.job?.title || "Unbekannter Job")}</h3>
      <div class="muted">${escapeHtml(a.job?.description || "")}</div>
      <div>Status: <span class="${badge}">${escapeHtml(a.status)}</span></div>
      <div class="muted">Erstellt: ${new Date(a.createdAt).toLocaleString()}</div>
    `;
    box.appendChild(card);
  }
}

// --- Meetings (Applicant) ---
function localDTtoISO(s) { // "yyyy-MM-ddTHH:mm" -> UTC ISO
  if(!s) return null;
  const d = new Date(s);
  return d.toISOString();
}
function preloadJobsSelects() {
  // Fülle alle Job-Selects, wenn Jobs vorhanden
  const targets = ["#pm-job","#aa-job","#am-job","#am-filter-job"];
  for (const id of targets) {
    const el = sel(id);
    if (!el) continue;
    el.innerHTML = state.jobs.map(j=>`<option value="${j.id}">${escapeHtml(j.title)}</option>`).join("");
    // Filter darf leere Option haben:
    if (id==="#am-filter-job") el.insertAdjacentHTML("afterbegin", `<option value="">(alle)</option>`);
  }
}
async function loadMyMeetings() {
  if(state.role!=="applicant"){ sel("#my-meetings").innerHTML = `<div class="muted">Bitte als Bewerber einloggen.</div>`; return; }
  const list = await api("/api/v2/meetings/me");
  const box = sel("#my-meetings");
  box.innerHTML = "";
  for(const m of list){
    const card = document.createElement("div");
    const badge = m.status==="accepted" ? "badge green" : m.status==="proposed" ? "badge" : "badge";
    card.className = "card";
    card.innerHTML = `
      <h3>${escapeHtml(m.job?.title || "Termin")}</h3>
      <div>Von: ${new Date(m.startsAt).toLocaleString()} &nbsp;–&nbsp; Bis: ${new Date(m.endsAt).toLocaleString()}</div>
      <div>Modus: <span class="badge">${escapeHtml(m.mode)}</span></div>
      <div>Ort/Link: <span class="muted">${escapeHtml(m.location||"")}</span></div>
      <div>Status: <span class="${badge}">${escapeHtml(m.status)}</span></div>
    `;
    box.appendChild(card);
  }
}
sel("#form-propose-meeting").addEventListener("submit", async (e)=>{
  e.preventDefault();
  if(state.role!=="applicant"){ toast("Bitte als Bewerber einloggen.", false); return; }
  const jobId = sel("#pm-job").value;
  const startsAt = localDTtoISO(sel("#pm-start").value);
  const endsAt = localDTtoISO(sel("#pm-end").value);
  const mode = sel("#pm-mode").value;
  const location = sel("#pm-location").value.trim();
  try{
    await api("/api/v2/meetings", { method:"POST", body: JSON.stringify({ jobId, startsAt, endsAt, mode, location }) });
    toast("Termin vorgeschlagen");
    await loadMyMeetings();
  }catch(e){ toast("Termin anlegen fehlgeschlagen", false); }
});

// --- Admin: Jobs & LinkedIn ---
async function loadAdminJobs() {
  const list = await api("/api/v2/jobs");
  const box = sel("#admin-jobs-list");
  box.innerHTML = "";
  for(const j of list){
    const card = document.createElement("div");
    card.className="card";
    card.innerHTML = `
      <h3>${escapeHtml(j.title)}</h3>
      <div class="muted">${escapeHtml(j.description||"")}</div>
      <div>open: ${j.open!==false ? '<span class="badge green">ja</span>' : '<span class="badge red">nein</span>'}</div>
      <div>LinkedIn: ${j.linkedinPostId ? `<span class="badge">veröffentlicht (${escapeHtml(j.linkedinPostId)})</span>` : '<span class="badge red">nicht veröffentlicht</span>'}</div>
      <div class="row">
        ${j.linkedinPostId
            ? `<button class="btn small ghost" data-unpub="${j._id}">Unpublish</button>`
            : `<button class="btn small" data-pub="${j._id}">Publish</button>`
        }
        <button class="btn small ghost" data-edit="${j._id}">Edit</button>
        <button class="btn small danger" data-del="${j._id}">Löschen</button>
      </div>
    `;
    box.appendChild(card);
  }

  // Events
  box.onclick = async (e)=>{
    const pub = e.target.closest("button[data-pub]");
    const unpub = e.target.closest("button[data-unpub]");
    const del = e.target.closest("button[data-del]");
    const edit = e.target.closest("button[data-edit]");
    try{
      if(pub){
        const id = pub.getAttribute("data-pub");
        await api(`/api/v2/linkedin/publish/${id}`, { method:"POST" });
        toast("Auf LinkedIn veröffentlicht");
        await loadAdminJobs();
      }else if(unpub){
        const id = unpub.getAttribute("data-unpub");
        await api(`/api/v2/linkedin/publish/${id}`, { method:"DELETE" });
        toast("LinkedIn-Post entfernt");
        await loadAdminJobs();
      }else if(del){
        const id = del.getAttribute("data-del");
        if(!confirm("Diesen Job wirklich löschen?")) return;
        await api(`/api/v2/jobs/${id}`, { method:"DELETE" });
        toast("Job gelöscht");
        await loadAdminJobs();
      }else if(edit){
        const id = edit.getAttribute("data-edit");
        const job = (await api("/api/v2/jobs")).find(j=>j._id===id);
        if(!job) return;
        const title = prompt("Titel:", job.title) ?? job.title;
        const description = prompt("Beschreibung:", job.description||"") ?? job.description;
        const open = confirm("Soll der Job sichtbar (open) sein?");
        await api(`/api/v2/jobs/${id}`, { method:"PATCH", body: JSON.stringify({ title, description, open }) });
        toast("Job aktualisiert");
        await loadAdminJobs();
      }
    }catch(err){ toast("Aktion fehlgeschlagen", false); }
  };
}
sel("#form-new-job").addEventListener("submit", async (e)=>{
  e.preventDefault();
  if(!enforceRoleOrRedirect("admin")) return;
  const title = sel("#job-title").value.trim();
  const description = sel("#job-desc").value.trim();
  const open = sel("#job-open").checked;
  if(!title){ toast("Titel fehlt", false); return; }
  try{
    await api("/api/v2/jobs", { method:"POST", body: JSON.stringify({ title, description, open }) });
    toast("Job angelegt");
    sel("#form-new-job").reset();
    await loadAdminJobs();
    // Public neu ziehen
    await loadPublicJobs();
  }catch(e){ toast("Job anlegen fehlgeschlagen", false); }
});

// --- Admin: Bewerbungen ---
sel("#aa-reload").addEventListener("click", loadAdminApplications);
async function loadAdminApplications(){
  if(!enforceRoleOrRedirect("admin")) return;
  const jobId = sel("#aa-job").value;
  if(!jobId){ sel("#admin-apps-list").innerHTML = `<div class="muted">Bitte Job wählen.</div>`; return; }
  const list = await api(`/api/v2/applications?jobId=${encodeURIComponent(jobId)}`);
  const box = sel("#admin-apps-list");
  box.innerHTML = "";
  for(const a of list){
    const card = document.createElement("div");
    card.className="card";
    card.innerHTML = `
      <h3>${escapeHtml(a.applicant?.email || "Unbekannt")}</h3>
      <div>Status: <span class="badge">${escapeHtml(a.status)}</span></div>
      <div class="muted">Erstellt: ${new Date(a.createdAt).toLocaleString()}</div>
      <div class="row">
        <button class="btn small" data-status="${a.id}" data-to="in_review">auf in_review</button>
        <button class="btn small ok" data-status="${a.id}" data-to="accepted">auf accepted</button>
        <button class="btn small danger" data-del-app="${a.id}">Löschen</button>
      </div>
    `;
    box.appendChild(card);
  }
  box.onclick = async (e)=>{
    const sbtn = e.target.closest("button[data-status]");
    const del = e.target.closest("button[data-del-app]");
    try{
      if(sbtn){
        const id = sbtn.getAttribute("data-status");
        const to = sbtn.getAttribute("data-to");
        await api(`/api/v2/applications/${id}`, { method:"PATCH", body: JSON.stringify({ status: to }) });
        toast("Status geändert");
        await loadAdminApplications();
      } else if(del){
        const id = del.getAttribute("data-del-app");
        if(!confirm("Bewerbung wirklich löschen?")) return;
        await api(`/api/v2/applications/${id}`, { method:"DELETE" });
        toast("Bewerbung gelöscht");
        await loadAdminApplications();
      }
    }catch(err){ toast("Aktion fehlgeschlagen", false); }
  };
}

// --- Admin: Meetings ---
sel("#am-reload").addEventListener("click", loadAdminMeetings);
async function loadAdminMeetings(){
  if(!enforceRoleOrRedirect("admin")) return;
  const jobId = sel("#am-filter-job").value;
  const url = jobId ? `/api/v2/meetings?jobId=${encodeURIComponent(jobId)}` : `/api/v2/meetings`;
  const list = await api(url);
  const box = sel("#admin-meetings-list");
  box.innerHTML = "";
  for(const m of list){
    const card = document.createElement("div");
    const badge = m.status==="accepted" ? "badge green" : "badge";
    card.className="card";
    card.innerHTML = `
      <h3>${escapeHtml(m.applicant?.email || "Unbekannt")}</h3>
      <div>${new Date(m.startsAt).toLocaleString()} – ${new Date(m.endsAt).toLocaleString()}</div>
      <div>Modus: <span class="badge">${escapeHtml(m.mode)}</span></div>
      <div>Ort/Link: <span class="muted">${escapeHtml(m.location||"")}</span></div>
      <div>Status: <span class="${badge}">${escapeHtml(m.status)}</span></div>
      <div class="row">
        ${m.status!=="accepted" ? `<button class="btn small ok" data-acc="${m.id}">Akzeptieren</button>` : ""}
        <button class="btn small danger" data-del-meet="${m.id}">Löschen</button>
      </div>
    `;
    box.appendChild(card);
  }
  box.onclick = async (e)=>{
    const acc = e.target.closest("button[data-acc]");
    const del = e.target.closest("button[data-del-meet]");
    try{
      if(acc){
        const id = acc.getAttribute("data-acc");
        await api(`/api/v2/meetings/${id}`, { method:"PATCH", body: JSON.stringify({ status:"accepted" }) });
        toast("Termin akzeptiert");
        await loadAdminMeetings();
      } else if(del){
        const id = del.getAttribute("data-del-meet");
        if(!confirm("Termin wirklich löschen?")) return;
        await api(`/api/v2/meetings/${id}`, { method:"DELETE" });
        toast("Termin gelöscht");
        await loadAdminMeetings();
      }
    }catch(err){ toast("Aktion fehlgeschlagen", false); }
  };
}
sel("#form-admin-meeting").addEventListener("submit", async (e)=>{
  e.preventDefault();
  if(!enforceRoleOrRedirect("admin")) return;
  const jobId = sel("#am-job").value;
  const applicantEmail = sel("#am-email").value.trim();
  const startsAt = localDTtoISO(sel("#am-start").value);
  const endsAt = localDTtoISO(sel("#am-end").value);
  const mode = sel("#am-mode").value;
  const location = sel("#am-location").value.trim();
  try{
    await api("/api/v2/meetings", { method:"POST", body: JSON.stringify({ jobId, applicantEmail, startsAt, endsAt, mode, location }) });
    toast("Termin erstellt");
    sel("#form-admin-meeting").reset();
    await loadAdminMeetings();
  }catch(e){ toast("Termin anlegen fehlgeschlagen", false); }
});

// --- API Docs preview ---
async function loadOpenApiSnippet(){
  try{
    const txt = await api("/api/openapi.yaml", { headers: { "Accept":"text/plain" } });
    sel("#openapi-snippet").textContent = String(txt).slice(0, 4000);
  }catch(e){
    sel("#openapi-snippet").textContent = "Fehler beim Laden von openapi.yaml";
  }
}

// --- Helpers ---
function escapeHtml(s){ return String(s??"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// --- Init ---
async function boot(){
  updateAuthBox();
  // Erste Daten
  try{ await loadPublicJobs(); }catch(e){ /* ignore */ }
  preloadJobsSelects();

  // Nav-Links: spa navigation
  document.body.addEventListener("click", (e)=>{
    const a = e.target.closest("a[data-link]");
    if(!a) return;
    e.preventDefault();
    routeTo(a.getAttribute("href"));
  });

  window.addEventListener("hashchange", onRoute);
  onRoute();
}
boot();
