"use client";

import { ReactNode } from "react";
import { AuthProviderInner } from "@/lib/auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthProviderInner>{children}</AuthProviderInner>;
}
