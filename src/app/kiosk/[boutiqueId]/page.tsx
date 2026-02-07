"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Produit } from "@/lib/types";
import KioskCarousel from "@/components/KioskCarousel";

type Props = {
  params: { boutiqueId: string };
};

export default function KioskPage({ params }: Props) {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "produits"),
      where("boutiqueIds", "array-contains", params.boutiqueId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Produit),
      }));
      setProduits(items);
      setLoading(false);
    });
    return () => unsub();
  }, [params.boutiqueId]);

  return (
    <div className="kiosk">
      {loading ? (
        <div className="kiosk-card">Chargement...</div>
      ) : (
        <KioskCarousel produits={produits} />
      )}
      <div className="kiosk-banner">
        Rejoignez N&P pour booster vos ventes. Demandez une demo.
      </div>
    </div>
  );
}
