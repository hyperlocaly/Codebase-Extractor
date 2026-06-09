import type { Request, Response, NextFunction } from "express";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable, userSessionsTable } from "@workspace/db";
import { UnauthorizedError } from "../shared/errors";
import { config } from "../config";
import { logger } from "../lib/logger";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  status: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const jwtSecret = new TextEncoder().encode(config.auth.jwtSecret);

export async function signToken(payload: { userId: string }): Promise<string> {
  const { randomBytes } = await import("crypto");
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setJti(randomBytes(16).toString("hex"))
    .setIssuedAt()
    .setExpirationTime(config.auth.jwtExpiresIn)
    .sign(jwtSecret);
}

export async function verifyToken(token: string): Promise<{ userId: string }> {
  const { payload } = await jwtVerify(token, jwtSecret);
  if (typeof payload["userId"] !== "string") {
    throw new UnauthorizedError("Malformed token");
  }
  return { userId: payload["userId"] as string };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.auth.bcryptRounds);
}

export async function comparePassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    return next(new UnauthorizedError());
  }

  const token = authHeader.slice(7);

  try {
    const { userId } = await verifyToken(token);

    const [user] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        status: usersTable.status,
      })
      .from(usersTable)
      .where(and(eq(usersTable.id, userId), eq(usersTable.status, "active")));

    if (!user) {
      return next(new UnauthorizedError("User not found or inactive"));
    }

    req.user = user;
    next();
  } catch (err) {
    logger.debug({ err }, "Auth token validation failed");
    next(new UnauthorizedError("Invalid or expired token"));
  }
}

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.slice(7);

  try {
    const { userId } = await verifyToken(token);

    const [user] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        status: usersTable.status,
      })
      .from(usersTable)
      .where(and(eq(usersTable.id, userId), eq(usersTable.status, "active")));

    if (user) req.user = user;
  } catch {
    // silently ignore — optional auth
  }

  next();
}
