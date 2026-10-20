# 📡 CONTRATS D'API & PAYLOADS — PÔLE DEV 2 (@akhy-m00)
**Base URL Locale :** `http://localhost:4000/api/v1`  
**Base URL Production :** `https://openboutik-api.onrender.com/api/v1`  
**Format global :** `application/json` avec enveloppe standard `{ "success": boolean, "data": ... }`  
**Authentification obligatoire :** `Authorization: Bearer <accessToken>` avec rôle `VENDOR` sur tous les endpoints marchands.

---

## 1. STORE BUILDER & THÈME DYNAMIQUE

### `GET /shops/me/theme`
Récupère la configuration exacte du thème enregistrée pour la boutique du marchand connecté.

- **Headers :** `Authorization: Bearer <vendeur_token>`
- **Réponse `200 OK` :**
```json
{
  "success": true,
  "data": {
    "themeConfig": {
      "primaryColor": "#10B981",
      "secondaryColor": "#0F172A",
      "fontFamily": "Inter",
      "bannerStyle": "FULL_WIDTH",
      "slogan": "L'élégance dakaroise à portée de clic",
      "announcementBarText": "Livraison Tiak-Tiak offerte à Dakar dès 35 000 FCFA",
      "announcementBarEnabled": true,
      "wakhaleEnabled": true,
      "showSponsors": true,
      "layoutGridColumns": 3
    }
  }
}
```

### `PUT /shops/me/theme`
Sauvegarde sans perte le JSON généré par l'éditeur visuel du Store Builder. Met automatiquement à jour la colonne `themeConfig` et synchronise les attributs de marque de la boutique.

