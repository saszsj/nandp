import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

initializeApp();

type Reservation = {
  statut: "en_attente" | "validee" | "refusee";
  notifyEmail: boolean;
  notifyPush: boolean;
  pushToken?: string;
  email: string;
  nom: string;
  produitId: string;
};

export const onReservationStatusChange = onDocumentWritten(
  "reservations/{id}",
  async (event) => {
    const before = event.data?.before?.data() as Reservation | undefined;
    const after = event.data?.after?.data() as Reservation | undefined;
    if (!after) return;
    if (before?.statut === after.statut) return;

    const statusText =
      after.statut === "validee"
        ? "Votre reservation est validee."
        : after.statut === "refusee"
        ? "Votre reservation a ete refusee."
        : "Votre reservation est en attente.";

    if (after.notifyPush && after.pushToken) {
      await getMessaging().send({
        token: after.pushToken,
        notification: {
          title: "Mise a jour reservation",
          body: statusText,
        },
      });
    }

    if (after.notifyEmail) {
      await getFirestore()
        .collection("emailQueue")
        .add({
          to: after.email,
          subject: "Mise a jour reservation",
          text: statusText,
          createdAt: new Date(),
        });
    }
  }
);
