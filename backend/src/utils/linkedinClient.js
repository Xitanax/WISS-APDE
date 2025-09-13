// src/utils/linkedinClient.js
// Dummy-Client, der das Verhalten der LinkedIn-API simuliert
export async function publishJob(job) {
  // In echt würdest du hier OAuth + POST gegen LinkedIn machen.
  const postId = 'li_' + String(job._id).slice(-6);
  const url = `https://www.linkedin.com/feed/update/${postId}`;
  return { postId, url };
}

export async function unpublishJob(job) {
  // Simulierter Erfolg
  return { ok: true };
}

export async function importApplicant({ profileUrl, email, name }) {
  // Simulierter Import – in echt würdest du das Profil parsen.
  return {
    ok: true,
    profileUrl,
    email,
    name: name || 'LinkedIn User',
    source: 'linkedin',
  };
}
