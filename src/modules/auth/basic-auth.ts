import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

function unauthorized(res: Response) {
  res.setHeader("WWW-Authenticate", 'Basic realm="OCI Dashboard Admin"');
  return res.status(401).json({
    ok: false,
    error: { code: "UNAUTHORIZED", message: "authentication required" },
  });
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);

  if (ab.length !== bb.length) {
    return false;
  }

  return crypto.timingSafeEqual(ab, bb);
}

export function requireBasicAuth(expectedUser: string, expectedPass: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.header("authorization");

    if (!header || !header.startsWith("Basic ")) {
      return unauthorized(res);
    }

    const encoded = header.slice("Basic ".length);
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const separatorIndex = decoded.indexOf(":");

    if (separatorIndex < 0) {
      return unauthorized(res);
    }

    const user = decoded.slice(0, separatorIndex);
    const pass = decoded.slice(separatorIndex + 1);

    if (!safeEqual(user, expectedUser) || !safeEqual(pass, expectedPass)) {
      return unauthorized(res);
    }

    return next();
  };
}
