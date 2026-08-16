import { prisma } from "../../../../lib/db";
import {
  createToken, sessionCookie, PARENT_ADM_PREFIX, virtualParentUser,
} from "../../../../lib/auth";

export const dynamic = "force-dynamic";

// POST /api/auth/login { username, password } — checks the credentials against
// the UserAccount table and sets the session cookie. Demo-grade: passwords are
// stored and compared in plaintext.
//
// Staff accounts are tried first; failing that, a parent may sign in with their
// child's admission number as both username and password (no account needed).
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { body = {}; }
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  if (!username || !password) {
    return Response.json({ error: "invalid" }, { status: 401 });
  }

  const user = await prisma.userAccount.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
  });

  if (user) {
    if (user.password !== password) {
      return Response.json({ error: "invalid" }, { status: 401 });
    }
    if (user.status !== "Active") {
      return Response.json({ error: "suspended" }, { status: 403 });
    }
    const { password: _pw, ...safeUser } = user;
    return Response.json(
      { user: safeUser },
      { headers: { "Set-Cookie": sessionCookie(createToken(user.username)) } },
    );
  }

  // Parent login: admission number is both the username and the password.
  const student = await prisma.student.findFirst({
    where: { admNo: { equals: username, mode: "insensitive" } },
  });
  if (student && password.trim().toLowerCase() === student.admNo.toLowerCase()) {
    return Response.json(
      { user: virtualParentUser(student) },
      { headers: { "Set-Cookie": sessionCookie(createToken(PARENT_ADM_PREFIX + student.admNo)) } },
    );
  }

  return Response.json({ error: "invalid" }, { status: 401 });
}
