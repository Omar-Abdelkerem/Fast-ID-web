import { apiGet } from "@/lib/api";

// the citizen's credentials, newest first
export const getCredentials = () => apiGet("/credentials").then((res) => res.data);
