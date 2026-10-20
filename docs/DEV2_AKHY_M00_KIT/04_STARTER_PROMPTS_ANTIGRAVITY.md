# 🎯 STARTER PROMPTS ANTIGRAVITY — PÔLE DEV 2 (@akhy-m00 — `openboutik-seller` • Port 3001)

Ces 5 prompts séquentiels sont prêts à être copiés-collés directement dans le chat de ton IDE Antigravity pour construire l'application **`openboutik-seller`** (Port `3001` : Espace Marchand SaaS, Store Builder & Back-Office Super-Admin) en symbiose parfaite avec `openboutik-api` (Port `4000`).

---

## 🟢 PROMPT 1 : AUTH VENDEUR, TUNNEL D'ONBOARDING 5 ÉTAPES, CATALOGUE/VARIANTES & COMMANDES OTP

```text
Agis en tant que Principal Frontend Architect Next.js App Router.
Implémente le socle Marchand (`VENDOR`) pour `openboutik-seller` (Port 3001) connecté à `http://localhost:4000/api/v1`.

Fonctionnalités métier obligatoires :
1. Authentification & Onboarding Vendeur (`/register`, `/onboarding`) :
   - Inscription via `POST /auth/register/vendor` avec case obligatoire `acceptTerms: true`.
   - Tunnel d'onboarding progressif en 5 étapes consommant `GET /shops/me/onboarding` et `PATCH /shops/me/onboarding/step/:step` :
     * Étape 1 : Identité boutique + vérification live du slug (`GET /shops/check-slug/:slug` avec debounce 400ms et affichage de la suggestion en cas d'indisponibilité).
     * Étape 2 : Apparence (couleurs, logo, bannière via `POST /storage/upload-ticket` ou bouton Passer `{ skip: true }`).
     * Étape 3 : Numéro WhatsApp Social Commerce (`+221...`).
     * Étape 4 : Numéros de réception Wave, Orange Money et nom du titulaire (`payoutHolderName`).
     * Étape 5 : Choix du forfait (`FREE`, ou essai 30j `PRO`/`PREMIUM`).
2. Gestion Catalogue, Variantes & Alertes Stocks (`/dashboard/products`) :
   - CRUD Produits (`POST /products`, `PATCH /products/:id`, `DELETE /products/:id`), ajustement rapide du stock (`PATCH /products/:id/stock`) et réorganisation de la vitrine (`PATCH /products/me/layout`).
   - Gestion des déclinaisons Tailles & Couleurs (`POST /products/:id/variants`, `PATCH /products/variants/:variantId`, `DELETE /products/variants/:variantId`).
   - Bandeau d'alerte Stock Critique (`GET /products/me/low-stock`).
3. Traitement des Commandes & Déblocage Séquestre par OTP (`/dashboard/orders`) :
   - Liste filtrable par statut (`GET /orders/vendor/me`).
   - Actions : Passer en préparation (`PATCH /orders/:id/prepare`), Expédier via Tiak-Tiak (`PATCH /orders/:id/ship`).
   - Modale de saisie du code OTP à 6 chiffres fourni par le client (`POST /orders/:id/confirm-delivery` avec `{ confirmationCode }`) pour débloquer instantanément les fonds vers le Wallet.
   - Mémos confidentiels (`POST/GET /orders/:id/notes`) et téléchargement reçu PDF (`GET /orders/:id/invoice`).
```

---

## 🟢 PROMPT 2 : ÉDITEUR VISUEL STORE BUILDER TEMPS RÉEL (`PUT /shops/me/theme`)

```text
Agis en tant que Principal Frontend Architect spécialisé dans les éditeurs no-code Next.js.
Implémente le module Store Builder pour `openboutik-seller` dans la route `/dashboard/store-builder`.

Spécifications techniques :
1. Architecture en 2 colonnes (Desktop) et onglets adaptatifs (Mobile 360px) :
   - Panneau latéral gauche : Contrôles d'édition divisés en accordéons :
     a. Couleurs & Identité : Sélecteur de couleur primaire et secondaire (presets dakarois : Émeraude Teranga `#10B981`, Bleu Almadies `#0284C7`, Or Savane `#D97706`), upload logo et favicon via `POST /storage/upload-ticket`.
     b. Bannière & Typographie : Style d'en-tête (`FULL_WIDTH`, `CONTAINED`, `MINIMAL`), upload bannière, choix de police (`Inter`, `Poppins`, `Outfit`), slogan.
     c. Barre d'Annonce & Mode Vacances : Interrupteur `announcementBarEnabled`, texte promotionnel, et bascule rapide du Mode Vacances (`PATCH /shops/me/vacation`).
     d. Modules Métier : Interrupteur d'activation de la négociation « Wakhale » (`wakhaleEnabled`) et de l'affichage des sponsors (`showSponsors`).
   - Panneau droit : Aperçu Live (Preview 60fps) réagissant instantanément aux changements de l'état local (Zustand).
2. Persistance sans perte :
   - Chargement initial via `GET /shops/me/theme`.
   - Bouton « Enregistrer et Publier » appelant `PUT /shops/me/theme` avec l'objet complet `ThemeConfig`.
3. Code 100 % typé en TypeScript strict, sans aucun `any`.
```

---

## 🟢 PROMPT 3 : DASHBOARD 360°, ABONNEMENTS SAAS, ESSAI 30J, BANDEAU DUNNING 72H, SPONSORS & PORTEFEUILLE KYC

```text
Agis en tant que Lead Frontend Engineer.
Développe le Dashboard 360°, la gestion financière et les modules SaaS Phase 5 de `openboutik-seller`.

Fonctionnalités métier obligatoires :
1. Dashboard 360° & Bandeau d'Urgence Dunning 72h (`/dashboard` & `DunningAlertBanner.tsx`) :
   - Consomme `GET /shops/me/dashboard-360` et `GET /analytics/top-products`.
   - Affiche la carte KPI d'économies réalisées (`salesMetrics.totalCommissionSavedFcfa`), la répartition des ventes par canal (`MARKETPLACE`, `SUBDOMAIN`, `CUSTOM_DOMAIN`) et le Top 5 mensuel avec taux de conversion.
   - Si `subscriptionAndDomain.dunningAlert.isPastDue === true`, affiche un bandeau rouge persistant en haut de toutes les pages avec le compte à rebours avant fin de période de grâce (`gracePeriodEndsAt`), le numéro de relance (`retryCount`/6) et un bouton 1-clic « Recharger et Régulariser ».
2. Abonnements & Essai Gratuit 30 Jours (`/dashboard/billing`) :
   - Comparatif des 3 forfaits (`GET /subscriptions/plans` : FREE 3%, PRO 5 000 FCFA 0%, PREMIUM 15 000 FCFA 0%).
   - Bouton « Activer mes 30 jours d'essai gratuit » appelant `POST /subscriptions/start-trial` (gestion explicite de l'erreur 403 anti-fraude `UsedTrialRegistry`).
   - Bouton de réactivation / changement de plan (`POST /subscriptions/reactivate`).
