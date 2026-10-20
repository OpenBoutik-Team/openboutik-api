# 📡 CONTRATS D'API & PAYLOADS — PÔLE DEV 1 (@mansss7 — `openboutik-marketplace` • Port 3000)
**Base URL Locale :** `http://localhost:4000/api/v1`  
**Base URL Production :** `https://openboutik-api.onrender.com/api/v1`  
**Format global :** `application/json` avec enveloppe standard `{ "success": boolean, "data": ..., "message": string, "timestamp": string }`.

---

## 1. RÉSOLUTION MULTI-TENANT & VITRINES MARCHANDES

### `GET /shops/storefront/:identifier`
Utilisé par le `middleware.ts` et la page `/storefront/[identifier]` de `openboutik-marketplace` pour résoudre une vitrine marchande à partir d'un sous-domaine (`[slug].openboutik.sn`) ou d'un domaine personnalisé (`[domaine].sn`).

- **Authentification :** Publique
- **Paramètre d'URL :** `:identifier` (ex: `teranga-mode` ou `teranga-mode.openboutik.sn` ou `terangamode.sn`)

#### A. Cas 1 : Sous-domaine actif (Forfait PRO ou PREMIUM, ou en période de grâce Dunning 72h)
**Réponse `200 OK` :**
```json
{
  "success": true,
  "data": {
    "subdomainActive": true,
    "themeConfig": {
      "primaryColor": "#10B981",
      "secondaryColor": "#0F172A",
      "fontFamily": "Inter",
      "bannerStyle": "FULL_WIDTH",
      "wakhaleEnabled": true,
      "slogan": "L'élégance dakaroise à portée de clic",
      "showSponsors": true
    },
    "shop": {
      "id": "shop-pro-1234",
      "name": "Teranga Mode",
      "slug": "teranga-mode",
      "slogan": "L'élégance dakaroise à portée de clic",
      "description": "Prêt-à-porter de luxe et boubous traditionnels faits main à la Médina.",
      "logoUrl": "https://images.unsplash.com/photo-1544816155-12df9643f363",
      "bannerUrl": "https://images.unsplash.com/photo-1441986300917-64674bd600d8",
      "faviconUrl": "https://images.unsplash.com/photo-favicon.png",
      "primaryColor": "#10B981",
      "whatsappNumber": "+221771234567",
      "isOnVacation": false,
      "vacationMessage": null,
      "announcementBarEnabled": true,
      "announcementBarText": "Livraison Tiak-Tiak offerte à Dakar dès 35 000 FCFA d'achat !",
      "subscriptionPlan": "PRO",
      "subscriptionStatus": "ACTIVE",
      "subdomainEnabled": true,
      "customDomain": null,
      "customDomainVerified": false
    },
    "sponsors": [
      {
        "id": "sp-1",
        "name": "Wave Sénégal",
        "logoUrl": "https://storage.openboutik.sn/sponsors/wave.png",
        "websiteUrl": "https://wave.com",
        "badgeText": "Partenaire Officiel",
        "displayOrder": 1,
        "isActive": true
      }
    ],
    "featuredProducts": [
      {
        "id": "prod-1",
        "name": "Boubou Bazin Riche Brodé",
        "slug": "boubou-bazin-riche-brode",
        "priceFcfa": 35000,
        "compareAtPriceFcfa": 45000,
        "stock": 8,
        "images": ["https://storage.openboutik.sn/products/boubou.jpg"],
        "isFeatured": true
      }
    ],
    "products": [
      {
        "id": "prod-1",
        "name": "Boubou Bazin Riche Brodé",
        "slug": "boubou-bazin-riche-brode",
        "priceFcfa": 35000,
        "stock": 8,
        "images": ["https://storage.openboutik.sn/products/boubou.jpg"]
      }
    ]
  }
}
```

#### B. Cas 2 : Sous-domaine inactif (Forfait FREE ou suspendu après 72h)
**Réponse `200 OK` :**
```json
{
  "success": true,
  "data": {
    "subdomainActive": false,
    "redirectToMarketplace": true,
    "reason": "PLAN_FREE_NO_SUBDOMAIN",
    "marketplaceUrl": "https://www.openboutik.sn/boutique/dakar-tech-hub",
    "redirectMarketplaceUrl": "/shops/dakar-tech-hub",
    "shopBasicInfo": {
      "id": "shop-free-5678",
      "name": "Dakar Tech Hub",
      "slug": "dakar-tech-hub",
      "logoUrl": "https://storage.openboutik.sn/logos/dakartech.jpg",
      "mainCategory": "Électronique"
    }
  }
}
```

