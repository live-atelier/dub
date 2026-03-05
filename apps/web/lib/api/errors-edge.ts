/**
 * Lightweight error handler for Edge Functions.
 *
 * This module mirrors the behavior of `errors.ts` but avoids heavy
 * dependencies (axiom, zod-openapi, zod-error, server-only) that bloat
 * the Edge Function bundle beyond Vercel's 2 MB limit.
 */
import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { DubApiError } from "./dub-api-error";
import { ErrorCodes } from "./error-codes";

const docErrorUrl = "https://dub.co/docs/api-reference/errors";

type ErrorResponse = {
  error: {
    code: string;
    message: string;
    doc_url?: string;
  };
};

function formatZodError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Validation error";

  const path = issue.path.length > 0 ? issue.path.join(".") : "";
  return path ? `${path}: ${issue.message}` : issue.message;
}

function handleApiError(error: any): ErrorResponse & { status: number } {
  console.error(error.message);

  // Zod errors
  if (error instanceof z.ZodError) {
    return {
      error: {
        code: "unprocessable_entity",
        message: formatZodError(error),
        doc_url: `${docErrorUrl}#unprocessable-entity`,
      },
      status: ErrorCodes.unprocessable_entity,
    };
  }

  // DubApiError errors
  if (error instanceof DubApiError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        doc_url: error.docUrl,
      },
      status: ErrorCodes[error.code],
    };
  }

  // Fallback
  return {
    error: {
      code: "internal_server_error",
      message:
        "An internal server error occurred. Please contact our support if the problem persists.",
      doc_url: `${docErrorUrl}#internal-server-error`,
    },
    status: 500,
  };
}

export function handleAndReturnErrorResponse(err: unknown, headers?: Headers) {
  const { error, status } = handleApiError(err);
  return NextResponse.json<ErrorResponse>({ error }, { headers, status });
}
