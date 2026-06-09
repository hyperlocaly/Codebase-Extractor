import { Router, type IRouter } from "express";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db";
import { sendSuccess } from "../../shared/response";
import { NotFoundError } from "../../shared/errors";

const router: IRouter = Router();

router.get("/", async (req, res, next): Promise<void> => {
  try {
    const parentSlug = req.query["parent"] as string | undefined;

    let parentId: string | null = null;
    if (parentSlug) {
      const [parent] = await db
        .select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(and(eq(categoriesTable.slug, parentSlug), eq(categoriesTable.isActive, true)));
      if (!parent) return next(new NotFoundError("Category", parentSlug));
      parentId = parent.id;
    }

    const rows = await db
      .select({
        id: categoriesTable.id,
        parentId: categoriesTable.parentId,
        name: categoriesTable.name,
        slug: categoriesTable.slug,
        description: categoriesTable.description,
        iconUrl: categoriesTable.iconUrl,
        depth: categoriesTable.depth,
        sortOrder: categoriesTable.sortOrder,
      })
      .from(categoriesTable)
      .where(
        and(
          parentId !== null
            ? eq(categoriesTable.parentId, parentId)
            : isNull(categoriesTable.parentId),
          eq(categoriesTable.isActive, true),
        ),
      )
      .orderBy(categoriesTable.sortOrder, categoriesTable.name);

    sendSuccess(res, rows);
  } catch (err) {
    next(err);
  }
});

router.get("/:slug", async (req, res, next): Promise<void> => {
  try {
    const { slug } = req.params;

    const [category] = await db
      .select({
        id: categoriesTable.id,
        parentId: categoriesTable.parentId,
        name: categoriesTable.name,
        slug: categoriesTable.slug,
        description: categoriesTable.description,
        iconUrl: categoriesTable.iconUrl,
        depth: categoriesTable.depth,
        sortOrder: categoriesTable.sortOrder,
      })
      .from(categoriesTable)
      .where(and(eq(categoriesTable.slug, slug), eq(categoriesTable.isActive, true)));

    if (!category) return next(new NotFoundError("Category", slug));

    const children = await db
      .select({
        id: categoriesTable.id,
        name: categoriesTable.name,
        slug: categoriesTable.slug,
        description: categoriesTable.description,
        iconUrl: categoriesTable.iconUrl,
        depth: categoriesTable.depth,
        sortOrder: categoriesTable.sortOrder,
      })
      .from(categoriesTable)
      .where(
        and(
          eq(categoriesTable.parentId, category.id),
          eq(categoriesTable.isActive, true),
        ),
      )
      .orderBy(categoriesTable.sortOrder, categoriesTable.name);

    sendSuccess(res, { ...category, children });
  } catch (err) {
    next(err);
  }
});

export default router;
