// ==========================================
// 1. DOM Elements & State Setup
// ==========================================
const canvas = document.getElementById("circuitCanvas");
const nodesLayer = document.getElementById("nodesLayer");
const wiresLayer = document.getElementById("wiresLayer");
const workspace = document.getElementById("workspace");
const connectionStatus = document.getElementById("connectionStatus");
const connectionText = document.getElementById("connectionText");
const collaboratorsContainer = document.getElementById("collaborators");
const gridSizeSelect = document.getElementById("gridSizeSelect");

const runCircuitBtn = document.getElementById("runCircuitBtn");
const truthTableBtn = document.getElementById("truthTableBtn");
const truthTableModal = document.getElementById("truthTableModal");
const closeTruthTable = document.getElementById("closeTruthTable");
const truthTableContent = document.getElementById("truthTableContent");

const nodes = new Map();
const wires = new Map();

let selectedTool = null;
let selectedNode = null;
let wireStartNode = null;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

let rawUserName = localStorage.getItem("circuit_user_name");
if (!rawUserName) {
    rawUserName = prompt("Enter your visual identifier name:", "John") || "John";
    localStorage.setItem("circuit_user_name", rawUserName);
}

// ==========================================
// 2. SignalR Connection & Real-Time Setup
// ==========================================
const connection = new signalR.HubConnectionBuilder()
    .withUrl("/hubs/circuit")
    .withAutomaticReconnect()
    .build();

async function startConnection() {
    if (connection.state !== signalR.HubConnectionState.Disconnected) {
        return;
    }

    try {
        await connection.start();
        setConnectionStatus(true);

        if (window.CIRCUIT_ID) {
            await connection.invoke("JoinCircuit", String(window.CIRCUIT_ID), rawUserName);
        }
    } catch (error) {
        console.error("SignalR Connection Error:", error);
        setConnectionStatus(false);
        if (connection.state === signalR.HubConnectionState.Disconnected) {
            setTimeout(startConnection, 5000);
        }
    }
}

connection.onreconnecting(() => setConnectionStatus(false));
connection.onreconnected(async () => {
    setConnectionStatus(true);
    if (window.CIRCUIT_ID) {
        await connection.invoke("JoinCircuit", String(window.CIRCUIT_ID), rawUserName);
    }
});
connection.onclose(() => setConnectionStatus(false));

function setConnectionStatus(connected) {
    if (!connectionStatus) return;

    if (connected) {
        connectionStatus.className = "h-2 w-2 rounded-full bg-emerald-400";
        if (connectionText) connectionText.textContent = "Connected";
    } else {
        connectionStatus.className = "h-2 w-2 rounded-full bg-amber-400 animate-pulse";
        if (connectionText) connectionText.textContent = "Connecting...";
    }
}

startConnection();

// Collaborator List Sync
connection.on("UserListUpdated", (userList) => {
    if (!collaboratorsContainer) return;
    collaboratorsContainer.innerHTML = "";

    userList.forEach((userName) => {
        const badge = document.createElement("div");
        badge.className = "flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 border-2 border-slate-900 text-xs font-bold text-white uppercase";
        badge.title = userName;
        badge.textContent = userName.substring(0, 2);
        collaboratorsContainer.appendChild(badge);
    });
});

// Grid Size Selector
if (gridSizeSelect) {
    gridSizeSelect.value = `${window.CIRCUIT_GRID_SIZE || 20}px`;
    gridSizeSelect.addEventListener("change", (e) => {
        const newSize = parseInt(e.target.value, 10);
        window.CIRCUIT_GRID_SIZE = newSize;

        const pattern = document.getElementById("gridPattern");
        if (pattern) {
            pattern.setAttribute("width", newSize);
            pattern.setAttribute("height", newSize);
            pattern.querySelector("path").setAttribute("d", `M ${newSize} 0 L 0 0 0 ${newSize}`);
        }
        render();
    });
}

// Data Normalization Helpers
function normalizeNode(raw) {
    return {
        id: raw.id || raw.Id,
        circuitId: raw.circuitId || raw.CircuitId,
        type: raw.type ?? raw.Type,
        label: raw.label ?? raw.Label,
        x: raw.x ?? raw.X,
        y: raw.y ?? raw.Y,
        inputValue: raw.inputValue ?? raw.InputValue ?? false
    };
}

function normalizeWire(raw) {
    return {
        id: raw.id || raw.Id,
        circuitId: raw.circuitId || raw.CircuitId,
        fromNodeId: raw.fromNodeId || raw.FromNodeId,
        toNodeId: raw.toNodeId || raw.ToNodeId
    };
}

