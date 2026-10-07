export const PROJECT_STEPS = [
  { title: "Brief", text: "Vous me présentez votre projet, vos textes et vos images." },
  { title: "Domaine & licences", text: "Vous achetez votre hébergement, votre nom de domaine et Elementor Pro." },
  { title: "Installation", text: "J'installe WordPress, Elementor Pro et prépare votre site." },
  { title: "Maquette", text: "Je vous présente une première version de votre site." },
  { title: "Corrections", text: "J'ajuste le site selon vos retours." },
  { title: "Mise en ligne", text: "Votre site est en ligne 🎉" },
] as const;

/** Clés de l'avancement « Domaine & licences » (table project_setup). */
export type SetupData = {
  domaine_existant?: boolean;
  domaine_choisi?: string;
  ionos_fait?: boolean;
  elementor_fait?: boolean;
};

export const CREDENTIAL_SERVICES = ["Ionos (hébergement & domaine)", "Elementor", "Autre"] as const;
