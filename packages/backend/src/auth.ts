import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import type { JsonDb } from "./db";
import type { JwtClaims, Role, User } from "./types";

export interface AuthContext {
  jwtSecret: string;
  db: JsonDb;
}

export interface AuthenticatedRequest extends Request {
  authUser?: User;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(user: User, secret: string, expiresIn: string | number): string {
  const claims: JwtClaims = { sub: user.id, email: user.email, role: user.role };
  const options = { expiresIn: expiresIn as SignOptions["expiresIn"] } as SignOptions;
  return jwt.sign(claims, secret as Secret, options);
}

function readBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  const parts = header.split(" ");
  return parts[1] ?? null;
}

/**
 * Optional auth: attaches a FRESH user record from DB (never trusts the
 * token's premium claim) so revocation takes effect even mid-session.
 */
export function optionalAuth(ctx: AuthContext) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    const token = readBearer(req);
    if (!token) return next();
    try {
      const claims = jwt.verify(token, ctx.jwtSecret) as JwtClaims;
      const db = await ctx.db.load();
      const user = db.users.find((u) => u.id === claims.sub) ?? null;
      if (user) req.authUser = user;
    } catch {
      // Invalid/expired token -> treat as signed out. Protected routes enforce below.
    }
    return next();
  };
}

export function requireAuth() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      res.status(401).json({ error: "Sign in required", code: "UNAUTHENTICATED" });
      return;
    }
    next();
  };
}

export function requireRole(role: Role) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      res.status(401).json({ error: "Sign in required", code: "UNAUTHENTICATED" });
      return;
    }
    if (req.authUser.role !== role) {
      res.status(403).json({ error: "Admin permission required", code: "FORBIDDEN" });
      return;
    }
    next();
  };
}

/** Premium customers must never retrieve drafts: publication and access are separate checks. */
export function canAccessSource(user: User | undefined, accessLevel: "free" | "premium"): boolean {
  if (accessLevel === "free") return true;
  return user?.premium === true;
}
