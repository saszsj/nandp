"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import RoleGuard from "@/components/RoleGuard";
import AdminNav from "@/components/AdminNav";
import { db } from "@/lib/firebase";
import type { Reservation } from "@/lib/types";

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "reservations"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setReservations(
        snap.docs.map((d) => ({ ...(d.data() as Reservation), id: d.id }))
      );
    });
    return () => unsub();
  }, []);

  const updateReservation = async (id: string, data: Partial<Reservation>) => {
    setStatus(null);
    await updateDoc(doc(db, "reservations", id), data);
    setStatus("Reservation mise a jour.");
  };

  return (
    <RoleGuard allow={["admin"]} redirectTo="/admin/login">
      <main className="container stack">
        <AdminNav />
        <div className="card stack">
          <h1>Reservations</h1>
          {status ? <p className="muted">{status}</p> : null}
          <div className="stack">
            {reservations.map((r) => (
              <div key={r.id} className="card stack">
                <div className="row space-between">
                  <div>
                    <div>{r.nom}</div>
                    <div className="muted">{r.email}</div>
                  </div>
                  <span className="badge">{r.statut}</span>
                </div>
                <div className="muted">Produit: {r.produitId}</div>
                <div className="row">
                  <button
                    className="btn secondary"
                    onClick={() => updateReservation(r.id, { statut: "validee" })}
                  >
                    Valider
                  </button>
                  <button
                    className="btn secondary"
                    onClick={() => updateReservation(r.id, { statut: "refusee" })}
                  >
                    Refuser
                  </button>
                </div>
                <div className="stack">
                  <label className="label">Acompte</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={r.acompte || 0}
                    onChange={(e) =>
                      updateReservation(r.id, {
                        acompte: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            ))}
            {!reservations.length ? (
              <p className="muted">Aucune reservation pour le moment.</p>
            ) : null}
          </div>
        </div>
      </main>
    </RoleGuard>
  );
}
