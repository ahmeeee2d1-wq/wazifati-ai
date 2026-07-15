import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const cloudEnabled = Boolean(url && publishableKey && !url.includes("YOUR_PROJECT") && !publishableKey.includes("YOUR_"));
export const supabase = cloudEnabled
  ? createClient(url, publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

const assertCloud = () => {
  if (!cloudEnabled || !supabase) throw new Error("لم يتم ربط قاعدة البيانات السحابية بعد");
};

const profileFromRow = (row, fallback, email) => ({
  ...fallback,
  fullName: row?.full_name || fallback.fullName || email?.split("@")[0] || "",
  email: row?.email || email || fallback.email || "",
  phone: row?.phone || "",
  city: row?.city || "",
  education: row?.education || "",
  bio: row?.bio || "",
  skills: row?.skills || [],
  languages: row?.languages || [],
  courses: row?.courses || [],
  experiences: Array.isArray(row?.experiences) ? row.experiences : [],
  suggestedRoles: row?.suggested_roles || [],
  atsScore: row?.ats_score || 0,
});

const settingsFromRow = (row, fallback) => ({
  ...fallback,
  targetCities: row?.target_cities || ["مكة المكرمة", "جدة"],
  targetRoles: row?.target_roles || [],
  dailyLimit: row?.daily_limit ?? 5,
  minMatch: row?.minimum_match ?? 70,
  automation: row?.automation || "review",
  remoteAllowed: row?.remote_allowed ?? true,
  excludeCommissionOnly: row?.exclude_commission_only ?? true,
  requireConfirmation: row?.require_confirmation ?? true,
  emailMonitoring: row?.email_monitoring ?? false,
});

const applicationFromRow = (row) => {
  const job = row.job_snapshot || {};
  return {
    id: row.id,
    jobId: row.external_job_key || row.job_id,
    company: job.company || "جهة توظيف",
    title: job.title || "وظيفة",
    city: job.city || "",
    match: job.match || 0,
    url: job.url || "#",
    mode: row.automation,
    status: row.status,
    appliedAt: row.applied_at || row.created_at,
    updatedAt: row.updated_at,
    timeline: [],
  };
};

export async function getCloudSession() {
  if (!cloudEnabled) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function listenToAuth(callback) {
  if (!cloudEnabled) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));
  return () => data.subscription.unsubscribe();
}

export async function signIn(email, password) {
  assertCloud();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email, password, fullName) {
  assertCloud();
  const redirect = new URL(import.meta.env.BASE_URL, window.location.origin).href;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName }, emailRedirectTo: redirect },
  });
  if (error) throw error;
  return data;
}

