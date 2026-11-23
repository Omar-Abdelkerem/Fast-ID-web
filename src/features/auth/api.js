import { apiPatch, apiPost } from "@/lib/api";

// login and register go through useAuth(); these are the other auth calls
export const requestPasswordReset = (email) => apiPost("/auth/forgot-password", { email }).then((res) => res.data);

export const resetPassword = (token, newPassword) => apiPost("/auth/reset-password", { token, newPassword }).then((res) => res.data);

export const changePassword = (currentPassword, newPassword) => apiPost("/auth/change-password", { currentPassword, newPassword }).then((res) => res.data);

// body holds only the changed fields: phone and / or preferredLanguage
export const updateProfile = (body) => apiPatch("/auth/me", body).then((res) => res.data);
