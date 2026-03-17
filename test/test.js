// ======================================================
// LOAD SOURCES FROM JSON
// ======================================================
async function loadSources() {
  try {
    const res = await fetch("./sources.json");
    const json = await res.json();

    return {
      bundleName: json.bundleName,
      extrasName: json.extrasName || "Extras",
      sources: json.sources || [],
      extras: json.extras || {}
    };

  } catch (err) {
    console.error("Failed to load sources.json:", err);

    return {
      bundleName: "Modding-Bundle",
      extrasName: "Extras",
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
    const osUrl = source[selectedExtras.os] || source.url;
    return `https://proxy.caver1k.net/?url=${encodeURIComponent(osUrl)}`;
  }
  return source.url;
}

// ======================================================
// ZIP OR RAW FILE DETECTOR
// ======================================================
async function tryLoadZipOrReturnRaw(arrayBuffer) {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    return { isZip: true, zip };
  } catch {
    return { isZip: false, raw: arrayBuffer };
  }
}

// ======================================================
// GLOBAL STATE
// ======================================================
let SOURCES = null;
let selectedExtras = {
  homebrew: {},
  pc: {},
  os: "windows"
};

// ======================================================
// INIT UI
// ======================================================
async function initExtrasUI() {
  SOURCES = await loadSources();

  initOSDropdown();
  buildHomebrewList();
  buildPCList();
  updateSeparateDownloadButton();
}

// ======================================================
// BUILD HOMEBREW LIST
// ======================================================
function buildHomebrewList() {
  const container = document.getElementById("extras-homebrew");
  container.innerHTML = "";

  if (!SOURCES.extras.homebrew) return;

  SOURCES.extras.homebrew.forEach(item => {
    container.appendChild(createExtraItem(item, "homebrew"));
  });
}

// ======================================================
// BUILD PC LIST (OS‑AWARE)
// ======================================================
function buildPCList() {
  const container = document.getElementById("extras-pc");
  container.innerHTML = "";

  if (!SOURCES.extras.pc) return;

  const tools = SOURCES.extras.pc.filter(tool => tool[selectedExtras.os]);

  tools.forEach(tool => {
    container.appendChild(createExtraItem(tool, "pc"));
  });
}

// ======================================================
// OS DROPDOWN
// ======================================================
function initOSDropdown() {
  const dropdown = document.getElementById("os-dropdown");

  dropdown.value = selectedExtras.os;

  dropdown.addEventListener("change", () => {
    selectedExtras.os = dropdown.value;
    buildPCList();
  });
}

// ======================================================
// CREATE EXTRA ITEM (MERGE / SEPARATE / OFF)
// ======================================================
function createExtraItem(item, category) {
  const div = document.createElement("div");
  div.className = "extra-item";

  const title = document.createElement("strong");
  title.textContent = item.filename;
  div.appendChild(title);

  const group = document.createElement("div");
  group.className = "extra-select-group";

  const modes = [
    { key: "merge", label: "Merge" },
    { key: "separate", label: "Separate" }
  ];

  let current = selectedExtras[category][item.filename] || null;

  modes.forEach(mode => {
    const btn = document.createElement("div");
    btn.className = "extra-select-btn";
    btn.textContent = mode.label;

    if (current === mode.key) {
      btn.classList.add("active");
    }

    btn.addEventListener("click", () => {
      if (current === mode.key) {
        current = null;
        delete selectedExtras[category][item.filename];

        group.querySelectorAll(".extra-select-btn")
          .forEach(b => b.classList.remove("active"));

        updateSeparateDownloadButton();
        return;
      }

      current = mode.key;
      selectedExtras[category][item.filename] = mode.key;

      group.querySelectorAll(".extra-select-btn")
        .forEach(b => b.classList.remove("active"));

      btn.classList.add("active");

      updateSeparateDownloadButton();
    });

    group.appendChild(btn);
  });

  div.appendChild(group);
  return div;
}

// ======================================================
// SHOW/HIDE SEPARATE DOWNLOAD BUTTON
// ======================================================
function updateSeparateDownloadButton() {
  const btn = document.getElementById("separate-download-btn");

  const hasSeparate =
    Object.values(selectedExtras.homebrew).includes("separate") ||
    Object.values(selectedExtras.pc).includes("separate");

  btn.style.display = hasSeparate ? "block" : "none";
}

