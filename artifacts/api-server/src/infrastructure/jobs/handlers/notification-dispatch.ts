import { eq, and } from "drizzle-orm";
import type { Db } from "@workspace/db";
import { notificationsTable, usersTable } from "@workspace/db";
import type { BackgroundJob } from "@workspace/db";
import { logger } from "../../../lib/logger";
import { sendEmail } from "../../email/mailer";

export async function handleNotificationDispatch(job: BackgroundJob, db: Db): Promise<void> {
  const { notificationId } = job.payload as { notificationId?: string };

  if (notificationId) {
    const [notification] = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, notificationId));

    if (!notification) {
      logger.warn({ notificationId }, "Notification not found");
      return;
    }

    if (notification.status === "sent" || notification.status === "delivered") {
      return;
    }

    await dispatchNotification(db, notification);
    return;
  }

  // Batch-process all pending email notifications
  const pending = await db
    .select()
    .from(notificationsTable)
    .where(and(eq(notificationsTable.status, "pending"), eq(notificationsTable.channel, "email")))
    .limit(50);

  for (const notification of pending) {
    await dispatchNotification(db, notification);
  }
}

async function dispatchNotification(db: Db, notification: any): Promise<void> {
  try {
    await db
      .update(notificationsTable)
      .set({ attemptCount: notification.attemptCount + 1, lastAttemptAt: new Date() })
      .where(eq(notificationsTable.id, notification.id));

    if (notification.channel === "in_app") {
      await db
        .update(notificationsTable)
        .set({ status: "sent", sentAt: new Date() })
        .where(eq(notificationsTable.id, notification.id));
      logger.debug({ notificationId: notification.id }, "In-app notification sent");
      return;
    }

    if (notification.channel === "email") {
      // Fetch user email
      const [user] = await db
        .select({ email: usersTable.email, displayName: usersTable.displayName })
        .from(usersTable)
        .where(eq(usersTable.id, notification.userId));

      if (!user?.email) {
        logger.warn({ notificationId: notification.id }, "No user email found for notification");
        await db
          .update(notificationsTable)
          .set({ status: "failed", lastError: "No user email" })
          .where(eq(notificationsTable.id, notification.id));
        return;
      }

      const sent = await sendEmail({
        to: user.email,
        subject: notification.title,
        html: `<p>${notification.body}</p>`,
      });

      await db
        .update(notificationsTable)
        .set({ status: sent ? "sent" : "failed", sentAt: sent ? new Date() : null })
        .where(eq(notificationsTable.id, notification.id));

      logger.info({ notificationId: notification.id, to: user.email, sent }, "Email notification dispatched");
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error({ notificationId: notification.id, err: errMsg }, "Notification dispatch failed");

    await db
      .update(notificationsTable)
      .set({ status: "failed", lastError: errMsg })
      .where(eq(notificationsTable.id, notification.id));
  }
}
