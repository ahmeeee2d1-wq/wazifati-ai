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
    fullName: "",
    email: "",
    phone: "",
    city: "",
    education: "",
    bio: "",
    skills: [],
    languages: [],
    courses: [],
    experiences: [],
    suggestedRoles: [],
    targetRoles: [],
    targetCities: ["مكة المكرمة", "جدة"],
    atsScore: 0,
    resumeName: "",
    resumeUpdatedAt: null,
    rawText: "",
  },
  settings: {
    targetCities: ["مكة المكرمة", "جدة"],
    targetRoles: [],
    dailyLimit: 5,
    minMatch: 70,
    automation: "review",
    remoteAllowed: true,
    excludeCommissionOnly: true,
    requireConfirmation: true,
    emailMonitoring: false,
    notifyInterviews: true,
  },
  applications: [],
  messages: [],
  notifications: [],
};

// الوظائف لا تُعرض إلا بعد جلبها من قاعدة البيانات الحقيقية.
export const jobs = [];
