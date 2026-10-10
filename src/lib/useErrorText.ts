"use client";
import { useLocale } from "next-intl";
import { errorMessage } from "./errors";

export function useErrorText() {
  const locale = useLocale();
  return (code: unknown) => errorMessage(code, locale === "ar");
}
