"use client";

import { useEffect, useMemo, useState } from "react";
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
import type { Boutique, Produit } from "@/lib/types";

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

export default function AdminProduitsPage() {
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
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
    boutiqueIds: [] as string[],
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
    const unsubBoutiques = onSnapshot(
      query(collection(db, "boutiques"), orderBy("nom")),
      (snap) =>
        setBoutiques(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Boutique) }))
        )
    );
    const unsubProduits = onSnapshot(
      query(collection(db, "produits"), orderBy("createdAt", "desc")),
      (snap) =>
        setProduits(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Produit) }))
        )
    );
    return () => {
      unsubBoutiques();
      unsubProduits();
    };
  }, []);

  const selectedBoutiques = useMemo(
    () => boutiques.filter((b) => form.boutiqueIds.includes(b.id)),
    [boutiques, form.boutiqueIds]
  );

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
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
      boutiqueIds: form.boutiqueIds,
      boutiques: selectedBoutiques.map((b) => ({
        id: b.id,
        nom: b.nom,
        ville: b.ville,
      })),
      createdBy: "admin",
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
      boutiqueIds: [],
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

  const toggleBoutique = (id: string) => {
    setForm((prev) => {
      const exists = prev.boutiqueIds.includes(id);
      return {
        ...prev,
        boutiqueIds: exists
          ? prev.boutiqueIds.filter((b) => b !== id)
          : [...prev.boutiqueIds, id],
      };
    });
  };

  return (
    <RoleGuard allow={["admin"]} redirectTo="/admin/login">
      <main className="container stack">
        <AdminNav />
        <div className="card stack">
          <h1>Produits</h1>
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
                Ameliorer avec IA (mock)
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
            <div className="stack">
              <label className="label">Diffusion boutiques</label>
              <div className="stack">
                {boutiques.map((b) => (
                  <label key={b.id} className="row">
                    <input
                      type="checkbox"
                      checked={form.boutiqueIds.includes(b.id)}
                      onChange={() => toggleBoutique(b.id)}
                    />
                    <span>
                      {b.nom} - {b.ville}
                    </span>
                  </label>
                ))}
                {!boutiques.length ? (
                  <p className="muted">Aucune boutique disponible.</p>
                ) : null}
              </div>
            </div>
            <button className="btn" type="submit">
              Ajouter
            </button>
            {status ? <p className="muted">{status}</p> : null}
          </form>
        </div>

        <div className="card stack">
          <h2>Liste</h2>
          <div className="stack">
            {produits.map((p) => (
              <div key={p.id} className="row space-between">
                <div>
                  <div>{p.nom}</div>
                  <div className="muted">{p.categorie}</div>
                </div>
                <span className="badge">{p.prix.toFixed(2)} €</span>
              </div>
            ))}
            {!produits.length ? (
              <p className="muted">Aucun produit pour le moment.</p>
            ) : null}
          </div>
        </div>
      </main>
    </RoleGuard>
  );
}