// Load Initial Circuit Data
async function loadCircuit() {
    if (!window.CIRCUIT_ID) return;

    try {
        const response = await fetch(`/api/circuits/${window.CIRCUIT_ID}`);
        if (!response.ok) return;

        const circuit = await response.json();
        nodes.clear();
        wires.clear();

        if (circuit.nodes) {
            circuit.nodes.forEach(n => {
                const node = normalizeNode(n);
                nodes.set(node.id, node);
            });
        }
        if (circuit.wires) {
            circuit.wires.forEach(w => {
                const wire = normalizeWire(w);
                wires.set(wire.id, wire);
            });
        }

        render();
    } catch (err) {
        console.error("Error loading circuit:", err);
    }
}
loadCircuit();

// ==========================================
// 3. Canvas Rendering & Node Operations
// ==========================================
function render() {
    if (!nodesLayer || !wiresLayer) return;

    nodesLayer.innerHTML = "";
    wiresLayer.innerHTML = "";

    renderWires();
    nodes.forEach(node => renderNode(node));
}

function renderNode(node) {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("transform", `translate(${node.x}, ${node.y})`);
    group.dataset.nodeId = node.id;
    group.style.cursor = "pointer";

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", "-55");
    rect.setAttribute("y", "-30");
    rect.setAttribute("width", "110");
    rect.setAttribute("height", "60");
    rect.setAttribute("rx", "14");
    rect.setAttribute("fill", node.inputValue ? "#15803d" : "#0f172a");
    rect.setAttribute("stroke", wireStartNode?.id === node.id ? "#eab308" : getNodeColor(node.type));
    rect.setAttribute("stroke-width", wireStartNode?.id === node.id ? "3" : "2");

    group.appendChild(rect);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("y", "5");
    text.setAttribute("fill", "#f8fafc");
    text.setAttribute("font-size", "14");
    text.setAttribute("pointer-events", "none");
    text.textContent = String(node.type).toLowerCase() === "input"
        ? `Input (${node.inputValue ? "1" : "0"})`
        : String(node.type).toLowerCase() === "output"
            ? `Output (${node.inputValue ? "1" : "0"})`
            : (node.label || node.type);

    group.appendChild(text);

    group.addEventListener("pointerdown", (event) => {
        event.stopPropagation();

        if (selectedTool === "Wire") {
            handleWireCreation(node);
            return;
        }

        if (event.altKey && String(node.type).toLowerCase() === "input") {
            node.inputValue = !node.inputValue;
            render();
            connection.invoke("ToggleNodeState", String(window.CIRCUIT_ID), node.id, node.inputValue);
            return;
        }

        beginDrag(event, node);
    });

    group.addEventListener("dblclick", async (event) => {
        event.stopPropagation();
        removeNodeAndConnectedWires(node.id);
        render();
        await connection.invoke("DeleteNode", String(window.CIRCUIT_ID), node.id);
    });

    nodesLayer.appendChild(group);
}

function removeNodeAndConnectedWires(nodeId) {
    nodes.delete(nodeId);
    for (const [wireId, wire] of wires.entries()) {
        if (wire.fromNodeId === nodeId || wire.toNodeId === nodeId) {
            wires.delete(wireId);
        }
    }
}

function handleWireCreation(targetNode) {
    if (!wireStartNode) {
        wireStartNode = targetNode;
        render();
    } else {
        if (wireStartNode.id !== targetNode.id) {
            const wire = {
                id: crypto.randomUUID(),
                circuitId: window.CIRCUIT_ID,
                fromNodeId: wireStartNode.id,
                toNodeId: targetNode.id
            };
            wires.set(wire.id, wire);
            render();

            connection.invoke("AddWire", String(window.CIRCUIT_ID), wire.id, wire.fromNodeId, wire.toNodeId);
        }
        wireStartNode = null;
        selectedTool = null;
        clearToolSelectionUI();
    }
}

function getNodeColor(type) {
    if (!type) return "#64748b";
    switch (type.toString().toLowerCase()) {
        case "input": return "#22c55e";
        case "output": return "#38bdf8";
        case "and": return "#818cf8";
        case "or": return "#a78bfa";
        case "not": return "#f472b6";
        case "xor": return "#f59e0b";
        case "nor": return "#fb7185";
        case "nand": return "#fb923c";
        default: return "#64748b";
    }
}

// ==========================================
// 4. Pointer & Drag Logic
// ==========================================
function beginDrag(event, node) {
    isDragging = true;
    selectedNode = node;

    const point = getSvgPoint(event);
    dragOffsetX = point.x - node.x;
    dragOffsetY = point.y - node.y;

    window.addEventListener("pointermove", dragNode);
    window.addEventListener("pointerup", finishDrag);
}

