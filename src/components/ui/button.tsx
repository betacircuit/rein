import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "rein-pressable inline-flex min-h-11 items-center justify-center gap-2 border-2 border-black px-4 text-sm font-black tracking-[0.03em] shadow-[3px_3px_0_#101010] transition-[transform,box-shadow,background-color] duration-100 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none",
  {
    variants: {
      variant: {
        primary: "bg-[var(--orange)] text-black hover:bg-[#ff7737]",
        accent: "bg-[var(--magenta)] text-black hover:bg-[#e768f1]",
        outline: "bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--cyan)]",
        ghost:
          "border-transparent bg-transparent text-[var(--ink)] shadow-none hover:border-black hover:bg-[var(--surface-muted)]",
        destructive:
          "bg-[var(--danger)] text-black hover:bg-[var(--danger-wash)] focus-visible:outline-[var(--danger)]",
      },
      size: {
        default: "min-h-11 px-4",
        icon: "size-11 p-0",
        large: "min-h-12 px-5 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ asChild = false, className, variant, size, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
