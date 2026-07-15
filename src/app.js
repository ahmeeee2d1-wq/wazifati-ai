import { defaultState, jobs, statusLabels } from "./data.js";
import { loadState, saveState, createApplication, updateApplicationStatus } from "./store.js";
import { rankJobs } from "./matcher.js";
import { readResumeFile, parseResume, buildImprovement } from "./cv-parser.js";
import {
  cloudEnabled, getCloudSession, listenToAuth, signIn, signUp, signOutCloud,
  loadCloudState, loadCloudJobs, saveCloudProfile, saveCloudSettings,
  saveCloudApplication, uploadCloudResume,
} from "./cloud.js";

const app = document.querySelector("#app");
const toastRoot = document.querySelector("#toast-root");
let state = loadState(defaultState);
let selectedMessageId = state.messages[0]?.id;
let jobQuery = "";
let cityFilter = "الكل";
let modalJobId = null;
let authMode = "login";
let booting = true;
let installPrompt = null;
let availableJobs = jobs;

const icons = {
  dashboard: '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>',
  cv: '<svg class="icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>',
  jobs: '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></svg>',
  applications: '<svg class="icon" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  inbox: '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  settings: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.36a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.07 14H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.64 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.63h.01A1.7 1.7 0 0 0 10 3.07V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.37 9v.01A1.7 1.7 0 0 0 20.93 10H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15z"/></svg>',
  bell: '<svg class="icon" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>',
  search: '<svg class="icon sm" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  upload: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 16V4m0 0L7 9m5-5 5 5M5 20h14"/></svg>',
  spark: '<svg class="icon" viewBox="0 0 24 24"><path d="m12 3-1.3 4.2a5 5 0 0 1-3.4 3.4L3 12l4.3 1.4a5 5 0 0 1 3.4 3.4L12 21l1.3-4.2a5 5 0 0 1 3.4-3.4L21 12l-4.3-1.4a5 5 0 0 1-3.4-3.4L12 3z"/></svg>',
  plus: '<svg class="icon sm" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  arrow: '<svg class="icon sm" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
  logout: '<svg class="icon sm" viewBox="0 0 24 24"><path d="M10 17l5-5-5-5M15 12H3M21 19V5a2 2 0 0 0-2-2h-6"/></svg>',
  shield: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>',
  calendar: '<svg class="icon sm" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
  pin: '<svg class="icon sm" viewBox="0 0 24 24"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2"/></svg>',
  check: '<svg class="icon sm" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>',
};

