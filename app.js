(function () {
  const YEARS = [2024, 2022, 2020, 2018, 2016];
  let currentYear = 2024;
  let currentFilter = 'all';
  let usTopology = null;

  const tooltip = document.getElementById('tooltip');

  function showTooltip(e, content) {
    tooltip.innerHTML = content;
    tooltip.classList.add('visible');
    positionTooltip(e);
  }

  function positionTooltip(e) {
    const x = e.clientX + 14;
    const y = e.clientY - 14;
    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;
    tooltip.style.left = (x + tw > window.innerWidth ? x - tw - 28 : x) + 'px';
    tooltip.style.top = (y + th > window.innerHeight ? y - th - 10 : y) + 'px';
  }

  function hideTooltip() { tooltip.classList.remove('visible'); }

  function buildYearButtons() {
    const container = document.getElementById('yearButtons');
    YEARS.forEach(yr => {
      const btn = document.createElement('button');
      btn.className = 'year-btn' + (yr === currentYear ? ' active' : '');
      btn.textContent = yr;
      btn.addEventListener('click', () => {
        currentYear = yr;
        document.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        render();
      });
      container.appendChild(btn);
    });
  }

  function buildFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentFilter = btn.dataset.filter;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderList();
      });
    });
  }

  function getStateColor(stateName) {
    const data = SENATE_DATA[currentYear];
    if (!data || !data.results[stateName]) return '#d1cfc8';
    const party = data.results[stateName].party;
    if (party === 'D') return '#2563b0';
    if (party === 'R') return '#c0392b';
    return '#d1cfc8';
  }

  function renderMap() {
    const container = document.getElementById('map-container');
    const w = container.clientWidth || 700;
    const h = Math.round(w * 0.62);

    const svg = d3.select('#map')
      .attr('viewBox', `0 0 ${w} ${h}`)
      .attr('width', '100%');

    svg.selectAll('*').remove();

    const projection = d3.geoAlbersUsa()
      .scale(w * 1.25)
      .translate([w / 2, h / 2]);

    const path = d3.geoPath(projection);
    const states = topojson.feature(usTopology, usTopology.objects.states);

    svg.selectAll('path')
      .data(states.features)
      .join('path')
      .attr('class', 'state-path')
      .attr('d', path)
      .attr('fill', d => getStateColor(d.properties.name))
      .on('mousemove', function (e, d) {
        const name = d.properties.name;
        const data = SENATE_DATA[currentYear];
        const result = data && data.results[name];
        let content = '';
        if (result) {
          const partyLabel = result.party === 'D' ? 'Democrat' : 'Republican';
          content = `
            <div class="tooltip-state">${name}</div>
            <span class="tooltip-party ${result.party}">${partyLabel}</span>
            <div class="tooltip-winner">${result.winner}</div>
            <div class="tooltip-pct">${result.pct.toFixed(1)}% of the vote</div>
          `;
        } else {
          content = `
            <div class="tooltip-state">${name}</div>
            <div class="tooltip-no-race">No Senate election in ${currentYear}</div>
          `;
        }
        showTooltip(e, content);
      })
      .on('mouseleave', hideTooltip);
  }

  function renderComposition() {
    const comp = SENATE_COMPOSITION[currentYear];
    if (!comp) return;

    const { D, R, I, majority, majorityLeader } = comp;
    const totalD = D + I; // independents caucus with Dems
    const totalR = R;

    const majorityParty = majority === 'R' ? 'Republican' : 'Democrat';
    const majorityColor = majority === 'R' ? '#c0392b' : '#2563b0';
    const majorityBg = majority === 'R' ? '#fde8e8' : '#dbeafe';

    // Build 100 dots: sorted R first (right side), then D+I (left side)
    // Classic senate semicircle: we'll do rows of dots
    const seats = [];
    for (let i = 0; i < R; i++) seats.push('R');
    for (let i = 0; i < D; i++) seats.push('D');
    for (let i = 0; i < I; i++) seats.push('I');

    const dotsHtml = seats.map((party, idx) => {
      let cls = 'dot-r';
      let title = 'Republican';
      if (party === 'D') { cls = 'dot-d'; title = 'Democrat'; }
      if (party === 'I') { cls = 'dot-i'; title = 'Independent (caucuses with D)'; }
      return `<span class="senate-dot ${cls}" title="${title}"></span>`;
    }).join('');

    const container = document.getElementById('senateWidget');
    container.innerHTML = `
      <div class="senate-majority-banner" style="background:${majorityBg};border-color:${majorityColor}22;">
        <div class="majority-label">Majority after ${currentYear} elections</div>
        <div class="majority-party" style="color:${majorityColor}">${majorityParty}</div>
        <div class="majority-leader">Majority Leader: ${majorityLeader}</div>
      </div>
      <div class="senate-counts">
        <span class="count-item dem-count"><span class="count-dot dot-d"></span>Democrat ${D}${I > 0 ? ` <span class="ind-note">+${I} Ind.</span>` : ''}</span>
        <span class="count-divider">·</span>
        <span class="count-item rep-count"><span class="count-dot dot-r"></span>Republican ${R}</span>
      </div>
      <div class="senate-dots" aria-label="100 Senate seats visualization">
        ${dotsHtml}
      </div>
      <div class="majority-line-label">
        <span>← Democrat</span>
        <span class="majority-line-mid">51 needed for majority</span>
        <span>Republican →</span>
      </div>
    `;
  }

  function renderSummary() {
    const data = SENATE_DATA[currentYear];
    const results = data ? data.results : {};
    let dCount = 0, rCount = 0;
    Object.values(results).forEach(r => {
      if (r.party === 'D') dCount++;
      else if (r.party === 'R') rCount++;
    });

    document.getElementById('summaryCards').innerHTML = `
      <div class="summary-card dem-card">
        <span class="s-label">Seats won (D)</span>
        <span class="s-value">${dCount}</span>
      </div>
      <div class="summary-card rep-card">
        <span class="s-label">Seats won (R)</span>
        <span class="s-value">${rCount}</span>
      </div>
    `;
  }

  function renderList() {
    const data = SENATE_DATA[currentYear];
    const results = data ? data.results : {};
    const container = document.getElementById('resultsList');

    const entries = Object.entries(results)
      .filter(([, r]) => currentFilter === 'all' || r.party === currentFilter)
      .sort((a, b) => a[0].localeCompare(b[0]));

    if (entries.length === 0) {
      container.innerHTML = '<p style="color:#888;font-size:0.8rem;padding:0.5rem 0;">No results found.</p>';
      return;
    }

    container.innerHTML = entries.map(([state, r]) => `
      <div class="result-item">
        <div class="party-badge ${r.party}">${r.party}</div>
        <div class="result-info">
          <div class="result-state">${state}</div>
          <div class="result-winner">${r.winner}</div>
        </div>
        <div class="result-pct">${r.pct.toFixed(1)}%</div>
      </div>
    `).join('');
  }

  function render() {
    renderMap();
    renderSummary();
    renderComposition();
    renderList();
  }

  async function init() {
    buildYearButtons();
    buildFilterButtons();
    try {
      usTopology = await d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');
      render();
    } catch (err) {
      document.getElementById('map-container').innerHTML =
        '<p style="padding:2rem;color:#888;">Failed to load map topology. Please check your internet connection.</p>';
    }
    window.addEventListener('resize', () => { if (usTopology) renderMap(); });
  }

  init();
})();
