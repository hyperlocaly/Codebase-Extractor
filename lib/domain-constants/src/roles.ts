export const ROLE_CODES = [
  "superadmin",
  "platform_ops",
  "marketplace_admin",
  "marketplace_moderator",
  "marketplace_analyst",
  "business_owner",
  "business_manager",
  "business_staff",
  "consumer",
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

export const ENGAGEMENT_EVENT_TYPES = [
  "profile_view",
  "whatsapp_click",
  "call_click",
  "email_click",
  "website_click",
  "directions_click",
  "share",
  "product_view",
  "service_view",
  "portfolio_view",
  "update_view",
  "search_click",
  "search_impression",
] as const;

export type EngagementEventType = (typeof ENGAGEMENT_EVENT_TYPES)[number];

export const BUSINESS_STATUSES = ["draft", "active", "suspended", "archived"] as const;
export type BusinessStatus = (typeof BUSINESS_STATUSES)[number];

export const CLAIM_STATUSES = ["unclaimed", "pending", "claimed"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const VERIFICATION_STATUSES = ["pending", "verified", "expired", "failed"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const MODERATION_STATUSES = ["pending", "approved", "rejected", "hidden", "auto_approved"] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export const NOTIFICATION_CHANNELS = ["in_app", "email", "sms", "push"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_STATUSES = ["pending", "sent", "failed", "delivered"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const OUTBOX_STATUSES = ["pending", "processing", "published", "failed"] as const;
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

export const JOB_STATUSES = ["pending", "running", "done", "failed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const MEDIA_PURPOSES = ["logo", "banner", "gallery", "document", "avatar"] as const;
export type MediaPurpose = (typeof MEDIA_PURPOSES)[number];

export const MEDIA_STATUSES = ["pending", "active", "deleted"] as const;
export type MediaStatus = (typeof MEDIA_STATUSES)[number];

export const AUTH_PROVIDERS = ["password", "google", "apple", "facebook"] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

export const USER_STATUSES = ["active", "suspended", "deleted"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const MARKETPLACE_STATUSES = ["draft", "active", "suspended", "archived"] as const;
export type MarketplaceStatus = (typeof MARKETPLACE_STATUSES)[number];

export const REVIEW_STATUSES = ["pending", "approved", "rejected", "hidden"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const SEARCH_SYNC_OPERATIONS = ["upsert", "delete"] as const;
export type SearchSyncOperation = (typeof SEARCH_SYNC_OPERATIONS)[number];

export const BUSINESS_UPDATE_TYPES = ["news", "offer", "event", "announcement"] as const;
export type BusinessUpdateType = (typeof BUSINESS_UPDATE_TYPES)[number];
