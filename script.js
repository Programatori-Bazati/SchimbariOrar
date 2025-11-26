async function fetchLastNumbers(file) {
  try {
    const response = await fetch(file);
    const text = await response.text();
    const lines = text.trim().split(/\r?\n/);
    const last3 = lines.slice(-3);
    return last3.map((line) => {
      const match = line.match(/(-?\d+)\s*$/);
      return match ? Number(match[1]) : null;
    });
  } catch (err) {
    console.error("Failed to fetch", file, err);
    return [null, null, null];
  }
}

function setupPrevRemovedCheckbox() {
  const checkbox = document.getElementById("togglePrevRemoved");
  if (!checkbox) return;

  checkbox.checked = showPrevRemoved;

  if (!checkbox._listenerAdded) {
    checkbox.addEventListener("change", async () => {
      showPrevRemoved = checkbox.checked;
      const files = await getTxtFilesFromDataFolder();
      displayNumbers(files);
      renderFileList(files);
    });
    checkbox._listenerAdded = true;
  }
}


async function getTxtFilesFromDataFolder() {
  return [
    "data/compare_sapt4_cu_5.txt",
    "data/compare_sapt5_cu_6.txt",
    "data/compare_sapt6_cu_7.txt",
    "data/compare_sapt7_cu_8.txt",
    "data/compare_sapt8_cu_9.txt",
  ];
}

let currentFileIndex = 0;
let showPrevRemoved = true;

const fileButtonNames = [
  "Schimbări săptămâna 5",
  "Schimbări săptămâna 6",
  "Schimbări săptămâna 7",
  "Schimbări săptămâna 8",
  "Schimbări săptămâna 9",
];

async function renderFileList(files) {
  const fileList = document.getElementById("fileList");
  if (!fileList) return;
  fileList.innerHTML = "";
  files.forEach((file, idx) => {
    const li = document.createElement("li");
    li.textContent = fileButtonNames[idx] || file.split("/").pop();
    if (idx === currentFileIndex) li.classList.add("selected");
    li.onclick = () => {
      currentFileIndex = idx;
      renderFileList(files);
      displayNumbers(files);
    };
    fileList.appendChild(li);
  });
}

function getChangeText(third) {
  if (third === null || isNaN(third)) return "Date insuficiente.";
  if (third < 0) {
    return `Ore scoase: ${Math.abs(third)} 🎉`;
  } else if (third > 0) {
    return `Ore adăugate: ${Math.abs(third)} 😡📢`;
  } else {
    return `Nicio schimbare la ore.`;
  }
}

function percentColor(pct) {
  if (pct === "N/A") return "#cccccc";

  if (Number(pct) === 0) {
    return `rgba(200, 0, 255, 1)`;
  } else if (Number(pct) < 0) {
    return `rgba(0, 255, 0, 1)`;
  } else {
    return `rgba(255, 0, 0, 1)`
  }
}

