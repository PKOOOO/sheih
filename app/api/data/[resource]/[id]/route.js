import { RESOURCES, pickFields, coerceNumbers } from "../../../../../lib/resources";

export const dynamic = "force-dynamic";

function badResource(resource) {
  return Response.json({ error: `Unknown resource "${resource}"` }, { status: 404 });
}

// GET /api/data/:resource/:id — fetch one record
export async function GET(request, { params }) {
  const { resource, id } = await params;
  const def = RESOURCES[resource];
  if (!def) return badResource(resource);
  const row = await def.model().findUnique({ where: { id } });
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(row);
}

// PUT /api/data/:resource/:id — update a record
export async function PUT(request, { params }) {
  const { resource, id } = await params;
  const def = RESOURCES[resource];
  if (!def) return badResource(resource);
  try {
    const body = await request.json();
    const data = coerceNumbers(resource, pickFields(resource, body));
    const row = await def.model().update({ where: { id }, data });
    return Response.json(row);
  } catch (e) {
    if (e.code === "P2025") return Response.json({ error: "Not found" }, { status: 404 });
    console.error(`PUT /api/data/${resource}/${id} failed:`, e);
    return Response.json({ error: e.code === "P2002" ? "Duplicate value for a unique field." : "Update failed." }, { status: 400 });
  }
}

// DELETE /api/data/:resource/:id — delete a record. deleteMany keeps this
// idempotent: deleting an already-gone row (e.g. cascade-removed result) is OK.
export async function DELETE(request, { params }) {
  const { resource, id } = await params;
  const def = RESOURCES[resource];
  if (!def) return badResource(resource);
  const { count } = await def.model().deleteMany({ where: { id } });
  return Response.json({ deleted: count });
}
