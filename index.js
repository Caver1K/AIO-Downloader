// ---------------------------
// CONFIG: SOURCES TO DOWNLOAD
// ---------------------------

const sources = [
  // USB Loader GX (OSCWii)
  {
    type: "direct",
    url: "https://hbb1.oscwii.org/api/contents/usbloader_gx/usbloader_gx.zip",
    filename: "usbloader_gx.zip"
  },

  // YAWM ModMii Edition (OSCWii)
  {
    type: "direct",
    url: "https://hbb1.oscwii.org/api/contents/yawmme/yawmme.zip",
    filename: "yawmme.zip"
  },

  // Compat Title Installer (FortheUsers CDN)
  {
    type: "direct",
    url: "https://wiiu.cdn.fortheusers.org/zips/CompatTitleInstaller.zip",
    filename: "CompatTitleInstaller.zip"
  },

  // Nintendont (OSCWii)
  {
    type: "direct",
    url: "https://hbb1.oscwii.org/api/contents/Nintendont/Nintendont.zip",
    filename: "Nintendont.zip"
  },

  // USB Loader GX FS47 (Google Drive)
  {
    type: "direct",
    url: "https://content.caver1k.net/Scott/Aroma-Forwarders/USB-Loader-GX-FS47.zip",
    filename: "USBLoaderGX_Forwarder_FS47.zip"
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
  const zip = new JSZip();

  for (const src of sources) {
    log(`Downloading ${src.filename}...`);
    const data = await downloadDirect(src.url);
    zip.file(src.filename, data);
  }

  log("Generating final ZIP...");
  const blob = await zip.generateAsync({ type: "blob" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Wii-Modding-Bundle.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
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
