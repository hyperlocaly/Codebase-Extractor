import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { mediaTable, businessesTable, businessOwnersTable } from "@workspace/db";
import { requireAuth } from "../../middleware/auth";
import { requireMarketplace } from "../../middleware/marketplace-context";
import { sendSuccess, sendCreated, sendNoContent } from "../../shared/response";
import { NotFoundError, ValidationError, ForbiddenError } from "../../shared/errors";
import { publishEvent } from "../../infrastructure/outbox/publisher";

const router: IRouter = Router({ mergeParams: true });

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "application/pdf",
];

const AttachMediaSchema = z.object({
  storageKey: z.string().min(1).max(500),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  fileSizeBytes: z.number().int().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationSeconds: z.number().int().positive().optional(),
  purpose: z.enum(["logo", "banner", "gallery", "document", "avatar"]).default("gallery"),
  sortOrder: z.number().int().min(0).default(0),
  isPrimary: z.boolean().default(false),
});

async function assertBusinessOwner(businessId: string, userId: string, marketplaceId: string) {
  const [biz] = await db
    .select({ id: businessesTable.id })
    .from(businessesTable)
    .where(and(eq(businessesTable.id, businessId), eq(businessesTable.marketplaceId, marketplaceId)));
  if (!biz) throw new NotFoundError("Business", businessId);

  const [owner] = await db
    .select({ id: businessOwnersTable.id })
    .from(businessOwnersTable)
    .where(
      and(
        eq(businessOwnersTable.businessId, businessId),
        eq(businessOwnersTable.userId, userId),
        eq(businessOwnersTable.isActive, true),
      ),
    );
  if (!owner) throw new ForbiddenError("Not an owner of this business");
}

// GET /api/v1/businesses/:businessId/media
router.get("/", requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const { purpose } = req.query as { purpose?: string };
    const marketplace = req.marketplace!;

    const conditions: any[] = [
      eq(mediaTable.entityType, "business"),
      eq(mediaTable.entityId, businessId),
      eq(mediaTable.marketplaceId, marketplace.id),
      eq(mediaTable.status, "active"),
    ];
    if (purpose) conditions.push(eq(mediaTable.purpose, purpose));

    const rows = await db
      .select()
      .from(mediaTable)
      .where(and(...conditions))
      .orderBy(mediaTable.sortOrder, desc(mediaTable.createdAt));

    sendSuccess(res, rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/businesses/:businessId/media
// Accepts pre-uploaded storage key + metadata (client handles upload to storage directly)
router.post("/", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const marketplace = req.marketplace!;
    const user = req.user!;

    await assertBusinessOwner(businessId, user.id, marketplace.id);

    const body = AttachMediaSchema.safeParse(req.body);
    if (!body.success) return next(new ValidationError("Invalid input", body.error.flatten()));

    if (!ALLOWED_MIME_TYPES.includes(body.data.mimeType)) {
      return next(new ValidationError(`Unsupported mime type: ${body.data.mimeType}`));
    }

    // If setting as primary logo, unset previous primary for same purpose
    if (body.data.isPrimary) {
      await db
        .update(mediaTable)
        .set({ isPrimary: false })
        .where(
          and(
            eq(mediaTable.entityType, "business"),
            eq(mediaTable.entityId, businessId),
            eq(mediaTable.purpose, body.data.purpose),
            eq(mediaTable.isPrimary, true),
          ),
        );
    }

    const [media] = await db
      .insert(mediaTable)
      .values({
        entityType: "business",
        entityId: businessId,
        marketplaceId: marketplace.id,
        storageProvider: "s3",
        storageKey: body.data.storageKey,
        fileName: body.data.fileName,
        mimeType: body.data.mimeType,
        fileSizeBytes: body.data.fileSizeBytes ?? null,
        width: body.data.width ?? null,
        height: body.data.height ?? null,
        durationSeconds: body.data.durationSeconds ?? null,
        purpose: body.data.purpose,
        sortOrder: body.data.sortOrder,
        isPrimary: body.data.isPrimary,
        uploadedBy: user.id,
        status: "active",
      })
      .returning();

    await publishEvent(db, {
      eventType: "MediaUploaded",
      aggregateType: "business",
      aggregateId: businessId,
      payload: { mediaId: media!.id, businessId, purpose: body.data.purpose, uploadedBy: user.id },
    });

    sendCreated(res, media);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/businesses/:businessId/media/:mediaId
router.delete("/:mediaId", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const mediaId = String(req.params["mediaId"]);
    const marketplace = req.marketplace!;
    const user = req.user!;

    await assertBusinessOwner(businessId, user.id, marketplace.id);

    const [media] = await db
      .select({ id: mediaTable.id })
      .from(mediaTable)
      .where(
        and(
          eq(mediaTable.id, mediaId),
          eq(mediaTable.entityType, "business"),
          eq(mediaTable.entityId, businessId),
        ),
      );
    if (!media) return next(new NotFoundError("Media", mediaId));

    await db
      .update(mediaTable)
      .set({ status: "deleted", updatedAt: new Date() })
      .where(eq(mediaTable.id, mediaId));

    await publishEvent(db, {
      eventType: "MediaDeleted",
      aggregateType: "business",
      aggregateId: businessId,
      payload: { mediaId, businessId, deletedBy: user.id },
    });

    sendNoContent(res);
  } catch (err) {
    next(err);
  }
});

// Presigned URL endpoint (returns a token/key for client-side upload)
// In production this would call AWS S3 presignedPutObject; here we return a placeholder key
router.post("/presign", requireAuth, requireMarketplace, async (req, res, next): Promise<void> => {
  try {
    const businessId = String(req.params["businessId"]);
    const marketplace = req.marketplace!;
    const user = req.user!;

    await assertBusinessOwner(businessId, user.id, marketplace.id);

    const { fileName, mimeType, purpose } = z
      .object({
        fileName: z.string().min(1).max(255),
        mimeType: z.string().min(1),
        purpose: z.enum(["logo", "banner", "gallery", "document", "avatar"]).default("gallery"),
      })
      .parse(req.body);

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return next(new ValidationError(`Unsupported mime type: ${mimeType}`));
    }

    const ext = fileName.split(".").pop() ?? "bin";
    const storageKey = `${marketplace.id}/${businessId}/${purpose}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // In production: generate real presigned URL from S3/GCS/R2
    sendSuccess(res, {
      uploadUrl: `https://storage.example.com/upload?key=${encodeURIComponent(storageKey)}`,
      storageKey,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
