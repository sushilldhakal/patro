import { cn } from "@vedic-patro/domain/utils";
import type { InputProps } from "../contract";

export function Input({ value, onChange, onSubmit, placeholder, type = "text", multiline, disabled, autoFocus, label, className, webClassName, testID }: InputProps) {
  const common = {
    value,
    placeholder,
    disabled,
    autoFocus,
    "aria-label": label,
    "data-testid": testID,
    className: cn(className, webClassName) || undefined,
  };
  if (multiline) return <textarea {...common} onChange={(e) => onChange(e.target.value)} />;
  return (
    <input
      {...common}
      type={type}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onSubmit ? (e) => e.key === "Enter" && onSubmit() : undefined}
    />
  );
}
