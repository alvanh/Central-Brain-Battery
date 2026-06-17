# Dashboard Modifications — Session Claude

**Date** : 2026-06-16  
**Branche** : `claude/dashboard-modifications-m7zlid` → merged to `main`

## Demande initiale

Modifier le Dashboard pour afficher :
- **Heure estimée (ETA)** quand une batterie se charge/décharge
- Basé sur la vitesse de charge/décharge actuelle

## Étapes réalisées

### 1. Exploration du projet
- Structure : vanilla HTML/CSS/JS (pas de framework)
- Backend : Netlify functions + GitHub API
- Batteries Marstek Venus E : 5,12 kWh chacune
- Champs disponibles : `soc`, `powerW`, `direction`, `temp`

### 2. Prévisualisation mockup
Trois versions explorées :
1. **ETA + Température + Conso maison** (final)
2. Conseil Tempo contextuel (rejeté)
3. Alerte Shelly température (en attente)

### 3. Implémentations déployées

#### A. ETA batterie (Heure estimée)
```javascript
// Sur les cartes batterie :
// - EN CHARGE : "Pleine dans 1h14 → 15h00"
// - EN DÉCHARGE : "Vide dans 34min → 13h59"
// - EN ATTENTE : aucune ETA

// Calcul :
// Capacité : 5,12 kWh (Marstek Venus E)
// Cible charge : 100%
// Cible décharge : 12% (SOC minimum réel)
// Durée = (capacité × (socCible - socActuel)) / powerW
```

#### B. Température batterie
```javascript
// Pilule colorée sous chaque carte : "🌡️ 29°C"
// Code couleur :
// - Vert  : < 40°C (normal)
// - Orange : 40–50°C (chaud)
// - Rouge  : > 50°C (critique)

// Source : champ `temp` du JSON energy.json
```

#### C. Consommation maison
```javascript
// 2 nouvelles cartes métriques :

// Conso maison (violet) :
// = Solaire + Réseau + Décharge − Charge
// = 5740W + 1W + 0W − 4883W = 858W

// Charge batteries (vert/rouge) :
// = puissance nette des batteries
// Vert si en charge, rouge si en décharge
```

## Fichiers modifiés

### `index.html`
- **Ligne 514-525** : 2 nouvelles cartes dans la grille métriques
  - `consoMaison` : affichage conso maison
  - `chargeBatteries` : puissance nette batteries
  
- **Ligne 1128-1142** : calcul conso maison
  ```javascript
  const totalChargeW    = batteries en CHARGING
  const totalDischargeW = batteries en DISCHARGING
  const consoW = Solaire + Réseau + Décharge − Charge
  ```

- **Ligne 860-870** : affichage température batterie
  ```javascript
  // Pilule conditionnelle si b.temp existe
  // Code couleur selon plage <40°C / 40-50°C / >50°C
  ```

## Déploiement

```bash
# Commit
git commit -m "feat: température batterie + consommation maison en temps réel"

# Push vers branche de travail
git push -u origin claude/dashboard-modifications-m7zlid

# Merge vers main (production)
git checkout main
git pull origin main
git merge claude/dashboard-modifications-m7zlid
git push origin main
```

**Status** : ✅ Déployé sur `main` — accessible via Tailscale sur Mac Mini

## Pour rafraîchir localement

```bash
cd ~/Central-Brain-Battery
git pull origin main

# Puis rechargez le navigateur (Cmd+Shift+R sur Mac)
```

## Points techniques

- **ETA** : rendu uniquement si `direction !== 'IDLE'`
- **Température** : rendu uniquement si `temp` existe dans les données
- **Conso maison** : calcul temps réel, met à jour toutes les 3 secondes avec `smartPoll()`
- **Pas de breaking changes** : compatibilité totale avec ancien format JSON

## Prochaines idées

- ✅ Température batterie
- ✅ Consommation maison
- ⏳ Conseil Tempo automatique (croisant couleur + état batteries)
- ⏳ Flux d'énergie visuel (diagramme animé)
- ⏳ ETA globale (toutes batteries pleines)

---

**Session Claude** : https://claude.ai/code/session_01QkYtSJ8wZr8wxmk2KXhWxJ
