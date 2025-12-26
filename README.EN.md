# 🎮 IsoQuest Engine

A lightweight isometric RPG game engine based on XML and vanilla JavaScript. Create isometric RPG games without writing code - just define your world in XML files!

![Version](https://img.shields.io/badge/version-4.1-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**🌍 [Version Française](README.md)**

## ✨ Features

### 🎯 Core Features
- **Isometric rendering** with pre-rendered tiles
- **A* pathfinding** automatic navigation
- **Scene system** with smooth transitions
- **Directional animations** (8 directions: N, NE, E, SE, S, SW, W, NW)
- **Mob AI** (passive, aggressive, wander, aggro)
- **Local persistence** via localStorage

### 🎨 Gameplay
- **Complete inventory system** with automatic stacking
- **Interaction conditions** complex (items, variables, AND/OR logic)
- **Customizable HUD** with dynamic texts and buttons
- **Global variables** for progression tracking
- **Contextual interactions** (right-click for action menu)

### 🛠️ Configuration
- **100% XML** - no JavaScript code required to create a game
- **Modular assets** (sprites, 3D cubes, placeholders)
- **Multiple scenes** with external loading
- **Integrated debug mode**

## 📦 Installation

### Prerequisites
- A modern web browser (Chrome, Firefox, Edge)
- A local server to serve files (see below)

### Quick Start

1. **Clone or download** the project

2. **Launch a local server** (required to load XML files):

```bash
# With Python 3
python -m http.server 8000

# With Node.js (http-server)
npx http-server

# With PHP
php -S localhost:8000
```

3. **Open your browser** and navigate to:
```
http://localhost:8000
```

4. **You're ready!** The game should load automatically.

## 🗂️ Project Structure

```
IsoQuest Engine/
├── index.html                      # HTML entry point
├── isoquest.lib.js                 # Main engine
├── isoquest.css                    # Styles (optional)
├── game.xml                        # Global game configuration
│
├── scenes/                         # Game scenes
│   ├── level1.xml
│   └── level2.xml
│
├── assets/                         # Visual resources
│   ├── hero/                       # Hero sprites
│   │   ├── idle/                   # Static sprites (8 directions)
│   │   │   ├── north.png
│   │   │   ├── north-east.png
│   │   │   └── ...
│   │   └── walk/                   # Walk animations
│   │       ├── north/
│   │       │   ├── frame_000.png
│   │       │   ├── frame_001.png
│   │       │   ├── frame_002.png
│   │       │   └── frame_003.png
│   │       └── ...
│   │
│   ├── decor/                      # Tiles and decorations
│   └── objects/                    # Interactive objects
│
├── README.md                       # French documentation
├── README.EN.md                    # This file
├── INVENTORY_CONDITIONS_GUIDE.md   # Detailed feature guide (French)
└── .gitignore                      # Files to ignore by Git
```

## 🎓 Usage Guide

### Basic Configuration (game.xml)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Game title="My Game" width="10" height="10" tileW="64" tileH="32">

    <!-- Global assets definition -->
    <Assets>
        <Asset id="ground" type="sprite" src="assets/decor/grass.png" />
        <Asset id="hero_asset" type="cube3d" placeholder="#3498db" height="40" />
        <Asset id="treasure" type="sprite" src="assets/objects/chest.png" />
    </Assets>

    <!-- Global variables -->
    <Globals>
        <Var name="gold" value="0" />
        <Var name="playerLevel" value="1" />
    </Globals>

    <!-- Scenes -->
    <Scene id="menu" type="ui" background="#000">
        <UI>
            <Text content="MY GAME" top="20%" left="50%" center="true"
                  size="50px" color="#FFD700" />
            <Button content="PLAY" top="50%" left="50%" center="true"
                    action="loadScene:level1" />
        </UI>
    </Scene>

    <Scene id="level1" src="scenes/level1.xml" />
</Game>
```

### Creating a Scene (scenes/level1.xml)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Scene id="level1" type="game" width="15" height="15" background="ground" east="level2">

    <!-- HUD -->
    <HUD>
        <Text content="Gold: {gold}" top="10" left="10" color="#FFD700" />
        <Text content="Inventory: {inventory}" top="40" left="10" color="#AAA" />
    </HUD>

    <Objects>
        <!-- Player -->
        <Player x="2" y="2" asset="hero" speed="4">
            <Attachments>
                <Text content="Lvl {playerLevel}" color="#FFF" offset-y="-50" />
            </Attachments>
        </Player>

        <!-- Chest with item -->
        <Object x="5" y="5" asset="treasure" collision="true">
            <Interaction action="addItem:key:1" />
            <Attachments>
                <Text content="Key" color="#FFD700" offset-y="-80" />
            </Attachments>
        </Object>

        <!-- Door requiring a key -->
        <Object x="8" y="5" asset="door" collision="true">
            <Interaction action="loadScene:level2" failMessage="Door locked">
                <Condition type="hasItem" item="key" quantity="1" />
            </Interaction>
        </Object>

        <!-- Passive mob -->
        <Mob x="10" y="10" asset="slime" speed="2" behavior="passive" wander-radius="3">
            <Attachments>
                <Text content="Slime" color="#afa" offset-y="-40" />
            </Attachments>
        </Mob>

        <!-- Aggressive mob spawner -->
        <Spawner asset="goblin" count="3" speed="3"
                 behavior="aggressive" aggro-radius="2" wander-radius="5" />
    </Objects>
</Scene>
```

## 🎮 Controls

### Mouse
- **Left click**: Move player
- **Right click**: Open contextual menu (interact, info)
- **Map borders**: Click on a border to change scene (if configured)

### Keyboard
- **Arrow keys**: Move player

## 📚 Advanced Systems

### 🎒 Inventory System

```xml
<!-- Add an item -->
<Interaction action="addItem:potion:5" />

<!-- Remove an item -->
<Interaction action="removeItem:key:1" />

<!-- Display inventory in HUD -->
<Text content="Inventory: {inventory}" />

<!-- Display specific item quantity -->
<Text content="Potions: {item:potion}" />
```

### 🔒 Interaction Conditions

#### Simple Conditions
```xml
<!-- Has item -->
<Condition type="hasItem" item="key" quantity="1" />

<!-- Variable greater than -->
<Condition type="varGreaterThan" var="playerLevel" value="5" />

<!-- Variable equals -->
<Condition type="varEquals" var="quest1" value="completed" />
```

#### Composite Conditions
```xml
<!-- AND logic (all conditions) -->
<Condition type="and">
    <Condition type="hasItem" item="key" />
    <Condition type="varGreaterThan" var="playerLevel" value="10" />
</Condition>

<!-- OR logic (at least one condition) -->
<Condition type="or">
    <Condition type="hasItem" item="goldKey" />
    <Condition type="hasItem" item="masterKey" />
</Condition>
```

### 🎭 Directional Animations

Organize your sprites in this structure:
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
    └── ... (same structure for all 8 directions)
```

Then in XML:
```xml
<Player x="2" y="2" asset="hero" speed="4" asset-base-path="assets/hero" />
```

### 🗺️ Scene Transitions

```xml
<!-- In level1.xml -->
<Scene id="level1" type="game" east="level2" west="level0">
    <!-- Player can now click on east/west borders -->
</Scene>
```

Available directions: `north`, `south`, `east`, `west`

### 🤖 Mob AI

```xml
<!-- Passive mob (wanders) -->
<Mob behavior="passive" wander-radius="3" />

<!-- Aggressive mob (attacks when close) -->
<Mob behavior="aggressive" aggro-radius="2" wander-radius="5" />
```

## 🎨 Asset Types

### Sprite
```xml
<Asset id="chest" type="sprite" src="assets/objects/chest.png" />
```

### 3D Cube (placeholder)
```xml
<Asset id="hero_asset" type="cube3d" placeholder="#3498db" height="40" />
```

### With fallback placeholder
```xml
<Asset id="tree" type="sprite" src="assets/tree.png" placeholder="#27ae60" />
```

## 🔧 Available Actions

| Action | Syntax | Description |
|--------|---------|-------------|
| Load scene | `loadScene:sceneId` | Change scene |
| Add variable | `addVar:varName:value` | Add to a variable |
| Set variable | `setVar:varName:value` | Set a variable |
| Add item | `addItem:itemId:quantity` | Add to inventory |
| Remove item | `removeItem:itemId:quantity` | Remove from inventory |
| Use item | `useItem:itemId` | Use an item |
| Alert | `alert:message` | Show an alert |
| Log | `log:message` | Log to console |

## 📖 Full Documentation

For more details on inventory and condition systems, see:
- **[INVENTORY_CONDITIONS_GUIDE.md](INVENTORY_CONDITIONS_GUIDE.md)** - Detailed guide with examples (French)

## 🐛 Debug Mode

Enable debug mode in `index.html`:

```javascript
const game = new IsoEngine('game-container', 'game.xml', true); // true = debug mode
```

Debug mode displays:
- Log console in the interface
- Pathfinding paths
- Collision information
- Detailed system messages

## 💾 Automatic Save

The engine automatically saves to browser localStorage:
- `ISO_GLOBALS`: Global variables
- `ISO_INVENTORY`: Player inventory
- `ISO_SCENE_[id]`: Object state per scene

To clear save data:
```javascript
localStorage.clear();
```

## 🎯 Example Projects

The project includes two demo levels:
- **level1.xml**: Demonstrates inventory, conditions, and interactions
- **level2.xml**: Example of scene transition

## ⚙️ Advanced Configuration

### Tile Size
```xml
<Game tileW="64" tileH="32">
```
- `tileW`: Isometric tile width
- `tileH`: Isometric tile height

### Entity Speed
```xml
<Player speed="4" />  <!-- Higher number = faster -->
```

### Input Mode
By default, the engine accepts both keyboard AND mouse. Modifiable in code:
```javascript
this.inputMode = "both"; // "mouse", "keyboard", or "both"
```

## 🚀 Performance

- Directional sprites are loaded asynchronously
- Pathfinding uses an optimized A* algorithm
- Scenes are cached after first load
- Rendering uses native Canvas 2D (no WebGL required)

## 🤝 Contributing

This project is open to contributions! Feel free to:
- Report bugs
- Propose features
- Submit pull requests
- Share your creations

## 📝 License

MIT License - Free for personal and commercial projects.

## 🎓 Tutorials

### Create Your First Level

1. **Create an XML file** in `scenes/mylevel.xml`
2. **Define the structure**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Scene id="mylevel" type="game" width="10" height="10" background="ground">
    <HUD>
        <Text content="My Level" top="10" left="10" color="#FFF" />
    </HUD>
    <Objects>
        <Player x="5" y="5" asset="hero" speed="4" />
    </Objects>
</Scene>
```
3. **Add the reference** in `game.xml`:
```xml
<Scene id="mylevel" src="scenes/mylevel.xml" />
```
4. **Reload the game** and use `loadScene:mylevel` to access it

### Create a Simple Quest

```xml
<!-- Object that starts the quest -->
<Object x="3" y="3" asset="npc" collision="true">
    <Interaction action="setVar:quest1:started" />
    <Attachments>
        <Text content="NPC" color="#FFF" offset-y="-60" />
    </Attachments>
</Object>

<!-- Quest object (visible only if quest started) -->
<Object x="8" y="8" asset="item" collision="true">
    <Interaction action="addItem:questItem:1">
        <Condition type="varEquals" var="quest1" value="started" />
    </Interaction>
</Object>

<!-- Object to complete quest -->
<Object x="3" y="3" asset="npc" collision="true">
    <Interaction action="addVar:gold:100" failMessage="You don't have the item">
        <Condition type="and">
            <Condition type="varEquals" var="quest1" value="started" />
            <Condition type="hasItem" item="questItem" quantity="1" />
        </Condition>
    </Interaction>
</Object>
```

## ❓ FAQ

**Q: Why isn't the game loading?**
A: Make sure you're using a local server. XML files cannot be loaded directly from `file://` for security reasons.

**Q: My sprites aren't displaying?**
A: Check the paths in `src` attributes and ensure the images exist.

**Q: How do I reset the save?**
A: Open the browser console and type `localStorage.clear()` then reload the page.

**Q: Can I use this engine for a commercial project?**
A: Yes! The MIT license allows you to use this engine however you wish.

**Q: Does the engine support multiplayer?**
A: No, currently it's a single-player engine only.

## 🔗 Resources

- [MDN Canvas Tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial)
- [Isometric Game Design](https://en.wikipedia.org/wiki/Isometric_video_game_graphics)
- [A* Pathfinding Explained](https://www.redblobgames.com/pathfinding/a-star/introduction.html)

---

**Created with ❤️ for the game dev community**

*Happy developing! 🎮*
