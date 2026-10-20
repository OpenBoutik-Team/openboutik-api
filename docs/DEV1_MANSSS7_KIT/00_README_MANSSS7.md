# 🚀 KIT D'INTÉGRATION DEV 1 — MARKETPLACE CLIENT & VITRINES MULTI-TENANT NEXT.JS
**Destinataire :** **Mansour** (`@mansss7` — [github.com/mansss7](https://github.com/mansss7))  
**Rôle :** **Dev 1 — Lead Frontend Marketplace**  
**Dépôt GitHub :** `openboutik-marketplace` (**Port local officiel : `3000`**)  
**Backend de référence :** `openboutik-api` (Dev 3 — `@HYPNOTYZEDCHART` — **Port local : `4000`**)  
**Environnement API Production :** `https://openboutik-api.onrender.com/api/v1`  
**Environnement API Local :** `http://localhost:4000/api/v1`  
**Swagger Docs :** `http://localhost:4000/api/docs`

---

## 1. CARTOGRAPHIE OFFICIELLE DES 3 DÉPÔTS & PORTS

| Pôle | Développeur | Dépôt GitHub | Port Local | Périmètre & Mission |
| :--- | :--- | :--- | :--- | :--- |
| **Dev 1 (Toi)** | **Mansour (`@mansss7`)** | **`openboutik-marketplace`** | **`3000`** | Front Client Next.js : Catalogue, Vitrines Multi-Tenant (`*.openboutik.sn`), Panier, Checkout Séquestre, Wakhale, Live Shopping, BNPL & Espace Acheteur |
| **Dev 2** | **El hadji Mor (`@akhy-m00`)** | `openboutik-seller` | `3001` | Front Marchand SaaS, Store Builder & Back-Office Super-Admin Next.js |
| **Dev 3** | **Bécaye (`@HYPNOTYZEDCHART`)** | `openboutik-api` | `4000` | Cerveau Backend NestJS, Prisma 7, MySQL InnoDB, Moteur de Séquestre et Logistique |

> [!CAUTION]
> **CONSIGNE ABSOLUE DE BASE DE DONNÉES (CLEVER CLOUD) :**  
> La base de données MySQL hébergée sur Clever Cloud (`bffneh8kcrtiqsl58wig`) est **déjà entièrement synchronisée avec le schéma Phase 5**.  
> **INTERDICTION FORMELLE de lancer `npx prisma migrate deploy` à l'aveugle** : toutes les colonnes et tables Phase 5 (`shop_sponsors`, `subscription_billing_logs`, `used_trial_registries`, etc.) sont déjà en place.

---

## 2. PÉRIMÈTRE COMPLET & MISSION DE @mansss7 (DEV 1 — `openboutik-marketplace`)

En tant que **Lead Frontend Marketplace (Dev 1)** sur le port **`3000`**, ta mission couvre l'intégralité de l'expérience acheteur et le moteur de rendu des vitrines marchandes sur `openboutik-marketplace` :

### A. Middleware Multi-Tenant & Rendu des Vitrines Dédiées (`StorefrontRenderer`)
Ton application Next.js (`openboutik-marketplace` sur `:3000`) sert à la fois :
1. **La Marketplace Centrale :** Accédée via `openboutik.sn` ou `www.openboutik.sn` (ou `localhost:3000`).
2. **Les Vitrines Dédiées des Marchands (Sous-domaines PRO/PREMIUM) :** Accédées via `[slug].openboutik.sn` (ex: `teranga-mode.openboutik.sn` ou `teranga-mode.localhost:3000`).
3. **Les Domaines Personnalisés (Forfait PREMIUM) :** Accédés via `[domaine-marchand].sn` (ex: `terangamode.sn`).

- Le `middleware.ts` intercepte le header `Host`, extrait le sous-domaine ou domaine personnalisé, et interroge `GET /shops/storefront/:identifier`.
- Si `subdomainActive === false` (boutique en plan `FREE` ou suspendue), redirige vers la fiche boutique sur la marketplace centrale (`/shops/[slug]`).
- Si `subdomainActive === true`, réécrit vers `/storefront/[identifier]` et affiche le composant `StorefrontRenderer` qui applique dynamiquement le `themeConfig` sauvegardé par le vendeur depuis le Store Builder (`primaryColor`, `fontFamily`, `bannerStyle`, barre d'annonce, sponsors `shop_sponsors`, bouton WhatsApp, mode vacances).

### B. Catalogue Public, Recherche Multi-Critères, Favoris & Avis 5★
- Moteur de recherche et filtres paginés via `GET /products` (recherche plein texte, catégorie, fourchette de prix FCFA, disponibilité en stock, tri `price_asc`, `price_desc`, `newest`, `popular`).
- Fiche produit détaillée via `GET /products/:shopSlug/:productSlug` avec sélection de variantes (tailles/couleurs), tracking des visites (`POST /products/:id/view`) et affichage du bandeau Mode Vacances si `shop.isOnVacation === true`.
- Annuaire des boutiques (`GET /shops`) et vitrine marketplace (`GET /shops/:slug`).
- Gestion des favoris client (`GET /wishlist`, `POST /wishlist/:productId`, `DELETE /wishlist/:productId`).
- Consultation et dépôt d'avis 5★ Achat Vérifié (`GET /products/:productId/reviews`, `POST /products/:productId/reviews`).

### C. Panier Multi-Boutiques, Codes Promo & Checkout Séquestre
- L'acheteur peut ajouter au panier des produits (avec ou sans `variantId`) provenant de plusieurs boutiques différentes.
- Validation en temps réel des codes promo via `POST /coupons/validate`.
- Lors du `POST /orders/checkout` (paiement `WAVE`, `ORANGE_MONEY` ou `FREE_MONEY`) :
  - Découpage automatique par le backend en sous-commandes indépendantes par boutique (`Order`).
  - Fonds bloqués en séquestre (`HELD_IN_ESCROW`) et génération d'un code OTP Tiak-Tiak à 6 chiffres par commande.

### D. Suivi de Commande, Déblocage Séquestre 1-Clic, Reçus PDF & Litiges Acheteur
- Historique des commandes client (`GET /orders/client/me`) et détail (`GET /orders/:id`).
- Stepper chronologique de livraison via `GET /orders/:id/tracking` (`PAID_ESCROW` ➔ `PREPARING` ➔ `SHIPPED_TIAK_TIAK` ➔ `DELIVERED_CONFIRMED`).
- **Déblocage Séquestre 1-Clic :** Bouton « J'ai bien reçu ma commande » appelant `POST /orders/:id/confirm-delivery` (body `{}`) pour libérer instantanément les fonds au marchand.
- Téléchargement du reçu officiel PDF (`GET /orders/:id/invoice`).
- **Signalement de Litige :** En cas de colis non reçu ou non conforme, l'acheteur ouvre un litige via `POST /disputes/:orderId` (avec upload préalable des photos preuves via `POST /storage/upload-ticket`), ce qui gèle immédiatement le séquestre (`FROZEN_BY_DISPUTE`) jusqu'à l'arbitrage du Super-Admin.

### E. Négociation « Wakhale », Live Shopping Temps Réel & Paiement Fractionné BNPL (3x/4x)
- **Wakhale Numérique :** Proposition d'offre de prix (`POST /negotiations`, rabais max 50 %), suivi de mes offres (`GET /negotiations/my`), et acceptation en 1-clic d'une contre-offre vendeur (`PATCH /negotiations/:id/accept-counter`) générant automatiquement le coupon unique `WAKHALE-XXXXXX`.
- **Live Shopping & Vidéos Courtes :** Flux publics (`GET /streams`, `GET /streams/:id`) et connexion WebSocket temps réel sur `http://localhost:4000/streams` (`join_stream`, `live_product_popup`, `stream_chat_message`).
- **Paiement Fractionné BNPL (3x ou 4x) :** Soumission CNI acheteur (`POST /bnpl/kyc`), initialisation d'un échéancier (`POST /bnpl/orders/:orderId/init`), suivi des plans (`GET /bnpl/my-plans`, `GET /bnpl/plans/:planId`) et paiement d'une mensualité (`POST /bnpl/installments/:installmentId/pay`).
- **Messagerie Interne Acheteur ↔ Vendeur :** Envoi de message (`POST /messages`), liste des conversations (`GET /messages/conversations`), fil de discussion (`GET /messages/thread/:otherUserId`) et marquage comme lu (`PATCH /messages/read/:otherUserId`).

---

## 3. ARBORESCENCE DU KIT D'INTÉGRATION DEV 1

1. **`00_README_MANSSS7.md`** *(Ce fichier)* : Vue d'ensemble, cartographie des ports et périmètre complet de `openboutik-marketplace`.
2. **`01_API_CONTRACTS_AND_PAYLOADS.md`** : Spécification chirurgicale de tous les endpoints consommés par Dev 1.
3. **`02_TYPESCRIPT_INTERFACES.ts`** : Fichier TypeScript strict complet sans aucun `any`, prêt à copier dans `openboutik-marketplace/src/types/api.ts`.
4. **`03_ANTIGRAVITY_RULES_MANSSS7.md`** : Directives système à copier dans la section `Customization` de ton IDE Antigravity.
5. **`04_STARTER_PROMPTS_ANTIGRAVITY.md`** : 5 prompts séquentiels prêts à exécuter pour construire `openboutik-marketplace`.
