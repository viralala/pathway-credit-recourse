import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

export function apiSuccess<T>(data: T, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    {
      status,
      headers: { ...NO_STORE, ...headers },
    }
  );
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status = 400,
  details?: unknown,
  headers: Record<string, string> = {}
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    {
      status,
      headers: { ...NO_STORE, ...headers },
    }
  );
}
