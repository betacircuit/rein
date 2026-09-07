"use client";

import type { ComponentProps, FormEvent, MouseEvent } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";

type ServerFormAction = (formData: FormData) => void | Promise<void>;

type ConfirmActionFormProps = Omit<ComponentProps<"form">, "action" | "onSubmit"> & {
  action: ServerFormAction;
  confirmMessage: string;
};

export function ConfirmActionForm({
  action,
  children,
  confirmMessage,
  ...props
}: ConfirmActionFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(confirmMessage)) event.preventDefault();
  }

  return (
    <form action={action} onSubmit={handleSubmit} {...props}>
      {children}
    </form>
  );
}

type ConfirmSubmitButtonProps = ButtonProps & { confirmMessage: string };

export function ConfirmSubmitButton({
  confirmMessage,
  onClick,
  ...props
}: ConfirmSubmitButtonProps) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);
    if (!event.defaultPrevented && !window.confirm(confirmMessage)) event.preventDefault();
  }

  return <Button onClick={handleClick} {...props} />;
}
