# 🎮 IsoQuest Engine

Un moteur de jeu RPG isométrique léger basé sur XML et JavaScript vanilla. Créez des jeux RPG isométriques sans écrire de code - définissez simplement votre monde dans des fichiers XML !

![Version](https://img.shields.io/badge/version-4.1-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**🌍 [English Version](README.EN.md)**

## ✨ Fonctionnalités

### 🎯 Core Features
- **Rendu isométrique** avec tuiles pré-rendues
- **Pathfinding A*** automatique pour la navigation
- **Système de scènes** avec transitions fluides
- **Animations directionnelles** (8 directions : N, NE, E, SE, S, SW, W, NW)
- **IA pour les mobs** (passif, agressif, errance, aggro)
- **Persistance locale** via localStorage

### 🎨 Gameplay
- **Système d'inventaire complet** avec stacking automatique
- **Conditions d'interaction** complexes (items, variables, logique AND/OR)
- **HUD personnalisable** avec textes dynamiques et boutons
- **Variables globales** pour le suivi de la progression
- **Interactions contextuelles** (clic droit pour menu d'actions)

### 🛠️ Configuration
- **100% XML** - pas de code JavaScript requis pour créer un jeu
- **Assets modulaires** (sprites, cubes 3D, placeholders)
- **Scènes multiples** avec chargement externe
- **Debug mode** intégré

## 📦 Installation

### Prérequis
- Un navigateur web moderne (Chrome, Firefox, Edge)
- Un serveur local pour servir les fichiers (voir ci-dessous)

### Quick Start

1. **Clonez ou téléchargez** le projet

2. **Lancez un serveur local** (requis pour charger les fichiers XML) :

```bash
# Avec Python 3
python -m http.server 8000

# Avec Node.js (http-server)
npx http-server

# Avec PHP
php -S localhost:8000
```

3. **Ouvrez votre navigateur** et accédez à :
```
http://localhost:8000
```

4. **C'est parti !** Le jeu devrait se charger automatiquement.

## 🗂️ Structure du projet

```
IsoQuest Engine/
├── index.html                      # Point d'entrée HTML
├── isoquest.lib.js                 # Moteur principal
├── isoquest.css                    # Styles (optionnel)
├── game.xml                        # Configuration globale du jeu
│
├── scenes/                         # Scènes du jeu
│   ├── level1.xml
│   └── level2.xml
│
├── assets/                         # Ressources visuelles
│   ├── hero/                       # Sprites du héros
│   │   ├── idle/                   # Sprites statiques (8 directions)
│   │   │   ├── north.png
│   │   │   ├── north-east.png
│   │   │   └── ...
│   │   └── walk/                   # Animations de marche
│   │       ├── north/
│   │       │   ├── frame_000.png
│   │       │   ├── frame_001.png
│   │       │   ├── frame_002.png
│   │       │   └── frame_003.png
│   │       └── ...
│   │
│   ├── decor/                      # Tuiles et décors
│   └── objects/                    # Objets interactifs
│
├── README.md                       # Ce fichier
├── INVENTORY_CONDITIONS_GUIDE.md   # Guide détaillé des fonctionnalités
└── .gitignore                      # Fichiers à ignorer par Git
```

## 🎓 Guide d'utilisation

### Configuration de base (game.xml)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Game title="Mon Jeu" width="10" height="10" tileW="64" tileH="32">

    <!-- Définition des assets globaux -->
    <Assets>
        <Asset id="ground" type="sprite" src="assets/decor/grass.png" />
        <Asset id="hero_asset" type="cube3d" placeholder="#3498db" height="40" />
        <Asset id="treasure" type="sprite" src="assets/objects/chest.png" />
    </Assets>

    <!-- Variables globales -->
    <Globals>
        <Var name="gold" value="0" />
        <Var name="playerLevel" value="1" />
    </Globals>

    <!-- Scènes -->
    <Scene id="menu" type="ui" background="#000">
        <UI>
            <Text content="MON JEU" top="20%" left="50%" center="true"
                  size="50px" color="#FFD700" />
            <Button content="JOUER" top="50%" left="50%" center="true"
                    action="loadScene:level1" />
        </UI>
    </Scene>

    <Scene id="level1" src="scenes/level1.xml" />
</Game>
```

### Création d'une scène (scenes/level1.xml)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Scene id="level1" type="game" width="15" height="15" background="ground" east="level2">

    <!-- HUD -->
    <HUD>
        <Text content="Or: {gold}" top="10" left="10" color="#FFD700" />
        <Text content="Inventaire: {inventory}" top="40" left="10" color="#AAA" />
    </HUD>

    <Objects>
        <!-- Joueur -->
        <Player x="2" y="2" asset="hero" speed="4">
            <Attachments>
                <Text content="Lvl {playerLevel}" color="#FFF" offset-y="-50" />
            </Attachments>
        </Player>

        <!-- Coffre avec item -->
        <Object x="5" y="5" asset="treasure" collision="true">
            <Interaction action="addItem:key:1" />
            <Attachments>
                <Text content="Clé" color="#FFD700" offset-y="-80" />
            </Attachments>
        </Object>

        <!-- Porte nécessitant une clé -->
        <Object x="8" y="5" asset="door" collision="true">
            <Interaction action="loadScene:level2" failMessage="Porte verrouillée">
                <Condition type="hasItem" item="key" quantity="1" />
            </Interaction>
        </Object>

        <!-- Mob passif -->
        <Mob x="10" y="10" asset="slime" speed="2" behavior="passive" wander-radius="3">
            <Attachments>
                <Text content="Slime" color="#afa" offset-y="-40" />
            </Attachments>
        </Mob>

        <!-- Spawner de mobs agressifs -->
        <Spawner asset="goblin" count="3" speed="3"
                 behavior="aggressive" aggro-radius="2" wander-radius="5" />
    </Objects>
</Scene>
```

## 🎮 Contrôles

### Souris
- **Clic gauche** : Déplacer le joueur
- **Clic droit** : Ouvrir le menu contextuel (interagir, infos)
- **Bords de carte** : Cliquer sur un bord pour changer de scène (si configuré)

### Clavier
- **Flèches directionnelles** : Déplacer le joueur

## 📚 Systèmes avancés

### 🎒 Système d'inventaire

```xml
<!-- Ajouter un item -->
<Interaction action="addItem:potion:5" />

<!-- Retirer un item -->
<Interaction action="removeItem:key:1" />

<!-- Afficher l'inventaire dans le HUD -->
<Text content="Inventaire: {inventory}" />

<!-- Afficher la quantité d'un item spécifique -->
<Text content="Potions: {item:potion}" />
```

### 🔒 Conditions d'interaction

#### Conditions simples
```xml
<!-- Avoir un item -->
<Condition type="hasItem" item="key" quantity="1" />

<!-- Variable supérieure à -->
<Condition type="varGreaterThan" var="playerLevel" value="5" />

<!-- Variable égale à -->
<Condition type="varEquals" var="quest1" value="completed" />
```

#### Conditions composées
```xml
<!-- ET logique (toutes les conditions) -->
<Condition type="and">
    <Condition type="hasItem" item="key" />
    <Condition type="varGreaterThan" var="playerLevel" value="10" />
</Condition>

<!-- OU logique (au moins une condition) -->
<Condition type="or">
    <Condition type="hasItem" item="goldKey" />
    <Condition type="hasItem" item="masterKey" />
</Condition>
```

### 🎭 Animations directionnelles

Organisez vos sprites dans cette structure :
```
assets/hero/
├── idle/
│   ├── north.png
│   ├── north-east.png
│   ├── east.png
│   ├── south-east.png
│   ├── south.png
│   ├── south-west.png
│   ├── west.png
│   └── north-west.png
└── walk/
    ├── north/
    │   ├── frame_000.png
    │   ├── frame_001.png
    │   ├── frame_002.png
    │   └── frame_003.png
    └── ... (même structure pour les 8 directions)
```

Puis dans le XML :
```xml
<Player x="2" y="2" asset="hero" speed="4" asset-base-path="assets/hero" />
```

### 🗺️ Transitions entre scènes

```xml
<!-- Dans level1.xml -->
<Scene id="level1" type="game" east="level2" west="level0">
    <!-- Le joueur peut maintenant cliquer sur les bords est/ouest -->
</Scene>
```

Directions disponibles : `north`, `south`, `east`, `west`

### 🤖 IA des mobs

```xml
<!-- Mob passif (se promène) -->
<Mob behavior="passive" wander-radius="3" />

<!-- Mob agressif (attaque si proche) -->
<Mob behavior="aggressive" aggro-radius="2" wander-radius="5" />
```

## 🎨 Types d'assets

### Sprite
```xml
<Asset id="chest" type="sprite" src="assets/objects/chest.png" />
```

### Cube 3D (placeholder)
```xml
<Asset id="hero_asset" type="cube3d" placeholder="#3498db" height="40" />
```

### Avec placeholder de secours
```xml
<Asset id="tree" type="sprite" src="assets/tree.png" placeholder="#27ae60" />
```

## 🔧 Actions disponibles

| Action | Syntaxe | Description |
|--------|---------|-------------|
| Charger scène | `loadScene:sceneId` | Change de scène |
| Ajouter variable | `addVar:varName:value` | Ajoute à une variable |
| Définir variable | `setVar:varName:value` | Définit une variable |
| Ajouter item | `addItem:itemId:quantity` | Ajoute au inventaire |
| Retirer item | `removeItem:itemId:quantity` | Retire de l'inventaire |
| Utiliser item | `useItem:itemId` | Utilise un item |
| Alerte | `alert:message` | Affiche une alerte |
| Log | `log:message` | Log dans la console |

## 📖 Documentation complète

Pour plus de détails sur les systèmes d'inventaire et de conditions, consultez :
- **[INVENTORY_CONDITIONS_GUIDE.md](INVENTORY_CONDITIONS_GUIDE.md)** - Guide détaillé avec exemples

## 🐛 Debug Mode

Activez le mode debug dans `index.html` :

```javascript
const game = new IsoEngine('game-container', 'game.xml', true); // true = debug mode
```

Le mode debug affiche :
- Console de log dans l'interface
- Chemins de pathfinding
- Informations de collision
- Messages système détaillés

## 💾 Sauvegarde automatique

Le moteur sauvegarde automatiquement dans le localStorage du navigateur :
- `ISO_GLOBALS` : Variables globales
- `ISO_INVENTORY` : Inventaire du joueur
- `ISO_SCENE_[id]` : État des objets par scène

Pour effacer la sauvegarde :
```javascript
localStorage.clear();
```

## 🎯 Exemples de projets

Le projet inclut deux niveaux de démonstration :
- **level1.xml** : Démontre l'inventaire, les conditions, et les interactions
- **level2.xml** : Exemple de transition entre scènes

## ⚙️ Configuration avancée

### Taille des tuiles
```xml
<Game tileW="64" tileH="32">
```
- `tileW` : Largeur d'une tuile isométrique
- `tileH` : Hauteur d'une tuile isométrique

### Vitesse des entités
```xml
<Player speed="4" />  <!-- Plus le nombre est élevé, plus c'est rapide -->
```

### Input mode
Par défaut, le moteur accepte clavier ET souris. Modifiable dans le code :
```javascript
this.inputMode = "both"; // "mouse", "keyboard", ou "both"
```

## 🚀 Performance

- Les sprites directionnels sont chargés de manière asynchrone
- Le pathfinding utilise un algorithme A* optimisé
- Les scènes sont mises en cache après le premier chargement
- Le rendu utilise Canvas 2D natif (pas de WebGL requis)

## 🤝 Contribution

Ce projet est ouvert aux contributions ! N'hésitez pas à :
- Signaler des bugs
- Proposer des fonctionnalités
- Soumettre des pull requests
- Partager vos créations

## 📝 License

MIT License - Libre d'utilisation pour projets personnels et commerciaux.

## 🎓 Tutoriels

### Créer votre premier niveau

1. **Créez un fichier XML** dans `scenes/mylevel.xml`
2. **Définissez la structure** :
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Scene id="mylevel" type="game" width="10" height="10" background="ground">
    <HUD>
        <Text content="Mon Niveau" top="10" left="10" color="#FFF" />
    </HUD>
    <Objects>
        <Player x="5" y="5" asset="hero" speed="4" />
    </Objects>
</Scene>
```
3. **Ajoutez la référence** dans `game.xml` :
```xml
<Scene id="mylevel" src="scenes/mylevel.xml" />
```
4. **Rechargez le jeu** et utilisez `loadScene:mylevel` pour y accéder

### Créer une quête simple

```xml
<!-- Objet qui démarre la quête -->
<Object x="3" y="3" asset="npc" collision="true">
    <Interaction action="setVar:quest1:started" />
    <Attachments>
        <Text content="PNJ" color="#FFF" offset-y="-60" />
    </Attachments>
</Object>

<!-- Objet de quête (visible seulement si quête démarrée) -->
<Object x="8" y="8" asset="item" collision="true">
    <Interaction action="addItem:questItem:1">
        <Condition type="varEquals" var="quest1" value="started" />
    </Interaction>
</Object>

<!-- Objet pour terminer la quête -->
<Object x="3" y="3" asset="npc" collision="true">
    <Interaction action="addVar:gold:100" failMessage="Vous n'avez pas l'objet">
        <Condition type="and">
            <Condition type="varEquals" var="quest1" value="started" />
            <Condition type="hasItem" item="questItem" quantity="1" />
        </Condition>
    </Interaction>
</Object>
```

## ❓ FAQ

**Q : Pourquoi le jeu ne charge pas ?**
R : Assurez-vous d'utiliser un serveur local. Les fichiers XML ne peuvent pas être chargés directement depuis `file://` pour des raisons de sécurité.

**Q : Mes sprites ne s'affichent pas ?**
R : Vérifiez les chemins dans les attributs `src` et assurez-vous que les images existent.

**Q : Comment réinitialiser la sauvegarde ?**
R : Ouvrez la console du navigateur et tapez `localStorage.clear()` puis rechargez la page.

**Q : Puis-je utiliser ce moteur pour un projet commercial ?**
R : Oui ! La licence MIT vous permet d'utiliser ce moteur comme bon vous semble.

**Q : Le moteur supporte-t-il le multijoueur ?**
R : Non, actuellement c'est un moteur solo uniquement.

## 🔗 Ressources

- [MDN Canvas Tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial)
- [Isometric Game Design](https://en.wikipedia.org/wiki/Isometric_video_game_graphics)
- [A* Pathfinding Explained](https://www.redblobgames.com/pathfinding/a-star/introduction.html)

---

**Créé avec ❤️ pour la communauté du game dev**

*Bon développement ! 🎮*
