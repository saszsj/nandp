"use client";

import { use, useEffect, useMemo, useState } from "react";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Boutique, Produit } from "@/lib/types";
import { requestFcmToken } from "@/lib/fcm";

type Props = {
  params: Promise<{ produitId: string }>;
};

export default function PublicProduitPage({ params }: Props) {
  const { produitId } = use(params);
  const [produit, setProduit] = useState<Produit | null>(null);
  const [boutique, setBoutique] = useState<Boutique | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [savedReservations, setSavedReservations] = useState<
    {
      id: string;
      produitId: string;
      produitNom: string;
      boutiqueId: string;
      boutiqueNom?: string;
      taille: string;
      quantite: number;
      createdAt: number;
    }[]
  >([]);
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
    const stored = window.localStorage.getItem("reservations");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSavedReservations(parsed);
        }
      } catch (error) {
        console.error("Failed to read reservations from storage.", error);
      }
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db, "produits", produitId));
      if (snap.exists()) {
        setProduit({ ...(snap.data() as Produit), id: snap.id });
      }
      setLoading(false);
    };
    load();
  }, [produitId]);

  useEffect(() => {
    if (!produit?.boutiqueIds?.[0]) {
      setBoutique(null);
      return;
    }
    const loadBoutique = async () => {
      const snap = await getDoc(doc(db, "boutiques", produit.boutiqueIds[0]));
      if (snap.exists()) {
        setBoutique({ ...(snap.data() as Boutique), id: snap.id });
      }
    };
    loadBoutique();
  }, [produit?.boutiqueIds]);

  const reservationsForBoutique = useMemo(() => {
    if (!boutique?.id) return [];
    return savedReservations.filter((r) => r.boutiqueId === boutique.id);
  }, [savedReservations, boutique?.id]);

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
      statut: "en_attente",
      notifyEmail: form.notifyEmail,
      notifyPush: form.notifyPush,
      pushToken,
      createdAt: serverTimestamp(),
    });
    setStatus("Reservation envoyee. Vous serez notifie.");
    setSubmitted(true);
    const newReservation = {
      id: `${Date.now()}`,
      produitId: produit.id,
      produitNom: produit.nom,
      boutiqueId: produit.boutiqueIds?.[0] || "",
      boutiqueNom: boutique?.nom,
      taille: form.taille,
      quantite: Number(form.quantite),
      createdAt: Date.now(),
    };
    const nextReservations = [newReservation, ...savedReservations].slice(0, 20);
    setSavedReservations(nextReservations);
    window.localStorage.setItem("reservations", JSON.stringify(nextReservations));
    setForm((prev) => ({
      ...prev,
      nom: "",
      email: "",
      telephone: "",
      taille: "",
    }));
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

      {boutique ? (
        <div className="card stack">
          <h2>Store</h2>
          <div>{boutique.nom}</div>
          <div className="muted">{boutique.ville}</div>
          {boutique.adresse ? (
            <div className="muted">{boutique.adresse}</div>
          ) : null}
          {boutique.telephone ? (
            <div className="muted">{boutique.telephone}</div>
          ) : null}
          <span className={`badge ${boutique.actif ? "success" : "danger"}`}>
            {boutique.actif ? "Open" : "Closed"}
          </span>
        </div>
      ) : null}

      {submitted ? (
        <div className="card stack">
          <h2>{status}</h2>
          <button
            className="btn secondary"
            type="button"
            onClick={() => history.back()}
          >
            Retour
          </button>
        </div>
      ) : (
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
      )}

      {reservationsForBoutique.length ? (
        <div className="card stack">
          <h2>Saved reservations</h2>
          <div className="stack">
            {reservationsForBoutique.map((r) => (
              <div key={r.id} className="row space-between">
                <div>
                  <div>{r.produitNom}</div>
                  <div className="muted">
                    Size: {r.taille} • Qty: {r.quantite}
                  </div>
                </div>
                <span className="badge">
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </main>
  );
}
