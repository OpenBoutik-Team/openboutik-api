# OPENBOUTIK API — RÈGLES CRITIQUES D'ENGAGEMENT (LEAD ARCHITECT)

1. **Context-First / Zéro Guesswork :** Vérification systématique des fichiers réels avant d'écrire ou de proposer du code (`prisma/schema.prisma`, `src/`, `test/`).
2. **Auto-validation Terminale Stricte :** `npx prisma validate`, `npx tsc --noEmit`, `npm run build`, `npm run lint`, `npm test` / `npm run test:e2e`. Toute erreur doit être résolue avant de rendre la main.
3. **Standards SaaS OpenBoutik :** Strict TypeScript, DTOs `class-validator`, modèles financiers entiers FCFA sans virgule flottante, gestion multi-tenant, 3 plans (FREE 3%, PRO 5 000 FCFA 0%, PREMIUM 15 000 FCFA 0%), Dunning 72h / 6 retries, Store Builder et domaines.
4. **Gouvernance "Pilote & Codeur" :** Phase A (Audit & Plan précis avec attente d'accord sur BDD/Architecture) -> Phase B (Exécution chirurgicale complète).
