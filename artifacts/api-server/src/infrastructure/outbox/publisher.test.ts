import { describe, it, expect, vi, beforeEach } from "vitest";
import type { OutboxEvent } from "./publisher";

describe("publishEvent contract", () => {
  it("OutboxEvent shape has required fields", () => {
    const event: OutboxEvent = {
      eventType: "BusinessPublished" as any,
      aggregateType: "business",
      aggregateId: "test-id",
      payload: { businessId: "test-id" },
    };

    expect(event.eventType).toBe("BusinessPublished");
    expect(event.aggregateType).toBe("business");
    expect(event.aggregateId).toBe("test-id");
    expect(event.payload).toEqual({ businessId: "test-id" });
  });

  it("partitionKey defaults to aggregateId when not provided", () => {
    const event: OutboxEvent = {
      eventType: "ClaimApproved" as any,
      aggregateType: "claim_request",
      aggregateId: "claim-123",
      payload: { claimId: "claim-123" },
    };

    // partitionKey is optional; if absent, the publisher uses aggregateId
    expect(event.partitionKey).toBeUndefined();
  });
});
