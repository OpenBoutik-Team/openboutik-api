# OPENBOUTIK API — ARCHITECTURE & CONTRAT TECHNIQUE (v1.0)
> **Dépôt :** `openboutik-api` (Dev 3 - Lead Backend Architecture)  
> **Branche active :** `develop`  
> **Stack :** NestJS (CJS) • Prisma ORM v7 • MySQL (InnoDB) • TypeScript  
> **Destinataires :** Dev 1 (`openboutik-marketplace`), Dev 2 (`openboutik-seller` & Super-Admin) et Dev 3 (Backend)

---

## 1. CARTOGRAPHIE DES SERVICES & PORTS LOCAUX

Pour éviter tout conflit entre les 3 dépôts en développement local :

| Pôle / Application | Dépôt GitHub | Rôle | Port Local | URL d'accès |
| :--- | :--- | :--- | :--- | :--- |
| **API Backend** | `openboutik-api` | Cerveau Métier, Séquestre, Auth, DB | **`4000`** | `http://localhost:4000/api/v1` |
| **Swagger Docs** | `openboutik-api` | Documentation interactive OpenAPI | **`4000`** | `http://localhost:4000/api/docs` |
| **Marketplace Client** | `openboutik-marketplace` | Vitrines, Panier, Checkout, Espace Client | **`3000`** | `http://localhost:3000` |
| **Espace Vendeur & Super-Admin** | `openboutik-seller` | SaaS Commerçant & Back-office Admin | **`3001`** | `http://localhost:3001` |

> **CORS :** L'API autorise nativement les requêtes provenant de `http://localhost:3000` et `http://localhost:3001`.

---

## 2. STANDARD DES DONNÉES & RÈGLES MÉTIER TERRAIN (SÉNÉGAL)

1. **Devise & Monnaie :** 
   * La devise officielle est le **Franc CFA (XOF)**.
   * **Règle absolue :** Tous les montants (`priceFcfa`, `deliveryFeeFcfa`, `subtotalFcfa`, `totalAmountFcfa`, `commissionAmountFcfa`, `netVendorAmountFcfa`, soldes portefeuilles) sont stockés sous forme d'**entiers stricts (`Int`)**. Zéro virgule flottante.
2. **Téléphonie :**
   * Format standard sénégalais E.164 : `+22177XXXXXXX`, `+22178XXXXXXX`, `+22176XXXXXXX`, `+22170XXXXXXX`, `+22175XXXXXXX`.
3. **Logistique locale (Tiak-Tiak) :**
   * Chaque commande physique génère un code OTP à 6 chiffres (`deliveryConfirmationCode`).
   * Ce code est transmis au client et sert de preuve de remise au livreur à moto pour débloquer le paiement.

---

## 3. CONTRAT DE RÉPONSE API UNIFIÉ (JSON ENVELOPE)

Toutes les réponses de l'API suivent une structure prévisible via un intercepteur et un filtre d'exception globaux NestJS.

### A. Réponse en Succès (`TransformInterceptor`)
```json
{
  "success": true,
  "data": { ... },
  "message": "Message explicatif en français",
  "timestamp": "2026-10-14T14:00:00.000Z"
}
```

### B. Réponse en Succès Paginée
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  },
  "message": "Liste récupérée avec succès",
  "timestamp": "2026-10-14T14:00:00.000Z"
}
```

### C. Réponse en Erreur (`AllExceptionsFilter`)
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Description lisible de l'erreur pour affichage toast",
  "error": "Bad Request",
  "details": [
    "phone must be a valid Senegalese phone number (+221...)"
  ],
  "timestamp": "2026-10-14T14:00:00.000Z"
}
```

---

## 4. ROLES ET CONTRÔLE D'ACCÈS (RBAC)

L'API distingue trois rôles stricts :
* **`CLIENT` :**
  * Peut consulter le catalogue public, les boutiques et fiches produits.
  * Peut créer des commandes, payer via Wave / Orange Money.
  * Peut confirmer la bonne réception de ses commandes ou ouvrir un litige (`Dispute`).
* **`VENDOR` :**
  * Accède au tableau de bord vendeur (`openboutik-seller`).
  * Peut configurer sa boutique (`Shop` : nom, slug, WhatsApp, logo, bannière, couleurs, numéros de retrait Wave/OM).
  * Peut gérer ses catégories et produits (stocks, prix en FCFA).
  * Peut suivre ses commandes, déclarer la prise en charge par un Tiak-Tiak.
  * Consulte son portefeuille (`VendorWallet` : solde bloqué en séquestre vs solde disponible net) et demande des retraits (`Payout`).
