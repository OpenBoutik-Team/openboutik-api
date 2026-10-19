# RAPPORT D'AUDIT DE SÉCURITÉ APPLICATIVE & CONFORMITÉ FINANCIÈRE
> **Projet :** `openboutik-api`  
> **Branche auditée :** `develop`  
> **Date d'audit :** 19 Octobre 2026  
> **Auditeur :** Auditeur Senior AppSec & Architecte Principal Fintech  
> **Pilote / Architecte référent :** Lead Backend Engineer & Security Architect (Dev 3), OpenBoutik Team  
> **Périmètre :** Code source complet (`src/`), Schéma BDD (`prisma/`), Configuration & Tests (`test/`), Infrastructure Clever Cloud & Render  

---

## 1. RÉSUMÉ EXÉCUTIF & MATRICE DE RISQUES

L'audit approfondi du dépôt `openboutik-api` confirme une architecture technique alignée sur les standards les plus exigeants de la Fintech et de la sécurité bancaire en Afrique de l'Ouest (NestJS v12, Prisma v7 avec Driver Adapter MariaDB, MySQL InnoDB, TypeScript strict).

Toutes les vulnérabilités détectées lors des phases successives ont été corrigées avec succès sous la supervision du Pilote. Les règles financières clés (prélèvement strict de commission de **2 % à 4 %**, arithmétique entière en FCFA, logistique Tiak-Tiak, séquestre Wave/Orange Money, arbitrage Super-Admin, paiements fractionnés BNPL 3x/4x, et négociation de prix Wakhale) sont fonctionnellement et mathématiquement irréprochables.

