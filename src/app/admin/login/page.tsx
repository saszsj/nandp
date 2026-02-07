"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function AdminLoginPage() {
  const { signIn, user, profile } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && profile?.role === "admin") {
      router.replace("/admin/dashboard");
    }
  }, [user, profile, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await signIn(email, password);
      router.replace("/admin/dashboard");
    } catch (err) {
      setError("Connexion impossible.");
    }
  };

  return (
    <main className="container stack">
      <h1>Connexion admin</h1>
      <form className="card stack" onSubmit={handleSubmit}>
        <div className="stack">
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="stack">
          <label className="label">Mot de passe</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn" type="submit">
          Se connecter
        </button>
        {error ? <p className="muted">{error}</p> : null}
      </form>
    </main>
  );
}
