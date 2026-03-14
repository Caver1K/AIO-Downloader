// ---------------------------
// LOAD SOURCES FROM JSON
// ---------------------------
let sources = [];

fetch("./sources.json")
  .then(res => res.json())
  .then(json => sources = json)
  .catch(err => console.error("Failed to load sources.json:", err));

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
  let finalZip = new JSZip();

  // Pre-create folders
  const appsFolder = finalZip.folder("apps");
  const wiiuAppsFolder = finalZip.folder("wiiu").folder("apps");
  const wadsFolder = finalZip.folder("wads");
  const controllersFolder = finalZip.folder("controllers");

  for (const src of sources) {
    log(`Downloading ${src.filename}...`);
    let data = await downloadDirect(src.url);

    log(`Extracting ${src.filename}...`);
    let zipContent = await JSZip.loadAsync(data);

    data = null;

    for (const [path, file] of Object.entries(zipContent.files)) {
      if (file.dir) continue;

      const fileData = await file.async("arraybuffer");
      const lower = path.toLowerCase();

      // Auto-route based on ZIP internal structure
      if (lower.startsWith("apps/")) {
        appsFolder.file(path.replace(/^apps\//i, ""), fileData);
        continue;
      }

      if (lower.startsWith("wiiu/apps/")) {
        wiiuAppsFolder.file(path.replace(/^wiiu\/apps\//i, ""), fileData);
        continue;
      }

      if (lower.startsWith("wads/")) {
        wadsFolder.file(path.replace(/^wads\//i, ""), fileData);
        continue;
      }

      if (lower.startsWith("controllers/")) {
        controllersFolder.file(path.replace(/^controllers\//i, ""), fileData);
        continue;
      }

      // Default: place file in root of final ZIP
      finalZip.file(path.split("/").pop(), fileData);
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
