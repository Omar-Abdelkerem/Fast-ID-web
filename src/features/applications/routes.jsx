import ApplicationsPage from "./pages/ApplicationsPage";
import ApplicationDetailPage from "./pages/ApplicationDetailPage";

export const routes = [
  { path: "/applications", layout: "citizen", element: <ApplicationsPage /> },
  { path: "/applications/:applicationId", layout: "citizen", element: <ApplicationDetailPage /> },
];

export const nav = [{ layout: "citizen", to: "/applications", labelKey: "applications:nav.title", order: 10 }];
