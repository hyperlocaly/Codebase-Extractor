import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  verificationTypesTable,
  verificationRecordsTable,
  verificationWorkflowsTable,
  businessesTable,
} from "@workspace/db";
import { requireAuth } from "../../middleware/auth";
import { requireMarketplace } from "../../middleware/marketplace-context";
import { requirePermission } from "../../middleware/rbac";
import { sendSuccess, sendCreated } from "../../shared/response";
import { NotFoundError, ValidationError } from "../../shared/errors";
import { publishEvent } from "../../infrastructure/outbox/publisher";
import { enqueueJob } from "../../infrastructure/jobs/worker";
import { JOB_TYPES } from "../../infrastructure/jobs/handlers";

const router: IRouter = Router({ mergeParams: true });

// GET /api/v1/businesses/:businessId/verifications
router.get("/", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const marketplace = req.marketplace!;

    const [biz] = await db
      .select({ id: businessesTable.id })
      .from(businessesTable)
      .where(and(eq(businessesTable.id, businessId), eq(businessesTable.marketplaceId, marketplace.id)));
    if (!biz) return next(new NotFoundError("Business", businessId));

    const records = await db
      .select({
        id: verificationRecordsTable.id,
        status: verificationRecordsTable.status,
        verifiedAt: verificationRecordsTable.verifiedAt,
        expiresAt: verificationRecordsTable.expiresAt,
        evidenceUrl: verificationRecordsTable.evidenceUrl,
        createdAt: verificationRecordsTable.createdAt,
        updatedAt: verificationRecordsTable.updatedAt,
        verificationType: {
          id: verificationTypesTable.id,
          code: verificationTypesTable.code,
          name: verificationTypesTable.name,
          description: verificationTypesTable.description,
          weight: verificationTypesTable.weight,
        },
      })
      .from(verificationRecordsTable)
      .innerJoin(verificationTypesTable, eq(verificationRecordsTable.verificationTypeId, verificationTypesTable.id))
      .where(eq(verificationRecordsTable.businessId, businessId))
      .orderBy(desc(verificationRecordsTable.createdAt));

    sendSuccess(res, records);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/verification-types?marketplace=
router.get(
  "/types",
  requireAuth,
  requireMarketplace,
  requirePermission("verification:manage"),
  async (req, res, next): Promise<void> => {
    try {
      const marketplace = req.marketplace!;

      const types = await db
        .select()
        .from(verificationTypesTable)
        .where(eq(verificationTypesTable.marketplaceId, marketplace.id))
        .orderBy(verificationTypesTable.sortOrder);

      sendSuccess(res, types);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/businesses/:businessId/verifications — admin initiates verification
router.post(
  "/",
  requireAuth,
  requireMarketplace,
  requirePermission("verification:manage"),
  async (req, res, next): Promise<void> => {
    try {
      const businessId = String(req.params["businessId"]);
      const marketplace = req.marketplace!;
      const user = req.user!;

      const body = z
        .object({
          verificationTypeId: z.string().uuid(),
          evidenceUrl: z.url().optional(),
          notes: z.string().max(1000).optional(),
        })
        .parse(req.body);

      const [biz] = await db
        .select({ id: businessesTable.id })
        .from(businessesTable)
        .where(and(eq(businessesTable.id, businessId), eq(businessesTable.marketplaceId, marketplace.id)));
      if (!biz) return next(new NotFoundError("Business", businessId));

      const [vtype] = await db
        .select({ id: verificationTypesTable.id })
        .from(verificationTypesTable)
        .where(eq(verificationTypesTable.id, body.verificationTypeId));
      if (!vtype) return next(new NotFoundError("Verification type", body.verificationTypeId));

      const [record] = await db
        .insert(verificationRecordsTable)
        .values({
          businessId,
          verificationTypeId: body.verificationTypeId,
          status: "pending",
          evidenceUrl: body.evidenceUrl ?? null,
          verifierUserId: user.id,
        })
        .onConflictDoUpdate({
          target: [verificationRecordsTable.businessId, verificationRecordsTable.verificationTypeId],
          set: {
            status: "pending",
            evidenceUrl: body.evidenceUrl ?? null,
            verifierUserId: user.id,
            updatedAt: new Date(),
          },
        })
        .returning();

      await db.insert(verificationWorkflowsTable).values({
        verificationRecordId: record!.id,
        action: "initiated",
        actorId: user.id,
        notes: body.notes ?? null,
      });

      await publishEvent(db, {
        eventType: "VerificationStarted",
        aggregateType: "verification_record",
        aggregateId: record!.id,
        payload: { recordId: record!.id, businessId, verificationTypeId: body.verificationTypeId, actorId: user.id },
      });

      sendCreated(res, record);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/v1/businesses/:businessId/verifications/:recordId — approve / reject
router.patch(
  "/:recordId",
  requireAuth,
  requireMarketplace,
  requirePermission("verification:manage"),
  async (req, res, next): Promise<void> => {
    try {
      const businessId = String(req.params["businessId"]);
      const recordId = String(req.params["recordId"]);
      const user = req.user!;

      const body = z
        .object({
          status: z.enum(["verified", "failed", "pending"]),
          notes: z.string().max(1000).optional(),
          expiresAt: z.string().datetime().optional(),
        })
        .parse(req.body);

      const [record] = await db
        .select({ id: verificationRecordsTable.id })
        .from(verificationRecordsTable)
        .where(and(eq(verificationRecordsTable.id, recordId), eq(verificationRecordsTable.businessId, businessId)));
      if (!record) return next(new NotFoundError("Verification record", recordId));

      const updateData: Record<string, unknown> = {
        status: body.status,
        updatedAt: new Date(),
      };
      if (body.status === "verified") {
        updateData["verifiedAt"] = new Date();
        updateData["verifierUserId"] = user.id;
        if (body.expiresAt) updateData["expiresAt"] = new Date(body.expiresAt);
      }

      const [updated] = await db
        .update(verificationRecordsTable)
        .set(updateData as any)
        .where(eq(verificationRecordsTable.id, recordId))
        .returning();

      await db.insert(verificationWorkflowsTable).values({
        verificationRecordId: recordId,
        action: body.status === "verified" ? "approved" : body.status === "failed" ? "rejected" : "updated",
        actorId: user.id,
        notes: body.notes ?? null,
      });

      await publishEvent(db, {
        eventType: "VerificationUpdated",
        aggregateType: "verification_record",
        aggregateId: recordId,
        payload: { recordId, businessId, status: body.status, actorId: user.id },
      });

      // Trigger score recalculation when verification changes
      if (body.status === "verified" || body.status === "failed") {
        await enqueueJob(JOB_TYPES.SCORE_RECALCULATION, { businessId }, { priority: 7 });
      }

      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
