// ---------------------------
// CONFIGURE YOUR REPOS HERE
// ---------------------------
const targets = [
  {
    owner: "OWNER1",
    repo: "REPO1",
    assetPattern: /\.zip$/ // download any .zip asset
  },
  {
    owner: "OWNER2",
    repo: "REPO2",
    assetPattern: /\.zip$/ // adjust as needed
  }
  // Add more repos as needed
];

// ---------------------------
// LOGGING HELPER
// ---------------------------
function log(msg) {
  const box = document.getElementById("log");
  box.textContent += msg + "\n";
}

// ---------------------------
// GITHUB API HELPERS
// ---------------------------
async function getLatestRelease(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

  const res = await fetch(url, {
    headers: {
      "Accept": "application/vnd.github+json"
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch latest release for ${owner}/${repo}: ${res.status}`);
  }

  return res.json();
}

async function downloadAsset(asset) {
  const res = await fetch(asset.browser_download_url);

  if (!res.ok) {
    throw new Error(`Failed to download asset ${asset.name}: ${res.status}`);
  }

  return res.arrayBuffer();
}

// ---------------------------
// MAIN ZIP BUILDER
// ---------------------------
async function buildCombinedZip() {
  const zip = new JSZip();

  for (const target of targets) {
    const { owner, repo, assetPattern } = target;

    log(`Fetching latest release for ${owner}/${repo}...`);
    const release = await getLatestRelease(owner, repo);

    const matchingAssets = release.assets.filter(a => assetPattern.test(a.name));

    if (matchingAssets.length === 0) {
      log(`⚠️ No matching assets found for ${owner}/${repo}`);
      continue;
    }

    for (const asset of matchingAssets) {
      log(`Downloading asset: ${asset.name}`);
      const data = await downloadAsset(asset);

      // Store the original ZIP inside the combined ZIP
      const filename = `${owner}-${repo}-${asset.name}`;
      zip.file(filename, data);
    }
  }

  log("Generating combined ZIP...");
  const blob = await zip.generateAsync({ type: "blob" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "combined-latest-releases.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  log("✅ Download ready!");
}

// ---------------------------
// BUTTON HANDLER
// ---------------------------
document.getElementById("download-btn").addEventListener("click", () => {
  document.getElementById("log").textContent = "";
  buildCombinedZip().catch(err => {
    log("❌ ERROR: " + err.message);
    console.error(err);
  });
});