3. Portefeuille, Recharge & Bouclier KYC CNI (`/dashboard/wallet`) :
   - Consomme `GET /wallets/me` (solde disponible vs solde en séquestre).
   - Modale de recharge Wallet (`POST /wallets/me/topup`) et modale de retrait Mobile Money (`POST /wallets/payout`).
   - Si `kycStatus !== 'VERIFIED'`, affiche le formulaire d'upload CNI (`POST /storage/upload-ticket` puis `POST /shops/me/kyc`).
4. Sponsors (`/dashboard/sponsors`) & Conciergerie Domaine (`/dashboard/domain`) :
   - CRUD Sponsors (`GET/POST/PATCH/DELETE /shops/me/sponsors`) avec blocage en plan FREE et limite à 5 en plan PRO.
   - Carte Conciergerie WhatsApp pré-remplie pour connecter un domaine `.sn` ou `.com` en plan PREMIUM.
5. Marketing, Wakhale Vendeur & Live Shopping Vendeur :
   - Codes promo (`POST/GET/PATCH/DELETE /coupons`), réponses aux avis (`PATCH /reviews/:id/reply`).
   - Réponse aux négociations Wakhale (`GET /negotiations/shop`, `PATCH /negotiations/:id/respond` avec `ACCEPT`, `COUNTER_OFFER`, `REJECT`).
   - Studio Live Shopping (`POST /streams`, `PATCH /streams/:id/status`, épinglage flash `PATCH /streams/:id/pin-product/:productId`).
