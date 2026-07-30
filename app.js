(() => {
  "use strict";

  const STORAGE_KEY = "tarot-five-card-ritual-v3";
  const cards = Array.isArray(window.TAROT_CARDS) ? window.TAROT_CARDS : [];
  const $ = selector => document.querySelector(selector);

  const question = $("#question");
  const ritualButton = $("#ritualButton");
  const questionStatus = $("#questionStatus");
  const intentionPanel = $("#intentionPanel");
  const ritualPanel = $("#ritualPanel");
  const ritualTitle = $("#ritualTitle");
  const ritualMessage = $("#ritualMessage");
  const countdown = $("#countdown");
  const skipRitualButton = $("#skipRitualButton");
  const drawPanel = $("#drawPanel");
  const drawTitle = $("#drawTitle");
  const drawHint = $("#drawHint");
  const spread = $("#spread");
  const resultPanel = $("#resultPanel");
  const captureButton = $("#captureButton");
  const toggleNamesButton = $("#toggleNamesButton");
  const restartButton = $("#restartButton");
  const exitCaptureButton = $("#exitCaptureButton");
  const copyButton = $("#copyButton");
  const copyStatus = $("#copyStatus");
  const loadStatus = $("#loadStatus");

  let currentDraw = [];
  let revealIndex = 0;
  let namesHidden = false;
  let ritualToken = 0;
  let audioContext = null;
  let preloadPromise = null;

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
    if (!Number.isInteger(max) || max <= 0) throw new Error("Giới hạn random không hợp lệ.");
    if (window.crypto?.getRandomValues) {
      const limit = Math.floor(0x100000000 / max) * max;
      const values = new Uint32Array(1);
      do window.crypto.getRandomValues(values); while (values[0] >= limit);
      return values[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  function randomOrientation() {
    return secureRandomIndex(2) === 1;
  }

  function prepareFiveCards() {
    const pool = cards.slice();
    const result = [];
    while (result.length < 5) {
      const card = pool.splice(secureRandomIndex(pool.length), 1)[0];
      result.push({
        ...card,
        reversed: randomOrientation(),
        revealed: false,
        imageUrl: "",
        imageLoaded: false
      });
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

  function wait(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
  }

  function tone(frequency = 440, duration = 0.09, volume = 0.025) {
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch {}
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

  async function preloadDraw(token) {
    let loaded = 0;
    const results = await Promise.allSettled(currentDraw.map(async card => {
      const url = await resolveImage(card);
      if (token !== ritualToken) return;
      card.imageUrl = url;
      card.imageLoaded = true;
      loaded += 1;
      loadStatus.textContent = `Đang chuẩn bị bộ bài ${loaded}/5…`;
    }));
    if (token !== ritualToken) return false;
    const failed = results.filter(result => result.status === "rejected").length;
    if (failed) {
      loadStatus.textContent = `${5 - failed}/5 ảnh sẵn sàng · có thể thử lại`;
      return false;
    }
    loadStatus.textContent = "Bộ bài đã sẵn sàng";
    return true;
  }

  function cardMarkup(card, index) {
    const orientation = card.reversed ? "NGƯỢC" : "XUÔI";
    return `
      <article class="card locked${card.reversed ? " reversed" : ""}" data-index="${index}">
        <button class="card-button" type="button" disabled aria-label="Lá ${index + 1}, chưa được mở">
          <div class="card-frame">
            <div class="card-inner">
              <div class="card-face card-back"><small>LÁ ${index + 1}</small></div>
              <div class="card-face card-front">
                <div class="loader"><span>✦</span><small>Đang gọi hình ảnh…</small></div>
              </div>
            </div>
          </div>
        </button>
        <div class="card-meta">
          <span class="position">VỊ TRÍ ${index + 1}</span>
          <h3 class="card-name">${escapeHtml(card.nameEnglish)}</h3>
          <span class="card-name-vi">${escapeHtml(card.nameVietnamese)}</span>
          <span class="orientation${card.reversed ? " reversed" : ""}">${orientation}</span>
        </div>
      </article>`;
  }

  function renderPreparedSpread() {
    spread.innerHTML = currentDraw.map(cardMarkup).join("");
    currentDraw.forEach((card, index) => {
      const article = spread.children[index];
      const front = article.querySelector(".card-front");
      if (card.imageLoaded) {
        front.innerHTML = `<img src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.nameEnglish)}" referrerpolicy="no-referrer">`;
      } else {
        front.innerHTML = `<div class="image-failed">
          <strong>${escapeHtml(card.nameEnglish)}</strong>
          <small>Chưa tải được ảnh.</small>
          <a href="https://drive.google.com/file/d/${encodeURIComponent(card.driveFileId)}/view" target="_blank" rel="noopener">Mở ảnh gốc</a>
        </div>`;
      }
    });
    updateCardAccess();
  }

  function updateCardAccess() {
    [...spread.children].forEach((article, index) => {
      const button = article.querySelector(".card-button");
      const card = currentDraw[index];
      article.classList.toggle("revealed", Boolean(card.revealed));
      article.classList.toggle("active", index === revealIndex && !card.revealed);
      article.classList.toggle("locked", index > revealIndex && !card.revealed);
      button.disabled = index !== revealIndex || card.revealed || !card.imageLoaded;
      button.setAttribute(
        "aria-label",
        card.revealed
          ? `Lá ${index + 1}: ${card.nameVietnamese}, ${card.reversed ? "ngược" : "xuôi"}`
          : index === revealIndex
            ? `Mở lá ${index + 1}`
            : `Lá ${index + 1}, đang khóa`
      );
    });
  }

  async function runRitual() {
    const intention = question.value.trim();
    if (intention.length < 3) {
      questionStatus.textContent = "Hãy ghi câu hỏi hoặc điều đang băn khoăn trước.";
      question.focus();
      return;
    }

    const token = ++ritualToken;
    questionStatus.textContent = "";
    question.disabled = true;
    ritualButton.disabled = true;
    ritualPanel.hidden = false;
    drawPanel.hidden = true;
    resultPanel.hidden = true;
    captureButton.disabled = true;
    toggleNamesButton.disabled = true;
    currentDraw = prepareFiveCards();
    revealIndex = 0;

    preloadPromise = preloadDraw(token);

    ritualTitle.textContent = "Hít vào thật chậm";
    ritualMessage.textContent = "Giữ câu hỏi trong tâm trí. Thả lỏng vai và hít thở tự nhiên.";
    countdown.textContent = "";
    tone(220, 0.18, 0.02);
    await wait(2600);
    if (token !== ritualToken) return;

    ritualTitle.textContent = "Thở ra và buông điều nhiễu";
    ritualMessage.textContent = "Chỉ giữ lại ý niệm cốt lõi: điều gì bạn thực sự cần nhìn rõ lúc này?";
    tone(277, 0.18, 0.02);
    await wait(2600);
    if (token !== ritualToken) return;

    ritualTitle.textContent = "Thầm đọc lời dẫn";
    ritualMessage.textContent = "“Xin cho tôi nhìn thấy điều cần hiểu, đủ rõ để lựa chọn bằng sự tỉnh táo.”";
    await wait(3000);
    if (token !== ritualToken) return;

    for (const value of [3, 2, 1]) {
      ritualTitle.textContent = "Bộ bài đang được xáo";
      ritualMessage.textContent = "Giữ nguyên câu hỏi. Khi đếm hết, hãy tự tay mở từng lá.";
      countdown.textContent = value;
      tone(value === 1 ? 523 : 392, 0.12, 0.03);
      await wait(1000);
      if (token !== ritualToken) return;
    }

    countdown.textContent = "✦";
    const loaded = await preloadPromise;
    if (token !== ritualToken) return;
    if (!loaded) {
      ritualTitle.textContent = "Chưa thể gọi đủ hình ảnh";
      ritualMessage.textContent = "Kết nối Google Drive chưa ổn định. Hãy bấm “Nghi thức mới” để thử lại.";
      drawPanel.hidden = false;
      renderPreparedSpread();
      return;
    }

    finishRitual();
  }

  async function skipRitual() {
    const token = ritualToken;
    if (!token || !preloadPromise) return;
    ritualTitle.textContent = "Đang hoàn tất việc xáo bài";
    ritualMessage.textContent = "Một khoảnh khắc…";
    countdown.textContent = "✦";
    const loaded = await preloadPromise;
    if (token !== ritualToken) return;
    if (!loaded) {
      ritualMessage.textContent = "Chưa tải đủ hình ảnh. Hãy bắt đầu lại.";
      return;
    }
    finishRitual();
  }

  function finishRitual() {
    ritualPanel.hidden = true;
    drawPanel.hidden = false;
    renderPreparedSpread();
    drawTitle.textContent = "Chạm vào lá thứ nhất";
    drawHint.textContent = "Mỗi lần chỉ mở được một lá. Hướng xuôi/ngược đã được random độc lập từ lúc xáo bài.";
    saveState();
    window.setTimeout(() => {
      spread.children[0]?.querySelector(".card-button")?.focus();
    }, 100);
  }

  function revealCard(index) {
    if (index !== revealIndex || !currentDraw[index]?.imageLoaded) return;
    const card = currentDraw[index];
    card.revealed = true;
    tone(card.reversed ? 330 : 440, 0.23, 0.035);
    revealIndex += 1;
    updateCardAccess();
    saveState();

    if (revealIndex < 5) {
      const ordinal = ["thứ nhất", "thứ hai", "thứ ba", "thứ tư", "thứ năm"][revealIndex];
      drawTitle.textContent = `Tiếp tục mở lá ${ordinal}`;
      drawHint.textContent = `Đã mở ${revealIndex}/5 lá. Hãy dừng một nhịp trước khi chạm lá tiếp theo.`;
      window.setTimeout(() => {
        spread.children[revealIndex]?.querySelector(".card-button")?.focus();
      }, 900);
    } else {
      drawTitle.textContent = "Trải bài đã hoàn tất";
      drawHint.textContent = "Quan sát tổng thể 5 lá trước khi đọc từng ý nghĩa riêng.";
      resultPanel.hidden = false;
      captureButton.disabled = false;
      toggleNamesButton.disabled = false;
      loadStatus.textContent = "5/5 lá đã được mở";
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      question: question.value,
      cards: currentDraw.map(card => ({
        id: card.id,
        reversed: card.reversed,
        revealed: card.revealed
      })),
      savedAt: new Date().toISOString()
    }));
  }

  async function restoreState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved?.cards || saved.cards.length !== 5) {
        if (saved?.question) question.value = saved.question;
        return;
      }
      const restored = saved.cards.map(item => {
        const card = cards.find(candidate => candidate.id === item.id);
        return card ? {...card, reversed:Boolean(item.reversed), revealed:Boolean(item.revealed), imageUrl:"", imageLoaded:false} : null;
      }).filter(Boolean);
      if (restored.length !== 5 || new Set(restored.map(card => card.id)).size !== 5) return;

      question.value = saved.question || "";
      currentDraw = restored;
      revealIndex = restored.filter(card => card.revealed).length;
      loadStatus.textContent = "Đang khôi phục trải bài…";
      await Promise.allSettled(currentDraw.map(async card => {
        card.imageUrl = await resolveImage(card);
        card.imageLoaded = true;
      }));
      question.disabled = true;
      ritualButton.disabled = true;
      ritualPanel.hidden = true;
      drawPanel.hidden = false;
      renderPreparedSpread();

      if (revealIndex >= 5) {
        resultPanel.hidden = false;
        captureButton.disabled = false;
        toggleNamesButton.disabled = false;
        drawTitle.textContent = "Trải bài đã hoàn tất";
        drawHint.textContent = "Trải bài gần nhất đã được khôi phục.";
        loadStatus.textContent = "Đã khôi phục 5 lá";
      } else {
        drawTitle.textContent = `Tiếp tục mở lá thứ ${revealIndex + 1}`;
        drawHint.textContent = `Đã khôi phục ${revealIndex}/5 lá đã mở.`;
        loadStatus.textContent = "Trải bài đã sẵn sàng";
      }
    } catch (error) {
      console.error(error);
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
    const list = currentDraw.map((card, index) =>
      `${index + 1}. ${card.nameEnglish} (${card.nameVietnamese}) — ${card.reversed ? "Ngược" : "Xuôi"}`
    );
    return [
      "Tôi vừa thực hiện trải bài Tarot 5 lá theo thứ tự từ trái sang phải:",
      "",
      ...list,
      "",
      `Câu hỏi hoặc thông tin của tôi: ${question.value.trim()}`,
      "",
      "Hãy giải thích bằng tiếng Việt theo hướng thực tế và tự suy ngẫm. Phân tích riêng ý nghĩa xuôi/ngược của từng lá, vai trò từng vị trí, mối liên hệ giữa 5 lá, thông điệp tổng thể, điều cần chú ý và một hành động cụ thể. Không khẳng định đây là dự đoán chắc chắn."
    ].join("\n");
  }

  function restart() {
    ritualToken += 1;
    preloadPromise = null;
    currentDraw = [];
    revealIndex = 0;
    localStorage.removeItem(STORAGE_KEY);
    document.body.classList.remove("capture-mode", "hide-names");
    namesHidden = false;
    question.disabled = false;
    question.value = "";
    ritualButton.disabled = false;
    questionStatus.textContent = "";
    ritualPanel.hidden = true;
    drawPanel.hidden = true;
    resultPanel.hidden = true;
    captureButton.disabled = true;
    toggleNamesButton.disabled = true;
    toggleNamesButton.textContent = "Ẩn tên bên dưới";
    loadStatus.textContent = "Sẵn sàng cho nghi thức mới";
    question.focus();
    window.scrollTo({top:0, behavior:"smooth"});
  }

  ritualButton.addEventListener("click", runRitual);
  skipRitualButton.addEventListener("click", skipRitual);
  spread.addEventListener("click", event => {
    const button = event.target.closest(".card-button");
    if (!button) return;
    const article = button.closest(".card");
    revealCard(Number(article.dataset.index));
  });
  restartButton.addEventListener("click", restart);
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
  question.addEventListener("input", () => {
    questionStatus.textContent = "";
    localStorage.setItem(STORAGE_KEY, JSON.stringify({question:question.value}));
  });
  copyButton.addEventListener("click", async () => {
    if (currentDraw.length !== 5 || currentDraw.some(card => !card.revealed)) return;
    await copyText(buildPrompt());
    copyStatus.textContent = "Đã sao chép";
    window.setTimeout(() => copyStatus.textContent = "", 1800);
  });

  try {
    assertDeck();
    loadStatus.textContent = "78/78 lá đã gán đúng ảnh";
    restoreState();
  } catch (error) {
    console.error(error);
    loadStatus.textContent = error.message;
    ritualButton.disabled = true;
  }
})();
