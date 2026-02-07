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
import { auth } from "@/lib/firebase";
import type { Boutique } from "@/lib/types";

export default function AdminBoutiquesPage() {
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [form, setForm] = useState({
    nom: "",
    ville: "",
    adresse: "",
    telephone: "",
    actif: true,
  });
  const [status, setStatus] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [managerTargetId, setManagerTargetId] = useState<string | null>(null);
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [managerStatus, setManagerStatus] = useState<string | null>(null);
  const [managerLoading, setManagerLoading] = useState(false);
  const [origin, setOrigin] = useState("");

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

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    const payload = {
      nom: form.nom,
      ville: form.ville,
      adresse: form.adresse || "",
      telephone: form.telephone || "",
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
    setForm({ nom: "", ville: "", adresse: "", telephone: "", actif: true });
    setEditingId(null);
  };

  const handleEdit = (boutique: Boutique) => {
    setEditingId(boutique.id);
    setForm({
      nom: boutique.nom,
      ville: boutique.ville,
      adresse: boutique.adresse || "",
      telephone: boutique.telephone || "",
      actif: boutique.actif,
    });
    setStatus(null);
  };

  const handleDelete = async (id: string) => {
    setStatus(null);
    await deleteDoc(doc(db, "boutiques", id));
    if (editingId === id) {
      setForm({ nom: "", ville: "", adresse: "", telephone: "", actif: true });
      setEditingId(null);
    }
    setStatus("Boutique supprimee.");
  };

  const handleCopyLink = async (id: string) => {
    const origin = window.location.origin;
    const link = `${origin}/kiosk/${id}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
    } catch (error) {
      console.error("Copy failed.", error);
      setStatus(link);
    }
  };

  const handleSetManager = async (boutique: Boutique) => {
    setManagerStatus(null);
    if (!managerEmail || !managerPassword) {
      setManagerStatus("Email et mot de passe requis.");
      return;
    }
    if (managerPassword.length < 6) {
      setManagerStatus("Mot de passe trop court (min 6).");
      return;
    }
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      setManagerStatus("Session admin invalide.");
      return;
    }
    setManagerLoading(true);
    try {
      const response = await fetch("/api/admin/gerant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          boutiqueId: boutique.id,
          email: managerEmail,
          password: managerPassword,
          displayName: boutique.nom,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Creation du gerant echouee.");
      }
      setManagerStatus("Gerant mis a jour.");
      setManagerPassword("");
    } catch (error) {
      setManagerStatus(
        error instanceof Error ? error.message : "Creation du gerant echouee."
      );
    } finally {
      setManagerLoading(false);
    }
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
            <div className="stack">
              <label className="label">Adresse</label>
              <input
                className="input"
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
              />
            </div>
            <div className="stack">
              <label className="label">Telephone</label>
              <input
                className="input"
                value={form.telephone}
                onChange={(e) =>
                  setForm({ ...form, telephone: e.target.value })
                }
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
                    setForm({
                      nom: "",
                      ville: "",
                      adresse: "",
                      telephone: "",
                      actif: true,
                    });
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
                  {b.adresse ? <div className="muted">{b.adresse}</div> : null}
                  {b.telephone ? <div className="muted">{b.telephone}</div> : null}
                </div>
                <div className="row">
                  <span className={`badge ${b.actif ? "success" : "danger"}`}>
                    {b.actif ? "Active" : "Inactive"}
                  </span>
                  <input
                    className="input"
                    style={{ width: 260 }}
                    readOnly
                    value={`${origin}/kiosk/${b.id}`}
                  />
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => handleCopyLink(b.id)}
                  >
                    Copier lien tablette
                  </button>
                  {copiedId === b.id ? (
                    <span className="badge success">Copie</span>
                  ) : null}
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => {
                      setManagerTargetId(b.id);
                      setManagerEmail("");
                      setManagerPassword("");
                      setManagerStatus(null);
                    }}
                  >
                    Gerant login
                  </button>
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
          {managerTargetId ? (
            <div className="card stack">
              <h3>
                Gerant pour{" "}
                {boutiques.find((b) => b.id === managerTargetId)?.nom || "boutique"}
              </h3>
              <div className="stack">
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                />
              </div>
              <div className="stack">
                <label className="label">Mot de passe</label>
                <input
                  className="input"
                  type="password"
                  value={managerPassword}
                  onChange={(e) => setManagerPassword(e.target.value)}
                />
              </div>
              <div className="row">
                <button
                  className="btn"
                  type="button"
                  onClick={() =>
                    {
                      const target = boutiques.find(
                        (b) => b.id === managerTargetId
                      );
                      if (!target) {
                        setManagerStatus("Boutique introuvable.");
                        return;
                      }
                      handleSetManager(target);
                    }
                  }
                  disabled={managerLoading}
                >
                  {managerLoading ? "En cours..." : "Enregistrer"}
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => setManagerTargetId(null)}
                >
                  Fermer
                </button>
              </div>
              {managerStatus ? <p className="muted">{managerStatus}</p> : null}
            </div>
          ) : null}
        </div>
      </main>
    </RoleGuard>
  );
}
