"use client";

import { use, useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Boutique, Produit } from "@/lib/types";

type Props = {
  params: Promise<{ boutiqueId: string }>;
};

export default function ShopPage({ params }: Props) {
  const { boutiqueId } = use(params);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [boutique, setBoutique] = useState<Boutique | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "produits"),
      where("boutiqueIds", "array-contains", boutiqueId)
    );
    const unsub = onSnapshot(q, (snap) => {
      setProduits(
        snap.docs.map((docSnap) => ({
          ...(docSnap.data() as Produit),
          id: docSnap.id,
        }))
      );
      setLoading(false);
    });
    return () => unsub();
  }, [boutiqueId]);

  useEffect(() => {
    const loadBoutique = async () => {
      const snap = await getDoc(doc(db, "boutiques", boutiqueId));
      if (snap.exists()) {
        setBoutique({ ...(snap.data() as Boutique), id: snap.id });
      } else {
        setBoutique(null);
      }
    };
    loadBoutique();
  }, [boutiqueId]);

  const cards = useMemo(() => produits, [produits]);

  if (loading) {
    return (
      <div className="container">
        <div className="card">Chargement...</div>
      </div>
    );
  }

  return (
    <main className="container stack">
      <h1>Articles du magasin</h1>
      {boutique ? (
        <div className="card stack">
          <h2>{boutique.nom}</h2>
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
      <div className="stack">
        {cards.map((p) => (
          <div key={p.id} className="card row space-between">
            <div className="row" style={{ gap: 12 }}>
              <div
                style={{
                  width: 88,
                  height: 88,
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
              <div className="stack" style={{ gap: 4 }}>
                <div style={{ fontWeight: 600 }}>{p.nom}</div>
                <div className="muted">{p.description}</div>
                <div className="row">
                  <span className="badge">{p.categorie}</span>
                  <span className="badge">{p.prix.toFixed(2)} €</span>
                </div>
              </div>
            </div>
            <a className="btn" href={`/p/${p.id}`}>
              Reserver
            </a>
          </div>
        ))}
        {!cards.length ? (
          <div className="card">Aucun article disponible.</div>
        ) : null}
      </div>
    </main>
  );
}
