"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function AdminNav() {
  const { signOut } = useAuth();
  return (
    <div className="card row space-between">
      <div className="row">
        <Link className="link" href="/admin/dashboard">
          Dashboard
        </Link>
        <Link className="link" href="/admin/boutiques">
          Boutiques
        </Link>
        <Link className="link" href="/admin/produits">
          Produits
        </Link>
        <Link className="link" href="/admin/reservations">
          Reservations
        </Link>
      </div>
      <button className="btn secondary" onClick={() => signOut()}>
        Deconnexion
      </button>
    </div>
  );
}
