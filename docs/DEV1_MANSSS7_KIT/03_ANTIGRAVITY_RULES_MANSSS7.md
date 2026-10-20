# ⚡ DIRECTIVES SYSTÈME ANTIGRAVITY — LEAD FRONTEND MARKETPLACE (@mansss7)

> **Instructions pour Mansour (`@mansss7` — Dev 1) :**  
> Copie l'intégralité du bloc ci-dessous et colle-le dans le menu **Customization** de ton IDE Antigravity (fichier `.agents/AGENTS.md` ou `GEMINI.md` à la racine de ton dépôt **`openboutik-marketplace`** sur le port **`3000`**).

---

```markdown
# ⚡ DIRECTIVE SYSTÈME FRONTEND : PROTOCOLE STARK — LEAD ENGINEER MARKETPLACE (DEV 1)

## 1. IDENTITÉ, DÉPÔT & PORT OFFICIELS
- **Développeur :** Mansour (`@mansss7`) — Lead Frontend Marketplace (Dev 1).
- **Dépôt GitHub :** `openboutik-marketplace` (**Port local : `3000`**).
- **API Backend de référence :** `openboutik-api` (`http://localhost:4000/api/v1` en local, `https://openboutik-api.onrender.com/api/v1` en production).
- **Standard :** Next.js App Router, React 19, TypeScript Strict (`strict: true`), performance 60fps, accessibilité WCAG AA et ergonomie mobile-first adaptée au marché sénégalais (3G/4G, Wave, Orange Money, Free Money, Tiak-Tiak).
- **Zéro blabla, code 100 % complet :** Aucun placeholder (`// TODO`, `// Reste du code inchangé...`).

---

## 2. STANDARDS TYPESCRIPT & NEXT.JS APP ROUTER
- **Zéro `any` :** Utilise exclusivement les interfaces strictes de `@/types/api` alignées avec `openboutik-api`.
- **Server Components par défaut :** Garde les pages, layouts et conteneurs en React Server Components (RSC) pour le SEO et le streaming.
- **Isolation `'use client'` :** N'utilise `'use client'` que sur les composants feuilles interactifs (panier, sélecteur de variantes, modale de négociation Wakhale, lecteur Live Shopping WebSocket).
- **Monnaie FCFA stricte :** Tous les montants sont des **entiers stricts en FCFA** (zéro virgule flottante). Utilise `formatFcfa(amount: number)` avec espace insécable (`35 000 FCFA`).

---

## 3. RÈGLES ANTI-SLOP VISUEL & DESIGN SYSTEM SÉNÉGALAIS
- **Anti-Palette "AI SaaS" Clichée :**
  - Interdiction formelle du dégradé violet/indigo (`from-indigo-500 via-purple-500 to-pink-500`) et des halos flous génériques.
  - Utilise la charte OpenBoutik : Émeraude primaire (`#10B981` ou la couleur dynamique `themeConfig.primaryColor` sur les vitrines marchandes), fond sobre (`#F8FAFC`), texte contrasté (`#0F172A`).
- **Anti-Copywriting Bidon :**
  - Bannis les phrases creuses générées par IA. Utilise un copywriting concret et ancré au Sénégal : *« Livraison Tiak-Tiak à Dakar »*, *« Argent protégé par Séquestre Wave & Orange Money »*, *« Négociez votre prix avec le Wakhale »*.
- **Les 4 États UI Obligatoires sur chaque écran :**
  1. **Loading :** Skeletons calqués sur la grille réelle des cartes produits.
  2. **Empty State :** Écran vide contextuel avec bouton d'action.
  3. **Error State :** Message d'erreur explicite avec bouton `Réessayer`.
  4. **Mobile First 360px :** Zéro débordement horizontal (`overflow-x`) sur écran 360px.
- **Sémantique & Accessibilité :** Interdiction des `<div onClick={...}>`, utilise `<button>`, `<a>`, `<form>`.

---

## 4. RÈGLES MÉTIER CRITIQUES OPENBOUTIK (DEV 1 — `openboutik-marketplace`)
1. **Middleware Multi-Tenant & `StorefrontRenderer` :**
   - Intercepte `Host`. Si sous-domaine (`[slug].openboutik.sn`) ou domaine custom, appelle `GET /shops/storefront/:identifier`.
   - Si `subdomainActive: false`, redirige vers `/shops/[slug]`.
   - Si `subdomainActive: true`, affiche la vitrine personnalisée du marchand avec ses couleurs (`themeConfig`), sa barre d'annonce et ses sponsors.
2. **Routes Backend Exactes :**
   - Catalogue : `GET /products` et `GET /products/:shopSlug/:productSlug` (jamais `/catalog/products`).
   - Suivi commande : `GET /orders/:id/tracking` (au singulier).
   - Favoris : `GET /wishlist`, `POST /wishlist/:productId`, `DELETE /wishlist/:productId`.
   - Wakhale client : `POST /negotiations`, `GET /negotiations/my`, `PATCH /negotiations/:id/accept-counter`.
   - BNPL client : `POST /bnpl/kyc`, `POST /bnpl/orders/:orderId/init`, `GET /bnpl/my-plans`, `POST /bnpl/installments/:installmentId/pay`.
3. **Déblocage Séquestre 1-Clic & Litiges :**
   - L'acheteur connecté confirme la réception en 1 clic via `POST /orders/:id/confirm-delivery` (body `{}`) ou ouvre un litige via `POST /disputes/:orderId`.
```
