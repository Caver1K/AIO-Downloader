// ---------------------------
// LOAD SOURCES FROM JSONN
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

// ---------------------------
// MAIN ZIP BUILDER
// ---------------------------
async function buildBundle() {
  // Load sources.json FIRST
  const sources = await loadSources();

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
  
    // Skip the Homebrew Browser Guide folder
    if (path.startsWith("Homebrew Browser Guide and Help/")) {
      continue;
    }

  const fileData = await file.async("arraybuffer");

  // Preserve original folder structure
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
});
