# 🎯 STARTER PROMPTS ANTIGRAVITY — PÔLE DEV 1 (@mansss7)

Ces 5 prompts séquentiels sont prêts à être copiés-collés directement dans le chat de ton IDE Antigravity pour construire ton application Next.js de bout en bout en symbiose parfaite avec `openboutik-api`.

---

## 🟢 PROMPT 1 : MIDDLEWARE MULTI-TENANT NEXT.JS (ROUTAGE PAR SOUS-DOMAINE & DOMAINE PERSONNALISÉ)

```text
Agis en tant que Principal Frontend Architect Next.js App Router.
Implémente le fichier `middleware.ts` à la racine du projet `openboutik-client` pour gérer le routage multi-tenant dynamique d'OpenBoutik.

Contraintes techniques :
1. Extraction du host depuis `request.headers.get('host')`.
2. Détection du cas d'usage :
   - Si le host est `openboutik.sn`, `www.openboutik.sn` ou `localhost:3000` : c'est la Marketplace centrale. Laisse passer la requête normalement vers les routes classiques (`/`, `/catalog`, `/cart`, `/checkout`).
   - Si le host contient un sous-domaine (ex: `dakar-chic.openboutik.sn` ou `dakar-chic.localhost:3000`) ou s'il s'agit d'un domaine personnalisé externe (ex: `terangamode.sn`) :
     - Extrais l'identifiant (le slug du sous-domaine ou le domaine complet).
     - Appelle l'endpoint backend OpenBoutik : `GET http://localhost:4000/api/v1/shops/storefront/:identifier`.
     - Si la réponse indique `subdomainActive: false` et `redirectToMarketplace: true`, effectue une redirection Next.js permanente vers `https://www.openboutik.sn/shops/${data.shopBasicInfo.slug}`.
     - Si la réponse indique `subdomainActive: true`, réécris l'URL (*rewrite*) vers `/storefront/${identifier}${pathname}` en injectant les données de vitrine dans les headers personnalisés (`x-shop-id`, `x-shop-theme`).
3. Exclusion stricte des assets statiques (`_next/static`, `_next/image`, `favicon.ico`, images).
4. Code 100 % typé en TypeScript strict, sans aucun `any`.
```

---

## 🟢 PROMPT 2 : CLIENT API TYPÉ & GESTION DES TOKENS JWT

```text
Agis en tant que Lead Frontend Engineer.
Crée le client API HTTP typé pour `openboutik-client` dans `src/lib/api-client.ts` basé sur `fetch` natif (ou `ky`) compatible Server et Client Components Next.js.

Spécifications requises :
1. Base URL dynamique configurée via `process.env.NEXT_PUBLIC_API_URL` (défaut : `http://localhost:4000/api/v1`).
2. Gestion de l'authentification :
   - Injection automatique du header `Authorization: Bearer <accessToken>` depuis les cookies sécurisés ou le localStorage.
   - Intercepteur de réponse 401 : si le token est expiré, tente un rafraîchissement automatique via `POST /auth/refresh` avec le refreshToken. En cas de succès, rejoue la requête initiale. En cas d'échec, purge les tokens et redirige vers `/login`.
3. Gestion des erreurs standardisées :
   - Parse automatiquement les erreurs `{ statusCode, message, error }` renvoyées par NestJS et lance une classe d'erreur personnalisée `ApiError`.
4. Typage strict de toutes les méthodes (`get<T>`, `post<T>`, `put<T>`, `patch<T>`, `delete<T>`) en utilisant les interfaces fournies dans `@/types/api`.
5. Fournis un helper `formatFcfa(amount: number): string` qui formate les montants avec l'espace insécable sénégalais (ex: `25 000 FCFA`).
```

---

## 🟢 PROMPT 3 : TUNNEL DE CHECKOUT MULTI-BOUTIQUES & PAIEMENT MOBILE MONEY

```text
Agis en tant que Lead Frontend Engineer.
Développe la page de Checkout (`/checkout`) et le hook de gestion de panier (`useCart`) pour `openboutik-client`.

