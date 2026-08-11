// Seeds the demo data into Postgres. Idempotent: fixed IDs + upserts, so it
// can be re-run safely. Run with: pnpm db:seed
import "dotenv/config";
import { prisma } from "../lib/db.js";
import {
  INITIAL_STREAMS,
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
  INITIAL_SUBJECTS,
  INITIAL_EXAMS,
  INITIAL_RESULTS,
  seedUsers,
} from "../lib/seed-data.mjs";

async function upsertAll(model, rows) {
  for (const row of rows) {
    await model.upsert({ where: { id: row.id }, update: row, create: row });
  }
}

async function main() {
  await upsertAll(prisma.stream, INITIAL_STREAMS);
  await upsertAll(prisma.student, INITIAL_STUDENTS);
  await upsertAll(prisma.teacher, INITIAL_TEACHERS);
  await upsertAll(prisma.subject, INITIAL_SUBJECTS);
  await upsertAll(prisma.exam, INITIAL_EXAMS);
  await upsertAll(prisma.result, INITIAL_RESULTS);
  await upsertAll(prisma.userAccount, seedUsers(INITIAL_TEACHERS, INITIAL_STUDENTS));

  const counts = {
    streams: await prisma.stream.count(),
    students: await prisma.student.count(),
    teachers: await prisma.teacher.count(),
    subjects: await prisma.subject.count(),
    exams: await prisma.exam.count(),
    results: await prisma.result.count(),
    users: await prisma.userAccount.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
