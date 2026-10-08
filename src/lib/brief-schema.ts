// ---------------------------------------------------------------------
// Questionnaire client — Aspyre Studio
//
// C'est ici que tu ajoutes, retires ou modifies les questions.
// Chaque champ a un `id` unique : ne le change pas une fois que des
// clients ont commencé à répondre (sinon leur réponse ne s'affiche plus).
// ---------------------------------------------------------------------

export type FieldType =
  | "text"
  | "email"
  | "tel"
  | "url"
  | "date"
  | "textarea"
  | "select"
  | "radio"
  | "checkboxes"
  | "colors"
  | "files"
  | "pages";

export type Field = {
  id: string;
  label: string;
  type: FieldType;
  help?: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  /** Pour radio / checkboxes : ajoute un choix « Autre » avec saisie libre. */
  allowOther?: boolean;
  /** Pour les fichiers : types acceptés (attribut HTML `accept`). */
  accept?: string;
};

export type Section = {
  id: string;
  title: string;
  intro: string;
  fields: Field[];
};

export type UploadedFile = {
  path: string;
  name: string;
  size: number;
  type: string;
};

/** Une section de page rédigée par le client (titre, texte, images). */
export type ContentBlock = {
  id: string;
  title: string;
  text: string;
  images: UploadedFile[];
};

export type PageContent = {
  page: string;
  blocks: ContentBlock[];
};

export type FieldValue = string | string[] | UploadedFile[] | PageContent[];
export type BriefData = Record<string, FieldValue>;

