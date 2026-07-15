export const statusLabels = {
  pending: "بانتظار الإكمال",
  applied: "تم التقديم",
  viewed: "تمت المشاهدة",
  rejected: "غير مرشح",
  interview: "مقابلة",
  offer: "عرض وظيفي",
};

export const defaultState = {
  session: false,
  page: "dashboard",
  profile: {
    fullName: "أحمد محمد",
    email: "ahmed@example.com",
    phone: "+966 50 123 4567",
    city: "مكة المكرمة",
    education: "بكالوريوس إدارة أعمال",
    bio: "أخصائي عمليات طموح بخبرة في التنسيق وخدمة العملاء وتحسين سير العمل.",
    skills: ["إدارة المشاريع", "خدمة العملاء", "Excel", "التواصل", "حل المشكلات", "إدارة الوقت"],
    languages: ["العربية", "الإنجليزية"],
    courses: ["أساسيات إدارة المشاريع", "تحليل البيانات باستخدام Excel"],
    experiences: ["منسق عمليات — شركة تجريبية — 2022 إلى الآن", "ممثل خدمة عملاء — مؤسسة تجريبية — 2020 إلى 2022"],
    suggestedRoles: ["أخصائي عمليات", "منسق مشاريع"],
    targetRoles: ["أخصائي عمليات", "منسق مشاريع", "مسؤول خدمة عملاء"],
    targetCities: ["مكة المكرمة", "جدة"],
    atsScore: 71,
    resumeName: "السيرة الذاتية - أحمد.pdf",
    resumeUpdatedAt: "2026-07-13T10:00:00.000Z",
    rawText: "",
  },
  settings: {
    targetCities: ["مكة المكرمة", "جدة"],
    targetRoles: ["أخصائي عمليات", "منسق مشاريع", "مسؤول خدمة عملاء"],
    dailyLimit: 5,
    minMatch: 70,
    automation: "review",
    remoteAllowed: true,
    excludeCommissionOnly: true,
    requireConfirmation: true,
    emailMonitoring: true,
    notifyInterviews: true,
  },
  applications: [
    { id: "app-1", jobId: "job-3", company: "مجموعة نسما", title: "منسق مشاريع", city: "جدة", match: 89, url: "#", mode: "review", status: "viewed", appliedAt: "2026-07-14T08:30:00.000Z", updatedAt: "2026-07-15T06:20:00.000Z", timeline: [] },
    { id: "app-2", jobId: "job-5", company: "شركة الضيافة الحديثة", title: "أخصائي عمليات", city: "مكة المكرمة", match: 85, url: "#", mode: "manual", status: "applied", appliedAt: "2026-07-12T11:15:00.000Z", updatedAt: "2026-07-12T11:15:00.000Z", timeline: [] },
    { id: "app-3", jobId: "job-8", company: "حلول الأعمال السعودية", title: "ممثل خدمة عملاء", city: "جدة", match: 77, url: "#", mode: "manual", status: "interview", appliedAt: "2026-07-09T13:00:00.000Z", updatedAt: "2026-07-14T15:45:00.000Z", timeline: [] },
  ],
  messages: [
    { id: "msg-1", sender: "فريق التوظيف — حلول الأعمال السعودية", subject: "دعوة لمقابلة شخصية", preview: "يسعدنا دعوتك لإجراء مقابلة أولية يوم الخميس...", receivedAt: "2026-07-15T07:40:00.000Z", category: "interview", read: false, applicationId: "app-3" },
    { id: "msg-2", sender: "مجموعة نسما", subject: "تم استلام طلبك", preview: "شكرًا لاهتمامك بالانضمام إلى فريقنا. طلبك قيد المراجعة...", receivedAt: "2026-07-14T09:12:00.000Z", category: "confirmation", read: true, applicationId: "app-1" },
    { id: "msg-3", sender: "وظائف جدة", subject: "فرص جديدة تناسب ملفك", preview: "وجدنا عددًا من الفرص الجديدة في مجال العمليات...", receivedAt: "2026-07-13T12:25:00.000Z", category: "job-alert", read: true, applicationId: null },
  ],
  notifications: [
    { id: "n-1", text: "لديك دعوة مقابلة جديدة", type: "success", read: false },
    { id: "n-2", text: "ظهرت 4 وظائف تطابقك بأكثر من 80%", type: "info", read: false },
  ],
};

