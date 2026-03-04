import { Partner, PartnerPayoutMethod } from "@dub/prisma/client";
import { prettyPrint } from "@dub/utils";

const PAYOUT_METHOD_PRIORITY: PartnerPayoutMethod[] = [
  PartnerPayoutMethod.stablecoin,
  PartnerPayoutMethod.connect,
  PartnerPayoutMethod.paypal,
];

/**
 * Computes payoutsEnabledAt and defaultPayoutMethod based on currently active
 * payout methods. The default is always selected from priority order:
 * stablecoin > connect > paypal.
 */
export async function recomputePartnerPayoutState(
  partner: Pick<
    Partner,
    | "stripeConnectId"
    | "stripeRecipientId"
    | "paypalEmail"
    | "payoutsEnabledAt"
    | "defaultPayoutMethod"
  >,
) {
  const connectActive = false;
  const stablecoinActive = false;

  const paypalActive = Boolean(partner.paypalEmail);

  const activePayoutMethods = PAYOUT_METHOD_PRIORITY.filter((method) => {
    switch (method) {
      case PartnerPayoutMethod.stablecoin:
        return stablecoinActive;
      case PartnerPayoutMethod.connect:
        return connectActive;
      case PartnerPayoutMethod.paypal:
        return paypalActive;
      default:
        return false;
    }
  });

  const defaultPayoutMethod = activePayoutMethods[0] ?? null;
  let payoutsEnabledAt: Date | null = null;

  if (defaultPayoutMethod) {
    payoutsEnabledAt = partner.payoutsEnabledAt ?? new Date();
  } else {
    payoutsEnabledAt = null;
  }

  console.log(
    "[recomputePartnerPayoutState]",
    prettyPrint({
      connectActive,
      stablecoinActive,
      paypalActive,
      payoutsEnabledAt,
      defaultPayoutMethod,
    }),
  );

  return {
    payoutsEnabledAt,
    defaultPayoutMethod,
  };
}
