// Initial/demo seed data and demo user accounts.
// The data itself lives in lib/seed-data.mjs so the Prisma seed script
// (prisma/seed.mjs) can import the exact same records under plain Node.
export {
  INITIAL_STREAMS,
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
  INITIAL_SUBJECTS,
  INITIAL_EXAMS,
  INITIAL_RESULTS,
  seedUsers,
} from "../../lib/seed-data.mjs";
