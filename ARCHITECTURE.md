# OPENBOUTIK API — ARCHITECTURE & CONTRAT TECHNIQUE (v1.0)
> **Dépôt :** `openboutik-api` (Dev 3 - Becaye)  
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
       │        (Via OTP Tiak-Tiak OU clic client OU auto-déblocage après 48h)
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

## 6. MODÈLE ÉCONOMIQUE & COMMISSIONS DYNAMIQUES

Les commissions sont prélevées automatiquement lors du déblocage du séquestre selon le forfait SaaS actif de la boutique :

* **Plan `FREE` :** **4 %** de commission sur la vente.
* **Plan `PRO` :** **3 %** de commission sur la vente.
* **Plan `PREMIUM` :** **2 %** de commission sur la vente.

> **Snapshot comptable :** Au moment de la création de la commande, le taux (`commissionRate`), le montant de la commission (`commissionAmountFcfa`) et le montant net vendeur (`netVendorAmountFcfa`) sont figés dans l'enregistrement `Order` pour garantir une traçabilité financière inaltérable.

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
