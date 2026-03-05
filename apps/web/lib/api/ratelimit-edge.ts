/**
 * Lightweight rate limiter for Edge Functions.
 *
 * This module avoids importing `next-auth/jwt` (used in `utils.ts` to check
 * session) which pulls the entire next-auth package into the edge bundle.
 * Edge routes that need rate limiting can use this IP-only rate limiter.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { ipAddress } from "@vercel/functions";
import { NextRequest } from "next/server";
import { redis } from "../upstash/redis";
import { DubApiError } from "./dub-api-error";

const ratelimit = (
  requests: number = 10,
  seconds:
    | `${number} ms`
    | `${number} s`
    | `${number} m`
    | `${number} h`
    | `${number} d` = "10 s",
) => {
  return new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(requests, seconds),
    analytics: true,
    prefix: "dub",
    timeout: 1000,
  });
};

export const ratelimitOrThrow = async (
  req: NextRequest,
  identifier?: string,
) => {
  const ip = ipAddress(req);
  const { success } = await ratelimit().limit(
    `${identifier || "ratelimit"}:${ip}`,
  );
  if (!success) {
    throw new DubApiError({
      code: "rate_limit_exceeded",
      message: "Don't DDoS me pls 🥺",
    });
  }
};