export async function signOutCloud() {
  if (!cloudEnabled) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function loadCloudState(localState, user) {
  assertCloud();
  const [profileResult, settingsResult, applicationsResult, resumeResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("automation_settings").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("applications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("resumes").select("original_name,updated_at,ats_score_after").eq("user_id", user.id).eq("is_active", true).maybeSingle(),
  ]);
  for (const result of [profileResult, settingsResult, applicationsResult, resumeResult]) {
    if (result.error) throw result.error;
  }

  const emptyProfile = {
    ...localState.profile,
    fullName: user.user_metadata?.full_name || "",
    email: user.email || "",
    phone: "", city: "", education: "", bio: "", skills: [], languages: [], courses: [], experiences: [],
    suggestedRoles: [], targetRoles: [], targetCities: ["مكة المكرمة", "جدة"], atsScore: 0, rawText: "",
  };
  const profile = profileFromRow(profileResult.data, emptyProfile, user.email);
  if (resumeResult.data) {
    profile.resumeName = resumeResult.data.original_name;
    profile.resumeUpdatedAt = resumeResult.data.updated_at;
    profile.atsScore = resumeResult.data.ats_score_after || profile.atsScore;
  } else {
    profile.resumeName = "";
    profile.resumeUpdatedAt = null;
  }
  const settings = settingsFromRow(settingsResult.data, localState.settings);
  profile.targetCities = settings.targetCities;
  profile.targetRoles = settings.targetRoles;

  if (!profileResult.data) await saveCloudProfile(profile, user.id);
  if (!settingsResult.data) await saveCloudSettings(settings, user.id);

  return {
    ...localState,
    session: true,
    profile,
    settings,
    applications: (applicationsResult.data || []).map(applicationFromRow),
    messages: [],
    notifications: [],
  };
}

export async function loadCloudJobs() {
  if (!cloudEnabled) return null;
  const { data, error } = await supabase.from("jobs").select("*").eq("active", true).order("published_at", { ascending: false }).limit(100);
  if (error) throw error;
  return (data || []).map((row) => ({
    id: `${row.source}:${row.external_id}`,
    remoteId: row.id,
    title: row.title,
    company: row.company,
    city: row.city,
    type: row.employment_type || "دوام كامل",
    workplace: row.workplace || "حضوري",
    salary: row.salary_text || "حسب الخبرة",
    posted: row.published_at ? new Intl.RelativeTimeFormat("ar", { numeric: "auto" }).format(Math.max(-30, Math.round((new Date(row.published_at) - Date.now()) / 86400000)), "day") : "حديثًا",
    source: row.source,
    skills: row.skills || [],
    description: row.description || "",
    verified: row.source_verified,
    url: row.application_url,
  }));
}

export async function saveCloudProfile(profile, explicitUserId) {
  if (!cloudEnabled) return;
  const userId = explicitUserId || (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("انتهت جلسة الدخول");
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    full_name: profile.fullName || "",
    email: profile.email || "",
    phone: profile.phone || "",
    city: profile.city || "",
    education: profile.education || "",
    bio: profile.bio || "",
    skills: profile.skills || [],
    languages: profile.languages || [],
    courses: profile.courses || [],
    experiences: profile.experiences || [],
    suggested_roles: profile.suggestedRoles || [],
    ats_score: profile.atsScore || 0,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function saveCloudSettings(settings, explicitUserId) {
  if (!cloudEnabled) return;
  const userId = explicitUserId || (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("انتهت جلسة الدخول");
  const { error } = await supabase.from("automation_settings").upsert({
    user_id: userId,
    target_cities: settings.targetCities,
    target_roles: settings.targetRoles,
    daily_limit: settings.dailyLimit,
    minimum_match: settings.minMatch,
    automation: settings.automation,
    remote_allowed: settings.remoteAllowed,
    exclude_commission_only: settings.excludeCommissionOnly,
    require_confirmation: settings.requireConfirmation,
    email_monitoring: settings.emailMonitoring,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function saveCloudApplication(application) {
  if (!cloudEnabled) return;
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("انتهت جلسة الدخول");
  const payload = {
    user_id: userId,
    external_job_key: application.jobId,
    job_snapshot: {
      company: application.company, title: application.title, city: application.city,
      match: application.match, url: application.url,
    },
    status: application.status,
    automation: application.mode,
    applied_at: application.appliedAt,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("applications").upsert(payload, { onConflict: "user_id,external_job_key" }).select("id").single();
  if (error) throw error;
  return data;
}

export async function uploadCloudResume(file, parsed) {
  if (!cloudEnabled) return;
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("انتهت جلسة الدخول");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${userId}/${Date.now()}-${safeName}`;
  const upload = await supabase.storage.from("resumes").upload(storagePath, file, { upsert: false, contentType: file.type || undefined });
  if (upload.error) throw upload.error;
  await supabase.from("resumes").update({ is_active: false }).eq("user_id", userId).eq("is_active", true);
  const { error } = await supabase.from("resumes").insert({
    user_id: userId,
    storage_path: storagePath,
    original_name: file.name,
    mime_type: file.type || "application/octet-stream",
    file_size: file.size,
    state: "ready",
    extracted_text: parsed.rawText || "",
    parsed_data: parsed,
    improved_data: {},
    ats_score_before: parsed.atsScore || 0,
    ats_score_after: Math.min(96, (parsed.atsScore || 0) + 23),
    is_active: true,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
