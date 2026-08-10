// Kenya CBC 8-level grading defaults and helper, extracted from index.jsx.
export const DEFAULT_CBE_GRADES = [
  { code: "EE1", label: "Exceeds Expectation", min: 90, max: 100, color: "#1a6e38", bg: "#d4edda" },
  { code: "EE2", label: "Exceeds Expectation", min: 80, max: 89,  color: "#1a6e38", bg: "#c3e6cb" },
  { code: "ME1", label: "Meets Expectation",   min: 70, max: 79,  color: "#0c5460", bg: "#bee5eb" },
  { code: "ME2", label: "Meets Expectation",   min: 60, max: 69,  color: "#0c5460", bg: "#d1ecf1" },
  { code: "AE1", label: "Approaches Expectation", min: 50, max: 59, color: "#856404", bg: "#fff3cd" },
  { code: "AE2", label: "Approaches Expectation", min: 40, max: 49, color: "#856404", bg: "#ffeeba" },
  { code: "BE1", label: "Below Expectation",   min: 30, max: 39,  color: "#842029", bg: "#f8d7da" },
  { code: "BE2", label: "Below Expectation",   min: 0,  max: 29,  color: "#6a0000", bg: "#f5c2c7" },
];

export function getCBELevel(score, maxScore, cbeGrades) {
  const pct = (score / maxScore) * 100;
  const grades = cbeGrades || DEFAULT_CBE_GRADES;
  const sorted = [...grades].sort((a, b) => b.min - a.min);
  for (const g of sorted) {
    if (pct >= g.min) return g;
  }
  return sorted[sorted.length - 1];
}