### `GET /shops` & `GET /shops/:slug`
- `GET /shops?search=mode&city=Dakar&isVerified=true` : Annuaire public des boutiques sur la marketplace centrale.
- `GET /shops/:slug` : Vitrine publique d'une boutique sur la marketplace centrale (`/shops/[slug]`).

---

## 2. AUTHENTIFICATION CLIENT (`CLIENT`)

### `POST /auth/register/client`
- **Payload :**
```json
{
  "phone": "+221765432109",
  "fullName": "Fatou Ndiaye",
  "email": "client.fatou@gmail.com",
  "password": "Passer123!"
}
```

### `POST /auth/login`
- **Payload :** `{ "phone": "+221765432109", "password": "Passer123!" }`
- **Réponse `200 OK` :** Retourne `{ "user": { ... }, "accessToken": "...", "refreshToken": "..." }`.

### `POST /auth/refresh` & `GET /auth/me` & `POST /auth/logout`
- `POST /auth/refresh` : Rafraîchissement transparent du JWT.
- `GET /auth/me` : Profil de l'acheteur connecté.

---

## 3. CATALOGUE, VARIANTES, FAVORIS & AVIS 5★

### `GET /products`
Recherche multi-critères, filtres à facettes et tri paginé sur la Marketplace.
- **Query Parameters :**
  - `search` : recherche texte sur nom et description
  - `category` : slug de catégorie
  - `minPrice` & `maxPrice` : entiers stricts en FCFA
  - `inStock` : `true` pour exclure les ruptures
  - `shopId` : filtrer par boutique
  - `page` & `limit` : pagination (défaut `1` et `20`)
  - `sortBy` : `price_asc`, `price_desc`, `newest`, `popular`

### `GET /products/:shopSlug/:productSlug`
Fiche produit détaillée avec ses `variants` (tailles, couleurs, stock et prix spécifiques), les coordonnées WhatsApp de la boutique et son état `isOnVacation`.

### `POST /products/:id/view`
Appel non-bloquant au chargement de la fiche produit pour incrémenter le compteur journalier de visites.

### `GET /categories`
Liste des catégories disponibles (`?shopSlug=teranga-mode` optionnel).

### `GET /wishlist` • `POST /wishlist/:productId` • `DELETE /wishlist/:productId`
Gestion complète des favoris de l'acheteur connecté (`Authorization: Bearer <accessToken>`).

### `GET /products/:productId/reviews` & `POST /products/:productId/reviews`
- `GET /products/:productId/reviews` (Public) : Retourne `averageRating`, `totalReviews` et la liste des avis avec réponses vendeur.
- `POST /products/:productId/reviews` (`CLIENT` ayant une commande `DELIVERED_CONFIRMED` sur ce produit) :
```json
{
  "rating": 5,
  "comment": "Bazin de qualité exceptionnelle, livré en 1h30 par Tiak-Tiak !"
}
```

---

## 4. CODES PROMO, PANIER MULTI-BOUTIQUES & CHECKOUT SÉQUESTRE

### `POST /coupons/validate`
Vérifie un code promo (ou un coupon généré par le Wakhale) avant paiement.
- **Payload :**
```json
{
  "code": "TABASKI20",
  "shopId": "uuid-boutique",
  "subtotalFcfa": 50000
}
```
- **Réponse `200 OK` :** `{ "valid": true, "discountAmountFcfa": 10000, "newSubtotalFcfa": 40000, ... }`

### `POST /orders/checkout`
Validation du panier multi-boutiques, réservation atomique des stocks et blocage en séquestre (`HELD_IN_ESCROW`).
- **Headers :** `Authorization: Bearer <accessToken>`
- **Payload :**
```json
{
  "items": [
    {
      "productId": "uuid-produit-1",
      "variantId": "uuid-variante-xl",
      "quantity": 1
    },
    {
      "productId": "uuid-produit-2",
      "quantity": 2
    }
  ],
  "deliveryMethod": "TIAK_TIAK",
  "deliveryAddress": "Villa 142, Mermoz Pyrotechnie",
  "deliveryCity": "Dakar",
  "deliveryPhone": "+221765432109",
  "deliveryNotes": "Portail vert à côté de la pharmacie",
  "paymentProvider": "WAVE",
  "couponCode": "TABASKI20"
}
```
*(Supporte `"WAVE"`, `"ORANGE_MONEY"` et `"FREE_MONEY"`).*

