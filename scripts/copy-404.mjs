// GitHub Pages has no server rewrite: a copy of index.html as 404.html makes deep links like /admin/services work.
import { copyFileSync } from "node:fs";

copyFileSync("dist/index.html", "dist/404.html");
console.log("dist/404.html created");