function dragNode(event) {
    if (!isDragging || !selectedNode) return;

    const point = getSvgPoint(event);
    selectedNode.x = snap(point.x - dragOffsetX);
    selectedNode.y = snap(point.y - dragOffsetY);

    render();
}

async function finishDrag() {
    if (!selectedNode) return;

    isDragging = false;
    window.removeEventListener("pointermove", dragNode);
    window.removeEventListener("pointerup", finishDrag);

    try {
        await connection.invoke("MoveNode", String(window.CIRCUIT_ID), selectedNode.id, selectedNode.x, selectedNode.y);
    } catch (err) {
        console.error("Error moving node:", err);
    }

    selectedNode = null;
}

function snap(value) {
    const size = window.CIRCUIT_GRID_SIZE || 20;
    return Math.round(value / size) * size;
}

function getSvgPoint(event) {
    if (!canvas) return { x: 0, y: 0 };
    const pt = canvas.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const transformed = pt.matrixTransform(canvas.getScreenCTM().inverse());
    return { x: transformed.x, y: transformed.y };
}

function clearToolSelectionUI() {
    document.querySelectorAll("[data-node-type]").forEach((x) =>
        x.classList.remove("ring-2", "ring-indigo-500")
    );
}

// Component Sidebar Tools
document.querySelectorAll("[data-node-type]").forEach((button) => {
    button.addEventListener("click", () => {
        selectedTool = button.dataset.nodeType;
        clearToolSelectionUI();
        button.classList.add("ring-2", "ring-indigo-500");
    });
});

if (canvas) {
    canvas.addEventListener("pointerdown", async (event) => {
        if (!selectedTool || selectedTool === "Wire") return;

        const point = getSvgPoint(event);
        const node = {
            id: crypto.randomUUID(),
            circuitId: window.CIRCUIT_ID,
            type: selectedTool,
            label: selectedTool,
            x: snap(point.x),
            y: snap(point.y),
            inputValue: false
        };

        nodes.set(node.id, node);
        render();

        try {
            await connection.invoke("AddNode", String(window.CIRCUIT_ID), node.id, node.type, node.label, node.x, node.y);
        } catch (err) {
            console.error("Error adding node:", err);
        }

        selectedTool = null;
        clearToolSelectionUI();
    });
}

// ==========================================
// 5. Wire Layer Rendering
// ==========================================
function renderWires() {
    for (const wire of wires.values()) {
        const from = nodes.get(wire.fromNodeId);
        const to = nodes.get(wire.toNodeId);
        if (!from || !to) continue;

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", from.x);
        line.setAttribute("y1", from.y);
        line.setAttribute("x2", to.x);
        line.setAttribute("y2", to.y);
        line.setAttribute("stroke", from.inputValue ? "#22c55e" : "#6366f1");
        line.setAttribute("stroke-width", "3");
        line.setAttribute("stroke-linecap", "round");
        line.style.cursor = "pointer";

        line.addEventListener("dblclick", (e) => {
            e.stopPropagation();
            wires.delete(wire.id);
            render();
            connection.invoke("DeleteWire", String(window.CIRCUIT_ID), wire.id);
        });

        wiresLayer.appendChild(line);
    }
}

// ==========================================
// 6. SignalR Incoming Remote Handlers
// ==========================================
connection.on("NodeAdded", (rawNode) => {
    const node = normalizeNode(rawNode);
    nodes.set(node.id, node);
    render();
});

connection.on("NodeMoved", (nodeId, x, y) => {
    const node = nodes.get(nodeId);
    if (!node) return;
    node.x = x;
    node.y = y;
    render();
});

connection.on("NodeDeleted", (nodeId) => {
    removeNodeAndConnectedWires(nodeId);
    render();
});

connection.on("WireAdded", (rawWire) => {
    const wire = normalizeWire(rawWire);
    wires.set(wire.id, wire);
    render();
});

connection.on("WireDeleted", (wireId) => {
    wires.delete(wireId);
    render();
});

connection.on("NodeStateToggled", (nodeId, value) => {
    const node = nodes.get(nodeId);
    if (!node) return;
    node.inputValue = value;
    render();
});

