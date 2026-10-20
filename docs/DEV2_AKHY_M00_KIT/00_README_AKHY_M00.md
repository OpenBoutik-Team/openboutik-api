# 💼 KIT D'INTÉGRATION DEV 2 — ESPACE MARCHAND, STORE BUILDER & SAAS 360
**Destinataire :** `@akhy-m00` ([github.com/akhy-m00](https://github.com/akhy-m00))  
**Projet :** `openboutik-seller` (Port local recommandé : `3001`)  
**Backend de référence :** `openboutik-api` (Branche `develop`)  
**Environnement API Production :** `https://openboutik-api.onrender.com/api/v1`  
**Environnement API Local :** `http://localhost:4000/api/v1`  
**Swagger Docs :** `http://localhost:4000/api/docs`

---

## 1. VUE D'ENSEMBLE DU BACKEND & ÉTAT DU SYSTÈME

Le backend `openboutik-api` est **100 % achevé, testé (108/108 E2E) et déployé en production** :
- **Architecture Multi-Tenant Hybride SaaS :** Modèle complet de facturation mensuelle sur le Wallet marchand, Store Builder avec schéma JSON `themeConfig`, gestion des sous-domaines (`*.openboutik.sn`), domaines personnalisés et sponsors.
- **Grille des 3 Forfaits Officiels :**
  - **FREE :** 0 FCFA/mois. Commission standard de **3.0 %** sur les ventes marketplace. Sous-domaine inactif (les clients sont redirigés vers la fiche marketplace).
  - **PRO :** 5 000 FCFA/mois. **0 % de commission sur toutes les ventes**, sous-domaine dédié actif (`nom-boutique.openboutik.sn`), Store Builder complet, Wakhale numérique, jusqu'à 5 sponsors.
  - **PREMIUM :** 15 000 FCFA/mois. **0 % de commission**, domaine personnalisé (`nom-boutique.sn`), paiement fractionné BNPL 3x/4x, badge Vendeur Vérifié Or, visibilité VIP et conciergerie WhatsApp.
- **Mois d'Essai Gratuit 30 Jours :** Activation 1-clic pour PRO ou PREMIUM avec bouclier anti-fraude multi-comptes `used_trial_registries` (CNI, WhatsApp, Wave, Orange Money).
- **Moteur Dunning & Période de Grâce (72h) :** En cas de solde insuffisant lors du prélèvement mensuel, le marchand passe en `PAST_DUE` avec 6 tentatives de relance sur 72h. **Ses privilèges (0 % commission et site dédié actif) sont intégralement maintenus pendant les 72h de grâce** pour préserver son activité commerciale.
- **Auto-Sweep Post-Livraison :** Dès qu'une livraison est validée et crédite le solde du Wallet, si la boutique a un abonnement en souffrance, le prélèvement se régularise automatiquement sans coupure.
- **Alertes Préventives WhatsApp :** Notification automatique envoyée au marchand **3 jours avant (J-3)** la fin de son essai gratuit ou de son cycle mensuel pour l'inviter à approvisionner son Wallet via Wave ou Orange Money.

> [!CAUTION]
> **CONSIGNE CRITIQUE BASE DE DONNÉES (CLEVER CLOUD) :**  
> La base de données MySQL hébergée sur Clever Cloud (`bffneh8kcrtiqsl58wig`) est **déjà synchronisée avec la Phase 5**.  
> **NE JAMAIS exécuter `npx prisma migrate deploy` à l'aveugle** : toutes les tables (`shop_sponsors`, `subscription_billing_logs`, `used_trial_registries`) et colonnes (`themeConfig`, `subdomainEnabled`, etc.) sont déjà en production. Toute exécution sauvage échouera avec une erreur MariaDB 1060 (*Duplicate column*).

---

## 2. PÉRIMÈTRE & MISSION DE @akhy-m00 (DEV 2)

En tant que **Lead Frontend Espace Vendeur & SaaS**, ta mission consiste à concevoir l'interface commerçant de référence sur `openboutik-seller` :

### A. Le Store Builder Vendeur & Personnalisation Visuelle
- Éditeur visuel interactif permettant au commerçant de personnaliser sa vitrine sans toucher à une seule ligne de code :
  - Palette de couleurs (primaire, secondaire, fond).
  - Slogan, description de marque, favicon, logo, bannière d'en-tête.
  - Barre d'annonce supérieure (texte personnalisé + interrupteur on/off).
  - Activation ou désactivation du module de négociation Wakhale.
- **Sauvegarde sans perte de données :** Consommation de `GET /shops/me/theme` et sauvegarde via `PUT /shops/me/theme` qui stocke le JSON brut dans `shop.themeConfig` tout en synchronisant les colonnes SQL dédiées.

### B. Dashboard Abonnements SaaS & Mois d'Essai Gratuit
- **Comparateur des 3 Forfaits :** Présentation claire et percutante des avantages (0 % commission, sous-domaine offert, économies financières).
- **Bouton d'activation Essai 30 Jours :** Déclenche `POST /subscriptions/start-trial`. En cas de refus 403, affiche un message d'explication convivial informant que le numéro Wave/OM ou la CNI a déjà bénéficié de l'offre d'essai.
- **Compteur d'économies cumulées :** Affichage en grand du montant `totalCommissionSavedFcfa` pour matérialiser la valeur apportée par l'abonnement PRO/PREMIUM (ex: *« Vous avez déjà économisé 48 500 FCFA de commissions grâce au forfait PRO ! »*).

### C. Gestion des Alertes de Recouvrement Dunning (Bandeau d'Urgence 72h)
- Consommation du champ `subscriptionAndDomain.dunningAlert` fourni par `GET /shops/me/dashboard-360` :
  - Si `isPastDue === true` : Affichage d'un **bandeau rouge persistant** en haut du dashboard marchand indiquant :
    - Le nombre de relances effectuées (`retryCount` sur 6).
    - Le compte à rebours précis jusqu'à la fin de la période de grâce (`gracePeriodEndsAt`).
    - Un texte rassurant : *« Votre site dédié et votre commission 0 % restent actifs pendant encore 48h. Veuillez recharger votre Wallet via Wave ou Orange Money pour éviter la suspension. »*
    - Un bouton d'action direct : « Régulariser mon compte » ouvrant la modale de rechargement.

### D. Gestion des Sponsors & Partenaires (`shop_sponsors`)
- Module de gestion des partenaires de la boutique (max 5 sponsors en forfait PRO, illimité en PREMIUM).
- Ajout, édition de l'ordre d'affichage (`displayOrder`), du logo et du badge (ex: *« Revendeur Agréé »*).
- Masquage automatique côté vitrine si la boutique passe en plan FREE.

### E. Conciergerie Domaine Personnalisé WhatsApp (Forfait PREMIUM)
- Étant donné la complexité technique de la configuration des zones DNS pour les commerçants informels à Dakar :
  - Le sous-domaine `[nom-boutique].openboutik.sn` reste actif et fonctionnel immédiatement.
  - Le domaine personnalisé (ex: `teranga-mode.sn`) est géré via une **carte Conciergerie VIP** dans le dashboard :
    1. Le vendeur saisit le domaine souhaité.
    2. Un bouton WhatsApp ouvre un message pré-rempli vers le support conciergerie OpenBoutik (`https://wa.me/221...`) avec le nom de domaine et l'ID de sa boutique.
    3. L'équipe d'administration valide et connecte le domaine, puis passe `customDomainVerified = true`.

---

## 3. ARBORESCENCE DU KIT D'INTÉGRATION

1. **`00_README_AKHY_M00.md`** *(Ce fichier)* : Vue d'ensemble, architecture et périmètre.
2. **`01_API_CONTRACTS_AND_PAYLOADS.md`** : Spécification chirurgicale de tous les endpoints consommés par Dev 2 (Store Builder, Abonnements, Sponsors, Dashboard 360, KYC, Commandes Vendeur).
3. **`02_TYPESCRIPT_INTERFACES.ts`** : Fichier TypeScript strict complet sans aucun `any`, prêt à copier dans ton projet Next.js (`types/api.ts`).
4. **`03_ANTIGRAVITY_RULES_AKHY_M00.md`** : Directives système à injecter dans la section `Customization` de ton IDE Antigravity.
5. **`04_STARTER_PROMPTS_ANTIGRAVITY.md`** : 5 prompts séquentiels prêts à exécuter pour construire le Store Builder, le dashboard 360, la gestion des abonnements, les sponsors et les tests.
