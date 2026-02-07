"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function GerantNav() {
  const { signOut } = useAuth();
  return (
    <div className="card row space-between">
      <div className="row">
        <Link className="link" href="/gerant/dashboard">
          Dashboard
        </Link>
      </div>
      <button className="btn secondary" onClick={() => signOut()}>
        Deconnexion
      </button>
    </div>
  );
}
