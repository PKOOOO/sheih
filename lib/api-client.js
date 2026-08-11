// Thin fetch wrappers around the CRUD API, plus the diff helper the client
// uses to translate state changes into POST/PUT/DELETE calls.

async function jsonOrThrow(res) {
  if (!res.ok) {
    let msg = `${res.status}`;
    try { msg = (await res.json()).error || msg; } catch { /* keep status */ }
    throw new Error(msg);
  }
  return res.json();
}

export const apiBootstrap = () =>
  fetch("/api/bootstrap").then(jsonOrThrow);

// ── Auth ──
export const apiLogin = (username, password) =>
  fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  }).then(jsonOrThrow);

export const apiLogout = () =>
  fetch("/api/auth/logout", { method: "POST" }).then(jsonOrThrow);

// Returns the signed-in user, or null when there is no valid session.
export const apiMe = async () => {
  const res = await fetch("/api/auth/me");
  if (res.status === 401) return null;
  return (await jsonOrThrow(res)).user;
};

export const apiCreate = (resource, row) =>
  fetch(`/api/data/${resource}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(row),
  }).then(jsonOrThrow);

export const apiUpdate = (resource, row) =>
  fetch(`/api/data/${resource}/${row.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(row),
  }).then(jsonOrThrow);

export const apiDelete = (resource, id) =>
  fetch(`/api/data/${resource}/${id}`, { method: "DELETE" }).then(jsonOrThrow);

export const apiSaveSettings = (json) =>
  fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(json),
  }).then(jsonOrThrow);

// Compare two versions of a collection by id.
export function diffCollection(prevRows, nextRows) {
  const prev = new Map(prevRows.map(r => [r.id, r]));
  const next = new Map(nextRows.map(r => [r.id, r]));
  const created = [], updated = [], deletedIds = [];
  for (const [id, row] of next) {
    const before = prev.get(id);
    if (!before) created.push(row);
    else if (JSON.stringify(before) !== JSON.stringify(row)) updated.push(row);
  }
  for (const id of prev.keys()) {
    if (!next.has(id)) deletedIds.push(id);
  }
  return { created, updated, deletedIds };
}