// ======================================================
// FIND EXTRA BY FILENAME
// ======================================================
function findExtraByFilename(name) {
  const hb = SOURCES.extras.homebrew?.find(x => x.filename === name);
  if (hb) return hb;

  const pc = SOURCES.extras.pc?.find(x => x.filename === name);
  if (pc) return pc;

  return null;
}

// ======================================================
// MAIN AIO ZIP BUILDER
// ======================================================
async function buildBundle() {
  const { bundleName, sources } = await loadSources();
  const filters = await loadFilters();

  if (!sources || sources.length === 0) {
    log("ERROR: No sources loaded. Check sources.json.");
    return;
  }

  let finalZip = new JSZip();

  // MAIN SOURCES
  for (const src of sources) {
    log(`Downloading ${src.filename}...`);
    let data = await downloadDirect(getDownloadUrl(src));

    const parsed = await tryLoadZipOrReturnRaw(data);

    if (!parsed.isZip) {
      finalZip.file(src.filename, parsed.raw);
      continue;
    }

    const zipContent = parsed.zip;

    for (const [path, file] of Object.entries(zipContent.files)) {
      if (file.dir) continue;

      if (filters.folders.some(folder => path.startsWith(folder + "/"))) continue;
      if (filters.files.includes(path)) continue;

      const fileData = await file.async("arraybuffer");
      finalZip.file(path, fileData);
    }
  }

  // MERGED EXTRAS
  for (const [cat, items] of Object.entries(selectedExtras)) {
    if (cat === "os") continue;

    for (const [filename, mode] of Object.entries(items)) {
      if (mode !== "merge") continue;

      const item = findExtraByFilename(filename);
      if (!item) continue;

      const rawUrl = item[selectedExtras.os] || item.url;
      const url = item.type === "proxy"
        ? `https://proxy.caver1k.net/?url=${encodeURIComponent(rawUrl)}`
        : rawUrl;

      const data = await downloadDirect(url);
      const parsed = await tryLoadZipOrReturnRaw(data);

      if (!parsed.isZip) {
        finalZip.file(filename, parsed.raw);
        continue;
      }

      const zipContent = parsed.zip;

      for (const [path, file] of Object.entries(zipContent.files)) {
        if (!file.dir) {
          const fileData = await file.async("arraybuffer");
          finalZip.file(path, fileData);
        }
      }
    }
  }

  // FINAL ZIP
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

// ======================================================
// SEPARATE EXTRAS ZIP BUILDER
// ======================================================
async function buildExtrasBundle() {
  const { extrasName } = await loadSources();
  const filters = await loadFilters();

  let extrasZip = new JSZip();

  for (const [cat, items] of Object.entries(selectedExtras)) {
    if (cat === "os") continue;

    for (const [filename, mode] of Object.entries(items)) {
      if (mode !== "separate") continue;

      const item = findExtraByFilename(filename);
      if (!item) continue;

      const rawUrl = item[selectedExtras.os] || item.url;
      const url = item.type === "proxy"
        ? `https://proxy.caver1k.net/?url=${encodeURIComponent(rawUrl)}`
        : rawUrl;

      const data = await downloadDirect(url);
      const parsed = await tryLoadZipOrReturnRaw(data);

      if (!parsed.isZip) {
        extrasZip.file(filename, parsed.raw);
        continue;
      }

      const zipContent = parsed.zip;

      for (const [path, file] of Object.entries(zipContent.files)) {
        if (file.dir) continue;

        if (filters.folders.some(folder => path.startsWith(folder + "/"))) continue;
        if (filters.files.includes(path)) continue;

        const fileData = await file.async("arraybuffer");
        extrasZip.file(path, fileData);
      }
    }
  }

  if (Object.keys(extrasZip.files).length === 0) return;

  const blob = await extrasZip.generateAsync({ type: "blob" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${extrasName}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ======================================================
// BUTTON HANDLERS
// ======================================================
document.getElementById("download-btn").addEventListener("click", () => {
  document.getElementById("log").textContent = "";
  buildBundle().catch(err => {
    log("ERROR: " + err.message);
    console.error(err);
  });
});

document.getElementById("separate-download-btn").addEventListener("click", () => {
  buildExtrasBundle().catch(err => {
    console.error(err);
  });
});

// Back button
document.getElementById("back-btn").addEventListener("click", () => {
  window.location.href = "/";
});

// Initialize extras UI
initExtrasUI();
