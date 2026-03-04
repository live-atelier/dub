import { getPayoutEligibilityFilter } from "@/lib/api/payouts/payout-eligibility-filter";
import { FAST_ACH_FEE_CENTS } from "@/lib/constants/payouts";
import { qstash } from "@/lib/cron";
import { calculatePayoutFeeWithWaiver } from "@/lib/partners/calculate-payout-fee-with-waiver";
import {
  CUTOFF_PERIOD,
  CUTOFF_PERIOD_TYPES,
} from "@/lib/partners/cutoff-period";
import { sendEmail } from "@dub/email";
import ProgramPayoutThankYou from "@dub/email/templates/program-payout-thank-you";
import { prisma } from "@dub/prisma";
import {
  Invoice,
  Program,
  ProgramPayoutMode,
  Project,
} from "@dub/prisma/client";
import {
  APP_DOMAIN_WITH_NGROK,
  currencyFormatter,
  log,
  nFormatter,
  pluralize,
} from "@dub/utils";

interface ProcessPayoutsProps {
  workspace: Pick<
    Project,
    | "id"
    | "slug"
    | "stripeId"
    | "plan"
    | "invoicePrefix"
    | "payoutsUsage"
    | "payoutsLimit"
    | "payoutFee"
    | "payoutFeeWaiverLimit"
    | "payoutFeeWaiverUsage"
    | "webhookEnabled"
  >;
  program: Pick<
    Program,
    "id" | "name" | "logo" | "url" | "minPayoutAmount" | "supportEmail"
  > & {
    payoutMode: ProgramPayoutMode;
  };
  invoice: Pick<Invoice, "id" | "paymentMethod">;
  userId: string;
  paymentMethodId: string;
  cutoffPeriod?: CUTOFF_PERIOD_TYPES;
  selectedPayoutId?: string;
  excludedPayoutIds?: string[];
}