* **`SUPER_ADMIN` :**
  * Réservé à l'équipe OpenBoutik.
  * Arbitrage des litiges (`Dispute` : remboursement client OU libération vers vendeur).
  * Validation, vérification (`isVerified`) ou suspension des boutiques.
  * Supervision de la trésorerie globale en séquestre et logs d'audit immuables (`AuditLog`).

---

## 5. MACHINE À ÉTATS DE LA COMMANDE ET DU SÉQUESTRE (ESCROW)

### Cycle de vie d'une Commande (`OrderStatus`)
```
[PENDING_PAYMENT]
       │
       ▼ (Webhook Wave / Orange Money réussi)
 [PAID_ESCROW]  ──> Fonds bloqués sur le compte séquestre OpenBoutik
       │
       ▼ (Le vendeur prépare le colis)
  [PREPARING]
       │
       ▼ (Colis remis au livreur moto)
[SHIPPED_TIAK_TIAK]
       │
       ├───> [DELIVERED_CONFIRMED] ──> Déblocage séquestre vers VendorWallet
       │        (Via OTP Tiak-Tiak OU clic client OU auto-déblocage après 24h)
       │
       └───> [DISPUTED] ────────────> Séquestre gelé (FROZEN) -> Arbitrage Super-Admin
                ├───> [RESOLVED_RELEASE_VENDOR] ──> Déblocage vers VendorWallet
                └───> [RESOLVED_REFUND_CLIENT]  ──> Remboursement du client (REFUNDED)
```

### Statuts du Séquestre (`EscrowStatus`)
1. **`HELD_IN_ESCROW` :** Paiement reçu, fonds séquestrés sur le compte OpenBoutik.
2. **`RELEASED_TO_VENDOR` :** Réception validée, commission marketplace déduite, solde net crédité sur `VendorWallet.availableBalanceFcfa`.
3. **`FROZEN_BY_DISPUTE` :** Litige en cours, fonds bloqués sans possibilité de déblocage automatique.
4. **`REFUNDED_TO_CLIENT` :** Décision d'arbitrage en faveur de l'acheteur ou annulation avant expédition.

---

## 6. MODÈLE ÉCONOMIQUE HYBRIDE SAAS & ABONNEMENTS (PHASE 5)

OpenBoutik applique un modèle économique hybride adapté au commerce sénégalais, combinant une marketplace de démarrage et un SaaS marchand (« Shopify sénégalais ») :

* **Plan `FREE` (Marketplace Starter) :** **Gratuit (0 FCFA/mois)** avec **3.0 %** de commission sur les ventes livrées. C'est le **seul forfait soumis à une commission**. La boutique est listée sur la marketplace centrale (`www.openboutik.sn`).
* **Plan `PRO` (Site Dédié & 0 % Commission) :** **5 000 FCFA / mois** — **0 % de commission** sur toutes les ventes (100 % de marge pour le marchand), sous-domaine dédié (`https://nom-boutique.openboutik.sn`), Store Builder complet (thème, couleurs, bannières), jusqu'à 5 sponsors vitrine, négociation Wakhale et Live Shopping.
* **Plan `PREMIUM` (Élite & Visibilité VIP) :** **15 000 FCFA / mois** — **0 % de commission** sur toutes les ventes, sous-domaine dédié, achat fractionné BNPL 3x/4x pour ses clients, badge officiel Vendeur Vérifié Or, mise en avant VIP sur la page d'accueil et conciergerie support.

> **Période d'essai 30 jours :** Les marchands bénéficient d'un mois d'essai gratuit à 0 % de commission et sous-domaine offert sur les forfaits PRO et PREMIUM (protégé contre la fraude multi-comptes via le registre `UsedTrialRegistry`).
> **Dunning Engine & Moteur de Recouvrement :** L'abonnement mensuel est prélevé automatiquement sur le solde disponible (`availableBalanceFcfa`) du portefeuille `VendorWallet`. En cas de solde insuffisant lors du renouvellement, une période de grâce de 72h (statut `PAST_DUE`) maintient le 0 % et le site actif avant bascule automatique en plan `FREE`.
> **Snapshot comptable :** Au moment de la création de la commande, le taux (`commissionRate`), le montant de la commission (`commissionAmountFcfa` : 0 en PRO/PREMIUM, 3 % en FREE) et le montant net vendeur (`netVendorAmountFcfa`) sont figés dans l'enregistrement `Order` pour garantir une traçabilité financière inaltérable.

---

## 7. GESTION DES COMMANDES MULTI-BOUTIQUES

