# 🎯 STARTER PROMPTS ANTIGRAVITY — PÔLE DEV 2 (@akhy-m00)

Ces 5 prompts séquentiels sont prêts à être copiés-collés directement dans le chat de ton IDE Antigravity pour construire ton application Next.js de gestion commerçant et Store Builder en symbiose parfaite avec `openboutik-api`.

---

## 🟢 PROMPT 1 : ÉDITEUR VISUEL STORE BUILDER (TEMPS RÉEL & SAUVEGARDE `PUT /shops/me/theme`)

```text
Agis en tant que Principal Frontend Architect spécialisé dans les éditeurs no-code Next.js.
Implémente le module Store Builder pour `openboutik-seller` dans la route `/store-builder`.

Spécifications techniques :
1. Architecture en 2 colonnes (Desktop) et onglets adaptatifs (Mobile) :
   - Panneau latéral gauche : Contrôles d'édition ergonomiques divisés en accordéons :
     a. Couleurs & Identité : Sélecteur de couleur primaire (avec presets dakaroise : Émeraude Teranga, Bleu Océan Almadies, Or Savane), upload logo, upload favicon.
     b. Bannière & Typographie : Style d'en-tête (Pleine largeur, Contenue, Minimale), upload bannière, choix de police (Inter, Poppins, Outfit).
     c. Barre d'Annonce : Interrupteur d'activation, saisie du message promotionnel (ex: "Livraison Tiak-Tiak offerte").
     d. Modules Métier : Interrupteur d'activation de la négociation "Wakhale", affichage des sponsors partenaires.
   - Panneau droit : Prévisualisation en direct (Live Preview) dynamique réagissant instantanément aux modifications à 60fps (via Zustand ou Context local).
2. Persistance des données :
   - Initialisation au montage du composant via `GET http://localhost:4000/api/v1/shops/me/theme`.
   - Bouton d'action proéminent « Enregistrer et Publier » avec état de chargement, déclenchant `PUT /shops/me/theme` avec l'objet complet `themeConfig`.
   - Toast de confirmation de succès stylisé.
3. Code 100 % typé en TypeScript strict, sans aucun `any`, en utilisant l'interface `ThemeConfig` de `@/types/api`.
```

---

## 🟢 PROMPT 2 : MOTEUR DE RENDU STOREFRONT DYNAMIQUE & VARIABLES CSS

```text
Agis en tant que Lead Frontend Engineer.
Crée le composant de rendu de vitrine marchande `StorefrontRenderer.tsx` qui consomme la configuration `themeConfig` et affiche le site dédié du commerçant.

Spécifications requises :
1. Injection dynamique des variables CSS :
   - Applique `--primary: themeConfig.primaryColor` et `--font-family: themeConfig.fontFamily` au niveau de l'élément racine pour thématiser instantanément tous les boutons, badges et bordures.
2. Éléments visuels obligatoires :
   - Barre d'annonce supérieure conditionnelle (si `announcementBarEnabled === true`).
   - En-tête de boutique avec logo, nom, slogan et badge "Vendeur Vérifié".
   - Bannière personnalisée avec superposition élégante du titre.
   - Bouton flottant de contact direct WhatsApp ouvrant `https://wa.me/+221XXXXXXXXX`.
   - Carrousel ou grille des sponsors et partenaires (`shop_sponsors`) avec leurs logos et badges officiels (ex: "Partenaire Wave").
   - Grille de produits responsive (cartes denses avec prix FCFA formaté, bouton d'ajout au panier, et badge d'offre Wakhale si activé).
3. Gestion des états :
   - Skeleton d'attente soigné pendant le chargement des données.
   - Message accueillant si la boutique n'a pas encore publié d'articles.
4. Aucun dégradé violet IA. Palette sobre, lisible et taillée pour le e-commerce sénégalais.
```

---

## 🟢 PROMPT 3 : DASHBOARD ABONNEMENTS, ESSAI 30 JOURS & BANDEAU DUNNING 72H

```text
Agis en tant que Lead Frontend Engineer.
Développe la page de gestion des Abonnements (`/settings/billing`) et le bandeau d'alerte Dunning global pour `openboutik-seller`.

Fonctionnalités métier obligatoires :
1. Comparatif interactif des 3 forfaits SaaS :
   - FREE (0 FCFA - 3.0 % commission marketplace).
   - PRO (5 000 FCFA/mois - 0 % commission, sous-domaine offert, Store Builder, 5 sponsors).
   - PREMIUM (15 000 FCFA/mois - 0 % commission, domaine perso, BNPL, VIP).
