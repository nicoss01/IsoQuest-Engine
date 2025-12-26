/**
 * IsoEngine - Moteur RPG Complet v4.1 (Storage & Stability)
 * Features: LocalStorage (Globals/Scene), Stability Fixes, UI HTML, Pathfinding, AI
 */
class IsoEngine {
    constructor(containerId, gameXmlUrl, debugMode = false) {
        this.container = document.getElementById(containerId);
        if(!this.container) throw new Error("Container introuvable");

        // Styles Container
        this.container.style.position = 'relative';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.overflow = 'hidden';
        this.container.style.backgroundColor = '#111';
        
        // Empêcher le menu contextuel natif
        this.container.addEventListener('contextmenu', e => e.preventDefault());

        // 1. Debug
        this.debugMode = debugMode;
        if (this.debugMode) this.setupDebug();

        this.log("Initialisation IsoEngine v4.1 (Persistence)...", "info");

        // 2. Canvas
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.style.display = 'block';
        this.container.appendChild(this.canvas);

        // 3. UI Layer
        this.uiLayer = document.createElement('div');
        this.uiLayer.id = 'iso-ui-layer';
        this.uiLayer.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:10;';
        this.container.appendChild(this.uiLayer);

        // 4. Context Menu
        this.createContextMenu();

        // 5. Config
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.tileW = 64;
        this.tileH = 32;
        this.offsetX = this.width / 2;
        this.offsetY = 100;

        this.assets = {};
        this.scenes = {};
        this.sceneCache = {};
        this.globals = {}; // Sera écrasé par le localStorage si existant
        this.inventory = []; // Inventaire du joueur
        this.cursors = { default: 'default', hover: 'pointer', move: 'crosshair' };
        
        this.currentScene = null;
        this.player = null;
        this.pendingPlayerSpawn = null; // Pour gérer les transitions entre scènes

        this.keys = {};
        this.mouse = { x: 0, y: 0, gx: -1, gy: -1 };
        this.inputMode = "both";
        this.lastTime = 0;
        this.loopId = null; // ID de la boucle pour l'annuler proprement

        // Directions isométriques (8 directions)
        this.isoDirections = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'];

        // Listeners
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('click', () => this.hideContextMenu());
        this.resize();

        // Démarrage
        this.loadGame(gameXmlUrl);
    }

    // =========================================================
    // 0. LOCAL STORAGE MANAGER
    // =========================================================

    loadStorage() {
        // Charger les variables globales
        const savedGlobals = localStorage.getItem('ISO_GLOBALS');
        if(savedGlobals) {
            this.globals = JSON.parse(savedGlobals);
            this.log("Globales chargées depuis localStorage.", "success");
        }

        // Charger l'inventaire
        const savedInventory = localStorage.getItem('ISO_INVENTORY');
        if(savedInventory) {
            this.inventory = JSON.parse(savedInventory);
            this.log("Inventaire chargé depuis localStorage.", "success");
        }
    }

    saveStorage() {
        // Sauvegarder les variables globales
        localStorage.setItem('ISO_GLOBALS', JSON.stringify(this.globals));
        // Sauvegarder l'inventaire
        localStorage.setItem('ISO_INVENTORY', JSON.stringify(this.inventory));
    }

    saveCurrentSceneState() {
        if(!this.currentScene || this.currentScene.type !== 'game') return;

        // On sauvegarde la position et l'état des objets qui ont un ID
        const sceneState = {};
        this.currentScene.objects.forEach(obj => {
            // On génère une clé unique pour l'objet s'il a un ID (ex: player, mobs nommés)
            // Pour le joueur, on le sauvegarde toujours
            if(obj.type === 'player' || (obj.id)) {
                const key = obj.type === 'player' ? 'player' : obj.id;
                sceneState[key] = {
                    gx: obj.gx,
                    gy: obj.gy,
                    vars: obj.vars || {} // Variables locales futures
                };
            }
        });

        localStorage.setItem(`ISO_SCENE_${this.currentScene.id}`, JSON.stringify(sceneState));
        this.log(`État scène '${this.currentScene.id}' sauvegardé.`);
    }

    getSceneSavedState(sceneId) {
        const data = localStorage.getItem(`ISO_SCENE_${sceneId}`);
        return data ? JSON.parse(data) : null;
    }

    // =========================================================
    // 1. INPUTS & CONTEXT MENU
    // =========================================================

    createContextMenu() {
        this.contextMenu = document.createElement('div');
        this.contextMenu.className = 'iso-context-menu'; 
        // Style inline par défaut pour garantir le fonctionnement sans CSS externe
        this.contextMenu.style.cssText = `
            position: absolute; background: #222; border: 1px solid #444; 
            box-shadow: 2px 2px 5px rgba(0,0,0,0.5); min-width: 120px; z-index: 100;
            font-family: Arial, sans-serif; font-size: 14px; color: #fff; padding: 5px 0; display: none;
        `;
        this.container.appendChild(this.contextMenu);
    }

    showContextMenu(x, y, actions, targetObj = null) {
        this.contextMenu.innerHTML = '';
        actions.forEach(act => {
            const item = document.createElement('div');
            item.innerText = act.label;

            // Style différent si l'action n'est pas disponible
            if(!act.action) {
                item.style.cssText = "padding: 8px 15px; border-bottom:1px solid #333; color:#888; cursor:not-allowed;";
            } else {
                item.style.cssText = "padding: 8px 15px; cursor: pointer; border-bottom:1px solid #333;";
                item.onmouseover = () => item.style.background = "#444";
                item.onmouseout = () => item.style.background = "transparent";
                item.onclick = (e) => {
                    e.stopPropagation();
                    this.executeAction(act.action, targetObj);
                    this.hideContextMenu();
                };
            }

            this.contextMenu.appendChild(item);
        });
        this.contextMenu.style.display = 'block';
        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;
    }

    hideContextMenu() { if(this.contextMenu) this.contextMenu.style.display = 'none'; }

