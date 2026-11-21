import { HttpResponse } from "msw";

export function ok(data, { meta, status = 200 } = {}) {
  const body =
    meta !== undefined ? { success: true, data, meta } : { success: true, data };
  return HttpResponse.json(body, { status });
}

export function fail(code, message, status = 400, { field, details } = {}) {
  const error = { code, message };
  if (field !== undefined && field !== null) {
    error.field = field;
  }
  if (Array.isArray(details) && details.length > 0) {
    error.details = details;
  }
  return HttpResponse.json({ success: false, error }, { status });
}

export function paginate(request, items) {
  const url = new URL(request.url);
  const rawPage = Number(url.searchParams.get("page") || "1");
  const rawPageSize = Number(url.searchParams.get("pageSize") || "20");

  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
  const pageSize =
    Number.isInteger(rawPageSize) && rawPageSize >= 1 && rawPageSize <= 100
      ? rawPageSize
      : 20;

  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const data = items.slice(start, start + pageSize);

  return {
    data,
    meta: { page, pageSize, total, totalPages },
  };
}
