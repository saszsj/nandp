## MVP N&P

Plateforme B2B2C de promotions et nouveautes pour boutiques de vetements.

### Documentation
- `docs/architecture.md`
- `docs/data-model.md`
- `docs/routes.md`
- `docs/functions.md`
- `docs/plan.md`

### Setup
1) Copier `.env.example` -> `.env.local`
2) Remplir les variables Firebase
3) Lancer le dev server

```bash
npm run dev
```

### Notes
- PWA active en production via `next-pwa`.
- Service worker FCM: `public/firebase-messaging-sw.js` (remplacer les valeurs).
