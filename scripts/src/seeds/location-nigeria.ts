import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { countriesTable, locationsTable, locationLevelDefinitionsTable } from "@workspace/db";
import { withDb, log, logDone } from "./seed-utils";

const COUNTRY_ISO = "NG";

const LEVEL_DEFINITIONS = [
  { levelNumber: 1, label: "State" },
  { levelNumber: 2, label: "Local Government Area" },
  { levelNumber: 3, label: "Town / Neighbourhood" },
];

const STATES: { name: string; slug: string; lgas: { name: string; slug: string; towns?: string[] }[] }[] = [
  {
    name: "Lagos", slug: "lagos-ng",
    lgas: [
      { name: "Lagos Island", slug: "lagos-island", towns: ["Lagos Island", "Victoria Island", "Ikoyi", "Onikan"] },
      { name: "Lagos Mainland", slug: "lagos-mainland", towns: ["Yaba", "Surulere", "Ebute Metta", "Mushin", "Oshodi"] },
      { name: "Ikeja", slug: "ikeja", towns: ["Ikeja GRA", "Oregun", "Allen Avenue", "Ojodu", "Agege"] },
      { name: "Alimosho", slug: "alimosho", towns: ["Egbeda", "Idimu", "Ipaja", "Ayobo", "Akowonjo"] },
      { name: "Eti-Osa", slug: "eti-osa", towns: ["Lekki", "Ajah", "Epe", "Badore", "Sangotedo"] },
      { name: "Kosofe", slug: "kosofe", towns: ["Ketu", "Mile 12", "Ojota", "Oworo", "Maryland"] },
      { name: "Somolu", slug: "somolu", towns: ["Shomolu", "Bariga", "Gbagada", "Onipanu"] },
      { name: "Amuwo-Odofin", slug: "amuwo-odofin", towns: ["Festac", "Amuwo", "Mile 2", "Satelite Town"] },
      { name: "Apapa", slug: "apapa", towns: ["Apapa", "Apapa Wharf", "Ajegunle"] },
      { name: "Badagry", slug: "badagry", towns: ["Badagry", "Ajido", "Ibereko"] },
    ],
  },
  {
    name: "Abuja (FCT)", slug: "abuja-ng",
    lgas: [
      { name: "Municipal Area Council", slug: "abuja-mac", towns: ["Wuse", "Garki", "Asokoro", "Maitama", "Central Business District"] },
      { name: "Bwari", slug: "bwari", towns: ["Bwari", "Dutse", "Ushafa"] },
      { name: "Gwagwalada", slug: "gwagwalada", towns: ["Gwagwalada", "Dobi", "Tunkpa"] },
      { name: "Kuje", slug: "kuje", towns: ["Kuje", "Chibiri", "Rubochi"] },
    ],
  },
  {
    name: "Kano", slug: "kano-ng",
    lgas: [
      { name: "Kano Municipal", slug: "kano-municipal", towns: ["Fagge", "Gwale", "Kofar Wambai", "Kofar Nassarawa"] },
      { name: "Nassarawa", slug: "nassarawa-kano", towns: ["Nassarawa GRA", "Sabon Gari", "Rijiyar Zaki"] },
      { name: "Dala", slug: "dala", towns: ["Dala", "Panshekara", "Dakata"] },
      { name: "Ungogo", slug: "ungogo", towns: ["Ungogo", "Rimin Gado"] },
    ],
  },
  {
    name: "Rivers", slug: "rivers-ng",
    lgas: [
      { name: "Port Harcourt", slug: "port-harcourt", towns: ["Old GRA", "New GRA", "D-Line", "Rumuola", "Trans-Amadi"] },
      { name: "Obio/Akpor", slug: "obio-akpor", towns: ["Rumuola", "Rumuibekwe", "Eliozu", "Choba"] },
      { name: "Oyigbo", slug: "oyigbo", towns: ["Oyigbo", "Afam"] },
    ],
  },
  {
    name: "Oyo", slug: "oyo-ng",
    lgas: [
      { name: "Ibadan North", slug: "ibadan-north", towns: ["Bodija", "Sango", "Iwo Road", "Dugbe"] },
      { name: "Ibadan South-West", slug: "ibadan-sw", towns: ["Ibadan South-West", "Challenge", "Oke-Ado"] },
      { name: "Ogbomoso North", slug: "ogbomoso-north", towns: ["Ogbomoso", "Masifa"] },
    ],
  },
  {
    name: "Anambra", slug: "anambra-ng",
    lgas: [
      { name: "Awka South", slug: "awka-south", towns: ["Awka", "Nkwelle", "Amawbia"] },
      { name: "Onitsha North", slug: "onitsha-north", towns: ["Onitsha", "Fegge", "Inland Town"] },
      { name: "Nnewi North", slug: "nnewi-north", towns: ["Nnewi", "Otolo"] },
    ],
  },
  {
    name: "Delta", slug: "delta-ng",
    lgas: [
      { name: "Warri South", slug: "warri-south", towns: ["Warri", "Effurun", "Edjophe"] },
      { name: "Oshimili South", slug: "oshimili-south", towns: ["Asaba", "Okpanam"] },
      { name: "Sapele", slug: "sapele-delta", towns: ["Sapele", "Amukpe"] },
    ],
  },
  {
    name: "Enugu", slug: "enugu-ng",
    lgas: [
      { name: "Enugu North", slug: "enugu-north", towns: ["GRA Enugu", "Ogui New Layout", "Trans Ekulu"] },
      { name: "Enugu South", slug: "enugu-south", towns: ["Abakpa Nike", "Independence Layout"] },
    ],
  },
  {
    name: "Ogun", slug: "ogun-ng",
    lgas: [
      { name: "Abeokuta South", slug: "abeokuta-south", towns: ["Abeokuta", "Iyana Mortuary", "Kemta"] },
      { name: "Sagamu", slug: "sagamu", towns: ["Sagamu", "Makun"] },
      { name: "Ijebu Ode", slug: "ijebu-ode", towns: ["Ijebu Ode", "Ita Amo"] },
    ],
  },
  {
    name: "Kaduna", slug: "kaduna-ng",
    lgas: [
      { name: "Kaduna North", slug: "kaduna-north", towns: ["Kaduna North", "Barnawa", "Kakuri"] },
      { name: "Kaduna South", slug: "kaduna-south", towns: ["Kaduna South", "Rigasa"] },
    ],
  },
];

