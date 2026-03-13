// ---------------------------
// CONFIG: SOURCES TO DOWNLOAD
// ---------------------------

const sources = [
  // GitHub: vWii Compat Installer
  {
    type: "github",
    owner: "Xpl0itU",
    repo: "vwii-compat-installer",
    assetPattern: /\.zip$/
  },

  // GitHub: YAWM ModMii Edition
  {
    type: "github",
    owner: "modmii",
    repo: "YAWM-ModMii-Edition",
    assetPattern: /\.zip$/
  },

  // Direct ZIP: Nintendont
  {
    type: "direct",
    url: "https://hbb1.oscwii.org/api/contents/Nintendont/Nintendont.zip",
    filename: "Nintendont.zip"
  },

  // Direct ZIP: USB Loader GX FS47 (Google Drive)
  {
    type: "direct",
    url: "https://drive.usercontent.google.com/download?id=1wuHEFIQDIRusr7eG8w1pUnKYYyg4zAnq&export=download",
    filename: "USBLoaderGX_FS47.zip"
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
// GITHUB HELPERS
// ---------------------------
async function getLatestRelease(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

  const res = await fetch(url, {
    headers: { "Accept": "application/vnd.github+json" }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch latest release for ${owner}/${repo}: ${res.status}`);
  }

  return res.json();
}

async function downloadAsset(asset) {
  const res = await fetch(asset.browser_download_url);
  if (!res.ok) throw new Error(`Failed to download ${asset.name}: ${res.status}`);
  return res.arrayBuffer();
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
    if (src.type === "github") {
      log(`Fetching latest release for ${src.owner}/${src.repo}...`);
      const release = await getLatestRelease(src.owner, src.repo);

      const asset = release.assets.find(a => src.assetPattern.test(a.name));
      if (!asset) {
        log(`No ZIP found for ${src.owner}/${src.repo}`);
        continue;
      }

      log(`Downloading ${asset.name}...`);
      const data = await downloadAsset(asset);

      zip.file(`${src.owner}-${src.repo}-${asset.name}`, data);
    }

    else if (src.type === "direct") {
      log(`Downloading ${src.filename}...`);
      const data = await downloadDirect(src.url);

      zip.file(src.filename, data);
    }
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