const esc = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
const initials = (name = "مستخدم") => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("");
const formatDate = (date, short = false) => new Intl.DateTimeFormat("ar-SA", short ? { month: "short", day: "numeric" } : { year: "numeric", month: "short", day: "numeric" }).format(new Date(date));
const todayCount = () => state.applications.filter((item) => item.appliedAt?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
const unreadCount = () => state.messages.filter((item) => !item.read).length;

function toast(message, type = "success") {
  const node = document.createElement("div");
  node.className = `toast ${type === "error" ? "error" : ""}`;
  node.innerHTML = `${type === "error" ? "!" : icons.check}<span>${esc(message)}</span>`;
  toastRoot.appendChild(node);
  setTimeout(() => node.remove(), 3500);
}

function persist() { saveState(state); }

function render() {
  if (booting) {
    app.innerHTML = `<main class="splash"><img src="./assets/logo.svg" alt=""><span class="loading">جارٍ تجهيز حسابك...</span></main>`;
    return;
  }
  if (!state.session) {
    app.innerHTML = loginTemplate();
    return;
  }
  app.innerHTML = shellTemplate();
}

function loginTemplate() {
  const isRegister = authMode === "register";
  const cloudNote = cloudEnabled
    ? '<div class="demo-note cloud-note">اتصال سحابي آمن ومزامنة تلقائية بين أجهزتك.</div>'
    : '<div class="demo-note">تسجيل الدخول متوقف مؤقتًا حتى يكتمل ربط الحسابات الآمنة.</div>';
  return `<main class="login-screen">
    <section class="login-visual">
      <div class="login-brand"><img src="./assets/logo.svg" alt=""><strong>وظّفني AI</strong></div>
      <div class="login-message">
        <span class="eyebrow">مساعدك الشخصي للبحث والتقديم</span>
        <h1>فرصتك القادمة،<br><span>أقرب مما تتخيل.</span></h1>
        <p>نقرأ سيرتك، نقويها، ونرتب لك أفضل فرص مكة وجدة. أنت تقرر، ونحن ننظم كل خطوة بدون تكرار أو تقديم عشوائي.</p>
        <div class="feature-row">
          <span class="feature-chip">${icons.spark} مطابقة ذكية</span>
          <span class="feature-chip">${icons.shield} تحكم كامل</span>
          <span class="feature-chip">${icons.applications} منع التكرار</span>
        </div>
      </div>
      <p class="login-caption">خصوصيتك أولًا — ملفاتك خاصة ولا يطّلع عليها مستخدم آخر.</p>
    </section>
    <section class="login-panel">
      <form class="login-card" id="login-form">
        <span class="cloud-badge">${cloudEnabled ? "● حساب آمن" : "● جارٍ التجهيز"}</span>
        <h2>${isRegister ? "أنشئ حسابك" : "أهلًا بك"}</h2>
        <p>${isRegister ? "أنشئ حسابًا واحدًا واستخدمه من الكمبيوتر وأي جوال." : "سجّل دخولك لمتابعة فرصك وطلباتك من أي جهاز."}</p>
        ${isRegister ? '<div class="field"><label for="register-name">الاسم الكامل</label><input id="register-name" type="text" required autocomplete="name"></div>' : ""}
        <div class="field"><label for="login-email">البريد الإلكتروني</label><input id="login-email" type="email" required autocomplete="email" ${cloudEnabled ? "" : "disabled"}></div>
        <div class="field"><label for="login-password">كلمة المرور</label><input id="login-password" type="password" required minlength="8" autocomplete="${isRegister ? "new-password" : "current-password"}" ${cloudEnabled ? "" : "disabled"}></div>
        <button class="btn btn-primary" type="submit" ${cloudEnabled ? "" : "disabled"}>${isRegister ? "إنشاء الحساب" : "تسجيل الدخول"} ${icons.arrow}</button>
        ${cloudEnabled ? `<button class="btn btn-outline" type="button" data-action="toggle-auth">${isRegister ? "لدي حساب بالفعل" : "إنشاء حساب جديد"}</button>` : ""}
        ${cloudNote}
        <div class="legal-links"><a href="./privacy.html" target="_blank" rel="noopener">سياسة الخصوصية</a><span>•</span><a href="./terms.html" target="_blank" rel="noopener">شروط الاستخدام</a></div>
      </form>
    </section>
  </main>`;
}

const navItems = [
  ["dashboard", "لوحة التحكم", icons.dashboard], ["cv", "السيرة الذاتية", icons.cv], ["jobs", "الوظائف المناسبة", icons.jobs],
  ["applications", "التقديمات", icons.applications], ["inbox", "البريد والتنبيهات", icons.inbox], ["settings", "الإعدادات", icons.settings],
];
const pageTitles = { dashboard: ["نظرة عامة", "لوحة التحكم"], cv: ["ملفك المهني", "السيرة الذاتية"], jobs: ["فرص منتقاة لك", "الوظائف المناسبة"], applications: ["سجل كامل", "التقديمات"], inbox: ["متابعة الردود", "البريد والتنبيهات"], settings: ["الخصوصية والتحكم", "الإعدادات"] };

function shellTemplate() {
  const title = pageTitles[state.page] || pageTitles.dashboard;
  return `<div class="app-shell">
    <aside class="sidebar">
      <div class="brand"><img src="./assets/logo.svg" alt=""><div><strong>وظّفني AI</strong><span>مساعد التوظيف الشخصي</span></div></div>
      <div class="nav-title">القائمة الرئيسية</div>
      <nav class="nav">${navItems.slice(0,5).map(([id,label,icon]) => navButton(id,label,icon)).join("")}</nav>
      <div class="nav-title">الحساب</div>
      <nav class="nav">${navButton("settings", "الإعدادات", icons.settings)}</nav>
      <div class="sidebar-foot"><div class="mini-user"><span class="avatar">${initials(state.profile.fullName)}</span><div><strong>${esc(state.profile.fullName)}</strong><span>${esc(state.profile.email)}</span></div><button class="icon-btn" data-action="logout" title="تسجيل الخروج">${icons.logout}</button></div></div>
    </aside>
    <main class="main">
      <header class="topbar"><div><span class="page-kicker">${title[0]}</span><h1>${title[1]}</h1></div><div class="top-actions">${cloudEnabled ? '<span class="cloud-badge top-cloud">● متصل سحابيًا</span>' : ""}<button class="icon-btn" data-page="inbox" aria-label="التنبيهات">${icons.bell}${unreadCount() ? '<span class="dot"></span>' : ""}</button><button class="avatar" data-page="settings" aria-label="الملف الشخصي">${initials(state.profile.fullName)}</button></div></header>
      <div class="content">${pageTemplate()}</div>
    </main>
    <nav class="mobile-nav">${navItems.slice(0,5).map(([id,label,icon]) => `<button class="${state.page === id ? "active" : ""}" data-page="${id}">${icon}<span>${label}</span></button>`).join("")}</nav>
  </div>`;
}

function navButton(id, label, icon) {
  const badge = id === "inbox" && unreadCount() ? `<span class="badge">${unreadCount()}</span>` : "";
  return `<button class="${state.page === id ? "active" : ""}" data-page="${id}">${icon}<span>${label}</span>${badge}</button>`;
}

function pageTemplate() {
  return { dashboard: dashboardPage, cv: cvPage, jobs: jobsPage, applications: applicationsPage, inbox: inboxPage, settings: settingsPage }[state.page]?.() || dashboardPage();
}

function dashboardPage() {
  const ranked = rankJobs(availableJobs, { ...state.profile, targetCities: state.settings.targetCities, targetRoles: state.settings.targetRoles });
  const strongMatches = ranked.filter((job) => job.match >= 80).length;
  const interviews = state.applications.filter((item) => item.status === "interview").length;
  return `<section class="welcome"><div><h2>أهلًا ${esc(state.profile.fullName.split(" ")[0])} 👋</h2><p>تابع فرصك وطلباتك من لوحة واحدة واضحة.</p></div><button class="btn btn-primary" data-page="jobs">${icons.search} ابحث عن فرص مناسبة</button></section>
    <section class="stats">
      ${statCard("الوظائف المطابقة", strongMatches, "حسب ملفك", icons.jobs, "")}
      ${statCard("طلبات التقديم", state.applications.length, `${todayCount()} اليوم`, icons.applications, "gold")}
      ${statCard("المقابلات", interviews, interviews ? "تحتاج متابعة" : "لا توجد حاليًا", icons.calendar, "blue")}
      ${statCard("رسائل جديدة", unreadCount(), "من البريد", icons.inbox, "red")}
    </section>
    <section class="grid grid-2">
      <div class="grid">
        <article class="card"><header class="card-head"><div><h3>أفضل الفرص لك</h3><p>مرتبة حسب مهاراتك وأهدافك</p></div><button class="text-link" data-page="jobs">عرض الكل ←</button></header><div class="card-body">${ranked.length ? ranked.slice(0,4).map(jobMini).join("") : '<div class="empty">لا توجد وظائف مضافة بعد.</div>'}</div></article>
        <article class="card"><header class="card-head"><div><h3>آخر التقديمات</h3><p>تحديث تلقائي لحالة كل طلب</p></div><button class="text-link" data-page="applications">السجل الكامل ←</button></header><div class="card-body">${state.applications.length ? state.applications.slice(0,4).map(applicationMini).join("") : '<div class="empty">لا توجد تقديمات حتى الآن.</div>'}</div></article>
      </div>
      <div class="grid">
        <article class="card"><header class="card-head"><div><h3>قوة ملفك المهني</h3><p>جاهز للتقديم بدرجة جيدة</p></div></header><div class="card-body"><div class="profile-meter"><div class="ring" style="--value:${state.profile.atsScore || 0}"><strong>${state.profile.atsScore || 0}<small>%</small></strong></div><div class="meter-copy"><h4>${state.profile.atsScore >= 80 ? "ملف قوي جدًا" : "باقي لمسات بسيطة"}</h4><p>حسّن الإنجازات والكلمات المفتاحية لرفع فرص وصول سيرتك لمسؤول التوظيف.</p><button class="btn btn-secondary" data-page="cv">تحسين السيرة</button></div></div></div></article>
        <article class="card"><header class="card-head"><div><h3>نشاط اليوم</h3><p>ما حدث في حسابك</p></div></header><div class="card-body"><div class="empty">سيظهر نشاط حسابك الحقيقي هنا.</div></div></article>
        <div class="notice">${icons.shield}<span><strong>أنت المتحكم دائمًا.</strong> لن يرسل النظام أي تقديم خارجي كامل في النسخة الأولى إلا بعد مراجعتك وتأكيدك.</span></div>
      </div>
    </section>`;
}

function statCard(label, value, note, icon, color) { return `<article class="stat-card ${color}"><div class="stat-top"><span>${label}</span><span class="stat-icon">${icon}</span></div><div class="stat-value"><strong>${value}</strong><span>${note}</span></div></article>`; }
function jobMini(job) { const applied = state.applications.some((app) => app.jobId === job.id); return `<div class="job-mini"><span class="company-logo">${esc(job.company.slice(0,2))}</span><div class="job-mini-copy"><h4>${esc(job.title)}</h4><p>${esc(job.company)} · ${esc(job.city)}${applied ? " · سبق التقديم" : ""}</p></div><span class="match-pill">${job.match}%</span></div>`; }
function applicationMini(item) { return `<div class="job-mini"><span class="company-logo">${esc(item.company.slice(0,2))}</span><div class="job-mini-copy"><h4>${esc(item.title)}</h4><p>${esc(item.company)} · ${formatDate(item.appliedAt, true)}</p></div><span class="status status-${item.status}">${statusLabels[item.status]}</span></div>`; }
function timelineItem(title, text, time) { return `<div class="timeline-item"><span class="timeline-dot"></span><div><h4>${title}</h4><p>${text}</p></div><time>${time}</time></div>`; }

function cvPage() {
  const improvement = buildImprovement({ ...state.profile, targetRoles: state.settings.targetRoles });
  return `<section class="welcome"><div><h2>سيرتك هي بداية الفرصة</h2><p>ارفعها، راجع البيانات المستخرجة، ثم أنشئ نسخة أقوى لأنظمة ATS.</p></div><button class="btn btn-gold" data-action="export-cv">${icons.cv} تصدير النسخة المحسنة</button></section>
    <div class="grid grid-2">
      <div class="grid">
        <article class="card"><header class="card-head"><div><h3>ملف السيرة الذاتية</h3><p>PDF أو DOCX أو TXT — حتى 10 ميجابايت</p></div></header><div class="card-body">
          ${state.profile.resumeName ? `<div class="resume-file"><span class="file-icon">CV</span><div><strong>${esc(state.profile.resumeName)}</strong><span>آخر تحديث ${formatDate(state.profile.resumeUpdatedAt || new Date())}</span></div><span class="spacer"></span><button class="btn btn-outline" data-action="choose-cv">استبدال الملف</button></div>` : uploadZone()}
          <div id="upload-secondary" style="${state.profile.resumeName ? "margin-top:12px" : "display:none"}">${state.profile.resumeName ? uploadZone(true) : ""}</div>
          <input id="cv-file" type="file" accept=".pdf,.docx,.txt,.md" hidden>
        </div></article>
        <article class="card"><header class="card-head"><div><h3>البيانات المستخرجة</h3><p>راجعها وعدّل أي معلومة قبل التقديم</p></div><span class="chip green">${icons.check} محفوظة بأمان</span></header><div class="card-body">
          <form id="profile-form" class="profile-fields">
            ${field("الاسم الكامل", "fullName", state.profile.fullName)}${field("البريد الإلكتروني", "email", state.profile.email, "email")}
            ${field("رقم الجوال", "phone", state.profile.phone, "tel")}${field("المدينة", "city", state.profile.city)}
            ${field("المؤهل", "education", state.profile.education, "text", true)}
            ${tagField("المهارات", "skills", state.profile.skills)}${tagField("اللغات", "languages", state.profile.languages)}
            ${textareaField("الخبرات", "experiences", state.profile.experiences)}${textareaField("الدورات والشهادات", "courses", state.profile.courses)}
            <div class="field full"><button class="btn btn-primary" type="submit">حفظ التعديلات</button></div>
          </form>
        </div></article>
      </div>
      <div class="grid">
        <article class="score-hero"><div class="ring" style="--value:${improvement.scoreAfter}"><strong>${improvement.scoreAfter}<small>%</small></strong></div><div class="score-copy"><h3>نسخة أقوى للـ ATS</h3><p>أعدنا بناء الملخص والكلمات المفتاحية بناءً على الوظائف المستهدفة.</p><div class="score-compare"><span>قبل ${improvement.scoreBefore}%</span><b>←</b><span>بعد ${improvement.scoreAfter}%</span></div></div></article>
        <article class="card"><header class="card-head"><div><h3>اقتراحات التحسين</h3><p>تغييرات عملية ترفع جودة السيرة</p></div></header><div class="card-body"><div class="improvement-list">${improvement.suggestions.map((item) => `<div class="improvement"><span class="check">✓</span><span>${esc(item)}</span></div>`).join("")}</div></div></article>
        <article class="card"><header class="card-head"><div><h3>معاينة النسخة المحسنة</h3><p>صياغة واضحة وخالية من العناصر المربكة للـ ATS</p></div></header><div class="card-body"><div class="cv-preview"><h2>${esc(state.profile.fullName)}</h2><span class="cv-headline">${esc(improvement.headline)}</span><p>${esc(state.profile.email)} · ${esc(state.profile.phone)} · ${esc(state.profile.city)}</p><h4>الملخص المهني</h4><p>${esc(improvement.summary)}</p><h4>المهارات</h4><p>${esc(state.profile.skills.join(" • "))}</p><h4>الخبرات</h4><ul>${state.profile.experiences.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div></div></article>
      </div>
    </div>`;
}

function uploadZone(small = false) { return `<div class="upload-zone" data-action="choose-cv">${small ? "" : `<span class="upload-icon">${icons.upload}</span>`}<h3>${small ? "اسحب نسخة جديدة هنا" : "اسحب سيرتك هنا أو اخترها من جهازك"}</h3><p>نحلل محتوى الملف بأمان ثم نحفظ النتائج في حسابك</p>${small ? "" : '<button class="btn btn-primary" type="button">اختيار السيرة الذاتية</button>'}</div>`; }
function field(label, name, value, type = "text", full = false) { return `<div class="field ${full ? "full" : ""}"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" value="${esc(value)}"></div>`; }
function textareaField(label, name, values) { return `<div class="field full"><label for="${name}">${label}</label><textarea id="${name}" name="${name}" placeholder="كل عنصر في سطر مستقل">${esc((values || []).join("\n"))}</textarea></div>`; }
function tagField(label, name, values) { return `<div class="field full"><label>${label}</label><div class="tags-editor" data-tags="${name}">${(values || []).map((tag, i) => `<span class="tag">${esc(tag)}<button type="button" data-action="remove-tag" data-list="${name}" data-index="${i}" aria-label="حذف">×</button></span>`).join("")}<input class="tag-input" data-tag-input="${name}" placeholder="اكتب ثم اضغط Enter"></div></div>`; }

function jobsPage() {
  const ranked = rankJobs(availableJobs, { ...state.profile, targetCities: state.settings.targetCities, targetRoles: state.settings.targetRoles });
  const filtered = ranked.filter((job) => (cityFilter === "الكل" || job.city === cityFilter) && `${job.title} ${job.company} ${job.skills.join(" ")}`.toLowerCase().includes(jobQuery.toLowerCase()) && job.match >= state.settings.minMatch);
  return `<section class="welcome"><div><h2>وظائف مختارة لك</h2><p>مرتبة حسب مهاراتك ومدنك المستهدفة — لا يوجد تقديم عشوائي.</p></div><span class="chip green">${filtered.length} فرصة مناسبة</span></section>
    <div class="section-tools"><label class="search">${icons.search}<input id="job-search" value="${esc(jobQuery)}" placeholder="ابحث بالمسمى أو الشركة أو المهارة"></label><select id="city-filter" class="field-select"><option>الكل</option><option ${cityFilter === "مكة المكرمة" ? "selected" : ""}>مكة المكرمة</option><option ${cityFilter === "جدة" ? "selected" : ""}>جدة</option></select><button class="btn btn-outline" data-page="settings">درجة المطابقة: ${state.settings.minMatch}%+</button></div>
    <div class="job-grid">${filtered.length ? filtered.map(jobCard).join("") : '<div class="card empty"><div class="empty-icon">'+icons.search+'</div><h3>لا توجد نتائج بهذه التصفية</h3><p>جرّب كلمة أخرى أو خفّض درجة المطابقة من الإعدادات.</p></div>'}</div>`;
}

function jobCard(job) {
  const duplicate = state.applications.some((item) => item.jobId === job.id);
  return `<article class="job-card"><div class="job-card-top"><span class="company-logo">${esc(job.company.slice(0,2))}</span><div class="job-title"><h3>${esc(job.title)}</h3><p>${esc(job.company)} ${job.verified ? '<span class="verified">● موثّق</span>' : ""}</p></div><div class="job-score"><strong>${job.match}%</strong><span>مطابقة</span></div></div><div class="job-meta"><span class="chip">${icons.pin} ${esc(job.city)}</span><span class="chip">${esc(job.workplace)}</span><span class="chip gold">${esc(job.salary)}</span></div><p>${esc(job.description)}</p><div class="match-reason">${icons.spark} ${esc(job.matchReasons[0] || "تتوافق مع أهدافك المهنية")}</div><div class="job-actions">${duplicate ? '<span class="duplicate-note">✓ سبق التقديم — محمي من التكرار</span>' : `<button class="btn btn-primary" data-action="apply" data-job="${job.id}">ابدأ التقديم</button><button class="btn btn-outline" data-action="job-details" data-job="${job.id}">التفاصيل</button>`}</div></article>`;
}

function applicationsPage() {
  const counts = Object.keys(statusLabels).reduce((acc, key) => ({ ...acc, [key]: state.applications.filter((item) => item.status === key).length }), {});
  return `<section class="welcome"><div><h2>كل تقديم في مكانه</h2><p>تابع ما أُرسل، وما شوهد، والمقابلات، ومنع التقديم لنفس الوظيفة مرتين.</p></div><button class="btn btn-primary" data-page="jobs">${icons.plus} تقديم جديد</button></section>
    <section class="stats">${statCard("إجمالي التقديمات", state.applications.length, `${todayCount()} اليوم`, icons.applications, "")}${statCard("قيد المراجعة", counts.applied + counts.viewed, "طلبات نشطة", icons.cv, "gold")}${statCard("المقابلات", counts.interview, "فرصة مهمة", icons.calendar, "blue")}${statCard("العروض", counts.offer, counts.offer ? "مبروك!" : "نسعى للأول", icons.jobs, "red")}</section>
    <article class="card"><header class="card-head"><div><h3>سجل التقديمات</h3><p>يمكنك تحديث الحالة يدويًا في أي وقت</p></div><span class="chip green">منع التكرار مفعّل</span></header><div class="table-wrap">${state.applications.length ? `<table class="data-table"><thead><tr><th>الوظيفة</th><th>المدينة</th><th>تاريخ التقديم</th><th>المطابقة</th><th>الحالة</th><th>طريقة التقديم</th><th>تحديث</th></tr></thead><tbody>${state.applications.map(applicationRow).join("")}</tbody></table>` : '<div class="empty">لا توجد تقديمات بعد.</div>'}</div></article>`;
}
function applicationRow(item) { return `<tr><td><div class="table-title"><span class="company-logo">${esc(item.company.slice(0,2))}</span><div><strong>${esc(item.title)}</strong><span>${esc(item.company)}</span></div></div></td><td>${esc(item.city)}</td><td>${formatDate(item.appliedAt)}</td><td><span class="match-pill">${item.match}%</span></td><td><span class="status status-${item.status}">${statusLabels[item.status]}</span></td><td>${item.mode === "manual" ? "يدوي" : item.mode === "review" ? "بمراجعة" : "تلقائي محدود"}</td><td><select class="status-select" data-status-id="${item.id}">${Object.entries(statusLabels).map(([value,label]) => `<option value="${value}" ${item.status === value ? "selected" : ""}>${label}</option>`).join("")}</select></td></tr>`; }

function inboxPage() {
  const selected = state.messages.find((item) => item.id === selectedMessageId) || state.messages[0];
  return `<section class="welcome"><div><h2>ردود التوظيف بوضوح</h2><p>تصنيف رسائل التوظيف وربطها بطلباتك لتعرف ما يحتاج متابعة.</p></div><span class="chip green">${state.settings.emailMonitoring ? "المتابعة مفعّلة" : "المتابعة متوقفة"}</span></section>
    <div class="notice" style="margin-bottom:18px">${icons.inbox}<span>هذه الصفحة تعرض نموذج الربط. ربط Gmail أو Outlook الفعلي يتم لاحقًا عبر إذن قراءة محدود، ولا يرسل رسائل نيابة عنك.</span></div>
    <article class="card inbox-layout"><div class="message-list">${state.messages.map((message) => messageItem(message, selected?.id)).join("")}</div>${selected ? messageView(selected) : '<div class="empty">لا توجد رسائل.</div>'}</article>`;
}
function messageItem(message, activeId) { return `<button class="message-item ${message.id === activeId ? "active" : ""} ${!message.read ? "unread" : ""}" data-message="${message.id}"><h4>${esc(message.sender)}</h4><p>${esc(message.subject)} — ${esc(message.preview)}</p><time>${formatDate(message.receivedAt, true)}</time></button>`; }
function messageView(message) { const application = state.applications.find((item) => item.id === message.applicationId); const insight = message.category === "interview" ? "تم اكتشاف دعوة مقابلة. نقترح تحديث حالة الطلب إلى «مقابلة» وإضافة الموعد إلى تقويمك." : message.category === "confirmation" ? "هذه رسالة تأكيد استلام، وتم ربطها تلقائيًا بطلب التقديم الصحيح." : "هذه رسالة فرص عامة ولا تغيّر حالة أي طلب."; return `<div class="message-view"><header class="message-view-head"><span class="chip green">${message.category === "interview" ? "دعوة مقابلة" : message.category === "confirmation" ? "تأكيد استلام" : "تنبيه وظائف"}</span><h2>${esc(message.subject)}</h2><p>من: ${esc(message.sender)} · ${formatDate(message.receivedAt)}</p></header><div class="message-body"><p>مرحبًا ${esc(state.profile.fullName.split(" ")[0])}،</p><p>${esc(message.preview)} نقدر اهتمامك بالفرصة، وسيتم تزويدك بالتفاصيل والخطوات التالية عبر البريد.</p><p>مع التحية،<br>فريق التوظيف</p></div><div class="email-insight"><strong>${icons.spark} تحليل الرسالة</strong><p>${insight}</p>${application && message.category === "interview" && application.status !== "interview" ? `<button class="btn btn-primary" style="margin-top:10px" data-action="mark-interview" data-app="${application.id}">تحديث الحالة إلى مقابلة</button>` : ""}</div></div>`; }

function settingsPage() {
  return `<section class="welcome"><div><h2>أنت تحدد القواعد</h2><p>اختر أين نبحث، وما الذي نرشحه، وكم طلبًا تسمح به يوميًا.</p></div><button class="btn btn-primary" data-action="save-settings">حفظ الإعدادات</button></section>
    <div class="grid grid-2"><div class="grid">
      <article class="card settings-group"><header class="card-head"><div><h3>أهداف البحث</h3><p>تُستخدم في ترتيب الوظائف وحساب المطابقة</p></div></header><div class="card-body"><div class="profile-fields">
        <div class="field full"><label>المدن المستهدفة</label><div class="tags-editor">${state.settings.targetCities.map((city) => `<span class="tag">${esc(city)}</span>`).join("")}<input id="settings-cities" class="tag-input" value="${esc(state.settings.targetCities.join("، "))}"></div></div>
        <div class="field full"><label>المسميات المستهدفة</label><textarea id="settings-roles" placeholder="كل مسمى في سطر">${esc(state.settings.targetRoles.join("\n"))}</textarea></div>
        <div class="field"><label>الحد اليومي للتقديم</label><input id="daily-limit" type="number" min="1" max="20" value="${state.settings.dailyLimit}"></div>
        <div class="field"><label>أقل درجة مطابقة</label><input id="min-match" type="number" min="40" max="95" value="${state.settings.minMatch}"></div>
      </div></div></article>
      <article class="card settings-group"><header class="card-head"><div><h3>مستوى الأتمتة</h3><p>حتى الوضع التلقائي يلتزم بالحدود ومنع التكرار</p></div></header><div class="card-body"><div class="automation-options">${automationOption("manual", "تقديم يدوي", "تفتح صفحة الوظيفة وتؤكد الإرسال بنفسك.")}${automationOption("review", "شبه تلقائي", "نجهز البيانات والخطاب ثم تراجعها وتؤكد.")}${automationOption("limited", "تلقائي محدود", "يعمل فقط مع الجهات المربوطة والموثوقة وضمن حدك اليومي.")}</div><div class="notice" style="margin-top:13px">${icons.shield}<span>أي إرسال خارجي يظل محكومًا بموافقتك وبالموصلات الرسمية للجهة، ولا يوجد تقديم عشوائي.</span></div></div></article>
    </div><div class="grid">
      <article class="card settings-group"><header class="card-head"><div><h3>التفضيلات والخصوصية</h3><p>إعدادات قابلة للتغيير في أي وقت</p></div></header><div class="card-body">${toggleSetting("remoteAllowed", "السماح بالعمل عن بُعد", "إظهار فرص مكة وجدة التي تتيح العمل عن بُعد أو الهجين.")}${toggleSetting("excludeCommissionOnly", "استبعاد وظائف العمولة فقط", "عدم عرض الوظائف التي لا تحتوي على راتب أساسي.")}${toggleSetting("requireConfirmation", "طلب تأكيد قبل كل تقديم", "طبقة أمان تمنع الإرسال غير المقصود.")}${toggleSetting("emailMonitoring", "متابعة بريد التوظيف", "تصنيف ردود جهات التوظيف بعد ربط البريد بإذن قراءة.")}${toggleSetting("notifyInterviews", "تنبيه المقابلات فورًا", "إظهار تنبيه مهم عند اكتشاف دعوة مقابلة.")}</div></article>
      <article class="card settings-group"><header class="card-head"><div><h3>الحساب والأجهزة</h3><p>مزامنة آمنة بين الكمبيوتر والجوال</p></div><span class="chip green">متصل سحابيًا</span></header><div class="card-body"><div class="setting-row"><div class="setting-copy"><h4>${esc(state.profile.fullName)}</h4><p>${esc(state.profile.email)} · ${esc(state.profile.phone)}</p></div><button class="btn btn-outline" data-page="cv">تعديل الملف</button></div><div class="setting-row"><div class="setting-copy"><h4>تثبيت وظّفني AI على الجوال</h4><p>يظهر كتطبيق مستقل على الشاشة الرئيسية ويعمل من نفس الحساب.</p></div><button class="btn btn-primary" data-action="install-app">تثبيت التطبيق</button></div><div class="setting-row"><div class="setting-copy"><h4>حفظ سحابي خاص</h4><p>السيرة والتقديمات معزولة عن بقية المستخدمين بسياسات وصول على مستوى قاعدة البيانات.</p></div><span class="status status-offer">محمي</span></div><div class="setting-row"><div class="setting-copy"><h4>تسجيل الخروج</h4><p>يمكنك العودة من أي جهاز بنفس الحساب.</p></div><button class="btn btn-outline" data-action="logout">تسجيل الخروج</button></div></div></article>
    </div></div>`;
}
function automationOption(value, title, description) { return `<label class="automation-option ${state.settings.automation === value ? "selected" : ""}"><input type="radio" name="automation" value="${value}" ${state.settings.automation === value ? "checked" : ""}><span class="radio"></span><strong>${title}</strong><p>${description}</p></label>`; }
function toggleSetting(key, title, description) { return `<div class="setting-row"><div class="setting-copy"><h4>${title}</h4><p>${description}</p></div><button class="toggle ${state.settings[key] ? "on" : ""}" data-toggle="${key}" aria-label="${title}"></button></div>`; }

function applyModal(job) {
  const mode = state.settings.automation;
  const improvement = buildImprovement({ ...state.profile, targetRoles: [job.title] });
  const cover = `السادة/ فريق التوظيف في ${job.company}،\n\nأتقدم باهتمام لشغل وظيفة ${job.title}. أمتلك خبرة ومهارات مرتبطة بمتطلبات الدور، خصوصًا في ${job.matchedSkills?.slice(0,3).join("، ") || state.profile.skills.slice(0,3).join("، ")}. أؤمن بقدرتي على الإسهام بفاعلية وتحقيق نتائج ملموسة ضمن فريقكم.\n\nأرفق سيرتي الذاتية، ويسعدني مناقشة مدى ملاءمتي للفرصة.\n\nمع خالص التحية،\n${state.profile.fullName}`;
  const modeText = mode === "manual" ? "سيُسجل الطلب كمسودة، ثم تفتح رابط الجهة وتؤكد إتمام التقديم." : mode === "review" ? "جهزنا البيانات والخطاب. تأكيدك يسجل الطلب كتقديم تمت مراجعته." : "سيُضاف الطلب إلى طابور الجهات الموثوقة فقط؛ الإرسال الخارجي غير مفعّل محليًا.";
  const confirmation = "راجعت بيانات الوظيفة والخطاب، وأوافق على حفظ هذا التقديم في حسابي وتنفيذه وفق وضع الأتمتة الذي اخترته.";
  return `<div class="modal-backdrop" data-action="close-modal"><section class="modal" role="dialog" aria-modal="true"><header class="modal-head"><h3>مراجعة التقديم</h3><button class="icon-btn" data-action="close-modal">×</button></header><div class="modal-body"><div class="apply-summary"><span class="company-logo">${esc(job.company.slice(0,2))}</span><div><h4>${esc(job.title)}</h4><p>${esc(job.company)} · ${esc(job.city)} · مطابقة ${job.match}%</p></div></div><div class="notice" style="margin-top:13px">${icons.shield}<span>${modeText}</span></div><label class="field" style="margin-top:15px"><span>خطاب التغطية المقترح</span><textarea id="cover-letter" class="cover-letter">${esc(cover)}</textarea></label><div class="improvement"><span class="check">✓</span><span>السيرة المستخدمة: ${esc(state.profile.resumeName || "النسخة المحسنة")}</span></div><label class="confirm-line" style="margin-top:14px"><input id="apply-confirm" type="checkbox"><span>${confirmation}</span></label></div><footer class="modal-foot"><button class="btn btn-outline" data-action="close-modal">إلغاء</button><button class="btn btn-primary" data-action="confirm-apply" data-job="${job.id}" disabled>تأكيد وحفظ التقديم</button></footer></section></div>`;
}

async function processResume(file) {
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) return toast("حجم الملف أكبر من 10 ميجابايت", "error");
  const zone = document.querySelector(".upload-zone");
  if (zone) zone.innerHTML = '<span class="loading">جارٍ قراءة السيرة وتحليلها...</span>';
  try {
    const text = await readResumeFile(file);
    if (!text || text.length < 25) throw new Error("لم نتمكن من استخراج نص كافٍ. جرّب ملف DOCX أو TXT، أو PDF نصي غير مصوّر.");
    const parsed = parseResume(text);
    state.profile = {
      ...state.profile, ...parsed,
      fullName: parsed.fullName || state.profile.fullName,
      email: parsed.email || state.profile.email,
      phone: parsed.phone || state.profile.phone,
      city: parsed.city || state.profile.city,
      education: parsed.education || state.profile.education,
      skills: parsed.skills.length ? parsed.skills : state.profile.skills,
      languages: parsed.languages.length ? parsed.languages : state.profile.languages,
      courses: parsed.courses.length ? parsed.courses : state.profile.courses,
      experiences: parsed.experiences.length ? parsed.experiences : state.profile.experiences,
      resumeName: file.name,
      resumeUpdatedAt: new Date().toISOString(),
    };
    if (cloudEnabled) {
      await uploadCloudResume(file, parsed);
      await saveCloudProfile(state.profile);
    }
    persist(); render(); toast(cloudEnabled ? "تم تحليل السيرة وحفظها بأمان في حسابك" : "تم تحليل السيرة واستخراج بياناتها بنجاح");
  } catch (error) { render(); toast(error.message || "تعذر قراءة السيرة", "error"); }
}

