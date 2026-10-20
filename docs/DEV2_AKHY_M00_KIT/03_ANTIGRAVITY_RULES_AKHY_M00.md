# ⚡ DIRECTIVES SYSTÈME ANTIGRAVITY — LEAD FRONTEND SELLER & SUPER-ADMIN (@akhy-m00)

> **Instructions pour El hadji Mor (`@akhy-m00` — Dev 2) :**  
> Copie l'intégralité du texte ci-dessous et colle-le dans le menu **Customization** de ton IDE Antigravity (fichier `.agents/AGENTS.md` ou `GEMINI.md` à la racine de ton dépôt **`openboutik-seller`** sur le port **`3001`**).

---

```markdown
# ⚡ DIRECTIVE SYSTÈME FRONTEND : PROTOCOLE STARK — LEAD ENGINEER SELLER SAAS & SUPER-ADMIN (DEV 2)

## 1. IDENTITÉ, DÉPÔT & PORT OFFICIELS
- **Développeur :** El hadji Mor (`@akhy-m00`) — Lead Frontend Seller & Super-Admin (Dev 2).
- **Dépôt GitHub :** `openboutik-seller` (**Port local : `3001`**).
- **API Backend de référence :** `openboutik-api` (`http://localhost:4000/api/v1` en local, `https://openboutik-api.onrender.com/api/v1` en production).
- **Périmètre double :**
  1. **Espace Marchand SaaS (`VENDOR`) :** Onboarding 5 étapes, Catalogue/Variantes/Stocks, Commandes & Validation OTP Tiak-Tiak, Portefeuille/KYC/Retraits, Store Builder Temps Réel, Abonnements/Essai 30j/Bandeau Dunning 72h, Sponsors, Conciergerie Domaine, Codes Promo, Mode Vacances, Wakhale Vendeur, Live Shopping Vendeur & Analytics.
  2. **Back-Office Super-Admin (`SUPER_ADMIN` sur `/admin/*`) :** Supervision Trésorerie Séquestre, Arbitrage des Litiges (`REFUND_CLIENT` / `RELEASE_VENDOR`), Lecture d'audit des messages, Validation KYC Marchands & Acheteurs BNPL, Certification des boutiques.
- **Zéro blabla, code 100 % complet :** Aucun placeholder (`// TODO`, `// Reste du code inchangé...`).

---

## 2. STANDARDS TYPESCRIPT & ARCHITECTURE SAAS
- **Mode Strict Absolu :** Interdiction totale du type `any`. Utilise exclusivement les interfaces de `@/types/api`.
- **Performance du Store Builder :**
  - Isole l'état local d'édition dans un store performant (Zustand ou Context localisé).
  - La prévisualisation en direct dans le panneau droit de l'éditeur réagit à 60fps.
  - La persistance vers le backend (`PUT /shops/me/theme`) envoie l'objet complet `themeConfig` sans perte.
- **Gestion monétaire FCFA :** Tous les montants financiers sont des **entiers stricts en FCFA** (zéro virgule flottante). Utilise `formatFcfa(amount: number)` avec espace insécable (`15 000 FCFA`).

---

## 3. RÈGLES ANTI-SLOP VISUEL & DASHBOARD MÉTIER DENSE
- **Anti-Palette "AI SaaS" Clichée :**
  - Interdiction formelle du dégradé violet/indigo (`from-indigo-500 via-purple-500 to-pink-500`) et des halos flous génériques.
  - Palette sobre et pro : Ardoise foncé (`#0F172A`), bordures nettes (`border-slate-200`), cartes blanches épurées, accentuation émeraude (`#10B981`).
- **Anti-Grille de 3 Cartes Jumelles :**
  - Conçois des interfaces denses et fonctionnelles : tableaux de commandes filtrables, indicateurs de stock critique, compteurs de séquestre, dossiers d'arbitrage Super-Admin avec preuves et chronologie.
- **Les 4 États UI Obligatoires sur chaque écran :**
  1. **Loading :** Skeletons calqués sur la disposition réelle du dashboard.
  2. **Empty State :** Écran vide contextuel et actionnable.
  3. **Error State :** Message d'erreur explicite avec bouton `Réessayer`.
  4. **Mobile First 360px :** Zéro débordement horizontal (`overflow-x`) sur écran 360px.

---

## 4. RÈGLES MÉTIER CRITIQUES OPENBOUTIK (DEV 2 — `openboutik-seller`)
1. **Bandeau d'Urgence Dunning (72h) :**
   - Consomme `subscriptionAndDomain.dunningAlert` depuis `GET /shops/me/dashboard-360`. Si `isPastDue === true`, affiche un bandeau rouge persistant en haut du dashboard avec le décompte d'heures restantes (`gracePeriodEndsAt`) et un bouton de recharge (`POST /wallets/me/topup` + `POST /subscriptions/reactivate`).
2. **Mois d'Essai Gratuit 30 Jours :**
   - Appelle `POST /subscriptions/start-trial`. Gère l'erreur `403 Forbidden` (registre anti-fraude `UsedTrialRegistry`) avec un modal explicatif clair.
3. **Déblocage Séquestre par Code OTP 6 Chiffres :**
   - Le vendeur/coursier valide la remise via `POST /orders/:id/confirm-delivery` avec `{ "confirmationCode": "482910" }`.
4. **Wakhale Vendeur Exact :**
   - Consulte `GET /negotiations/shop` et répond via `PATCH /negotiations/:id/respond` avec `action: "ACCEPT" | "REJECT" | "COUNTER_OFFER"`.
5. **Cloisonnement RBAC Super-Admin :**
   - Protège toutes les routes `/admin/*` pour le rôle `SUPER_ADMIN` uniquement. Utilise `GET /storage/secure-view?fileUrl=...` pour inspecter les pièces CNI avant d'appeler `PATCH /shops/admin/:id/kyc` ou `PATCH /bnpl/admin/kyc/:targetUserId`.
```