1. L'acheteur constitue un panier avec des produits potentiellement issus de plusieurs boutiques.
2. Le client paie en une seule transaction mobile (Wave ou Orange Money) via une `CheckoutSession`.
3. Dès confirmation du paiement par webhook :
   * Une commande distincte (`Order`) est créée pour chaque boutique avec son propre numéro unique (ex: `OB-2026-0001`).
   * Chaque boutique reçoit sa notification et gère son propre coursier Tiak-Tiak.
   * Chaque commande dispose de sa propre transaction de séquestre (`EscrowTransaction`) et de son propre code de confirmation.
   * Si une commande subit un litige, les autres boutiques sont payées normalement dès leur livraison sans aucune interférence.

---

## 8. SÉCURITÉ & BONNES PRATIQUES TECHNIQUES

* **Transactions ACID Prisma (`prisma.$transaction`) :** Obligatoires pour toute mutation touchant à l'argent (paiement, déblocage séquestre, remboursement, retrait) et aux stocks de produits.
* **Idempotence des Webhooks :** Vérification stricte des signatures Wave / OM et stockage des identifiants de transaction fournisseurs pour refuser tout doublon.
* **Authentification :** JWT avec Access Token (15 min) et Refresh Token hashé en BDD (7 jours).
* **Validation des entrées :** `ValidationPipe` global avec rejet des propriétés non déclarées (`whitelist: true`, `forbidNonWhitelisted: true`).

---

## 9. CATALOGUE EXHAUSTIF DES ENDPOINTS PAR PÔLE

### A. Pôle Dev 1 — Marketplace Client (`openboutik-marketplace` • Port 3000)

| Méthode | Endpoint | Accès | Description & Rôle |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register/client` | Public | Inscription d'un acheteur avec téléphone sénégalais (`+221...`). |
| `POST` | `/api/v1/auth/login` | Public | Connexion par téléphone ou email + mot de passe (retourne JWT). |
| `POST` | `/api/v1/auth/refresh` | Public | Renouvellement transparent de l'Access Token. |
| `GET` | `/api/v1/auth/me` | `CLIENT` | Profil de l'acheteur connecté. |
| `POST` | `/api/v1/auth/logout` | `CLIENT` | Déconnexion et révocation du Refresh Token. |
| `GET` | `/api/v1/shops` | Public | Annuaire des boutiques actives avec filtres (recherche, ville, certifiée). |
| `GET` | `/api/v1/shops/:slug` | Public | Vitrine dédiée d'une boutique avec son catalogue et contact WhatsApp. |
| `GET` | `/api/v1/products` | Public | Moteur de recherche et filtres de produits paginé (prix FCFA, tri). |
| `GET` | `/api/v1/products/:shopSlug/:productSlug` | Public | Fiche produit détaillée avec données de négociation WhatsApp. |
| `GET` | `/api/v1/categories` | Public | Liste des catégories avec compteurs de produits. |
| `POST` | `/api/v1/orders/checkout` | `CLIENT` | Validation du panier, réservation des stocks et création du séquestre. |
| `GET` | `/api/v1/orders/client/me` | `CLIENT` | Historique des commandes du client, livraisons Tiak-Tiak et codes OTP. |
| `GET` | `/api/v1/orders/:id` | `CLIENT` | Détail d'une commande spécifique. |
| `POST` | `/api/v1/orders/:id/confirm-delivery` | `CLIENT` | Validation de la réception -> Déblocage instantané du séquestre au marchand. |
| `POST` | `/api/v1/disputes/:orderId` | `CLIENT` | Signalement d'un litige (produit non reçu / non conforme) -> Gèle le séquestre. |
| `GET` | `/api/v1/disputes/:id` | `CLIENT` | Consultation du statut de son litige. |

### B. Pôle Dev 2 — Espace Vendeur SaaS (`openboutik-seller` • Port 3001)

| Méthode | Endpoint | Accès | Description & Rôle |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register/vendor` | Public | Inscription marchand en transaction ACID (User + Boutique + Portefeuille). |
| `POST` | `/api/v1/auth/login` | Public | Connexion commerçant. |
| `GET` | `/api/v1/shops/vendor/me` | `VENDOR` | Tableau de bord vendeur : métriques de ventes, commandes et soldes portefeuilles. |
| `GET` | `/api/v1/subscriptions/plans` | Public | Grille tarifaire des abonnements SaaS (`FREE`: 3 %, `PRO`: 5 000 FCFA à 0 %, `PREMIUM`: 15 000 FCFA à 0 %). |
| `POST` | `/api/v1/subscriptions/trial` | `VENDOR` | Activation du mois d'essai gratuit de 30 jours à 0 % de commission. |
| `POST` | `/api/v1/subscriptions/upgrade` | `VENDOR` | Passage au forfait PRO ou PREMIUM avec bascule à 0 % de commission et site dédié. |
| `POST` | `/api/v1/subscriptions/reactivate` | `VENDOR` | Réactivation immédiate de l'abonnement et du sous-domaine après régularisation. |
| `POST` | `/api/v1/products` | `VENDOR` | Ajout d'un article au catalogue (prix entier FCFA, stock, photos). |
| `PATCH` | `/api/v1/products/:id` | `VENDOR` | Modification d'un produit (avec sécurité d'ownership). |
| `PATCH` | `/api/v1/products/:id/stock` | `VENDOR` | Ajustement rapide du stock physique. |
| `DELETE` | `/api/v1/products/:id` | `VENDOR` | Suppression d'un produit. |
| `POST` | `/api/v1/categories` | `VENDOR` | Création d'une catégorie personnalisée pour sa boutique. |
| `GET` | `/api/v1/orders/vendor/me` | `VENDOR` | Suivi des commandes reçues (filtre par statut : payée, expédiée, livrée). |
| `PATCH` | `/api/v1/orders/:id/prepare` | `VENDOR` | Prise en charge de la préparation du colis (`PREPARING`). |
| `PATCH` | `/api/v1/orders/:id/ship` | `VENDOR` | Remise au livreur moto Tiak-Tiak (`SHIPPED_TIAK_TIAK`) + timer 24h. |
| `POST` | `/api/v1/orders/:id/confirm-delivery` | `VENDOR` | Validation de livraison par saisie du code OTP 6 chiffres remis par le client. |
| `GET` | `/api/v1/wallets/me` | `VENDOR` | Consultation du portefeuille (solde bloqué séquestre vs solde disponible). |
| `POST` | `/api/v1/wallets/payout` | `VENDOR` | Demande de transfert vers Wave ou Orange Money en transaction ACID. |

