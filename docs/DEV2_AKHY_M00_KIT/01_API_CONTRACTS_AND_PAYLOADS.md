# 📡 CONTRATS D'API & PAYLOADS — PÔLE DEV 2 (@akhy-m00 — `openboutik-seller` • Port 3001)
**Base URL Locale :** `http://localhost:4000/api/v1`  
**Base URL Production :** `https://openboutik-api.onrender.com/api/v1`  
**Format global :** `application/json` avec enveloppe standard `{ "success": boolean, "data": ..., "message": string, "timestamp": string }`  
**Rôles couverts par `openboutik-seller` :** `VENDOR` (Espace Marchand SaaS & Store Builder) et `SUPER_ADMIN` (Back-Office Administration & Arbitrage).

---

## 1. AUTHENTIFICATION VENDEUR & ONBOARDING EN 5 ÉTAPES (`VENDOR`)

### `POST /auth/register/vendor`
Création de compte marchand en transaction ACID (User + Shop + VendorWallet).
- **Payload :**
```json
{
  "phone": "+221771234567",
  "fullName": "Moussa Diop",
  "email": "moussa.diop@terangamode.sn",
  "password": "Passer123!",
  "acceptTerms": true
}
```
*(Rejet `400 Bad Request` si `acceptTerms` est `false`).*

### `GET /shops/check-slug/:slug`
Vérifie en temps réel si le nom de sous-domaine/slug est disponible et bloque les mots système réservés (`admin`, `api`, `www`, `checkout`, etc.).
- **Réponse `200 OK` :** `{ "available": true, "slug": "teranga-mode" }` ou `{ "available": false, "suggestion": "teranga-mode-dakar" }`.

### `GET /shops/me/onboarding` & `PATCH /shops/me/onboarding/step/:step`
- `GET /shops/me/onboarding` : Renvoie `onboardingStep` (1..5), `onboardingCompleted` et la `checklist` (`hasCompletedOnboarding`, `hasAddedFirstProduct`, `isKycVerified`).
- `PATCH /shops/me/onboarding/step/:step` :
  - **Étape 1 (Identité) :** `{ "name": "Teranga Mode", "slug": "teranga-mode", "mainCategory": "Mode", "city": "Dakar", "description": "..." }`
  - **Étape 2 (Apparence - skippable) :** `{ "primaryColor": "#10B981", "logoUrl": "https://...", "bannerUrl": "https://..." }` ou `{ "skip": true }`
  - **Étape 3 (WhatsApp) :** `{ "whatsappNumber": "+221771234567" }`
  - **Étape 4 (Paiements Séquestre) :** `{ "waveNumber": "+221771234567", "omNumber": "+221761234567", "payoutHolderName": "Moussa Diop" }` *(active la boutique)*
  - **Étape 5 (Plan SaaS - skippable) :** `{ "plan": "FREE" }` (ou `"PRO"`, `"PREMIUM"`).

---

## 2. GESTION DU CATALOGUE, DES VARIANTES & DES STOCKS (`VENDOR`)

### `POST /products` • `PATCH /products/:id` • `DELETE /products/:id`
- **Payload `POST /products` :**
```json
{
  "name": "Boubou Bazin Riche Brodé",
  "description": "Broderie traditionnelle cousue main à la Médina",
  "priceFcfa": 35000,
  "compareAtPriceFcfa": 45000,
  "stock": 12,
  "lowStockThreshold": 3,
  "categoryId": "uuid-categorie",
  "images": ["https://storage.openboutik.sn/products/boubou1.jpg"]
}
```

### `PATCH /products/:id/stock`
Ajustement rapide du stock physique : `{ "stock": 20 }`.

### `PATCH /products/me/layout`
Ordonner les produits sur la vitrine (Store Builder) :
```json
{
  "items": [
    { "productId": "uuid-prod-1", "displayOrder": 1, "isFeatured": true },
    { "productId": "uuid-prod-2", "displayOrder": 2, "isFeatured": false }
  ]
}
```

### `POST /products/:id/variants` • `PATCH /products/variants/:variantId` • `DELETE /products/variants/:variantId`
- **Payload `POST /products/:id/variants` :**
```json
{
  "sku": "BOUBOU-BN-XL",
  "priceFcfa": 35000,
  "compareAtPriceFcfa": 40000,
  "stock": 6,
  "attributes": { "taille": "XL", "couleur": "Bleu Nuit" }
}
```

### `GET /products/me/low-stock` & `POST /categories`
- `GET /products/me/low-stock` : Liste tous les produits et variantes dont `stock <= lowStockThreshold`.
- `POST /categories` : Créer une catégorie personnalisée (`{ "name": "Collection Tabaski", "description": "..." }`).

---

## 3. STORE BUILDER, ABONNEMENTS SAAS, ESSAI 30J, DUNNING 72H & SPONSORS (`VENDOR`)

