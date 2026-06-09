import { db } from "@workspace/db";
import { eventTypeRegistryTable } from "@workspace/db";
import { EVENT_TYPES } from "@workspace/domain-constants";
import { withDb, log, logDone } from "./seed-utils";

const EVENT_AGGREGATE_MAP: Record<string, { aggregateType: string; description: string }> = {
  BusinessCreated:           { aggregateType: "business",      description: "Business entity created" },
  BusinessPublished:         { aggregateType: "business",      description: "Business published and visible" },
  BusinessUpdated:           { aggregateType: "business",      description: "Business profile updated" },
  BusinessSuspended:         { aggregateType: "business",      description: "Business suspended by admin" },
  BusinessDeleted:           { aggregateType: "business",      description: "Business soft-deleted" },
  BusinessTypeAssigned:      { aggregateType: "business",      description: "Category assigned to business" },
  ClaimRequestSubmitted:     { aggregateType: "claim_request", description: "Business claim submitted" },
  ClaimApproved:             { aggregateType: "claim_request", description: "Business claim approved" },
  ClaimRejected:             { aggregateType: "claim_request", description: "Business claim rejected" },
  VerificationStarted:       { aggregateType: "verification",  description: "Verification process started" },
  VerificationUpdated:       { aggregateType: "verification",  description: "Verification record updated" },
  VerificationExpired:       { aggregateType: "verification",  description: "Verification record expired" },
  BusinessScoreRecalculated: { aggregateType: "business",      description: "Business score recalculated" },
  ProductCreated:            { aggregateType: "product",       description: "Product created" },
  ProductUpdated:            { aggregateType: "product",       description: "Product updated" },
  ProductDeleted:            { aggregateType: "product",       description: "Product deleted" },
  ServiceCreated:            { aggregateType: "service",       description: "Service created" },
  ServiceUpdated:            { aggregateType: "service",       description: "Service updated" },
  ServiceDeleted:            { aggregateType: "service",       description: "Service deleted" },
  PortfolioPublished:        { aggregateType: "portfolio",     description: "Portfolio published" },
  PortfolioDeleted:          { aggregateType: "portfolio",     description: "Portfolio deleted" },
  UpdatePublished:           { aggregateType: "business_update", description: "Business update published" },
  UpdateDeleted:             { aggregateType: "business_update", description: "Business update deleted" },
  MediaUploaded:             { aggregateType: "media",         description: "Media file uploaded" },
  MediaDeleted:              { aggregateType: "media",         description: "Media file deleted" },
  ReviewSubmitted:           { aggregateType: "review",        description: "Review submitted by user" },
  ReviewModerated:           { aggregateType: "review",        description: "Review moderated by admin" },
  FeedbackSubmitted:         { aggregateType: "feedback",      description: "Feedback submitted" },
  EngagementEventFired:      { aggregateType: "engagement",    description: "Engagement event recorded" },
  SavedItemAdded:            { aggregateType: "saved_item",    description: "Item saved by user" },
  SavedItemRemoved:          { aggregateType: "saved_item",    description: "Saved item removed" },
  UserRegistered:            { aggregateType: "user",          description: "User registered" },
  UserEmailVerified:         { aggregateType: "user",          description: "User email verified" },
  UserPasswordChanged:       { aggregateType: "user",          description: "User password changed" },
  UserSuspended:             { aggregateType: "user",          description: "User suspended" },
  NotificationCreated:       { aggregateType: "notification",  description: "Notification created" },
  BusinessRoleGranted:       { aggregateType: "business",      description: "Business role granted to user" },
  BusinessRoleRevoked:       { aggregateType: "business",      description: "Business role revoked from user" },
};

async function seed() {
  log("Seeding event type registry…");
  let inserted = 0;
  let skipped = 0;

  for (const eventType of EVENT_TYPES) {
    const meta = EVENT_AGGREGATE_MAP[eventType] ?? {
      aggregateType: "unknown",
      description: eventType,
    };

    const result = await db
      .insert(eventTypeRegistryTable)
      .values({
        eventType,
        aggregateType: meta.aggregateType,
        description: meta.description,
        schemaVersion: 1,
        isActive: true,
      })
      .onConflictDoNothing({ target: eventTypeRegistryTable.eventType })
      .returning({ id: eventTypeRegistryTable.id });

    if (result.length > 0) inserted++;
    else skipped++;
  }

  logDone("event-types", inserted, skipped);
}

withDb(seed).catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