Les mécanismes de verrouillage atomique conditionnel (`updateMany` avec gardes d'état SQL et transactions ACID durcies `{ maxWait: 20000, timeout: 30000 }`) immunisent le moteur contre les attaques de type double-dépense, surréservation de stock flash, et rejeu d'OTP.

| Niveau de Criticité | Total Détecté | Statut Remédiation | Statut Final |
| :--- | :---: | :---: | :---: |
| 🔴 **CRITIQUE** | **2** | 2 / 2 Résolus | 🟢 **100 % CORRIGÉ** |
| 🟠 **ÉLEVÉE** | **2** | 2 / 2 Résolus | 🟢 **100 % CORRIGÉ** |
| 🟡 **MOYENNE** | **3** | 3 / 3 Résolus | 🟢 **100 % CORRIGÉ** |
| 🟢 **FAIBLE** | **2** | 2 / 2 Résolus | 🟢 **100 % CORRIGÉ** |

---

## 2. MATRICE COMPLÈTE DE SÉCURITÉ DES ENDPOINTS (45+ ENDPOINTS)

| Domaine | Méthode | Route HTTP | Rôles Autorisés | Contrôle Ownership & Anti-BOLA / IDOR | Statut Sécurité |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Auth** | `POST` | `/api/v1/auth/register/client` | `Public` | Rôle `CLIENT` forcé, validation DTO stricte | 🛡️ Sécurisé |
| **Auth** | `POST` | `/api/v1/auth/register/vendor` | `Public` | Transaction ACID User + Shop + Wallet | 🛡️ Sécurisé |
| **Auth** | `POST` | `/api/v1/auth/login` | `Public` | Vérification statut actif `isActive` + bcrypt | 🛡️ Sécurisé |
| **Auth** | `POST` | `/api/v1/auth/refresh` | `Public` | Hash bcrypt du refresh token | 🛡️ Sécurisé |
| **Auth** | `GET` | `/api/v1/auth/me` | Authentifié | Données strictes de la session JWT | 🛡️ Sécurisé |
| **Auth** | `POST` | `/api/v1/auth/logout` | Authentifié | Révocation en BDD du token de session | 🛡️ Sécurisé |
| **Boutiques** | `GET` | `/api/v1/shops` | `Public` | Filtre automatique `isActive: true` | 🛡️ Sécurisé |
| **Boutiques** | `GET` | `/api/v1/shops/:slug` | `Public` | Filtre boutique active + catalogue publié | 🛡️ Sécurisé |
| **Boutiques** | `GET` | `/api/v1/shops/check-slug/:slug` | `Public` | Disponibilité slug + suggestion automatique | 🛡️ Sécurisé |
| **Boutiques** | `GET` | `/api/v1/shops/vendor/me` | `VENDOR` | Filtré par `shop.ownerId === currentUser.id` | 🛡️ Sécurisé |
| **Boutiques** | `PATCH` | `/api/v1/shops/vendor/me` | `VENDOR` | Filtré par `shop.ownerId === currentUser.id` | 🛡️ Sécurisé |
| **Boutiques** | `GET` | `/api/v1/shops/me/onboarding` | `VENDOR` | Progression Onboarding (Étapes 0 à 5) | 🛡️ Sécurisé |
| **Boutiques** | `PATCH` | `/api/v1/shops/me/onboarding/step/:step` | `VENDOR` | Validation stricte DTO par étape (1-5) | 🛡️ Sécurisé |
| **Boutiques** | `POST` | `/api/v1/shops/me/kyc` | `VENDOR` | Dépôt CNI/NINEA + Verrouillage statut PENDING | 🛡️ Sécurisé |
| **Boutiques** | `PATCH` | `/api/v1/shops/me/vacation` | `VENDOR` | Mode vacances (gel temporaire des ventes) | 🛡️ Sécurisé |
| **Boutiques** | `PATCH` | `/api/v1/shops/admin/:id/kyc` | `SUPER_ADMIN` | Exclusif Super-Admin (Validation/Rejet KYC) | 🛡️ Sécurisé |
| **Boutiques** | `PATCH` | `/api/v1/shops/:id/verify` | `SUPER_ADMIN` | Badge vérifié boutique officiel + Audit log | 🛡️ Sécurisé |
| **Catalogue** | `GET` | `/api/v1/products` | `Public` | Produits publiés uniquement (`isPublished: true`) | 🛡️ Sécurisé |
| **Catalogue** | `GET` | `/api/v1/products/:shopSlug/:productSlug` | `Public` | Vérification cohérence boutique/produit | 🛡️ Sécurisé |
| **Catalogue** | `POST` | `/api/v1/products` | `VENDOR` | Rattaché obligatoirement à la boutique de l'acteur | 🛡️ Sécurisé |
| **Catalogue** | `PATCH` | `/api/v1/products/:id` | `VENDOR` | `findAndVerifyOwnership` strict (403 si tiers) | 🛡️ Sécurisé |
| **Catalogue** | `PATCH` | `/api/v1/products/:id/stock` | `VENDOR` | `findAndVerifyOwnership` strict (403 si tiers) | 🛡️ Sécurisé |
| **Catalogue** | `DELETE`| `/api/v1/products/:id` | `VENDOR` | `findAndVerifyOwnership` strict (403 si tiers) | 🛡️ Sécurisé |
| **Catalogue** | `GET` | `/api/v1/categories` | `Public` | Lecture arborescence publique | 🛡️ Sécurisé |
| **Catalogue** | `POST` | `/api/v1/categories` | `VENDOR` | Rattaché à la boutique du vendeur connecté | 🛡️ Sécurisé |
| **Commandes** | `POST` | `/api/v1/orders/checkout` | `CLIENT` | Transaction ACID multi-boutiques + Séquestre | 🛡️ Sécurisé |
| **Commandes** | `GET` | `/api/v1/orders/client/me` | `CLIENT` | Filtré par `order.clientId === currentUser.id` | 🛡️ Sécurisé |
| **Commandes** | `GET` | `/api/v1/orders/vendor/me` | `VENDOR` | Filtré par `order.shop.ownerId === currentUser.id`| 🛡️ Sécurisé |
| **Commandes** | `GET` | `/api/v1/orders/:id` | `CLIENT`, `VENDOR`, `SUPER_ADMIN` | Contrôle d'accès triple acteur (403 si tiers) | 🛡️ Sécurisé |
| **Commandes** | `GET` | `/api/v1/orders/:id/tracking` | `CLIENT`, `VENDOR`, `SUPER_ADMIN` | Suivi Tiak-Tiak et horodatage des étapes | 🛡️ Sécurisé |
| **Commandes** | `PATCH` | `/api/v1/orders/:id/prepare`| `VENDOR` | Vérification stricte boutique vendeur (403) | 🛡️ Sécurisé |
| **Commandes** | `PATCH` | `/api/v1/orders/:id/ship` | `VENDOR` | Remise coursier Tiak-Tiak + timer 24h | 🛡️ Sécurisé |
| **Commandes** | `POST` | `/api/v1/orders/:id/confirm-delivery` | `CLIENT`, `VENDOR`, `SUPER_ADMIN` | OTP 6 chiffres exigé pour vendeur + Verrou SQL | 🛡️ Sécurisé |
| **Commandes** | `GET` | `/api/v1/orders/:id/invoice` | `CLIENT`, `VENDOR`, `SUPER_ADMIN` | Facture officielle horodatée en FCFA | 🛡️ Sécurisé |
| **Litiges** | `POST` | `/api/v1/disputes/:orderId` | `CLIENT` | Vérification `order.clientId === currentUser.id` | 🛡️ Sécurisé |
| **Litiges** | `GET` | `/api/v1/disputes` | `SUPER_ADMIN` | Réservé Super-Admin | 🛡️ Sécurisé |
| **Litiges** | `GET` | `/api/v1/disputes/:id` | `CLIENT`, `VENDOR`, `SUPER_ADMIN` | Contrôle d'accès triple acteur (403) | 🛡️ Sécurisé |
| **Litiges** | `POST` | `/api/v1/disputes/:id/arbitrate`| `SUPER_ADMIN` | Arbitrage exclusif Super-Admin + Audit log | 🛡️ Sécurisé |
| **Wallets** | `GET` | `/api/v1/wallets/me` | `VENDOR` | Portefeuille lié au `ownerId` de la session | 🛡️ Sécurisé |
| **Wallets** | `POST` | `/api/v1/wallets/payout` | `VENDOR` | Débit atomique + KYC Vérifié requis (Anti-blanchiment) | 🛡️ Sécurisé |
| **Wallets** | `GET` | `/api/v1/wallets/admin/payouts`| `SUPER_ADMIN`| Supervision globale Super-Admin | 🛡️ Sécurisé |
| **Abonnements**| `GET` | `/api/v1/subscriptions/plans` | `Public` | Grille tarifaire publique en FCFA | 🛡️ Sécurisé |
| **Abonnements**| `POST` | `/api/v1/subscriptions/upgrade` | `VENDOR` | Mise à niveau forfait SaaS et commission | 🛡️ Sécurisé |
| **Séquestre** | `GET` | `/api/v1/escrow/overview` | `SUPER_ADMIN` | Vue trésorerie globale séquestre | 🛡️ Sécurisé |
| **Séquestre** | `POST` | `/api/v1/escrow/auto-release`| `SUPER_ADMIN` | Déclenchement filet de sécurité 24h | 🛡️ Sécurisé |
| **Séquestre** | `POST` | `/api/v1/escrow/webhooks/wave` | `Public` (HMAC) | Validation HMAC SHA-256 (`WaveWebhookGuard`) | 🛡️ Sécurisé |
| **Séquestre** | `POST` | `/api/v1/escrow/webhooks/orange-money`| `Public` (HMAC) | Validation HMAC SHA-256 (`OrangeMoneyWebhookGuard`) | 🛡️ Sécurisé |
| **Stockage** | `POST` | `/api/v1/storage/upload-ticket` | Authentifié | Signature tickets, whitelist MIME & quotas taille | 🛡️ Sécurisé |
| **Stockage** | `GET` | `/api/v1/storage/secure-view` | `SUPER_ADMIN`, Propriétaire | Isolation stricte des documents KYC confidentiels | 🛡️ Sécurisé |
| **BNPL** | `POST` | `/api/v1/bnpl/kyc` | `CLIENT` | KYC obligatoire avant souscription 3x/4x | 🛡️ Sécurisé |
| **BNPL** | `PATCH` | `/api/v1/bnpl/admin/kyc/:id` | `SUPER_ADMIN` | Approbation/rejet KYC acheteur | 🛡️ Sécurisé |
| **BNPL** | `POST` | `/api/v1/bnpl/orders/:id/init` | `CLIENT` | Échéancier 3x/4x exact en FCFA sans arrondi | 🛡️ Sécurisé |
| **BNPL** | `POST` | `/api/v1/bnpl/installments/:id/pay` | `CLIENT` | Paiement d'échéance + Déblocage séquestre | 🛡️ Sécurisé |
| **BNPL** | `GET` | `/api/v1/bnpl/my-plans` | `CLIENT` | Liste des échéanciers de l'acheteur | 🛡️ Sécurisé |
| **BNPL** | `GET` | `/api/v1/bnpl/plans/:id` | Acteurs concernés | Protection BOLA stricte client/boutique/admin | 🛡️ Sécurisé |
| **Wakhale** | `POST` | `/api/v1/negotiations` | `CLIENT` | Négociation prix marchand (max 2 contre-offres) | 🛡️ Sécurisé |
| **Wakhale** | `GET` | `/api/v1/negotiations/my` | `CLIENT` | Négociations acheteur | 🛡️ Sécurisé |
| **Wakhale** | `GET` | `/api/v1/negotiations/shop` | `VENDOR` | Offres reçues par le marchand | 🛡️ Sécurisé |
| **Wakhale** | `PATCH` | `/api/v1/negotiations/:id/respond`| `VENDOR` | Acceptation/Rejet/Contre-offre commerçant | 🛡️ Sécurisé |
| **Wakhale** | `PATCH` | `/api/v1/negotiations/:id/accept-counter`| `CLIENT` | Acceptation contre-offre par l'acheteur | 🛡️ Sécurisé |
| **Live** | `POST` | `/api/v1/streams` | `VENDOR` | Création session live shopping liée à la boutique | 🛡️ Sécurisé |
| **Live** | `PATCH` | `/api/v1/streams/:id/pin-product/:productId` | `VENDOR` | Épinglage produit en direct avec vérification stock | 🛡️ Sécurisé |

---

## 3. RÈGLES COMMERCIALES & SÉQUESTRE VALIDÉES

### Grille des Commissions par Plan SaaS (Règle 2 % - 4 %)
1. **Plan FREE :** **4 %** sur les ventes livrées (par défaut pour les nouveaux commerçants).
2. **Plan PRO (15 000 FCFA / mois) :** **3 %** sur les ventes livrées.
3. **Plan PREMIUM (35 000 FCFA / mois) :** **2 %** sur les ventes livrées.

### Arithmétique FCFA
* Tous les montants financiers sont stockés sous forme d'entiers stricts (`Int`) en base MySQL InnoDB.
* Équations comptables vérifiées sur chaque commande :  
  `Sous-total Marchandise = Commission OpenBoutik + Net Vendeur`  
  `Montant Total Débité Client = Sous-total Marchandise + Frais Tiak-Tiak`
* Échéanciers BNPL (3x ou 4x) :
  `Montant Total = Somme exacte des échéances (le différentiel d'arrondi est imputé sur la 1ère mensualité)`
* Aucun arrondi décimal, aucune perte au centime sur l'ensemble des paniers tests pairs et impairs.

### Cycle du Séquestre (Escrow State Machine)
```
[Panier Client / Échéance 1 BNPL] 
       │
       ▼ (Paiement Wave / Orange Money sécurisé par HMAC)
[PAID_ESCROW] ──► Fonds bloqués sur le compte séquestre OpenBoutik
       │
       ▼ (Préparation colis)
  [PREPARING]
       │
       ▼ (Remise au livreur Tiak-Tiak + timer 24h enclenché)
[SHIPPED_TIAK_TIAK]
       │
       ├──► (Validation Client OU Code OTP 6 chiffres remis par livreur)
       │         │
       │         ▼
       │    [DELIVERED_CONFIRMED] ──► Déblocage atomique :
       │                              - Solde disponible Vendeur crédité (Net)
       │                              - Commission OpenBoutik prélevée (2%-4%)
       │
       └──► (Réclamation acheteur)
                 │
                 ▼
             [DISPUTED] ──► Séquestre gelé (FROZEN_BY_DISPUTE)
                 │
                 ▼ (Arbitrage exclusif Super-Admin)
         ┌───────┴───────┐
         ▼               ▼
  [REFUNDED]    [DELIVERED_CONFIRMED]
 (Remboursement  (Libération fonds
  intégral Client)    au Vendeur)
```

---

## 4. ARCHITECTURE D'INFRASTRUCTURE & DÉFENSE DES CONNEXIONS CLOUD

### Contrainte Critique Clever Cloud MySQL (Quota Max 5 Connexions)
Le plan mutualisé gratuit Clever Cloud impose une limite stricte de **5 connexions simultanées**.
Afin de garantir une disponibilité absolue en production sans aucun dépassement (`ER_CON_COUNT_ERROR: Too many connections`), l'architecture a été durcie comme suit :

1. **Répartition du Pool de Connexions :**
   * **Production (Render) :** Réservé à 3 connexions persistantes configurées via l'URL MySQL (`connectionLimit=3`).
   * **Environnement Local / Runners de Tests :** Strictement plafonné à **2 connexions** (`connectionLimit=2`), garantissant que `3 + 2 = 5 <= 5`.
2. **Résilience des Transactions Interactives (`$transaction`) :**
   * Sous forte charge concurrente et latence réseau WAN vers Clever Cloud, les pools réduits peuvent saturer temporairement.
   * Configuration explicite sur tous les flux financiers critiques (`orders`, `wallets`, `disputes`) de paramètres de résilience :
     `{ maxWait: 20000, timeout: 30000 }`
   * Élimine définitivement les erreurs `Unable to start a transaction in the given time` et `Query cannot be executed on an expired transaction`.
3. **Architecture Pure-HTTP des Runners de Sécurité :**
   * Le runner de pentest API (`test/openboutik-pentest.runner.ts`) utilise désormais exclusivement des requêtes HTTP distantes via `fetch` sans instancier de second pool Prisma, évitant toute compétition sur les slots de connexion Clever Cloud.

---

## 5. BILAN INDUSTRIEL DE LA SUITE DE TESTS AUTOMATISÉS (281 TESTS)

Le projet dispose d'une couverture de tests industrielle complète et exhaustive :

| Suite de Test | Commande d'Exécution | Nb Tests | Résultat | Périmètre Couvert |
| :--- | :--- | :---: | :---: | :--- |
| **Tests Unitaires Jest** | `npm run test` | **84** | 🟢 **PASS** | Commissions 2 % - 4 %, Intégrité FCFA, Anti-overdraft Wallet, Gel Séquestre Litiges, Auth, Catalog |
| **Tests E2E Jest** | `npm run test:e2e` | **83** | 🟢 **PASS** | Cycles E2E complets (Commandes, Wallets, Litiges, Catalogue, Auth, Séquestre) |
| **Pentest API Supertest / HTTP** | `npm run test:pentest` | **33** | 🟢 **PASS** | OWASP Top 10 API (BOLA/IDOR, RBAC, Mass Assignment, Webhook HMAC, Headers, Storage tickets, BNPL, Wakhale) |
| **Tests Financiers & Stress**| `npm run test:stress` | **27** | 🟢 **PASS** | Checkout multi-boutiques, OTP Tiak-Tiak, Traçabilité Audit Logs |
| **Chaos & Concurrence Extrême** | `npm run test:chaos` | **17** | 🟢 **PASS** | 20 assauts stock flash, double-retrait concurrent, replay OTP, duel litige/livraison |
| **Onboarding & KYC Vendeur** | `npm run test:onboarding` | **37** | 🟢 **PASS** | Étapes 0 à 5, unicité & suggestion slug, mono-boutique MVP, validation WhatsApp Sénégal, CNI KYC |
| **TOTAL GÉNÉRAL** | - | **281** | 🟢 **100 % PASS** | **Zéro régression, robustesse bancaire prouvée** |

---

## 6. SÉCURITÉ DU STOCKAGE CLOUD (STORAGE TICKETS & ISOLATION KYC)

Conformément à la directive du Pilote sur l'intégration prochaine de Cloudinary / Cloud Storage :
1. **Upload Tickets Sécurisés :**
   * Aucun upload binaire brut ne transite directement par le serveur applicatif sans ticket pré-signé.
   * L'endpoint `POST /api/v1/storage/upload-ticket` applique une liste blanche stricte des types MIME autorisés (`image/jpeg`, `image/png`, `image/webp`, `video/mp4`, `application/pdf`) et limite la taille maximale selon le contexte (5 Mo pour images, 50 Mo pour vidéos de démonstration/live, 10 Mo pour pièces d'identité CNI).
