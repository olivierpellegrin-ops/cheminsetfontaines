/**
 * Bornes de la relance de cotisation (brique N2) — partagées entre la page
 * /admin/members (affichage de l'éligibilité) et les server actions, pour
 * que le bouton affiché et la garde réelle appliquent TOUJOURS la même règle.
 *
 * Règle « anniversaire » (validée par Olivier le 25/11/2026) : on ne relance
 * jamais un adhérent dont le dernier règlement date de moins de ~11 mois —
 * une cotisation payée en novembre/décembre n'est pas ressassée en janvier :
 * la relance arrive environ un mois avant l'anniversaire de ce règlement.
 * Les membres qui règlent à l'assemblée générale de début d'année sont donc
 * relancés juste avant celle-ci ; il n'y a PAS de date fixe de campagne.
 */

/** Ancienneté minimale du dernier règlement avant relance (~11 mois). */
export const RENEWAL_REMINDER_MIN_AGE_MS = 334 * 24 * 60 * 60 * 1000;

/** Jamais deux relances à moins de 30 jours pour un même membre. */
export const RENEWAL_REMINDER_GUARD_MS = 30 * 24 * 60 * 60 * 1000;