export const BRIEF_SECTIONS: Section[] = [
  {
    id: "entreprise",
    title: "Votre entreprise",
    intro:
      "Faisons connaissance ! Ces informations m'aident à comprendre votre activité et à qui s'adresse votre futur site.",
    fields: [
      { id: "nom_entreprise", label: "Nom de l'entreprise / du projet", type: "text", required: true },
      { id: "contact_nom", label: "Votre nom et prénom", type: "text", required: true },
      { id: "contact_email", label: "E-mail de contact", type: "email", required: true },
      { id: "contact_tel", label: "Téléphone", type: "tel" },
      {
        id: "activite",
        label: "Décrivez votre activité",
        type: "textarea",
        required: true,
        placeholder: "Ce que vous faites, depuis quand, vos produits ou services phares…",
      },
      { id: "slogan", label: "Slogan ou phrase d'accroche (si vous en avez un)", type: "text" },
      { id: "adresse", label: "Adresse (si elle doit apparaître sur le site)", type: "textarea" },
      {
        id: "cible",
        label: "Qui sont vos clients idéaux ?",
        type: "textarea",
        required: true,
        help: "Âge, profession, localisation, besoins, ce qui les fait choisir un prestataire…",
      },
      {
        id: "differenciation",
        label: "Qu'est-ce qui vous différencie de vos concurrents ?",
        type: "textarea",
      },
      {
        id: "concurrents",
        label: "Concurrents (noms ou adresses de sites)",
        type: "textarea",
        placeholder: "Un par ligne",
      },
      {
        id: "valeurs",
        label: "Vos valeurs, en quelques mots",
        type: "text",
        placeholder: "Ex. : authenticité, proximité, savoir-faire artisanal",
      },
    ],
  },
  {
    id: "objectifs",
    title: "Vos objectifs",
    intro: "À quoi doit servir votre site ? Un objectif clair permet un site qui convertit.",
    fields: [
      {
        id: "objectif_principal",
        label: "Objectif principal du site",
        type: "radio",
        required: true,
        allowOther: true,
        options: [
          "Présenter mon activité (site vitrine)",
          "Obtenir des demandes de devis / contacts",
          "Prise de rendez-vous en ligne",
          "Vendre en ligne (boutique)",
          "Montrer mes réalisations (portfolio)",
          "Publier du contenu (blog, actualités)",
        ],
      },
      {
        id: "actions_visiteurs",
        label: "Qu'aimeriez-vous que les visiteurs fassent sur le site ?",
        type: "checkboxes",
        allowOther: true,
        options: [
          "Me contacter par formulaire",
          "M'appeler",
          "Réserver un créneau",
          "Acheter un produit",
          "S'inscrire à la newsletter",
          "Me suivre sur les réseaux sociaux",
          "Venir en boutique / au cabinet",
        ],
      },
      { id: "site_actuel", label: "Avez-vous déjà un site ? Si oui, son adresse", type: "url", placeholder: "https://" },
      {
        id: "site_actuel_avis",
        label: "Ce que vous aimez / n'aimez pas dans votre site actuel",
        type: "textarea",
      },
    ],
  },
  {
    id: "design",
    title: "Design & style",
    intro:
      "Parlons de l'univers visuel. Pas besoin d'être expert : vos ressentis et vos exemples comptent plus que le vocabulaire technique.",
    fields: [
      {
        id: "logo_statut",
        label: "Avez-vous un logo ?",
        type: "radio",
        required: true,
        options: ["Oui, je l'envoie ci-dessous", "Oui, mais il faudrait le moderniser", "Non, il faut en créer un"],
      },
      {
        id: "logo_fichiers",
        label: "Votre logo et votre charte graphique",
        type: "files",
        accept: "image/*,.pdf,.svg,.ai,.eps",
        help: "Idéalement en haute qualité (SVG, PDF, PNG sur fond transparent).",
      },
      {
        id: "couleurs",
        label: "Couleurs de votre marque ou couleurs souhaitées",
        type: "colors",
        help: "Ajoutez vos couleurs avec le sélecteur, ou décrivez-les si vous ne les connaissez pas précisément.",
      },
      {
        id: "couleurs_description",
        label: "Couleurs à privilégier ou à éviter (en mots)",
        type: "text",
        placeholder: "Ex. : tons naturels, pas de rouge",
      },
      {
        id: "ambiance",
        label: "Quelle ambiance doit dégager le site ?",
        type: "checkboxes",
        required: true,
        allowOther: true,
        options: [
          "Moderne",
          "Minimaliste",
          "Élégant / haut de gamme",
          "Chaleureux",
          "Naturel / organique",
          "Ludique / coloré",
          "Professionnel / corporate",
          "Créatif / artistique",
          "Tech / innovant",
        ],
      },
      {
        id: "inspirations",
        label: "Sites que vous aimez (et pourquoi)",
        type: "textarea",
        required: true,
        placeholder: "https://exemple.com — j'aime les grandes photos et la simplicité",
        help: "2 ou 3 exemples suffisent, même hors de votre secteur.",
      },
      {
        id: "inspirations_fichiers",
        label: "Images d'inspiration (captures, moodboard…)",
        type: "files",
        accept: "image/*,.pdf",
      },
      { id: "a_eviter", label: "Ce que vous ne voulez surtout pas", type: "textarea" },
    ],
  },
  {
    id: "contenus",
    title: "Structure & contenus",
    intro: "Définissons les pages de votre site et ce qu'elles contiendront.",
    fields: [
      {
        id: "pages",
        label: "Quelles pages souhaitez-vous ?",
        type: "checkboxes",
        required: true,
        allowOther: true,
        options: [
          "Accueil",
          "À propos / Qui suis-je",
          "Services / Prestations",
          "Tarifs",
          "Réalisations / Portfolio",
          "Témoignages / Avis",
          "Blog / Actualités",
          "FAQ",
          "Boutique",
          "Contact",
          "Mentions légales & confidentialité",
        ],
      },
      {
        id: "fonctionnalites",
        label: "Fonctionnalités souhaitées",
        type: "checkboxes",
        allowOther: true,
        options: [
          "Formulaire de contact",
          "Réservation / prise de rendez-vous",
          "Paiement en ligne",
          "Inscription newsletter",
          "Site en plusieurs langues",
          "Carte / plan d'accès",
          "Intégration Instagram / réseaux sociaux",
          "Avis Google",
          "Espace membre",
          "Chat / WhatsApp",
        ],
      },
      { id: "langues", label: "Langue(s) du site", type: "text", placeholder: "Français" },
      {
        id: "textes_statut",
        label: "Les textes du site sont-ils prêts ?",
        type: "radio",
        required: true,
        options: ["Oui, tous", "En partie", "Non, j'aimerais de l'aide pour les rédiger"],
      },
      {
        id: "textes_fichiers",
        label: "Vous avez déjà vos textes dans un document ? Déposez-le ici",
        help: "Sinon, pas d'inquiétude : l'étape suivante vous guide pour les écrire page par page.",
        type: "files",
        accept: ".doc,.docx,.pdf,.txt,.odt,.md",
      },
      {
        id: "photos_statut",
        label: "Côté photos et visuels",
        type: "radio",
        required: true,
        options: [
          "J'ai mes propres photos professionnelles",
          "J'ai quelques photos, à compléter",
          "J'aurais besoin de photos de banque d'images",
          "J'envisage un shooting photo",
        ],
      },
      {
        id: "photos_fichiers",
        label: "Vos photos (équipe, locaux, produits, réalisations…)",
        type: "files",
        accept: "image/*,video/*",
      },
    ],
  },
  {
    id: "textes",
    title: "Textes & images",
    intro:
      "Rédigez ici le contenu de chaque page de votre site, section par section, et ajoutez les images qui vont avec. Une structure vous est proposée pour vous guider : modifiez-la librement.",
    fields: [
      {
        id: "contenus_pages",
        label: "Le contenu de vos pages",
        type: "pages",
        help: "Pas besoin d'un texte parfait : je le mettrai en forme. L'important, c'est le fond.",
      },
    ],
  },
  {
    id: "technique",
    title: "Technique & budget",
    intro: "Dernière ligne droite ! Quelques informations pratiques pour organiser le projet.",
    fields: [
      {
        id: "domaine_statut",
        label: "Nom de domaine (ex. : votre-entreprise.fr)",
        type: "radio",
        help: "Vous pourrez vérifier sa disponibilité et l'acheter, pas à pas, dans l'onglet « Domaine & licences ».",
        required: true,
        options: ["J'en possède déjà un", "Il faut en acheter un", "Je ne sais pas"],
      },
      { id: "domaine", label: "Nom de domaine actuel ou souhaité", type: "text", placeholder: "mon-entreprise.fr" },
      {
        id: "hebergement",
        label: "Hébergement / adresses e-mail actuels",
        type: "text",
        help: "Chez qui est votre domaine ou votre site (OVH, Ionos, Wix, Google Workspace…) ? Laissez vide si vous ne savez pas.",
      },
      {
        id: "reseaux_sociaux",
        label: "Vos réseaux sociaux",
        type: "textarea",
        placeholder: "Instagram : https://instagram.com/…\nLinkedIn : https://…",
      },
      {
        id: "budget",
        label: "Budget envisagé",
        type: "select",
        required: true,
        options: [
          "Moins de 1 000 €",
          "1 000 € – 2 000 €",
          "2 000 € – 3 500 €",
          "3 500 € – 5 000 €",
          "Plus de 5 000 €",
          "Je ne sais pas encore",
        ],
      },
      { id: "date_souhaitee", label: "Date de mise en ligne souhaitée", type: "date" },
      {
        id: "maintenance",
        label: "Après la mise en ligne, souhaitez-vous…",
        type: "radio",
        options: [
          "Modifier le site moi-même",
          "Me faire accompagner (maintenance / mises à jour)",
          "Je ne sais pas encore",
        ],
      },
      {
        id: "infos_complementaires",
        label: "Autre chose à me dire ?",
        type: "textarea",
        placeholder: "Contraintes, idées, questions…",
      },
    ],
  },
];

