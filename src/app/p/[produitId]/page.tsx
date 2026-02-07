"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Produit } from "@/lib/types";
import { requestFcmToken } from "@/lib/fcm";

type Props = {
  params: { produitId: string };
};

export default function PublicProduitPage({ params }: Props) {
  const [produit, setProduit] = useState<Produit | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [form, setForm] = useState({
    nom: "",
    email: "",
    telephone: "",
    taille: "",
    quantite: 1,
    notifyEmail: true,
    notifyPush: false,
  });

  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db, "produits", params.produitId));
      if (snap.exists()) {
        setProduit({ ...(snap.data() as Produit), id: snap.id });
      }
      setLoading(false);
    };
    load();
  }, [params.produitId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!produit) return;
    setStatus("Envoi en cours...");
    let pushToken: string | null = null;
    if (form.notifyPush) {
      pushToken = await requestFcmToken();
    }
    await addDoc(collection(db, "reservations"), {
      produitId: produit.id,
      boutiqueId: produit.boutiqueIds?.[0] || "",
      nom: form.nom,
      email: form.email,
      telephone: form.telephone || "",
      taille: form.taille,
      quantite: Number(form.quantite),
      acompte: 0,
      statut: "en_attente",
      notifyEmail: form.notifyEmail,
      notifyPush: form.notifyPush,
      pushToken,
      createdAt: serverTimestamp(),
    });
    setStatus("Reservation envoyee. Vous serez notifie.");
    setForm((prev) => ({ ...prev, nom: "", email: "", telephone: "", taille: "" }));
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">Chargement...</div>
      </div>
    );
  }

  if (!produit) {
    return (
      <div className="container">
        <div className="card">Produit introuvable.</div>
      </div>
    );
  }

  return (
    <main className="container stack">
      <div className="card stack">
        <h1>{produit.nom}</h1>
        <p className="muted">{produit.description}</p>
        <div className="row">
          <span className="badge">{produit.categorie}</span>
          <span className="badge">{produit.prix.toFixed(2)} €</span>
        </div>
        {produit.photos?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={produit.photos[0]}
            alt={produit.nom}
            style={{ width: "100%", borderRadius: 12 }}
          />
        ) : null}
      </div>

      <form className="card stack" onSubmit={handleSubmit}>
        <h2>Reserver</h2>
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
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div className="stack">
          <label className="label">Telephone (optionnel)</label>
          <input
            className="input"
            value={form.telephone}
            onChange={(e) => setForm({ ...form, telephone: e.target.value })}
          />
        </div>
        <div className="stack">
          <label className="label">Taille</label>
          <input
            className="input"
            value={form.taille}
            onChange={(e) => setForm({ ...form, taille: e.target.value })}
            required
          />
        </div>
        <div className="stack">
          <label className="label">Quantite</label>
          <input
            className="input"
            type="number"
            min={1}
            value={form.quantite}
            onChange={(e) =>
              setForm({ ...form, quantite: Number(e.target.value) })
            }
            required
          />
        </div>
        <div className="row">
          <label className="row">
            <input
              type="checkbox"
              checked={form.notifyEmail}
              onChange={(e) =>
                setForm({ ...form, notifyEmail: e.target.checked })
              }
            />
            <span>Email</span>
          </label>
          <label className="row">
            <input
              type="checkbox"
              checked={form.notifyPush}
              onChange={(e) =>
                setForm({ ...form, notifyPush: e.target.checked })
              }
            />
            <span>Push</span>
          </label>
        </div>
        <button className="btn" type="submit">
          Envoyer
        </button>
        {status ? <p className="muted">{status}</p> : null}
      </form>
    </main>
  );
}
