import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptsRoot = path.join(__dirname, "../../..");

const SEEDS_IN_ORDER = [
  "seed:currencies",
  "seed:countries",
  "seed:categories-fashion",
  "seed:location-nigeria",
  "seed:fashion-nigeria",
  "seed:roles-permissions",
  "seed:event-types",
  "seed:templates",
];

console.log("Running all seeds in order...\n");

for (const seed of SEEDS_IN_ORDER) {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Running: pnpm --filter @workspace/scripts run ${seed}`);
  console.log("=".repeat(50));

  execSync(`pnpm --filter @workspace/scripts run ${seed}`, {
    cwd: scriptsRoot,
    stdio: "inherit",
  });
}

console.log("\n✅ All seeds completed successfully");
