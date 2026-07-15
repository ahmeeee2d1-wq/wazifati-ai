const SKILLS = [
  "إدارة المشاريع", "إدارة فرق", "خدمة العملاء", "المبيعات", "التسويق الرقمي", "تحليل البيانات",
  "Excel", "Power BI", "SQL", "Python", "التواصل", "حل المشكلات", "التخطيط", "المشتريات",
  "الموارد البشرية", "المحاسبة", "إدارة الوقت", "Microsoft Office", "إدارة العمليات", "كتابة التقارير"
];
const CITIES = ["مكة المكرمة", "مكة", "جدة", "الرياض", "المدينة المنورة", "الطائف"];
const DEGREES = ["بكالوريوس", "ماجستير", "دبلوم", "دكتوراه", "الثانوية"];
const JOB_TITLES = ["مدير مشاريع", "منسق مشاريع", "أخصائي عمليات", "محلل بيانات", "ممثل خدمة عملاء", "أخصائي موارد بشرية", "محاسب", "أخصائي تسويق", "مسؤول مبيعات"];

const clean = (text) => text.replace(/\u0000/g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
const unique = (values) => [...new Set(values.filter(Boolean))];

async function extractDocxText(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const decoder = new TextDecoder();
  for (let i = 0; i < bytes.length - 46; i++) {
    if (view.getUint32(i, true) !== 0x02014b50) continue;
    const method = view.getUint16(i + 10, true);
    const compressedSize = view.getUint32(i + 20, true);
    const nameLength = view.getUint16(i + 28, true);
    const extraLength = view.getUint16(i + 30, true);
    const commentLength = view.getUint16(i + 32, true);
    const localOffset = view.getUint32(i + 42, true);
    const name = decoder.decode(bytes.slice(i + 46, i + 46 + nameLength));
    if (name === "word/document.xml") {
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = bytes.slice(start, start + compressedSize);
      let content;
      if (method === 0) content = compressed;
      else if (method === 8 && "DecompressionStream" in window) {
        const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        content = new Uint8Array(await new Response(stream).arrayBuffer());
      } else throw new Error("صيغة ضغط DOCX غير مدعومة في هذا المتصفح");
      const xml = decoder.decode(content);
      return clean(xml.replace(/<w:tab\s*\/?>/g, "\t").replace(/<\/w:p>/g, "\n").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
    }
    i += 45 + nameLength + extraLength + commentLength;
  }
  throw new Error("تعذر العثور على محتوى ملف Word");
}

function extractPdfText(buffer) {
  const raw = new TextDecoder("latin1").decode(buffer);
  const chunks = [];
  const pattern = /\((?:\\.|[^\\)])*\)\s*Tj|\[(.*?)\]\s*TJ/gs;
  for (const match of raw.matchAll(pattern)) {
    const segment = match[0];
    for (const literal of segment.matchAll(/\((.*?)\)/gs)) {
      chunks.push(literal[1].replace(/\\n/g, "\n").replace(/\\r/g, "").replace(/\\\(/g, "(").replace(/\\\)/g, ")").replace(/\\\\/g, "\\"));
    }
  }
  return clean(chunks.join(" "));
}

export async function readResumeFile(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  if (["txt", "md", "rtf"].includes(extension) || file.type.startsWith("text/")) return clean(await file.text());
  const buffer = await file.arrayBuffer();
  if (extension === "docx") return extractDocxText(buffer);
  if (extension === "pdf") return extractPdfText(buffer);
  throw new Error("يدعم الإصدار الحالي PDF وDOCX وTXT");
}

export function parseResume(text) {
  const lines = clean(text).split("\n").map((line) => line.trim()).filter(Boolean);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone = text.match(/(?:\+?966|0)?\s?5\d(?:[\s-]?\d){7}/)?.[0]?.replace(/\s/g, "") || "";
  const nameCandidate = lines.find((line) => line.length > 5 && line.length < 55 && !line.includes("@") && !/سيرة|resume|cv/i.test(line)) || "";
  const skills = SKILLS.filter((skill) => text.toLowerCase().includes(skill.toLowerCase()));
  const city = CITIES.find((item) => text.includes(item)) || "";
  const education = DEGREES.find((degree) => text.includes(degree)) || "";
  const roles = JOB_TITLES.filter((title) => text.includes(title));
  const languages = unique([
    /العربية|لغة عربية/i.test(text) ? "العربية" : "",
    /الإنجليزية|الانجليزية|english/i.test(text) ? "الإنجليزية" : "",
    /الفرنسية|french/i.test(text) ? "الفرنسية" : ""
  ]);
  const experienceLines = lines.filter((line) => /20\d{2}|19\d{2}|سنوات|خبرة|شركة|مؤسسة/.test(line)).slice(0, 6);
  const courseLines = lines.filter((line) => /دورة|شهادة|certificate|course/i.test(line)).slice(0, 6);

  return {
    fullName: nameCandidate,
    email,
    phone,
    city,
    education,
    skills,
    languages,
    courses: courseLines,
    experiences: experienceLines,
    suggestedRoles: roles.length ? roles : inferRoles(skills),
    rawText: text,
    parsedAt: new Date().toISOString(),
    atsScore: calculateAtsScore({ email, phone, skills, experienceLines, education, text })
  };
}

function inferRoles(skills) {
  const joined = skills.join(" ");
  if (/Power BI|SQL|تحليل البيانات/i.test(joined)) return ["محلل بيانات", "أخصائي تقارير"];
  if (/مشاريع|تخطيط|فرق/i.test(joined)) return ["منسق مشاريع", "أخصائي عمليات"];
  if (/مبيعات|خدمة العملاء/i.test(joined)) return ["مسؤول مبيعات", "ممثل خدمة عملاء"];
  return ["أخصائي عمليات", "منسق إداري"];
}

function calculateAtsScore({ email, phone, skills, experienceLines, education, text }) {
  let score = 25;
  if (email) score += 10;
  if (phone) score += 10;
  if (education) score += 10;
  score += Math.min(20, skills.length * 3);
  score += Math.min(15, experienceLines.length * 4);
  if (text.length > 500) score += 10;
  return Math.min(92, score);
}

export function buildImprovement(profile) {
  const role = profile.targetRoles?.[0] || profile.suggestedRoles?.[0] || "الوظيفة المستهدفة";
  const topSkills = (profile.skills || []).slice(0, 6);
  const before = profile.atsScore || 58;
  return {
    scoreBefore: before,
    scoreAfter: Math.min(96, before + 23),
    headline: `${role} | ${topSkills.slice(0, 3).join(" • ")}`,
    summary: `محترف طموح يستهدف فرصة ${role}، ويمتلك خبرة عملية في ${topSkills.slice(0, 4).join("، ") || "تنفيذ الأعمال وتحقيق النتائج"}. يجمع بين الدقة والمبادرة والقدرة على تحويل المتطلبات إلى نتائج قابلة للقياس، مع اهتمام مستمر بالتطوير وتحسين جودة العمل.`,
    suggestions: [
      "إضافة نتائج رقمية واضحة لكل خبرة بدل سرد المهام فقط.",
      `تكرار الكلمات المهمة للمسمى «${role}» بصورة طبيعية داخل الملخص والخبرات.`,
      "توحيد تنسيق التواريخ والمسميات لتسهيل قراءة أنظمة ATS.",
      topSkills.length < 6 ? "إضافة مهارات تقنية مرتبطة مباشرة بالوظائف المستهدفة." : "ترتيب المهارات حسب صلتها بالوظيفة المستهدفة."
    ]
  };
}