    setupInputs() {
        // Reset old listeners to avoid duplication (simple version: overwrite logic)
        // Note: In strict vanilla without removing listeners properly, we rely on flags.
        
        if(this.inputMode !== 'mouse') {
            window.onkeydown = (e) => {
                if(this.currentScene && this.currentScene.type === 'ui') return;
                if(this.player && !this.player.isMoving && !e.repeat) {
                    this.keys[e.code] = true;
                    this.handleKeyboardMove();
                }
            };
            window.onkeyup = (e) => this.keys[e.code] = false;
        }

        if(this.inputMode !== 'keyboard') {
            this.canvas.onmousemove = (e) => {
                if(this.currentScene && this.currentScene.type === 'ui') return;
                const rect = this.canvas.getBoundingClientRect();
                this.mouse.x = e.clientX - rect.left;
                this.mouse.y = e.clientY - rect.top;
                const isoPos = this.screenToIso(this.mouse.x, this.mouse.y);
                this.mouse.gx = Math.round(isoPos.x);
                this.mouse.gy = Math.round(isoPos.y);
                this.updateCursor();
            };

            this.canvas.onmousedown = (e) => {
                if(!this.currentScene || this.currentScene.type === 'ui') return;

                if(e.button === 0) { // Clic Gauche
                    this.hideContextMenu();

                    if(!this.player) return;

                    // Vérifier si on clique sur un bord avec une scène adjacente
                    const borderDirection = this.getBorderDirection(this.mouse.gx, this.mouse.gy);
                    if(borderDirection) {
                        const adjacentScene = this.currentScene.adjacentScenes[borderDirection];
                        if(adjacentScene) {
                            // Faire marcher le joueur jusqu'au bord cliqué
                            const tx = this.mouse.gx;
                            const ty = this.mouse.gy;
                            const path = this.findPath(Math.round(this.player.gx), Math.round(this.player.gy), tx, ty);
                            if(path.length > 0) {
                                this.player.path = path;
                                this.player.isMoving = false;
                                // Mémoriser la transition à effectuer
                                this.player.pendingSceneTransition = {
                                    targetScene: adjacentScene,
                                    direction: borderDirection
                                };
                            }
                            return;
                        }
                    }

                    const tx = this.mouse.gx;
                    const ty = this.mouse.gy;
                    if(this.isValidTile(tx, ty)) {
                        const path = this.findPath(Math.round(this.player.gx), Math.round(this.player.gy), tx, ty);
                        if(path.length > 0) {
                            this.player.path = path;
                            this.player.isMoving = false;
                        }
                    }
                }
                if(e.button === 2) { // Clic Droit
                    const obj = this.getObjAt(this.mouse.gx, this.mouse.gy);
                    const actions = [];
                    if(obj) {
                        actions.push({ label: `Info: ${obj.type}`, action: `log:Selection ${obj.type}` });
                        if(obj.interaction) {
                            // Vérifier la distance pour afficher un message approprié
                            const distance = this.player ? (Math.abs(Math.round(this.player.gx) - Math.round(obj.gx)) +
                                           Math.abs(Math.round(this.player.gy) - Math.round(obj.gy))) : 999;

                            if(distance <= 1) {
                                // Vérifier les conditions si présentes
                                if(obj.interactionData && obj.interactionData.condition) {
                                    const conditionMet = this.checkCondition(obj.interactionData.condition);
                                    if(conditionMet) {
                                        actions.push({ label: "Interagir", action: obj.interaction });
                                    } else {
                                        actions.push({ label: "Bloqué", action: null });
                                    }
                                } else {
                                    actions.push({ label: "Interagir", action: obj.interaction });
                                }
                            } else {
                                actions.push({ label: "Trop loin", action: null });
                            }
                        }
                    } else {
                        actions.push({ label: "Aller ici", action: `movePlayer:${this.mouse.gx}:${this.mouse.gy}` });
                    }
                    if(actions.length > 0) {
                        const rect = this.canvas.getBoundingClientRect();
                        this.showContextMenu(e.clientX - rect.left, e.clientY - rect.top, actions, obj);
                    }
                }
            };
        }
    }

    handleKeyboardMove() {
        if(!this.player) return;
        let dx = 0, dy = 0;
        if(this.keys['ArrowUp']) dy = -1;
        else if(this.keys['ArrowDown']) dy = 1;
        else if(this.keys['ArrowLeft']) dx = -1;
        else if(this.keys['ArrowRight']) dx = 1;

        if(dx !== 0 || dy !== 0) {
            const tx = Math.round(this.player.gx) + dx;
            const ty = Math.round(this.player.gy) + dy;
            if(this.isValidTile(tx, ty)) {
                this.player.path = [{x: tx, y: ty}];
            }
        }
    }

    updateCursor() {
        if(!this.currentScene || this.currentScene.type !== 'game') {
            this.canvas.style.cursor = 'default';
            return;
        }

        // Vérifier si on est sur un bord avec une scène adjacente
        const borderDirection = this.getBorderDirection(this.mouse.gx, this.mouse.gy);
        if(borderDirection) {
            const adjacentScene = this.currentScene.adjacentScenes[borderDirection];
            if(adjacentScene) {
                this.canvas.style.cursor = 'pointer';
                return;
            } else {
                this.canvas.style.cursor = 'not-allowed';
                return;
            }
        }

        const hoverObj = this.getObjAt(this.mouse.gx, this.mouse.gy);
        if (hoverObj && hoverObj.interaction) this.canvas.style.cursor = this.cursors.hover;
        else if (this.isValidTile(this.mouse.gx, this.mouse.gy)) this.canvas.style.cursor = this.cursors.move;
        else this.canvas.style.cursor = this.cursors.default;
    }

    getBorderDirection(gx, gy) {
        if(!this.currentScene) return null;
        const threshold = 0; // Tolérance pour la détection du bord

        // Nord (y = 0)
        if(gy <= threshold && gx >= 0 && gx < this.currentScene.width) return 'north';
        // Sud (y = height-1)
        if(gy >= this.currentScene.height - 1 - threshold && gx >= 0 && gx < this.currentScene.width) return 'south';
        // Ouest (x = 0)
        if(gx <= threshold && gy >= 0 && gy < this.currentScene.height) return 'west';
        // Est (x = width-1)
        if(gx >= this.currentScene.width - 1 - threshold && gy >= 0 && gy < this.currentScene.height) return 'east';

        return null;
    }

    getDirectionFromMovement(fromX, fromY, toX, toY) {
        const dx = toX - fromX;
        const dy = toY - fromY;

        // Calculer l'angle en radians
        const angle = Math.atan2(dy, dx);

        // Convertir en degrés (0° = est, 90° = sud)
        let degrees = angle * (180 / Math.PI);

        // Normaliser entre 0 et 360
        if(degrees < 0) degrees += 360;

        // Diviser en 8 secteurs (45° chacun)
        // 0° = est, 45° = sud-est, 90° = sud, 135° = sud-ouest, etc.
        const sectorSize = 360 / 8;
        const sector = Math.round(degrees / sectorSize) % 8;

        // Correspondance secteur -> direction isométrique
        const directionMap = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];

