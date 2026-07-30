(() => {
  "use strict";

  const STORAGE_KEY = "tarot-five-card-current-draw-v2";
  const cards = Array.isArray(window.TAROT_CARDS) ? window.TAROT_CARDS : [];
  const $ = selector => document.querySelector(selector);

  const drawButton = $("#drawButton");
  const captureButton = $("#captureButton");
  const toggleNamesButton = $("#toggleNamesButton");
  const exitCaptureButton = $("#exitCaptureButton");
  const spread = $("#spread");
  const emptyState = $("#emptyState");
  const questionPanel = $("#questionPanel");
  const question = $("#question");
  const copyButton = $("#copyButton");
  const copyStatus = $("#copyStatus");
  const loadStatus = $("#loadStatus");

  let currentDraw = [];
  let namesHidden = false;
  let drawVersion = 0;

  function assertDeck() {
    const ids = new Set(cards.map(card => card.id));
    const driveIds = new Set(cards.map(card => card.driveFileId));
    if (cards.length !== 78 || ids.size !== 78 || driveIds.size !== 78) {
      throw new Error("Bộ bài hoặc ánh xạ ảnh không hợp lệ.");
    }
    if (cards.some(card => !card.driveFileId)) {
      throw new Error("Có lá chưa được gán ảnh.");
    }
  }

  function secureRandomIndex(max) {
    if (window.crypto?.getRandomValues) {
      const limit = Math.floor(0x100000000 / max) * max;
      const values = new Uint32Array(1);
      do window.crypto.getRandomValues(values); while (values[0] >= limit);
      return values[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  function drawFiveUnique() {
    const pool = cards.slice();
    const result = [];
    while (result.length < 5) {
      result.push(pool.splice(secureRandomIndex(pool.length), 1)[0]);
    }
    return result;
  }

  function imageCandidates(fileId) {
    const id = encodeURIComponent(fileId);
    return [
      `https://drive.google.com/thumbnail?id=${id}&sz=w1600`,
      `https://lh3.googleusercontent.com/d/${id}=w1600`,
      `https://drive.usercontent.google.com/download?id=${id}&export=view&authuser=0`,
      `https://drive.google.com/uc?export=view&id=${id}`
    ];
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[char]));
  }

  function loadCandidate(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const timer = window.setTimeout(() => {
        image.src = "";
        reject(new Error("timeout"));
      }, 15000);
      image.onload = async () => {
        window.clearTimeout(timer);
        try { if (image.decode) await image.decode(); } catch {}
        resolve(url);
      };
      image.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error("load failed"));
      };
      image.referrerPolicy = "no-referrer";
      image.src = url;
    });
  }

  async function resolveImage(card) {
    for (const url of imageCandidates(card.driveFileId)) {
      try {
        return await loadCandidate(url);
      } catch {}
    }
    throw new Error(`Không tải được ảnh ${card.nameEnglish}`);
  }

  function cardMarkup(card, index) {
    const fileUrl = `https://drive.google.com/file/d/${encodeURIComponent(card.driveFileId)}/view`;
    return `
      <article class="card" data-card-id="${escapeHtml(card.id)}">
        <div class="card-frame">
          <div class="loader"><span>✦</span><small>Đang tải ảnh…</small></div>
        </div>
        <div class="card-meta">
          <span class="position">VỊ TRÍ ${index + 1}</span>
          <h2 class="card-name">${escapeHtml(card.nameEnglish)}</h2>
          <span class="card-name-vi">${escapeHtml(card.nameVietnamese)}</span>
        </div>
        <a class="source-link" href="${fileUrl}" hidden>Ảnh gốc</a>
      </article>`;
  }

  async function renderDraw() {
    const version = ++drawVersion;
    captureButton.disabled = true;
    loadStatus.textContent = "Đang tải 0/5 ảnh…";
    spread.innerHTML = currentDraw.map(cardMarkup).join("");
    spread.hidden = false;
    emptyState.hidden = true;
    questionPanel.hidden = false;
    toggleNamesButton.disabled = false;
    drawButton.textContent = "Bốc lại 5 lá khác";

    let loaded = 0;
    const results = await Promise.allSettled(currentDraw.map(async (card, index) => {
      const url = await resolveImage(card);
      if (version !== drawVersion) return;
      const item = spread.children[index];
      const frame = item.querySelector(".card-frame");
      frame.innerHTML = `<img src="${escapeHtml(url)}" alt="${escapeHtml(card.nameEnglish)}" referrerpolicy="no-referrer">`;
      loaded += 1;
      loadStatus.textContent = `Đang tải ${loaded}/5 ảnh…`;
    }));

    if (version !== drawVersion) return;
    const failed = results.map((result, index) => ({result,index})).filter(x => x.result.status === "rejected");
    if (failed.length) {
      failed.forEach(({index}) => {
        const card = currentDraw[index];
        const frame = spread.children[index].querySelector(".card-frame");
        frame.innerHTML = `<div class="image-failed">
          <strong>${escapeHtml(card.nameEnglish)}</strong>
          <small>Google Drive chưa trả ảnh.</small>
          <a href="https://drive.google.com/file/d/${encodeURIComponent(card.driveFileId)}/view" target="_blank" rel="noopener">Mở ảnh gốc</a>
        </div>`;
      });
      loadStatus.textContent = `${5 - failed.length}/5 ảnh tải được · thử bốc lại hoặc tải lại trang`;
      captureButton.disabled = true;
    } else {
      loadStatus.textContent = "5/5 ảnh đã tải xong";
      captureButton.disabled = false;
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      cardIds: currentDraw.map(card => card.id),
      question: question.value,
      savedAt: new Date().toISOString()
    }));
  }

  function restoreState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved?.cardIds || !Array.isArray(saved.cardIds)) return;
      const restored = saved.cardIds.map(id => cards.find(card => card.id === id)).filter(Boolean);
      if (restored.length === 5 && new Set(restored.map(card => card.id)).size === 5) {
        currentDraw = restored;
        question.value = saved.question || "";
        renderDraw();
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
    }
  }

  function buildPrompt() {
    const list = currentDraw.map((card,index) =>
      `${index + 1}. ${card.nameEnglish} (${card.nameVietnamese})`
    );
    return [
      "Tôi vừa bốc ngẫu nhiên 5 lá Tarot theo thứ tự từ trái sang phải:",
      "",
      ...list,
      "",
      `Câu hỏi hoặc thông tin của tôi: ${question.value.trim() || "Hãy giải thích trải bài 5 lá này cho tôi."}`,
      "",
      "Hãy giải thích bằng tiếng Việt theo hướng thực tế và tự suy ngẫm: phân tích từng vị trí, mối liên hệ giữa 5 lá, thông điệp tổng thể, điều cần chú ý và một hành động cụ thể. Không khẳng định đây là dự đoán chắc chắn."
    ].join("\n");
  }

  drawButton.addEventListener("click", () => {
    currentDraw = drawFiveUnique();
    saveState();
    renderDraw();
    window.scrollTo({top:0,behavior:"smooth"});
  });

  captureButton.addEventListener("click", () => document.body.classList.add("capture-mode"));
  exitCaptureButton.addEventListener("click", () => document.body.classList.remove("capture-mode"));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") document.body.classList.remove("capture-mode");
  });

  toggleNamesButton.addEventListener("click", () => {
    namesHidden = !namesHidden;
    document.body.classList.toggle("hide-names", namesHidden);
    toggleNamesButton.textContent = namesHidden ? "Hiện tên bên dưới" : "Ẩn tên bên dưới";
  });

  question.addEventListener("input", saveState);
  copyButton.addEventListener("click", async () => {
    if (!currentDraw.length) return;
    await copyText(buildPrompt());
    copyStatus.textContent = "Đã sao chép";
    window.setTimeout(() => copyStatus.textContent = "", 1700);
  });

  try {
    assertDeck();
    loadStatus.textContent = "78/78 lá đã gán đúng ảnh";
    restoreState();
  } catch (error) {
    console.error(error);
    loadStatus.textContent = error.message;
    drawButton.disabled = true;
  }
})();