export async function processPayouts({
  workspace,
  program,
  invoice,
  userId,
  paymentMethodId,
  cutoffPeriod,
  selectedPayoutId,
  excludedPayoutIds,
}: ProcessPayoutsProps) {
  const cutoffPeriodValue = CUTOFF_PERIOD.find(
    (c) => c.id === cutoffPeriod,
  )?.value;

  const res = await prisma.payout.updateMany({
    where: {
      ...(selectedPayoutId
        ? { id: selectedPayoutId }
        : excludedPayoutIds && excludedPayoutIds.length > 0
          ? { id: { notIn: excludedPayoutIds } }
          : {}),
      ...getPayoutEligibilityFilter({ program, workspace }),
      ...(cutoffPeriodValue && {
        periodEnd: {
          lte: cutoffPeriodValue,
        },
      }),
    },
    data: {
      invoiceId: invoice.id,
      status: "processing",
      userId,
      initiatedAt: new Date(),
      // if the program is in external mode, set the mode to external
      // otherwise set it to internal (we'll update specific payouts to "external" later if it's hybrid mode)
      mode: program.payoutMode === "external" ? "external" : "internal",
    },
  });

  if (res.count === 0) {
    console.log(
      `No payouts updated/found for invoice ${invoice.id}. Skipping...`,
    );
    return;
  }

  console.log(
    `Updated ${res.count} payouts to invoice ${invoice.id} and "processing" status`,
  );

  // if hybrid mode, we need to update payouts for partners with payoutsEnabledAt = null to external mode
  // here we don't need to filter if they have tenantId cause getPayoutEligibilityFilter above already takes care of that
  if (program.payoutMode === "hybrid") {
    await prisma.payout.updateMany({
      where: {
        invoiceId: invoice.id,
        partner: {
          payoutsEnabledAt: null,
        },
      },
      data: {
        mode: "external",
      },
    });
  }

  const payoutsByMode = await prisma.payout.groupBy({
    by: ["mode"],
    where: {
      invoiceId: invoice.id,
    },
    _sum: {
      amount: true,
    },
  });

  const totalInternalPayoutAmount =
    payoutsByMode.find((p) => p.mode === "internal")?._sum.amount ?? 0;
  const totalExternalPayoutAmount =
    payoutsByMode.find((p) => p.mode === "external")?._sum.amount ?? 0;
  const totalPayoutAmount =
    totalInternalPayoutAmount + totalExternalPayoutAmount;

  const payoutFee = workspace.payoutFee;

  if (payoutFee == null) {
    throw new Error("Failed to calculate payout fee.");
  }

  console.info(`Using payout fee of ${payoutFee}.`);

  const {
    fee: invoiceFee,
    feeFreeAmount,
    feeChargedAmount,
    feeWaiverRemaining,
  } = calculatePayoutFeeWithWaiver({
    payoutAmount: totalPayoutAmount,
    payoutFee,
    payoutFeeWaiverLimit: workspace.payoutFeeWaiverLimit,
    payoutFeeWaiverUsage: workspace.payoutFeeWaiverUsage,
    fastAchFee: invoice.paymentMethod === "ach_fast" ? FAST_ACH_FEE_CENTS : 0,
  });

  const invoiceTotal = totalPayoutAmount + invoiceFee;

  console.log({
    totalInternalPayoutAmount,
    totalExternalPayoutAmount,
    totalPayoutAmount,
    invoiceFee,
    invoiceTotal,
    feeFreeAmount,
    feeChargedAmount,
    feeWaiverRemaining,
  });

  await prisma.invoice.update({
    where: {
      id: invoice.id,
    },
    data: {
      amount: totalPayoutAmount,
      externalAmount: totalExternalPayoutAmount,
      fee: invoiceFee,
      total: invoiceTotal,
    },
  });

  console.log(
    `Skipping Stripe charge for invoice ${invoice.id} (payment method ${paymentMethodId}) because Stripe processing is not available.`,
  );

  const { users } = await prisma.project.update({
    where: {
      id: workspace.id,
    },
    data: {
      payoutsUsage: {
        increment: totalPayoutAmount,
      },
      payoutFeeWaiverUsage: {
        increment: feeFreeAmount,
      },
    },
    include: {
      users: {
        where: {
          userId,
        },
        select: {
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  });

  await log({
    message: `<${program.url}|*${program.name}*> (\`${workspace.slug}\`) processed a payout of *${currencyFormatter(totalPayoutAmount)}* :money_with_wings: \n\n Fees earned: *${currencyFormatter(invoiceFee)} (${payoutFee * 100}%)* :money_mouth_face:`,
    type: "payouts",
  });

  const qstashResponse = await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/process/updates`,
    body: {
      invoiceId: invoice.id,
    },
  });

  if (qstashResponse.messageId) {
    console.log(`Message sent to Qstash with id ${qstashResponse.messageId}`);
  } else {
    console.error("Error sending message to Qstash", qstashResponse);
  }

  // should never happen, but just in case
  if (users.length === 0) {
    console.error(
      `No users found for workspace ${workspace.id}. Skipping email send...`,
    );
    return;
  }

  const userWhoInitiatedPayout = users[0].user;
  if (userWhoInitiatedPayout.email) {
    const emailRes = await sendEmail({
      to: userWhoInitiatedPayout.email,
      subject: `Thank you for your ${currencyFormatter(totalPayoutAmount)} payout to ${nFormatter(res.count, { full: true })} ${pluralize("partner", res.count)}`,
      react: ProgramPayoutThankYou({
        email: userWhoInitiatedPayout.email,
        workspace,
        program: {
          name: program.name,
        },
        payout: {
          amount: totalPayoutAmount,
          partnersCount: res.count,
        },
      }),
    });
    console.log(
      `Sent email to user ${userWhoInitiatedPayout.email}: ${JSON.stringify(emailRes, null, 2)}`,
    );
  }
}