### `GET /shops/me/theme` & `PUT /shops/me/theme`
Charge et sauvegarde sans perte le JSON complet de l'éditeur Store Builder (`themeConfig`), tout en synchronisant automatiquement les colonnes SQL de la boutique (`primaryColor`, `bannerUrl`, `logoUrl`, `faviconUrl`, `slogan`, `announcementBarText`, `announcementBarEnabled`).
- **Payload `PUT /shops/me/theme` :**
```json
{
  "primaryColor": "#059669",
  "secondaryColor": "#1E293B",
  "fontFamily": "Poppins",
  "bannerStyle": "FULL_WIDTH",
  "bannerUrl": "https://storage.openboutik.sn/banners/teranga-ete-2026.jpg",
  "logoUrl": "https://storage.openboutik.sn/logos/teranga-logo.png",
  "faviconUrl": "https://storage.openboutik.sn/favicons/teranga-icon.png",
  "slogan": "La référence du prêt-à-porter sénégalais chic",
  "announcementBarText": "Livraison Tiak-Tiak offerte dès 35 000 FCFA",
  "announcementBarEnabled": true,
  "wakhaleEnabled": true,
  "showSponsors": true,
  "layoutGridColumns": 3
}
```

### `GET /shops/me/dashboard-360`
Consolidation complète du Dashboard Marchand 360° en une seule requête :
- `shop` : identité, statut KYC, mode vacances.
- `subscriptionAndDomain` : forfait (`FREE`, `PRO`, `PREMIUM`), statut (`TRIALING`, `ACTIVE`, `PAST_DUE`), `subdomainUrl`, et **`dunningAlert`** (`isPastDue`, `retryCount`, `gracePeriodEndsAt`, `warningMessage`).
- `wallet` : `availableBalanceFcfa`, `escrowBalanceFcfa`, `kycStatus`.
- `salesMetrics` : `totalCommissionSavedFcfa`, `totalRevenueFcfa`, `ordersCount`, `salesByChannel`.
- `inventoryHealth` : `totalProducts`, `lowStockAlertsCount`, `outOfStockCount`.
- `topProducts` : top ventes avec vues et volume.

### `GET /subscriptions/plans` • `POST /subscriptions/start-trial` • `POST /subscriptions/reactivate` • `POST /subscriptions/upgrade`
- `GET /subscriptions/plans` : Grille officielle (`FREE` 0 FCFA / 3 %, `PRO` 5 000 FCFA / 0 % + sous-domaine, `PREMIUM` 15 000 FCFA / 0 % + domaine custom + BNPL).
- `POST /subscriptions/start-trial` : `{ "plan": "PRO" }` ou `"PREMIUM"`. Active 30 jours gratuits à 0 % de commission (ou renvoie `403 Forbidden` si déjà utilisé via `UsedTrialRegistry`).
- `POST /subscriptions/reactivate` : `{ "plan": "PRO" }` ou `"PREMIUM"`. Débite le Wallet marchand et rétablit immédiatement `ACTIVE` + sous-domaine.

### `GET /shops/me/sponsors` • `POST /shops/me/sponsors` • `PATCH /shops/me/sponsors/:sponsorId` • `DELETE /shops/me/sponsors/:sponsorId`
Gestion des partenaires affichés sur la vitrine (Plan FREE : interdit `403`, Plan PRO : max 5 sponsors, Plan PREMIUM : illimité).

---

## 4. COMMANDES VENDEUR, LIVRAISON TIAK-TIAK (CODE OTP), MÉMOS & REÇUS PDF (`VENDOR`)

- **`GET /orders/vendor/me?status=PAID_ESCROW` :** Liste des commandes reçues par la boutique.
- **`PATCH /orders/:id/prepare` :** Passe la commande en `PREPARING`.
- **`PATCH /orders/:id/ship` :** Passe la commande en `SHIPPED_TIAK_TIAK` et lance le compte à rebours d'auto-déblocage de 24h.
- **`POST /orders/:id/confirm-delivery` :** Validation par saisie du code OTP à 6 chiffres fourni par le client :
  ```json
  { "confirmationCode": "482910" }
  ```
  *Effet immédiat :* Débloque le séquestre vers `availableBalanceFcfa` et exécute l'Auto-Sweep si un abonnement était en `PAST_DUE`.
- **`POST /orders/:id/notes` & `GET /orders/:id/notes` :** Ajout et lecture des mémos internes confidentiels vendeur (`{ "content": "Client appelé, livraison prévue à 16h" }`).
- **`GET /orders/:id/invoice` :** Téléchargement du reçu PDF officiel.

---

## 5. PORTEFEUILLE, RECHARGE, RETRAITS & KYC MARCHAND (`VENDOR`)

