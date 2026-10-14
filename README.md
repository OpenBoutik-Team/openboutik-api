# openboutik-api
API Backend &amp; Logique Séquestre OpenBoutik (NestJS, Prisma, MySQL)
# 🛡️ OpenBoutik — API Backend & Moteur de Séquestre (`openboutik-api`)

👤 **Développeur Responsable :** Pôle Backend, Base de données, Sécurité & Paiements (@HYPNOTYZEDCHART)  
🛠 **Stack Technique :** NestJS + Prisma ORM + MySQL + JWT  
🌿 **Branche de travail par défaut :** `develop`

---

## 🎯 Missions sur ce dépôt
Ce dépôt contient le cœur logique et financier d'OpenBoutik :
1. **Base de données (MySQL & Prisma) :** Schéma relationnel (`Users`, `Shops`, `Products`, `Orders`, `EscrowTransactions`, `Disputes`, `Subscriptions`).
2. **Authentification & Sécurité (RBAC) :** Gestion JWT et contrôle strict des rôles (`CLIENT`, `VENDOR`, `SUPER_ADMIN`).
3. **API REST :** Endpoints pour alimenter `openboutik-marketplace` et `openboutik-seller`.
4. **Moteur de Séquestre (Escrow) :** Blocage des paiements Wave/Orange Money (`HELD_IN_ESCROW`), calcul des commissions (3-5 %) et libération des fonds après confirmation de livraison.
