"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import RoleGuard from "@/components/RoleGuard";
import GerantNav from "@/components/GerantNav";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import type { Boutique, Produit, Reservation } from "@/lib/types";

function parseStockParTaille(raw: string) {
  const result: Record<string, number> = {};
  raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [taille, qty] = part.split("=").map((s) => s.trim());
      if (taille && qty && !Number.isNaN(Number(qty))) {
        result[taille] = Number(qty);
      }
    });
  return result;
}

export default function GerantDashboardPage() {
  const { user, profile } = useAuth();
  const [boutique, setBoutique] = useState<Boutique | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [aiVariants, setAiVariants] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [form, setForm] = useState({
    nom: "",
    description: "",
    photos: "",
    prix: 0,
    categorie: "promo",
    stockTotal: 0,
    stockParTaille: "",
    status: "disponible",
    joursAvantArrivage: 0,
  });
  const photoList = useMemo(
    () =>
      form.photos
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean),
    [form.photos]
  );

  useEffect(() => {
    if (!profile?.boutiqueId) return;
    const loadBoutique = async () => {
      const snap = await getDoc(doc(db, "boutiques", profile.boutiqueId || ""));
      if (snap.exists()) {
        setBoutique({ ...(snap.data() as Boutique), id: snap.id });
      }
    };
    loadBoutique();
  }, [profile?.boutiqueId]);

  useEffect(() => {
    if (!profile?.boutiqueId) return;
    const qReservations = query(
      collection(db, "reservations"),
      where("boutiqueId", "==", profile.boutiqueId),
      orderBy("createdAt", "desc")
    );
    const unsubRes = onSnapshot(qReservations, (snap) => {
      setReservations(
        snap.docs.map((d) => ({ ...(d.data() as Reservation), id: d.id }))
      );
    });
    const qProduits = query(
      collection(db, "produits"),
      where("boutiqueIds", "array-contains", profile.boutiqueId)
    );
    const unsubProd = onSnapshot(qProduits, (snap) => {
      setProduits(
        snap.docs.map((d) => ({ ...(d.data() as Produit), id: d.id }))
      );
    });
    return () => {
      unsubRes();
      unsubProd();
    };
  }, [profile?.boutiqueId]);

  const counts = useMemo(() => {
    const mine = produits.filter((p) => p.createdBy === user?.uid);
    return {
      promo: mine.filter((p) => p.categorie === "promo").length,
      nouveaute: mine.filter((p) => p.categorie === "nouveaute").length,
    };
  }, [produits, user?.uid]);

  const limitReached =
    (form.categorie === "promo" && counts.promo >= 3) ||
    (form.categorie === "nouveaute" && counts.nouveaute >= 3);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !profile?.boutiqueId || !boutique) return;
    if (limitReached) {
      setStatus("Limite atteinte: 3 promos ou 3 nouveautes max.");
      return;
    }
    setStatus(null);
    const stockParTaille = parseStockParTaille(form.stockParTaille);
    const photos = form.photos
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    await addDoc(collection(db, "produits"), {
      nom: form.nom,
      description: form.description,
      photos: photos.length ? photos : aiVariants,
      prix: Number(form.prix),
      categorie: form.categorie,
      stockTotal: Number(form.stockTotal),
      stockParTaille,
      status: form.status,
      joursAvantArrivage:
        form.status === "arrivage" ? Number(form.joursAvantArrivage) : 0,
      boutiqueIds: [profile.boutiqueId],
      boutiques: [
        {
          id: boutique.id,
          nom: boutique.nom,
          ville: boutique.ville,
        },
      ],
      createdBy: user.uid,
      ai: {
        enabled: aiVariants.length > 0,
        status: aiVariants.length > 0 ? "done" : "idle",
        variants: aiVariants,
      },
      createdAt: serverTimestamp(),
    });
    setStatus("Produit ajoute.");
    setForm({
      nom: "",
      description: "",
      photos: "",
      prix: 0,
      categorie: "promo",
      stockTotal: 0,
      stockParTaille: "",
      status: "disponible",
      joursAvantArrivage: 0,
    });
    setAiVariants([]);
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setUploadError(null);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const body = new FormData();
        body.append("file", file);
        body.append("filename", file.name);
        const response = await fetch("/api/blob", { method: "POST", body });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Upload failed.");
        }
        const data = await response.json();
        urls.push(data.url);
      }
      setForm((prev) => ({
        ...prev,
        photos: [prev.photos, ...urls].filter(Boolean).join(", "),
      }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleMockAI = () => {
    setAiVariants([
      "https://placehold.co/600x800?text=AI+1",
      "https://placehold.co/600x800?text=AI+2",
      "https://placehold.co/600x800?text=AI+3",
    ]);
  };

  return (
    <RoleGuard allow={["gerant", "admin"]} redirectTo="/gerant/login">
      <main className="container stack">
        <GerantNav />
        <div className="card stack">
          <h1>Dashboard gerant</h1>
          <p className="muted">
            Boutique: {boutique ? `${boutique.nom} - ${boutique.ville}` : "..."}
          </p>
          <div className="row">
            <span className="badge">Promos: {counts.promo}/3</span>
            <span className="badge">Nouveautes: {counts.nouveaute}/3</span>
          </div>
        </div>

        <div className="card stack">
          <h2>Ajouter un produit</h2>
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
              <label className="label">Description</label>
              <textarea
                className="textarea"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                required
              />
            </div>
            <div className="stack">
              <label className="label">Photos (URLs, separées par virgules)</label>
              <input
                className="input"
                value={form.photos}
                onChange={(e) => setForm({ ...form, photos: e.target.value })}
              />
              {photoList.length ? (
                <div className="row" style={{ flexWrap: "wrap" }}>
                  {photoList.map((url) => (
                    <div key={url} className="card stack" style={{ width: 140 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt="Apercu"
                        style={{
                          width: "100%",
                          height: 140,
                          objectFit: "cover",
                          borderRadius: 10,
                        }}
                      />
                      <button
                        className="btn ghost"
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            photos: photoList
                              .filter((item) => item !== url)
                              .join(", "),
                          }))
                        }
                      >
                        Supprimer
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <label className="label">Upload images (Vercel Blob)</label>
              <input
                className="input"
                type="file"
                accept="image/*"
                multiple
                onChange={handleUpload}
                disabled={uploading}
              />
              {uploading ? <p className="muted">Uploading...</p> : null}
              {uploadError ? <div className="alert danger">{uploadError}</div> : null}
              <button
                className="btn secondary"
                type="button"
                onClick={handleMockAI}
              >
                Ameliorer avec IA (payant, mock)
              </button>
              {aiVariants.length ? (
                <div className="row">
                  {aiVariants.map((url) => (
                    <span key={url} className="badge">
                      {url.split("text=")[1] || "AI"}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="row">
              <div className="stack" style={{ flex: 1 }}>
                <label className="label">Prix (€)</label>
                <input
                  className="input"
                  type="number"
                  value={form.prix}
                  onChange={(e) =>
                    setForm({ ...form, prix: Number(e.target.value) })
                  }
                  min={0}
                  required
                />
              </div>
              <div className="stack" style={{ flex: 1 }}>
                <label className="label">Categorie</label>
                <select
                  className="select"
                  value={form.categorie}
                  onChange={(e) =>
                    setForm({ ...form, categorie: e.target.value })
                  }
                >
                  <option value="promo">Promo</option>
                  <option value="nouveaute">Nouveaute</option>
                </select>
              </div>
            </div>
            <div className="row">
              <div className="stack" style={{ flex: 1 }}>
                <label className="label">Stock total</label>
                <input
                  className="input"
                  type="number"
                  value={form.stockTotal}
                  onChange={(e) =>
                    setForm({ ...form, stockTotal: Number(e.target.value) })
                  }
                  min={0}
                />
              </div>
              <div className="stack" style={{ flex: 1 }}>
                <label className="label">Stock par taille (ex: S=2,M=4)</label>
                <input
                  className="input"
                  value={form.stockParTaille}
                  onChange={(e) =>
                    setForm({ ...form, stockParTaille: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="row">
              <div className="stack" style={{ flex: 1 }}>
                <label className="label">Status</label>
                <select
                  className="select"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="disponible">Disponible</option>
                  <option value="soldout">Soldout</option>
                  <option value="arrivage">Arrivage</option>
                </select>
              </div>
              <div className="stack" style={{ flex: 1 }}>
                <label className="label">Jours avant arrivage</label>
                <input
                  className="input"
                  type="number"
                  value={form.joursAvantArrivage}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      joursAvantArrivage: Number(e.target.value),
                    })
                  }
                  min={0}
                />
              </div>
            </div>
            <button className="btn" type="submit" disabled={limitReached}>
              Ajouter
            </button>
            {limitReached ? (
              <p className="muted">
                Limite atteinte: 3 promos ou 3 nouveautes max.
              </p>
            ) : null}
            {status ? <p className="muted">{status}</p> : null}
          </form>
        </div>

        <div className="card stack">
          <h2>Reservations</h2>
          <div className="stack">
            {reservations.map((r) => (
              <div key={r.id} className="row space-between">
                <div>
                  <div>{r.nom}</div>
                  <div className="muted">{r.email}</div>
                </div>
                <span className="badge">{r.statut}</span>
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
