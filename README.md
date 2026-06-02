# 🇫🇷 PrépaCivique 2026

Application de préparation à l'examen civique français — obligatoire depuis le **1er janvier 2026**.

**743 questions d'entraînement** couvrant les 5 thèmes du programme, mode écoute audio, traduction en 11 langues, et système d'activation par code.

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
│   ├── FrenchPractice.jsx    # Module de pratique du français (DILF/DELF/…)
│   └── data/
│       ├── questions.js      # 743 questions civiques (5 thèmes)
│       └── french_questions.js
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
- **Système freemium** — codes d'activation SHA-256, persistance localStorage
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

- Les codes d'activation sont validés côté serveur via Supabase (`activation_codes`)
- Format : `CIVIC-XXXX-XXXX-XXXX`

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
