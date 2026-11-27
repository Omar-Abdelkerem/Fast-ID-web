import VerifyPage from "./pages/VerifyPage";
import VerifyResultPage from "./pages/VerifyResultPage";

export const routes = [
  { path: "/verify", layout: "public", element: <VerifyPage /> },
  { path: "/verify/:qrToken", layout: "public", element: <VerifyResultPage /> },
];

export const nav = [{ layout: "public", to: "/verify", labelKey: "verify:nav.verify", order: 20 }];
