# Central Brain Battery Live V39

Cette version ajoute un vrai pont Netlify :
- HomeyScript envoie le JSON vers Netlify
- Netlify stocke la dernière valeur
- le dashboard lit cette dernière valeur

Fichiers importants :
- index.html
- netlify/functions/energy.js
- homey-push-netlify-v39.js
- package.json
- netlify.toml

Étapes :
1. Déployer ce dossier sur Netlify via GitHub, pas seulement en drag & drop statique.
2. Copier l’URL de ton site Netlify.
3. Dans homey-push-netlify-v39.js, remplacer :
   https://TON-SITE.netlify.app/.netlify/functions/energy
4. Lancer le script dans HomeyScript.
5. Créer un Flow Homey qui lance ce script toutes les 1 à 5 minutes.