function exportImprovedCv() {
  const improvement = buildImprovement({ ...state.profile, targetRoles: state.settings.targetRoles });
  const text = `${state.profile.fullName}\n${improvement.headline}\n${state.profile.email} | ${state.profile.phone} | ${state.profile.city}\n\nالملخص المهني\n${improvement.summary}\n\nالمؤهل\n${state.profile.education}\n\nالمهارات\n${state.profile.skills.join(" • ")}\n\nالخبرات\n${state.profile.experiences.map((x) => `- ${x}`).join("\n")}\n\nالدورات\n${state.profile.courses.map((x) => `- ${x}`).join("\n")}\n\nاللغات\n${state.profile.languages.join(" • ")}`;
  const blob = new Blob(["\ufeff" + text], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `CV-${state.profile.fullName}-محسن.txt`; link.click(); URL.revokeObjectURL(link.href);
  toast("تم تصدير النسخة المحسنة");
}

app.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (event.target.id === "login-form") {
    if (!cloudEnabled) {
      toast("تسجيل الدخول غير متاح حتى يكتمل ربط الحسابات", "error");
    } else {
      const email = document.querySelector("#login-email")?.value.trim();
      const password = document.querySelector("#login-password")?.value;
      const fullName = document.querySelector("#register-name")?.value.trim() || "";
      const submit = event.target.querySelector('[type="submit"]');
      submit.disabled = true; submit.innerHTML = '<span class="loading">جارٍ التحقق...</span>';
      try {
        const result = authMode === "register" ? await signUp(email, password, fullName) : await signIn(email, password);
        if (authMode === "register" && !result.session) {
          authMode = "login"; render(); toast("تم إنشاء الحساب. افتح رسالة التأكيد في بريدك ثم سجّل الدخول");
        } else {
          const user = result.user || result.session?.user;
          state = await loadCloudState(state, user);
          availableJobs = (await loadCloudJobs()) || [];
          selectedMessageId = state.messages[0]?.id;
          persist(); render(); toast("تم تسجيل الدخول ومزامنة حسابك");
        }
      } catch (error) {
        render(); toast(error.message || "تعذر تسجيل الدخول", "error");
      }
    }
  }
  if (event.target.id === "profile-form") {
    const data = new FormData(event.target);
    ["fullName", "email", "phone", "city", "education"].forEach((key) => state.profile[key] = data.get(key)?.trim() || "");
    state.profile.experiences = (data.get("experiences") || "").split("\n").map((x) => x.trim()).filter(Boolean);
    state.profile.courses = (data.get("courses") || "").split("\n").map((x) => x.trim()).filter(Boolean);
    try { if (cloudEnabled) await saveCloudProfile(state.profile); persist(); toast("تم حفظ بيانات السيرة ومزامنتها"); }
    catch (error) { toast(error.message || "تعذر حفظ بيانات السيرة", "error"); }
  }
});

