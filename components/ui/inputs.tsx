"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import {
  EGY_MOBILE_PREFIXES,
  isNumericKeyAllowed,
  isTextKeyAllowed,
  joinEgyPhone,
  networkName,
  sanitizeNumeric,
  sanitizeText,
  splitEgyPhone,
  type PhonePrefixCode,
} from "@/lib/input-validators";

// ----------------------------------------------------
//  NumberInput — أرقام فقط (يدعم العشرية والحد الأقصى)
// ----------------------------------------------------
type BaseProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value" | "type" | "inputMode" | "pattern"
>;

interface NumberInputProps extends BaseProps {
  value: string;
  onChange: (value: string) => void;
  allowDecimal?: boolean;
  maxLength?: number;
  max?: number;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  function NumberInput(
    {
      value,
      onChange,
      allowDecimal = false,
      maxLength,
      max,
      className,
      onKeyDown,
      onPaste,
      ...rest
    },
    ref
  ) {
    return (
      <input
        ref={ref}
        {...rest}
        type="text"
        value={value}
        inputMode={allowDecimal ? "decimal" : "numeric"}
        pattern={allowDecimal ? "[0-9.]*" : "[0-9]*"}
        autoComplete="off"
        className={cn("nums", className)}
        onKeyDown={(e) => {
          if (!isNumericKeyAllowed(e, { allowDecimal })) {
            e.preventDefault();
            return;
          }
          onKeyDown?.(e);
        }}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text");
          const target = e.currentTarget;
          const start = target.selectionStart ?? value.length;
          const end = target.selectionEnd ?? value.length;
          const next =
            value.slice(0, start) + text + value.slice(end);
          onChange(
            sanitizeNumeric(next, { allowDecimal, maxLength, max })
          );
          onPaste?.(e);
        }}
        onChange={(e) => {
          onChange(
            sanitizeNumeric(e.target.value, {
              allowDecimal,
              maxLength,
              max,
            })
          );
        }}
      />
    );
  }
);

// ----------------------------------------------------
//  TextOnlyInput — حروف فقط بلا أرقام أو رموز
// ----------------------------------------------------
interface TextOnlyInputProps extends BaseProps {
  value: string;
  onChange: (value: string) => void;
}

export const TextOnlyInput = forwardRef<HTMLInputElement, TextOnlyInputProps>(
  function TextOnlyInput(
    { value, onChange, className, onKeyDown, onPaste, ...rest },
    ref
  ) {
    return (
      <input
        ref={ref}
        {...rest}
        type="text"
        value={value}
        inputMode="text"
        autoComplete="off"
        className={className}
        onKeyDown={(e) => {
          if (!isTextKeyAllowed(e)) {
            e.preventDefault();
            return;
          }
          onKeyDown?.(e);
        }}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text");
          const target = e.currentTarget;
          const start = target.selectionStart ?? value.length;
          const end = target.selectionEnd ?? value.length;
          const next = value.slice(0, start) + text + value.slice(end);
          onChange(sanitizeText(next));
          onPaste?.(e);
        }}
        onChange={(e) => {
          onChange(sanitizeText(e.target.value));
        }}
      />
    );
  }
);

// ----------------------------------------------------
//  PhoneInput — بادئة + 8 أرقام = رقم مصري كامل
// ----------------------------------------------------
interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  showNetworkHint?: boolean;
}

export function PhoneInput({
  value,
  onChange,
  className,
  placeholder = "أدخل 8 أرقام",
  disabled,
  showNetworkHint = true,
}: PhoneInputProps) {
  const { prefix, digits } = splitEgyPhone(value);
  const network = networkName(prefix);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex gap-2">
        <select
          className="input nums w-auto flex-shrink-0"
          value={prefix}
          disabled={disabled}
          onChange={(e) =>
            onChange(
              joinEgyPhone(e.target.value as PhonePrefixCode, digits)
            )
          }
          aria-label="بادئة الشبكة"
        >
          {EGY_MOBILE_PREFIXES.map((p) => (
            <option key={p.code} value={p.code}>
              {p.code} — {p.name}
            </option>
          ))}
        </select>
        <NumberInput
          className="input flex-1"
          value={digits}
          maxLength={8}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="رقم الهاتف"
          onChange={(v) => onChange(joinEgyPhone(prefix, v))}
        />
      </div>
      {showNetworkHint && (
        <p className="text-xs text-muted">
          الشبكة:{" "}
          <span className="font-medium text-text">{network}</span>
          {digits && (
            <span className="mr-2 nums">
              · {joinEgyPhone(prefix, digits)}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
