const normalize = (value = "") => value.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه");

export function calculateMatch(job, profile) {
  const profileSkills = (profile.skills || []).map(normalize);
  const jobSkills = (job.skills || []).map(normalize);
  const skillsFound = jobSkills.filter((skill) => profileSkills.some((owned) => owned.includes(skill) || skill.includes(owned)));
  const cityMatch = (profile.targetCities || []).some((city) => normalize(city) === normalize(job.city));
  const titleMatch = (profile.targetRoles || []).some((title) => normalize(job.title).includes(normalize(title)) || normalize(title).includes(normalize(job.title)));
  const skillScore = jobSkills.length ? (skillsFound.length / jobSkills.length) * 55 : 30;
  const score = Math.min(99, Math.round(skillScore + (cityMatch ? 20 : 0) + (titleMatch ? 20 : 0) + 4));
  const reasons = [];
  if (skillsFound.length) reasons.push(`تطابق ${skillsFound.length} من المهارات المطلوبة`);
  if (cityMatch) reasons.push(`ضمن المدن المستهدفة`);
  if (titleMatch) reasons.push(`المسمى قريب من هدفك المهني`);
  return { score, reasons, skillsFound };
}

export function rankJobs(jobs, profile) {
  return jobs
    .map((job) => {
      const result = calculateMatch(job, profile);
      return { ...job, match: result.score, matchReasons: result.reasons, matchedSkills: result.skillsFound };
    })
    .sort((a, b) => b.match - a.match);
}
