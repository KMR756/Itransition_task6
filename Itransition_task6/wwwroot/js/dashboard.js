const circuitsContainer =
    document.getElementById("circuits");

const modal =
    document.getElementById("createModal");

async function loadCircuits() {

    const response =
        await fetch("/api/circuits");

    if (!response.ok) {
        console.error("Failed to load circuits");
        return;
    }

    const circuits =
        await response.json();

    circuitsContainer.innerHTML = "";

    if (circuits.length === 0) {

        circuitsContainer.innerHTML = `
            <div class="col-span-full
                        rounded-3xl
                        border border-dashed
                        border-slate-800
                        p-12 text-center">

                <div class="text-4xl">◇</div>

                <h3 class="mt-4 font-semibold">
                    No circuits yet
                </h3>

                <p class="mt-2 text-sm text-slate-500">
                    Create your first collaborative circuit.
                </p>

            </div>
        `;

        return;
    }

    for (const circuit of circuits) {

        const card =
            document.createElement("div");

        card.className =
            "group rounded-2xl border " +
            "border-slate-800 bg-slate-900 " +
            "p-5 transition hover:-translate-y-1 " +
            "hover:border-indigo-500/50 " +
            "hover:shadow-xl";

        card.innerHTML = `

            <div class="flex items-start
                        justify-between">

                <div class="flex h-11 w-11
                            items-center justify-center
                            rounded-xl
                            bg-indigo-500/10
                            text-indigo-400">

                    ◇
                </div>

                <span class="rounded-full
                             bg-emerald-500/10
                             px-2 py-1
                             text-xs text-emerald-400">

                    Live
                </span>

            </div>

            <h3 class="mt-5 text-white font-semibold">
                ${escapeHtml(circuit.name)}
            </h3>

            <p class="mt-2 line-clamp-2
                      text-sm text-slate-500">

                ${escapeHtml(
            circuit.description ||
            "Collaborative logic circuit"
        )}

            </p>

            <div class="mt-5 flex
                        items-center justify-between
                        text-xs text-slate-500">

                <span>
                    ${circuit.nodes} nodes
                </span>

                <span>
                    ${circuit.wires} wires
                </span>

            </div>

            <a href="/Circuit/Editor?id=${circuit.id}"
               class="mt-5 block rounded-xl
                      bg-[#615FFF] px-4 py-3
                      text-center text-sm
                      font-medium
                      transition
                      group-hover:bg-indigo-500 text-white">

                Open workspace →
            </a>
        `;

        circuitsContainer.appendChild(card);
    }
}

function openCreateModal() {

    modal.classList.remove("hidden");
    modal.classList.add("flex");

    document
        .getElementById("circuitName")
        .focus();
}

function closeCreateModal() {

    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

async function createCircuit() {

    const name =
        document
            .getElementById("circuitName")
            .value
            .trim();

    const description =
        document
            .getElementById("circuitDescription")
            .value
            .trim();

    const gridSize =
        Number(
            document
                .getElementById("gridSize")
                .value
        );

    if (!name) {
        alert("Please enter a circuit name.");
        return;
    }

    const response =
        await fetch("/api/circuits", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                name,
                description,
                gridSize
            })
        });

    if (!response.ok) {

        alert("Could not create circuit.");

        return;
    }

    const result =
        await response.json();

    window.location.href =
        `/Circuit/Editor?id=${result.id}`;
}

function escapeHtml(value) {

    const div =
        document.createElement("div");

    div.textContent = value;

    return div.innerHTML;
}

loadCircuits();