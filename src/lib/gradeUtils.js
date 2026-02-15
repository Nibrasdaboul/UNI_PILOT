/**
 * Grade conversion table (literal as required):
 * 95–100 → A → 3.75
 * 90–94 → A- → 3.50
 * 85–89 → B+ → 3.25
 * 80–84 → B → 3.00
 * 75–79 → B- → 2.75
 * 70–74 → C+ → 2.50
 * 65–69 → C → 2.25
 * 60–64 → C- → 2.00
 * 55–59 → D+ → 1.75
 * 50–54 → D → 1.50
 * <50 → F → 0.00
 */
const GRADE_TABLE = [
  { min: 95, max: 100, letter: 'A', points: 3.75 },
  { min: 90, max: 94, letter: 'A-', points: 3.5 },
  { min: 85, max: 89, letter: 'B+', points: 3.25 },
  { min: 80, max: 84, letter: 'B', points: 3.0 },
  { min: 75, max: 79, letter: 'B-', points: 2.75 },
  { min: 70, max: 74, letter: 'C+', points: 2.5 },
  { min: 65, max: 69, letter: 'C', points: 2.25 },
  { min: 60, max: 64, letter: 'C-', points: 2.0 },
  { min: 55, max: 59, letter: 'D+', points: 1.75 },
  { min: 50, max: 54, letter: 'D', points: 1.5 },
  { min: 0, max: 49.99, letter: 'F', points: 0.0 },
];

export function markToLetter(mark) {
  if (mark == null || Number.isNaN(Number(mark))) return null;
  const m = Math.min(100, Math.max(0, Number(mark)));
  const row = GRADE_TABLE.find((r) => m >= r.min && m <= r.max);
  return row ? row.letter : 'F';
}

export function markToGpaPoints(mark) {
  if (mark == null || Number.isNaN(Number(mark))) return null;
  const m = Math.min(100, Math.max(0, Number(mark)));
  const row = GRADE_TABLE.find((r) => m >= r.min && m <= r.max);
  return row ? row.points : 0.0;
}

/** Student status: safe (>=80), normal (70-79), at_risk (60-69), high_risk (<60) */
export function getGradeStatus(mark) {
  if (mark == null || Number.isNaN(Number(mark))) return 'normal';
  const m = Number(mark);
  if (m >= 80) return 'safe';
  if (m >= 70) return 'normal';
  if (m >= 60) return 'at_risk';
  return 'high_risk';
}

/**
 * Semester GPA (4.0): weighted by credit hours.
 * GPA_semester = sum(GPA_i * Credits_i) / sum(Credits_i)
 * Round only at the end to 2 decimals.
 */
export function computeSemesterGpa(courses) {
  if (!courses?.length) return 0;
  let sumWeighted = 0;
  let sumCredits = 0;
  for (const c of courses) {
    const cred = Number(c.credit_hours) || 0;
    const mark = c.final_mark != null ? Number(c.final_mark) : null;
    if (cred <= 0) continue;
    const points = mark != null ? markToGpaPoints(mark) : 0;
    sumWeighted += points * cred;
    sumCredits += cred;
  }
  if (sumCredits === 0) return 0;
  return Math.round((sumWeighted / sumCredits) * 100) / 100;
}

/**
 * Semester percent (weighted average of marks by credits).
 * Percent_semester = sum(Mark_i * Credits_i) / sum(Credits_i)
 */
export function computeSemesterPercent(courses) {
  if (!courses?.length) return 0;
  let sumWeighted = 0;
  let sumCredits = 0;
  for (const c of courses) {
    const cred = Number(c.credit_hours) || 0;
    const mark = c.final_mark != null ? Number(c.final_mark) : null;
    if (cred <= 0) continue;
    sumWeighted += (mark != null ? Math.min(100, Math.max(0, mark)) : 0) * cred;
    sumCredits += cred;
  }
  if (sumCredits === 0) return 0;
  return Math.round((sumWeighted / sumCredits) * 100) / 100;
}

/**
 * CGPA_new = (CGPA_old * Credits_old + GPA_semester * Credits_semester) / (Credits_old + Credits_semester)
 */
export function computeCGPA(cgpaOld, creditsOld, gpaSemester, creditsSemester) {
  const co = Number(cgpaOld) || 0;
  const crOld = Number(creditsOld) || 0;
  const gs = Number(gpaSemester) || 0;
  const crSem = Number(creditsSemester) || 0;
  if (crOld + crSem === 0) return 0;
  return Math.round(((co * crOld + gs * crSem) / (crOld + crSem)) * 100) / 100;
}

/**
 * CumPercent_new = (CumPercent_old * Credits_old + Percent_semester * Credits_semester) / (Credits_old + Credits_semester)
 */
export function computeCumPercent(cumPercentOld, creditsOld, percentSemester, creditsSemester) {
  const po = Number(cumPercentOld) || 0;
  const crOld = Number(creditsOld) || 0;
  const ps = Number(percentSemester) || 0;
  const crSem = Number(creditsSemester) || 0;
  if (crOld + crSem === 0) return 0;
  return Math.round(((po * crOld + ps * crSem) / (crOld + crSem)) * 100) / 100;
}

/**
 * Compute final mark (0-100) from grade items: weighted average (score/max_score * weight) / totalWeight * 100
 * Each item: score, max_score, weight (e.g. 20 for 20%)
 */
export function computeFinalMarkFromItems(gradeItems) {
  if (!gradeItems?.length) return null;
  let weightedSum = 0;
  let totalWeight = 0;
  for (const g of gradeItems) {
    const w = Number(g.weight) || 0;
    const max = Number(g.max_score) || 100;
    const score = Number(g.score) ?? 0;
    if (w <= 0) continue;
    totalWeight += w;
    weightedSum += (max > 0 ? (score / max) * 100 : 0) * w;
  }
  if (totalWeight === 0) return null;
  const raw = weightedSum / totalWeight;
  return Math.round(Math.min(100, Math.max(0, raw)) * 100) / 100;
}
