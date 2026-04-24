/* ================== FIN buildAnalysis ================== */
        `Production offensive : ${home.avgScored} vs ${away.avgScored}.`,
        `Solidité défensive : ${home.avgConceded} vs ${away.avgConceded}.`
      ];

      return {
        prediction,
        confidence,
        bustProbability,
        isDoubt,
        probs: { homeWinProb, drawProb, awayWinProb },
        facts,
        home,
        away
      };
    }

/* ================== LOAD MATCHES ================== */
async function loadMatches() {
  try {
    setStatus("chargement...", "info");
    matchesEl.innerHTML = "";
    errorBox.classList.add("hidden");

    const leagueId = leagueEl.value;
    const date = dateEl.value;
    const windowSize = Number(windowEl.value);
    const league = LEAGUES.find(l => l.id === leagueId);

    const season = seasonForDate(date, league.seasonType);

    const url = `${API_BASE}/eventsseason.php?id=${leagueId}&s=${season}`;
    const data = await fetchJSON(url);

    state.seasonEvents = data.events || [];

    let filtered = state.seasonEvents.filter(ev => {
      const d = dateOnly(eventDate(ev));
      const diff = Math.abs(new Date(d) - new Date(date)) / (1000*60*60*24);
      return diff <= windowSize;
    });

    if (!includeFinishedEl.checked) {
      filtered = filtered.filter(isUpcoming);
    }

    state.matches = uniqueById(filtered);
    state.lastUpdated = new Date();

    renderMatches();
    setStatus("ok", "success");

  } catch (e) {
    console.error(e);
    errorBox.textContent = "Erreur lors du chargement des données.";
    errorBox.classList.remove("hidden");
    setStatus("erreur", "error");
  }
}

/* ================== RENDER MATCHES ================== */
function renderMatches() {
  if (!state.matches.length) {
    matchesEl.innerHTML = "<div class='text-slate-400'>Aucun match trouvé.</div>";
    return;
  }

  let list = [...state.matches];

  list.sort((a, b) => {
    if (state.sort === "date") return eventDate(a) - eventDate(b);

    const A = buildAnalysis(a);
    const B = buildAnalysis(b);

    if (state.sort === "confidence") return B.confidence - A.confidence;
    if (state.sort === "bust") return A.bustProbability - B.bustProbability;

    return 0;
  });

  matchesEl.innerHTML = list.map(m => {
    const a = buildAnalysis(m);

    return `
      <div class="match-card glass rounded-2xl p-4 cursor-pointer"
           onclick="selectMatch('${m.idEvent}')">

        <div class="flex justify-between mb-2">
          <div class="font-semibold">${m.strHomeTeam} vs ${m.strAwayTeam}</div>
          <div class="text-xs text-slate-400">${fmtDate(eventDate(m))}</div>
        </div>

        <div class="text-sm text-slate-300 mb-2">
          Prono: <b>${a.prediction}</b>
        </div>

        <div class="text-xs text-slate-400">
          Confiance: ${a.confidence}% | Risque: ${a.bustProbability}%
        </div>

        <div class="progress mt-2 h-2">
          <span style="width:${a.confidence}%; background:#00e676"></span>
        </div>
      </div>
    `;
  }).join("");
}

/* ================== SELECT MATCH ================== */
function selectMatch(id) {
  const match = state.matches.find(m => m.idEvent === id);
  if (!match) return;

  state.selected = match;
  renderDetail();
}

/* ================== RENDER DETAIL ================== */
function renderDetail() {
  if (!state.selected) return;

  const m = state.selected;
  const a = buildAnalysis(m);

  detailEl.innerHTML = `
    <div class="text-lg font-bold mb-2">
      ${m.strHomeTeam} vs ${m.strAwayTeam}
    </div>

    <div class="text-sm text-slate-400 mb-3">
      ${fmtDate(eventDate(m))}
    </div>

    <div class="mb-3">
      <div>🏆 Prédiction : <b>${a.prediction}</b></div>
      <div>📊 Confiance : ${a.confidence}%</div>
      <div>⚠️ Risque : ${a.bustProbability}%</div>
    </div>

    <div class="mb-3">
      <div class="text-sm font-semibold mb-1">Probabilités</div>
      <div>Victoire domicile : ${a.probs.homeWinProb}%</div>
      <div>Nul : ${a.probs.drawProb}%</div>
      <div>Victoire extérieur : ${a.probs.awayWinProb}%</div>
    </div>

    <div>
      <div class="text-sm font-semibold mb-1">Analyse</div>
      ${a.facts.map(f => `<div class="text-xs text-slate-400">• ${f}</div>`).join("")}
    </div>
  `;
}

/* ================== AUTO REFRESH ================== */
function toggleAutoRefresh() {
  state.autoRefresh = !state.autoRefresh;

  if (state.autoRefresh) {
    autoBtn.textContent = "Auto: ON";
    state.timer = setInterval(loadMatches, 60000);
  } else {
    autoBtn.textContent = "Auto: OFF";
    clearInterval(state.timer);
  }
}

/* ================== CLEANUP ================== */
window.addEventListener('beforeunload', () => {
  if (state.timer) clearInterval(state.timer);
});

/* ================== INIT ================== */
init();