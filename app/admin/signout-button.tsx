"use client";

import { signOut } from "next-auth/react";

export default function AdminSignOut() {
  return (
    <button
      type="button"
      className="cf-admin__logout"
      onClick={() => signOut({ redirectTo: "/admin/login" })}
    >
      Se déconnecter
    </button>
  );
}
