<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="220" alt="OpenBoutik Lion Head Logo" />
</p>

<h1 align="center">🦁 OpenBoutik — Moteur E-Commerce & Marketplace Sécurisée</h1>

<p align="center">
  <b>Plateforme E-Commerce multi-vendeurs avec Séquestre Financier Garanti, Négociation en direct (« Wakhale »), Live Shopping temps réel et Paiement Fractionné (BNPL 3x/4x).</b>
</p>

<p align="center">
  <!-- Backend Core Stack -->
  <a href="https://nestjs.com/"><img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://developer.mozilla.org/fr/docs/Web/JavaScript"><img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="NodeJS" /></a>
  <a href="https://www.prisma.io/"><img src="https://img.shields.io/badge/Prisma_ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" /></a>
  <a href="https://www.mysql.com/"><img src="https://img.shields.io/badge/MySQL_8-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL" /></a>
  <a href="https://socket.io/"><img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.io" /></a>
</p>

<p align="center">
  <!-- Frontend Stack (Marketplace & Seller Hub) -->
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" /></a>
  <a href="https://developer.mozilla.org/fr/docs/Web/HTML"><img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" /></a>
  <a href="https://developer.mozilla.org/fr/docs/Web/CSS"><img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" /></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="https://axios-http.com/"><img src="https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white" alt="Axios" /></a>
</p>

<p align="center">
  <!-- Cloud, Deployment & DevOps -->
  <a href="https://vercel.com/"><img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" /></a>
  <a href="https://render.com/"><img src="https://img.shields.io/badge/Render_Cloud-46E3B7?style=for-the-badge&logo=render&logoColor=white" alt="Render" /></a>
  <a href="https://www.clever-cloud.com/"><img src="https://img.shields.io/badge/Clever_Cloud-2E86DE?style=for-the-badge&logoColor=white" alt="Clever Cloud" /></a>
  <a href="https://jestjs.io/"><img src="https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white" alt="Jest" /></a>
  <a href="https://jwt.io/"><img src="https://img.shields.io/badge/JWT_Auth-black?style=for-the-badge&logo=JSON%20web%20tokens" alt="JWT" /></a>
  <a href="https://swagger.io/"><img src="https://img.shields.io/badge/Swagger_OpenAPI-85EA2D?style=for-the-badge&logo=swagger&logoColor=black" alt="Swagger" /></a>
</p>

---

## 👥 Équipe d'Ingénierie OpenBoutik

| Rôle | Développeur | GitHub | Dépôt Assigné & Périmètre |
| :--- | :--- | :--- | :--- |
| **Lead Backend Engineer (Dev 3)** | **Bécaye Doumbouya** | [@HYPNOTYZEDCHART](https://github.com/HYPNOTYZEDCHART) | [`openboutik-api`](https://github.com/OpenBoutik-Team/openboutik-api) — Core Engine, Séquestre, Wakhale, Live Shopping, BNPL, DB |
| **Lead Frontend Marketplace (Dev 1)** | **El hadji Mor** | [@akhy-m00](https://github.com/akhy-m00) | [`openboutik-marketplace`](https://github.com/OpenBoutik-Team/openboutik-marketplace) (Port 3000) — Tunnel Achat, Catalogue, Profil Client |
| **Lead Frontend Seller (Dev 2)** | **Mansour** | [@mansss7](https://github.com/mansss7) | [`openboutik-seller`](https://github.com/OpenBoutik-Team/openboutik-seller) (Port 3001) — Backoffice Marchand, Gestion Stocks, Analytics |

---

## 🏗️ Architecture Globale de l'Écosystème

```mermaid
graph TD
    Client[👤 Acheteur - Marketplace Next.js :3000] -->|REST & WebSockets| API[🦁 OpenBoutik API NestJS :3002]
    Seller[🏪 Vendeur - Backoffice Next.js :3001] -->|REST & WebSockets| API
    
    subgraph Core Engine [Pôle Backend - @HYPNOTYZEDCHART]
        API --> Escrow[🛡️ Séquestre Financier Wave/OM]
        API --> Wakhale[🤝 Négociation Wakhale & Coupons]
        API --> Live[📹 Live Shopping & Pop-up Flash]
        API --> BNPL[💳 Achat Fractionné 3x/4x & KYC]
    end
    
    subgraph Cloud Infrastructure
        API --> DB[(🐬 MySQL 8 - Clever Cloud)]
        API -.-> Host[☁️ Déploiement Cloud Render]
        Client -.-> Vercel1[▲ Vercel Cloud]
        Seller -.-> Vercel2[▲ Vercel Cloud]
    end
```

---

## 🚀 Fonctionnalités Clés du Moteur Backend

### 1. 🛡️ Séquestre Financier Garanti (Escrow Engine)
* Verrouillage automatique des fonds lors du paiement client par Wave ou Orange Money.
* Rapprochement webhook sécurisé avec validation HMAC et idempotence stricte.
* Déblocage des gains sur le portefeuille marchand uniquement après confirmation de livraison ou expiration du délai de grâce.

### 2. 🤝 Le « Wakhale » Numérique (Négociation de Prix)
* Workflow bilatéral asynchrone Acheteur ↔ Vendeur.
* Statuts gérés : `PROPOSED`, `ACCEPTED`, `REJECTED`, `COUNTERED`, `EXPIRED`.
* Génération atomique d'un code promo privé à usage unique (remise exclusive) dès validation de l'accord.

### 3. 📹 Live Shopping & Vidéos Courtes
* Sessions de streaming interactif et flux de vidéos courtes (format Reels/TikTok).
* Gateway WebSockets temps réel sur le namespace dédié `/streams`.
* Épinglage flash de produits en direct avec pop-up d'achat instantané.

### 4. 💳 Paiement Fractionné BNPL (Buy Now Pay Later)
* Échéanciers 3x et 4x calculés à l'entier strict (zéro perte de centimes FCFA).
* Garde-fou KYC Acheteur obligatoire (validation carte d'identité / passeport).
* Cron automatisé quotidien (`@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)`) pour le suivi des impayés et pénalités.

---

## 📦 Installation & Démarrage Rapide

```bash
# 1. Cloner le projet
git clone https://github.com/OpenBoutik-Team/openboutik-api.git
cd openboutik-api

# 2. Installer les dépendances
npm install

# 3. Générer le client Prisma
npm run prisma:generate

# 4. Lancer en local
npm run start:dev
```

---

## 🧪 Tests & Assurance Qualité

```bash
# Tests unitaires
npm run test

# Tests d'intégration End-to-End
npm run test:e2e

# Tests de stress et de concurrence
npm run test:stress

# Tests de résilience Chaos Monkey
npm run test:chaos

# Audit de sécurité & Pentest OWASP
npm run test:pentest
```

---

## 📄 Licence

Ce projet est la propriété exclusive de l'équipe **OpenBoutik**. Tous droits réservés.
