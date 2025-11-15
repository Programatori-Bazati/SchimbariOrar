async function fetchLastNumbers(file) {
  const response = await fetch(file);
  const text = await response.text();
  const lines = text.trim().split(/\r?\n/);
  const last3 = lines.slice(-3);
  return last3.map((line) => {
    const match = line.match(/(-?\d+)\s*$/);
    return match ? match[1] : null;
  });
}

async function getTxtFilesFromDataFolder() {
  return [
    "data/compare_sapt4_cu_5.txt",
    "data/compare_sapt5_cu_6.txt",
    "data/compare_sapt6_cu_7.txt",
  ];
}

let currentFileIndex = 0;

const fileButtonNames = [
  "Schimbări săptămâna 5",
  "Schimbări săptămâna 6",
  "Schimbări săptămâna 7",
];

async function renderFileList(files) {
  const fileList = document.getElementById("fileList");
  fileList.innerHTML = "";
  files.forEach((file, idx) => {
    const li = document.createElement("li");
    li.textContent = fileButtonNames[idx] || file.split("/").pop();
    if (idx === currentFileIndex) li.classList.add("selected");
    li.onclick = () => {
      currentFileIndex = idx;
      displayNumbers(files);
      renderFileList(files);
    };
    fileList.appendChild(li);
  });
}

function getChangeText(third) {
  if (third < 0) {
    return `Ore mutate: ${Math.abs(third)}`;
  } else if (third > 0) {
    return `Ore adăugate: ${Math.abs(third)}`;
  } else {
    return `Nicio schimbare la ore.`;
  }
}

async function displayNumbers(files) {
  // Get initial hours (first number from first file)
  let initialHours = null;
  let totalMoved = 0;
  let allThirdNumbers = [];
  // Helper to extract last 3 lines and third number from each file
  async function getNumbersFromFile(file) {
    const nums = await fetchLastNumbers(file);
    return nums.map(Number);
  }
  // Get initial hours from first file
  if (files && files.length > 0) {
    const nums = await getNumbersFromFile(files[0]);
    initialHours = nums[0];
  }
  // Get total moved from all files
  for (let f of files) {
    const nums = await getNumbersFromFile(f);
    allThirdNumbers.push(nums[2]);
  }
  totalMoved = Math.abs(
    allThirdNumbers.reduce((acc, n) => acc + (isNaN(n) ? 0 : n), 0)
  );

  // Main file data for current view
  const dynamicTitle = document.getElementById("dynamicTitle");
  dynamicTitle.textContent = fileButtonNames[currentFileIndex] || "";
  const file = files[currentFileIndex];
  const numbers = await fetchLastNumbers(file);
  const [first, second, third] = numbers.map(Number);
  const changeText = getChangeText(third);
  let percent =
    first !== 0 ? (((second - first) / first) * 100).toFixed(2) : "N/A";
  // Extract week number from button text
  const weekMatch = fileButtonNames[currentFileIndex].match(/(\d+)/);
  const weekNum = weekMatch ? parseInt(weekMatch[1]) : "";
  const prevWeekNum = weekNum ? weekNum - 1 : "";
  // Progress percentage
  let progressPercent = initialHours
    ? ((totalMoved / initialHours) * 100).toFixed(1)
    : "N/A";
  const container = document.getElementById("results");
  container.innerHTML = "";
  const block = document.createElement("div");
  block.className = "file-block";
  // Calculate bar chart proportions
  const hoursThisWeek = second;
  const hoursRemoved = Math.abs(third < 0 ? third : 0);
  const total = hoursThisWeek + hoursRemoved;
  const weekPercent = total ? (hoursThisWeek / total) * 100 : 0;
  const removedPercent = total ? (hoursRemoved / total) * 100 : 0;
  // Helper to check if text fits in bar (approximate, based on percent)
  function getBarLabel(text, percent, emoji, tooltipText) {
    // If bar is less than 20% width, use emoji and tooltip
    const percentValue = percent.toFixed(1);
    let percentColor = "";
    if (tooltipText.includes("CREIC")) {
      percentColor = "#c0392b"; // left bar color
    } else {
      percentColor = "#27ae60"; // right bar color
    }
    if (percent < 20) {
      return `<span class="bar-label" data-tooltip="${tooltipText} (${percentValue}%)" data-percent-color="${percentColor}">${emoji}</span>`;
    } else {
      return `<span class="bar-label" data-tooltip="${tooltipText} (${percentValue}%)" data-percent-color="${percentColor}">${text}</span>`;
    }
  }

  block.innerHTML = `
    <div class="bar-chart-container">
      <div class="bar-chart">
        <div class="bar-hours-week" style="width: ${weekPercent}%;" data-tooltip="Ore CREIC și TEAM: ${hoursThisWeek} (${weekPercent.toFixed(
    1
  )}%)">
          ${
            hoursThisWeek > 0
              ? getBarLabel(
                  `Ore CREIC și TEAM: ${hoursThisWeek}`,
                  weekPercent,
                  "😈",
                  `Ore CREIC și TEAM: ${hoursThisWeek}`
                )
              : ""
          }
        </div>
        <div class="bar-hours-removed" style="width: ${removedPercent}%;" data-tooltip="Ore mutate: ${hoursRemoved} (${removedPercent.toFixed(
    1
  )}%)">
          ${
            hoursRemoved > 0
              ? getBarLabel(
                  `Ore mutate: ${hoursRemoved}`,
                  removedPercent,
                  "😇",
                  `Ore mutate: ${hoursRemoved}`
                )
              : ""
          }
        </div>
      </div>
      <div class="bar-hint" style="text-align:left; font-size:0.95em; color:#fff; margin-top:8px; font-weight:bold;">* Hover pentru mai multe detalii</div>
    </div>
    <div class='numbers'>
      Ore CREIC și TEAM initial: ${initialHours}<br>
      Total ore mutate: ${totalMoved}<br>
      Progres mutare înapoi în oraș: ${progressPercent}%<br>
      <br>
      Ore săptămâna trecută (${prevWeekNum}): ${first}<br>
      Ore săptămâna aceasta (${weekNum}): ${second}<br>
      ${changeText}<br>
      Schimbare procentuală: ${percent}%
    </div>
  `;
  container.appendChild(block);
}

