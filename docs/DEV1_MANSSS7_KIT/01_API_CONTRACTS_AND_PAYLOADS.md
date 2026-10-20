# 📡 CONTRATS D'API & PAYLOADS — PÔLE DEV 1 (@mansss7)
**Base URL Locale :** `http://localhost:4000/api/v1`  
**Base URL Production :** `https://openboutik-api.onrender.com/api/v1`  
**Format global :** `application/json` avec enveloppe standard `{ "success": boolean, "data": ... }` ou `{ "statusCode": number, "message": string, "error": string }`.

---

## 1. RÉSOLUTION MULTI-TENANT (SOUS-DOMAINES & VITRINES DÉDIÉES)

### `GET /shops/storefront/:identifier`
Utilisé par le middleware Next.js pour résoudre une vitrine marchande à partir d'un sous-domaine (`[slug]`) ou d'un domaine personnalisé (`[domaine].sn`).

- **Authentification :** Publique (aucun header requis)
- **Paramètre d'URL :**
  - `:identifier` (ex: `dakar-chic` ou `dakar-chic.openboutik.sn` ou `terangamode.sn`)

#### A. Cas 1 : Sous-domaine actif (Forfait PRO ou PREMIUM)
**Réponse `200 OK` :**
```json
{
  "success": true,
  "data": {
    "subdomainActive": true,
    "themeConfig": {
      "primaryColor": "#10B981",
      "fontFamily": "Inter",
      "bannerStyle": "FULL_WIDTH",
      "wakhaleEnabled": true,
      "slogan": "L'élégance dakaroise à portée de clic"
    },
    "shop": {
      "id": "shop-pro-1234",
      "name": "Dakar Chic Boutique",
      "slug": "dakar-chic",
      "slogan": "L'élégance dakaroise à portée de clic",
      "description": "Prêt-à-porter de luxe et boubous traditionnels faits main.",
      "logoUrl": "https://images.unsplash.com/photo-1544816155-12df9643f363",
      "bannerUrl": "https://images.unsplash.com/photo-1441986300917-64674bd600d8",
      "faviconUrl": "https://images.unsplash.com/photo-favicon.png",
      "primaryColor": "#10B981",
      "whatsappNumber": "+221771234567",
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
        "name": "Orange Money",
        "logoUrl": "https://storage.openboutik.sn/sponsors/om.png",
        "websiteUrl": "https://orangemoney.sn",
        "badgeText": "Partenaire Officiel",
        "displayOrder": 1,
        "isActive": true
      }
    ],
    "featuredProducts": [
      {
        "id": "prod-1",
        "name": "Boubou Grand Bassin Brodé",
        "slug": "boubou-grand-bassin",
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
        "name": "Boubou Grand Bassin Brodé",
        "slug": "boubou-grand-bassin",
        "priceFcfa": 35000,
        "stock": 8,
        "images": ["https://storage.openboutik.sn/products/boubou.jpg"]
      }
    ]
  }
}
```

#### B. Cas 2 : Sous-domaine désactivé (Forfait FREE ou suspendu)
**Réponse `200 OK` (Redirection requise) :**
```json
{
  "success": true,
  "data": {
    "subdomainActive": false,
    "redirectToMarketplace": true,
    "reason": "PLAN_FREE_NO_SUBDOMAIN",
    "marketplaceUrl": "https://www.openboutik.sn/boutique/dakar-chic",
    "redirectMarketplaceUrl": "/shops/dakar-chic",
    "shopBasicInfo": {
      "id": "shop-free-5678",
      "name": "Dakar Chic Boutique",
      "slug": "dakar-chic",
      "logoUrl": "https://storage.openboutik.sn/logos/dakar.jpg",
      "mainCategory": "Mode"
    }
  }
}
```
*Action Next.js : Le middleware redirige immédiatement vers la fiche boutique sur la marketplace centrale (`/shops/dakar-chic`).*

---

## 2. AUTHENTIFICATION CLIENT & COMPTE ACHETEUR

### `POST /auth/register/client`
Inscription d'un acheteur sénégalais (numéro de téléphone unique).