export const ALL_FIELDS = BRIEF_SECTIONS.flatMap((s) => s.fields);

export function isPageContentList(value: FieldValue | undefined): value is PageContent[] {
  return Array.isArray(value) && value.some((v) => typeof v === "object" && v !== null && "blocks" in v);
}

export function blockHasContent(b: ContentBlock): boolean {
  return b.text.trim().length > 0 || b.images.length > 0;
}

export function isFilled(value: FieldValue | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (isPageContentList(value)) return value.some((p) => p.blocks.some(blockHasContent));
  if (Array.isArray(value)) return value.length > 0;
  return value.trim().length > 0;
}

/** Pourcentage de questions répondues (toutes questions confondues). */
export function briefProgress(data: BriefData): number {
  const filled = ALL_FIELDS.filter((f) => isFilled(data[f.id])).length;
  return Math.round((filled / ALL_FIELDS.length) * 100);
}

/** Questions obligatoires non remplies, regroupées par section. */
export function missingRequired(data: BriefData): { section: Section; fields: Field[] }[] {
  return BRIEF_SECTIONS.map((section) => ({
    section,
    fields: section.fields.filter((f) => f.required && !isFilled(data[f.id])),
  })).filter((s) => s.fields.length > 0);
}

export const STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  en_cours: "Projet en cours",
  termine: "Terminé",
};

