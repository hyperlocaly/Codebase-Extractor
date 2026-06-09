import { Router, type IRouter } from "express";
import authRouter from "./auth";
import marketplacesRouter from "./marketplaces";
import marketplaceConfigRouter from "./marketplace-config";
import categoriesRouter from "./categories";
import locationsRouter from "./locations";
import locationsSearchRouter from "./locations-search";
import businessesRouter from "./businesses";
import businessHoursRouter from "./business-hours";
import businessContactsRouter from "./business-contacts";
import businessBranchesRouter from "./business-branches";
import businessServiceAreasRouter from "./business-service-areas";
import businessUpdatesRouter from "./business-updates";
import productsRouter from "./products";
import servicesRouter from "./services";
import portfolioRouter from "./portfolio";
import mediaRouter from "./media";
import verificationRouter from "./verification";
import reviewsRouter from "./reviews";
import savedItemsRouter from "./saved-items";
import searchRouter from "./search";
import notificationsRouter from "./notifications";
import templatesRouter from "./templates";
import engagementRouter from "./engagement";
import claimRequestsRouter from "./claim-requests";
import adminRouter from "./admin";

const router: IRouter = Router();

// Auth
router.use("/auth", authRouter);

// Marketplaces
router.use("/marketplaces", marketplacesRouter);
router.use("/marketplaces", marketplaceConfigRouter);

// Categories
router.use("/categories", categoriesRouter);

// Locations (search must be mounted before :slug to avoid conflict)
router.use("/locations/search", locationsSearchRouter);
router.use("/locations", locationsRouter);

// Templates (location + category)
router.use("/templates", templatesRouter);

// Businesses + sub-resources
router.use("/businesses", businessesRouter);
router.use("/businesses/:businessId/hours", businessHoursRouter);
router.use("/businesses/:businessId/contacts", businessContactsRouter);
router.use("/businesses/:businessId/branches", businessBranchesRouter);
router.use("/businesses/:businessId/service-areas", businessServiceAreasRouter);
router.use("/businesses/:businessId/updates", businessUpdatesRouter);
router.use("/businesses/:businessId/products", productsRouter);
router.use("/businesses/:businessId/services", servicesRouter);
router.use("/businesses/:businessId/portfolio", portfolioRouter);
router.use("/businesses/:businessId/media", mediaRouter);
router.use("/businesses/:businessId/verifications", verificationRouter);

// Search (multi-entity)
router.use("/search", searchRouter);

// Trust & Engagement
router.use("/reviews", reviewsRouter);
router.use("/saved-items", savedItemsRouter);
router.use("/engagement", engagementRouter);

// Notifications
router.use("/notifications", notificationsRouter);

// Claims
router.use("/claim-requests", claimRequestsRouter);

// Admin (protected with RBAC inside)
router.use("/admin", adminRouter);

export default router;