app.addEventListener("click", async (event) => {
  const pageTarget = event.target.closest("[data-page]");
  if (pageTarget) { state.page = pageTarget.dataset.page; persist(); render(); window.scrollTo(0,0); return; }
  const target = event.target.closest("[data-action], [data-toggle], [data-message]");
  if (!target) return;
  if (target.dataset.action === "toggle-auth") { authMode = authMode === "login" ? "register" : "login"; render(); return; }
  if (target.dataset.action === "logout") { try { await signOutCloud(); } catch {} state.session = false; persist(); render(); return; }
  if (target.dataset.action === "install-app") {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") toast("تمت إضافة وظّفني AI إلى جهازك");
      installPrompt = null;
    } else {
      toast("من قائمة المتصفح اختر «إضافة إلى الشاشة الرئيسية» لتثبيت التطبيق");
    }
  }
  if (target.dataset.action === "choose-cv") { document.querySelector("#cv-file")?.click(); }
  if (target.dataset.action === "export-cv") exportImprovedCv();
  if (target.dataset.action === "remove-tag") { state.profile[target.dataset.list].splice(Number(target.dataset.index), 1); persist(); render(); }
  if (target.dataset.action === "apply" || target.dataset.action === "job-details") {
    modalJobId = target.dataset.job;
    const job = rankJobs(availableJobs, { ...state.profile, targetCities: state.settings.targetCities, targetRoles: state.settings.targetRoles }).find((item) => item.id === modalJobId);
    app.insertAdjacentHTML("beforeend", applyModal(job));
  }
  if (target.dataset.action === "close-modal") { if (event.target === target || target.tagName === "BUTTON") { document.querySelector(".modal-backdrop")?.remove(); modalJobId = null; } }
  if (target.dataset.action === "confirm-apply") {
    const job = rankJobs(availableJobs, { ...state.profile, targetCities: state.settings.targetCities, targetRoles: state.settings.targetRoles }).find((item) => item.id === target.dataset.job);
    const result = createApplication(state, job, state.settings.automation);
    if (!result.ok) toast(result.reason === "duplicate" ? "تم منع تكرار التقديم لهذه الوظيفة" : "وصلت إلى الحد اليومي المحدد", "error");
    else {
      try { if (cloudEnabled) await saveCloudApplication(result.application); persist(); document.querySelector(".modal-backdrop")?.remove(); render(); toast(state.settings.automation === "manual" ? "حُفظ كطلب بانتظار إكمال التقديم" : "تم حفظ التقديم بعد مراجعتك"); }
      catch (error) { state.applications = state.applications.filter((item) => item.id !== result.application.id); persist(); toast(error.message || "تعذر حفظ التقديم", "error"); }
    }
  }
  if (target.dataset.message) { selectedMessageId = target.dataset.message; const message = state.messages.find((item) => item.id === selectedMessageId); if (message) message.read = true; persist(); render(); }
  if (target.dataset.action === "mark-interview") { updateApplicationStatus(state, target.dataset.app, "interview"); const item = state.applications.find((x) => x.id === target.dataset.app); if (cloudEnabled && item) await saveCloudApplication(item); persist(); render(); toast("تم تحديث حالة الطلب إلى مقابلة"); }
  if (target.dataset.toggle) { state.settings[target.dataset.toggle] = !state.settings[target.dataset.toggle]; persist(); render(); }
  if (target.dataset.action === "save-settings") {
    const cities = document.querySelector("#settings-cities")?.value.split(/[،,\n]/).map((x) => x.trim()).filter(Boolean);
    const roles = document.querySelector("#settings-roles")?.value.split("\n").map((x) => x.trim()).filter(Boolean);
    state.settings.targetCities = cities?.length ? cities : state.settings.targetCities;
    state.settings.targetRoles = roles?.length ? roles : state.settings.targetRoles;
    state.settings.dailyLimit = Math.min(20, Math.max(1, Number(document.querySelector("#daily-limit")?.value || 5)));
    state.settings.minMatch = Math.min(95, Math.max(40, Number(document.querySelector("#min-match")?.value || 70)));
    state.profile.targetCities = state.settings.targetCities; state.profile.targetRoles = state.settings.targetRoles;
    try { if (cloudEnabled) await saveCloudSettings(state.settings); persist(); render(); toast("تم حفظ الإعدادات ومزامنتها"); }
    catch (error) { toast(error.message || "تعذر حفظ الإعدادات", "error"); }
  }
});