        return directionMap[sector];
    }

    // =========================================================
    // 2. LOGIQUE & ACTIONS
    // =========================================================

    executeAction(actionString, targetObj = null) {
        if(!actionString) return;
        const parts = actionString.split(':');
        const cmd = parts[0];
        this.log(`Action: ${actionString}`);

        // Vérifier la proximité pour les interactions avec objets
        if(targetObj && this.player && cmd !== 'loadScene' && cmd !== 'movePlayer') {
            const distance = Math.abs(Math.round(this.player.gx) - Math.round(targetObj.gx)) +
                           Math.abs(Math.round(this.player.gy) - Math.round(targetObj.gy));

            if(distance > 1) {
                this.log("Trop loin pour interagir!", "warning");
                return;
            }
        }

        if(cmd === 'loadScene') this.loadScene(parts[1]);
        if(cmd === 'alert') alert(parts[1]);
        if(cmd === 'log') console.log(parts[1]);

        // Modification variables + sauvegarde auto
        if(cmd === 'addVar') {
            const varName = parts[1];
            const val = parseFloat(parts[2]);
            this.globals[varName] = (this.globals[varName] !== undefined ? parseFloat(this.globals[varName]) : 0) + val;
            this.saveStorage();
            this.refreshHUD();
        }
        if(cmd === 'setVar') {
            this.globals[parts[1]] = parts[2];
            this.saveStorage();
            this.refreshHUD();
        }
        if(cmd === 'movePlayer') {
            if(this.player) {
                const path = this.findPath(Math.round(this.player.gx), Math.round(this.player.gy), parseInt(parts[1]), parseInt(parts[2]));
                if(path.length > 0) { this.player.path = path; this.player.isMoving = false; }
            }
        }

        // Gestion inventaire
        if(cmd === 'addItem') {
            const itemId = parts[1];
            const quantity = parts[2] ? parseInt(parts[2]) : 1;
            this.addToInventory(itemId, quantity);
        }
        if(cmd === 'removeItem') {
            const itemId = parts[1];
            const quantity = parts[2] ? parseInt(parts[2]) : 1;
            this.removeFromInventory(itemId, quantity);
        }
        if(cmd === 'useItem') {
            const itemId = parts[1];
            this.useItem(itemId);
        }
    }

    // =========================================================
    // 2b. GESTION INVENTAIRE
    // =========================================================

    addToInventory(itemId, quantity = 1) {
        // Chercher si l'item existe déjà (stacking)
        const existingItem = this.inventory.find(item => item.id === itemId);

        if(existingItem) {
            existingItem.quantity += quantity;
            this.log(`+${quantity} ${itemId} ajouté (total: ${existingItem.quantity})`, "success");
        } else {
            this.inventory.push({ id: itemId, quantity: quantity });
            this.log(`${itemId} ajouté à l'inventaire (x${quantity})`, "success");
        }

        this.saveStorage();
        this.refreshHUD();
    }

    removeFromInventory(itemId, quantity = 1) {
        const itemIndex = this.inventory.findIndex(item => item.id === itemId);

        if(itemIndex === -1) {
            this.log(`${itemId} introuvable dans l'inventaire`, "warning");
            return false;
        }

        const item = this.inventory[itemIndex];
        item.quantity -= quantity;

        if(item.quantity <= 0) {
            this.inventory.splice(itemIndex, 1);
            this.log(`${itemId} retiré de l'inventaire`, "info");
        } else {
            this.log(`-${quantity} ${itemId} (reste: ${item.quantity})`, "info");
        }

        this.saveStorage();
        this.refreshHUD();
        return true;
    }

    hasItem(itemId, quantity = 1) {
        const item = this.inventory.find(item => item.id === itemId);
        return item && item.quantity >= quantity;
    }

    getItemQuantity(itemId) {
        const item = this.inventory.find(item => item.id === itemId);
        return item ? item.quantity : 0;
    }

    useItem(itemId) {
        if(!this.hasItem(itemId)) {
            this.log(`Vous n'avez pas ${itemId}`, "warning");
            return;
        }

        this.log(`Utilisation de ${itemId}`, "info");
        // L'utilisation de l'item sera définie par les actions liées
        // On ne retire pas automatiquement l'item, c'est l'action qui décide
    }

    // =========================================================
    // 2c. VÉRIFICATION CONDITIONS
    // =========================================================

    parseCondition(conditionNode) {
        if(!conditionNode) return null;

        const type = conditionNode.getAttribute('type');
        const condition = { type: type };

        // Conditions simples
        if(type === 'hasItem' || type === 'notHasItem') {
            condition.item = conditionNode.getAttribute('item');
            condition.quantity = conditionNode.getAttribute('quantity') || '1';
        } else if(type === 'varEquals' || type === 'varGreaterThan' || type === 'varLessThan') {
            condition.var = conditionNode.getAttribute('var');
            condition.value = conditionNode.getAttribute('value');
        } else if(type === 'and' || type === 'or') {
            // Conditions composées
            condition.conditions = [];
            conditionNode.querySelectorAll(':scope > Condition').forEach(childNode => {
                condition.conditions.push(this.parseCondition(childNode));
            });
        }

        return condition;
    }

    checkCondition(conditionObj) {
        if(!conditionObj) return true;

        const type = conditionObj.type;

        // Condition: avoir un item
        if(type === 'hasItem') {
            const itemId = conditionObj.item;
            const quantity = conditionObj.quantity ? parseInt(conditionObj.quantity) : 1;
            return this.hasItem(itemId, quantity);
        }

        // Condition: variable globale
        if(type === 'varEquals') {
            const varName = conditionObj.var;
            const expectedValue = conditionObj.value;
            return this.globals[varName] == expectedValue;
        }

        if(type === 'varGreaterThan') {
            const varName = conditionObj.var;
            const threshold = parseFloat(conditionObj.value);
            return parseFloat(this.globals[varName] || 0) > threshold;
        }

        if(type === 'varLessThan') {
            const varName = conditionObj.var;
            const threshold = parseFloat(conditionObj.value);
            return parseFloat(this.globals[varName] || 0) < threshold;
        }

        // Condition: ne pas avoir d'item
        if(type === 'notHasItem') {
            const itemId = conditionObj.item;
            const quantity = conditionObj.quantity ? parseInt(conditionObj.quantity) : 1;
            return !this.hasItem(itemId, quantity);
        }

        // Condition: ET logique (toutes les conditions doivent être vraies)
        if(type === 'and') {
            return conditionObj.conditions.every(cond => this.checkCondition(cond));
        }

        // Condition: OU logique (au moins une condition doit être vraie)
        if(type === 'or') {
            return conditionObj.conditions.some(cond => this.checkCondition(cond));
        }

        return true;
    }

    parseStringVariables(str) {
        if(!str) return "";
        return str.replace(/\{([^}]+)\}/g, (_, key) => {
            // Si c'est une demande d'inventaire complet
            if(key === 'inventory') {
                return this.inventory.map(item => `${item.id} x${item.quantity}`).join(', ') || 'Vide';
            }
            // Si c'est une demande de quantité d'item (item:nom)
            if(key.startsWith('item:')) {
                const itemId = key.substring(5);
                return this.getItemQuantity(itemId);
            }
            // Si c'est une variable globale
            if(this.globals[key] !== undefined) {
                return this.globals[key];
            }
            return `0`;
        });
    }

    // =========================================================
    // 3. AI & PATHFINDING
    // =========================================================

    updateAI(dt) {
        if(!this.currentScene || this.currentScene.type !== 'game') return;
        this.currentScene.objects.forEach(obj => {
            if(obj.type !== 'mob' || obj.isMoving) return;
            obj.aiTimer -= dt;
            if(obj.aiTimer > 0) return;
            obj.aiTimer = 1000 + Math.random() * 1500;
            let target = null;
            const dist = this.player ? Math.hypot(obj.gx - this.player.gx, obj.gy - this.player.gy) : 999;
            
            if(obj.behavior === 'aggressive' && dist <= obj.aggroRadius) {
                target = { x: Math.round(this.player.gx), y: Math.round(this.player.gy) };
            } else if (obj.wanderRadius > 0) {
                const rx = Math.round(obj.spawnX + (Math.random() * 2 - 1) * obj.wanderRadius);
                const ry = Math.round(obj.spawnY + (Math.random() * 2 - 1) * obj.wanderRadius);
                target = { x: rx, y: ry };
            }

            if(target && this.isValidTile(target.x, target.y)) {
                const path = this.findPath(Math.round(obj.gx), Math.round(obj.gy), target.x, target.y);
                if(path.length > 0 && path.length < 15) { obj.path = path; obj.isMoving = false; }
            }
        });
    }

    isValidTile(x, y) {
        if(!this.currentScene || this.currentScene.type !== 'game') return false;
        if(x < 0 || x >= this.currentScene.width || y < 0 || y >= this.currentScene.height) return false;
        const obj = this.getObjAt(x, y);
        if(obj && obj.collision) return false;
        return true;
    }

    getObjAt(x, y) {
        return this.currentScene.objects.find(o => Math.round(o.gx) === x && Math.round(o.gy) === y);
    }

    findPath(startX, startY, endX, endY) {
        const openList = [{ x: startX, y: startY, g: 0, h: 0, f: 0, parent: null }];
        const closedList = new Set();
        let loops = 0;
        while(openList.length > 0) {
            if(loops++ > 500) return []; 
            let lowInd = 0;
            for(let i=0; i<openList.length; i++) if(openList[i].f < openList[lowInd].f) lowInd = i;
            let currentNode = openList[lowInd];
            if(currentNode.x === endX && currentNode.y === endY) {
                let curr = currentNode, ret = [];
                while(curr.parent) { ret.push({x: curr.x, y: curr.y}); curr = curr.parent; }
                return ret.reverse();
            }
            openList.splice(lowInd, 1);
            closedList.add(`${currentNode.x},${currentNode.y}`);
            const neighbors = [{x:0, y:-1}, {x:0, y:1}, {x:-1, y:0}, {x:1, y:0}];
            for(let i=0; i<neighbors.length; i++) {
                const nx = currentNode.x + neighbors[i].x, ny = currentNode.y + neighbors[i].y;
                if(this.isValidTile(nx, ny) || (nx === endX && ny === endY)) {
                    if(closedList.has(`${nx},${ny}`)) continue;
                    let n = openList.find(n => n.x === nx && n.y === ny);
                    const g = currentNode.g + 1;
                    if(!n) {
                        n = { x: nx, y: ny, parent: currentNode, g: g, h: 0, f: 0 };
                        n.h = Math.abs(n.x - endX) + Math.abs(n.y - endY); n.f = n.g + n.h;
                        openList.push(n);
                    } else if (g < n.g) { n.g = g; n.parent = currentNode; n.f = n.g + n.h; }
                }
            }
        }
        return [];
    }

    // =========================================================
    // 4. CHARGEMENT & PARSING
    // =========================================================

    async fetchXML(url) {
        try {
            const res = await fetch(url + '?t=' + Date.now()); // Evite le cache navigateur
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return new DOMParser().parseFromString(await res.text(), "text/xml");
        } catch (e) { this.log(e.message, "error"); return null; }
    }

    async loadGame(url) {
        const xml = await this.fetchXML(url);
        if(!xml) return;

        const game = xml.querySelector('Game');
        this.tileW = parseInt(game.getAttribute('tileW') || 64);
        this.tileH = parseInt(game.getAttribute('tileH') || 32);
        this.inputMode = game.getAttribute('inputMode') || 'both';

        // 1. Charger Globals XML
        xml.querySelectorAll('Globals Var').forEach(v => {
            this.globals[v.getAttribute('name')] = v.getAttribute('value');
        });
        
        // 2. Ecraser avec localStorage si dispo
        this.loadStorage();

        await this.loadAssets(xml);

        xml.querySelectorAll('Scene').forEach(s => {
            this.scenes[s.getAttribute('id')] = { type: s.getAttribute('type'), src: s.getAttribute('src'), node: s };
        });

        this.setupInputs();
        if(Object.keys(this.scenes)[0]) this.loadScene(Object.keys(this.scenes)[0]);
        
        this.startLoop();
    }

    async loadAssets(xml) {
        const promises = [];
        xml.querySelectorAll('Assets Asset').forEach(n => {
            const id = n.getAttribute('id');
            const type = n.getAttribute('type');
            this.assets[id] = {
                type: type, loaded: false, img: null,
                placeholder: n.getAttribute('placeholder') || '#F0F',
                height: parseInt(n.getAttribute('height') || 32),
                fw: 0, fh: 0
            };
            if(type === 'cube3d') {
                this.assets[id].loaded = true;
            } else {
                const p = new Promise(r => {
                    const img = new Image();
                    img.src = n.getAttribute('src');
                    img.onload = () => {
                        this.assets[id].img = img;
                        this.assets[id].fw = parseInt(n.getAttribute('frameW')) || img.width;
                        this.assets[id].fh = parseInt(n.getAttribute('frameH')) || img.height;
                        this.assets[id].loaded = true; r();
                    };
                    img.onerror = () => { this.log(`Asset error: ${n.getAttribute('src')}`, "warning"); r(); };
                });
                promises.push(p);
            }
        });
        await Promise.all(promises);
    }

    async loadScene(id) {
        const def = this.scenes[id];
        if(!def) return;

        // --- STABILITÉ : Sauvegarder état précédent ---
        if(this.currentScene) this.saveCurrentSceneState();

        // --- STABILITÉ : Stop boucle, Clean UI ---
        if(this.loopId) cancelAnimationFrame(this.loopId);
        this.uiLayer.innerHTML = '';
        this.hideContextMenu();
        this.currentScene = null;
        this.player = null; // Reset player reference
        this.ctx.clearRect(0, 0, this.width, this.height);

        let node = def.node;
        if(def.src && !this.sceneCache[id]) {
            const xml = await this.fetchXML(def.src);
            if(xml) { this.sceneCache[id] = xml.querySelector('Scene'); node = this.sceneCache[id]; }
        }

        this.currentScene = {
            id: id,
            type: def.type || node.getAttribute('type') || 'game',
            width: parseInt(node.getAttribute('width') || 10),
            height: parseInt(node.getAttribute('height') || 10),
            bg: node.getAttribute('background'),
            objects: [],
            hudElements: [],
            // Scènes adjacentes (directions)
            adjacentScenes: {
                north: node.getAttribute('north') || null,
                south: node.getAttribute('south') || null,
                east: node.getAttribute('east') || null,
                west: node.getAttribute('west') || null
            }
        };
        
        // Reset inputs to avoid stuck keys
        this.keys = {};

        if (this.currentScene.type === 'ui') {
            this.parseMenu(node);
        } else {
            await this.parseLevel(node);
        }

        // Relancer la boucle proprement
        this.startLoop();
    }

    parseMenu(node) {
        const uiContainer = node.querySelector('UI');
        if(!uiContainer) return;
        Array.from(uiContainer.children).forEach(el => this.createHTMLElement(el));
    }

    async parseLevel(node) {
        // Charger les assets spécifiques à la scène si présents
        const sceneAssets = node.querySelector('Assets');
        if(sceneAssets) {
            await this.loadAssets(node.ownerDocument || node);
        }

        // HUD
        node.querySelectorAll('HUD > *').forEach(el => {
            const domEl = this.createHTMLElement(el);
            this.currentScene.hudElements.push({ dom: domEl, rawContent: el.getAttribute('content') });
        });

        // Charger sauvegarde scène si existante
        const savedState = this.getSceneSavedState(this.currentScene.id);

        const parseAttachments = (xmlNode) => {
            const atts = [];
            const attNode = xmlNode.querySelector('Attachments');
            if(!attNode) return atts;
            Array.from(attNode.children).forEach(child => {
                atts.push({
                    tag: child.tagName,
                    content: child.getAttribute('content'),
                    asset: child.getAttribute('asset'),
                    color: child.getAttribute('color') || '#FFF',
                    offsetY: parseInt(child.getAttribute('offset-y') || -50),
                    size: child.getAttribute('size') || '12px',
                    font: child.getAttribute('font') || 'Arial',
                    bg: child.getAttribute('background')
                });
            });
            return atts;
        };

        const createEntity = (n, type, overridePos = null) => {
            // ID pour la persistence
            const id = n.getAttribute('id') || null;

            // Position de base XML
            let ix = overridePos ? overridePos.x : parseFloat(n.getAttribute('x'));
            let iy = overridePos ? overridePos.y : parseFloat(n.getAttribute('y'));

            // Si sauvegarde existe, on écrase (sauf si c'est un spawner générique sans ID)
            if(savedState) {
                // Pour le joueur
                if(type === 'player' && savedState['player']) {
                    ix = savedState['player'].gx;
                    iy = savedState['player'].gy;
                }
                // Pour les mobs/objets avec ID
                else if(id && savedState[id]) {
                    ix = savedState[id].gx;
                    iy = savedState[id].gy;
                }
            }
            
            const assetBasePath = n.getAttribute('asset-base-path');
            const useDirectional = assetBasePath || n.getAttribute('asset') === 'hero';

            // Parsing des interactions avec conditions
            const interactionNode = n.querySelector('Interaction');
            let interactionData = null;
            if(interactionNode) {
                interactionData = {
                    action: interactionNode.getAttribute('action'),
                    condition: null,
                    failMessage: interactionNode.getAttribute('failMessage') || "Conditions non remplies"
                };

                // Parser les conditions
                const conditionNode = interactionNode.querySelector('Condition');
                if(conditionNode) {
                    interactionData.condition = this.parseCondition(conditionNode);
                }
            }

            const entity = {
                id: id, // Ajout ID
                type: type, gx: ix, gy: iy, spawnX: ix, spawnY: iy,
                asset: n.getAttribute('asset'),
                speed: parseFloat(n.getAttribute('speed') || 0.1),
                collision: n.getAttribute('collision') === 'true',
                interaction: interactionNode ? interactionNode.getAttribute('action') : null,
                interactionData: interactionData, // Données complètes d'interaction
                behavior: n.getAttribute('behavior') || 'passive',
                wanderRadius: parseInt(n.getAttribute('wander-radius') || 0),
                aggroRadius: parseInt(n.getAttribute('aggro-radius') || 0),
                aiTimer: 0,
                placeholder: n.getAttribute('placeholder') || '#F0F',
                path: [], isMoving: false, moveProgress: 0, startPos: null, targetPos: null,
                attachments: parseAttachments(n),
                // Animation & Direction
                direction: 'south', // Direction par défaut
                animationState: 'idle', // 'idle' ou 'walk'
                animationFrame: 0,
                animationTimer: 0,
                animationSpeed: 150, // ms entre les frames
                directionSprites: {}, // Stockera les sprites par direction et état
                useDirectionalSprites: useDirectional,
                assetBasePath: useDirectional ? (assetBasePath || 'assets/hero') : null
            };

            return entity;
        };

        node.querySelectorAll('Object').forEach(n => this.currentScene.objects.push(createEntity(n, 'object')));
        node.querySelectorAll('Mob').forEach(n => this.currentScene.objects.push(createEntity(n, 'mob')));
        node.querySelectorAll('Spawner').forEach(spawner => {
            const count = parseInt(spawner.getAttribute('count') || 1);
            for(let i=0; i<count; i++) {
                let px, py, att=0;
                do { px = Math.floor(Math.random() * this.currentScene.width); py = Math.floor(Math.random() * this.currentScene.height); att++; } 
                while(!this.isValidTile(px, py) && att < 100);
                if(att < 100) this.currentScene.objects.push(createEntity(spawner, 'mob', {x: px, y: py}));
            }
        });
        const p = node.querySelector('Player');
        if(p) {
            this.player = createEntity(p, 'player');

            // Si on a une transition de scène en attente, positionner le joueur au bord opposé
            if(this.pendingPlayerSpawn) {
                const spawn = this.pendingPlayerSpawn;
                const oppositeDirection = {
                    'north': 'south',
                    'south': 'north',
                    'east': 'west',
                    'west': 'east'
                };

                const direction = oppositeDirection[spawn.direction];

                // Calculer la position au bord opposé
                if(direction === 'north') {
                    this.player.gx = spawn.currentX;
                    this.player.gy = 0;
                } else if(direction === 'south') {
                    this.player.gx = spawn.currentX;
                    this.player.gy = this.currentScene.height - 1;
                } else if(direction === 'west') {
                    this.player.gx = 0;
                    this.player.gy = spawn.currentY;
                } else if(direction === 'east') {
                    this.player.gx = this.currentScene.width - 1;
                    this.player.gy = spawn.currentY;
                }

                // S'assurer que la position est valide, sinon trouver la plus proche
                if(!this.isValidTile(Math.round(this.player.gx), Math.round(this.player.gy))) {
                    // Chercher une tuile valide proche
                    let found = false;
                    for(let offset = 1; offset < 5 && !found; offset++) {
                        const checks = [];
                        if(direction === 'north' || direction === 'south') {
                            checks.push({x: this.player.gx - offset, y: this.player.gy});
                            checks.push({x: this.player.gx + offset, y: this.player.gy});
                            checks.push({x: this.player.gx, y: this.player.gy + (direction === 'north' ? offset : -offset)});
                        } else {
                            checks.push({x: this.player.gx, y: this.player.gy - offset});
                            checks.push({x: this.player.gx, y: this.player.gy + offset});
                            checks.push({x: this.player.gx + (direction === 'west' ? offset : -offset), y: this.player.gy});
                        }

                        for(let check of checks) {
                            if(this.isValidTile(Math.round(check.x), Math.round(check.y))) {
                                this.player.gx = check.x;
                                this.player.gy = check.y;
                                found = true;
                                break;
                            }
                        }
                    }
                }

                this.player.spawnX = this.player.gx;
                this.player.spawnY = this.player.gy;
                this.pendingPlayerSpawn = null;
            }

            this.currentScene.objects.push(this.player);

            // Charger les sprites directionnels si nécessaire (de manière asynchrone, sans bloquer)
            if(this.player.useDirectionalSprites) {
                this.loadDirectionalSprites(this.player).catch(err => {
                    this.log(`Error loading directional sprites: ${err}`, "error");
                });
            }
        }
    }

    async loadDirectionalSprites(entity) {
        if(!entity.assetBasePath) return;

        const directions = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];

        // Charger sprites idle (une image par direction)
        entity.directionSprites.idle = {};
        const idlePromises = directions.map(dir => {
            return new Promise((resolve) => {
                const img = new Image();
                img.src = `${entity.assetBasePath}/idle/${dir}.png`;
                img.onload = () => {
                    entity.directionSprites.idle[dir] = img;
                    resolve();
                };
                img.onerror = () => {
                    this.log(`Failed to load idle sprite: ${dir}`, "warning");
                    resolve();
                };
            });
        });

        // Charger sprites walk (4 frames par direction)
        entity.directionSprites.walk = {};
        const walkPromises = directions.map(dir => {
            entity.directionSprites.walk[dir] = [];
            const framePromises = [];
            for(let i = 0; i < 4; i++) {
                const promise = new Promise((resolve) => {
                    const img = new Image();
                    img.src = `${entity.assetBasePath}/walk/${dir}/frame_${String(i).padStart(3, '0')}.png`;
                    img.onload = () => {
                        entity.directionSprites.walk[dir][i] = img;
                        resolve();
                    };
                    img.onerror = () => {
                        this.log(`Failed to load walk sprite: ${dir}/frame_${i}`, "warning");
                        resolve();
                    };
                });
                framePromises.push(promise);
            }
            return Promise.all(framePromises);
        });

        await Promise.all([...idlePromises, ...walkPromises]);
        this.log(`Directional sprites loaded for ${entity.type}`, "info");
    }

    createHTMLElement(xmlEl) {
        const tag = xmlEl.tagName;
        let domEl;
        if (tag === 'Button') domEl = document.createElement('button');
        else if (tag === 'Image') domEl = document.createElement('img');
        else domEl = document.createElement('div');

        if (tag !== 'Image') {
            const raw = xmlEl.getAttribute('content') || '';
            domEl.innerText = this.parseStringVariables(raw);
        } else {
            domEl.src = xmlEl.getAttribute('src');
        }

        domEl.style.position = 'absolute';
        domEl.style.pointerEvents = 'auto';
        domEl.style.boxSizing = 'border-box';

        if(xmlEl.getAttribute('top')) domEl.style.top = xmlEl.getAttribute('top') + (isNaN(xmlEl.getAttribute('top')) ? '' : 'px');
        if(xmlEl.getAttribute('left')) domEl.style.left = xmlEl.getAttribute('left') + (isNaN(xmlEl.getAttribute('left')) ? '' : 'px');
        if(xmlEl.getAttribute('bottom')) domEl.style.bottom = xmlEl.getAttribute('bottom') + (isNaN(xmlEl.getAttribute('bottom')) ? '' : 'px');
        if(xmlEl.getAttribute('right')) domEl.style.right = xmlEl.getAttribute('right') + (isNaN(xmlEl.getAttribute('right')) ? '' : 'px');
        if(xmlEl.getAttribute('width')) domEl.style.width = xmlEl.getAttribute('width') + 'px';
        if(xmlEl.getAttribute('height')) domEl.style.height = xmlEl.getAttribute('height') + 'px';

        if(xmlEl.getAttribute('color')) domEl.style.color = xmlEl.getAttribute('color');
        if(xmlEl.getAttribute('background')) domEl.style.background = xmlEl.getAttribute('background');
        if(xmlEl.getAttribute('size')) domEl.style.fontSize = xmlEl.getAttribute('size');
        if(xmlEl.getAttribute('style')) domEl.style.cssText += xmlEl.getAttribute('style');

        if(tag === 'Button' && xmlEl.getAttribute('hoverBackground')) {
            const baseBg = xmlEl.getAttribute('background') || '';
            const hoverBg = xmlEl.getAttribute('hoverBackground');
            domEl.onmouseenter = () => domEl.style.background = hoverBg;
            domEl.onmouseleave = () => domEl.style.background = baseBg;
        }

        if(xmlEl.getAttribute('action')) {
            domEl.style.cursor = 'pointer';
            domEl.onclick = (e) => {
                e.stopPropagation();
                this.executeAction(xmlEl.getAttribute('action'));
            }
        }
        this.uiLayer.appendChild(domEl);
        return domEl;
    }

    refreshHUD() {
        if(!this.currentScene || !this.currentScene.hudElements) return;
        this.currentScene.hudElements.forEach(item => {
            if(item.rawContent && item.rawContent.includes('{')) {
                const newText = this.parseStringVariables(item.rawContent);
                if(item.dom.innerText !== newText) item.dom.innerText = newText;
            }
        });
    }

    // =========================================================
    // 5. UPDATE & RENDER
    // =========================================================

    update(dt) {
        if(!this.currentScene || this.currentScene.type !== 'game') return;

        this.updateAI(dt);
        this.refreshHUD();

        this.currentScene.objects.forEach(entity => {
            if(!entity.path || entity.path.length === 0) {
                // Passer en mode idle si l'entité utilise les sprites directionnels
                if(entity.useDirectionalSprites && entity.animationState !== 'idle') {
                    entity.animationState = 'idle';
                    entity.animationFrame = 0;
                }

                // Vérifier si le joueur a une transition de scène en attente
                if(entity === this.player && entity.pendingSceneTransition) {
                    const transition = entity.pendingSceneTransition;
                    entity.pendingSceneTransition = null;

                    // Sauvegarder la direction pour positionner le joueur dans la nouvelle scène
                    this.pendingPlayerSpawn = {
                        direction: transition.direction,
                        currentX: Math.round(entity.gx),
                        currentY: Math.round(entity.gy)
                    };

                    this.loadScene(transition.targetScene);
                }
                return;
            }
            if(!entity.isMoving) {
                entity.isMoving = true;
                entity.moveProgress = 0;
                entity.startPos = { x: entity.gx, y: entity.gy };
                entity.targetPos = entity.path[0];

                // Calculer la direction du mouvement
                if(entity.useDirectionalSprites) {
                    entity.direction = this.getDirectionFromMovement(
                        entity.startPos.x, entity.startPos.y,
                        entity.targetPos.x, entity.targetPos.y
                    );
                    entity.animationState = 'walk';
                    entity.animationFrame = 0;
                }
            }

            // Mettre à jour l'animation si l'entité bouge
            if(entity.useDirectionalSprites && entity.animationState === 'walk') {
                entity.animationTimer += dt;
                if(entity.animationTimer >= entity.animationSpeed) {
                    entity.animationTimer = 0;
                    entity.animationFrame = (entity.animationFrame + 1) % 4; // 4 frames par animation
                }
            }

            if(!entity.startPos || !entity.targetPos) { entity.isMoving = false; entity.path = []; return; }
            const speedFactor = (entity.speed * 4) * (dt / 1000);
            entity.moveProgress += speedFactor;
            if(entity.moveProgress >= 1) {
                entity.gx = entity.targetPos.x;
                entity.gy = entity.targetPos.y;
                entity.path.shift();
                if(entity.path.length > 0) {
                    entity.moveProgress = 0;
                    entity.startPos = { x: entity.gx, y: entity.gy };
                    entity.targetPos = entity.path[0];

                    // Recalculer la direction pour le prochain segment
                    if(entity.useDirectionalSprites) {
                        entity.direction = this.getDirectionFromMovement(
                            entity.startPos.x, entity.startPos.y,
                            entity.targetPos.x, entity.targetPos.y
                        );
                    }
                } else {
                    entity.isMoving = false;
                    entity.moveProgress = 0;
                    if(entity.useDirectionalSprites) {
                        entity.animationState = 'idle';
                        entity.animationFrame = 0;
                    }
                }
            } else {
                entity.gx = entity.startPos.x + (entity.targetPos.x - entity.startPos.x) * entity.moveProgress;
                entity.gy = entity.startPos.y + (entity.targetPos.y - entity.startPos.y) * entity.moveProgress;
            }
        });
    }

    startLoop() {
        if(this.loopId) cancelAnimationFrame(this.loopId);
        const loop = (t) => {
            const dt = t - this.lastTime;
            this.lastTime = t;
            try { this.update(dt); this.render(); } catch (e) { }
            this.loopId = requestAnimationFrame(loop);
        };
        this.loopId = requestAnimationFrame(loop);
    }

    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        if(!this.currentScene) return;

        if(this.currentScene.type === 'ui') {
            this.ctx.fillStyle = this.currentScene.bg || '#000';
            this.ctx.fillRect(0, 0, this.width, this.height);
            return;
        }

        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(0, 0, this.width, this.height);

        const bgAsset = this.assets[this.currentScene.bg];

        // Dessiner les tuiles du haut vers le bas pour un bon chevauchement
        // En isométrique, on dessine de y=0 vers y=max, puis x=0 vers x=max
        for(let y=0; y<this.currentScene.height; y++) {
            for(let x=0; x<this.currentScene.width; x++) {
                const pos = this.isoToScreen(x, y);
                const isHover = (x === this.mouse.gx && y === this.mouse.gy);

                if(bgAsset && bgAsset.loaded && bgAsset.type === 'sprite') {
                    // Dessiner la tuile isométrique avec l'image
                    this.drawIsoTile(pos.x, pos.y, bgAsset.img);
                    if(isHover) {
                        this.ctx.globalAlpha = 0.3;
                        this.drawIsoTileWireframe(pos.x, pos.y, '#FFF');
                        this.ctx.globalAlpha = 1;
                    }
                } else {
                    this.drawIsoTileWireframe(pos.x, pos.y, isHover ? '#555' : (bgAsset ? bgAsset.placeholder : '#333'));
                }
            }
        }

        this.currentScene.objects.sort((a,b) => (Math.ceil(a.gx) + Math.ceil(a.gy)) - (Math.ceil(b.gx) + Math.ceil(b.gy)));

        this.currentScene.objects.forEach(obj => {
            const pos = this.isoToScreen(obj.gx, obj.gy);
            const screenX = pos.x;
            const screenY = pos.y + (this.tileH / 2);

            if((obj === this.player || this.debugMode) && obj.path.length > 0) {
                this.ctx.strokeStyle = obj.placeholder || '#F00';
                this.ctx.beginPath();
                this.ctx.moveTo(screenX, screenY);
                obj.path.forEach(p => {
                    const pPos = this.isoToScreen(p.x, p.y);
                    this.ctx.lineTo(pPos.x, pPos.y + this.tileH/2);
                });
                this.ctx.stroke();
            }

            // Utiliser les sprites directionnels si disponibles
            if(obj.useDirectionalSprites && obj.directionSprites && obj.directionSprites[obj.animationState]) {
                const stateSprites = obj.directionSprites[obj.animationState];
                let sprite = null;

                if(obj.animationState === 'idle') {
                    // Pour idle, une seule image par direction
                    sprite = stateSprites[obj.direction];
                } else if(obj.animationState === 'walk') {
                    // Pour walk, utiliser la frame courante
                    const directionFrames = stateSprites[obj.direction];
                    if(directionFrames && directionFrames.length > 0) {
                        sprite = directionFrames[obj.animationFrame];
                    }
                }

                if(sprite) {
                    // Dessiner le sprite centré
                    const spriteW = sprite.width;
                    const spriteH = sprite.height;
                    this.ctx.drawImage(sprite, screenX - spriteW/2, screenY - spriteH, spriteW, spriteH);
                } else {
                    // Fallback si le sprite n'est pas chargé
                    this.drawIsoCube(screenX, screenY, 32, obj.placeholder || '#F0F');
                }
            } else {
                // Utiliser l'ancien système d'assets
                const asset = this.assets[obj.asset];
                if (asset) {
                    if (asset.type === 'cube3d' || !asset.loaded) {
                        this.drawIsoCube(screenX, screenY, asset.height, asset.placeholder);
                    } else if (asset.type === 'sprite') {
                        this.ctx.drawImage(asset.img, screenX - asset.fw/2, screenY - asset.fh, asset.fw, asset.fh);
                    }
                } else {
                    this.drawIsoCube(screenX, screenY, 32, obj.placeholder || '#F0F');
                }
            }

            if(obj.attachments) {
                obj.attachments.forEach(att => {
                    const ay = screenY + att.offsetY;
                    if(att.tag === 'Text') {
                        const finalTxt = this.parseStringVariables(att.content);
                        this.ctx.font = `${att.size} ${att.font}`;
                        const m = this.ctx.measureText(finalTxt);
                        if(att.bg) {
                            this.ctx.fillStyle = att.bg;
                            this.ctx.fillRect(screenX - m.width/2 - 2, ay - 10, m.width + 4, 14);
                        }
                        this.ctx.fillStyle = att.color;
                        this.ctx.textAlign = 'center';
                        this.ctx.fillText(finalTxt, screenX, ay);
                    }
                    else if (att.tag === 'Block') {
                        const attAsset = this.assets[att.asset];
                        if(attAsset) this.drawIsoCube(screenX, ay, attAsset.height || 10, attAsset.placeholder);
                    }
                });
            }
        });
    }

    // =========================================================
    // 6. TOOLS
    // =========================================================

    isoToScreen(gx, gy) {
        return { x: (gx - gy) * (this.tileW / 2) + this.offsetX, y: (gx + gy) * (this.tileH / 2) + this.offsetY };
    }
    screenToIso(sx, sy) {
        const adjX = sx - this.offsetX;
        const adjY = sy - this.offsetY;
        const hw = this.tileW / 2;
        const hh = this.tileH / 2;
        return { x: (adjY / hh + adjX / hw) / 2, y: (adjY / hh - adjX / hw) / 2 };
    }
    drawIsoTileWireframe(x, y, color) {
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = '#000';
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x + this.tileW/2, y + this.tileH/2);
        this.ctx.lineTo(x, y + this.tileH);
        this.ctx.lineTo(x - this.tileW/2, y + this.tileH/2);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
    }

    drawIsoTile(x, y, image) {
        // L'image est déjà en perspective isométrique
        // On la redimensionne à la taille d'une case (tileW x tileH)
        const tileW = this.tileW;
        const tileH = this.tileH;

        // Centrer horizontalement sur x, et ancrer au point haut de la tuile
        const imgX = x - tileW / 2;
        const imgY = y;

        this.ctx.drawImage(image, imgX, imgY, tileW, tileH);
    }
    drawIsoCube(x, y, h, color) {
        const hw = this.tileW / 2;
        const hh = this.tileH / 2;
        const by = y + hh;
        const shade = (c, p) => {
            let f=parseInt(c.slice(1),16),t=p<0?0:255,P=p<0?-p:p,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
            return "#"+(0x1000000+(Math.round((t-R)*P)+R)*0x10000+(Math.round((t-G)*P)+G)*0x100+(Math.round((t-B)*P)+B)).toString(16).slice(1);
        };
        this.ctx.fillStyle = color;
        this.ctx.beginPath(); this.ctx.moveTo(x, by - h - hh * 2); this.ctx.lineTo(x + hw, by - h - hh); this.ctx.lineTo(x, by - h); this.ctx.lineTo(x - hw, by - h - hh); this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke();
        this.ctx.fillStyle = shade(color, -0.4);
        this.ctx.beginPath(); this.ctx.moveTo(x, by - h); this.ctx.lineTo(x + hw, by - h - hh); this.ctx.lineTo(x + hw, by - hh); this.ctx.lineTo(x, by); this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke();
        this.ctx.fillStyle = shade(color, -0.2);
        this.ctx.beginPath(); this.ctx.moveTo(x, by - h); this.ctx.lineTo(x - hw, by - h - hh); this.ctx.lineTo(x - hw, by - hh); this.ctx.lineTo(x, by); this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke();
    }
    setupDebug() {
        this.consoleDiv = document.createElement('div');
        this.consoleDiv.style.cssText = `position: absolute; bottom: 0; left: 0; width: 100%; height: 100px; background: rgba(0,0,0,0.8); color: #0f0; font-family: monospace; font-size: 11px; overflow-y: scroll; pointer-events: auto; padding: 5px; z-index:99;`;
        this.container.appendChild(this.consoleDiv);
        window.onerror = (msg, url, line) => { this.log(`JS ERROR: ${msg} (@${line})`, "error"); return false; };
    }
    log(msg, type) {
        if(this.consoleDiv) {
            const l = document.createElement('div');
            l.style.color = type==='error'?'#f55':(type==='warning'?'#ff5':'#fff');
            l.innerText = `> ${msg}`;
            this.consoleDiv.appendChild(l);
            this.consoleDiv.scrollTop = this.consoleDiv.scrollHeight;
        }
    }
    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.offsetX = this.width / 2;
    }
}