Fonctionnalités métier obligatoires :
1. Affichage du récapitulatif du panier avec regroupement visuel par boutique vendeuse.
2. Formulaire de livraison conforme aux réalités sénégalaises :
   - Adresse précise (ex: quartier, repère, villa).
   - Ville (Dakar par défaut, Thiès, Saint-Louis, Mbour, etc.).
   - Téléphone destinataire avec validation stricte du format sénégalais `+221XXXXXXXXX`.
   - Instructions pour le coursier Tiak-Tiak.
3. Sélecteur de moyen de paiement Mobile Money :
   - Choix entre Wave et Orange Money (logos officiels, contrastes soignés).
   - Zone d'application de code promo avec validation temps réel via `POST /coupons/validate`.
4. Soumission de la commande via `POST /orders/checkout` :
   - Affichage de l'état de chargement Skeleton/Bouton désactivé pendant la transaction.
   - Dès réception de la réponse `201 Created` contenant `checkoutSession.paymentUrl` ou `providerReference` :
     - Si Wave : redirection vers le lien de paiement direct ou affichage du QR Code Wave.
     - Redirection vers la page de succès `/orders/[id]/confirmation` avec affichage du code OTP Tiak-Tiak à 6 chiffres.
5. Respect strict des règles Anti-IA (aucun dégradé violet, typographie Inter sobre, gestion des erreurs explicite).
```

---

## 🟢 PROMPT 4 : SUIVI DE COMMANDE, SÉQUESTRE 1-CLIC & WAKHALE

```text
Agis en tant que Lead Frontend Engineer.
Crée les deux modules clés de l'expérience acheteur OpenBoutik :

Module A — Suivi de Commande & Séquestre (`/orders/[id]`) :
1. Stepper chronologique vertical et responsive consommant `GET /orders/:id/trackings` (`PAID_ESCROW` ➔ `PREPARING` ➔ `SHIPPED_TIAK_TIAK` ➔ `DELIVERED_CONFIRMED`).
2. Carte d'information pédagogique sur le Séquestre :
   - Expliquant que l'argent est sécurisé par OpenBoutik jusqu'à ce que le client valide la réception.
3. Bouton d'action principal « J'ai bien reçu mon colis » :
   - Déclenche un appel à `POST /orders/:id/confirm-delivery`.
   - Affiche une notification de succès toast immédiate confirmant le déblocage des fonds vers le commerçant.
4. Bouton secondaire « Signaler un problème » ouvrant un modal de litige (`POST /disputes/:orderId`).

Module B — Négociation « Wakhale » numérique :
1. Modal interactif sur la fiche produit avec slider de proposition de prix (rabais max 50%).
2. Soumission via `POST /negotiations`.
3. Notification push/in-app quand le vendeur répond avec une contre-offre, et bouton 1-clic « Accepter l'offre » qui applique automatiquement le coupon généré.
```

---

## 🟢 PROMPT 5 : TESTS D'INTÉGRATION & CERTIFICATION FRONTEND E2E

```text
Agis en tant que Staff QA & Frontend Engineer.
Rédige une suite de tests d'intégration avec Playwright (ou Vitest + Testing Library) couvrant les flux critiques de `openboutik-client` :

Scénarios à valider :
1. Résolution de sous-domaine : navigation vers `dakar-chic.openboutik.sn` affichant la vitrine personnalisée avec couleur `#10B981` et sponsors.
2. Ajout au panier et tunnel de checkout avec saisie d'un numéro sénégalais valide `+221771234567`.
3. Validation d'un coupon `TABASKI20` et recalcul immédiat du montant en FCFA.
4. Validation de la commande et affichage du Stepper de séquestre avec bouton de déblocage 1-clic.
5. Gestion des erreurs 400 (stock épuisé) et 401 (token expiré avec refresh transparent).
```