---

## 5. SUIVI DE COMMANDE, DÉBLOCAGE 1-CLIC, FACTURE PDF & LITIGES

### `GET /orders/client/me` & `GET /orders/:id`
Liste et détail des commandes de l'acheteur connecté (inclut `deliveryConfirmationCode` à 6 chiffres à communiquer au livreur Tiak-Tiak).

### `GET /orders/:id/tracking`
Stepper chronologique de la commande (`PAID_ESCROW` ➔ `PREPARING` ➔ `SHIPPED_TIAK_TIAK` ➔ `DELIVERED_CONFIRMED`).

### `POST /orders/:id/confirm-delivery` (Déblocage 1-Clic Acheteur)
- **Payload :** `{}` (Aucun code requis pour l'acheteur connecté qui clique sur « J'ai bien reçu ma commande »).
- **Effet :** Débloque instantanément le séquestre vers le Wallet disponible du marchand.

### `GET /orders/:id/invoice`
Stream binaire (`application/pdf`) du reçu officiel de la commande.

### `POST /disputes/:orderId` & `GET /disputes/:id`
Ouverture d'un litige par l'acheteur -> **Gèle immédiatement le séquestre (`FROZEN_BY_DISPUTE`)**.
- **Payload `POST /disputes/:orderId` :**
```json
{
  "reason": "Article non conforme à la photo commandée",
  "evidenceUrls": ["https://openboutik-api.onrender.com/storage/files/dispute1.jpg"]
}
```

---

## 6. NÉGOCIATION « WAKHALE », LIVE SHOPPING, BNPL & MESSAGERIE

### A. Le « Wakhale » Numérique (Côté Acheteur)
- **`POST /negotiations` :** Proposer un prix (entre 50 % et 99 % du prix affiché) :
```json
{
  "productId": "uuid-produit",
  "proposedPriceFcfa": 28000
}
```
- **`GET /negotiations/my` :** Lister mes négociations en cours et récupérer le coupon `WAKHALE-XXXXXX` généré dès accord.
- **`GET /negotiations/:id` :** Détail d'une négociation.
- **`PATCH /negotiations/:id/accept-counter` :** Accepter la contre-offre du vendeur -> génère immédiatement le coupon unique.

### B. Live Shopping & Vidéos Courtes (Spectateur)
- **`GET /streams?type=LIVE_STREAM&status=LIVE`** & **`GET /streams?type=SHORT_VIDEO`**
- **`GET /streams/:id` :** Détails du flux et produits épinglés.
- **WebSocket Socket.io (`/streams`) :**
  - Connexion sur `http://localhost:4000/streams` (ou `https://openboutik-api.onrender.com/streams`).
  - Émettre `join_stream` (`{ streamId, userName }`) et `stream_chat_message` (`{ streamId, userName, message }`).
  - Écouter `live_product_popup` (pop-up d'achat flash en direct) et `stream_chat_message`.

### C. Paiement Fractionné BNPL (3x / 4x) & KYC Acheteur
- **`POST /bnpl/kyc` :** Soumettre sa CNI (`{ "idCardNumber": "1755199501234", "idCardUrl": "https://..." }`).
- **`POST /bnpl/orders/:orderId/init` :** Créer un échéancier (`{ "installmentsCount": 3 }` ou `4`).
- **`GET /bnpl/my-plans` & `GET /bnpl/plans/:planId` :** Suivre ses échéanciers.
- **`POST /bnpl/installments/:installmentId/pay` :** Régler une mensualité.

### D. Messagerie Interne & Upload Cloud Direct
- **`POST /messages` :** `{ "receiverId": "...", "shopId": "...", "productId": "...", "orderId": "...", "content": "..." }`
- **`GET /messages/conversations` :** Liste des conversations avec compteur de non-lus.
- **`GET /messages/thread/:otherUserId` :** Historique complet avec un vendeur.
- **`PATCH /messages/read/:otherUserId` :** Marquer la conversation comme lue.
- **`POST /storage/upload-ticket` :** Obtenir une URL signée pour uploader une photo (preuve de litige ou CNI BNPL) directement vers le stockage sécurisé.
