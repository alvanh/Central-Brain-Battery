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

---

## Onglet Climatisation

Les splits du rez-de-chaussée sont pilotés par **émetteur infrarouge** : la liaison est
à sens unique, exactement comme une télécommande. Homey sait ce qu'il a envoyé, jamais
ce que fait réellement l'unité. Une commande passée à la télécommande d'origine, une
coupure secteur ou un ordre non reçu restent invisibles.

L'onglet **Clim** est construit autour de cette limite : rien n'y est présenté comme un
état mesuré.

| Affiché | Nature |
|---|---|
| Consigne, mode, vitesse | **dernière commande envoyée** par Homey — jamais un état |
| Heure de la commande + âge | horodatage Homey (`capabilitiesObj[...].lastUpdated`) |
| Température de la pièce | **vraie mesure**, si un capteur existe sur l'appareil ou dans la zone |
| Consommation de l'unité | **vraie mesure**, si l'unité est derrière une prise mesurée |

Deux recoupements automatiques signalent une commande qui n'est probablement pas passée :

- **Consommation maison (Shelly)** — si des unités sont commandées en marche mais que la
  maison reste à sa consommation de base, aucun split ne tourne. Le Shelly mesure toute
  la maison : il dit *qu'une* clim tourne, pas *laquelle*.
- **Dérive pièce / consigne** — pièce à 26 °C pour une consigne de 21 °C en mode froid :
  soit la commande n'est pas passée, soit l'unité vient de démarrer.

### Réglages (en haut du bloc `── CLIMATISATION ──` dans `index.html`)

| Constante | Défaut | Rôle |
|---|---|---|
| `CLIM_BASE_LOAD_W` | 400 W | consommation de base de la maison, hors clim |
| `CLIM_MIN_DRAW_W` | 250 W | puissance minimale d'un split en marche |
| `CLIM_DRIFT_C` | 2 °C | écart pièce/consigne jugé anormal |
| `CLIM_STALE_H` | 12 h | au-delà, la dernière commande ne renseigne plus sur rien |

### Collecte côté Homey

`brain/homey-live-push.js` détecte les unités automatiquement : classe `thermostat` /
`airconditioning`, ou nom contenant « clim », « split », « airco »… Pour figer la
sélection, renseigner `CLIM_DEVICES` avec les IDs exacts en haut du script.

Les unités sont poussées dans `data/energy.json` sous la clé `climatisation`. Tant que le
script n'est pas redéployé dans HomeyScript, l'onglet affiche un état vide explicite.

### Aperçu de la mise en page

`https://<le-site>/?demo=clim` affiche trois unités fictives (bandeau noir « APERÇU »)
pour juger du rendu sans attendre les données Homey.
