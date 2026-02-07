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
  updateDoc,
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
  const [formOpen, setFormOpen] = useState(false);
  const [reservationStatus, setReservationStatus] = useState<string | null>(null);
  const [reservationFormOpen, setReservationFormOpen] = useState(false);
  const [reservationForm, setReservationForm] = useState({
    produitId: "",
    nom: "",
    email: "",
    telephone: "",
    taille: "",
    quantite: 1,
  });
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

  const productMap = useMemo(() => {
    return new Map(produits.map((p) => [p.id, p]));
  }, [produits]);

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

  const updateReservation = async (id: string, data: Partial<Reservation>) => {
    await updateDoc(doc(db, "reservations", id), data);
  };

  const handleMarkDelivered = async (reservation: Reservation) => {
    const confirmed = window.confirm("Confirmer la livraison et archiver ?");
    if (!confirmed) return;
    await updateReservation(reservation.id, {
      statut: "livree",
      archived: true,
    });
  };

  const handleReserveForClient = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile?.boutiqueId || !reservationForm.produitId) {
      setReservationStatus("Produit requis.");
      return;
    }
    setReservationStatus(null);
    await addDoc(collection(db, "reservations"), {
      produitId: reservationForm.produitId,
      boutiqueId: profile.boutiqueId,
      nom: reservationForm.nom,
      email: reservationForm.email,
      telephone: reservationForm.telephone || "",
      taille: reservationForm.taille,
      quantite: Number(reservationForm.quantite),
      statut: "en_attente",
      notifyEmail: true,
      notifyPush: false,
      createdAt: serverTimestamp(),
    });
    setReservationStatus("Reservation creee.");
    setReservationForm({
      produitId: "",
      nom: "",
      email: "",
      telephone: "",
      taille: "",
      quantite: 1,
    });
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
          {boutique?.adresse ? <p className="muted">{boutique.adresse}</p> : null}
          {boutique?.telephone ? (
            <p className="muted">{boutique.telephone}</p>
          ) : null}
          <div className="row">
            <span className="badge">Promos: {counts.promo}/3</span>
            <span className="badge">Nouveautes: {counts.nouveaute}/3</span>
          </div>
        </div>

        <div className="card stack">
          <div className="row space-between">
            <h2>Ajouter un produit</h2>
            <button
              className="btn"
              type="button"
              onClick={() => setFormOpen((prev) => !prev)}
            >
              {formOpen ? "Fermer" : "Afficher le formulaire"}
            </button>
          </div>
          {formOpen ? (
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
          ) : null}
        </div>

        <div className="card stack">
          <h2>Produits</h2>
          <div className="stack">
            {produits.map((p) => (
              <div
                key={p.id}
                className="card"
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr auto",
                  gap: 16,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 12,
                    background: "#f3f4f6",
                    overflow: "hidden",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {p.photos?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.photos[0]}
                      alt={p.nom}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span className="muted">No photo</span>
                  )}
                </div>
                <div className="stack" style={{ gap: 6 }}>
                  <div style={{ fontWeight: 600 }}>{p.nom}</div>
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

        <div className="card stack">
          <div className="row space-between">
            <h2>Reserver pour un client</h2>
            <button
              className="btn"
              type="button"
              onClick={() => setReservationFormOpen((prev) => !prev)}
            >
              {reservationFormOpen ? "Fermer" : "Afficher le formulaire"}
            </button>
          </div>
          {reservationFormOpen ? (
            <form className="stack" onSubmit={handleReserveForClient}>
              <div className="stack">
                <label className="label">Produit</label>
                <div className="stack">
                  {produits.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="card"
                      onClick={() =>
                        setReservationForm((prev) => ({
                          ...prev,
                          produitId: p.id,
                        }))
                      }
                      style={{
                        display: "grid",
                        gridTemplateColumns: "64px 1fr auto",
                        gap: 12,
                        alignItems: "center",
                        textAlign: "left",
                        border:
                          reservationForm.produitId === p.id
                            ? "2px solid #0a0a0a"
                            : undefined,
                      }}
                    >
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 10,
                          background: "#f3f4f6",
                          overflow: "hidden",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        {p.photos?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.photos[0]}
                            alt={p.nom}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <span className="muted">No photo</span>
                        )}
                      </div>
                      <div className="stack" style={{ gap: 4 }}>
                        <div style={{ fontWeight: 600 }}>{p.nom}</div>
                        <div className="muted">{p.categorie}</div>
                      </div>
                      <span className="badge">{p.prix.toFixed(2)} €</span>
                    </button>
                  ))}
                  {!produits.length ? (
                    <p className="muted">Aucun produit disponible.</p>
                  ) : null}
                </div>
              </div>
            <div className="stack">
              <label className="label">Nom client</label>
              <input
                className="input"
                value={reservationForm.nom}
                onChange={(e) =>
                  setReservationForm((prev) => ({
                    ...prev,
                    nom: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="stack">
              <label className="label">Email client</label>
              <input
                className="input"
                type="email"
                value={reservationForm.email}
                onChange={(e) =>
                  setReservationForm((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="stack">
              <label className="label">Telephone</label>
              <input
                className="input"
                value={reservationForm.telephone}
                onChange={(e) =>
                  setReservationForm((prev) => ({
                    ...prev,
                    telephone: e.target.value,
                  }))
                }
              />
            </div>
            <div className="row">
              <div className="stack" style={{ flex: 1 }}>
                <label className="label">Taille</label>
                <input
                  className="input"
                  value={reservationForm.taille}
                  onChange={(e) =>
                    setReservationForm((prev) => ({
                      ...prev,
                      taille: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="stack" style={{ flex: 1 }}>
                <label className="label">Quantite</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={reservationForm.quantite}
                  onChange={(e) =>
                    setReservationForm((prev) => ({
                      ...prev,
                      quantite: Number(e.target.value),
                    }))
                  }
                  required
                />
              </div>
            </div>
            <button className="btn" type="submit">
              Reserver
            </button>
            {reservationStatus ? (
              <p className="muted">{reservationStatus}</p>
            ) : null}
            </form>
          ) : null}
        </div>

        <div className="card stack">
          <h2>Reservations</h2>
          <div className="stack">
            {reservations.filter((r) => !r.archived).map((r) => (
              <div key={r.id} className="card stack">
                <div className="row space-between">
                  <div>
                    <div>{r.nom}</div>
                    <div className="muted">{r.email}</div>
                  </div>
                  <span
                    className={`badge ${
                      r.statut === "validee"
                        ? "success"
                        : r.statut === "refusee"
                        ? "danger"
                        : r.statut === "en_livraison"
                        ? "warning"
                        : r.statut === "livree"
                        ? "success"
                        : "warning"
                    }`}
                  >
                    {r.statut}
                  </span>
                </div>
                <div className="row">
                  <span className="badge">Taille: {r.taille}</span>
                  <span className="badge">Qty: {r.quantite}</span>
                  {r.tracking ? (
                    <span className="badge">Tracking: {r.tracking}</span>
                  ) : null}
                </div>
                {productMap.get(r.produitId) ? (
                  <div className="row" style={{ gap: 12 }}>
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 10,
                        background: "#f3f4f6",
                        overflow: "hidden",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      {productMap.get(r.produitId)?.photos?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={productMap.get(r.produitId)?.photos?.[0]}
                          alt={productMap.get(r.produitId)?.nom || "Produit"}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <span className="muted">No photo</span>
                      )}
                    </div>
                    <div className="stack" style={{ gap: 4 }}>
                      <div style={{ fontWeight: 600 }}>
                        {productMap.get(r.produitId)?.nom}
                      </div>
                      <div className="muted">
                        {productMap.get(r.produitId)?.categorie}
                      </div>
                    </div>
                    <span className="badge">
                      {productMap.get(r.produitId)?.prix?.toFixed(2)} €
                    </span>
                  </div>
                ) : null}
                <div className="row">
                  <button
                    className={`btn success ${
                      r.statut === "validee" ? "active" : ""
                    }`}
                    onClick={() => updateReservation(r.id, { statut: "validee" })}
                  >
                    Valider
                  </button>
                  <button
                    className={`btn danger ${
                      r.statut === "refusee" ? "active" : ""
                    }`}
                    onClick={() => updateReservation(r.id, { statut: "refusee" })}
                  >
                    Refuser
                  </button>
                  <button
                    className={`btn warning ${
                      r.statut === "livree" ? "active" : ""
                    }`}
                    onClick={() => handleMarkDelivered(r)}
                  >
                    Livre
                  </button>
                </div>
              </div>
              ))}
            {!reservations.filter((r) => !r.archived).length ? (
              <p className="muted">Aucune reservation pour le moment.</p>
            ) : null}
          </div>
        </div>
      </main>
    </RoleGuard>
  );
}
