"use client";

import {
  CardAmex,
  CardDiscover,
  CardMastercard,
  CardVisa,
  CreditCard,
  GreekTemple,
} from "@dub/ui/icons";
import { capitalize } from "@dub/utils";

export type PaymentMethodType = string;

export interface PaymentMethod {
  type: PaymentMethodType;
  card?: {
    brand: string;
    last4: string;
  };
  us_bank_account?: {
    last4: string;
  };
  acss_debit?: {
    last4: string;
  };
  sepa_debit?: {
    last4: string;
  };
  link?: {
    email?: string | null;
  };
  [key: string]: unknown;
}

export const PaymentMethodTypesList = (paymentMethod?: PaymentMethod) =>
  [
    {
      type: "card",
      title: "Card",
      icon: paymentMethod?.card
        ? {
            amex: CardAmex,
            discover: CardDiscover,
            mastercard: CardMastercard,
            visa: CardVisa,
          }[paymentMethod?.card.brand] ?? CreditCard
        : CreditCard,
      description: paymentMethod?.card
        ? `Connected ${capitalize(paymentMethod.card.brand)} ***${paymentMethod.card.last4}`
        : "No card connected",
      iconBgColor: "bg-neutral-100",
    },
    {
      type: "us_bank_account",
      title: "ACH",
      icon: GreekTemple,
      description: paymentMethod?.us_bank_account
        ? `Account ending in ****${paymentMethod.us_bank_account.last4}`
        : "Not connected",
    },
    {
      type: "acss_debit",
      title: "ACSS Debit",
      icon: GreekTemple,
      description: paymentMethod?.acss_debit
        ? `Account ending in ****${paymentMethod.acss_debit.last4}`
        : "Not connected",
    },
    {
      type: "sepa_debit",
      title: "SEPA Debit",
      icon: GreekTemple,
      description: paymentMethod?.sepa_debit
        ? `Account ending in ****${paymentMethod.sepa_debit.last4}`
        : "Not connected",
    },
    {
      type: "link",
      title: "Link",
      icon: CreditCard,
      iconBgColor: "bg-green-100",
      description: paymentMethod?.link
        ? `Account with ${paymentMethod.link?.email}`
        : "No Link account connected",
    },
  ] satisfies {
    type: PaymentMethodType;
    title: string;
    icon: React.ElementType;
    description: string;
    iconBgColor?: string;
  }[];
