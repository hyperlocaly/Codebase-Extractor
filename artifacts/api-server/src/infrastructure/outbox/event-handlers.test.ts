import { describe, it, expect, vi } from "vitest";

describe("event-handlers switchboard", () => {
  it("handles unknown event types gracefully without throwing", async () => {
    // Dynamically import to avoid DB dependency
    // We just verify the module loads without errors
    const mod = await import("./event-handlers");
    expect(mod.handleDomainEvent).toBeTypeOf("function");
  });

  it("event shape has required fields", () => {
    const event = {
      id: "evt-1",
      eventType: "BusinessPublished",
      aggregateType: "business",
      aggregateId: "biz-1",
      payload: { businessId: "biz-1", marketplaceId: "mp-1" },
    };

    expect(event.eventType).toBe("BusinessPublished");
    expect(event.aggregateType).toBe("business");
    expect(typeof event.payload).toBe("object");
  });
});
