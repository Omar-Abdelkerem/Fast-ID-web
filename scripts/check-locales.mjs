import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function flattenObject(obj, prefix = "") {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const nestedKeys = Object.keys(value);
      if (nestedKeys.length === 0) {
        result[fullKey] = "";
      } else {
        Object.assign(result, flattenObject(value, fullKey));
      }
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}

function loadLocaleFile(filePath, issues, label) {
  if (!fs.existsSync(filePath)) {
    issues.push(`[${label}] Missing locale file: ${path.relative(rootDir, filePath)}`);
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      issues.push(
        `[${label}] Locale file must contain a JSON object: ${path.relative(rootDir, filePath)}`
      );
      return null;
    }
    return parsed;
  } catch (error) {
    issues.push(
      `[${label}] Invalid JSON in ${path.relative(rootDir, filePath)}: ${error.message}`
    );
    return null;
  }
}

function collectNamespaces() {
  const pairs = [
    {
      namespace: "common",
      arPath: path.join(rootDir, "src", "i18n", "locales", "ar", "common.json"),
      enPath: path.join(rootDir, "src", "i18n", "locales", "en", "common.json"),
    },
  ];

  const featuresDir = path.join(rootDir, "src", "features");
  if (fs.existsSync(featuresDir)) {
    const entries = fs.readdirSync(featuresDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const localesDir = path.join(featuresDir, entry.name, "locales");
      if (!fs.existsSync(localesDir)) continue;

      pairs.push({
        namespace: entry.name,
        arPath: path.join(localesDir, "ar.json"),
        enPath: path.join(localesDir, "en.json"),
      });
    }
  }

  return pairs;
}

function checkNamespace({ namespace, arPath, enPath }) {
  const issues = [];
  const arObj = loadLocaleFile(arPath, issues, `${namespace}:ar`);
  const enObj = loadLocaleFile(enPath, issues, `${namespace}:en`);

  if (!arObj || !enObj) {
    return { namespace, keyCount: 0, issues };
  }

  const arFlat = flattenObject(arObj);
  const enFlat = flattenObject(enObj);

  const arKeys = Object.keys(arFlat).sort();
  const enKeys = Object.keys(enFlat).sort();

  for (const key of arKeys) {
    if (!(key in enFlat)) {
      issues.push(`[${namespace}] Key "${key}" exists in ar but is missing in en`);
    }
    const val = arFlat[key];
    if (typeof val !== "string" || val.trim().length === 0) {
      issues.push(`[${namespace}] Key "${key}" in ar has an empty or non-string value`);
    }
  }

  for (const key of enKeys) {
    if (!(key in arFlat)) {
      issues.push(`[${namespace}] Key "${key}" exists in en but is missing in ar`);
    }
    const val = enFlat[key];
    if (typeof val !== "string" || val.trim().length === 0) {
      issues.push(`[${namespace}] Key "${key}" in en has an empty or non-string value`);
    }
  }

  return { namespace, keyCount: arKeys.length, issues };
}

const namespaces = collectNamespaces();
const allIssues = [];
let totalKeys = 0;

for (const pair of namespaces) {
  const result = checkNamespace(pair);
  totalKeys += result.keyCount;
  allIssues.push(...result.issues);
}

if (allIssues.length > 0) {
  process.stderr.write(
    `i18n check failed with ${allIssues.length} problem(s):\n`
  );
  for (const issue of allIssues) {
    process.stderr.write(`  - ${issue}\n`);
  }
  process.exit(1);
}

process.stdout.write(
  `i18n check passed: ${namespaces.length} namespace(s) verified (${totalKeys} keys per language).\n`
);
