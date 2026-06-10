import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and, isNull, gt } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  userAuthProvidersTable,
  userSessionsTable,
  emailVerificationTokensTable,
  passwordResetTokensTable,
} from "@workspace/db";
import {
  signToken,
  hashPassword,
  comparePassword,
  requireAuth,
} from "../../middleware/auth";
import { sendSuccess, sendCreated } from "../../shared/response";
import {
  ValidationError,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from "../../shared/errors";
import { config } from "../../config";
import { randomBytes, createHash } from "crypto";
import { sendEmail, emailTemplates } from "../../infrastructure/email/mailer";
import { publishEvent } from "../../infrastructure/outbox/publisher";

const router: IRouter = Router();

const RegisterSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters").max(80),
  phone: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function generateToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  return { raw, hash: sha256(raw) };
}

router.post("/register", async (req, res, next): Promise<void> => {
  try {
    const body = RegisterSchema.safeParse(req.body);
    if (!body.success) {
      return next(new ValidationError("Invalid input", body.error.flatten()));
    }

    const { email, password, displayName, phone } = body.data;
    const normalizedEmail = email.toLowerCase().trim();

    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.email, normalizedEmail), isNull(usersTable.deletedAt)));

    if (existing) {
      return next(new ConflictError("An account with this email already exists"));
    }

    const passwordHash = await hashPassword(password);

    const [user] = await db
      .insert(usersTable)
      .values({
        email: normalizedEmail,
        displayName,
        phone: phone ?? null,
        status: "active",
      })
      .returning({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        status: usersTable.status,
      });

    await db.insert(userAuthProvidersTable).values({
      userId: user!.id,
      provider: "local",
      passwordHash,
    });

    const { raw: emailToken } = generateToken();
    const emailTokenHash = sha256(emailToken);
    const emailTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.insert(emailVerificationTokensTable).values({
      userId: user!.id,
      tokenHash: emailTokenHash,
      expiresAt: emailTokenExpiry,
    });

    sendEmail({
      to: normalizedEmail,
      ...emailTemplates.verificationCode(emailToken, 24 * 60),
    }).catch(() => {});

    const accessToken = await signToken({ userId: user!.id });
    const sessionExpiry = new Date(Date.now() + config.auth.tokenExpiryMs);
    const tokenHash = sha256(accessToken);

    await db.insert(userSessionsTable).values({
      userId: user!.id,
      tokenHash,
      expiresAt: sessionExpiry,
    });

    await publishEvent(db, {
      eventType: "UserRegistered",
      aggregateType: "user",
      aggregateId: user!.id,
      payload: { userId: user!.id, email: user!.email, displayName: user!.displayName },
    });

    res.setHeader("X-Email-Verification-Required", "true");
    sendCreated(res, {
      user: {
        id: user!.id,
        email: user!.email,
        displayName: user!.displayName,
        status: user!.status,
        emailVerified: false,
      },
      accessToken,
      expiresAt: sessionExpiry.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next): Promise<void> => {
  try {
    const body = LoginSchema.safeParse(req.body);
    if (!body.success) {
      return next(new ValidationError("Invalid input", body.error.flatten()));
    }

    const { email, password } = body.data;
    const normalizedEmail = email.toLowerCase().trim();

    const [user] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        status: usersTable.status,
        emailVerifiedAt: usersTable.emailVerifiedAt,
      })
      .from(usersTable)
      .where(and(eq(usersTable.email, normalizedEmail), isNull(usersTable.deletedAt)));

    if (!user) {
      return next(new UnauthorizedError("Invalid email or password"));
    }

    if (user.status === "suspended") {
      return next(new UnauthorizedError("This account has been suspended"));
    }

    const [authProvider] = await db
      .select({ passwordHash: userAuthProvidersTable.passwordHash })
      .from(userAuthProvidersTable)
      .where(
        and(
          eq(userAuthProvidersTable.userId, user.id),
          eq(userAuthProvidersTable.provider, "local"),
        ),
      );

    if (!authProvider?.passwordHash) {
      return next(new UnauthorizedError("Invalid email or password"));
    }

    const passwordValid = await comparePassword(password, authProvider.passwordHash);
    if (!passwordValid) {
      return next(new UnauthorizedError("Invalid email or password"));
    }

    const accessToken = await signToken({ userId: user.id });
    const sessionExpiry = new Date(Date.now() + config.auth.tokenExpiryMs);
    const tokenHash = sha256(accessToken);

    await db.insert(userSessionsTable).values({
      userId: user.id,
      tokenHash,
      expiresAt: sessionExpiry,
    });

    sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        status: user.status,
        emailVerified: user.emailVerifiedAt !== null,
      },
      accessToken,
      expiresAt: sessionExpiry.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", requireAuth, async (req, res, next): Promise<void> => {
  try {
    const authHeader = req.headers["authorization"]!;
    const token = authHeader.slice(7);
    const tokenHash = sha256(token);

    await db
      .delete(userSessionsTable)
      .where(eq(userSessionsTable.tokenHash, tokenHash));

    sendSuccess(res, { message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req, res, next): Promise<void> => {
  try {
    const [user] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        phone: usersTable.phone,
        avatarUrl: usersTable.avatarUrl,
        status: usersTable.status,
        locale: usersTable.locale,
        emailVerifiedAt: usersTable.emailVerifiedAt,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.id));

    if (!user) {
      return next(new NotFoundError("User"));
    }

    sendSuccess(res, {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      status: user.status,
      locale: user.locale,
      emailVerified: user.emailVerifiedAt !== null,
      createdAt: user.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/verify-email", async (req, res, next): Promise<void> => {
  try {
    const { token } = z.object({ token: z.string().min(1) }).parse(req.body);
    const tokenHash = sha256(token);
    const now = new Date();

    const [record] = await db
      .select({
        id: emailVerificationTokensTable.id,
        userId: emailVerificationTokensTable.userId,
        usedAt: emailVerificationTokensTable.usedAt,
        expiresAt: emailVerificationTokensTable.expiresAt,
      })
      .from(emailVerificationTokensTable)
      .where(eq(emailVerificationTokensTable.tokenHash, tokenHash));

    if (!record) {
      return next(new NotFoundError("Verification token"));
    }

    if (record.usedAt) {
      return next(new ValidationError("Token has already been used"));
    }

    if (record.expiresAt < now) {
      return next(new ValidationError("Token has expired"));
    }

    await db
      .update(emailVerificationTokensTable)
      .set({ usedAt: now })
      .where(eq(emailVerificationTokensTable.id, record.id));

    await db
      .update(usersTable)
      .set({ emailVerifiedAt: now })
      .where(eq(usersTable.id, record.userId));

    sendSuccess(res, { message: "Email verified successfully" });
  } catch (err) {
    next(err);
  }
});

router.post("/forgot-password", async (req, res, next): Promise<void> => {
  try {
    const { email } = z.object({ email: z.email() }).parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();

    const [user] = await db
      .select({ id: usersTable.id, email: usersTable.email })
      .from(usersTable)
      .where(and(eq(usersTable.email, normalizedEmail), isNull(usersTable.deletedAt)));

    if (user) {
      const { raw: resetToken, hash: resetTokenHash } = generateToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await db.insert(passwordResetTokensTable).values({
        userId: user.id,
        tokenHash: resetTokenHash,
        expiresAt,
      });

      sendEmail({
        to: user.email,
        ...emailTemplates.passwordReset(resetToken, 60),
      }).catch(() => {});
    }

    sendSuccess(res, { message: "If that email is registered, a reset link has been sent." });
  } catch (err) {
    next(err);
  }
});

router.post("/reset-password", async (req, res, next): Promise<void> => {
  try {
    const { token, newPassword } = z
      .object({
        token: z.string().min(1),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      })
      .parse(req.body);

    const tokenHash = sha256(token);
    const now = new Date();

    const [record] = await db
      .select({
        id: passwordResetTokensTable.id,
        userId: passwordResetTokensTable.userId,
        expiresAt: passwordResetTokensTable.expiresAt,
        usedAt: passwordResetTokensTable.usedAt,
      })
      .from(passwordResetTokensTable)
      .where(eq(passwordResetTokensTable.tokenHash, tokenHash));

    if (!record) {
      return next(new NotFoundError("Reset token"));
    }

    if (record.usedAt) {
      return next(new ValidationError("Token has already been used"));
    }

    if (record.expiresAt < now) {
      return next(new ValidationError("Token has expired"));
    }

    const newPasswordHash = await hashPassword(newPassword);

    await db
      .update(passwordResetTokensTable)
      .set({ usedAt: now })
      .where(eq(passwordResetTokensTable.id, record.id));

    await db
      .update(userAuthProvidersTable)
      .set({ passwordHash: newPasswordHash })
      .where(
        and(
          eq(userAuthProvidersTable.userId, record.userId),
          eq(userAuthProvidersTable.provider, "local"),
        ),
      );

    await db
      .delete(userSessionsTable)
      .where(eq(userSessionsTable.userId, record.userId));

    sendSuccess(res, { message: "Password reset successfully. Please log in with your new password." });
  } catch (err) {
    next(err);
  }
});

export default router;
