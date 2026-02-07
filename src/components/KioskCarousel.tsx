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
  const [productIndex, setProductIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const active = useMemo(
    () => produits[productIndex],
    [produits, productIndex]
  );
  const photos = active?.photos?.length ? active.photos : [];
  const activePhoto = photos[photoIndex];

  useEffect(() => {
    setProductIndex(0);
    setPhotoIndex(0);
  }, [produits]);

  useEffect(() => {
    if (!produits.length) return;
    const timer = setTimeout(() => {
      if (photos.length > 1 && photoIndex < photos.length - 1) {
        setPhotoIndex((prev) => prev + 1);
        return;
      }
      setPhotoIndex(0);
      setProductIndex((prev) => (prev + 1) % produits.length);
    }, 5000);
    return () => clearTimeout(timer);
  }, [produits.length, productIndex, photos.length, photoIndex]);

  if (!active) {
    return (
      <div className="kiosk-card">
        <h2>No products yet</h2>
        <p className="muted">Add products for this shop to start.</p>
      </div>
    );
  }

  const status = buildStatusText(active);

  return (
    <div className="kiosk-card">
      <div className="kiosk-media">
        {activePhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="kiosk-image"
            src={activePhoto}
            alt={active.nom}
          />
        ) : (
          <div className="kiosk-image placeholder">No photo</div>
        )}
        {photos.length > 1 ? (
          <div className="kiosk-dots">
            {photos.map((_, idx) => (
              <span
                key={`${active.id}-dot-${idx}`}
                className={`dot ${idx === photoIndex ? "active" : ""}`}
              />
            ))}
          </div>
        ) : null}
      </div>
      <div className="kiosk-details">
        <div className="kiosk-header">
          <h1>{active.nom}</h1>
          <span className="kiosk-count">
            {productIndex + 1}/{produits.length}
          </span>
        </div>
        <p className="kiosk-description">{active.description}</p>
        <div className="row kiosk-badges">
          <span className="badge">{active.categorie}</span>
          <span className="badge">{status}</span>
          <span className="badge">{active.prix.toFixed(2)} €</span>
        </div>
        <p className="muted">QR code sur l'etiquette pour reserver.</p>
      </div>
    </div>
  );
}
