import { HttpResponse } from "msw";

// success envelope (use status 201 for creates)
export const ok = (data, { meta, status = 200 } = {}) => HttpResponse.json({ success: true, data, ...(meta ? { meta } : {}) }, { status });

// error envelope
export const fail = (code, message, status = 400, { field, details } = {}) =>
  HttpResponse.json({ success: false, error: { code, message, ...(field ? { field } : {}), ...(details ? { details } : {}) } }, { status });

// reads page and pageSize from the request URL and returns { data, meta } for ok(data, { meta })
export function paginate(request, items) {
  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.get("pageSize")) || 20));
  const total = items.length;
  return {
    data: items.slice((page - 1) * pageSize, page * pageSize),
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}
