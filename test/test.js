// ======================================================
// LOAD SOURCES FROM JSON
// ======================================================
async function loadSources() {
  try {
    const res = await fetch("./sources.json");
    const json = await res.json();

    return {
      bundleName: json.bundleName,
      sources: json.sources || [],
      extras: json.extras || {}
    };

  } catch (err) {
    console.error("Failed to load sources.json:", err);

    return {
      bundleName: "Modding-Bundle",
      sources: [],
      extras: {}
    };
  }
}

// ======================================================
// LOAD FILTERS FROM JSON
// ======================================================
async function loadFilters() {
  try {
    const res = await fetch("./filter.json");
    return await res.json();
  } catch (err) {
    console.error("Failed to load filter.json:", err);
    return { folders: [], files: [] };
  }
}

// ======================================================
// LOGGING
// ======================================================
function log(msg) {
  const box = document.getElementById("log");
  box.textContent += msg + "\n";
}

// ======================================================
// DIRECT DOWNLOAD
// ======================================================
async function downloadDirect(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download: ${url} (${res.status})`);
  return res.arrayBuffer();
}

function getDownloadUrl(source) {
  if (source.type === "proxy") {
    return `https://proxy.caver1k.net/?url=${encodeURIComponent(source.url)}`;
  }
  return source.url;
}

// ======================================================
// EXTRAS SYSTEM
// ======================================================

let SOURCES = null;
let selectedExtras = {
  homebrew: {},
  pc: {},
  os: "windows"
};

// Build UI after sources load
async function initExtrasUI() {
  SOURCES = await loadSources();

  buildHomebrewList();
  buildOSSelector();
  buildPCList();
}

// ---------------------------
// Build Homebrew Extras
// ---------------------------
function buildHomebrewList() {
  const container = document.getElementById("extras-homebrew");
  container.innerHTML = "";

  if (!SOURCES.extras.homebrew) return;

  SOURCES.extras.homebrew.forEach(item => {
    container.appendChild(createExtraItem(item, "homebrew"));
  });
}

// ---------------------------
// Build PC Tools (OS‑aware)
// ---------------------------
function buildPCList() {
  const container = document.getElementById("extras-pc");
  container.innerHTML = "";

  if (!SOURCES.extras.pc) return;

  const tools = SOURCES.extras.pc.filter(tool => tool[selectedExtras.os]);

  tools.forEach(tool => {
    container.appendChild(createExtraItem(tool, "pc"));
  });
}

// ---------------------------
// OS Selector
// ---------------------------
function buildOSSelector() {
  const osSel = document.getElementById("os-selector");
  osSel.innerHTML = "";

  ["windows", "linux", "mac"].forEach(os => {
    const btn = document.createElement("div");
    btn.className = "toggle" + (os === selectedExtras.os ? " active" : "");
    btn.textContent = os.toUpperCase();
    btn.dataset.os = os;

    btn.addEventListener("click", () => {
      selectedExtras.os = os;

      document.querySelectorAll("#os-selector .toggle")
        .forEach(b => b.classList.remove("active"));

      btn.classList.add("active");

      buildPCList();
    });

    osSel.appendChild(btn);
  });
}

// ---------------------------
// Create Extra Item UI
// ---------------------------
function createExtraItem(item, category) {
  const div = document.createElement("div");
  div.className = "extra-item";

  const title = document.createElement("strong");
  title.textContent = item.filename;
  div.appendChild(title);

  const group = document.createElement("div");
  group.className = "extra-select-group";

  const modes = [
    { key: "off", label: "OFF" },
    { key: "merge", label: "MERGE" },
    { key: "separate", label: "SEPARATE" }
  ];

  // Default state
  if (!selectedExtras[category][item.filename]) {
    selectedExtras[category][item.filename] = "off";
  }

  modes.forEach(mode => {
    const btn = document.createElement("div");
    btn.className = "extra-select-btn";
    btn.textContent = mode.label;

    if (selectedExtras[category][item.filename] === mode.key) {
      btn.classList.add("active");
    }

    btn.addEventListener("click", () => {
      selectedExtras[category][item.filename] = mode.key;

      group.querySelectorAll(".extra-select-btn")
        .forEach(b => b.classList.remove("active"));

      btn.classList.add("active");
    });

    group.appendChild(btn);
  });

  div.appendChild(group);
  return div;
}

// ---------------------------
// Toggle Extra (merge / separate / off)
// ---------------------------
function toggleExtra(e) {
  const el = e.target;
  const id = el.dataset.id;
  const cat = el.dataset.cat;

  if (!selectedExtras[cat][id]) {
    selectedExtras[cat][id] = "merge";
    el.classList.add("active");
    el.textContent = "Download separately";
  } else if (selectedExtras[cat][id] === "merge") {
    selectedExtras[cat][id] = "separate";
    el.textContent = "Remove";
  } else {
    delete selectedExtras[cat][id];
    el.classList.remove("active");
    el.textContent = "Merge with main bundle";
  }
}

// ======================================================
// MAIN ZIP BUILDER
// ======================================================
async function buildBundle() {
  const { bundleName, sources } = await loadSources();
  const filters = await loadFilters();

  if (!sources || sources.length === 0) {
    log("ERROR: No sources loaded. Check sources.json.");
    return;
  }

  let finalZip = new JSZip();

  // ---------------------------
  // MAIN SOURCES
  // ---------------------------
  for (const src of sources) {
    log(`Downloading ${src.filename}...`);
    let data = await downloadDirect(getDownloadUrl(src));

    let zipContent = await JSZip.loadAsync(data);
    data = null;

    for (const [path, file] of Object.entries(zipContent.files)) {
      if (file.dir) continue;

      if (filters.folders.some(folder => path.startsWith(folder + "/"))) continue;
      if (filters.files.includes(path)) continue;

      const fileData = await file.async("arraybuffer");
      finalZip.file(path, fileData);
    }
  }

  // ---------------------------
  // MERGED EXTRAS
  // ---------------------------
  for (const [cat, items] of Object.entries(selectedExtras)) {
    if (cat === "os") continue;

    for (const [filename, mode] of Object.entries(items)) {
      if (mode !== "merge") continue;

      const item = findExtraByFilename(filename);
      if (!item) continue;

      const url = item[selectedExtras.os] || item.url;
      log(`Merging extra: ${filename}`);

      const data = await downloadDirect(url);
      const zipContent = await JSZip.loadAsync(data);

      for (const [path, file] of Object.entries(zipContent.files)) {
        if (!file.dir) {
          const fileData = await file.async("arraybuffer");
          finalZip.file(path, fileData);
        }
      }
    }
  }

  // ---------------------------
  // FINAL ZIP
  // ---------------------------
  log("Generating final ZIP...");
  const blob = await finalZip.generateAsync({ type: "blob" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${bundleName}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  log("ZIP file ready.");
}

// Helper: find extra by filename
function findExtraByFilename(name) {
  const hb = SOURCES.extras.homebrew?.find(x => x.filename === name);
  if (hb) return hb;

  const pc = SOURCES.extras.pc?.find(x => x.filename === name);
  if (pc) return pc;

  return null;
}

// ======================================================
// BUTTON HANDLER
// ======================================================
document.getElementById("download-btn").addEventListener("click", () => {
  document.getElementById("log").textContent = "";
  buildBundle().catch(err => {
    log("ERROR: " + err.message);
    console.error(err);
  });
});

// Back button
document.getElementById("back-btn").addEventListener("click", () => {
  window.location.href = "/";
});

// Initialize extras UI
initExtrasUI();
