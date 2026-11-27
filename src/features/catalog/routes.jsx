import LandingPage from "./pages/LandingPage";
import CatalogPage from "./pages/CatalogPage";
import ServiceDetailPage from "./pages/ServiceDetailPage";

export const routes = [
  { path: "/", layout: "public", element: <LandingPage /> },
  { path: "/services", layout: "public", element: <CatalogPage /> },
  { path: "/services/:serviceId", layout: "public", element: <ServiceDetailPage /> },
];

export const nav = [{ layout: "public", to: "/services", labelKey: "catalog:nav.services", order: 10 }];
