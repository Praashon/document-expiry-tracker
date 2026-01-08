"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked = false, onCheckedChange, disabled = false, className, id }, ref) => {
    return (
      <button
        ref={ref}
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#A8BBA3] focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-neutral-900",
          checked
            ? "bg-[#A8BBA3]"
            : "bg-neutral-200 dark:bg-neutral-700",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    );
  }
);

Switch.displayName = "Switch";

export { Switch };
