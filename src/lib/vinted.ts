// Outil Vinted : types partagés et réglages.

export type Listing = {
  id: string;
  title: string;
  description: string;
  brand: string;
  category: string;
  size: string;
  condition: string;
  color: string;
  price: number | null;
  notes: string;
  published_at: string; // AAAA-MM-JJ
  republish_count: number;
  sold_at: string | null;
  created_at: string;
};

export type ListingInput = Omit<Listing, "id" | "republish_count" | "sold_at" | "created_at"> & { id?: string };

export type Optimisation = {
  titre: string;
  description: string;
  conseil_prix: string;
  infos_manquantes: string[];
  conseils: string[];
};

/** Nombre de jours sans vente après lequel une annonce est signalée « à republier ». */
export const REPUBLISH_AFTER_DAYS = 14;

/** Longueur visée pour un titre (au-delà, il est coupé dans les résultats de recherche). */
export const TITLE_TARGET = 60;

export const CONDITIONS = [
  "Neuf avec étiquette",
  "Neuf sans étiquette",
  "Très bon état",
  "Bon état",
  "Satisfaisant",
];

export function daysSince(date: string) {
  const start = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - start.getTime()) / 86_400_000));
}

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
