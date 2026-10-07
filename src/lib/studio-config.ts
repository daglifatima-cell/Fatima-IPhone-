// ---------------------------------------------------------------------
// Réglages d'Aspyre Studio : liens, offres conseillées et tutoriels
// affichés dans l'onglet « Domaine & licences » de l'espace client.
// ---------------------------------------------------------------------

export const STUDIO = {
  name: "Aspyre Studio",

  /** 👉 Colle ici ton lien affilié Elementor Pro. */
  elementorAffiliateUrl: "https://elementor.com/pro/",
  /** Offre Elementor Pro conseillée au client (le nom affiché dans le tutoriel). */
  elementorPlan: "l'offre pour 1 site (la plus petite formule suffit)",

  /** Page Ionos où le client achète son hébergement WordPress (domaine inclus). */
  ionosHostingUrl: "https://www.ionos.fr/hebergement/hebergement-wordpress",
  /** Offre Ionos conseillée au client. */
  ionosPlan: "une offre d'hébergement WordPress incluant un nom de domaine",
  /** Page de connexion à l'espace client Ionos. */
  ionosLoginUrl: "https://login.ionos.fr",
};

export type TutoStep = { title: string; text: string };

export const IONOS_TUTO: TutoStep[] = [
  {
    title: "Ouvrez la page Ionos",
    text: `Cliquez sur le bouton « Aller sur Ionos » ci-dessous. Je vous conseille ${STUDIO.ionosPlan}.`,
  },
  {
    title: "Choisissez votre nom de domaine",
    text: "Pendant la commande, Ionos vous propose de choisir votre domaine inclus : saisissez celui que vous avez vérifié plus haut.",
  },
  {
    title: "Créez votre compte et payez",
    text: "Renseignez vos informations (à votre nom ou celui de votre entreprise : le domaine vous appartiendra). Notez bien votre identifiant client et votre mot de passe.",
  },
  {
    title: "Pas d'installation à faire",
    text: "Ionos peut vous proposer d'installer WordPress vous-même : ce n'est pas nécessaire, je m'en occupe.",
  },
  {
    title: "Transmettez-moi vos accès",
    text: "Revenez ici, cochez « C'est fait » et envoyez-moi vos identifiants Ionos dans la dernière étape (ils sont chiffrés).",
  },
];

export const ELEMENTOR_TUTO: TutoStep[] = [
  {
    title: "Ouvrez la page Elementor Pro",
    text: `Cliquez sur « Acheter Elementor Pro » ci-dessous et choisissez ${STUDIO.elementorPlan}.`,
  },
  {
    title: "Créez votre compte Elementor",
    text: "Utilisez de préférence la même adresse e-mail que pour votre site. Le paiement est annuel.",
  },
  {
    title: "Ne téléchargez rien",
    text: "Elementor vous propose de télécharger l'extension : inutile, je l'installerai et l'activerai sur votre site.",
  },
  {
    title: "Transmettez-moi vos accès",
    text: "Pour activer la licence, j'ai besoin de me connecter à votre compte Elementor : envoyez-moi l'e-mail et le mot de passe dans la dernière étape.",
  },
];
