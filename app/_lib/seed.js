// Initial/demo seed data and demo user accounts, extracted from index.jsx (App() body).
import { uid } from "./storage";

// ── Editable streams (per level) ──
export const INITIAL_STREAMS = [
  { id: uid(), name: "R", level: "junior" },
  { id: uid(), name: "G", level: "junior" },
  { id: uid(), name: "W", level: "junior" },
  { id: uid(), name: "B", level: "junior" },
  { id: uid(), name: "A", level: "senior" },
  { id: uid(), name: "B", level: "senior" },
  { id: uid(), name: "C", level: "senior" },
  { id: uid(), name: "D", level: "senior" },
  { id: uid(), name: "E", level: "senior" },
  { id: uid(), name: "F", level: "senior" },
  { id: uid(), name: "G", level: "senior" },
  { id: uid(), name: "H", level: "senior" },
];

// ── Core demo data ──
export const INITIAL_STUDENTS = [
  { id: uid(), name: "Fatima Hassan", level: "junior", grade: "Grade 7", stream: "R", gender: "Female", admNo: "ADM001", dob: "2012-03-14", parent: "Hassan Omar", phone: "0712345678" },
  { id: uid(), name: "Omar Khalid", level: "junior", grade: "Grade 8", stream: "G", gender: "Male", admNo: "ADM002", dob: "2011-07-22", parent: "Khalid Ahmed", phone: "0723456789" },
  { id: uid(), name: "Aisha Mohamed", level: "junior", grade: "Grade 7", stream: "R", gender: "Female", admNo: "ADM003", dob: "2012-01-05", parent: "Mohamed Ali", phone: "0734567890" },
  { id: uid(), name: "Yusuf Abdi", level: "senior", grade: "Grade 10", stream: "A", gender: "Male", admNo: "ADM004", dob: "2009-05-18", parent: "Abdi Nur", phone: "0745678901" },
  { id: uid(), name: "Khadija Saidi", level: "senior", grade: "Grade 11", stream: "C", gender: "Female", admNo: "ADM005", dob: "2008-09-30", parent: "Saidi Bakari", phone: "0756789012" },
];

export const INITIAL_TEACHERS = [
  { id: uid(), name: "Sheikh Abdullah", staffId: "TCH001", email: "abdullah@school.ac.ke", phone: "0701234567", subjects: ["Quran Recitation & Tajweed", "Islamic Jurisprudence (Fiqh)"], classes: ["Grade 7R", "Grade 8G"] },
  { id: uid(), name: "Ustadha Maryam", staffId: "TCH002", email: "maryam@school.ac.ke", phone: "0702345678", subjects: ["Arabic Language", "Hadith Studies"], classes: ["Grade 7R", "Grade 10A"] },
];

export const INITIAL_SUBJECTS = [
  { id: uid(), name: "Quran Recitation & Tajweed", code: "QRT", category: "Quran Sciences", description: "Proper recitation with Tajweed rules", levels: ["junior", "senior"] },
  { id: uid(), name: "Islamic Jurisprudence (Fiqh)", code: "FQH", category: "Islamic Law", description: "Principles of Islamic law and worship", levels: ["junior", "senior"] },
  { id: uid(), name: "Arabic Language", code: "ARB", category: "Languages", description: "Classical and Modern Standard Arabic", levels: ["junior", "senior"] },
  { id: uid(), name: "Hadith Studies", code: "HDT", category: "Islamic Sciences", description: "Prophetic traditions and their sciences", levels: ["senior"] },
  { id: uid(), name: "Aqeedah (Creed)", code: "AQD", category: "Islamic Sciences", description: "Islamic theology and belief", levels: ["junior", "senior"] },
  { id: uid(), name: "Islamic History & Civilization", code: "IHC", category: "History", description: "History of Islam and Muslim civilization", levels: ["senior"] },
];

export const INITIAL_EXAMS = [
  { id: uid(), examName: "Mid-Term Examination", term: "Term 1", year: "2025", maxScore: 100, passMark: 40, weight: 30, level: "junior", grades: ["Grade 7", "Grade 8", "Grade 9"], status: "Active" },
  { id: uid(), examName: "End-Term Examination", term: "Term 1", year: "2025", maxScore: 100, passMark: 40, weight: 70, level: "senior", grades: ["Grade 10", "Grade 11", "Grade 12"], status: "Active" },
];

export const INITIAL_RESULTS = [
  { id: uid(), examId: INITIAL_EXAMS[0]?.id, studentId: INITIAL_STUDENTS[0]?.id, subjectId: INITIAL_SUBJECTS[0]?.id, score: 87 },
  { id: uid(), examId: INITIAL_EXAMS[0]?.id, studentId: INITIAL_STUDENTS[0]?.id, subjectId: INITIAL_SUBJECTS[1]?.id, score: 72 },
  { id: uid(), examId: INITIAL_EXAMS[0]?.id, studentId: INITIAL_STUDENTS[1]?.id, subjectId: INITIAL_SUBJECTS[0]?.id, score: 55 },
  { id: uid(), examId: INITIAL_EXAMS[0]?.id, studentId: INITIAL_STUDENTS[2]?.id, subjectId: INITIAL_SUBJECTS[0]?.id, score: 94 },
];

// ─── DEMO USER ACCOUNTS (seed) ────────────────────────────────────────────────
export function seedUsers(teachers, students) {
  return [
    { id: uid(), fullName: "Amina Yusuf", username: "admin", password: "admin123", email: "amina@school.ac.ke", role: "admin", status: "Active", linkedTeacherId: "", linkedStudentId: "" },
    { id: uid(), fullName: "Sheikh Abdullah", username: "abdullah.tch", password: "teacher123", email: "abdullah@school.ac.ke", role: "teacher", status: "Active", linkedTeacherId: teachers[0]?.id || "", linkedStudentId: "" },
    { id: uid(), fullName: "Registrar Office", username: "registrar1", password: "reg123", email: "registrar@school.ac.ke", role: "registrar", status: "Active", linkedTeacherId: "", linkedStudentId: "" },
    { id: uid(), fullName: "Exam Office", username: "examofficer", password: "exam123", email: "exams@school.ac.ke", role: "examOfficer", status: "Active", linkedTeacherId: "", linkedStudentId: "" },
    { id: uid(), fullName: "Hassan Omar", username: "parent.hassan", password: "parent123", email: "hassan.omar@gmail.com", role: "parent", status: "Active", linkedTeacherId: "", linkedStudentId: students[0]?.id || "" },
  ];
}
