# 🚀 KIT D'INTÉGRATION DEV 1 — CORE MARKETPLACE & MULTI-TENANT NEXT.JS
**Destinataire :** `@mansss7` ([github.com/mansss7](https://github.com/mansss7))  
**Projet :** `openboutik-client` (Port local recommandé : `3000`)  
**Backend de référence :** `openboutik-api` (Branche `develop`)  
**Environnement API Production :** `https://openboutik-api.onrender.com/api/v1`  
**Environnement API Local :** `http://localhost:4000/api/v1`  
**Swagger Docs :** `http://localhost:4000/api/docs`

---

## 1. VUE D'ENSEMBLE & ÉTAT D'AVANCEMENT DU BACKEND

Le backend `openboutik-api` est **100 % opérationnel, audité et certifié** à travers les 5 phases de la feuille de route officielle :
- **Phase 1 & 2 :** Authentification JWT double token (Access 15m / Refresh 7j), RBAC (`CLIENT`, `VENDOR`, `SUPER_ADMIN`), Catalogue produits, Gestion de panier & Commandes multi-boutiques.
- **Phase 3 :** Tiers de confiance & Séquestre financier (Escrow) avec règles strictes XOF/FCFA (entiers stricts, pas de virgule flottante), déblocage automatique après 24h sans litige, retraits Mobile Money Wave / Orange Money protégés par bouclier KYC CNI.
- **Phase 4 :** Disruption & Scaling — « Wakhale » numérique (négociation de prix avec coupons automatisés), Avis clients 5★ Achat Vérifié, Reçus PDF streaming à la volée, Variantes de produits, Mode Vacances, Codes promos, Mémos commandes confidentiels.
- **Phase 5 :** Moteur Hybride SaaS Multi-Tenant :
  - **3 Forfaits SaaS :**
    - `FREE` : 0 FCFA/mois + **3.0 % de commission** sur les ventes marketplace.
    - `PRO` : 5 000 FCFA/mois + **0 % de commission** + sous-domaine dédié (`nom-boutique.openboutik.sn`) + Store Builder + Wakhale + 5 sponsors.
    - `PREMIUM` : 15 000 FCFA/mois + **0 % de commission** + domaine personnalisé (`nom-boutique.sn`) + BNPL 3x/4x + badge Or VIP.
  - **Mois d'Essai Gratuit 30 Jours :** Activation 1-clic avec registre anti-fraude `used_trial_registries` (CNI, WhatsApp, Wave, OM).
  - **Dunning Engine (72h / 6 étapes) :** Maintien des privilèges pendant la période de grâce de 72h (`PAST_DUE`) avant rétrogradation automatique en FREE.
  - **Alertes WhatsApp & SMS :** Notification de renouvellement réussi, solde insuffisant, rappel urgent < 24h, avis de rétrogradation et rappel préventif J-3.
  - **Auto-Sweep :** Régularisation automatique de l'abonnement en souffrance dès qu'une commande est livrée et crédite le Wallet.
  - **Qualité & Tests :** 92/92 tests unitaires passants, 108/108 tests E2E certifiés.

> [!CAUTION]
> **CONSIGNE ABSOLUE DE BASE DE DONNÉES (CLEVER CLOUD) :**  
> La base de données MySQL hébergée sur Clever Cloud (`bffneh8kcrtiqsl58wig`) est **déjà entièrement synchronisée avec le schéma Phase 5**.  
> **INTERDICTION FORMELLE de lancer `npx prisma migrate deploy` à l'aveugle** : toutes les colonnes et tables Phase 5 (`shop_sponsors`, `subscription_billing_logs`, `used_trial_registries`, etc.) sont déjà en place. Toute tentative de re-migration sauvage provoquerait une erreur MariaDB 1060 (*Duplicate column*).

---

## 2. PÉRIMÈTRE & MISSION DE @mansss7 (DEV 1)

En tant que **Lead Frontend Marketplace**, ta mission couvre l'expérience acheteur globale et la vitrine multi-tenant sur le dépôt `openboutik-client` :

### A. Middleware Multi-Tenant & Résolution du Host (Next.js)
Ton application Next.js doit servir à la fois :
1. **La Marketplace Centrale :** Accédée via `openboutik.sn` ou `www.openboutik.sn` (ou `localhost:3000`).
2. **Les Vitrines Dédiées des Marchands (Sous-domaines) :** Accédées via `[slug].openboutik.sn` (ex: `dakar-chic.openboutik.sn` ou `dakar-chic.localhost:3000`).
3. **Les Domaines Personnalisés (Forfait PREMIUM) :** Accédés via `[domaine-marchand].sn` (ex: `dakarchic.sn`).

Le middleware Next.js doit intercepter le header `Host`, extraire le sous-domaine ou le domaine personnalisé, interroger l'endpoint backend `GET /shops/storefront/:identifier` et réécrire l'URL (*rewrite*) vers `/storefront/[slug]`.

### B. Tunnel de Commande & Checkout Séquestre Multi-Boutiques
- L'acheteur peut ajouter au panier des produits provenant de boutiques différentes.
- Lors du `POST /orders/checkout` :
  - Le backend découpe automatiquement la session de commande en sous-commandes distinctes par boutique.
  - Le calcul des commissions est géré côté backend de manière transparente :
    - Si l'achat a lieu sur la Marketplace centrale : la boutique en plan `FREE` est prélevée de **3.0 %**, tandis que la boutique en plan `PRO` ou `PREMIUM` est à **0 %**.
    - Si l'achat a lieu sur le site dédié d'un marchand (`*.openboutik.sn`) : la commission est de **0 %**.
  - Génération d'un code OTP Tiak-Tiak à 6 chiffres par sous-commande.
  - Génération de la référence de paiement Mobile Money Wave ou Orange Money.

### C. Suivi de Commande & Déblocage 1-Clic
- Page de suivi chronologique (Stepper : `PAID_ESCROW` ➔ `PREPARING` ➔ `SHIPPED_TIAK_TIAK` ➔ `DELIVERED_CONFIRMED`).
- **Déblocage Séquestre 1-Clic :** Dès réception du colis, l'acheteur clique sur « J'ai bien reçu ma commande ». Un appel à `POST /orders/:id/confirm-delivery` libère instantanément les fonds vers le Wallet disponible du vendeur (avec déclenchement de l'Auto-Sweep si le vendeur avait un abonnement en souffrance).
- **Protection Séquestre 24h :** Rappel dans l'UI qu'après 24h suivant l'expédition, si aucun litige n'est ouvert, les fonds sont automatiquement libérés au vendeur.

### D. Social Commerce & Négociation « Wakhale »
- Bouton de contact direct WhatsApp sur chaque produit ouvrant `https://wa.me/+221XXXXXXXXX?text=...`.
- Module Wakhale numérique : modal d'offre de prix (`POST /negotiations`), consultation des contre-offres vendeur, et génération automatique de coupon utilisable au checkout.

---

## 3. ARBORESCENCE DU KIT D'INTÉGRATION

Le présent dossier contient 5 documents complémentaires prêts à l'emploi :

1. **`00_README_MANSSS7.md`** *(Ce fichier)* : Vue d'ensemble, architecture et périmètre.
2. **`01_API_CONTRACTS_AND_PAYLOADS.md`** : Spécification chirurgicale de tous les endpoints consommés par Dev 1 (URLs, DTOs, headers, réponses 200 et erreurs 400/401/403/404).
3. **`02_TYPESCRIPT_INTERFACES.ts`** : Fichier TypeScript strict complet sans aucun `any`, prêt à copier dans ton projet Next.js (`types/api.ts`).
4. **`03_ANTIGRAVITY_RULES_MANSSS7.md`** : Configuration système à copier dans la section `Customization` de ton IDE Antigravity pour verrouiller la qualité de code.
5. **`04_STARTER_PROMPTS_ANTIGRAVITY.md`** : 5 prompts séquentiels prêts à exécuter pour coder le middleware, le client API, le checkout, le stepper et les tests.
