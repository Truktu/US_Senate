(function () {
  const YEARS = [2024, 2022, 2020, 2018, 2016];
  let currentYear = 2024;
  let currentFilter = 'all';
  let usTopology = null;

  const tooltip = document.getElementById('tooltip');
  const mapEl = document.getElementById('map');

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

  function hideTooltip() {
    tooltip.classList.remove('visible');
  }

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

  function renderSummary() {
    const data = SENATE_DATA[currentYear];
    const results = data ? data.results : {};
    let dCount = 0, rCount = 0;
    Object.values(results).forEach(r => {
      if (r.party === 'D') dCount++;
      else if (r.party === 'R') rCount++;
    });

    const container = document.getElementById('summaryCards');
    container.innerHTML = `
      <div class="summary-card dem-card">
        <span class="s-label">Democrat</span>
        <span class="s-value">${dCount}</span>
      </div>
      <div class="summary-card rep-card">
        <span class="s-label">Republican</span>
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

    window.addEventListener('resize', () => {
      if (usTopology) renderMap();
    });
  }

  init();
})();
