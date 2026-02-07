## Cloud Functions (emails + FCM)

### Triggers
- `onReservationStatusChange`: envoie email + push sur `reservations` quand `statut` change.
- `onReservationCreated`: log/analytics et notification interne gerant.

### Emails
- Validation/refus via un provider (SendGrid, Resend, Mailgun).

### Notifications FCM
- Envoi sur `pushToken` si `notifyPush` est true.
