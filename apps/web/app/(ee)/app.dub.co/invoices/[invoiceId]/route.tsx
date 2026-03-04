import { DubApiError } from "@/lib/api/errors";
import { withSession } from "@/lib/auth";
import { prisma } from "@dub/prisma";

export const dynamic = "force-dynamic";

export const GET = withSession(async ({ session, params }) => {
  const { invoiceId } = params;

  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: {
      id: invoiceId,
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          stripeId: true,
        },
      },
    },
  });

  if (invoice.status === "failed") {
    throw new DubApiError({
      code: "bad_request",
      message:
        "This invoice is not available for download since the payment failed.",
    });
  }

  const userInWorkspace = await prisma.projectUsers.findUnique({
    where: {
      userId_projectId: {
        userId: session.user.id,
        projectId: invoice.workspace.id,
      },
    },
  });

  if (!userInWorkspace) {
    throw new DubApiError({
      code: "unauthorized",
      message: "You are not authorized to view this invoice.",
    });
  }

  let pdf: Buffer | null = null;

  if (invoice.type === "partnerPayout" || invoice.type === "domainRenewal") {
    // Invoice PDF generation not available (Stripe removed)
    pdf = null;
  }

  if (!pdf) {
    throw new DubApiError({
      code: "bad_request",
      message: `Invoice ${invoiceId} not found in workspace.`,
    });
  }

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="dub-invoice-${invoice.number}.pdf"`,
    },
  });
});