- **`GET /wallets/me` :** Solde disponible (`availableBalanceFcfa`), solde séquestré (`escrowBalanceFcfa`), statut KYC et historique des retraits.
- **`POST /wallets/me/topup` :** Recharger son Wallet marchand (`{ "amountFcfa": 5000, "provider": "WAVE", "phoneNumber": "+221771234567" }`).
- **`POST /shops/me/kyc` :** Soumettre sa CNI sénégalaise (`{ "idCardNumber": "1 758 1990 04821", "idCardUrl": "https://..." }`).
- **`POST /wallets/payout` :** Demander un virement vers Wave ou Orange Money (`{ "amountFcfa": 25000, "provider": "WAVE", "recipientPhone": "+221771234567" }`). Rejeté avec `403 Forbidden` si `kycStatus !== 'VERIFIED'`.

---

## 6. MARKETING, MODE VACANCES, WAKHALE VENDEUR, LIVE SHOPPING & ANALYTICS (`VENDOR`)

- **Mode Vacances :** `PATCH /shops/me/vacation` avec `{ "isOnVacation": true, "vacationMessage": "Boutique fermée pour le Magal jusqu'à lundi" }`.
- **Codes Promo :** `POST /coupons` (`{ "code": "TABASKI20", "type": "PERCENTAGE", "value": 20, "minOrderAmountFcfa": 15000, "maxUses": 100, "expiresAt": "2026-12-31T23:59:59Z" }`), `GET /coupons`, `PATCH /coupons/:id`, `DELETE /coupons/:id`.
- **Réponse aux Avis & Analytics :** `PATCH /reviews/:id/reply` (`{ "reply": "Merci pour votre confiance !" }`) et `GET /analytics/top-products` (Top 5 mensuel avec CA, unités vendues, vues et taux de conversion).
- **Wakhale Vendeur :**
  - `GET /negotiations/shop` : Offres de prix reçues des acheteurs.
  - `PATCH /negotiations/:id/respond` :
    - Accepter : `{ "action": "ACCEPT" }` (génère automatiquement le coupon `WAKHALE-XXXXXX` pour l'acheteur).
    - Contre-offre : `{ "action": "COUNTER_OFFER", "counterPriceFcfa": 31000 }`.
    - Refuser : `{ "action": "REJECT" }`.
- **Live Shopping Vendeur :**
  - `POST /streams` : Créer un Live ou une vidéo courte avec `productIds`.
  - `PATCH /streams/:id/status` : `{ "status": "LIVE" }` ou `{ "status": "ENDED" }`.
  - `PATCH /streams/:id/pin-product/:productId` : Épingle instantanément un produit en pop-up sur les écrans de tous les spectateurs connectés en WebSocket.
  - `DELETE /streams/:id` : Supprimer un flux.
- **Upload Direct Cloud :** `POST /storage/upload-ticket` (pour photos produits, bannières, vidéos et CNI KYC).

---

## 7. BACK-OFFICE SUPER-ADMIN (`SUPER_ADMIN` — Routes `/admin/*`)

### A. Supervision Globale du Séquestre & des Retraits
- **`GET /escrow/overview` :** Retourne la trésorerie globale en temps réel (total bloqué `HELD_IN_ESCROW`, total gelé `FROZEN_BY_DISPUTE`, total libéré `RELEASED_TO_VENDOR`, commissions perçues).
- **`POST /escrow/auto-release` :** Déclenche manuellement le filet de sécurité 24h pour libérer les commandes expédiées non contestées.
- **`GET /wallets/admin/payouts?status=PENDING` :** Liste et contrôle de tous les décaissements Mobile Money de la plateforme.

### B. Arbitrage Officiel des Litiges Séquestre
- **`GET /disputes?status=OPEN` :** Liste complète des litiges ouverts avec preuves et détails commande.
- **`GET /disputes/:id` :** Détail complet d'un dossier de litige.
- **`GET /admin/messages/order/:orderId` :** Historique intégral des messages échangés entre l'acheteur et le vendeur sur la commande en litige.
- **`POST /disputes/:id/arbitrate` :**
```json
{
  "decision": "REFUND_CLIENT",
  "resolutionNotes": "Preuve photo concluante : article endommagé, remboursement intégral du client via Wave."
}
```
*(Valeurs de `decision` : `"REFUND_CLIENT"` ou `"RELEASE_VENDOR"`).*

### C. Validation KYC Marchands, Certification Boutiques & KYC BNPL Acheteurs
- **`GET /storage/secure-view?fileUrl=https://...` :** Génère une URL éphémère signée (valable 15 minutes) pour examiner la CNI d'un vendeur ou d'un client.
- **`PATCH /shops/admin/:id/kyc` :** Valider ou rejeter le dossier KYC d'une boutique :
```json
{
  "status": "VERIFIED",
  "verifyShopBadge": true,
  "adminNotes": "CNI sénégalaise conforme au titulaire du compte Wave."
}
```
- **`PATCH /shops/:id/verify` :** Attribuer ou retirer le badge certifié (`{ "isVerified": true, "notes": "Vérification terrain validée" }`).
- **`PATCH /bnpl/admin/kyc/:targetUserId` :** Valider ou rejeter le KYC d'un acheteur pour le paiement fractionné BNPL 3x/4x :
```json
{
  "status": "VERIFIED",
  "rejectionReason": "Document valide"
}
```
