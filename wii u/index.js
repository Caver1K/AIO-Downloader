// ---------------------------
// LOAD SOURCES FROM JSON
// ---------------------------
async function loadSources() {
  try {
    const res = await fetch("./sources.json");
    return await res.json();
  } catch (err) {
    console.error("Failed to load sources.json:", err);
    return [];
  }
}

// ---------------------------
// LOAD FILTERS FROM JSON
// ---------------------------
async function loadFilters() {
  try {
    const res = await fetch("./filters.json");
    return await res.json();
  } catch (err) {
    console.error("Failed to load filters.json:", err);
    return { folders: [], files: [] };
  }
}

// ---------------------------
// LOGGING
// ---------------------------
function log(msg) {
  const box = document.getElementById("log");
  box.textContent += msg + "\n";
}

// ---------------------------
// DIRECT DOWNLOAD
// ---------------------------
async function downloadDirect(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download: ${url} (${res.status})`);
  return res.arrayBuffer();
}

function getDownloadUrl(source) {
  const url = source.url;

  // Aroma requires proxy
  if (url.includes("aroma.foryour.cafe")) {
    return `https://aio.caver1k.net/proxy?url=${encodeURIComponent(url)}`;
  }

  // Everything else can be fetched directly
  return url;
}

// ---------------------------
// MAIN ZIP BUILDER
// ---------------------------
async function buildBundle() {
  // Load sources.json FIRST
  const sources = await loadSources();
  const filters = await loadFilters();

  if (!sources.length) {
    log("ERROR: No sources loaded. Check sources.json.");
    return;
  }

  let finalZip = new JSZip();

  for (const src of sources) {
    log(`Downloading ${src.filename}...`);
    let data = await downloadDirect(src.url);

    let zipContent = await JSZip.loadAsync(data);
    data = null;

    // Extract ALL files exactly as they appear
    for (const [path, file] of Object.entries(zipContent.files)) {
      if (file.dir) continue;

      // -----------------------------
      // FILTER: folders (remove entire directories)
      // -----------------------------
      if (filters.folders.some(folder => path.startsWith(folder + "/"))) {
        log(`Skipping folder: ${path}`);
        continue;
      }

      // -----------------------------
      // FILTER: files (root or anywhere)
      // -----------------------------
      if (filters.files.includes(path)) {
        log(`Skipping file: ${path}`);
        continue;
      }

      // If not filtered, include it
      const fileData = await file.async("arraybuffer");
      finalZip.file(path, fileData);
    }

    zipContent = null;
  }

  log("Generating final ZIP...");
  const blob = await finalZip.generateAsync({ type: "blob" });

  finalZip = null;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Wii-Modding-Bundle.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);

  log("ZIP file ready.");
}

// ---------------------------
// BUTTON HANDLER
// ---------------------------
document.getElementById("download-btn").addEventListener("click", () => {
  document.getElementById("log").textContent = "";
  buildBundle().catch(err => {
    log("ERROR: " + err.message);
    console.error(err);
  });
document.getElementById("back-btn").addEventListener("click", () => {
window.location.href = "/";
});
});
