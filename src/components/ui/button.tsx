import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-br from-blue-500 to-blue-400 text-white hover:from-blue-600 hover:to-blue-500 shadow-md hover:shadow-lg",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border border-blue-200/50 bg-white/80 backdrop-blur-sm text-foreground hover:bg-blue-50 hover:border-blue-300",
        secondary:
          "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200/50",
        ghost:
          "hover:bg-blue-50 hover:text-blue-700",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-14 px-6 py-3 text-base has-[>svg]:px-4 md:h-10 md:px-4 md:py-2 md:text-sm md:has-[>svg]:px-3",
        sm: "h-12 rounded-xl gap-1.5 px-4 text-base md:h-8 md:px-3 md:text-sm md:has-[>svg]:px-2.5",
        lg: "h-16 rounded-xl px-8 text-lg has-[>svg]:px-6 md:h-12 md:px-6 md:text-base md:has-[>svg]:px-4",
        icon: "size-14 rounded-xl md:size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
    }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Button, buttonVariants };
