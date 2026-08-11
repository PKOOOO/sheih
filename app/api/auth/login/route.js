import { prisma } from "../../../../lib/db";
import { createToken, sessionCookie } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

// POST /api/auth/login { username, password } — checks the credentials against
// the UserAccount table and sets the session cookie. Demo-grade: passwords are
// stored and compared in plaintext.
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
  if (!user || user.password !== password) {
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