### C. Pôle Dev 2 / Équipe Core — Back-Office Super-Admin (Port 3001)

| Méthode | Endpoint | Accès | Description & Rôle |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Public | Connexion avec identifiants Super-Admin. |
| `GET` | `/api/v1/escrow/overview` | `SUPER_ADMIN` | Supervision en direct de la trésorerie globale séquestrée et commissions perçues. |
| `POST` | `/api/v1/escrow/auto-release` | `SUPER_ADMIN` | Déclenchement du filet de sécurité (auto-déblocage après 24h sans litige). |
| `PATCH` | `/api/v1/shops/:id/verify` | `SUPER_ADMIN` | Attribution ou révocation du badge certifié marchand vérifié + Audit Log. |
| `GET` | `/api/v1/disputes` | `SUPER_ADMIN` | Tableau de bord de tous les litiges ouverts avec pièces justificatives. |
| `POST` | `/api/v1/disputes/:id/arbitrate` | `SUPER_ADMIN` | Arbitrage officiel : Remboursement client (`REFUND_CLIENT`) OU versement marchand (`RELEASE_VENDOR`). |
| `GET` | `/api/v1/wallets/admin/payouts` | `SUPER_ADMIN` | Historique et contrôle de tous les décaissements Mobile Money de la plateforme. |

---

## 10. COMPTES DU SEED (PRÉCONFIGURÉS & CERTIFIÉS)

1. **Super-Admin Officiel (Direction Opérations & Arbitrage OpenBoutik) :**
   * **Identifiant :** `admin@openboutik.sn` ou `+221770000001`
   * **Mot de passe certifié :** `Admin@OpenBoutik2026!`
   * **Rôle :** `SUPER_ADMIN`
   * **Accès :** Arbitrage des litiges séquestre, validation KYC vendeurs, supervision financière.

> **Mot de passe de démonstration (Vendeurs & Clients de test) :** `Passer123!`
2. **Vendeur 1 — Boutique « Teranga Mode » (Médina, Dakar) :**
   * **Identifiant :** `moussa.diop@terangamode.sn` ou `+221771234567`
   * **Slug vitrine :** `teranga-mode` (Plan `PRO` - 5 000 FCFA/mois, 0 % commission, sous-domaine dédié)
   * **WhatsApp :** `+221771234567`
3. **Vendeur 2 — Boutique « Dakar Tech Hub » (Plateau, Dakar) :**
   * **Identifiant :** `aminata.sow@dakartech.sn` ou `+221789876543`
   * **Slug vitrine :** `dakar-tech-hub` (Plan `FREE` - 3 % commission marketplace)
   * **WhatsApp :** `+221789876543`
4. **Client Acheteur (Mermoz, Dakar) :**
   * **Identifiant :** `client.fatou@gmail.com` ou `+221765432109`
   * **Rôle :** `CLIENT`

