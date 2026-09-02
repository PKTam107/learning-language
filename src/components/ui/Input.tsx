import { forwardRef } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className = "", ...props }, ref) => (
  <input
    ref={ref}
    className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none sm:text-sm placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 ${className}`}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className = "", ...props }, ref) => (
  <textarea
    ref={ref}
    className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none sm:text-sm placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 ${className}`}
    {...props}
  />
));
Textarea.displayName = "Textarea";
