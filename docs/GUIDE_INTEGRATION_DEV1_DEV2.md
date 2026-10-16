# 🔌 GUIDE D'INTÉGRATION OFFICIEL — OPENBOUTIK API
## À destination de Dev 1 (Marketplace Client) et Dev 2 (Espace Marchand & Back-Office Admin)

> **API Base URL (Cloud Production) :** `https://openboutik-api.onrender.com/api/v1`  
> **Swagger Interactive (Cloud Production) :** `https://openboutik-api.onrender.com/api/docs`  
> **API Base URL (Local Dev) :** `http://localhost:4000/api/v1`  
> **Swagger Interactive (Local Dev) :** `http://localhost:4000/api/docs`  
> **Format d'Enveloppe JSON standardisé :**
```json
{
  "success": true,
  "data": { ... },
  "message": "Message de confirmation",
  "timestamp": "2026-10-15T23:30:00.000Z"
}
```
> **En-tête d'authentification requis :**
```http
Authorization: Bearer <accessToken>
```

---

## 📱 PARTIE 1 : DEV 1 — MARKETPLACE ACHETEUR (`openboutik-marketplace`)
**Port local suggéré :** `3000`

### 1. Authentification Client
* **Inscription Client :**
  * `POST /auth/register/client` ou `POST /auth/register` (avec `role: "CLIENT"`)
  * **Body :**
    ```json
    {
      "phone": "+221770030003",
      "fullName": "Fatou Ndiaye",
      "email": "fatou.ndiaye@gmail.com",
      "password": "Passer123!"
    }
    ```
  * **Règle :** Le téléphone doit respecter le format sénégalais `+221` suivi de 9 chiffres.
* **Connexion :**
  * `POST /auth/login` avec `{ "phone": "+221770030003", "password": "Passer123!" }`
  * **Retourne :** `{ "accessToken": "...", "refreshToken": "...", "user": { ... } }`

---

### 2. Catalogue Public & Vitrines
* **Recherche et filtres paginés :**
  * `GET /products?search=sneakers&category=chaussures&minPrice=10000&maxPrice=50000&page=1&limit=20`
* **Fiche produit détaillée :**
  * `GET /products/:shopSlug/:productSlug`
  * Inclut les informations de la boutique (nom, contact direct WhatsApp, badge vérifié).
* **Vitrines marchandes :**
  * `GET /shops` (annuaire public)
  * `GET /shops/:slug` (vitrine dédiée du marchand avec ses produits)

---

### 3. Panier Multi-Boutiques & Checkout Sécurisé
* **Création de commande (Panier unique multi-marchands) :**
  * `POST /orders/checkout`
  * **Body :**
    ```json
    {
      "items": [
        { "productId": "uuid-produit-1", "quantity": 1 },
        { "productId": "uuid-produit-2", "quantity": 2 }
      ],
      "deliveryMethod": "TIAK_TIAK", // ou "PICKUP"
      "deliveryAddress": "Almadies Zone 4, Dakar",
      "deliveryCity": "Dakar",
      "deliveryPhone": "+221770030003",
      "deliveryNotes": "Immeuble vert 2ème étage",
      "paymentProvider": "WAVE" // ou "ORANGE_MONEY"
    }
    ```
  * **Mécanique Backend automatique :**
    * Vérifie et réserve le stock de manière atomique.
    * Découpe automatiquement le panier en sous-commandes distinctes par boutique.
    * Bloque les fonds en séquestre (`HELD_IN_ESCROW`).
    * Calcule les commissions exactes (4 % en plan FREE, 2 % en plan PREMIUM).
    * Génère un code OTP Tiak-Tiak à 6 chiffres unique pour chaque commande.

---

### 4. Suivi des Commandes & Déblocage Séquestre
* **Mes commandes client :**
  * `GET /orders/client/me`
* **Détail d'une commande :**
  * `GET /orders/:id`
