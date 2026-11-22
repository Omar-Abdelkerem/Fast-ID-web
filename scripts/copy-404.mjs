// GitHub Pages has no server rewrite: copying index.html to 404.html lets deep links work.
import { copyFileSync } from "node:fs";

copyFileSync("dist/index.html", "dist/404.html");
process.stdout.write("dist/404.html created\n");
