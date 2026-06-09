import { db } from "@workspace/db";
import { currenciesTable } from "@workspace/db";
import { withDb, log, logDone } from "./seed-utils";

const CURRENCIES = [
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", decimalPlaces: 2 },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "GH₵", decimalPlaces: 2 },
  { code: "USD", name: "US Dollar", symbol: "$", decimalPlaces: 2 },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", decimalPlaces: 2 },
  { code: "ZAR", name: "South African Rand", symbol: "R", decimalPlaces: 2 },
  { code: "XOF", name: "West African CFA Franc", symbol: "CFA", decimalPlaces: 0 },
  { code: "XAF", name: "Central African CFA Franc", symbol: "FCFA", decimalPlaces: 0 },
  { code: "GBP", name: "British Pound", symbol: "£", decimalPlaces: 2 },
  { code: "EUR", name: "Euro", symbol: "€", decimalPlaces: 2 },
];

async function seed() {
  log("Seeding currencies…");
  let inserted = 0;
  let skipped = 0;

  for (const currency of CURRENCIES) {
    const result = await db
      .insert(currenciesTable)
      .values(currency)
      .onConflictDoNothing({ target: currenciesTable.code })
      .returning({ id: currenciesTable.id });

    if (result.length > 0) inserted++;
    else skipped++;
  }

  logDone("currencies", inserted, skipped);
}

withDb(seed).catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