async function displayNumbers(files) {
  if (!files || files.length === 0) return;

  const allFilesNumbers = await Promise.all(
    files.map((f) => fetchLastNumbers(f))
  );

  const initialHours = Array.isArray(allFilesNumbers[0])
    ? allFilesNumbers[0][0]
    : null;

  const prevRemoved = allFilesNumbers
    .slice(0, currentFileIndex)
    .reduce((acc, nums) => {
      if (!nums) return acc;
      const val = nums[2];
      if (val == null || isNaN(val)) return acc;
      return acc + (val < 0 ? Math.abs(val) : 0);
    }, 0);

  const dynamicTitle = document.getElementById("dynamicTitle");
  if (dynamicTitle)
    dynamicTitle.textContent = fileButtonNames[currentFileIndex] || "";

  const numbers = allFilesNumbers[currentFileIndex];
  const first = numbers[0] != null ? numbers[0] : 0;
  const second = numbers[1] != null ? numbers[1] : 0;
  const third = numbers[2] != null ? numbers[2] : 0;

  const changeText = getChangeText(third);
  let percent =
    first !== 0 ? (((second - first) / first) * 100).toFixed(2) : "N/A";

  const weekMatch = fileButtonNames[currentFileIndex].match(/(\d+)/);
  const weekNum = weekMatch ? parseInt(weekMatch[1]) : "";
  const prevWeekNum = weekNum ? weekNum - 1 : "";
  const lastNumbers = allFilesNumbers[allFilesNumbers.length - 1];
  const totalMoved = lastNumbers && lastNumbers[1] != null ? lastNumbers[1] : null;

  let progressPercent = initialHours
    ? ((totalMoved / initialHours) * 100).toFixed(2)
    : "N/A";

  const container = document.getElementById("results");
  if (!container) return;
  container.innerHTML = "";

  const block = document.createElement("div");
  block.className = "file-block";

  const hoursThisWeek = second || 0;
  const hoursRemovedThisWeek = third < 0 ? Math.abs(third) : 0;
  const hoursRemovedPrevious = prevRemoved || 0;

  const includePrev = showPrevRemoved;

  const chartParts = {
    thisWeek: hoursThisWeek,
    removedThisWeek: hoursRemovedThisWeek,
    removedPrev: includePrev ? hoursRemovedPrevious : 0,
  };

  const sumParts = Object.values(chartParts).reduce((a, b) => a + b, 0) || 1; // avoid divide by zero
  const pctThisWeek = (chartParts.thisWeek / sumParts) * 100;
  const pctRemovedThisWeek = (chartParts.removedThisWeek / sumParts) * 100;
  const pctRemovedPrev = (chartParts.removedPrev / sumParts) * 100;

  function getBarLabel(text, percent, hours, tooltipText, color) {
    const percentValue = percent.toFixed(2);
    if (percent < 18) {
      return `<span class="bar-label" data-tooltip="${tooltipText} (${percentValue}%)" data-percent-color="${color}">${hours} h</span>`;
    } else {
      return `<span class="bar-label" data-tooltip="${tooltipText} (${percentValue}%)" data-percent-color="${color}">${text}</span>`;
    }
  }

  // Build inner HTML for bar chart — three possible segments, previous bar only when included
  block.innerHTML = `
    <div class="bar-chart-container">
      <div class="bar-chart" role="img" aria-label="Diagramă ore">
        <div class="bar-hours-week" style="width: ${pctThisWeek}%" data-tooltip="Ore CREIC și TEAM: ${hoursThisWeek} (${pctThisWeek.toFixed(
    2
  )}%)">
          ${
            hoursThisWeek > 0
              ? getBarLabel(
                  `Ore CREIC și TEAM: ${hoursThisWeek}`,
                  pctThisWeek,
                  hoursThisWeek,
                  `Ore CREIC și TEAM: ${hoursThisWeek}`,
                  "#c0392b"
                )
              : "🥳"
          }
        </div>
        <div class="bar-hours-removed" style="width: ${pctRemovedThisWeek}%" data-tooltip="Ore mutate: ${hoursRemovedThisWeek} (${pctRemovedThisWeek.toFixed(
    2
  )}%)">
          ${
            hoursRemovedThisWeek > 0
              ? getBarLabel(
                  `Ore mutate: ${hoursRemovedThisWeek}`,
                  pctRemovedThisWeek,
                  hoursRemovedThisWeek,
                  `Ore mutate: ${hoursRemovedThisWeek}`,
                  "#27ae60"
                )
              : "😡"
          }
        </div>
        ${
          includePrev
            ? `<div class="bar-hours-previous" style="width: ${pctRemovedPrev}%" data-tooltip="Ore mutate anterior: ${hoursRemovedPrevious} (${pctRemovedPrev.toFixed(
                2
              )}%)">
            ${
              hoursRemovedPrevious > 0
                ? getBarLabel(
                    `Ore mutate anterior: ${hoursRemovedPrevious}`,
                    pctRemovedPrev,
                    hoursRemovedPrevious,
                    `Ore mutate anterior: ${hoursRemovedPrevious}`,
                    "#14532d"
                  )
                : "😡"
            }
          </div>`
            : ""
        }
      </div>
      <div class="bar-hint" style="text-align:left; font-size:1em; color:#fff; margin-top:8px; font-weight:bold; display:flex; align-items:center; gap:12px;">
        <span>* Hover pentru mai multe detalii</span>
        <label style="font-weight:normal; font-size:0.95em; display:flex; align-items:center; gap:4px;">
          <input type="checkbox" id="togglePrevRemoved" ${showPrevRemoved ? "checked" : ""}>
          Vezi ore mutate anterior
        </label>
      </div>
    </div>

    <div class='numbers'>
      Ore CREIC și TEAM initial: ${initialHours ?? "N/A"}<br>
      Total ore mutate: ${totalMoved}<br>
      Progres mutare înapoi în oraș: ${progressPercent}%<br>
      <br>
      Ore săptămâna trecută (${prevWeekNum}): ${first ?? "N/A"}<br>
      Ore săptămâna aceasta (${weekNum}): ${second ?? "N/A"}<br>
      <span style="color:${percentColor(percent)};">
        ${changeText}<br>
        Schimbare procentuală: ${percent}%
      </span>

    </div>
  `;

  container.appendChild(block);

  setupPrevRemovedCheckbox();
}

