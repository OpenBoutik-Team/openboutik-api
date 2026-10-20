# 💼 KIT D'INTÉGRATION DEV 2 — ESPACE MARCHAND SAAS, STORE BUILDER & BACK-OFFICE SUPER-ADMIN NEXT.JS
**Destinataire :** **El hadji Mor** (`@akhy-m00` — [github.com/akhy-m00](https://github.com/akhy-m00))  
**Rôle :** **Dev 2 — Lead Frontend Seller & Super-Admin**  
**Dépôt GitHub :** `openboutik-seller` (**Port local officiel : `3001`**)  
**Backend de référence :** `openboutik-api` (Dev 3 — `@HYPNOTYZEDCHART` — **Port local : `4000`**)  
**Environnement API Production :** `https://openboutik-api.onrender.com/api/v1`  
**Environnement API Local :** `http://localhost:4000/api/v1`  
**Swagger Docs :** `http://localhost:4000/api/docs`

---

## 1. CARTOGRAPHIE OFFICIELLE DES 3 DÉPÔTS & PORTS

| Pôle | Développeur | Dépôt GitHub | Port Local | Périmètre & Mission |
| :--- | :--- | :--- | :--- | :--- |
| **Dev 1** | **Mansour (`@mansss7`)** | `openboutik-marketplace` | `3000` | Front Client Next.js (Catalogue, Vitrines Multi-Tenant, Panier, Checkout, Espace Acheteur) |
| **Dev 2 (Toi)** | **El hadji Mor (`@akhy-m00`)** | **`openboutik-seller`** | **`3001`** | **Front Marchand SaaS, Store Builder & Back-Office Super-Admin Next.js** |
| **Dev 3** | **Bécaye (`@HYPNOTYZEDCHART`)** | `openboutik-api` | `4000` | Cerveau Backend NestJS, Prisma 7, MySQL InnoDB, Moteur de Séquestre et Logistique |

> [!CAUTION]
> **CONSIGNE CRITIQUE BASE DE DONNÉES (CLEVER CLOUD) :**  
> La base de données MySQL hébergée sur Clever Cloud (`bffneh8kcrtiqsl58wig`) est **déjà synchronisée avec la Phase 5**.  
> **NE JAMAIS exécuter `npx prisma migrate deploy` à l'aveugle** : toutes les tables (`shop_sponsors`, `subscription_billing_logs`, `used_trial_registries`) et colonnes (`themeConfig`, `subdomainEnabled`, etc.) sont déjà en production.

---

## 2. PÉRIMÈTRE COMPLET & MISSION DE @akhy-m00 (DEV 2 — `openboutik-seller` • Port `3001`)

En tant que **Lead Frontend Seller & Super-Admin (Dev 2)** sur le port **`3001`**, ton application `openboutik-seller` regroupe **deux grands pôles applicatifs** protégés par RBAC (`VENDOR` et `SUPER_ADMIN`) :

---

### PÔLE 1 : FRONT MARCHAND SAAS & STORE BUILDER (Rôle `VENDOR`)

#### A. Inscription Marchand & Tunnel d'Onboarding en 5 Étapes
- Inscription vendeur via `POST /auth/register/vendor` avec acceptation contractuelle des CGU (`acceptTerms: true` obligatoire).
- Vérification de disponibilité du slug en temps réel avec debounce (`GET /shops/check-slug/:slug`) et rejet automatique des mots réservés (`admin`, `api`, `www`, `checkout`, etc.).
- Consultation de l'avancement (`GET /shops/me/onboarding`) et sauvegarde progressive étape par étape (`PATCH /shops/me/onboarding/step/:step`, étapes 1 à 5 : Identité, Apparence, WhatsApp, Numéros Wave/OM, Forfait SaaS).

#### B. Gestion Complète du Catalogue, des Variantes & des Stocks
- CRUD Produits (`POST /products`, `PATCH /products/:id`, `DELETE /products/:id`), ajustement rapide du stock (`PATCH /products/:id/stock`), organisation de l'ordre d'affichage sur la vitrine (`PATCH /products/me/layout`) et création de catégories (`POST /categories`).
- Gestion des déclinaisons Tailles / Couleurs (`POST /products/:id/variants`, `PATCH /products/variants/:variantId`, `DELETE /products/variants/:variantId`).
- Tableau de bord des alertes de stock critique (`GET /products/me/low-stock`).

#### C. Traitement des Commandes, Livraison Tiak-Tiak (Code OTP), Mémos & Factures PDF
- Liste des commandes reçues par la boutique (`GET /orders/vendor/me?status=PAID_ESCROW`).
- Passage en préparation (`PATCH /orders/:id/prepare`) puis remise au coursier Tiak-Tiak (`PATCH /orders/:id/ship`, qui déclenche le timer d'auto-déblocage de 24h).
- **Validation de livraison par code OTP à 6 chiffres :** Saisie du code transmis par l'acheteur via `POST /orders/:id/confirm-delivery` (`{ "confirmationCode": "482910" }`) ➔ débloque immédiatement le séquestre vers le Wallet disponible (et déclenche l'Auto-Sweep si un abonnement était en souffrance).
- Mémos internes confidentiels sur commande (`POST /orders/:id/notes`, `GET /orders/:id/notes`) et téléchargement du reçu PDF officiel (`GET /orders/:id/invoice`).

#### D. Portefeuille Marchand (`VendorWallet`), Recharge & Bouclier KYC CNI
- Consultation des soldes (`GET /wallets/me` : `availableBalanceFcfa` disponible vs `escrowBalanceFcfa` bloqué en séquestre + statut KYC).
- Recharge du Wallet (`POST /wallets/me/topup`) via Wave, Orange Money ou Free Money pour payer ou régulariser son abonnement SaaS.
- Soumission de la CNI sénégalaise (`POST /shops/me/kyc` après upload signé `POST /storage/upload-ticket`).
- Demande de retrait Mobile Money (`POST /wallets/payout` : bloqué en `403 Forbidden` tant que `kycStatus !== 'VERIFIED'`).

#### E. Store Builder, Dashboard 360°, Abonnements SaaS, Essai 30j, Dunning 72h & Sponsors
- **Store Builder Temps Réel :** Éditeur visuel no-code avec aperçu live 60fps chargeant `GET /shops/me/theme` et sauvegardant sans perte via `PUT /shops/me/theme` (`primaryColor`, `secondaryColor`, `fontFamily`, `bannerStyle`, `slogan`, `announcementBarText`, `wakhaleEnabled`, `showSponsors`).
- **Dashboard 360° & Bandeau d'Urgence Dunning 72h :** Consomme `GET /shops/me/dashboard-360`. Si `subscriptionAndDomain.dunningAlert.isPastDue === true`, affiche un bandeau rouge persistant en haut du dashboard avec le compteur d'heures restantes (`gracePeriodEndsAt`), le numéro de tentative (`retryCount`/6) et le bouton de régularisation (`POST /wallets/me/topup` + `POST /subscriptions/reactivate`).
- **Grille des 3 Forfaits & Essai Gratuit 30 Jours :** Consultation (`GET /subscriptions/plans`), activation 1-clic des 30 jours gratuits (`POST /subscriptions/start-trial`, avec gestion du refus anti-fraude `403`), et compteur d'économies réalisées (`totalCommissionSavedFcfa`).
- **Sponsors (`shop_sponsors`) & Conciergerie Domaine WhatsApp :** CRUD sponsors (`GET/POST/PATCH/DELETE /shops/me/sponsors` : interdit en FREE, max 5 en PRO, illimité en PREMIUM) et carte Conciergerie WhatsApp pour connecter un domaine `.sn`/`.com` en forfait PREMIUM.

#### F. Marketing, Mode Vacances, Avis, Analytics, Wakhale Vendeur & Live Shopping Vendeur
- **Mode Vacances :** Activation/désactivation via `PATCH /shops/me/vacation` (`isOnVacation`, `vacationMessage`).
- **Codes Promotionnels :** CRUD complet (`POST /coupons`, `GET /coupons`, `PATCH /coupons/:id`, `DELETE /coupons/:id`).
- **Réponse aux Avis & Analytics :** Réponse publique sous un avis client (`PATCH /reviews/:id/reply`) et Top 5 mensuel des produits avec taux de conversion (`GET /analytics/top-products`).
- **Wakhale Vendeur :** Consultation des offres reçues (`GET /negotiations/shop`) et réponse (`PATCH /negotiations/:id/respond` avec `action: "ACCEPT" | "REJECT" | "COUNTER_OFFER"` et `counterPriceFcfa`).
- **Live Shopping Vendeur :** Création de direct/vidéo courte (`POST /streams`), changement de statut (`PATCH /streams/:id/status`), épinglage flash d'un produit en direct sur les écrans des spectateurs (`PATCH /streams/:id/pin-product/:productId`) et suppression (`DELETE /streams/:id`).

---

### PÔLE 2 : BACK-OFFICE SUPER-ADMIN (`SUPER_ADMIN`)

Accessible sur `openboutik-seller` (routes `/admin/*`) pour les comptes ayant le rôle `SUPER_ADMIN` (ex: `admin@openboutik.sn` / `Admin@OpenBoutik2026!`) :

1. **Supervision de la Trésorerie Séquestre & Filet 24h :**
   - `GET /escrow/overview` : Total en temps réel des fonds bloqués en séquestre, gelés sous litige et reversés aux vendeurs + commissions perçues.
   - `POST /escrow/auto-release` : Déclenchement du cron d'auto-déblocage des commandes expédiées depuis > 24h sans litige.
   - `GET /wallets/admin/payouts` : Supervision et historique global de tous les retraits Mobile Money marchands.
2. **Arbitrage des Litiges Séquestre (`Disputes`) :**
   - `GET /disputes?status=OPEN` : Liste de toutes les réclamations acheteurs avec preuves photos.
   - `GET /admin/messages/order/:orderId` : Lecture d'audit de tous les échanges de messagerie entre l'acheteur et le vendeur liés à la commande en litige.
   - `POST /disputes/:id/arbitrate` : Décision souveraine en transaction ACID :
     - `"REFUND_CLIENT"` : Rembourse intégralement l'acheteur et annule le séquestre.
     - `"RELEASE_VENDOR"` : Débloque les fonds en faveur du commerçant.
3. **Validation KYC Marchands, Certification Boutiques & KYC BNPL Acheteurs :**
   - `GET /storage/secure-view?fileUrl=...` : Génère un lien éphémère signé (valable 15 min) pour inspecter la CNI en toute sécurité.
   - `PATCH /shops/admin/:id/kyc` : Approuve (`VERIFIED`) ou rejette (`REJECTED`) le KYC d'un marchand et attribue le badge vérifié (`verifyShopBadge: true`).
   - `PATCH /shops/:id/verify` : Attribution ou révocation directe du badge « Boutique Certifiée ».
   - `PATCH /bnpl/admin/kyc/:targetUserId` : Approuve (`VERIFIED`) ou rejette (`REJECTED`) la CNI d'un acheteur pour l'éligibilité au paiement fractionné BNPL 3x/4x.

---

## 3. ARBORESCENCE DU KIT D'INTÉGRATION DEV 2

1. **`00_README_AKHY_M00.md`** *(Ce fichier)* : Vue d'ensemble, cartographie des ports et périmètre complet (Marchand SaaS + Super-Admin).
2. **`01_API_CONTRACTS_AND_PAYLOADS.md`** : Spécification chirurgicale de tous les endpoints consommés par Dev 2 (`VENDOR` & `SUPER_ADMIN`).
3. **`02_TYPESCRIPT_INTERFACES.ts`** : Fichier TypeScript strict complet sans aucun `any`, prêt à copier dans `openboutik-seller/src/types/api.ts`.
4. **`03_ANTIGRAVITY_RULES_AKHY_M00.md`** : Directives système à injecter dans la section `Customization` de ton IDE Antigravity.
5. **`04_STARTER_PROMPTS_ANTIGRAVITY.md`** : 5 prompts séquentiels prêts à exécuter pour construire l'Espace Marchand, le Store Builder et le Back-Office Super-Admin.
