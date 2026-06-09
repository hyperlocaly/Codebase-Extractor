import {
  pgTable,
  text,
  varchar,
  char,
  boolean,
  uuid,
  smallint,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const currenciesTable = pgTable(
  "currencies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 3 }).notNull(),
    name: text("name").notNull(),
    symbol: varchar("symbol", { length: 10 }).notNull(),
    decimalPlaces: smallint("decimal_places").notNull().default(2),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("currencies_code_idx").on(t.code)],
);

export const countriesTable = pgTable(
  "countries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    isoCode: char("iso_code", { length: 2 }).notNull(),
    name: text("name").notNull(),
    defaultCurrencyId: uuid("default_currency_id")
      .notNull()
      .references(() => currenciesTable.id),
    phoneCode: varchar("phone_code", { length: 10 }).notNull(),
    timezone: text("timezone").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("countries_iso_code_idx").on(t.isoCode),
    index("countries_is_active_idx").on(t.isActive),
  ],
);

export const locationLevelDefinitionsTable = pgTable(
  "location_level_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryId: uuid("country_id")
      .notNull()
      .references(() => countriesTable.id),
    levelNumber: smallint("level_number").notNull(),
    label: varchar("label", { length: 60 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("location_level_defs_country_level_idx").on(t.countryId, t.levelNumber),
  ],
);

export type Currency = typeof currenciesTable.$inferSelect;
export type InsertCurrency = typeof currenciesTable.$inferInsert;

export type Country = typeof countriesTable.$inferSelect;
export type InsertCountry = typeof countriesTable.$inferInsert;

export type LocationLevelDefinition = typeof locationLevelDefinitionsTable.$inferSelect;
export type InsertLocationLevelDefinition = typeof locationLevelDefinitionsTable.$inferInsert;
