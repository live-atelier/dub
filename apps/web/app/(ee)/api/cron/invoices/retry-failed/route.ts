import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import * as z from "zod/v4";

export const dynamic = "force-dynamic";

const schema = z.object({
  invoiceId: z.string().min(1),
});

// POST /api/cron/invoices/retry-failed
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const { invoiceId } = schema.parse(JSON.parse(rawBody));

    const invoice = await prisma.invoice.findUnique({
      where: {
        id: invoiceId,
      },
      select: {
        id: true,
        type: true,
        status: true,
        total: true,
        failedAttempts: true,
        workspace: {
          select: {
            id: true,
            stripeId: true,
          },
        },
      },
    });

    if (!invoice) {
      console.log(`Invoice ${invoiceId} not found.`);
      return new Response(`Invoice ${invoiceId} not found.`);
    }

    if (invoice.status !== "failed") {
      console.log(`Invoice ${invoiceId} is not failed.`);
      return new Response(`Invoice ${invoiceId} is not failed.`);
    }

    if (invoice.failedAttempts >= 3) {
      console.log(`Invoice ${invoiceId} has reached max failed attempts of 3.`);
      return new Response(
        `Invoice ${invoiceId} has reached max failed attempts of 3.`,
      );
    }

    if (invoice.type !== "domainRenewal") {
      console.log(`Only domain renewals can be retried at this time.`);
      return new Response(`Only domain renewals can be retried at this time.`);
    }

    console.log(
      `Payment processing not available for failed invoice ${invoice.id}.`,
    );
    return new Response("Payment processing not available");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
