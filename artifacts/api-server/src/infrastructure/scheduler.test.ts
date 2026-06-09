import { describe, it, expect } from "vitest";

describe("Scheduler module shape", () => {
  it("exports startScheduler and stopScheduler", async () => {
    const mod = await import("./scheduler");
    expect(typeof mod.startScheduler).toBe("function");
    expect(typeof mod.stopScheduler).toBe("function");
  });
});
