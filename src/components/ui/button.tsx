import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel/80 disabled:pointer-events-none disabled:opacity-40 active:scale-95",
  {
    variants: {
      variant: {
        primary: "bg-paper text-ink hover:bg-paper/90",
        ghost: "bg-transparent text-paper hover:bg-paper/10",
        outline: "text-paper shadow-[var(--shadow-border)] hover:bg-paper/10",
        quiet: "bg-ink-subtle text-paper hover:bg-ink-elevated",
      },
      size: {
        sm: "h-9 min-h-9 px-3 text-sm",
        md: "h-11 min-h-11 px-4 text-sm",
        icon: "size-11 min-h-11 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type Props = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild, ...props }: Props) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
