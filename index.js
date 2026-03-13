// ---------------------------
// CONFIG: SOURCES TO DOWNLOAD
// ---------------------------

const sources = [
  // USB Loader GX (OSCWii)
  {
    type: "direct",
    url: "https://hbb1.oscwii.org/api/contents/usbloader_gx/usbloader_gx.zip",
    filename: "usbloader_gx.zip",
    target: "apps"
  },

  // YAWM ModMii Edition (OSCWii)
  {
    type: "direct",
    url: "https://hbb1.oscwii.org/api/contents/yawmme/yawmme.zip",
    filename: "yawmme.zip",
    target: "apps"
  },

  // Compat Title Installer (FortheUsers CDN)
  {
    type: "direct",
    url: "https://wiiu.cdn.fortheusers.org/zips/CompatTitleInstaller.zip",
    filename: "CompatTitleInstaller.zip",
    target: "both"
  },

  // Nintendont (OSCWii)
  {
    type: "direct",
    url: "https://hbb1.oscwii.org/api/contents/Nintendont/Nintendont.zip",
    filename: "Nintendont.zip",
    target: "apps"
  },

  // USB Loader GX FS47 Forwarder (Custom host)
  {
    type: "direct",
    url: "https://content.caver1k.net/Scott/Aroma-Forwarders/ulgx_fs47.zip",
    filename: "USBLoaderGX_Forwarder_FS47.zip",
    target: "forwarder"
  }
];

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
  if (!res.ok) throw new Error(`Failed to download direct file: ${url} (${res.status})`);
  return res.arrayBuffer();
}

// ---------------------------
// MAIN ZIP BUILDER
// ---------------------------
async function buildBundle() {
  let finalZip = new JSZip();

  // Create required folders
  const appsFolder = finalZip.folder("apps");
  const wiiuAppsFolder = finalZip.folder("wiiu").folder("apps");
  const wadsFolder = finalZip.folder("wads");
  const controllersFolder = finalZip.folder("controllers");

  for (const src of sources) {
    log(`Downloading ${src.filename}...`);
    let data = await downloadDirect(src.url);

    log(`Extracting ${src.filename}...`);
    let zipContent = await JSZip.loadAsync(data);

    // Free memory for downloaded ZIP
    data = null;

    // Process extracted files
    for (const [path, file] of Object.entries(zipContent.files)) {
      if (file.dir) continue;

      const fileData = await file.async("arraybuffer");

      const lower = path.toLowerCase();

      // ---------------------------
      // FORWARDER ZIP HANDLING
      // ---------------------------
      if (src.target === "forwarder") {
        if (lower.endsWith(".wuhb")) {
          wiiuAppsFolder.file(path.split("/").pop(), fileData);
        }
        if (lower.endsWith(".wad")) {
          wadsFolder.file(path.split("/").pop(), fileData);
        }
        continue;
      }

      // ---------------------------
      // NINTENDONT CONTROLLERS
      // ---------------------------
      if (lower.startsWith("controllers/")) {
        controllersFolder.file(path.replace(/^controllers\//i, ""), fileData);
        continue;
      }

      // ---------------------------
      // WII APPS
      // ---------------------------
      if (src.target === "apps" || src.target === "both") {
        if (lower.startsWith("apps/")) {
          const cleanPath = path.replace(/^apps\//i, "");
          appsFolder.file(cleanPath, fileData);
          continue;
        }
      }

      // ---------------------------
      // WII U APPS
      // ---------------------------
      if (src.target === "both") {
        if (lower.startsWith("wiiu/apps/")) {
          const cleanPath = path.replace(/^wiiu\/apps\//i, "");
          wiiuAppsFolder.file(cleanPath, fileData);
          continue;
        }
      }
    }

    // Free extracted ZIP memory
    zipContent = null;
  }

  log("Generating final ZIP...");
  const blob = await finalZip.generateAsync({ type: "blob" });

  // Free JSZip object
  finalZip = null;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Wii-Modding-Bundle.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();

  // Free blob URL
  URL.revokeObjectURL(url);

  log("Bundle ready.");
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
