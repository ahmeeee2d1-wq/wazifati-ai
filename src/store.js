const STORAGE_KEY = "wazifati-ai-v1";

export function loadState(fallback) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...fallback, ...JSON.parse(saved) } : structuredClone(fallback);
  } catch {
    return structuredClone(fallback);
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
}

export function createApplication(state, job, mode = "manual") {
  const duplicate = state.applications.some((item) => item.jobId === job.id);
  if (duplicate) return { ok: false, reason: "duplicate" };

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = state.applications.filter((item) => item.appliedAt?.startsWith(today)).length;
  if (todayCount >= Number(state.settings.dailyLimit)) return { ok: false, reason: "daily-limit" };

  const application = {
    id: `app-${Date.now()}`,
    jobId: job.id,
    company: job.company,
    title: job.title,
    city: job.city,
    match: job.match,
    url: job.url,
    mode,
    status: mode === "manual" ? "pending" : "applied",
    appliedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timeline: [{ status: mode === "manual" ? "pending" : "applied", at: new Date().toISOString() }],
  };
  state.applications.unshift(application);
  return { ok: true, application };
}

export function updateApplicationStatus(state, id, status) {
  const application = state.applications.find((item) => item.id === id);
  if (!application) return false;
  application.status = status;
  application.updatedAt = new Date().toISOString();
  application.timeline ||= [];
  application.timeline.push({ status, at: application.updatedAt });
  return true;
}
