import { apiGet } from "@/lib/api";

// public: returns { valid, status, credential } for a QR token
export const verifyCredential = (qrToken) => apiGet(`/verify/${encodeURIComponent(qrToken)}`).then((res) => res.data);
