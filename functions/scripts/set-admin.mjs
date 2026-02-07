import admin from "firebase-admin";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith("--")) {
      continue;
    }
    const key = current.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = value;
      i += 1;
    }
  }
  return args;
}

function usage() {
  console.log("Usage:");
  console.log(
    "  node scripts/set-admin.mjs --email <email> [--uid <uid>] [--displayName <name>] [--project <id>]"
  );
  console.log("");
  console.log("Requires GOOGLE_APPLICATION_CREDENTIALS to be set.");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: args.project,
  });

  let uid = args.uid || args.u;
  if (!uid) {
    const email = args.email;
    if (!email) {
      usage();
      process.exit(1);
    }
    const userRecord = await admin.auth().getUserByEmail(email);
    uid = userRecord.uid;
  }

  const payload = { role: "admin" };
  if (args.email) {
    payload.email = args.email;
  }
  if (args.displayName) {
    payload.displayName = args.displayName;
  }

  await admin.firestore().collection("users").doc(uid).set(payload, {
    merge: true,
  });

  console.log(`Admin role applied to users/${uid}.`);
}

main().catch((err) => {
  console.error("Failed to set admin role:", err);
  process.exit(1);
});
