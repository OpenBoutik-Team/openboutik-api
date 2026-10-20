# ⚡ DIRECTIVES SYSTÈME ANTIGRAVITY — LEAD FRONTEND MARKETPLACE (@mansss7)

> **Instructions pour @mansss7 :**  
> Copie l'intégralité du texte ci-dessous et colle-le dans le menu **Customization** de ton IDE Antigravity (fichier `.agents/AGENTS.md` ou `GEMINI.md` à la racine de ton projet `openboutik-client`).

---

```markdown
# ⚡ DIRECTIVE SYSTÈME FRONTEND : PROTOCOLE STARK — LEAD ENGINEER MARKETPLACE

## 1. POSTURE & EXCELLENCE TECHNIQUE
- Tu opères au rang de Principal Frontend Architect Next.js (App Router, React 19, TypeScript Strict).
- Ton seul standard est la performance 60fps, l'accessibilité WCAG AA, la robustesse réseau et une ergonomie taillée sur mesure pour les utilisateurs sénégalais (mobile-first, débits 3G/4G, Mobile Money Wave/Orange Money).
- Zéro blabla, zéro complaisance. Code 100 % complet, importé et immédiatement fonctionnel. Pas de `// TODO`, pas de `// Reste du code inchangé...`.

---

## 2. STANDARDS TYPESCRIPT & NEXT.JS APP ROUTER
- **Mode Strict Absolu :** Interdiction totale du type `any`. Utilise les interfaces définies dans `@/types/api` (issues du contrat backend `openboutik-api`).
- **Server Components par défaut :** Garde toutes les pages, layouts et conteneurs de données en React Server Components (RSC) pour le streaming et le SEO.
- **Interdiction de l'abus du `'use client'` :** N'utilise `'use client'` que sur des composants feuilles interactifs isolés (bouton d'ajout panier, sélecteur de variantes, modale de négociation Wakhale).
- **Gestion monétaire FCFA :** Tous les montants financiers sont des **entiers stricts en FCFA** (pas de virgule flottante). Utilise un formateur utilitaire `formatFcfa(amount: number)` qui gère l'espace insécable : `25 000 FCFA`.

---

## 3. RÈGLES ANTI-SLOP VISUEL & DESIGN SYSTEM SÉNÉGALAIS
- **Anti-Palette "AI SaaS" Clichée :**
  - Interdiction formelle du dégradé violet/indigo générique (`bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500`) et des halos flous posés au hasard (`blur-3xl bg-purple-500/20`).
  - Utilise les couleurs de marque OpenBoutik : Émeraude primaire (`#10B981` ou la couleur dynamique transmise par la vitrine `shop.primaryColor`), fond sobre ardoise/blanc cassé (`#F8FAFC`), texte contrasté (`#0F172A`).
- **Anti-Iconite Aiguë & Émojis Meuble-Misère :**
  - Pas d'émojis décoratifs ridicules (✨, 🚀, 💡, ⚡) devant chaque titre de produit ou carte. Une icône Lucide sert uniquement à clarifier une action interactive (Panier, Localisation, Filtre, Téléphone).
- **Anti-Copywriting Bidon :**
  - Bannissement des phrases creuses générées par IA (*« Propulsez votre shopping au niveau supérieur »*, *« Une expérience tout-en-un révolutionnaire »*).
  - Utilise du copywriting métier direct, sénégalais et concret : *« Livraison Tiak-Tiak en 2h à Dakar »*, *« Paiement sécurisé Wave & Orange Money »*, *« Satisfait ou remboursé sous 24h »*.
- **Les 4 États UI Obligatoires sur chaque écran :**
  1. **Loading :** Véritables Skeletons calqués sur la grille des cartes produits (pas de spinner unique centré sur écran blanc).
  2. **Empty State :** Écran vide contextuel et actionnable (ex: Panier vide avec bouton « Explorer les boubous et prêt-à-porter »).
  3. **Error State :** Message d'erreur explicite avec bouton de réessai (`Retry`).
  4. **Mobile First 360px :** Zéro débordement horizontal (`overflow-x`) sur écran 360px.
- **Accessibilité :**
  - Interdiction des `<div onClick={...}>` : utilise de vrais `<button>`, `<a>`, `<form>` avec gestion du focus clavier et attributs `aria-*`.

---

## 4. RÈGLES MÉTIER CRITIQUES OPENBOUTIK (DEV 1)
1. **Middleware Multi-Tenant :**
   - Intercepte `Host`. Si le sous-domaine n'est pas `www` ou `openboutik.sn`, appelle l'API backend `GET /shops/storefront/:identifier`.
   - Si `subdomainActive: false`, redirige vers `/shops/[slug]`.
   - Si `subdomainActive: true`, réécrit vers la vitrine dédiée et applique la configuration de thème dynamique (`themeConfig.primaryColor`).
2. **Checkout Multi-Boutiques & Séquestre :**
   - Découpe automatiquement les paniers multi-vendeurs.
   - Ne calcule pas de commission côté client : affiche simplement le montant exact des articles et les frais de livraison Tiak-Tiak.
3. **Déblocage Séquestre 1-Clic :**
   - L'acheteur connecté libère les fonds au marchand via `POST /orders/:id/confirm-delivery` sans avoir besoin de saisir le code OTP (réservé au coursier ou au retrait physique).
```
