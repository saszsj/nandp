## Architecture dossier

```
/
  docs/                  -> specs MVP (FR)
  functions/             -> Cloud Functions (emails + FCM)
  public/                -> PWA, SW, icons
  src/
    app/                 -> routes App Router
      admin/             -> back-office admin
      gerant/            -> back-office gerant
      kiosk/             -> kiosk tablette
      p/                 -> page reservation publique
    components/          -> UI simple
    lib/                 -> Firebase, auth, types, FCM
```

## Flux principaux

- Kiosk -> lit `produits` par boutiqueId.
- Page publique -> cree `reservations`.
- Back-office -> gere `boutiques`, `produits`, `reservations`.
- Cloud Functions -> emails + notifications FCM.
