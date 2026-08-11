import { prisma } from "../../../lib/db";

export const dynamic = "force-dynamic";

// App-wide settings (custom CBC grade bands, extra grade levels, language)
// stored as one JSON row.

export async function GET() {
  const row = await prisma.appSetting.findUnique({ where: { key: "app" } });
  return Response.json(row?.json ?? null);
}

export async function PUT(request) {
  const json = await request.json();
  const row = await prisma.appSetting.upsert({
    where: { key: "app" },
    create: { key: "app", json },
    update: { json },
  });
  return Response.json(row.json);
}
