// Demo/seed data shared by the Next.js app (via app/_lib/seed.js) and the
// Prisma seed script (prisma/seed.mjs). IDs are fixed so seeding is idempotent
// and re-runs upsert instead of duplicating rows.

export const INITIAL_STREAMS = [
  { id: "str-jr-r", name: "R", level: "junior" },
  { id: "str-jr-g", name: "G", level: "junior" },
  { id: "str-jr-w", name: "W", level: "junior" },
  { id: "str-jr-b", name: "B", level: "junior" },
  { id: "str-sr-a", name: "A", level: "senior" },
  { id: "str-sr-b", name: "B", level: "senior" },
  { id: "str-sr-c", name: "C", level: "senior" },
  { id: "str-sr-d", name: "D", level: "senior" },
  { id: "str-sr-e", name: "E", level: "senior" },
  { id: "str-sr-f", name: "F", level: "senior" },
  { id: "str-sr-g", name: "G", level: "senior" },
  { id: "str-sr-h", name: "H", level: "senior" },
];

export const INITIAL_STUDENTS = [
  { id: "stu-adm001", name: "Fatima Hassan", level: "junior", grade: "Grade 7", stream: "R", gender: "Female", admNo: "ADM001", dob: "2012-03-14", parent: "Hassan Omar", phone: "0712345678" },
  { id: "stu-adm002", name: "Omar Khalid", level: "junior", grade: "Grade 8", stream: "G", gender: "Male", admNo: "ADM002", dob: "2011-07-22", parent: "Khalid Ahmed", phone: "0723456789" },
  { id: "stu-adm003", name: "Aisha Mohamed", level: "junior", grade: "Grade 7", stream: "R", gender: "Female", admNo: "ADM003", dob: "2012-01-05", parent: "Mohamed Ali", phone: "0734567890" },
  { id: "stu-adm004", name: "Yusuf Abdi", level: "senior", grade: "Grade 10", stream: "A", gender: "Male", admNo: "ADM004", dob: "2009-05-18", parent: "Abdi Nur", phone: "0745678901" },
  { id: "stu-adm005", name: "Khadija Saidi", level: "senior", grade: "Grade 11", stream: "C", gender: "Female", admNo: "ADM005", dob: "2008-09-30", parent: "Saidi Bakari", phone: "0756789012" },
];

export const INITIAL_TEACHERS = [
  { id: "tch-001", name: "Sheikh Abdullah", staffId: "TCH001", email: "abdullah@school.ac.ke", phone: "0701234567", subjects: ["Quran Recitation & Tajweed", "Islamic Jurisprudence (Fiqh)"], classes: ["Grade 7R", "Grade 8G"] },
  { id: "tch-002", name: "Ustadha Maryam", staffId: "TCH002", email: "maryam@school.ac.ke", phone: "0702345678", subjects: ["Arabic Language", "Hadith Studies"], classes: ["Grade 7R", "Grade 10A"] },
];

export const INITIAL_SUBJECTS = [
  { id: "sub-qrt", name: "Quran Recitation & Tajweed", code: "QRT", category: "Quran Sciences", description: "Proper recitation with Tajweed rules", levels: ["junior", "senior"] },
  { id: "sub-fqh", name: "Islamic Jurisprudence (Fiqh)", code: "FQH", category: "Islamic Law", description: "Principles of Islamic law and worship", levels: ["junior"] },
  { id: "sub-arb", name: "Arabic Language", code: "ARB", category: "Languages", description: "Classical and Modern Standard Arabic", levels: ["junior", "senior"] },
  { id: "k3607rf", name: "Diraasat", code: "DRST", category: "Islamic Sciences", description: "", levels: ["senior"] },
];

export const INITIAL_EXAMS = [
  { id: "exm-mid-t1-2025", examName: "Mid-Term Examination", term: "Term 1", year: "2025", maxScore: 100, passMark: 40, weight: 30, level: "junior", grades: ["Grade 7", "Grade 8", "Grade 9"], status: "Active" },
  { id: "exm-end-t1-2025", examName: "End-Term Examination", term: "Term 1", year: "2025", maxScore: 100, passMark: 40, weight: 70, level: "senior", grades: ["Grade 10", "Grade 11", "Grade 12"], status: "Active" },
];

export const INITIAL_RESULTS = [
  { id: "res-0001", examId: "exm-mid-t1-2025", studentId: "stu-adm001", subjectId: "sub-qrt", score: 87 },
  { id: "res-0002", examId: "exm-mid-t1-2025", studentId: "stu-adm001", subjectId: "sub-fqh", score: 72 },
  { id: "res-0003", examId: "exm-mid-t1-2025", studentId: "stu-adm002", subjectId: "sub-qrt", score: 55 },
  { id: "res-0004", examId: "exm-mid-t1-2025", studentId: "stu-adm003", subjectId: "sub-qrt", score: 94 },
];

// Demo user accounts. Pass the current teachers/students so the teacher and
// parent accounts stay linked to real records.
export function seedUsers(teachers, students) {
  return [
    // Primary demo login
    { id: "usr-iman", fullName: "Iman", username: "iman", password: "1234", email: "iman@school.ac.ke", role: "admin", status: "Active", linkedTeacherId: "", linkedStudentId: "" },
    { id: "usr-admin", fullName: "Amina Yusuf", username: "admin", password: "admin123", email: "amina@school.ac.ke", role: "admin", status: "Active", linkedTeacherId: "", linkedStudentId: "" },
    { id: "usr-teacher", fullName: "Sheikh Abdullah", username: "abdullah.tch", password: "teacher123", email: "abdullah@school.ac.ke", role: "teacher", status: "Active", linkedTeacherId: teachers[0]?.id || "", linkedStudentId: "" },
    { id: "usr-registrar", fullName: "Registrar Office", username: "registrar1", password: "reg123", email: "registrar@school.ac.ke", role: "registrar", status: "Active", linkedTeacherId: "", linkedStudentId: "" },
    { id: "usr-examofficer", fullName: "Exam Office", username: "examofficer", password: "exam123", email: "exams@school.ac.ke", role: "examOfficer", status: "Active", linkedTeacherId: "", linkedStudentId: "" },
    { id: "usr-parent", fullName: "Hassan Omar", username: "parent.hassan", password: "parent123", email: "hassan.omar@gmail.com", role: "parent", status: "Active", linkedTeacherId: "", linkedStudentId: students[0]?.id || "" },
  ];
}
