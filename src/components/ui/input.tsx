import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-blue-400 selection:bg-blue-500 selection:text-white bg-white/80 border-blue-200/50 flex w-full min-w-0 rounded-xl border backdrop-blur-sm transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "h-14 px-4 py-3 text-base",
        "md:h-10 md:px-3 md:py-2 md:text-sm",
        "focus-visible:border-blue-400 focus-visible:ring-blue-400/30 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
