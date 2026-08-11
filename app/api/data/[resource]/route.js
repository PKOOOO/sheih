import { RESOURCES, pickFields, coerceNumbers } from "../../../../lib/resources";

export const dynamic = "force-dynamic";

function badResource(resource) {
  return Response.json({ error: `Unknown resource "${resource}"` }, { status: 404 });
}

// GET /api/data/:resource — list all records
export async function GET(request, { params }) {
  const { resource } = await params;
  const def = RESOURCES[resource];
  if (!def) return badResource(resource);
  const rows = await def.model().findMany();
  return Response.json(rows);
}

// POST /api/data/:resource — create a record. The client generates ids so the
// UI can stay optimistic; if none is supplied one is created server-side.
export async function POST(request, { params }) {
  const { resource } = await params;
  const def = RESOURCES[resource];
  if (!def) return badResource(resource);
  try {
    const body = await request.json();
    const data = coerceNumbers(resource, pickFields(resource, body));
    const id = typeof body.id === "string" && body.id ? body.id : crypto.randomUUID();
    // Upsert rather than create: a retried request (flaky network) must not 500.
    const row = await def.model().upsert({ where: { id }, create: { id, ...data }, update: data });
    return Response.json(row, { status: 201 });
  } catch (e) {
    console.error(`POST /api/data/${resource} failed:`, e);
    return Response.json({ error: e.code === "P2002" ? "Duplicate value for a unique field." : "Create failed." }, { status: 400 });
  }
}
