export type Role = "admin" | "gerant";

export type Boutique = {
  id: string;
  nom: string;
  ville: string;
  actif: boolean;
  createdAt?: number;
};

export type ProduitStatus = "disponible" | "soldout" | "arrivage";
export type ProduitCategorie = "promo" | "nouveaute";

export type Produit = {
  id: string;
  nom: string;
  description: string;
  photos: string[];
  prix: number;
  categorie: ProduitCategorie;
  stockTotal: number;
  stockParTaille: Record<string, number>;
  status: ProduitStatus;
  joursAvantArrivage?: number;
  boutiqueIds: string[];
  boutiques: { id: string; nom: string; ville: string }[];
  createdBy: string;
  createdAt?: number;
  ai: {
    enabled: boolean;
    status: "idle" | "processing" | "done";
    variants: string[];
  };
};

export type ReservationStatus = "en_attente" | "validee" | "refusee";

export type Reservation = {
  id: string;
  produitId: string;
  boutiqueId: string;
  nom: string;
  email: string;
  telephone?: string;
  taille: string;
  quantite: number;
  acompte: number;
  statut: ReservationStatus;
  notifyEmail: boolean;
  notifyPush: boolean;
  createdAt?: number;
};

export type UserProfile = {
  id: string;
  role: Role;
  boutiqueId?: string;
  email: string;
  displayName?: string;
};
