"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/types";

type Props = {
  allow: Role[];
  redirectTo: string;
  children: ReactNode;
};

export default function RoleGuard({ allow, redirectTo, children }: Props) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(redirectTo);
    }
  }, [loading, user, router, redirectTo]);

  if (loading) {
    return (
      <div className="container">
        <div className="card">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!profile || !allow.includes(profile.role)) {
    return (
      <div className="container">
        <div className="card">Acces refuse.</div>
      </div>
    );
  }

  return <>{children}</>;
}
