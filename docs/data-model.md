## Modele Firestore (MVP)

### `users/{uid}`
```
{
  role: "admin" | "gerant",
  boutiqueId?: string,
  email: string,
  displayName?: string
}
```

### `boutiques/{id}`
```
{
  nom: string,
  ville: string,
  actif: boolean,
  createdAt: timestamp
}
```

### `produits/{id}`
```
{
  nom: string,
  description: string,
  photos: string[],
  prix: number,
  categorie: "promo" | "nouveaute",
  stockTotal: number,
  stockParTaille: { [taille]: number },
  status: "disponible" | "soldout" | "arrivage",
  joursAvantArrivage: number,
  boutiqueIds: string[],
  boutiques: [{ id, nom, ville }],
  createdBy: string,
  ai: { enabled, status, variants[] },
  createdAt: timestamp
}
```

### `reservations/{id}`
```
{
  produitId: string,
  boutiqueId: string,
  nom: string,
  email: string,
  telephone?: string,
  taille: string,
  quantite: number,
  acompte: number,
  statut: "en_attente" | "validee" | "refusee",
  notifyEmail: boolean,
  notifyPush: boolean,
  pushToken?: string,
  createdAt: timestamp
}
```
