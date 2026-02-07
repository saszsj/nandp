"use client";

import { useEffect, useMemo, useState } from "react";
import type { Produit } from "@/lib/types";

type Props = {
  produits: Produit[];
};

function buildStatusText(produit: Produit) {
  if (produit.status === "soldout") return "Soldout";
  if (produit.status === "arrivage") {
    const jours = produit.joursAvantArrivage ?? 0;
    return `-${jours} jours avant arrivage`;
  }
  return `Stock: ${produit.stockTotal}`;
}

export default function KioskCarousel({ produits }: Props) {
  const [index, setIndex] = useState(0);
  const active = useMemo(() => produits[index], [produits, index]);

  useEffect(() => {
    if (produits.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % produits.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [produits.length]);

  if (!active) {
    return (
      <div className="kiosk-card">
        <h2>Aucun produit</h2>
        <p className="muted">Ajoutez des produits pour cette boutique.</p>
      </div>
    );
  }

  const status = buildStatusText(active);

  return (
    <div className="kiosk-card">
      <h1>{active.nom}</h1>
      <p>{active.description}</p>
      <div className="row">
        <span className="badge">{active.categorie}</span>
        <span className="badge">{status}</span>
        <span className="badge">{active.prix.toFixed(2)} €</span>
      </div>
      {active.photos?.[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={active.photos[0]}
          alt={active.nom}
          style={{ width: "70%", maxWidth: 520, borderRadius: 16 }}
        />
      ) : (
        <div className="card">Aucune photo</div>
      )}
      <p className="muted">QR code sur l'etiquette pour reserver.</p>
    </div>
  );
}
