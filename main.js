document.querySelector("#app").innerHTML = `
  <section class="shell">
    <header>
      <span class="eyebrow">LOCAL · PRIVATE · OFFLINE · V7</span>
      <h1>手机备份 → Float 转换器</h1>
      <p>支持糯叽机、ePhone / 兔K机 / 330 互通备份，并保留 Float → 糯叽机。</p>
    </header>

    <div class="card">
      <div class="direction">
        <button class="dir active" data-dir="toFloat">糯叽机 → Float</button>
        <button class="dir" data-dir="ephoneToFloat">ePhone / 兔K机 / 330 → Float</button>
        <button class="dir" data-dir="toNuojiji">Float → 糯叽机</button>
      </div>

      <label class="drop">
        <input id="file" type="file" accept=".gz,application/gzip">
        <strong id="pickTitle">选择糯叽机 .gz 备份</strong>
        <span id="fileName">选择文件后自动判断大小并给出清理建议</span>
      </label>

      <aside id="sizeAdvice" class="advice" hidden></aside>

      <div class="grid">
        <label>
          <span id="storyLabel">剧情聊天导入方式</span>
          <select id="storyMode"></select>
        </label>
        <label>
          <span>API Key</span>
          <select id="keyMode">
            <option value="full">完整迁移</option>
            <option value="blank">留空（安全模式）</option>
          </select>
        </label>
      </div>

      <div class="checks">
        <label><input id="stripStatus" type="checkbox" checked> 清理状态栏、思维链与控制标签</label>
        <label id="forumOption"><input id="includeForum" type="checkbox" checked> 糯叽机论坛导入 Float 小红书</label>
      </div>

      <button id="convert" disabled>开始转换</button>
      <div class="progress" hidden><div id="bar"></div></div>
      <pre id="log">等待选择备份…</pre>
    </div>

    <footer id="footerText">糯叽机剧情与线下不会混合：反向转换时按角色建立独立分页。</footer>
  </section>`;

const $ = selector => document.querySelector(selector);
const fileInput = $("#file");
const convertButton = $("#convert");
const log = $("#log");
const progress = $(".progress");
const bar = $("#bar");
const advice = $("#sizeAdvice");
const storyMode = $("#storyMode");

let selectedFile = null;
let direction = "toFloat";

function setStoryOptions(mode) {
  if (mode === "ephoneToFloat") {
    storyMode.innerHTML = '<option value="chat">保留在原私聊 / 群聊中</option>';
    storyMode.disabled = true;
    return;
  }
  storyMode.disabled = false;
  storyMode.innerHTML = '<option value="both">剧情 App + 线下消息</option><option value="offline">仅线下消息</option><option value="story">仅剧情 App</option>';
}

function switchDirection(nextDirection) {
  direction = nextDirection;
  document.querySelectorAll(".dir").forEach(button => {
    button.classList.toggle("active", button.dataset.dir === nextDirection);
  });

  const isNuojijiSource = nextDirection === "toFloat";
  const isEphoneSource = nextDirection === "ephoneToFloat";
  $("#pickTitle").textContent = isNuojijiSource
    ? "选择糯叽机 .gz 备份"
    : isEphoneSource
      ? "选择 ePhone / 兔K机 / 330 .json 备份"
      : "选择 Float .zip 备份";
  $("#storyLabel").textContent = isEphoneSource
    ? "ePhone 剧情与线下消息"
    : isNuojijiSource
      ? "剧情聊天导入方式"
      : "导入糯叽机的剧情分页";
  $("#forumOption").hidden = nextDirection !== "toFloat";
  $("#footerText").textContent = isEphoneSource
    ? "ePhone 的私聊、群聊及其中的剧情/线下内容会保留在原会话，不重复生成剧情页。"
    : "糯叽机剧情与线下不会混合：反向转换时按角色建立独立分页。";

  fileInput.accept = isNuojijiSource
    ? ".gz,application/gzip"
    : isEphoneSource
      ? ".json,application/json,text/json"
      : ".zip,application/zip";
  setStoryOptions(nextDirection);

  selectedFile = null;
  fileInput.value = "";
  convertButton.disabled = true;
  advice.hidden = true;
  progress.hidden = true;
  bar.style.width = "0";
  $("#fileName").textContent = "选择文件后自动判断大小并给出清理建议";
  log.textContent = "等待选择备份…";
}

