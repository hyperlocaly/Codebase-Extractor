/**
 * Event-driven notification and side-effect handlers.
 * Called by the outbox worker for each published event.
 */
import { db } from "@workspace/db";
import {
  notificationsTable,
  businessesTable,
  businessOwnersTable,
  usersTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../../lib/logger";
import { enqueueJob } from "../jobs/worker";
import { JOB_TYPES } from "../jobs/handlers";
import type { EventType } from "@workspace/domain-constants";

type DomainEvent = {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
};

async function getBusinessOwnerUserIds(businessId: string): Promise<string[]> {
  const owners = await db
    .select({ userId: businessOwnersTable.userId })
    .from(businessOwnersTable)
    .where(and(eq(businessOwnersTable.businessId, businessId), eq(businessOwnersTable.isActive, true)));
  return owners.map((o) => o.userId);
}

async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  entityType?: string,
  entityId?: string,
  actionUrl?: string,
): Promise<void> {
  try {
    // Use RETURNING to get the exact inserted row's id — avoids a separate
    // SELECT that previously ordered ASC (oldest-first) and dispatched the
    // wrong notification when a user had existing notifications.
    const [notification] = await db
      .insert(notificationsTable)
      .values({
        userId,
        type,
        title,
        body,
        channel: "in_app",
        status: "pending",
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        actionUrl: actionUrl ?? null,
      })
      .returning({ id: notificationsTable.id });

    if (notification) {
      await enqueueJob(JOB_TYPES.NOTIFICATION_DISPATCH, { notificationId: notification.id }, { priority: 6 });
    }
  } catch (err) {
    logger.error({ userId, type, err }, "Failed to create notification");
  }
}

async function getBusinessName(businessId: string): Promise<string> {
  const [biz] = await db
    .select({ name: businessesTable.name })
    .from(businessesTable)
    .where(eq(businessesTable.id, businessId));
  return biz?.name ?? "your business";
}

export async function handleDomainEvent(event: DomainEvent): Promise<void> {
  const { eventType, payload } = event;

  try {
    switch (eventType) {
      case "ClaimApproved": {
        const { businessId, userId } = payload as { businessId: string; userId: string };
        const bizName = await getBusinessName(businessId);
        await createNotification(
          userId,
          "claim_approved",
          "Claim Approved!",
          `Your claim for "${bizName}" has been approved. You can now manage this listing.`,
          "business",
          businessId,
          `/businesses/${businessId}`,
        );
        break;
      }

      case "ClaimRejected": {
        const { businessId, userId, reason } = payload as { businessId: string; userId: string; reason?: string };
        const bizName = await getBusinessName(businessId);
        await createNotification(
          userId,
          "claim_rejected",
          "Claim Not Approved",
          `Your claim for "${bizName}" was not approved.${reason ? ` Reason: ${reason}` : ""}`,
          "business",
          businessId,
        );
        break;
      }

      case "ReviewModerated": {
        const { reviewId, businessId, reviewerId, action } = payload as {
          reviewId: string;
          businessId: string;
          reviewerId?: string;
          action: string;
        };
        if (reviewerId) {
          const bizName = await getBusinessName(businessId);
          await createNotification(
            reviewerId,
            "review_moderated",
            "Review Update",
            `Your review for "${bizName}" has been ${action}.`,
            "review",
            reviewId,
          );
        }
        break;
      }

      case "BusinessPublished": {
        const { businessId, marketplaceId } = payload as { businessId: string; marketplaceId: string };
        const ownerIds = await getBusinessOwnerUserIds(businessId);
        const bizName = await getBusinessName(businessId);
        for (const userId of ownerIds) {
          await createNotification(
            userId,
            "business_published",
            "Business Published",
            `"${bizName}" is now live and visible to customers.`,
            "business",
            businessId,
          );
        }
        // Enqueue search sync
        await enqueueJob(JOB_TYPES.SEARCH_SYNC, { entityType: "business", entityId: businessId, marketplaceId, operation: "upsert" }, { priority: 8 });
        break;
      }

      case "BusinessSuspended": {
        const { businessId, marketplaceId } = payload as { businessId: string; marketplaceId: string };
        const ownerIds = await getBusinessOwnerUserIds(businessId);
        const bizName = await getBusinessName(businessId);
        for (const userId of ownerIds) {
          await createNotification(
            userId,
            "business_suspended",
            "Business Suspended",
            `"${bizName}" has been suspended and is no longer visible to customers.`,
            "business",
            businessId,
          );
        }
        await enqueueJob(JOB_TYPES.SEARCH_SYNC, { entityType: "business", entityId: businessId, marketplaceId, operation: "delete" }, { priority: 8 });
        break;
      }

      case "VerificationUpdated": {
        const { businessId, status } = payload as { businessId: string; status: string };
        const ownerIds = await getBusinessOwnerUserIds(businessId);
        const bizName = await getBusinessName(businessId);
        for (const userId of ownerIds) {
          await createNotification(
            userId,
            "verification_updated",
            "Verification Status Updated",
            `The verification status for "${bizName}" is now: ${status}.`,
            "business",
            businessId,
          );
        }
        break;
      }

      case "VerificationStarted": {
        const { businessId } = payload as { businessId: string };
        const ownerIds = await getBusinessOwnerUserIds(businessId);
        const bizName = await getBusinessName(businessId);
        for (const userId of ownerIds) {
          await createNotification(
            userId,
            "verification_started",
            "Verification Started",
            `A verification process has been initiated for "${bizName}".`,
            "business",
            businessId,
          );
        }
        break;
      }

      case "ReviewCreated": {
        const { businessId, rating } = payload as { businessId: string; rating?: number };
        const ownerIds = await getBusinessOwnerUserIds(businessId);
        const bizName = await getBusinessName(businessId);
        for (const userId of ownerIds) {
          await createNotification(
            userId,
            "new_review",
            "New Review",
            `"${bizName}" received a new ${rating ? `${rating}-star ` : ""}review.`,
            "business",
            businessId,
          );
        }
        break;
      }

      case "UserRegistered": {
        const { userId, displayName } = payload as { userId: string; email: string; displayName: string };
        await createNotification(
          userId,
          "welcome",
          "Welcome to Fashion Nigeria!",
          `Hi ${displayName}, your account is ready. Start by browsing listings or adding your business.`,
          "user",
          userId,
          "/dashboard",
        );
        break;
      }

      case "ClaimSubmitted": {
        // No user notification needed — admin is notified via analytics/dashboard
        break;
      }

      default:
        // No handler for this event type — that's fine
        break;
    }
  } catch (err) {
    logger.error({ eventType, eventId: event.id, err }, "Event handler error");
  }
}
