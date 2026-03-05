import * as z from "zod/v4";
import { ErrorCode } from "./error-codes";

const docErrorUrl = "https://dub.co/docs/api-reference/errors";

export class DubApiError extends Error {
  public readonly code: z.infer<typeof ErrorCode>;
  public readonly docUrl?: string;

  constructor({
    code,
    message,
    docUrl,
  }: {
    code: z.infer<typeof ErrorCode>;
    message: string;
    docUrl?: string;
  }) {
    super(message);
    this.code = code;
    this.docUrl = docUrl ?? `${docErrorUrl}#${code.replace("_", "-")}`;
  }
}