* **Confirmer la réception (Libération des fonds au marchand — Déblocage 1-clic) :**
  * `POST /orders/:id/confirm-delivery`
  * **Body :** `{}` (Pour l'acheteur connecté, aucun code n'est requis : un simple clic sur le bouton **« J'ai bien reçu ma commande »** suffit).
  * **Effet instantané :** Débloque immédiatement le montant net de la commande vers le solde disponible du commerçant.
  * **Filet de sécurité automatique (24h) :** Si l'acheteur ne confirme pas manuellement et qu'aucun litige n'est ouvert, les fonds sont automatiquement libérés au vendeur **24h** après l'expédition.

---

### 5. Signalement de Problème & Litige Acheteur
* **Ouvrir un litige :**
  * `POST /disputes/:orderId`
  * **Body :**
    ```json
    {
      "reason": "Article non conforme ou endommagé lors du transport Tiak-Tiak",
      "evidenceUrls": ["https://storage.openboutik.sn/disputes/photo.jpg"]
    }
    ```
  * **Impact :** Gèle immédiatement le séquestre (`FROZEN_BY_DISPUTE`) et bloque tout déblocage d'argent tant que le Super-Admin n'a pas tranché.

---

## 💼 PARTIE 2 : DEV 2 — DASHBOARD MARCHAND & BACK-OFFICE ADMIN (`openboutik-seller`)
**Port local suggéré :** `3001`

### 1. Inscription Vendeur & Étape 0 (CGU Contractuelles)
* **Création de compte marchand :**
  * `POST /auth/register/vendor`
  * **Body :**
    ```json
    {
      "phone": "+221771234567",
      "fullName": "Moussa Diop",
      "email": "moussa.diop@terangamode.sn",
      "password": "Passer123!",
      "acceptTerms": true // OBLIGATOIRE (Rejet 400 si false)
    }
    ```
  * Horodate contractuellement `acceptedTermsAt` en base MySQL.

---

### 2. Tunnel d'Onboarding Vendeur (Étapes 1 à 5)
Permet une sauvegarde progressive et une reprise fluide de session interrompue.

* **Vérification de disponibilité du slug en temps réel (Debounce UI) :**
  * `GET /shops/check-slug/:slug`
  * **Réponse :** `{ "available": true, "slug": "dakar-mode", "suggestion": "dakar-mode-123" }`
* **État d'avancement & Checklist de démarrage :**
  * `GET /shops/me/onboarding`
  * **Réponse :**
    ```json
    {
      "hasShop": true,
      "onboardingStep": 3,
      "onboardingCompleted": false,
      "shop": { ... },
      "checklist": {
        "hasCompletedOnboarding": false,
        "hasAddedFirstProduct": false,
        "isKycVerified": false
      }
    }
    ```
* **Sauvegarde progressive d'une étape :**
  * `PATCH /shops/me/onboarding/step/:stepNumber`
  * **Étape 1 — Identité de la boutique (Obligatoire) :**
    ```json
    {
      "name": "Teranga Mode",
      "slug": "teranga-mode",
      "mainCategory": "Mode & Prêt-à-porter",
      "city": "Dakar",
      "description": "Boutique artisanale dakaroise"
    }
    ```
  * **Étape 2 — Apparence Vitrine (Optionnelle / Skip) :**
    ```json
    { "primaryColor": "#10B981", "logoUrl": "https://...", "bannerUrl": "https://..." }
    // OU pour sauter :
    { "skip": true }
    ```
  * **Étape 3 — Social Commerce WhatsApp (Obligatoire) :**
    ```json
    { "whatsappNumber": "+221771234567" }
    ```
  * **Étape 4 — Réception des Paiements Séquestre (Obligatoire) :**
    ```json
    {
      "waveNumber": "+221771234567",
      "omNumber": "+221761234567",
      "payoutHolderName": "Moussa Diop" // OBLIGATOIRE
    }
    ```
    *Activera automatiquement la boutique (`isActive = true`) et passera `onboardingCompleted = true`.*
  * **Étape 5 — Choix du Forfait SaaS (Optionnelle) :**
    ```json
    { "plan": "FREE" } // ou "PREMIUM"
    ```

---

### 3. Gestion du Catalogue Marchand
* `POST /products` : Créer un produit (prix entier FCFA, stock initial, tableau d'images).
* `PATCH /products/:id` : Mettre à jour un produit (titre, prix, description).
* `PATCH /products/:id/stock` : Ajustement rapide du stock physique (`{ "stock": 15 }`).
* `DELETE /products/:id` : Supprimer un article (contrôle d'ownership strict BOLA).

---

### 4. Traitement des Commandes Vendeur
* **Liste des commandes de ma boutique :**
  * `GET /orders/vendor/me?status=PAID_ESCROW`
* **Passer en préparation :**
  * `PATCH /orders/:id/prepare`
* **Expédier via Tiak-Tiak :**
  * `PATCH /orders/:id/ship`
  * *Enclenche automatiquement le compte à rebours de sécurité de 24h (`autoReleaseAt`).*
* **Valider la remise avec le code OTP :**
  * `POST /orders/:id/confirm-delivery` avec `{ "confirmationCode": "482910" }` (code 6 chiffres fourni par le client).

---

### 5. Portefeuille & Bouclier KYC Progressif (CNI au 1er Retrait)
Le KYC n'est pas bloquant lors de l'inscription pour maximiser la conversion des marchands. Il est en revanche **strictement exigé avant tout décaissement de fonds**.

* **Consulter mon solde :**
  * `GET /wallets/me`
  * Retourne : `availableBalanceFcfa` (disponible), `escrowBalanceFcfa` (en cours de livraison), `kycStatus` (`NONE`, `PENDING`, `VERIFIED`, `REJECTED`).
* **Demande de retrait :**
  * `POST /wallets/payout` avec `{ "amountFcfa": 25000, "provider": "WAVE", "recipientPhone": "+221771234567" }`
  * **Comportement :**
    * Si KYC === `NONE` ou `PENDING` -> Rejet immédiat **`403 Forbidden`** avec message clair pour l'UI :  
      `"Retrait impossible : Votre compte marchand doit être certifié (KYC)..."`
    * Si KYC === `VERIFIED` et montant <= solde -> **`200 OK`**, débit ACID et virement Wave/OM.
* **Soumettre sa pièce d'identité (CNI) :**
  * `POST /shops/me/kyc`
  * **Body :**
    ```json
    {
      "idCardNumber": "1 758 1990 04821",
      "idCardUrl": "https://storage.openboutik.sn/kyc/cni-recto-verso.jpg"
    }
    ```
  * Passe le statut KYC en `PENDING` pour instruction administrative.

---

### 6. Espace Back-Office Super-Admin (`SUPER_ADMIN`)
Réservé aux administrateurs de la plateforme pour la certification et les arbitrages.

* **Validation / Rejet KYC Marchand :**
  * `PATCH /shops/admin/:shopId/kyc`
  * **Body :**
    ```json
    {
      "status": "VERIFIED", // ou "REJECTED"
      "verifyShopBadge": true,
      "adminNotes": "CNI sénégalaise conforme et valide"
    }
    ```
  * Attribue automatiquement le badge bleu "Marchand Vérifié" et débloque les retraits.
* **Arbitrage des Litiges Séquestre :**
  * `POST /disputes/:id/arbitrate`
  * **Body :**
    ```json
    {
      "decision": "REFUND_CLIENT", // ou "RELEASE_VENDOR"
      "decisionNotes": "Colis abîmé constaté, remboursement client intégral accordé"
    }
    ```
* **Surveillance globale du Séquestre :**
  * `GET /escrow/overview` : Totalisé des fonds en séquestre, gelés et reversés.
* **Déclenchement du cron d'auto-déblocage 24h :**
  * `POST /escrow/auto-release`
