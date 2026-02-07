"use client";

import RoleGuard from "@/components/RoleGuard";
import AdminNav from "@/components/AdminNav";

export default function AdminDashboardPage() {
  return (
    <RoleGuard allow={["admin"]} redirectTo="/admin/login">
      <main className="container stack">
        <AdminNav />
        <div className="card stack">
          <h1>Dashboard admin</h1>
          <p className="muted">
            Vue rapide: boutiques, produits, reservations et notifications.
          </p>
          <div className="row">
            <span className="badge">Boutiques</span>
            <span className="badge">Produits</span>
            <span className="badge">Reservations</span>
          </div>
        </div>
      </main>
    </RoleGuard>
  );
}
