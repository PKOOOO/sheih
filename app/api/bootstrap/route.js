import { prisma } from "../../../lib/db";

export const dynamic = "force-dynamic";

// GET /api/bootstrap — everything the client needs to start, in one round trip.
export async function GET() {
  const [streams, students, teachers, subjects, exams, results, users, settings] =
    await Promise.all([
      prisma.stream.findMany(),
      prisma.student.findMany(),
      prisma.teacher.findMany(),
      prisma.subject.findMany(),
      prisma.exam.findMany(),
      prisma.result.findMany(),
      prisma.userAccount.findMany(),
      prisma.appSetting.findUnique({ where: { key: "app" } }),
    ]);
  return Response.json({
    streams, students, teachers, subjects, exams, results, users,
    settings: settings?.json ?? null,
  });
}