async function initView() {
  const files = await getTxtFilesFromDataFolder();
  renderFileList(files);
  displayNumbers(files);
}

document.addEventListener("mouseover", function (e) {
  if (
    e.target.classList.contains("bar-label") ||
    e.target.classList.contains("bar-hours-week") ||
    e.target.classList.contains("bar-hours-removed")
  ) {
    const tooltip = document.createElement("div");
    tooltip.className = "bar-tooltip";
    let tooltipText = e.target.getAttribute("data-tooltip") || "";
    let percentColor = e.target.getAttribute("data-percent-color");
    // If hovering bar, set percentColor based on bar type
    if (!percentColor) {
      if (e.target.classList.contains("bar-hours-week")) {
        percentColor = "#c0392b";
      } else if (e.target.classList.contains("bar-hours-removed")) {
        percentColor = "#27ae60";
      }
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
    // Position relative to mouse
    document.addEventListener("mousemove", positionTooltip);
    function positionTooltip(ev) {
      let isRight = e.target.classList.contains("bar-hours-removed");
      if (e.target.classList.contains("bar-label")) {
        if (
          e.target.parentElement &&
          e.target.parentElement.classList.contains("bar-hours-removed")
        ) {
          isRight = true;
        }
      }
      // Default position
      let left = ev.clientX;
      let top = ev.clientY + 24;
      let transform = isRight ? "translateX(-100%)" : "translateX(0)";
      // Calculate tooltip width
      const tooltipWidth = tooltip.offsetWidth || 340;
      // Ensure tooltip fits on the right
      if (isRight && left - tooltipWidth < 0) {
        left = tooltipWidth + 8;
      }
      // Ensure tooltip fits on the left
      if (!isRight && left + tooltipWidth > window.innerWidth) {
        left = window.innerWidth - tooltipWidth - 8;
      }
      // Ensure tooltip fits on top/bottom
      if (top + tooltip.offsetHeight > window.innerHeight) {
        top = window.innerHeight - tooltip.offsetHeight - 8;
      }
      if (top < 0) {
        top = 8;
      }
      tooltip.style.left = left + "px";
      tooltip.style.top = top + "px";
      tooltip.style.transform = transform;
    }
    e.target._tooltip = tooltip;
    e.target._positionTooltip = positionTooltip;
  }
});

document.addEventListener("mouseout", function (e) {
  if (e.target._tooltip) {
    e.target._tooltip.remove();
    e.target._tooltip = null;
    if (e.target._positionTooltip) {
      document.removeEventListener("mousemove", e.target._positionTooltip);
      e.target._positionTooltip = null;
    }
  }
});

initView();