2. Activation de l'Essai Gratuit 30 Jours :
   - Bouton « Activer mes 30 jours gratuits » sur les forfaits PRO ou PREMIUM.
   - Appel API `POST /subscriptions/start-trial`.
   - Gestion explicite du refus 403 : affichage d'un modal chaleureux expliquant que le numéro Wave/OM ou la CNI a déjà bénéficié de l'offre d'essai sur OpenBoutik.
3. Compteur de valeur perçue (Économies réalisées) :
   - Affichage d'une carte KPI valorisant le montant `totalCommissionSavedFcfa` issu de `GET /shops/me/dashboard-360` (ex: "Vous avez économisé 38 000 FCFA grâce à votre forfait PRO !").
4. Bandeau d'Urgence Dunning 72h (`DunningAlertBanner.tsx`) :
   - S'affiche en haut de toutes les pages du dashboard si `subscriptionAndDomain.dunningAlert.isPastDue === true`.
   - Affiche le décompte des heures restantes avant suspension (`gracePeriodEndsAt`) et le numéro de tentative (ex: "Tentative 2/6").
   - Texte clair : "Vos avantages 0 % et votre site dédié restent actifs pendant la période de grâce. Veuillez approvisionner votre Wallet via Wave ou OM pour éviter l'interruption de vos services."
   - Bouton 1-clic « Recharger mon Wallet » ouvrant la modale de régularisation.
```

---

## 🟢 PROMPT 4 : CRUD SPONSORS & CARTE CONCIERGERIE DOMAINE WHATSAPP

```text
Agis en tant que Lead Frontend Engineer.
Développe deux composants critiques pour `openboutik-seller` :

Composant A — Gestion des Partenaires & Sponsors (`/settings/sponsors`) :
1. Liste des sponsors actuels avec leur logo, nom, badgeText et commutateur d'activation/désactivation.
2. Formulaire modal d'ajout de sponsor (`POST /shops/me/sponsors`) : nom, URL du logo, site web optionnel, badge (ex: "Distributeur Officiel"), ordre d'affichage.
3. Règle métier : Si le plan de la boutique est FREE, désactiver le bouton d'ajout et afficher un encadré d'incitation à passer au plan PRO (qui débloque 5 sponsors). Si plan PRO, bloquer à 5 sponsors max.

Composant B — Carte Conciergerie Domaine Personnalisé (`/settings/domain`) :
1. Affichage du sous-domaine actif actuel (ex: `https://dakar-chic.openboutik.sn`) avec bouton pour copier le lien et tester la redirection.
2. Section « Votre propre nom de domaine (.sn, .com) » :
   - Champ de saisie du domaine souhaité (ex: `terangamode.sn`).
   - Bouton d'action principal « Demander l'assistance Conciergerie WhatsApp » qui génère une URL `https://wa.me/221770000000?text=...` pré-remplie avec le message :
     "Bonjour OpenBoutik Conciergerie, je souhaite brancher mon nom de domaine personnalisé [terangamode.sn] sur ma boutique [Dakar Chic] (ID: [uuid])."
   - Affichage du statut en cours (`PENDING` ou `VERIFIED`).
```

---

## 🟢 PROMPT 5 : TESTS D'INTÉGRATION & CERTIFICATION ESPACE MARCHAND

```text
Agis en tant que Staff QA & Frontend Engineer.
Rédige une suite de tests automatisés avec Playwright (ou Vitest + Testing Library) pour certifier `openboutik-seller` :

Scénarios à valider :
1. Store Builder : modification de la couleur primaire en `#059669`, mise à jour du slogan, et clic sur « Enregistrer » déclenchant `PUT /shops/me/theme` avec le JSON conforme.
2. Abonnements : tentative d'activation d'essai gratuit sur un compte ayant déjà bénéficié de l'offre, et vérification de l'affichage du modal d'erreur 403.
3. Dunning : simulation d'un statut `PAST_DUE` et vérification de la présence du bandeau rouge avec décompte d'heures.
4. Sponsors : ajout d'un sponsor avec nom et logo, et vérification de l'incrémentation dans la liste.
5. Gestion des commandes : passage d'une commande à l'état `PREPARING`, puis saisie du code OTP 6 chiffres pour déblocage des fonds.
```