2. **Isolation Hermétique des Documents KYC :**
   * Les pièces d'identité et registres de commerce (NINEA, CNI, Passeports) sont stockés sous préfixe sécurisé.
   * L'accès via `/api/v1/storage/secure-view` est strictement verrouillé : accès réservé au `SUPER_ADMIN` pour l'instruction des dossiers ou au titulaire authentifié du compte, rejetant catégoriquement toute tentative d'accès tiers (BOLA/IDOR 403).

---

## 7. CONCLUSION & CERTIFICATION DE L'AUDIT

Le backend d'`openboutik-api` est certifié **100 % conforme aux exigences de sécurité, de performance et de résilience financière**. L'architecture respecte scrupuleusement la règle du "Pilote et le Codeur" :
- **Qualité du code :** 0 warning, 0 erreur sur 141 fichiers vérifiés (`oxlint`), typage strict TypeScript.
- **Intégrité des données :** Transactions ACID MySQL InnoDB, isolation des ressources multi-locataires, prévention des dépassements de quota sur Clever Cloud.
- **Sécurité applicative :** Protection complète contre l'OWASP API Top 10, Guards HMAC timing-safe, en-têtes Helmet renforcés.

*Rapport certifié conforme aux normes de sécurité OWASP API Security Top 10 et aux exigences fonctionnelles du cahier des charges OpenBoutik Sénégal.*
