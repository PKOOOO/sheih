import { prisma } from "./db";

// Whitelist of API-exposed collections. The key is the URL segment
// (/api/data/<key>), the value picks the Prisma model and the writable fields
// (anything else in a request body is dropped).
export const RESOURCES = {
  streams: {
    model: () => prisma.stream,
    fields: ["name", "level"],
  },
  students: {
    model: () => prisma.student,
    fields: ["name", "level", "grade", "stream", "gender", "admNo", "dob", "parent", "phone"],
  },
  teachers: {
    model: () => prisma.teacher,
    fields: ["name", "staffId", "email", "phone", "subjects", "classes"],
  },
  subjects: {
    model: () => prisma.subject,
    fields: ["name", "code", "category", "description", "levels"],
  },
  exams: {
    model: () => prisma.exam,
    fields: ["examName", "term", "year", "maxScore", "passMark", "weight", "level", "grades", "status"],
  },
  results: {
    model: () => prisma.result,
    fields: ["examId", "studentId", "subjectId", "score"],
  },
  users: {
    model: () => prisma.userAccount,
    fields: ["fullName", "username", "password", "email", "role", "status", "linkedTeacherId", "linkedStudentId"],
  },
};

export function pickFields(resource, body) {
  const out = {};
  for (const f of RESOURCES[resource].fields) {
    if (body[f] !== undefined) out[f] = body[f];
  }
  return out;
}

// Numeric fields arrive from forms as strings; coerce the ones the schema types as numbers.
const NUMERIC = { exams: ["maxScore", "passMark", "weight"], results: ["score"] };
export function coerceNumbers(resource, data) {
  for (const f of NUMERIC[resource] || []) {
    if (data[f] !== undefined) data[f] = Number(data[f]);
  }
  return data;
}
