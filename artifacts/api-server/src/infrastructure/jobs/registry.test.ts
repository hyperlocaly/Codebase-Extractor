import { describe, it, expect, beforeEach, vi } from "vitest";
import { registerJobHandler, getJobHandler, listRegisteredJobTypes } from "./registry";
import type { JobHandler } from "./registry";

describe("job registry", () => {
  beforeEach(() => {
    // The registry is a module-level Map, but we still use it per-test
    // to verify idempotency of registration.
  });

  it("registers and retrieves a handler", () => {
    const handler: JobHandler = vi.fn(async () => {});
    registerJobHandler("__test_job__", handler);
    expect(getJobHandler("__test_job__")).toBe(handler);
  });

  it("returns undefined for unregistered job type", () => {
    expect(getJobHandler("__nonexistent__")).toBeUndefined();
  });

  it("listRegisteredJobTypes includes registered types", () => {
    registerJobHandler("__test_job_2__", vi.fn(async () => {}));
    const types = listRegisteredJobTypes();
    expect(types).toContain("__test_job_2__");
  });

  it("overwrites existing handler on re-registration", () => {
    const handler1: JobHandler = vi.fn(async () => {});
    const handler2: JobHandler = vi.fn(async () => {});
    registerJobHandler("__overwrite_test__", handler1);
    registerJobHandler("__overwrite_test__", handler2);
    expect(getJobHandler("__overwrite_test__")).toBe(handler2);
  });
});
