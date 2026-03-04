"use client";

import { generatePaypalOAuthUrl } from "@/lib/actions/partners/generate-paypal-oauth-url";
import { PartnerPayoutMethod } from "@dub/prisma/client";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";

export function usePayoutConnectFlow(options?: { closeParent?: () => void }) {
  const router = useRouter();
  const closeParent = options?.closeParent;

  const {
    executeAsync: executePaypalConnect,
    isPending: isPaypalConnectPending,
  } = useAction(generatePaypalOAuthUrl, {
    onSuccess: ({ data }) => {
      router.push(data.url);
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const EmptyModal = () => null;

  const connect = useCallback(
    async (
      type: PartnerPayoutMethod,
      connectOptions?: { isManage?: boolean },
    ) => {
      const isManage = connectOptions?.isManage ?? false;

      if (type === "paypal") {
        if (!isManage) {
          closeParent?.();
        }
        await executePaypalConnect();
      }
    },
    [closeParent, executePaypalConnect],
  );

  return {
    connect,
    isPending: isPaypalConnectPending,
    BankAccountRequirementsModal: EmptyModal,
    StablecoinPayoutModal: EmptyModal,
  };
}
