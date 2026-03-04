import * as z from "zod/v4";

export const bankAccountSchema = z
  .object({
    account_holder_name: z.string().nullable(),
    bank_name: z.string().nullable(),
    routing_number: z.string().nullable(),
    last4: z.string(),
    status: z.enum([
      "new",
      "validated",
      "verified",
      "verification_failed",
      "tokenized_account_number_deactivated",
      "errored",
    ]),
    fingerprint: z.string().nullish(),
  })
  .nullable();

export type BankAccount = z.infer<typeof bankAccountSchema>;

export const getPartnerBankAccount = async (
  _stripeAccount: string,
): Promise<BankAccount> => {
  return null;
};
