"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    console.log("[login][debug] soumission du formulaire");
    try {
      const form = new FormData(e.currentTarget);
      const res = await signIn("credentials", {
        email: form.get("email") ?? "",
        password: form.get("password") ?? "",
        redirect: false,
      });
      console.log("[login][debug] reponse signIn :", res);
      setPending(false);
      if (res?.error) {
        setError("Mauvais login et mot de passe. Réessayez avec de nouveaux identifiants.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setPending(false);
      console.error("[login][debug] exception :", err);
      setError(
        "Erreur technique : " +
          (err instanceof Error ? err.message : String(err))
      );
    }
  }

  return (
    <div className="cf-admin-login">
      <form className="cf-admin-login__card" onSubmit={onSubmit}>
        <p className="cf-admin-login__kicker">Back-office</p>
        <h1 className="cf-admin-login__title">Chemins et Fontaines</h1>
        {error ? <p className="cf-admin-login__error" role="alert">{error}</p> : null}
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
        <label htmlFor="password">Mot de passe</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <button type="submit" disabled={pending}>
          {pending ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
