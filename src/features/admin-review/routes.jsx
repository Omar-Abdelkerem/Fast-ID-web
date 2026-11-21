import ReviewQueuePage from "./pages/ReviewQueuePage";
import ReviewDetailPage from "./pages/ReviewDetailPage";

export const routes = [
  { path: "/admin/applications", layout: "admin", element: <ReviewQueuePage /> },
  { path: "/admin/applications/:applicationId", layout: "admin", element: <ReviewDetailPage /> },
];

export const nav = [{ layout: "admin", to: "/admin/applications", labelKey: "admin-review:nav.title", order: 10 }];
