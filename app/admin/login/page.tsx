"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

/**
 * Login back-office (B0) — version instrumentée de diagnostic.
 * - bouton type="button" : aucune soumission HTML native possible ;
 * - zone de debug visible directement dans la carte (pas besoin de F12) ;
 * - aucune redirection/refresh tant que la réponse n'est pas OK.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [trace, setTrace] = useState<string[]>([]);

  function addTrace(line: string) {
    console.log("[login][debug]", line);
    setTrace((t) => [...t.slice(-6), line]);
  }

  useEffect(() => {
    addTrace("JS prêt (hydratation OK)");
  }, []);

  async function onSubmit() {
    setError(null);
    setPending(true);
    addTrace("clic « Se connecter » intercepté");
    try {
      const form = new FormData(
        document.getElementById("cf-login-form") as HTMLFormElement
      );
      addTrace("appel signIn en cours…");
      const res = await signIn("credentials", {
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
        redirect: false,
      });
      setPending(false);
      addTrace("réponse signIn : " + JSON.stringify(res));
      if (res?.error) {
        setError("Mauvais login et mot de passe. Réessayez avec de nouveaux identifiants.");
        return;
      }
      addTrace("OK - navigation vers /admin");
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setPending(false);
      const msg = err instanceof Error ? err.message : String(err);
      addTrace("exception : " + msg);
      setError("Erreur technique : " + msg);
    }
  }

  return (
    <div className="cf-admin-login">
      <form id="cf-login-form" className="cf-admin-login__card" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        <p className="cf-admin-login__kicker">Back-office</p>
        <h1 className="cf-admin-login__title">Chemins et Fontaines</h1>
        {error ? (
          <p className="cf-admin-login__error" role="alert">{error}</p>
        ) : null}
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
        <button type="button" disabled={pending} onClick={onSubmit}>
          {pending ? "Connexion…" : "Se connecter"}
        </button>
        {trace.length > 0 ? (
          <ul className="cf-admin-login__debug">
            {trace.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        ) : null}
      </form>
    </div>
  );
}
