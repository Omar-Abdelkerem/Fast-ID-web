import ApplyPage from "./pages/ApplyPage";

export const routes = [
  {
    path: "/apply/:serviceId",
    layout: "citizen",
    element: <ApplyPage />,
  },
];

export const nav = [];
