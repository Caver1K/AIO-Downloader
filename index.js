async function loadFolders() {
  const container = document.getElementById("folder-list");

  try {
    const res = await fetch(
      "https://api.github.com/repos/Caver1K/content.caver1k.net/contents/",
      {
        headers: {
          "Accept": "application/vnd.github.v3+json"
        }
      }
    );

    const items = await res.json();

    container.innerHTML = "";

    const folders = items.filter(item => item.type === "dir");

    folders.forEach(folder => {
      const div = document.createElement("div");
      div.className = "folder";
      div.textContent = folder.name;

      div.onclick = () => {
        window.location.href = `https://aio.caver1k.net/${folder.name}`;
      };

      container.appendChild(div);
    });

  } catch (err) {
    container.textContent = "Failed to load folders.";
    console.error(err);
  }
}

loadFolders();
