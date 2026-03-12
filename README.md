# 🇫🇷 PrépaCivique 2026

Application de préparation à l'examen civique français — obligatoire depuis le **1er janvier 2026**.

**736 questions officielles** couvrant les 5 thèmes du programme, mode écoute audio, traduction en 11 langues, et système d'activation par code.

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
│   ├── App.jsx               # Application principale
│   └── data/
│       ├── questions.js      # 736 questions (5 thèmes)
│       └── codes.js          # Hashes SHA-256 des codes d'activation
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
| ⚖️ Principes & Valeurs | 108 |
| 🏛️ Institutions & Politique | 111 |
| 📜 Droits & Devoirs | 91 |
| 🗺️ Histoire, Géo & Culture | 193 |
| 🤝 Vie en Société | 233 |
| **Total** | **736** |

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

1. Ouvrez `src/App.jsx`
2. Modifiez la ligne :
   ```js
   const STRIPE_LINK = "https://buy.stripe.com/VOTRE_LIEN";
   ```

### Gérer les codes d'activation

- Les codes sont dans `/activation-codes.txt` (**ne pas publier ce fichier**)
- Les hashes SHA-256 sont dans `src/data/codes.js` (sûr à publier)
- Envoyez un code par email après chaque paiement
- Format : `CIVIC-XXXX-XXXX-XXXX`

> ⚠️ **Important** : ajoutez `activation-codes.txt` à votre `.gitignore` pour ne pas publier les codes bruts.

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
- **Claude API** (Anthropic) — traduction IA
- **Stripe** — paiement
- **crypto.subtle** — validation des codes côté client (SHA-256)

---

## 📄 Licence

Projet propriétaire — tous droits réservés.