- **Headers :** `Authorization: Bearer <vendeur_token>`
- **Payload :**
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
  "announcementBarText": "Promo Tabaski : -20 % sur toute la collection avec le code TABASKI20",
  "announcementBarEnabled": true,
  "wakhaleEnabled": true,
  "showSponsors": true
}
```
- **Réponse `200 OK` :**
```json
{
  "success": true,
  "message": "Configuration du thème enregistrée avec succès",
  "data": {
    "themeConfig": { ... }
  }
}
```

---

## 2. ABONNEMENTS SAAS, ESSAI 30 JOURS & DUNNING

### `GET /subscriptions/plans`
Récupère la grille tarifaire officielle des 3 forfaits.

- **Authentification :** Publique (aucun header requis)
- **Réponse `200 OK` :**
```json
{
  "success": true,
  "data": [
    {
      "plan": "FREE",
      "name": "Forfait Gratuit",
      "priceFcfa": 0,
      "commissionRate": 3.0,
      "subdomainEnabled": false,
      "features": [
        "Vente sur la Marketplace centrale OpenBoutik",
        "Commission standard de 3.0 % par commande livrée",
        "Paiements sécurisés par Séquestre Wave et Orange Money",
        "Notifications par WhatsApp et SMS",
        "Sous-domaine dédié non disponible"
      ]
    },
    {
      "plan": "PRO",
      "name": "Forfait Professionnel",
      "priceFcfa": 5000,
      "commissionRate": 0.0,
      "subdomainEnabled": true,
      "features": [
        "0.0 % de commission sur toutes vos ventes (0 FCFA prélevé)",
        "Site web dédié prêt à l'emploi (ex: https://maboutique.openboutik.sn)",
        "Store Builder complet (personnalisation couleurs, logo, bannières)",
        "Module de négociation de prix « Wakhale » numérique",
        "Affichage de 5 sponsors / partenaires sur votre vitrine",
        "Bouton de contact direct WhatsApp"
      ]
    },
    {
      "plan": "PREMIUM",
      "name": "Forfait Élite & Marque",
      "priceFcfa": 15000,
      "commissionRate": 0.0,
      "subdomainEnabled": true,
      "features": [
        "Tous les avantages du Forfait PRO (0 % de commission)",
        "Branchement de votre propre nom de domaine personnalisé (ex: https://maboutique.sn)",
        "Paiement fractionné en 3 ou 4 fois (BNPL) offert à vos clients",
        "Sponsors et partenaires illimités",
        "Badge Vendeur Vérifié Or & Mise en avant prioritaire",
        "Support VIP WhatsApp 24/7 & Conciergerie technique"
      ]
    }
  ]
}
```

### `POST /subscriptions/start-trial`
Active immédiatement les 30 jours d'essai gratuit sur le forfait PRO ou PREMIUM.

- **Headers :** `Authorization: Bearer <vendeur_token>`
- **Payload :**
```json
{
  "plan": "PRO"
}
```
- **Réponse `200 OK` (Succès) :**
```json
{
  "success": true,
  "message": "Félicitations ! Votre mois d’essai gratuit sur le forfait PRO est activé avec succès jusqu’au 20 novembre 2026.",
  "data": {
    "subscriptionPlan": "PRO",
    "subscriptionStatus": "TRIALING",
    "subdomainEnabled": true,
    "trialEndsAt": "2026-11-20T00:00:00.000Z"
  }
}
```
- **Réponse `403 Forbidden` (Détection Anti-Fraude `used_trial_registries`) :**
```json
{
  "statusCode": 403,
  "message": "Vous avez déjà bénéficié de votre mois d’essai gratuit sur OpenBoutik (numéro ou compte déjà enregistré).",
  "error": "Forbidden"
}
```

### `POST /subscriptions/reactivate`
Réactive ou change de forfait immédiatement depuis le solde disponible du Wallet marchand.

- **Headers :** `Authorization: Bearer <vendeur_token>`
- **Payload :** `{ "plan": "PRO" }` ou `{ "plan": "PREMIUM" }`
- **Réponse `200 OK` :** Débite le Wallet, réactive instantanément le sous-domaine et remet le statut à `ACTIVE`.
- **Réponse `400 Bad Request` :** Si le solde Wallet est inférieur au prix du forfait.

---

## 3. TABLEAU DE BORD 360° VENDEUR & BANDEAU DUNNING

### `GET /shops/me/dashboard-360`
Consolidation de toutes les données du dashboard marchand en une seule requête optimisée.

- **Headers :** `Authorization: Bearer <vendeur_token>`
- **Réponse `200 OK` :**
```json
{
  "success": true,
  "data": {
    "shop": {
      "id": "shop-1234",
      "name": "Dakar Chic",
      "slug": "dakar-chic",
      "logoUrl": "https://storage.openboutik.sn/logos/dakar.png",
      "isVerified": true,
      "kycStatus": "VERIFIED"
    },
    "subscriptionAndDomain": {
      "plan": "PRO",
      "status": "PAST_DUE",
      "commissionRate": 0.0,
      "subdomain": "dakar-chic",
      "subdomainUrl": "https://dakar-chic.openboutik.sn",
      "subdomainEnabled": true,
      "customDomain": null,
      "customDomainVerified": false,
      "dunningAlert": {
        "isPastDue": true,
        "subscriptionStatus": "PAST_DUE",
        "retryCount": 2,
        "gracePeriodEndsAt": "2026-10-23T14:00:00.000Z",
        "warningMessage": "Prélèvement de votre abonnement PRO en attente (tentative 2/6). Période de grâce active : vos avantages et votre site dédié restent actifs jusqu'au 23 octobre à 14h00. Veuillez recharger votre Wallet via Wave ou Orange Money."
      }
    },
    "wallet": {
      "availableBalanceFcfa": 1500,
      "escrowBalanceFcfa": 65000,
      "kycStatus": "VERIFIED"
    },
    "salesMetrics": {
      "totalCommissionSavedFcfa": 42000,
      "totalRevenueFcfa": 1400000,
      "ordersCount": 28,
      "salesByChannel": {
        "marketplaceRevenueFcfa": 400000,
        "subdomainRevenueFcfa": 1000000,
        "customDomainRevenueFcfa": 0
      }
    },
    "inventoryHealth": {
      "totalProducts": 15,
      "lowStockAlertsCount": 2,
      "outOfStockCount": 0
    },
    "topProducts": [
      {
        "id": "prod-1",
        "name": "Boubou Grand Bassin Brodé",
        "priceFcfa": 35000,
        "viewsCount": 184,
        "salesVolume": 12
      }
    ]
  }
}
```

---

## 4. GESTION DES SPONSORS & PARTENAIRES (`shop_sponsors`)

### `GET /shops/me/sponsors`
Lister les sponsors de la boutique.

- **Réponse `200 OK` :**
```json
{
  "success": true,
  "data": [
    {
      "id": "sp-1",
      "name": "Mixx by Yas",
      "logoUrl": "https://storage.openboutik.sn/sponsors/mixx.png",
      "websiteUrl": "https://mixx.sn",
      "description": "Partenaire officiel télécom",
      "badgeText": "Partenaire Premium",
      "displayOrder": 1,
      "isActive": true
    }
  ]
}
```

### `POST /shops/me/sponsors`
Ajouter un sponsor.

- **Payload :**
```json
{
  "name": "Wave Sénégal",
  "logoUrl": "https://storage.openboutik.sn/sponsors/wave.png",
  "websiteUrl": "https://wave.com",
  "description": "Paiement 0 % frais",
  "badgeText": "Partenaire Paiement",
  "displayOrder": 2
}
```
- **Règles :** Plan FREE : interdit (`403 Forbidden`). Plan PRO : max 5 sponsors. Plan PREMIUM : illimité.

### `PATCH /shops/me/sponsors/:sponsorId`
Mise à jour d'un sponsor existant.

### `DELETE /shops/me/sponsors/:sponsorId`
Suppression d'un sponsor.

---

## 5. TRAITEMENT DES COMMANDES & LIVRAISON TIAK-TIAK

### `GET /orders/vendor/me`
Liste des commandes de la boutique (`?status=PAID_ESCROW` pour les commandes à préparer).

### `PATCH /orders/:id/prepare`
Passe la commande à l'état `PREPARING` pour avertir le client que le colis est en cours de conditionnement.

### `PATCH /orders/:id/ship`
Passe la commande à l'état `SHIPPED_TIAK_TIAK`.
*Déclenche automatiquement le compte à rebours de sécurité de 24h avant déblocage automatique.*

### `POST /orders/:id/confirm-delivery` (Validation par Code OTP)
Pour le commerçant ou le coursier lors de la remise en main propre.

- **Payload :**
```json
{
  "confirmationCode": "482910"
}
```
- **Réponse `200 OK` :** Débloque immédiatement les fonds vers le Wallet du vendeur et déclenche l'Auto-Sweep si la boutique a un abonnement impayé.

---

## 6. PORTEFEUILLE & RETRAITS KYC

### `GET /wallets/me`
Solde disponible, solde sous séquestre et statut KYC.

### `POST /wallets/payout`
Demande de virement vers Wave ou Orange Money.

- **Payload :**
```json
{
  "amountFcfa": 50000,
  "provider": "WAVE",
  "recipientPhone": "+221771234567"
}
```
- **Règle :** Rejeté avec `403 Forbidden` si le KYC n'est pas `VERIFIED`.

### `POST /shops/me/kyc`
Soumission du scan CNI sénégalaise pour instruction.

- **Payload :**
```json
{
  "idCardNumber": "1 758 1990 04821",
  "idCardUrl": "https://storage.openboutik.sn/kyc/cni-recto-verso.jpg"
}
```