/** Pages choisies par le client à l'étape « Structure & contenus ». */
export function selectedPages(data: BriefData): string[] {
  const pages = Array.isArray(data.pages) ? (data.pages as unknown[]).filter((p): p is string => typeof p === "string") : [];
  const other = typeof data.pages__autre === "string" ? data.pages__autre : "";
  return pages.flatMap((p) =>
    p === "Autre" ? other.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean) : [p],
  );
}

/**
 * Structure suggérée pour chaque type de page : le client part de ces
 * sections et peut les renommer, les supprimer ou en ajouter.
 */
export const PAGE_SUGGESTIONS: Record<string, { title: string; hint: string }[]> = {
  Accueil: [
    { title: "Titre principal", hint: "La phrase que l'on doit lire en premier : qui vous êtes et ce que vous apportez, en une ligne." },
    { title: "Présentation courte", hint: "2 ou 3 phrases pour donner envie d'en savoir plus." },
    { title: "Vos points forts", hint: "3 ou 4 raisons de vous choisir (un court paragraphe chacune)." },
    { title: "Appel à l'action", hint: "Ce que le visiteur doit faire ensuite : « Prendre rendez-vous », « Demander un devis »…" },
  ],
  "À propos / Qui suis-je": [
    { title: "Votre histoire", hint: "Comment tout a commencé, votre parcours, ce qui vous anime." },
    { title: "Votre approche", hint: "Votre façon de travailler, vos valeurs." },
    { title: "L'équipe", hint: "Les personnes à présenter (nom, rôle, une phrase) et leurs photos." },
  ],
  "Services / Prestations": [
    { title: "Introduction", hint: "Une phrase d'introduction à vos services." },
    { title: "Service 1", hint: "Nom du service, à qui il s'adresse, ce qu'il comprend, le résultat pour le client." },
    { title: "Service 2", hint: "Même chose pour le service suivant. Ajoutez autant de sections que de services." },
  ],
  Tarifs: [
    { title: "Formules / tarifs", hint: "Nom de chaque formule, prix, ce qui est inclus. Une ligne par élément." },
    { title: "Conditions", hint: "Acompte, délais, déplacements, mentions particulières…" },
  ],
  "Réalisations / Portfolio": [
    { title: "Projet 1", hint: "Nom du projet, client, ce que vous avez fait. Ajoutez les photos du projet." },
    { title: "Projet 2", hint: "Ajoutez une section par réalisation." },
  ],
  "Témoignages / Avis": [
    { title: "Témoignage 1", hint: "Le texte de l'avis, le prénom (et éventuellement l'entreprise) de la personne." },
    { title: "Témoignage 2", hint: "Ajoutez une section par témoignage." },
  ],
  "Blog / Actualités": [
    { title: "Premier article", hint: "Si vous avez déjà des articles, collez-en un ici (titre + texte + image)." },
  ],
  FAQ: [
    { title: "Question 1", hint: "Écrivez la question en titre et la réponse dans le texte." },
    { title: "Question 2", hint: "Une section par question." },
  ],
  Boutique: [
    { title: "Présentation de la boutique", hint: "Quelques mots sur vos produits." },
    { title: "Produit 1", hint: "Nom, description, prix, variantes (tailles, couleurs…) et photos." },
  ],
  Contact: [
    { title: "Message d'introduction", hint: "Ex. : « Une question, un projet ? Écrivez-moi, je réponds sous 48 h. »" },
    { title: "Coordonnées et horaires", hint: "Adresse, téléphone, e-mail, horaires d'ouverture." },
  ],
  "Mentions légales & confidentialité": [
    { title: "Informations légales", hint: "Raison sociale, forme juridique, SIRET, adresse du siège, responsable de publication." },
  ],
};

export const DEFAULT_PAGE_SUGGESTION = [
  { title: "Introduction", hint: "De quoi parle cette page ? Une ou deux phrases." },
  { title: "Contenu principal", hint: "Le texte principal de la page." },
];
