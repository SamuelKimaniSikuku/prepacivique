# 🇫🇷 PrépaCivique 2026

Application de préparation à l'examen civique français — obligatoire depuis le **1er janvier 2026**.

**743 questions d'entraînement** couvrant les 5 thèmes du programme, mode écoute audio, traduction en 11 langues, et système d'activation par code.

La banque française a fait l’objet d’une [revue éditoriale le 7 octobre 2026](docs/question-review-2026-10-07.md) : 175 corrections ou précisions, sources consultables et vérification du mélange des réponses. Il s’agit d’une préparation indépendante, pas d’un corrigé officiel du ministère.

---

## 🚀 Démarrage rapide

```bash
# 1. Cloner le dépôt
git clone https://github.com/VOTRE-NOM/prepacivique.git
cd prepacivique

# 2. Installer les dépendances
npm install

# 3. Lancer en développement
npm run dev

# 4. Build de production
npm run build
```

---

## 📁 Structure du projet

```
prepacivique/
├── src/
│   ├── main.jsx              # Point d'entrée React
│   ├── App3.jsx              # Application principale
│   └── data/
│       └── questions.js      # 743 questions civiques (5 thèmes)
├── public/
│   ├── robots.txt
│   ├── sitemap.xml
│   └── og-image.svg          # Image de partage (Open Graph)
├── supabase/
│   └── functions/
│       └── translate/        # Proxy serveur pour la traduction (clé Anthropic côté serveur)
├── index.html
├── package.json
├── vite.config.js
└── .github/
    └── workflows/
        └── deploy.yml        # Déploiement automatique GitHub Pages
```

---

## 📚 Thèmes couverts

| Thème | Questions |
|---|---|
| ⚖️ Principes & Valeurs | 138 |
| 🏛️ Institutions & Politique | 141 |
| 📜 Droits & Devoirs | 122 |
| 🗺️ Histoire, Géo & Culture | 166 |
| 🤝 Vie en Société | 176 |
| **Total** | **743** |

---

## ✨ Fonctionnalités

- **Quiz par thème** — 10 questions d'essai gratuites par thème
- **Mode Écoute** — lecture audio automatique (question + réponse + explication)
- **Traduction IA** — 11 langues via l'API Claude (Premium)
- **Système freemium** — codes d'activation vérifiés côté serveur, persistance localStorage
- **Déploiement automatique** — GitHub Actions → GitHub Pages

---

## 💳 Système de paiement

Le système utilise **Stripe** pour les paiements et des **codes d'activation** pour débloquer l'accès.

### Configurer Stripe

1. Ouvrez `src/App3.jsx`
2. Modifiez la ligne :
   ```js
   const STRIPE_LINK = "https://buy.stripe.com/VOTRE_LIEN";
   ```

### Gérer les codes d'activation

- Les codes sont vérifiés par la fonction Edge `activation`. Le navigateur n'a aucun accès direct à la table `activation_codes` ni aux e-mails des clients.
- Format courant : `CIVIC-XXXX-XXXX-XXXX` ; les anciens codes restent pris en charge.
- `used = true` signifie **attribué**, et non expiré. Un code d'accès à vie reste valide pour retrouver l'accès sur un autre appareil.
- La validation normalise la casse, les espaces et les tirets typographiques. Les erreurs du service ne sont pas présentées comme des codes invalides.

### Attribution après paiement

- `stripe-webhook` vérifie la signature Stripe du corps brut avec le secret existant `STRIPE_WEBHOOK_SECRET`. Sa vérification JWT Supabase doit être désactivée : Stripe n'envoie pas de JWT Supabase.
- Seuls les paiements réels de 5 € en EUR, avec une URL de retour HTTPS sur `prepexamcivique.fr` ou `www.prepexamcivique.fr`, attribuent un code. Les paiements de test, impayés et autres produits sont ignorés.
- `assign_checkout_code` est réservé au rôle serveur. Les notifications répétées renvoient le même code ; les achats simultanés réservent des codes distincts.
- Configurer le retour du Payment Link Stripe sur `https://prepexamcivique.fr/?payment=success&session_id={CHECKOUT_SESSION_ID}`.
- Le navigateur récupère le code avec cette référence de session. Aucune recherche par e-mail n'est autorisée.
- Le code est affiché après paiement et doit être conservé. Ce handler n'envoie pas d'e-mail ; les secrets Resend existants ne sont pas utilisés.
- Événements à livrer au webhook : `checkout.session.completed` et `checkout.session.async_payment_succeeded`.

### Déploiement d'une mise à jour de l'activation

1. Déployer `activation` avec `supabase functions deploy activation --project-ref vnctdsnfxvwvmkxqygaw --use-api`.
2. Publier le frontend, puis appliquer la migration `repair_activation_flow` (elle retire l'accès public à la table).
3. Déployer `stripe-webhook` avec `supabase functions deploy stripe-webhook --project-ref vnctdsnfxvwvmkxqygaw --use-api`.
4. Exécuter `npm test` et `npm run build`. Vérifier l'activation, le retour de paiement et les livraisons Stripe. Ne pas effectuer de paiement réel pour un simple test.

L'application propose uniquement la préparation à l'examen civique (CSP, CR, NAT). Les entraînements aux diplômes et tests de français ont été retirés.

---

## 🌍 Traduction (fonction Edge Supabase)

La traduction des questions passe par la fonction Edge **`translate`**, ce qui garde la clé Anthropic **côté serveur** (jamais incluse dans le bundle navigateur).

```bash
# 1. Définir le secret (clé Anthropic) — une seule fois
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# 2. Déployer la fonction
supabase functions deploy translate
```

Le client appelle `${SUPABASE_URL}/functions/v1/translate` avec la clé anon Supabase.

> ⚠️ **N'utilisez jamais** `VITE_ANTHROPIC_KEY` côté client : toute variable `VITE_*` est intégrée au bundle public et donc extractible.

---

## 🌐 Déploiement sur GitHub Pages

### Méthode automatique (recommandée)

1. Poussez sur la branche `main`
2. Dans GitHub → Settings → Pages → Source → **GitHub Actions**
3. Le workflow `.github/workflows/deploy.yml` se charge du reste

### Configurer la base URL

Si votre repo s'appelle `prepacivique`, modifiez `vite.config.js` :

```js
base: '/prepacivique/',
```

---

## 🛠️ Technologies

- **React 18** + **Vite 5**
- **Web Speech API** — synthèse vocale native (sans coût)
- **Supabase Edge Functions** — proxy de traduction (Claude / Anthropic) côté serveur
- **Stripe** — paiement
- **Supabase** — validation des codes d'activation

---

## 📄 Licence

Projet propriétaire — tous droits réservés.