async function seed() {
  log("Seeding Nigeria location hierarchy…");

  const [nigeria] = await db
    .select({ id: countriesTable.id })
    .from(countriesTable)
    .where(eq(countriesTable.isoCode, COUNTRY_ISO));

  if (!nigeria) throw new Error("Nigeria not found — run seed:countries first");
  const countryId = nigeria.id;

  let levelDefsInserted = 0;
  for (const def of LEVEL_DEFINITIONS) {
    const result = await db
      .insert(locationLevelDefinitionsTable)
      .values({ countryId, ...def })
      .onConflictDoNothing({ target: [locationLevelDefinitionsTable.countryId, locationLevelDefinitionsTable.levelNumber] })
      .returning({ id: locationLevelDefinitionsTable.id });
    if (result.length > 0) levelDefsInserted++;
  }
  log(`Level definitions: ${levelDefsInserted} inserted`);

  let statesInserted = 0;
  let lgasInserted = 0;
  let townsInserted = 0;

  for (let si = 0; si < STATES.length; si++) {
    const state = STATES[si]!;

    const [existing] = await db
      .select({ id: locationsTable.id })
      .from(locationsTable)
      .where(and(eq(locationsTable.countryId, countryId), eq(locationsTable.slug, state.slug)));

    let stateId: string;
    if (existing) {
      stateId = existing.id;
    } else {
      const [inserted] = await db
        .insert(locationsTable)
        .values({
          countryId,
          name: state.name,
          slug: state.slug,
          fullName: `${state.name}, Nigeria`,
          levelNumber: 1,
          parentId: null,
          sortOrder: si,
          isActive: true,
        })
        .returning({ id: locationsTable.id });
      stateId = inserted!.id;
      statesInserted++;
    }

    for (let li = 0; li < state.lgas.length; li++) {
      const lga = state.lgas[li]!;

      const [existingLga] = await db
        .select({ id: locationsTable.id })
        .from(locationsTable)
        .where(and(eq(locationsTable.countryId, countryId), eq(locationsTable.slug, lga.slug)));

      let lgaId: string;
      if (existingLga) {
        lgaId = existingLga.id;
      } else {
        const [insertedLga] = await db
          .insert(locationsTable)
          .values({
            countryId,
            name: lga.name,
            slug: lga.slug,
            fullName: `${lga.name}, ${state.name}, Nigeria`,
            levelNumber: 2,
            parentId: stateId,
            sortOrder: li,
            isActive: true,
          })
          .returning({ id: locationsTable.id });
        lgaId = insertedLga!.id;
        lgasInserted++;
      }

      for (let ti = 0; ti < (lga.towns?.length ?? 0); ti++) {
        const townName = lga.towns![ti]!;
        const townSlug = `${lga.slug}-${townName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

        const result = await db
          .insert(locationsTable)
          .values({
            countryId,
            name: townName,
            slug: townSlug,
            fullName: `${townName}, ${lga.name}, ${state.name}, Nigeria`,
            levelNumber: 3,
            parentId: lgaId,
            sortOrder: ti,
            isActive: true,
          })
          .onConflictDoNothing({ target: [locationsTable.slug, locationsTable.countryId] })
          .returning({ id: locationsTable.id });
        if (result.length > 0) townsInserted++;
      }
    }
  }

  logDone("location-nigeria", statesInserted + lgasInserted + townsInserted);
  log(`States: ${statesInserted}, LGAs: ${lgasInserted}, Towns/Neighbourhoods: ${townsInserted}`);
}

withDb(seed).catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