// ==========================================
// 7. Logic Evaluation & Circuit Execution
// ==========================================
function evaluateLogicGate(type, inputs) {
    const t = String(type).toUpperCase();
    if (t === "NOT") return inputs.length > 0 ? !inputs[0] : false;
    if (inputs.length === 0) return false;

    switch (t) {
        case "AND": return inputs.every(Boolean);
        case "OR": return inputs.some(Boolean);
        case "NAND": return !inputs.every(Boolean);
        case "NOR": return !inputs.some(Boolean);
        case "XOR": return inputs.reduce((a, b) => a !== b, false);
        default: return false;
    }
}

function simulateCircuitState(inputStatesOverride = null) {
    const nodeInputsMap = new Map();
    nodes.forEach(n => nodeInputsMap.set(n.id, []));

    wires.forEach(wire => {
        const fromNode = nodes.get(wire.fromNodeId);
        if (!fromNode) return;

        let signalVal = false;
        if (String(fromNode.type).toUpperCase() === "INPUT") {
            signalVal = inputStatesOverride ? !!inputStatesOverride[fromNode.id] : !!fromNode.inputValue;
        } else {
            const currentComputed = nodeInputsMap.get(fromNode.id) || [];
            signalVal = evaluateLogicGate(fromNode.type, currentComputed);
        }

        if (nodeInputsMap.has(wire.toNodeId)) {
            nodeInputsMap.get(wire.toNodeId).push(signalVal);
        }
    });

    const computedValues = new Map();
    nodes.forEach(node => {
        const t = String(node.type).toUpperCase();
        if (t === "INPUT") {
            computedValues.set(node.id, inputStatesOverride ? !!inputStatesOverride[node.id] : !!node.inputValue);
        } else if (t === "OUTPUT") {
            const ins = nodeInputsMap.get(node.id) || [];
            computedValues.set(node.id, ins.length > 0 ? ins[0] : false);
        } else {
            const ins = nodeInputsMap.get(node.id) || [];
            computedValues.set(node.id, evaluateLogicGate(node.type, ins));
        }
    });

    return computedValues;
}

// ==========================================
// 8. Run Circuit & Truth Table Event Binding
// ==========================================
if (runCircuitBtn) {
    runCircuitBtn.addEventListener("click", () => {
        const results = simulateCircuitState();

        nodes.forEach(node => {
            if (String(node.type).toUpperCase() === "OUTPUT") {
                node.inputValue = results.get(node.id);
            }
        });

        render();
    });
}

if (truthTableBtn) {
    truthTableBtn.addEventListener("click", () => {
        const inputNodes = Array.from(nodes.values()).filter(n => String(n.type).toUpperCase() === "INPUT");
        const outputNodes = Array.from(nodes.values()).filter(n => String(n.type).toUpperCase() === "OUTPUT");

        if (inputNodes.length === 0 || outputNodes.length === 0) {
            alert("Truth table requires at least one Input and one Output node connected on the grid.");
            return;
        }

        const combinationsCount = Math.pow(2, inputNodes.length);
        let tableHTML = `<table class="w-full text-sm text-left text-slate-300 border border-slate-700">
            <thead class="bg-slate-800 text-slate-100 uppercase text-xs">
                <tr>`;

        inputNodes.forEach((inp, idx) => tableHTML += `<th class="px-4 py-2 border-b border-slate-700">In: ${inp.label || 'Input ' + (idx + 1)}</th>`);
        outputNodes.forEach((out, idx) => tableHTML += `<th class="px-4 py-2 border-b border-slate-700 bg-indigo-950 text-indigo-300">Out: ${out.label || 'Output ' + (idx + 1)}</th>`);

        tableHTML += `</tr></thead><tbody>`;

        for (let i = 0; i < combinationsCount; i++) {
            const overrideMap = {};
            tableHTML += `<tr class="border-b border-slate-800 hover:bg-slate-800/50">`;

            inputNodes.forEach((inp, bitIdx) => {
                const bitVal = Boolean((i >> (inputNodes.length - 1 - bitIdx)) & 1);
                overrideMap[inp.id] = bitVal;
                tableHTML += `<td class="px-4 py-2 font-mono">${bitVal ? 1 : 0}</td>`;
            });

            const currentEval = simulateCircuitState(overrideMap);

            outputNodes.forEach(out => {
                const outVal = currentEval.get(out.id) ? 1 : 0;
                tableHTML += `<td class="px-4 py-2 font-mono font-bold text-indigo-400 bg-indigo-950/30">${outVal}</td>`;
            });

            tableHTML += `</tr>`;
        }

        tableHTML += `</tbody></table>`;
        truthTableContent.innerHTML = tableHTML;
        truthTableModal.classList.remove("hidden");
    });
}

if (closeTruthTable) {
    closeTruthTable.addEventListener("click", () => truthTableModal.classList.add("hidden"));
}