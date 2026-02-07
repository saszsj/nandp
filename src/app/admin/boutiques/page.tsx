"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import RoleGuard from "@/components/RoleGuard";
import AdminNav from "@/components/AdminNav";
import { db } from "@/lib/firebase";
import type { Boutique } from "@/lib/types";

export default function AdminBoutiquesPage() {
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [form, setForm] = useState({ nom: "", ville: "", actif: true });
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "boutiques"), orderBy("nom"));
    const unsub = onSnapshot(q, (snap) => {
      setBoutiques(
        snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Boutique),
        }))
      );
    });
    return () => unsub();
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    await addDoc(collection(db, "boutiques"), {
      nom: form.nom,
      ville: form.ville,
      actif: form.actif,
      createdAt: serverTimestamp(),
    });
    setForm({ nom: "", ville: "", actif: true });
    setStatus("Boutique ajoutee.");
  };

  return (
    <RoleGuard allow={["admin"]} redirectTo="/admin/login">
      <main className="container stack">
        <AdminNav />
        <div className="card stack">
          <h1>Boutiques</h1>
          <form className="stack" onSubmit={handleCreate}>
            <div className="stack">
              <label className="label">Nom</label>
              <input
                className="input"
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                required
              />
            </div>
            <div className="stack">
              <label className="label">Ville</label>
              <input
                className="input"
                value={form.ville}
                onChange={(e) => setForm({ ...form, ville: e.target.value })}
                required
              />
            </div>
            <label className="row">
              <input
                type="checkbox"
                checked={form.actif}
                onChange={(e) => setForm({ ...form, actif: e.target.checked })}
              />
              <span>Active</span>
            </label>
            <button className="btn" type="submit">
              Ajouter
            </button>
            {status ? <p className="muted">{status}</p> : null}
          </form>
        </div>

        <div className="card stack">
          <h2>Liste</h2>
          <div className="stack">
            {boutiques.map((b) => (
              <div key={b.id} className="row space-between">
                <div>
                  <div>{b.nom}</div>
                  <div className="muted">{b.ville}</div>
                </div>
                <span className={`badge ${b.actif ? "success" : "danger"}`}>
                  {b.actif ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
            {!boutiques.length ? (
              <p className="muted">Aucune boutique pour le moment.</p>
            ) : null}
          </div>
        </div>
      </main>
    </RoleGuard>
  );
}
