import { getPartnerFeatureFlags } from "@/lib/edge-config/get-partner-feature-flags";
import { getPartnerBankAccount } from "@/lib/partners/get-partner-bank-account";
import { getPayoutMethodsForCountry } from "@/lib/partners/get-payout-methods-for-country";
import { PartnerPayoutMethodSetting } from "@/lib/types";
import { Partner, PartnerPayoutMethod } from "@dub/prisma/client";

export async function getPartnerPayoutMethods(
  partner: Pick<
    Partner,
    | "id"
    | "country"
    | "stripeConnectId"
    | "stripeRecipientId"
    | "paypalEmail"
    | "defaultPayoutMethod"
  >,
) {
  const featureFlags = await getPartnerFeatureFlags(partner.id);

  const availablePayoutMethods = getPayoutMethodsForCountry({
    country: partner.country,
    stablecoinEnabled: featureFlags.stablecoin,
  });

  const bankAccount = partner.stripeConnectId
    ? await getPartnerBankAccount(partner.stripeConnectId)
    : null;

  let payoutMethods: PartnerPayoutMethodSetting[] = [];

  // Stablecoin
  if (availablePayoutMethods.includes(PartnerPayoutMethod.stablecoin)) {
    let identifier: string | null = null;

    payoutMethods.push({
      type: PartnerPayoutMethod.stablecoin,
      label: "Stablecoin",
      default: partner.defaultPayoutMethod === PartnerPayoutMethod.stablecoin,
      connected: false,
      identifier,
    });
  }

  // Connect
  if (availablePayoutMethods.includes(PartnerPayoutMethod.connect)) {
    let identifier: string | null = null;

    if (bankAccount) {
      identifier = bankAccount.routing_number
        ? `${bankAccount.routing_number}••••${bankAccount.last4}`
        : `••••${bankAccount.last4}`;
    }

    payoutMethods.push({
      type: PartnerPayoutMethod.connect,
      label: "Bank Account",
      default: partner.defaultPayoutMethod === PartnerPayoutMethod.connect,
      connected: Boolean(bankAccount),
      identifier,
    });
  }

  // PayPal
  if (availablePayoutMethods.includes(PartnerPayoutMethod.paypal)) {
    payoutMethods.push({
      type: PartnerPayoutMethod.paypal,
      label: "PayPal",
      default: partner.defaultPayoutMethod === PartnerPayoutMethod.paypal,
      connected: Boolean(partner.paypalEmail),
      identifier: partner.paypalEmail ?? null,
    });
  }

  const stablecoinConnected = payoutMethods.some(
    (m) => m.type === PartnerPayoutMethod.stablecoin && m.connected,
  );

  // When Stablecoin is connected: Show only Stablecoin + any other method that is already connected
  if (stablecoinConnected) {
    payoutMethods = payoutMethods.filter(
      (m) => m.type === PartnerPayoutMethod.stablecoin || m.connected,
    );
  }

  return payoutMethods;
}
