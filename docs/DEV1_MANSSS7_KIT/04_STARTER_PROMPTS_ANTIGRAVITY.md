# 🎯 STARTER PROMPTS ANTIGRAVITY — PÔLE DEV 1 (@mansss7 — `openboutik-marketplace` • Port 3000)

Ces 5 prompts séquentiels sont prêts à être copiés-collés directement dans le chat de ton IDE Antigravity pour construire l'application **`openboutik-marketplace`** (Port `3000`) en symbiose parfaite avec `openboutik-api` (Port `4000`).

---

## 🟢 PROMPT 1 : MIDDLEWARE MULTI-TENANT & VITRINE DYNAMIQUE (`StorefrontRenderer.tsx`)

```text
Agis en tant que Principal Frontend Architect Next.js App Router.
Implémente le routage multi-tenant et le moteur de rendu des vitrines dédiées pour le projet `openboutik-marketplace` (Port 3000).

Livrables attendus :
1. `src/middleware.ts` :
   - Extrait le header `host`.
   - Si le host est `openboutik.sn`, `www.openboutik.sn` ou `localhost:3000`, laisse passer vers les routes de la Marketplace centrale (`/`, `/products`, `/shops`, `/cart`, `/checkout`).
   - Si le host est un sous-domaine marchand (ex: `teranga-mode.openboutik.sn` ou `teranga-mode.localhost:3000`) ou un domaine personnalisé (`terangamode.sn`) :
     - Interroge `GET http://localhost:4000/api/v1/shops/storefront/:identifier`.
     - Si `subdomainActive === false` et `redirectToMarketplace === true`, redirige vers `/shops/${data.shopBasicInfo.slug}`.
     - Si `subdomainActive === true`, effectue un rewrite vers `/storefront/${identifier}${pathname}`.
2. `src/components/storefront/StorefrontRenderer.tsx` :
   - Consomme la réponse `StorefrontActiveResponse` (`themeConfig`, `shop`, `sponsors`, `featuredProducts`, `products`).
   - Injecte dynamiquement les variables CSS `--primary: themeConfig?.primaryColor || shop.primaryColor || '#10B981'` et `--font-family`.
   - Affiche la barre d'annonce supérieure si `shop.announcementBarEnabled === true`.
   - Si `shop.isOnVacation === true`, affiche le bandeau d'information `shop.vacationMessage` et désactive les boutons d'ajout au panier.
   - Affiche les partenaires/sponsors (`sponsors`), les produits vedettes, la grille de produits avec prix en FCFA formatés, le bouton WhatsApp direct et le bouton de négociation Wakhale (si `themeConfig?.wakhaleEnabled !== false`).
3. Code 100 % typé en TypeScript strict sans aucun `any`.
```

---

## 🟢 PROMPT 2 : CLIENT API TYPÉ, CATALOGUE, FAVORIS & FICHE PRODUIT

```text
Agis en tant que Lead Frontend Engineer.
Crée le socle HTTP typé et les pages Catalogue de `openboutik-marketplace` (Port 3000) connectées à `http://localhost:4000/api/v1`.

Spécifications requises :
1. `src/lib/api-client.ts` :
   - Client HTTP basé sur `fetch` avec injection automatique de `Authorization: Bearer <accessToken>` et rafraîchissement transparent sur erreur 401 via `POST /auth/refresh`.
   - Helper `formatFcfa(amount: number): string` formatant les entiers stricts en FCFA (ex: `35 000 FCFA`).
2. Catalogue & Filtres (`src/app/products/page.tsx`) :
   - Consomme `GET /products` avec filtres (`search`, `category`, `minPrice`, `maxPrice`, `inStock`, `sortBy`, `page`, `limit`) et `GET /categories`.
   - Gestion des 4 états UI obligatoires (Skeletons, Empty State, Error State avec Retry, Mobile-First 360px).
3. Fiche Produit (`src/app/products/[shopSlug]/[productSlug]/page.tsx`) :
   - Consomme `GET /products/:shopSlug/:productSlug` et déclenche `POST /products/:id/view` au chargement.
   - Sélecteur interactif de variantes (`variants` : taille, couleur, stock et prix dynamique).
   - Bouton Favoris (`POST /wishlist/:productId` / `DELETE /wishlist/:productId`).
   - Section Avis Clients 5★ Achat Vérifié (`GET /products/:productId/reviews` et formulaire `POST /products/:productId/reviews`).
```

---

## 🟢 PROMPT 3 : PANIER MULTI-BOUTIQUES, CODES PROMO, CHECKOUT SÉQUESTRE & BNPL 3X/4X

```text
Agis en tant que Lead Frontend Engineer.
Développe le Panier multi-boutiques et le tunnel de Checkout (`/checkout`) pour `openboutik-marketplace`.