export const jobs = [
  { id: "job-1", title: "أخصائي عمليات", company: "شركة وادي مكة للتقنية", city: "مكة المكرمة", type: "دوام كامل", workplace: "حضوري", salary: "7,000 – 9,000 ر.س", posted: "منذ ساعتين", source: "صفحة الشركة", skills: ["إدارة العمليات", "Excel", "كتابة التقارير", "حل المشكلات"], description: "متابعة العمليات اليومية، إعداد التقارير، وتحسين الإجراءات بالتعاون مع فرق العمل.", verified: true, url: "https://example.com/jobs/1" },
  { id: "job-2", title: "منسق مشاريع", company: "شركة البحر الأحمر للخدمات", city: "جدة", type: "دوام كامل", workplace: "هجين", salary: "8,000 – 10,000 ر.س", posted: "منذ 5 ساعات", source: "الموقع الرسمي", skills: ["إدارة المشاريع", "التخطيط", "Excel", "التواصل"], description: "تنسيق خطط المشاريع، متابعة المهام والمواعيد، وتجهيز تقارير التقدم الأسبوعية.", verified: true, url: "https://example.com/jobs/2" },
  { id: "job-3", title: "منسق مشاريع", company: "مجموعة نسما", city: "جدة", type: "دوام كامل", workplace: "حضوري", salary: "حسب الخبرة", posted: "منذ يوم", source: "LinkedIn", skills: ["إدارة المشاريع", "Microsoft Office", "التواصل", "إدارة الوقت"], description: "دعم مدير المشروع والتنسيق مع أصحاب المصلحة ومتابعة الوثائق.", verified: true, url: "https://example.com/jobs/3" },
  { id: "job-4", title: "مسؤول تجربة العملاء", company: "شركة قطار الحرمين", city: "مكة المكرمة", type: "دوام كامل", workplace: "حضوري", salary: "6,500 – 8,000 ر.س", posted: "منذ يوم", source: "صفحة الشركة", skills: ["خدمة العملاء", "التواصل", "حل المشكلات", "كتابة التقارير"], description: "الارتقاء بتجربة المسافرين ومعالجة الملاحظات وقياس مؤشرات الرضا.", verified: true, url: "https://example.com/jobs/4" },
  { id: "job-5", title: "أخصائي عمليات", company: "شركة الضيافة الحديثة", city: "مكة المكرمة", type: "دوام كامل", workplace: "حضوري", salary: "حسب الخبرة", posted: "منذ يومين", source: "الموقع الرسمي", skills: ["إدارة العمليات", "التخطيط", "إدارة الوقت", "التواصل"], description: "تنفيذ الإجراءات التشغيلية ومتابعة الموردين وجودة تقديم الخدمات.", verified: true, url: "https://example.com/jobs/5" },
  { id: "job-6", title: "محلل تقارير مبتدئ", company: "مجموعة بن لادن السعودية", city: "جدة", type: "دوام كامل", workplace: "هجين", salary: "7,500 – 9,500 ر.س", posted: "منذ 3 أيام", source: "منصة توظيف", skills: ["Excel", "Power BI", "تحليل البيانات", "كتابة التقارير"], description: "تجميع البيانات التشغيلية وبناء لوحات المتابعة وإصدار التقارير الدورية.", verified: false, url: "https://example.com/jobs/6" },
  { id: "job-7", title: "منسق إداري", company: "مستشفى مكة التخصصي", city: "مكة المكرمة", type: "دوام كامل", workplace: "حضوري", salary: "6,000 – 7,500 ر.س", posted: "منذ 3 أيام", source: "صفحة الشركة", skills: ["Microsoft Office", "إدارة الوقت", "التواصل", "كتابة التقارير"], description: "تنظيم المواعيد والمراسلات ودعم فرق الإدارة في الأعمال اليومية.", verified: true, url: "https://example.com/jobs/7" },
  { id: "job-8", title: "ممثل خدمة عملاء", company: "حلول الأعمال السعودية", city: "جدة", type: "دوام كامل", workplace: "عن بُعد", salary: "5,500 – 7,000 ر.س", posted: "منذ 4 أيام", source: "الموقع الرسمي", skills: ["خدمة العملاء", "التواصل", "حل المشكلات"], description: "خدمة العملاء عبر القنوات الرقمية وتوثيق الطلبات وتحقيق معايير الجودة.", verified: true, url: "https://example.com/jobs/8" },
];
