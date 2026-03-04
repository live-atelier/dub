import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@dub/prisma";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  code: z.string(),
  programId: z.string(),
});

// POST /api/cron/discount-codes/delete
export const POST = withCron(async ({ rawBody }) => {
  const { code, programId } = inputSchema.parse(JSON.parse(rawBody));

  const workspace = await prisma.project.findUniqueOrThrow({
    where: {
      defaultProgramId: programId,
    },
    select: {
      stripeConnectId: true,
    },
  });

  return logAndRespond(
    `Skipping discount code ${code} disable for ${workspace.stripeConnectId}: Stripe processing not available.`,
  );
});