async function initView() {
  const files = await getTxtFilesFromDataFolder();
  setupPrevRemovedCheckbox();
  renderFileList(files);
  displayNumbers(files);
}


document.addEventListener("mouseover", function (e) {
  if (
    e.target.classList.contains("bar-label") ||
    e.target.classList.contains("bar-hours-week") ||
    e.target.classList.contains("bar-hours-removed") ||
    e.target.classList.contains("bar-hours-previous")
  ) {
    const tooltip = document.createElement("div");
    tooltip.className = "bar-tooltip";
    let tooltipText = e.target.getAttribute("data-tooltip") || "";
    let percentColor = e.target.getAttribute("data-percent-color") || "";

    if (!percentColor) {
      if (e.target.classList.contains("bar-hours-week")) percentColor = "#c0392b";
      else if (e.target.classList.contains("bar-hours-removed")) percentColor = "#27ae60";
      else if (e.target.classList.contains("bar-hours-previous")) percentColor = "#14532d";
    }

    if (percentColor && tooltipText.match(/\((\d+\.\d+%)\)/)) {
      tooltip.innerHTML = tooltipText.replace(
        /\((\d+\.\d+%)\)/,
        `<span style='color:${percentColor};font-weight:bold;'>($1)</span>`
      );
    } else {
      tooltip.innerText = tooltipText;
    }

    document.body.appendChild(tooltip);
    tooltip.style.position = "absolute";
    tooltip.style.width = "340px";
    tooltip.style.maxWidth = "90vw";
    tooltip.style.padding = "18px 32px";
    tooltip.style.fontSize = "1.3em";
    tooltip.style.background = "#1b263b";
    tooltip.style.color = "#fff";
    tooltip.style.borderRadius = "12px";
    tooltip.style.boxShadow = "0 2px 16px rgba(65, 90, 119, 0.18)";
    tooltip.style.zIndex = "99999";
    tooltip.style.whiteSpace = "normal";
    tooltip.style.pointerEvents = "none";

    let tooltipPositionRequest = null;
    function positionTooltip(ev) {
      if (tooltipPositionRequest) return;
      tooltipPositionRequest = requestAnimationFrame(() => {
        let isRight =
          e.target.closest(".bar-hours-removed") ||
          e.target.closest(".bar-hours-previous");

        let left = ev.clientX;
        let top = ev.clientY + 24;
        let transform = isRight ? "translateX(-100%)" : "translateX(0)";
        const tooltipWidth = tooltip.offsetWidth || 340;

        if (isRight && left - tooltipWidth < 0) left = tooltipWidth + 8;
        if (!isRight && left + tooltipWidth > window.innerWidth)
          left = window.innerWidth - tooltipWidth - 8;

        if (top + tooltip.offsetHeight > window.innerHeight)
          top = window.innerHeight - tooltip.offsetHeight - 8;
        if (top < 0) top = 8;

        tooltip.style.left = left + "px";
        tooltip.style.top = top + "px";
        tooltip.style.transform = transform;

        tooltipPositionRequest = null;
      });
    }

    document.addEventListener("mousemove", positionTooltip);
    e.target._tooltip = tooltip;
    e.target._positionTooltip = positionTooltip;
  }
});

document.addEventListener("mouseout", function (e) {
  if (e.target && e.target._tooltip) {
    e.target._tooltip.remove();
    e.target._tooltip = null;
    if (e.target._positionTooltip) {
      document.removeEventListener("mousemove", e.target._positionTooltip);
      e.target._positionTooltip = null;
    }
  }
});

initView();
