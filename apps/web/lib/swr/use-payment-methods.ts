import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

type PaymentMethod = {
  id: string;
  type: string;
  card?: { brand: string; last4: string };
  us_bank_account?: { last4: string };
  acss_debit?: { last4: string };
  sepa_debit?: { last4: string };
  link?: { email?: string | null };
  [key: string]: unknown;
};

// Returns the Stripe payment methods for the business
export default function usePaymentMethods({
  enabled = true,
}: { enabled?: boolean } = {}) {
  const { slug } = useWorkspace();

  const {
    data: paymentMethods,
    isLoading,
    error,
  } = useSWR<PaymentMethod[]>(
    enabled && slug && `/api/workspaces/${slug}/billing/payment-methods`,
    fetcher,
  );

  return {
    paymentMethods,
    error,
    loading: isLoading,
  };
}
