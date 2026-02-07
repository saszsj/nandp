"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import type { Produit } from "@/lib/types";

type Props = {
  produits: Produit[];
  shopUrl: string;
};

function buildStatusText(produit: Produit) {
  if (produit.status === "soldout") return "Soldout";
  if (produit.status === "arrivage") {
    const jours = produit.joursAvantArrivage ?? 0;
    return `-${jours} jours avant arrivage`;
  }
  return `Stock: ${produit.stockTotal}`;
}

export default function KioskCarousel({ produits, shopUrl }: Props) {
  const [productIndex, setProductIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [qrCode, setQrCode] = useState<string | null>(null);
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
    if (!shopUrl) {
      setQrCode(null);
      return;
    }
    let alive = true;
    QRCode.toDataURL(shopUrl, { margin: 1, width: 160 })
      .then((url) => {
        if (alive) setQrCode(url);
      })
      .catch(() => {
        if (alive) setQrCode(null);
      });
    return () => {
      alive = false;
    };
  }, [shopUrl]);

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
        <div className="kiosk-info-overlay">
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
        </div>
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
        <div className="kiosk-qr-card">
          {qrCode ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="kiosk-qr" src={qrCode} alt="QR code boutique" />
          ) : (
            <div className="kiosk-qr placeholder">QR</div>
          )}
          <div className="kiosk-qr-text">
            Scannez pour voir les articles et reserver.
          </div>
        </div>
      </div>
    </div>
  );
}
