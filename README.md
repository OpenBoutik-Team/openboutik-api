# 🛍️ OpenBoutik API — Core Backend & Logique Séquestre

> **Plateforme E-commerce & Marketplace multi-vendeurs avec Séquestre Financier Garanti, Négociation en temps réel (« Wakhale »), Live Shopping et Paiement Fractionné (BNPL 3x/4x).**

[![NestJS](https://img.shields.io/badge/Framework-NestJS%2011-ea2845?style=flat-square&logo=nestjs)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma%207-2d3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/Database-MySQL%208-4479a1?style=flat-square&logo=mysql)](https://mysql.com/)
[![Render](https://img.shields.io/badge/Deploy-Render%20Cloud-46e3b7?style=flat-square&logo=render)](https://render.com/)
[![Clever Cloud](https://img.shields.io/badge/Cloud_DB-Clever%20Cloud-2e86de?style=flat-square)](https://www.clever-cloud.com/)
[![Security](https://img.shields.io/badge/Security-OWASP%20Pentested-success?style=flat-square)](#audit--sécurité)

---

## 👥 Équipe d'Ingénierie OpenBoutik

| Rôle | Développeur | GitHub | Périmètre |
| :--- | :--- | :--- | :--- |
| **Lead Backend Engineer (Dev 3)** | **Bécaye Doumbouya** | [@HYPNOTYZEDCHART](https://github.com/HYPNOTYZEDCHART) | Core API, Séquestre, Wakhale, Live Shopping, BNPL, DB |
| **Lead Frontend Marketplace (Dev 1)** | **El hadji Mor** | [@akhy-m00](https://github.com/akhy-m00) | Web Marketplace Client (Port 3000), Catalogue, Tunnel Achat |
| **Lead Frontend Seller (Dev 2)** | **Mansour** | [@mansss7](https://github.com/mansss7) | Espace Marchand & Backoffice (Port 3001), Analytics, Gestion |

---

## 🚀 Fonctionnalités Clés du Moteur Backend

### 1. 🛡️ Séquestre Financier Automatisé (Escrow Engine)
- Verrouillage automatique des fonds lors du paiement client (Wave & Orange Money).
- Rapprochement webhook sécurisé avec validation HMAC et idempotence stricte.
- Déblocage automatique des gains sur le portefeuille marchand uniquement après confirmation de livraison ou délai de grâce.

### 2. 🤝 Le « Wakhale » Numérique (Négociation de Prix)
- Workflow complet de négociation bilatérale asynchrone (Acheteur ↔ Vendeur).
- Gestion des statuts : `PROPOSED`, `ACCEPTED`, `REJECTED`, `COUNTERED`, `EXPIRED`.
- Génération atomique d'un code promo privé à usage unique (remise exclusive) dès acceptation.

### 3. 📹 Live Shopping & Flux Vidéo Courts
- Gestion des sessions live et vidéos au format court (TikTok/Reels-style).
- WebSocket Gateway temps réel sur le namespace dédié `/streams`.
- Épinglage flash de produits en direct avec pop-up interactive pour achat instantané.

### 4. 💳 Paiement Fractionné BNPL (Buy Now Pay Later)
- Échéanciers 3x et 4x calculés à l'entier strict (zéro perte de centimes FCFA).
- Garde-fou KYC Acheteur obligatoire (validation CNI/Passeport).
- Cron quotidien automatisé (`@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)`) pour le suivi des retards de paiement et pénalités.

---

## 🛠️ Stack Technique

- **Langage / Framework :** TypeScript, [NestJS](https://nestjs.com/) v11
- **Base de données :** MySQL 8 (Hébergé sur Clever Cloud & Docker local)
- **ORM :** [Prisma ORM](https://www.prisma.io/) v7 avec Driver Adapter MySQL2
- **Temps Réel :** Socket.io (Gateways `/chat` et `/streams`)
- **Tâches d'arrière-plan :** `@nestjs/schedule` (Crons quotidiens automatisés)
- **Sécurité :** Throttling / Rate-limiting, Helmet, CORS strict, Guards RBAC, BOLA/IDOR protection.

---

## 📦 Installation & Démarrage

```bash
# 1. Cloner le dépôt
git clone https://github.com/OpenBoutik-Team/openboutik-api.git
cd openboutik-api

# 2. Installer les dépendances
npm install

# 3. Générer le client Prisma
npm run prisma:generate

# 4. Lancer en mode développement
npm run start:dev
```

---

## 🧪 Tests & Assurance Qualité

Le projet dispose d'une suite exhaustive de tests automatisés :

```bash
# Tests unitaires & services
npm run test

# Tests d'intégration End-to-End (E2E)
npm run test:e2e

# Tests de stress et de concurrence sous forte charge
npm run test:stress

# Tests de résilience & Chaos Monkey
npm run test:chaos

# Audit Pentest & Sécurité OWASP
npm run test:pentest
```

---

## 📄 Licence

Ce projet est sous licence propriétaire © **OpenBoutik Team**. Tous droits réservés.
