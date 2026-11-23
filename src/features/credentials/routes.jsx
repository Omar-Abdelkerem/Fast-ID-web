import CredentialsPage from "./pages/CredentialsPage";

export const routes = [{ path: "/credentials", layout: "citizen", element: <CredentialsPage /> }];

export const nav = [{ layout: "citizen", to: "/credentials", labelKey: "credentials:nav.title", order: 20 }];
