import useWorkspace from "@/lib/swr/use-workspace";
import { CustomerProps } from "@/lib/types";
import { createCustomerBodySchema } from "@/lib/zod/schemas/customers";
import { CountryCombobox } from "@/ui/partners/country-combobox";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import * as z from "zod/v4";

export type AddCustomerInitialData = { name?: string; email?: string };

interface AddCustomerModalProps {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
  onSuccess?: (customer: CustomerProps) => void;
  initialData?: AddCustomerInitialData;
}

type FormData = z.infer<typeof createCustomerBodySchema>;

export const AddCustomerModal = ({
  showModal,
  setShowModal,
  onSuccess,
  initialData,
}: AddCustomerModalProps) => {
  const { id: workspaceId } = useWorkspace();
  const { isMobile } = useMediaQuery();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<FormData>({
    defaultValues: {
      name: null,
      email: null,
      externalId: "",
      country: "US",
    },
  });

  const prevShowModal = useRef(showModal);

  useEffect(() => {
    // Only reset when the modal opens (transitions from false to true)
    if (showModal && !prevShowModal.current) {
      reset({
        name: initialData?.name ?? null,
        email: initialData?.email ?? null,
        externalId: "",
        country: "US",
      });
    }
    prevShowModal.current = showModal;
  }, [showModal, initialData, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const response = await fetch(
        `/api/customers?workspaceId=${workspaceId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error.message || "Failed to create customer.");
      }

      const customer = await response.json();
      await mutate(`/api/customers?workspaceId=${workspaceId}`);
      toast.success(
        `Customer "${customer.email ?? customer.externalId}" added successfully!`,
      );
      onSuccess?.(customer);
      setShowModal(false);
    } catch (error) {
      toast.error(error.message || "Something went wrong.");
    }
  };

  const externalId = watch("externalId");
  const country = watch("country");

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="flex items-center justify-between gap-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">Create new customer</h3>
      </div>

      <div className="bg-neutral-50">
        <form
          onSubmit={(e) => {
            e.stopPropagation();
            return handleSubmit(onSubmit)(e);
          }}
        >
          <div className="flex flex-col gap-6 px-4 py-6 text-left sm:px-6">
            <div>
              <label className="text-sm font-medium text-neutral-600">
                Name
              </label>
              <input
                type="text"
                autoComplete="off"
                className="mt-1.5 block w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm transition-colors focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                placeholder="John Doe"
                autoFocus={!isMobile && !initialData?.email}
                {...register("name", {
                  setValueAs: (value) => (value === "" ? null : value),
                })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-600">
                Email
              </label>
              <input
                type="email"
                autoComplete="off"
                className="mt-1.5 block w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm transition-colors focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                placeholder="john@example.com"
                autoFocus={!isMobile && !!initialData?.email}
                {...register("email", {
                  setValueAs: (value) => (value === "" ? null : value),
                })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-600">
                Country <span className="text-neutral-400">(required)</span>
              </label>
              <CountryCombobox
                value={country || "US"}
                onChange={(value) =>
                  setValue("country", value, { shouldValidate: true })
                }
                error={!!errors.country}
                className="mt-1.5"
              />
              <input
                type="hidden"
                {...register("country", { required: true })}
              />
              <p className="mt-1.5 text-xs text-neutral-500">
                Used in analytics and country-specific rewards.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-600">
                External ID <span className="text-neutral-400">(required)</span>
              </label>
              <input
                type="text"
                required
                autoComplete="off"
                className="mt-1.5 block w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm transition-colors focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                placeholder="e.g. user_123 or john@example.com"
                {...register("externalId", { required: true })}
              />
              <p className="mt-1.5 text-xs text-neutral-500">
                Your unique ID for this customer (e.g. database ID or email).
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-4 py-4 sm:px-6">
            <Button
              type="button"
              variant="secondary"
              text="Cancel"
              className="h-9 w-fit"
              onClick={() => setShowModal(false)}
              disabled={isSubmitting}
            />
            <Button
              type="submit"
              text="Create customer"
              className="h-9 w-fit"
              loading={isSubmitting}
              disabled={!externalId || !country}
            />
          </div>
        </form>
      </div>
    </Modal>
  );
};

export function useAddCustomerModal({
  onSuccess,
}: {
  onSuccess?: (customer: CustomerProps) => void;
} = {}) {
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [initialData, setInitialData] = useState<
    AddCustomerInitialData | undefined
  >();

  const AddCustomerModalCallback = useCallback(() => {
    return (
      <AddCustomerModal
        showModal={showAddCustomerModal}
        setShowModal={(show) => {
          setShowAddCustomerModal(show);
          if (!show) {
            setInitialData(undefined);
          }
        }}
        onSuccess={onSuccess}
        initialData={initialData}
      />
    );
  }, [showAddCustomerModal, initialData, onSuccess]);

  const setShowAddCustomerModalWithData = useCallback(
    (show: boolean, data?: AddCustomerInitialData) => {
      setShowAddCustomerModal(show);
      setInitialData(data);
    },
    [],
  );

  return useMemo(
    () => ({
      setShowAddCustomerModal: setShowAddCustomerModalWithData,
      AddCustomerModal: AddCustomerModalCallback,
    }),
    [setShowAddCustomerModalWithData, AddCustomerModalCallback],
  );
}
