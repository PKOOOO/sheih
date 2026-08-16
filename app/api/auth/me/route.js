import { prisma } from "../../../../lib/db";
import {
  verifyToken, SESSION_COOKIE, PARENT_ADM_PREFIX, virtualParentUser,
} from "../../../../lib/auth";

export const dynamic = "force-dynamic";

// GET /api/auth/me — returns the signed-in user (from the session cookie), or 401.
export async function GET(request) {
  const token = request.cookies?.get?.(SESSION_COOKIE)?.value
    ?? request.headers.get("cookie")?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1];
  const username = verifyToken(token);
  if (!username) return Response.json({ error: "unauthenticated" }, { status: 401 });

  // Parent sessions have no UserAccount — rebuild them from the Student row.
  if (username.startsWith(PARENT_ADM_PREFIX)) {
    const admNo = username.slice(PARENT_ADM_PREFIX.length);
    const student = await prisma.student.findFirst({
      where: { admNo: { equals: admNo, mode: "insensitive" } },
    });
    if (!student) return Response.json({ error: "unauthenticated" }, { status: 401 });
    return Response.json({ user: virtualParentUser(student) });
  }

  const user = await prisma.userAccount.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
  });
  if (!user || user.status !== "Active") {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { password: _pw, ...safeUser } = user;
  return Response.json({ user: safeUser });
}
