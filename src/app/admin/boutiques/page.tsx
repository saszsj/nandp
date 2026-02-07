"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import RoleGuard from "@/components/RoleGuard";
import AdminNav from "@/components/AdminNav";
import { db } from "@/lib/firebase";
import type { Boutique } from "@/lib/types";

export default function AdminBoutiquesPage() {
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [form, setForm] = useState({ nom: "", ville: "", actif: true });
  const [status, setStatus] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "boutiques"), orderBy("nom"));
    const unsub = onSnapshot(q, (snap) => {
      setBoutiques(
        snap.docs.map((docSnap) => ({
          ...(docSnap.data() as Boutique),
          id: docSnap.id,
        }))
      );
    });
    return () => unsub();
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    const payload = {
      nom: form.nom,
      ville: form.ville,
      actif: form.actif,
      ...(editingId ? {} : { createdAt: serverTimestamp() }),
    };

    if (editingId) {
      await updateDoc(doc(db, "boutiques", editingId), payload);
      setStatus("Boutique mise a jour.");
    } else {
      await addDoc(collection(db, "boutiques"), payload);
      setStatus("Boutique ajoutee.");
    }
    setForm({ nom: "", ville: "", actif: true });
    setEditingId(null);
  };

  const handleEdit = (boutique: Boutique) => {
    setEditingId(boutique.id);
    setForm({
      nom: boutique.nom,
      ville: boutique.ville,
      actif: boutique.actif,
    });
    setStatus(null);
  };

  const handleDelete = async (id: string) => {
    setStatus(null);
    await deleteDoc(doc(db, "boutiques", id));
    if (editingId === id) {
      setForm({ nom: "", ville: "", actif: true });
      setEditingId(null);
    }
    setStatus("Boutique supprimee.");
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
            <div className="row">
              <button className="btn" type="submit">
                {editingId ? "Mettre a jour" : "Ajouter"}
              </button>
              {editingId ? (
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => {
                    setForm({ nom: "", ville: "", actif: true });
                    setEditingId(null);
                  }}
                >
                  Annuler
                </button>
              ) : null}
            </div>
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
                <div className="row">
                  <span className={`badge ${b.actif ? "success" : "danger"}`}>
                    {b.actif ? "Active" : "Inactive"}
                  </span>
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => handleEdit(b)}
                  >
                    Editer
                  </button>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => handleDelete(b.id)}
                  >
                    Supprimer
                  </button>
                </div>
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
