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
    * Calcule les commissions exactes (3 % en plan FREE marketplace, 0 % en forfaits PRO et PREMIUM).
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
    { "plan": "FREE" } // ou "PRO" (5 000 FCFA à 0 % com), "PREMIUM" (15 000 FCFA à 0 % com + BNPL)
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

---

## 🚀 PARTIE 3 : NOUVELLES FONCTIONNALITÉS ROADMAP V2 (OCTOBRE 2026)

### 🛒 1. Pour Dev 1 (Marketplace Acheteur)

#### A. Sélection des Variantes (Tailles & Couleurs)
* Chaque produit retourné par `GET /products` et `GET /products/:shopSlug/:productSlug` inclut désormais son tableau `variants` :
  ```json
  {
    "id": "uuid-variante",
    "sku": "BOUBOU-BN-XL",
    "priceFcfa": 35000,
    "compareAtPriceFcfa": 40000,
    "stock": 6,
    "attributes": { "taille": "XL", "couleur": "Bleu Nuit" },
    "isActive": true
  }
  ```
* Lors de l'ajout au panier et du checkout, renseigner le champ optionnel `variantId` :
  ```json
  {
    "items": [
      { "productId": "uuid-produit", "variantId": "uuid-variante", "quantity": 1 }
    ]
  }
  ```

#### B. Affichage du Mode Vacances
* Si `shop.isOnVacation === true`, la vitrine et les fiches produits restent visibles mais un bandeau d'information doit s'afficher :
  * Afficher `shop.vacationMessage` (ex: *"Boutique fermée pour le Magal jusqu’à lundi"*).
  * Désactiver le bouton « Acheter » ou « Ajouter au panier ».

#### C. Validation & Application de Codes Promo
* **Tester un code promo avant paiement :**
  * `POST /coupons/validate`
  * **Body :**
    ```json
    {
      "code": "TABASKI20",
      "shopId": "uuid-de-la-boutique",
      "subtotalFcfa": 50000
    }
    ```
  * **Retourne :**
    ```json
    {
      "valid": true,
      "couponId": "uuid-coupon",
      "code": "TABASKI20",
      "type": "PERCENTAGE",
      "value": 20,
      "discountAmountFcfa": 10000,
      "newSubtotalFcfa": 40000
    }
    ```
* **Application au Checkout :**
  * Passer `couponCode` dans le body de `POST /orders/checkout` :
    ```json
    {
      "items": [ ... ],
      "couponCode": "TABASKI20",
      "deliveryAddress": "Mermoz, Dakar",
      "deliveryPhone": "+221765432109",
      "paymentProvider": "WAVE"
    }
    ```

#### D. Avis Clients & Notation 5 Étoiles (Achat Vérifié)
* **Consulter les avis d'un produit (Public) :**
  * `GET /products/:productId/reviews`
  * Retourne la note moyenne `averageRating` (ex: 4.8), le total d'avis `totalReviews` et les avis avec prénoms anonymisés (ex: *"Fatou S."*) et réponses vendeur.
* **Publier un avis (Client avec commande livrée `DELIVERED_CONFIRMED`) :**
  * `POST /products/:productId/reviews`
  * **Body :**
    ```json
    {
      "rating": 5,
      "comment": "Tissu de qualité supérieure, livraison rapide par Tiak-Tiak !"
    }
    ```

#### E. Téléchargement du Reçu d'Achat PDF
* `GET /orders/:id/invoice`
* Retourne un flux binaire (`Content-Type: application/pdf`) téléchargeable directement.

#### F. Tracking Automatique des Visites
* À chaque affichage d'une page produit, envoyer un appel non-bloquant :
  * `POST /products/:id/view`

---

### 💼 2. Pour Dev 2 (Espace Marchand & Back-Office Vendeur)

#### A. Gestion des Variantes de Produits
* `POST /products/:id/variants` : Créer une déclinaison (taille, couleur, stock dédié, prix spécifique).
* `PATCH /products/variants/:variantId` : Mettre à jour le stock ou le prix d'une variante.
* `DELETE /products/variants/:variantId` : Supprimer une déclinaison.

