import { prisma } from "../../../../lib/db";
import { verifyToken, SESSION_COOKIE } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

// GET /api/auth/me — returns the signed-in user (from the session cookie), or 401.
export async function GET(request) {
  const token = request.cookies?.get?.(SESSION_COOKIE)?.value
    ?? request.headers.get("cookie")?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1];
  const username = verifyToken(token);
  if (!username) return Response.json({ error: "unauthenticated" }, { status: 401 });

  const user = await prisma.userAccount.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
  });
  if (!user || user.status !== "Active") {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { password: _pw, ...safeUser } = user;
  return Response.json({ user: safeUser });
}