- **Payload :**
```json
{
  "phone": "+221771234567",
  "fullName": "Fatou Ndiaye",
  "email": "fatou.ndiaye@gmail.com",
  "password": "Password123!"
}
```
- **Réponse `201 Created` :**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr-client-123",
      "phone": "+221771234567",
      "fullName": "Fatou Ndiaye",
      "role": "CLIENT"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

### `POST /auth/login`
Connexion avec identifiants standard.

- **Payload :**
```json
{
  "phone": "+221771234567",
  "password": "Password123!"
}
```
- **Réponse `200 OK` :** Même structure de tokens.

### `POST /auth/refresh`
Renouvellement du JWT expiré (silencieux via Axios/Fetch interceptor).

- **Headers :** `Authorization: Bearer <refreshToken>`
- **Réponse `200 OK` :** `{ "success": true, "data": { "accessToken": "...", "refreshToken": "..." } }`

---

## 3. CATALOGUE & RECHERCHE MARKETPLACE

### `GET /catalog/products`
Recherche multi-critères, filtres à facettes et tri.

- **Query Parameters :**
  - `search` (optionnel) : recherche texte sur nom et description (ex: `boubou`)
  - `category` (optionnel) : slug de catégorie
  - `minPrice` & `maxPrice` (optionnel) : entiers stricts en FCFA (ex: `minPrice=5000&maxPrice=50000`)
  - `inStock` (optionnel) : `true` pour filtrer les produits disponibles
  - `shopId` (optionnel) : filtrer par boutique
  - `page` & `limit` (optionnel, défaut `1` et `20`)
  - `sortBy` (optionnel) : `price_asc`, `price_desc`, `newest`, `popular`

- **Réponse `200 OK` :**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "prod-1",
        "name": "Robe Soie Dakar",
        "slug": "robe-soie-dakar",
        "description": "Tissu de qualité supérieure, couture sur mesure.",
        "priceFcfa": 25000,
        "compareAtPriceFcfa": 30000,
        "stock": 12,
        "images": ["https://images.unsplash.com/photo-robe.jpg"],
        "isFeatured": true,
        "shop": {
          "id": "shop-1",
          "name": "Dakar Chic",
          "slug": "dakar-chic",
          "isVerified": true,
          "primaryColor": "#10B981"
        },
        "variants": [
          {
            "id": "var-1",
            "sku": "ROBE-BLEU-L",
            "priceFcfa": 25000,
            "stock": 5,
            "attributes": { "taille": "L", "couleur": "Bleu" }
          }
        ]
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 20,
      "pages": 3
    }
  }
}
```

### `GET /catalog/products/:id`
Fiche produit détaillée avec variantes, avis 5★ vérifiés et compteur de vues.

---

## 4. CODES PROMO & MARKETING

### `POST /coupons/validate`
Vérification d'un code promo avant validation du panier.

- **Headers :** `Authorization: Bearer <accessToken>`
- **Payload :**
```json
{
  "code": "TABASKI20",
  "shopId": "shop-1",
  "subtotalFcfa": 50000
}
```
- **Réponse `200 OK` (Valide) :**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "couponId": "coup-123",
    "code": "TABASKI20",
    "type": "PERCENTAGE",
    "value": 20,
    "discountAmountFcfa": 10000,
    "newSubtotalFcfa": 40000
  }
}
```
- **Réponse `400 Bad Request` (Expiré ou invalide) :**
```json
{
  "statusCode": 400,
  "message": "Ce code promotionnel a expiré ou n'est plus valide pour cette boutique.",
  "error": "Bad Request"
}
```

---

## 5. TUNNEL DE COMMANDE, SÉQUESTRE & MOBILE MONEY

### `POST /orders/checkout`
Validation du panier et mise sous séquestre des fonds. Découpage multi-boutiques automatique.

