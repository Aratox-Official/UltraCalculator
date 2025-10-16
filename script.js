function slugify(str = "") {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function formatAverageRuns(v) {
  if (!isFinite(v)) return "Impossible (drop chance = 0)";
  if (v < 1000) return `${v.toFixed(2)} runs (average)`;
  return `${Math.round(v).toLocaleString()} runs (average)`;
}

let ultraData = [];
let dungeonData = [];

const dungeonSelect = document.getElementById("dungeonSelect");
const ultraSelect = document.getElementById("ultraSelect");
const diceSelect = document.getElementById("diceSelect");
const luckInput = document.getElementById("luckInput");
const generateBtn = document.getElementById("generateBtn");
const responseEl = document.getElementById("response");

async function loadAllData() {
  try {
    const [uRes, dRes] = await Promise.all([
      fetch("ultra_names.json"),
      fetch("dungeon_tickets.json")
    ]);

    if (!uRes.ok) throw new Error("Failed to load ultra_names.json");
    if (!dRes.ok) throw new Error("Failed to load dungeon_tickets.json");

    ultraData = await uRes.json();
    dungeonData = await dRes.json();

    populateDungeonSelect();
    populateUltraSelect();
  } catch (err) {
    dungeonSelect.innerHTML = '<option>Error loading data</option>';
    ultraSelect.innerHTML = '<option>Error loading data</option>';
    responseEl.textContent = "Error loading JSON files: " + err.message;
    console.error(err);
  }
}

function populateDungeonSelect() {
  dungeonData.sort((a, b) => {
    const aName = (a.name || a.id || "").toString();
    const bName = (b.name || b.id || "").toString();
    return aName.localeCompare(bName);
  });

  dungeonSelect.innerHTML = '<option value="">-- Select a dungeon --</option>';
  dungeonData.forEach(d => {
    const display = (d.name || d.id || "").toString().replace(/_/g, " ");
    const option = document.createElement("option");
    option.value = d.name || d.id || display;
    option.textContent = display;
    dungeonSelect.appendChild(option);
  });
}

function populateUltraSelect() {
  ultraData.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  ultraSelect.innerHTML = '<option value="">-- Select an ultra --</option>';
  ultraData.forEach(u => {
    const option = document.createElement("option");
    option.textContent = u.name || ("#" + u.id);
    option.value = (typeof u.id !== "undefined") ? String(u.id) : u.name;
    ultraSelect.appendChild(option);
  });
}

generateBtn.addEventListener("click", () => {
  responseEl.innerHTML = "";

  if (!ultraData.length || !dungeonData.length) {
    responseEl.textContent = "Data not loaded yet. Please wait a moment and try again.";
    return;
  }

  const dungeonValue = dungeonSelect.value;
  const ultraValue = ultraSelect.value;
  let luck = parseInt(luckInput.value, 10);
  if (Number.isNaN(luck)) luck = 0;
  luck = Math.max(0, Math.min(25, luck));
  luckInput.value = String(luck);

  const diceBonus = parseFloat(diceSelect.value) || 0;
  let effectiveLuck = Math.floor(luck + luck * diceBonus);
  effectiveLuck = Math.min(25, effectiveLuck);

  if (!dungeonValue || !ultraValue) {
    responseEl.innerHTML = "<strong>Please select both a dungeon and an ultra, then click Generate.</strong>";
    return;
  }

  const dungeon = dungeonData.find(d => {
    if (!d) return false;
    const dName = (d.name || "").toString();
    const dId = (typeof d.id !== "undefined") ? String(d.id) : "";
    return dName === dungeonValue || dId === dungeonValue;
  });

  const ultra = ultraData.find(u => {
    if (!u) return false;
    if (typeof u.id !== "undefined") return String(u.id) === ultraValue;
    return u.name === ultraValue;
  });

  if (!dungeon) {
    responseEl.innerHTML = `<strong>Selected dungeon not found in dungeon data.</strong>`;
    return;
  }
  if (!ultra) {
    responseEl.innerHTML = `<strong>Selected ultra not found in ultra_names.json.</strong>`;
    return;
  }

  const ultraTickets = Number(ultra.tickets);
  const dungeonTickets = Number(dungeon.tickets);

  if (!isFinite(ultraTickets) || !isFinite(dungeonTickets) || dungeonTickets <= 0) {
    responseEl.innerHTML = `<strong>Tickets data missing or invalid for dungeon/ultra.</strong>`;
    return;
  }

  const ultraDropsIn = (ultra.drops_in || "").toString().toLowerCase();
  const dungeonSlug = slugify(dungeon.name || dungeon.id || "");

  let dropsMatch = false;
  if (ultraDropsIn === "" || ultraDropsIn === "all") {
    dropsMatch = true;
  } else {
    dropsMatch = (
      ultraDropsIn === dungeonSlug ||
      ultraDropsIn === String(dungeon.id) ||
      slugify(ultraDropsIn) === dungeonSlug
    );
  }

  const prettyDungeonName = (dungeon.name || dungeon.id || "").toString().replace(/_/g, " ");
  const prettyUltraName = ultra.name || ("#" + ultra.id);
  const prettyDropsIn = (ultra.drops_in || "").toString().replace(/_/g, " ");

  if (!dropsMatch) {
    responseEl.innerHTML = `<div style="color:#ffeb99">It is impossible to get <strong>${prettyUltraName}</strong> from <strong>${prettyDungeonName}</strong>; <strong>${prettyUltraName}</strong> drops only in <strong>${prettyDropsIn || "another dungeon"}</strong>.</div>
    <div class="disclaimer">Disclaimer: this is the AVERAGE amount of runs you need to complete; you may need to complete fewer or additional runs in order to obtain this ultra.</div>`;
    return;
  }

  const dropChance = (100 * ultraTickets / dungeonTickets) * ((0.0005 * effectiveLuck) + 0.006);
  const avgRuns = (dropChance > 0) ? (100 / dropChance) : Infinity;
  const avgRunsText = formatAverageRuns(avgRuns);

  let html = ``;
  html += `<div style="margin-top:8px;font-size:1.15em">Average runs required: <strong>${avgRunsText}</strong></div>`;
  html += `<div class="disclaimer">Disclaimer: this is the AVERAGE amount of runs you need to complete; you may need to complete fewer or additional runs in order to obtain this ultra.</div>`;

  responseEl.innerHTML = html;
});

loadAllData();
