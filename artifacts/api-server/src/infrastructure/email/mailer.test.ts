import { describe, it, expect } from "vitest";
import { emailTemplates } from "./mailer";

describe("emailTemplates", () => {
  it("verificationCode generates subject and html with code", () => {
    const { subject, html } = emailTemplates.verificationCode("123456", 15);
    expect(subject).toContain("Verify");
    expect(html).toContain("123456");
    expect(html).toContain("15");
  });

  it("claimApproved generates correct subject", () => {
    const { subject, html } = emailTemplates.claimApproved("Test Tailor");
    expect(subject).toContain("Test Tailor");
    expect(html).toContain("approved");
  });

  it("claimRejected includes reason if provided", () => {
    const { html } = emailTemplates.claimRejected("Test Tailor", "Insufficient evidence");
    expect(html).toContain("Insufficient evidence");
  });

  it("claimRejected omits reason block if not provided", () => {
    const { html } = emailTemplates.claimRejected("Test Tailor");
    expect(html).not.toContain("Reason:");
  });

  it("verificationStatusChanged includes status", () => {
    const { html } = emailTemplates.verificationStatusChanged("My Biz", "verified");
    expect(html).toContain("verified");
    expect(html).toContain("My Biz");
  });
});
