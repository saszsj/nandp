"use client";

import { use, useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Produit } from "@/lib/types";
import KioskCarousel from "@/components/KioskCarousel";

type Props = {
  params: Promise<{ boutiqueId: string }>;
};

export default function KioskPage({ params }: Props) {
  const { boutiqueId } = use(params);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const manifestHref = `/kiosk/${boutiqueId}/manifest.webmanifest`;
    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    link.href = manifestHref;
  }, [boutiqueId]);

  useEffect(() => {
    const q = query(
      collection(db, "produits"),
      where("boutiqueIds", "array-contains", boutiqueId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((docSnap) => ({
        ...(docSnap.data() as Produit),
        id: docSnap.id,
      }));
      setProduits(items);
      setLoading(false);
    });
    return () => unsub();
  }, [boutiqueId]);

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