#### B. Alertes de Seuil de Stock Critique
* Configuration dans la création/mise à jour produit via `lowStockThreshold` (entier).
* `GET /products/me/low-stock` : Tableau de bord de réapprovisionnement listant les produits dont `currentStock <= threshold` avec le flag `isLowStock: true`.

#### C. Activation / Désactivation du Mode Vacances
* `PATCH /shops/me/vacation`
* **Body :**
  ```json
  {
    "isOnVacation": true,
    "vacationMessage": "Boutique fermée pour congés annuels du 10 au 20 octobre."
  }
  ```

#### D. Générateur de Codes Promotionnels Marchand
* `POST /coupons` : Créer un code promo (`PERCENTAGE` ou `FIXED_FCFA`, date d'expiration, quota `maxUses`).
* `GET /coupons` : Liste des codes promo actifs et expirés de la boutique.
* `PATCH /coupons/:id` : Ajuster la valeur, prolonger la date ou désactiver le code.
* `DELETE /coupons/:id` : Supprimer définitivement un code promo.

#### E. Mémos Internes Vendeur sur Commandes
* `POST /orders/:id/notes` : Ajouter une note interne (ex: *"Client appelé, livraison reportée à 17h"*).
* `GET /orders/:id/notes` : Historique des notes internes confidentielles (strictement invisibles pour le client acheteur).

#### F. Factures & Reçus Marchand
* `GET /orders/:id/invoice` : Téléchargement du reçu officiel PDF de la commande avec mentions légales.

#### G. Modération & Réponses aux Avis Clients
* `PATCH /reviews/:id/reply`
* **Body :**
  ```json
  {
    "reply": "Merci beaucoup pour votre commande et votre confiance !"
  }
  ```

#### H. Dashboard Analytique & Top 5 Mensuel
* `GET /analytics/top-products`
* Retourne pour le mois en cours les 5 meilleures ventes avec :
  * Chiffre d'affaires cumulé en FCFA (`totalRevenueFcfa`)
  * Nombre d'unités vendues (`totalUnitsSold`)
  * Nombre de visites cumulées (`totalViews`)
  * Taux de conversion exact (`conversionRate` en %)

#### I. Store Builder — Sauvegarde & Récupération du Thème JSON (Spécifique Dev 2)
* **Sauvegarder le JSON complet du Store Builder :**
  * `PUT /shops/me/theme`
  * **Headers :** `Authorization: Bearer <vendeur_token>`
  * **Body (JSON libre / Theme Builder) :**
    ```json
    {
      "primaryColor": "#10B981",
      "bannerUrl": "https://res.cloudinary.com/.../banner.jpg",
      "logoUrl": "https://res.cloudinary.com/.../logo.png",
      "slogan": "Le chic sénégalais au cœur de Dakar",
      "announcementBarText": "Livraison gratuite à partir de 25 000 FCFA",
      "announcementBarEnabled": true,
      "wakhaleEnabled": true,
      "layout": "modern-grid",
      "sections": [
        { "type": "hero-slider", "order": 1, "enabled": true },
        { "type": "featured-products", "order": 2, "limit": 8 }
      ],
      "customCss": ""
    }
    ```
  * **Comportement API :** Met à jour la colonne `shop.themeConfig` en base tout en synchronisant automatiquement les colonnes relationnelles directes (`primaryColor`, `bannerUrl`, `logoUrl`, etc.).
* **Récupérer le JSON du Store Builder :**
  * `GET /shops/me/theme`
  * **Headers :** `Authorization: Bearer <vendeur_token>`
  * **Retourne :** `{ "success": true, "themeConfig": { ... }, "shop": { ... } }`

#### J. Statut Dunning & Alertes Recouvrement Vendeur (Spécifique Dev 2)
* **Consultation du profil et santé de la boutique :**
  * `GET /shops/vendor/me` ou `GET /shops/me/dashboard-360`
  * **Champ `subscriptionAndDomain.dunningAlert` :**
    * Si la boutique a un paiement SaaS échoué :
      * `isPastDue`: `true`
      * `subscriptionStatus`: `"PAST_DUE"`
      * `retryCount`: Nombre de relances effectuées (ex: 2)
      * `gracePeriodEndsAt`: Date ISO limite avant suspension du sous-domaine/boutique
      * `warningMessage`: Message d'alerte explicite en français/FCFA
    * **Action UI requise pour Dev 2 :** Afficher un bandeau rouge persistant en haut du dashboard marchand avec un décompte des jours restants avant coupure et un bouton de régularisation Wave/OM.

#### K. Validation en Temps Réel des Slugs & Mots Réservés (Dev 1 & Dev 2)
* `GET /shops/check-slug/:slug`
* **Protection Système :** Rejette immédiatement avec `{ "available": false, "reason": "Ce nom est un mot-clé système réservé." }` les slugs suivants :
  * `api`, `admin`, `www`, `app`, `auth`, `dashboard`, `checkout`, `mail`, `secure`, `static`, etc.

#### L. Forfaits SaaS, 0 % Commission & Essai Gratuit 30j (Spécifique Dev 2)
* **Grille tarifaire officielle :**
  * `GET /subscriptions/plans`
  * Retourne les 3 forfaits :
    * `FREE` : 0 FCFA/mois, 3.0 % de commission sur les ventes marketplace.
    * `PRO` : 5 000 FCFA/mois, **0 % de commission**, sous-domaine dédié (`https://nom-boutique.openboutik.sn`), Store Builder, 5 sponsors, Wakhale.
    * `PREMIUM` : 15 000 FCFA/mois, **0 % de commission**, site dédié, paiement fractionné BNPL 3x/4x, badge Vendeur Vérifié Or, visibilité VIP.
* **Activer le mois d'essai gratuit de 30 jours (0 % et sous-domaine offert) :**
  * `POST /subscriptions/trial`
  * **Headers :** `Authorization: Bearer <vendeur_token>`
  * **Body :** `{ "plan": "PRO" }` (ou `"PREMIUM"`)
  * Accordé immédiatement en 1-clic pour 30 jours si le marchand n'en a jamais bénéficié (protégé par `UsedTrialRegistry`).
* **Souscrire ou changer de forfait :**
  * `POST /subscriptions/upgrade` avec `{ "plan": "PRO" }` ou `{ "plan": "PREMIUM" }`
* **Réactiver immédiatement après régularisation solde :**
  * `POST /subscriptions/reactivate`
  * Débite instantanément le solde disponible du portefeuille et rétablit le statut `ACTIVE`, les 0 % de commission et le sous-domaine.
* **Historique des facturations du marchand :**
  * `GET /subscriptions/me`

---

## 🛍️ PARTIE 4 : NOUVEAUTÉS ROADMAP ESPACE ACHETEUR (OCTOBRE 2026)

### 1. Multi-Providers Mobile Money (Wave, Orange Money & Free Money)
* **Paiement par Free Money :**
  * Le champ `paymentProvider` accepte désormais `"FREE_MONEY"` en plus de `"WAVE"` et `"ORANGE_MONEY"`.
  * Numéro de réception Free Money de la boutique consultable sur la vitrine (`freeMoneyNumber`).
* **Consultation du statut de transaction d'une commande :**
  * `GET /payments/order/:orderId`
  * Retourne la transaction associée, le statut (`INITIATED`, `SUCCESS`, `FAILED`), le fournisseur et la référence externe.

### 2. Favoris / Wishlist Client
* **Ajouter un produit aux favoris :**
  * `POST /wishlists/:productId`
* **Retirer un produit des favoris :**
  * `DELETE /wishlists/:productId`
* **Lister mes favoris :**
  * `GET /wishlists` (retourne la liste complète des articles sauvegardés avec fiches produit enrichies).

### 3. Messagerie Interne Conversationnelle Acheteur - Vendeur
* **Envoyer un message :**
  * `POST /messages`
  * **Body :**
    ```json
    {
      "receiverId": "uuid-vendeur-ou-client",
      "shopId": "uuid-boutique",       // Optionnel
      "productId": "uuid-produit",      // Optionnel (ex: question sur un article)
      "orderId": "uuid-commande",       // Optionnel (ex: question après-vente)
      "content": "Bonjour, le boubou blanc taille L est-il encore disponible à la boutique ?"
    }
    ```
* **Récupérer le fil de discussion avec un utilisateur :**
  * `GET /messages/conversation/:userId`
* **Compteur global de messages non lus (Badge cloche/chat) :**
  * `GET /messages/unread/count` (retourne `{ "unreadCount": 3 }`)
* **Marquer un message comme lu :**
  * `PATCH /messages/:id/read`

### 4. Suivi de Commande & Stepper Timeline
* **Consulter la timeline chronologique d'une commande :**
  * `GET /orders/:id/trackings`
  * Retourne les étapes ordonnées : `PAID_ESCROW` ➔ `PREPARING` ➔ `SHIPPED_TIAK_TIAK` ➔ `DELIVERED_CONFIRMED` avec horodatages précis et commentaires compréhensibles pour l'acheteur.
* **Ajouter un jalon d'expédition (Dev 2 Marchand / Coursier) :**
  * `POST /orders/:id/trackings`
  * **Body :** `{ "statusStep": "SHIPPED_TIAK_TIAK", "title": "Colis remis au coursier Tiak-Tiak", "comment": "Livraison en cours sur Almadies" }`

### 5. Filtres Catalogue & Recherche Avancée
* `GET /catalog/products`
* **Paramètres de requête supportés :**
  * `search` : Recherche textuelle sur le nom et la description.
  * `category` : Filtrage par catégorie.
  * `minPrice` & `maxPrice` : Fourchette de prix en FCFA.
  * `inStock` : `true` pour exclure les ruptures de stock.
  * `shopId` : Filtrer les articles d'une boutique spécifique.
  * `page` & `limit` : Pagination optimisée.
  * `sortBy` : `price_asc`, `price_desc`, `newest`, `popular`.

---

## 🚀 PARTIE 5 : NOUVEAUTÉS ROADMAP PHASE 4 — DISRUPTION & SCALING (OCTOBRE 2026)

### 1. Le « Wakhale » numérique — Négociation de Prix

#### A. Flux Acheteur (Dev 1 - Marketplace)
* **Initier une négociation de prix (Faire une offre) :**
  * `POST /negotiations`
  * **Body :**
    ```json
    {
      "productId": "uuid-du-produit",
      "proposedPriceFcfa": 12000, // Rabais max 50 % du prix initial
      "notes": "Je prends tout de suite si vous acceptez 12 000 FCFA"
    }
    ```
* **Consulter mes négociations en cours :**
  * `GET /negotiations/me` (statuts : `PENDING`, `ACCEPTED`, `COUNTER_OFFERED`, `REJECTED`, `EXPIRED`)
* **Détail d'une négociation :**
  * `GET /negotiations/:id`
* **Répondre à une contre-offre du vendeur :**
  * `POST /negotiations/:id/respond`
  * **Body :** `{ "action": "ACCEPT" }` ou `{ "action": "REJECT" }`
* **Utilisation automatique du Coupon Wakhale :**
  * Dès qu'une négociation passe à l'état `ACCEPTED` (que le vendeur ait accepté l'offre ou que l'acheteur ait accepté la contre-offre), l'API génère automatiquement un coupon unique lié : `data.generatedCoupon.code` (ex: `WAKHALE-A8B9C1`).
  * Ce coupon est utilisable lors du checkout pour déduire immédiatement la différence négociée.

#### B. Flux Vendeur (Dev 2 - Espace Marchand)
* **Consulter les offres reçues pour ma boutique :**
  * `GET /negotiations/me`
* **Accepter, Rejeter ou Faire une contre-offre :**
  * `POST /negotiations/:id/respond`
  * **Body pour accepter :**
    ```json
    { "action": "ACCEPT", "notes": "Marché conclu !" }
    ```
  * **Body pour contre-offre :**
    ```json
    { "action": "COUNTER", "counterPriceFcfa": 13500, "notes": "Je vous le laisse au prix coûtant à 13 500 FCFA" }
    ```
  * **Body pour refuser :**
    ```json
    { "action": "REJECT", "notes": "Désolé, prix non négociable sur cet article" }
    ```

---

### 2. Live Shopping & Vidéos Courtes

#### A. Consultation des Flux (Dev 1 & Dev 2)
* **Lister les Lives et Vidéos courtes :**
  * `GET /streams?type=LIVE_STREAM&status=LIVE_NOW`
  * `GET /streams?type=SHORT_VIDEO`
* **Détail d'un flux :**
  * `GET /streams/:id` (inclut les articles rattachés `streamProducts`).

#### B. Gestion Vendeur (Dev 2 - Espace Marchand)
* **Créer une session Live ou une vidéo :**
  * `POST /streams`
  * **Body :**
    ```json
    {
      "title": "Vente Flash Spéciale Tabaski — Boubous & Sandales",
      "description": "Direct depuis notre atelier à Sandaga avec remises exclusives",
      "type": "LIVE_STREAM", // ou "SHORT_VIDEO"
      "mediaUrl": "https://cdn.openboutik.sn/live/stream1.m3u8",
      "thumbnailUrl": "https://cdn.openboutik.sn/thumbnails/live1.jpg",
      "scheduledAt": "2026-10-20T18:00:00.000Z",
      "productIds": ["uuid-produit-1", "uuid-produit-2"]
    }
    ```
* **Changer le statut du stream :**
  * `PATCH /streams/:id/status` avec `{ "status": "LIVE_NOW" }` ou `{ "status": "ENDED" }`
* **Épingler un produit en direct (Pop-up Flash sur les écrans des spectateurs) :**
  * `POST /streams/:id/pin-product`
  * **Body :**
    ```json
    {
      "productId": "uuid-produit-1",
      "specialPriceFcfa": 10000 // Prix promotionnel exclusif pendant le direct
    }
    ```

#### C. Intégration WebSocket Temps Réel (`/streams`)
* **URL de connexion Socket.io :**
  * Cloud : `https://openboutik-api.onrender.com/streams`
  * Local : `http://localhost:4000/streams`
* **Exemple d'intégration Frontend (Next.js / React) :**
  ```typescript
  import { io } from 'socket.io-client';

  const socket = io('http://localhost:4000/streams', {
    transports: ['websocket'],
  });

  // 1. Rejoindre la salle du Live
  socket.emit('join_stream', { streamId: 'uuid-stream', userName: 'Fatou' });

  // 2. Écouter le Pop-Up Produit Flash en direct
  socket.on('live_product_popup', (data) => {
    console.log('Produit épinglé en direct :', data.product, 'Prix flash :', data.specialPriceFcfa);
    // Afficher le bandeau d'achat rapide 1-clic sur le lecteur vidéo
  });

  // 3. Envoyer un message dans le chat du Live
  socket.emit('stream_chat_message', {
    streamId: 'uuid-stream',
    userName: 'Fatou',
    message: 'Est-ce que la livraison sur Ouakam est possible aujourd’hui ?'
  });

  // 4. Recevoir les messages du chat
  socket.on('stream_chat_message', (msg) => {
    console.log(`${msg.userName} : ${msg.message}`);
  });
  ```

---

### 3. Achat Fractionné / BNPL (3 ou 4 fois)

#### A. Vérification d'Identité KYC Acheteur
L'octroi d'un échéancier 3x ou 4x exige un profil KYC vérifié :
* **Soumettre sa pièce d'identité (Dev 1 - Espace Client) :**
  * `POST /bnpl/kyc/submit`
  * **Body :**
    ```json
    {
      "idCardNumber": "1759199000123",
      "idCardUrl": "https://storage.openboutik.sn/kyc/cni_client.jpg"
    }
    ```
* **Validation / Rejet KYC (Dev 2 / Super-Admin Back-Office) :**
  * `PATCH /bnpl/kyc/review`
  * **Body :**
    ```json
    {
      "userId": "uuid-client",
      "status": "VERIFIED", // ou "REJECTED"
      "rejectionReason": "Photo floue, merci de reprendre" // si rejeté
    }
    ```

#### B. Souscription & Échéancier BNPL (Dev 1 - Marketplace Checkout)
* **Initier le fractionnement d'une commande :**
  * `POST /bnpl/initiate`
  * **Body :**
    ```json
    {
      "orderId": "uuid-commande",
      "installmentsCount": 3 // ou 4
    }
    ```
  * **Comportement financier strict :**
    * Calcule les tranches au FCFA près sans arrondi flottant.
    * Le reliquat de division est reporté sur l'échéance 1.
    * Échéance 1 payable immédiatement, Échéance 2 à +30 jours, Échéance 3 à +60 jours.
* **Consulter mes plans BNPL en cours :**
  * `GET /bnpl/plans/me`
* **Détail d'un plan avec toutes ses échéances :**
  * `GET /bnpl/plans/:id`
* **Régler une échéance :**
  * `POST /bnpl/payments/:id/pay`
  * **Body :**
    ```json
    {
      "paymentProvider": "WAVE", // ou "ORANGE_MONEY", "FREE_MONEY"
      "phone": "+221770030003"
    }
    ```
  * Dès paiement de la dernière tranche, le plan passe automatiquement à `COMPLETED`.

---

### 4. ☁️ Stockage Cloud Sécurisé & Téléversement Direct (Photos, Vidéos & CNI)

Pour ne pas surcharger la mémoire du serveur NestJS et garantir une sécurité maximale des documents d'identité :

#### A. Demander un Ticket d'Upload Direct Signé (Dev 1 & Dev 2)
* **Endpoint :** `POST /storage/upload-ticket` (Authentifié JWT)
* **Body :**
  ```json
  {
    "filename": "cni_recto.jpg",
    "fileType": "image/jpeg",
    "fileSize": 1548576,
    "category": "KYC_DOCUMENT" // ou "STREAM_MEDIA", "PRODUCT_IMAGE", "SHOP_BANNER"
  }
  ```
* **Réponse API :**
  ```json
  {
    "ticketId": "840f6b4b-9e4b-4a52-9b24-9694294d1df0",
    "provider": "SECURE_STORAGE", // ou "CLOUDINARY" dès abonnement
    "uploadUrl": "https://openboutik-api.onrender.com/api/v1/storage/upload/...",
    "publicUrl": "https://openboutik-api.onrender.com/storage/files/openboutik/kyc/...",
    "signedParams": { "token": "hmac_sha256_hash", "timestamp": 1730000000 },
    "expiresAt": "2026-10-18T23:59:59.000Z",
    "isPrivate": true
  }
  ```

#### B. Workflow Frontend 1-2-3 (Next.js) :
1. Le client choisit son fichier dans le navigateur (`<input type="file" />`).
2. Le frontend appelle `POST /storage/upload-ticket` pour obtenir `uploadUrl`.
3. Le frontend envoie le fichier directement vers `uploadUrl` via un simple `fetch(uploadUrl, { method: 'POST', body: formData })`.
4. Ensuite, le frontend enregistre l'URL finale `publicUrl` dans l'API (`/bnpl/kyc/submit` ou `/streams`).

#### C. Visualisation Éphémère Sécurisée pour les CNI KYC (Super-Admin)
* **Endpoint :** `GET /storage/secure-view?fileUrl=https://...` (Super-Admin uniquement)
* Génère une URL signée temporaire avec jeton valable **15 minutes** pour examiner la CNI en toute confidentialité légale.