document.querySelectorAll(".dir").forEach(button => {
  button.addEventListener("click", () => switchDirection(button.dataset.dir));
});

fileInput.addEventListener("change", () => {
  selectedFile = fileInput.files?.[0] || null;
  convertButton.disabled = !selectedFile;
  if (!selectedFile) return;

  const sizeMb = selectedFile.size / 1048576;
  $("#fileName").textContent = `${selectedFile.name} · ${sizeMb.toFixed(1)} MB`;
  advice.hidden = false;
  advice.className = `advice ${sizeMb >= 100 ? "warn" : "ok"}`;

  if (direction === "ephoneToFloat") {
    advice.textContent = sizeMb >= 100
      ? `大文件模式（${sizeMb.toFixed(1)} MB）：建议使用电脑 Chrome/Edge。转换器只输出角色、私聊/群聊、世界书、用户信息、空间动态和 API 设置；贴纸库、外观、钱包、游戏、阅读等大区不会写入 Float。`
      : "已识别为 ePhone Legacy JSON。兔K机、330 等互通版本会按同名核心数据表自动匹配，缺失模块将安全跳过。";
  } else {
    advice.textContent = sizeMb >= 100
      ? `已启用大文件模式（${sizeMb.toFixed(1)} MB）：只匹配转换所需模块。建议先在原应用清理音频、壁纸、贴纸、图片缓存、地图缓存、小说及不用的应用数据；浏览器内存不足时仍可能失败。`
      : "文件大小正常。转换器只生成已选择的核心数据，缓存和不支持的应用数据不会写入结果。";
  }
});

convertButton.addEventListener("click", async () => {
  if (!selectedFile) return;

  if (direction === "toNuojiji" && !window.confirm(`Float → 糯叽机转换注意事项

1. 因糯叽机是非开源项目，目前只能转换角色核心相关数据：角色卡、角色私聊消息、此时此刻剧情、世界书、用户信息、朋友圈和 API 设置。Float 群聊、角色记忆及小红书/论坛不转换。

2. 导入后请检查角色卡性别。若角色列表暂时没有显示消息，请进入通讯录并点击对应好友查看。角色记忆目前无法可靠转换，请根据原有聊天内容手动总结。

是否继续转换？`)) return;

  convertButton.disabled = true;
  progress.hidden = false;
  bar.style.width = "3%";
  log.textContent = direction === "ephoneToFloat"
    ? "正在读取并识别 ePhone 互通备份…"
    : "正在读取并识别备份…";

  const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });

  worker.onmessage = ({ data }) => {
    if (data.type === "progress") {
      bar.style.width = `${data.percent}%`;
      log.textContent = data.message;
    }
    if (data.type === "done") {
      const blob = new Blob([data.buffer], {
        type: data.filename.endsWith(".gz") ? "application/gzip" : "application/zip",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = data.filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 30000);
      bar.style.width = "100%";
      log.textContent = data.report.join("\n");
      convertButton.disabled = false;
      worker.terminate();
    }
    if (data.type === "error") {
      log.textContent = `转换失败：${data.message || "后台转换线程异常，请尝试电脑浏览器并刷新后重试"}`;
      convertButton.disabled = false;
      worker.terminate();
    }
  };

  worker.onerror = event => {
    log.textContent = `转换失败：${event.message || "Worker 未能启动或浏览器内存不足"}`;
    convertButton.disabled = false;
    worker.terminate();
  };

  try {
    const buffer = await selectedFile.arrayBuffer();
    worker.postMessage({
      buffer,
      direction,
      options: {
        storyMode: storyMode.value,
        keyMode: $("#keyMode").value,
        stripStatus: $("#stripStatus").checked,
        includeForum: direction === "toFloat" && $("#includeForum").checked,
        largeMode: selectedFile.size >= 100 * 1048576,
      },
    }, [buffer]);
  } catch (error) {
    log.textContent = `转换失败：${error instanceof Error ? error.message : String(error)}`;
    convertButton.disabled = false;
    worker.terminate();
  }
});

setStoryOptions(direction);
