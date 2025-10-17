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

const ultraSelect = document.getElementById("ultraSelect");
const diceSelect = document.getElementById("diceSelect");
const luckInput = document.getElementById("luckInput");
const generateBtn = document.getElementById("generateBtn");
const responseEl = document.getElementById("response");
const dungeonDropsInfoEl = document.getElementById("dungeonDropsInfo");

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

    dungeonData.sort((a, b) => {
      const aName = (a.name || a.id || "").toString();
      const bName = (b.name || b.id || "").toString();
      return aName.localeCompare(bName);
    });

    populateUltraSelect();
    
    dungeonDropsInfoEl.innerHTML = `<strong>Select an Ultra to see where it drops.</strong>`;

  } catch (err) {
    ultraSelect.innerHTML = '<option>Error loading data</option>';
    responseEl.textContent = "Error loading JSON files: " + err.message;
    console.error(err);
  }
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

function getDungeonDropInfo(ultra) {
  const ultraDropsIn = (ultra.drops_in || "").toString().toLowerCase();

  if (ultraDropsIn === "" || ultraDropsIn === "all") {
    return {
      matchText: "This ultra drops in **all** dungeons.",
      matchingDungeons: dungeonData
    };
  }

  const dropsInSlugs = ultraDropsIn.split(",").map(s => slugify(s.trim()));

  const matchingDungeons = dungeonData.filter(d => {
    if (!d) return false;
    const dSlug = slugify(d.name || d.id || "");
    const dId = (typeof d.id !== "undefined") ? String(d.id) : "";
    
    return dropsInSlugs.some(dropSlug => 
      dropSlug === dSlug || dropSlug === dId
    );
  });

  const dungeonNames = matchingDungeons.map(d => 
    (d.name || d.id || "").toString().replace(/_/g, " ")
  ).join(", ");

  return {
    matchText: `This ultra drops in: **${dungeonNames || "Unknown Dungeons"}**`,
    matchingDungeons: matchingDungeons
  };
}

ultraSelect.addEventListener("change", () => {
    dungeonDropsInfoEl.innerHTML = "";
    responseEl.innerHTML = "";

    const ultraValue = ultraSelect.value;
    if (!ultraValue) {
        dungeonDropsInfoEl.innerHTML = `<strong>Select an Ultra to see where it drops.</strong>`;
        return;
    }

    const ultra = ultraData.find(u => {
        if (!u) return false;
        if (typeof u.id !== "undefined") return String(u.id) === ultraValue;
        return u.name === ultraValue;
    });

    if (!ultra) {
        dungeonDropsInfoEl.innerHTML = `<strong>Selected ultra not found.</strong>`;
        return;
    }

    const { matchText, matchingDungeons } = getDungeonDropInfo(ultra);

    let html = `<p style="margin: 0 0 8px;">${matchText}</p>`;
    
    const newSelectId = "calculationDungeonSelect";
    html += `<div class="form-group" style="margin: 0;">
                <label for="${newSelectId}">Dungeon for Calculation</label>
                <select id="${newSelectId}"></select>
            </div>`;
    dungeonDropsInfoEl.innerHTML = html;

    const calculationDungeonSelect = document.getElementById(newSelectId);
    calculationDungeonSelect.innerHTML = '<option value="">-- Select a dungeon to calculate --</option>';

    matchingDungeons.forEach(d => {
      const display = (d.name || d.id || "").toString().replace(/_/g, " ");
      const option = document.createElement("option");
      option.value = d.name || d.id || display; 
      option.textContent = display;
      calculationDungeonSelect.appendChild(option);
    });

    if (matchingDungeons.length === 0) {
        calculationDungeonSelect.innerHTML = '<option value="">(No known dungeons for this ultra)</option>';
        calculationDungeonSelect.disabled = true;
    }
});


generateBtn.addEventListener("click", () => {
  responseEl.innerHTML = "";

  if (!ultraData.length || !dungeonData.length) {
    responseEl.textContent = "Data not loaded yet. Please wait a moment and try again.";
    return;
  }
  
  const ultraValue = ultraSelect.value;
  const calculationDungeonSelect = document.getElementById("calculationDungeonSelect");

  if (!ultraValue) {
    responseEl.innerHTML = "<strong>Please select an ultra.</strong>";
    return;
  }
  
  if (!calculationDungeonSelect || !calculationDungeonSelect.value) {
    responseEl.innerHTML = "<strong>Please select a dungeon for calculation.</strong>";
    return;
  }
  
  const dungeonValue = calculationDungeonSelect.value;
  let luck = parseInt(luckInput.value, 10);
  if (Number.isNaN(luck)) luck = 0;
  luck = Math.max(0, Math.min(25, luck));
  luckInput.value = String(luck);

  const diceBonus = parseFloat(diceSelect.value) || 0;
  let effectiveLuck = Math.floor(luck + luck * diceBonus);
  effectiveLuck = Math.min(25, effectiveLuck);

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
    responseEl.innerHTML = `<strong>Selected ultra not found.</strong>`;
    return;
  }

  const ultraTickets = Number(ultra.tickets);
  const dungeonTickets = Number(dungeon.tickets);

  if (!isFinite(ultraTickets) || !isFinite(dungeonTickets) || dungeonTickets <= 0) {
    responseEl.innerHTML = `<strong>Tickets data missing or invalid for dungeon/ultra.</strong>`;
    return;
  }

  const prettyDungeonName = (dungeon.name || dungeon.id || "").toString().replace(/_/g, " ");
  const prettyUltraName = ultra.name || ("#" + ultra.id);

  const dropChance = (100 * ultraTickets / dungeonTickets) * ((0.0005 * effectiveLuck) + 0.006);
  const avgRuns = (dropChance > 0) ? (100 / dropChance) : Infinity;
  const avgRunsText = formatAverageRuns(avgRuns);

  let html = ``;
  html += `<h3>${prettyUltraName} from ${prettyDungeonName}</h3>`;
  html += `<div style="margin-top:8px;font-size:1.15em">Average runs required: <strong>${avgRunsText}</strong></div>`;
  html += `<div class="disclaimer">Disclaimer: this is the AVERAGE amount of runs you need to complete; you may need to complete fewer or additional runs in order to obtain this ultra.</div>`;

  responseEl.innerHTML = html;
});

loadAllData();
