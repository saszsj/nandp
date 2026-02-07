"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function GerantLoginPage() {
  const { signIn, signUp, user, profile } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && profile?.role === "gerant") {
      router.replace("/gerant/dashboard");
    }
  }, [user, profile, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      if (mode === "signup") {
        await signUp(email, password, displayName);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(mode === "signup" ? "Sign up failed." : "Sign in failed.");
    }
  };

  return (
    <main className="container stack">
      <h1>{mode === "signup" ? "Manager sign up" : "Manager sign in"}</h1>
      <form className="card stack" onSubmit={handleSubmit}>
        {mode === "signup" ? (
          <div className="stack">
            <label className="label">Name</label>
            <input
              className="input"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
        ) : null}
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
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn" type="submit">
          {mode === "signup" ? "Create account" : "Sign in"}
        </button>
        <button
          className="btn ghost"
          type="button"
          onClick={() =>
            setMode((current) => (current === "signup" ? "login" : "signup"))
          }
        >
          {mode === "signup"
            ? "Already have an account? Sign in"
            : "No account? Create one"}
        </button>
        {error ? <p className="muted">{error}</p> : null}
      </form>
    </main>
  );
}