Fonctionnalités métier obligatoires :
1. Regroupement visuel des articles du panier par boutique vendeuse (avec prise en compte de `variantId`).
2. Champ de code promotionnel (ou coupon Wakhale) validé en temps réel via `POST /coupons/validate`.
3. Formulaire de livraison sénégalais :
   - Mode `TIAK_TIAK` ou `PICKUP`, adresse précise à Dakar/régions, téléphone au format `+221XXXXXXXXX`, notes pour le coursier.
4. Choix du mode de règlement :
   - Paiement comptant sous Séquestre via `WAVE`, `ORANGE_MONEY` ou `FREE_MONEY` (`POST /orders/checkout`).
   - Option Paiement Fractionné BNPL en 3x ou 4x :
     - Si le client n'est pas encore vérifié KYC, affiche la modale d'upload CNI (`POST /storage/upload-ticket` puis `POST /bnpl/kyc`).
     - Si vérifié KYC, initialise l'échéancier via `POST /bnpl/orders/:orderId/init` avec affichage clair des 3 ou 4 échéances en FCFA.
5. Page de confirmation affichant le numéro de commande `OB-2026-XXXX` et le code OTP Tiak-Tiak à 6 chiffres (`deliveryConfirmationCode`).
```

---

## 🟢 PROMPT 4 : SUIVI DE COMMANDE, DÉBLOCAGE 1-CLIC, LITIGES, WAKHALE & LIVE SHOPPING

```text
Agis en tant que Lead Frontend Engineer.
Implémente l'Espace Acheteur complet de `openboutik-marketplace` :

1. Suivi de Commande, Séquestre & Litiges (`/orders/[id]`) :
   - Stepper chronologique consommant `GET /orders/:id/tracking` (`PAID_ESCROW` ➔ `PREPARING` ➔ `SHIPPED_TIAK_TIAK` ➔ `DELIVERED_CONFIRMED`).
   - Bouton principal « J'ai bien reçu ma commande » déclenchant `POST /orders/:id/confirm-delivery` (body `{}`) pour libérer les fonds au marchand.
   - Bouton « Télécharger mon reçu PDF » (`GET /orders/:id/invoice`).
   - Bouton « Signaler un problème / Ouvrir un litige » ouvrant une modale (`POST /disputes/:orderId` avec upload de preuves via `POST /storage/upload-ticket`) qui gèle immédiatement le séquestre.
2. Module « Wakhale » Numérique (`/account/negotiations` & modale produit) :
   - Soumission d'une offre (`POST /negotiations` avec `{ productId, proposedPriceFcfa }`).
   - Liste des négociations (`GET /negotiations/my`) et bouton 1-clic « Accepter la contre-offre » (`PATCH /negotiations/:id/accept-counter`) qui copie automatiquement le coupon `WAKHALE-XXXXXX` dans le panier.
3. Live Shopping Temps Réel (`/live` & `/live/[id]`) :
   - Liste des directs et vidéos courtes (`GET /streams`).
   - Connexion Socket.io sur `http://localhost:4000/streams` : écoute `live_product_popup` pour afficher le produit épinglé en pop-up flash avec achat 1-clic, et chat en direct (`stream_chat_message`).
4. Messagerie Interne (`/account/messages`) :
   - Liste des conversations (`GET /messages/conversations`), fil de discussion (`GET /messages/thread/:otherUserId`), envoi (`POST /messages`) et marquage lu (`PATCH /messages/read/:otherUserId`).
```

---

## 🟢 PROMPT 5 : SUITE DE TESTS E2E FRONTEND (`openboutik-marketplace`)

```text
Agis en tant que Staff QA & Frontend Engineer.
Rédige une suite de tests d'intégration (Playwright ou Vitest + Testing Library) pour certifier `openboutik-marketplace` sur le port 3000 :

Scénarios à couvrir :
1. Résolution Multi-Tenant : accès à `teranga-mode.localhost:3000` affichant `StorefrontRenderer` avec le thème `#10B981`, et redirection automatique vers `/shops/dakar-tech-hub` pour une boutique en plan `FREE`.
2. Recherche catalogue (`GET /products`), sélection d'une variante et validation d'un code promo `TABASKI20` (`POST /coupons/validate`).
3. Checkout multi-boutiques (`POST /orders/checkout`), affichage du Stepper (`GET /orders/:id/tracking`) et déblocage séquestre 1-clic (`POST /orders/:id/confirm-delivery`).
4. Négociation Wakhale (`POST /negotiations` -> `PATCH /negotiations/:id/accept-counter`) et ouverture d'un litige (`POST /disputes/:orderId`).
```