- **Headers :** `Authorization: Bearer <accessToken>`
- **Payload :**
```json
{
  "items": [
    {
      "productId": "prod-1",
      "variantId": "var-1",
      "quantity": 2
    },
    {
      "productId": "prod-2",
      "quantity": 1
    }
  ],
  "deliveryAddress": "Villa 142, Mermoz Pyrotechnie",
  "deliveryCity": "Dakar",
  "deliveryPhone": "+221765432109",
  "deliveryNotes": "Appeler en arrivant devant le portail vert",
  "deliveryMethod": "TIAK_TIAK",
  "paymentProvider": "WAVE",
  "couponCode": "TABASKI20"
}
```
- **Réponse `201 Created` :**
```json
{
  "success": true,
  "data": {
    "checkoutSession": {
      "id": "cs-98765",
      "totalAmountFcfa": 65000,
      "paymentProvider": "WAVE",
      "providerReference": "WAVE_TXN_17293849102",
      "paymentUrl": "https://wave.com/pay/ch_98765_sample"
    },
    "orders": [
      {
        "id": "ord-1111",
        "orderNumber": "OB-2026-4821",
        "shopId": "shop-1",
        "totalAmountFcfa": 50000,
        "deliveryFeeFcfa": 2000,
        "deliveryConfirmationCode": "482910",
        "status": "PAID_ESCROW",
        "escrow": {
          "status": "HELD_ESCROW",
          "amountFcfa": 50000
        }
      }
    ]
  }
}
```

---

## 6. SUIVI DE COMMANDE & DÉBLOCAGE 1-CLIC CLIENT

### `GET /orders/client/me`
Liste des commandes de l'acheteur connecté.

### `GET /orders/:id/trackings`
Stepper chronologique de la commande.

- **Réponse `200 OK` :**
```json
{
  "success": true,
  "data": [
    {
      "id": "track-1",
      "statusStep": "PAID_ESCROW",
      "title": "Paiement sécurisé par le Séquestre OpenBoutik",
      "comment": "Vos fonds sont bloqués et garantis jusqu'à confirmation de livraison.",
      "timestamp": "2026-10-20T10:00:00Z"
    },
    {
      "id": "track-2",
      "statusStep": "SHIPPED_TIAK_TIAK",
      "title": "Colis remis au coursier Tiak-Tiak",
      "comment": "Course en cours vers Mermoz",
      "timestamp": "2026-10-20T14:30:00Z"
    }
  ]
}
```

### `POST /orders/:id/confirm-delivery` (Déblocage 1-Clic)
L'acheteur valide la réception du colis. Les fonds sont débloqués immédiatement vers le vendeur.

- **Headers :** `Authorization: Bearer <accessToken>`
- **Payload :** `{}` (Aucun body requis pour l'acheteur connecté)
- **Réponse `200 OK` :**
```json
{
  "success": true,
  "message": "Livraison confirmée avec succès. Les fonds ont été débloqués et crédités au commerçant.",
  "data": {
    "orderId": "ord-1111",
    "status": "DELIVERED_CONFIRMED",
    "releasedAt": "2026-10-20T16:00:00Z"
  }
}
```

---

## 7. NÉGOCIATION DE PRIX « WAKHALE »

### `POST /negotiations`
Faire une offre de prix sur un article.

- **Payload :**
```json
{
  "productId": "prod-1",
  "proposedPriceFcfa": 28000,
  "notes": "Je commande immédiatement à 28 000 FCFA"
}
```
- **Réponse `201 Created` :**
```json
{
  "success": true,
  "data": {
    "id": "neg-123",
    "originalPriceFcfa": 35000,
    "proposedPriceFcfa": 28000,
    "status": "PENDING",
    "expiresAt": "2026-10-21T10:00:00Z"
  }
}
```

### `POST /negotiations/:id/respond`
Répondre à la contre-offre d'un vendeur.

- **Payload :** `{ "action": "ACCEPT" }` ou `{ "action": "REJECT" }`
- **Réponse `200 OK` (Si accepté) :**
```json
{
  "success": true,
  "data": {
    "status": "ACCEPTED",
    "generatedCoupon": {
      "code": "WAKHALE-D7E9F2",
      "discountAmountFcfa": 5000
    }
  }
}
```
*Le coupon `WAKHALE-D7E9F2` peut être injecté immédiatement dans le checkout.*
