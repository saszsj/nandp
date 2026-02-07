"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
} from "firebase/firestore";
import RoleGuard from "@/components/RoleGuard";
import AdminNav from "@/components/AdminNav";
import { db } from "@/lib/firebase";
import type { Boutique, Produit, Reservation } from "@/lib/types";

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    const q = query(collection(db, "reservations"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setReservations(
        snap.docs.map((d) => ({ ...(d.data() as Reservation), id: d.id }))
      );
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "boutiques"), orderBy("nom"));
    const unsub = onSnapshot(q, (snap) => {
      setBoutiques(
        snap.docs.map((d) => ({ ...(d.data() as Boutique), id: d.id }))
      );
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "produits"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setProduits(
        snap.docs.map((d) => ({ ...(d.data() as Produit), id: d.id }))
      );
    });
    return () => unsub();
  }, []);

  const boutiqueMap = useMemo(() => {
    return new Map(boutiques.map((b) => [b.id, b]));
  }, [boutiques]);

  const productMap = useMemo(() => {
    return new Map(produits.map((p) => [p.id, p]));
  }, [produits]);

  const groupedByProduct = useMemo(() => {
    const byProduct = new Map<
      string,
      {
        produitId: string;
        produitNom: string;
        photo?: string;
        totalPieces: number;
        byBoutique: Map<string, Map<string, number>>;
        reservationIdsByBoutique: Map<string, string[]>;
      }
    >();
    reservations.forEach((r) => {
      if (r.archived) return;
      if (r.statut !== "validee") return;
      const product = productMap.get(r.produitId);
      const existing =
        byProduct.get(r.produitId) ||
        (() => {
          const entry = {
            produitId: r.produitId,
            produitNom: product?.nom || r.produitId,
            photo: product?.photos?.[0],
            totalPieces: 0,
            byBoutique: new Map<string, Map<string, number>>(),
            reservationIdsByBoutique: new Map<string, string[]>(),
          };
          byProduct.set(r.produitId, entry);
          return entry;
        })();
      existing.totalPieces += r.quantite || 0;
      const boutiqueKey = r.boutiqueId || "unknown";
      const sizeMap = existing.byBoutique.get(boutiqueKey) || new Map();
      sizeMap.set(r.taille, (sizeMap.get(r.taille) || 0) + (r.quantite || 0));
      existing.byBoutique.set(boutiqueKey, sizeMap);
      const ids = existing.reservationIdsByBoutique.get(boutiqueKey) || [];
      ids.push(r.id);
      existing.reservationIdsByBoutique.set(boutiqueKey, ids);
    });
    return Array.from(byProduct.values());
  }, [reservations, productMap]);

  const handleSendShipment = async (
    produitId: string,
    boutiqueId: string,
    reservationIds: string[]
  ) => {
    const key = `${produitId}:${boutiqueId}`;
    const tracking = trackingInputs[key]?.trim();
    if (!tracking) return;
    const batch = writeBatch(db);
    reservationIds.forEach((id) => {
      batch.update(doc(db, "reservations", id), {
        statut: "en_livraison",
        tracking,
        archived: false,
      });
    });
    await batch.commit();
    setTrackingInputs((prev) => ({ ...prev, [key]: "" }));
  };

  return (
    <RoleGuard allow={["admin"]} redirectTo="/admin/login">
      <main className="container stack">
        <AdminNav />
        <div className="card stack">
          <h1>Reservations</h1>
          <div className="stack">
            {groupedByProduct.map((group) => (
              <div key={group.produitId} className="card stack">
                <div className="row space-between">
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
                      {group.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={group.photo}
                          alt={group.produitNom}
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
                      <div style={{ fontWeight: 600 }}>{group.produitNom}</div>
                    </div>
                  </div>
                  <span className="badge">{group.totalPieces} pieces</span>
                </div>
                <div className="stack">
                  {Array.from(group.byBoutique.entries()).map(
                    ([boutiqueId, sizes]) => (
                      <div key={boutiqueId} className="stack">
                        <div className="muted">
                          Boutique:{" "}
                          {boutiqueMap.get(boutiqueId)?.nom || boutiqueId}
                        </div>
                        <div className="row">
                          {Array.from(sizes.entries()).map(([taille, qty]) => (
                            <span key={`${boutiqueId}-${taille}`} className="badge">
                              {taille}: {qty}
                            </span>
                          ))}
                        </div>
                        <div className="row">
                          <input
                            className="input"
                            style={{ width: 220 }}
                            placeholder="Tracking"
                            value={
                              trackingInputs[`${group.produitId}:${boutiqueId}`] ||
                              ""
                            }
                            onChange={(e) =>
                              setTrackingInputs((prev) => ({
                                ...prev,
                                [`${group.produitId}:${boutiqueId}`]: e.target.value,
                              }))
                            }
                          />
                          <button
                            className="btn secondary"
                            type="button"
                            onClick={() =>
                              handleSendShipment(
                                group.produitId,
                                boutiqueId,
                                group.reservationIdsByBoutique.get(boutiqueId) || []
                              )
                            }
                          >
                            Envoyer le colis
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
            {!groupedByProduct.length ? (
              <p className="muted">Aucune reservation pour le moment.</p>
            ) : null}
          </div>
        </div>
      </main>
    </RoleGuard>
  );
}
