async function loadFolders() {
  const container = document.getElementById("folder-list");

  try {
    // Load folder list (JSON array of folder names)
    const res = await fetch("./folders.json");
    const folders = await res.json();

    container.innerHTML = "";

    folders.forEach(folder => {
      const div = document.createElement("div");
      div.className = "folder";
      div.textContent = folder;

      div.onclick = () => {
        window.location.href = `https://aio.caver1k.net/${folder}`;
      };

      container.appendChild(div);
    });

  } catch (err) {
    container.textContent = "Failed to load folders.";
    console.error(err);
  }
}

loadFolders();
