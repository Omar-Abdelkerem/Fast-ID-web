import NotificationsPage from "./pages/NotificationsPage";

export const routes = [
  {
    path: "/notifications",
    layout: "shared",
    element: <NotificationsPage />,
  },
];

export const nav = [
  {
    layout: "shared",
    to: "/notifications",
    labelKey: "notifications:nav.title",
    order: 90,
  },
];