app.addEventListener("change", async (event) => {
  if (event.target.id === "cv-file") processResume(event.target.files[0]);
  if (event.target.id === "city-filter") { cityFilter = event.target.value; render(); }
  if (event.target.matches("[data-status-id]")) { updateApplicationStatus(state, event.target.dataset.statusId, event.target.value); const item = state.applications.find((x) => x.id === event.target.dataset.statusId); try { if (cloudEnabled && item) await saveCloudApplication(item); persist(); render(); toast("تم تحديث حالة الطلب"); } catch (error) { toast(error.message || "تعذر تحديث الحالة", "error"); } }
  if (event.target.name === "automation") { state.settings.automation = event.target.value; persist(); render(); }
  if (event.target.id === "apply-confirm") { const button = document.querySelector('[data-action="confirm-apply"]'); if (button) button.disabled = !event.target.checked; }
});

app.addEventListener("input", (event) => {
  if (event.target.id === "job-search") { jobQuery = event.target.value; clearTimeout(window.__searchTimer); window.__searchTimer = setTimeout(render, 220); }
});

app.addEventListener("keydown", (event) => {
  const listName = event.target.dataset.tagInput;
  if (listName && event.key === "Enter") { event.preventDefault(); const value = event.target.value.trim(); if (value && !state.profile[listName].includes(value)) { state.profile[listName].push(value); persist(); render(); } }
});

app.addEventListener("dragover", (event) => { const zone = event.target.closest(".upload-zone"); if (zone) { event.preventDefault(); zone.classList.add("drag"); } });
app.addEventListener("dragleave", (event) => event.target.closest(".upload-zone")?.classList.remove("drag"));
app.addEventListener("drop", (event) => { const zone = event.target.closest(".upload-zone"); if (zone) { event.preventDefault(); zone.classList.remove("drag"); processResume(event.dataTransfer.files[0]); } });

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
});

async function boot() {
  try {
    state.session = false;
    if (cloudEnabled) {
      const session = await getCloudSession();
      if (session?.user) {
        state = await loadCloudState(state, session.user);
        availableJobs = (await loadCloudJobs()) || [];
        selectedMessageId = state.messages[0]?.id;
      } else {
        state.session = false;
      }
      listenToAuth((event) => {
        if (event === "SIGNED_OUT") {
          state.session = false;
          persist(); render();
        }
      });
    }
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
    }
  } catch (error) {
    state.session = false;
    setTimeout(() => toast(error.message || "تعذر الاتصال بالخدمة السحابية", "error"), 0);
  } finally {
    booting = false;
    persist();
    render();
  }
}

boot();
