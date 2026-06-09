import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { countriesTable, currenciesTable } from "@workspace/db";
import { withDb, log, logDone } from "./seed-utils";

const COUNTRIES = [
  {
    isoCode: "NG",
    name: "Nigeria",
    currencyCode: "NGN",
    phoneCode: "+234",
    timezone: "Africa/Lagos",
  },
  {
    isoCode: "GH",
    name: "Ghana",
    currencyCode: "GHS",
    phoneCode: "+233",
    timezone: "Africa/Accra",
  },
  {
    isoCode: "KE",
    name: "Kenya",
    currencyCode: "KES",
    phoneCode: "+254",
    timezone: "Africa/Nairobi",
  },
  {
    isoCode: "ZA",
    name: "South Africa",
    currencyCode: "ZAR",
    phoneCode: "+27",
    timezone: "Africa/Johannesburg",
  },
  {
    isoCode: "US",
    name: "United States",
    currencyCode: "USD",
    phoneCode: "+1",
    timezone: "America/New_York",
  },
  {
    isoCode: "GB",
    name: "United Kingdom",
    currencyCode: "GBP",
    phoneCode: "+44",
    timezone: "Europe/London",
  },
];

async function seed() {
  log("Seeding countries…");
  let inserted = 0;
  let skipped = 0;

  const currencies = await db.select().from(currenciesTable);
  const currencyMap = new Map(currencies.map((c) => [c.code, c.id]));

  for (const country of COUNTRIES) {
    const currencyId = currencyMap.get(country.currencyCode);
    if (!currencyId) {
      console.warn(`Currency ${country.currencyCode} not found, skipping ${country.isoCode}`);
      skipped++;
      continue;
    }

    const result = await db
      .insert(countriesTable)
      .values({
        isoCode: country.isoCode,
        name: country.name,
        defaultCurrencyId: currencyId,
        phoneCode: country.phoneCode,
        timezone: country.timezone,
      })
      .onConflictDoNothing({ target: countriesTable.isoCode })
      .returning({ id: countriesTable.id });

    if (result.length > 0) inserted++;
    else skipped++;
  }

  logDone("countries", inserted, skipped);
}

withDb(seed).catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