```

---

## 🟢 PROMPT 4 : BACK-OFFICE SUPER-ADMIN (`/admin/*` — ARBITRAGE LITIGES, KYC & SÉQUESTRE)

```text
Agis en tant que Principal Full-Stack & Frontend Architect.
Développe l'Espace Back-Office Super-Admin dans `openboutik-seller` sous les routes `/admin/*` (strictement protégé pour `user.role === 'SUPER_ADMIN'`).

Modules obligatoires :
1. Cockpit Trésorerie Séquestre & Retraits (`/admin/escrow`) :
   - Consomme `GET /escrow/overview` : cartes KPI temps réel (Total bloqué en séquestre, Total gelé sous litige, Total reversé aux vendeurs, Commissions perçues).
   - Bouton d'exécution manuelle du filet de sécurité 24h (`POST /escrow/auto-release`).
   - Tableau de supervision des décaissements Mobile Money (`GET /wallets/admin/payouts`).
2. Tribunal d'Arbitrage des Litiges (`/admin/disputes`) :
   - Liste des litiges ouverts (`GET /disputes?status=OPEN`) et vue détaillée (`GET /disputes/:id`).
   - Visionneuse des preuves photos et lecteur d'audit de la messagerie Acheteur ↔ Vendeur sur la commande concernée (`GET /admin/messages/order/:orderId`).
   - Deux boutons d'arbitrage irrévocable (`POST /disputes/:id/arbitrate` avec saisie obligatoire de `resolutionNotes`) :
     * « Rembourser l'Acheteur (`REFUND_CLIENT`) »
     * « Libérer les fonds au Vendeur (`RELEASE_VENDOR`) »
3. Guichet de Certification KYC Marchands & Acheteurs BNPL (`/admin/kyc`) :
   - Visualisation sécurisée des pièces CNI via `GET /storage/secure-view?fileUrl=...` (lien signé éphémère 15 min).
   - Validation ou rejet du KYC Marchand (`PATCH /shops/admin/:id/kyc` avec `{ status: 'VERIFIED' | 'REJECTED', verifyShopBadge: true, adminNotes }`) et certification boutique (`PATCH /shops/:id/verify`).
   - Validation ou rejet du KYC Acheteur BNPL (`PATCH /bnpl/admin/kyc/:targetUserId` avec `{ status: 'VERIFIED' | 'REJECTED', rejectionReason }`).
```

---

## 🟢 PROMPT 5 : SUITE DE TESTS D'INTÉGRATION E2E (`openboutik-seller` — MARCHAND & SUPER-ADMIN)

```text
Agis en tant que Staff QA & Frontend Engineer.
Rédige une suite de tests automatisés (Playwright ou Vitest + Testing Library) pour certifier `openboutik-seller` sur le port 3001 :

Scénarios à valider :
1. Onboarding Vendeur & Catalogue : validation live du slug (`GET /shops/check-slug/:slug`), création d'un produit avec variante et saisie du code OTP 6 chiffres (`POST /orders/:id/confirm-delivery`).
2. Store Builder & Dunning 72h : modification du thème et appel `PUT /shops/me/theme`, affichage du bandeau rouge d'urgence quand `dunningAlert.isPastDue === true`, et gestion du refus 403 sur `POST /subscriptions/start-trial`.
3. Wakhale & Live Shopping Vendeur : envoi d'une contre-offre (`PATCH /negotiations/:id/respond` avec `action: 'COUNTER_OFFER'`) et épinglage d'un produit en direct (`PATCH /streams/:id/pin-product/:productId`).
4. Back-Office Super-Admin : affichage de `GET /escrow/overview`, arbitrage d'un litige (`POST /disputes/:id/arbitrate`) et validation KYC d'un marchand (`PATCH /shops/admin/:id/kyc`).
```
