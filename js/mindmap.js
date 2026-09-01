/**
 * Themes network: force-directed tag co-occurrence graph.
 * Source data: static snapshot exported from the Mirror app
 * (data/tag-network.json). Warm-paper palette to match the site.
 */

(function () {
  const container = document.getElementById('mindmap');
  if (!container) return;

  fetch('../data/tag-network.json', { cache: 'no-store' })
    .then(r => r.json())
    .then(render)
    .catch(err => {
      console.warn('tag-network load failed', err);
      container.innerHTML = '<p style="padding:1rem;color:var(--text-muted);font-family:var(--font-mono);font-size:12px;">could not load themes network.</p>';
    });

  function render(data) {
    const nodes = data.nodes.map(n => ({ ...n }));
    const links = data.links.map(l => ({ ...l }));

    const palette = {
      bg: 'transparent',
      node: '#a6844e',         // gold accent
      nodeAlt: '#7aaca2',      // teal
      nodeSmall: '#8a7f6f',    // muted brown
      link: 'rgba(120, 96, 60, 0.14)',
      linkHi: 'rgba(166, 132, 78, 0.85)',
      nodeHi: '#c97a6e',       // terracotta
      textDim: '#7d746a',
      textDefault: '#3a352d',
      textHi: '#1c1b1f',
    };

    const width = container.clientWidth;
    const height = container.clientHeight || 520;

    // Clear anything previously rendered
    container.innerHTML = '';

    const svg = d3.select(container).append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('display', 'block');

    // Zoom + pan
    const g = svg.append('g');
    const zoom = d3.zoom().scaleExtent([0.3, 4])
      .on('zoom', (e) => g.attr('transform', e.transform));
    svg.call(zoom);
    svg.on('dblclick.zoom', null);

    // Glow filter for large nodes
    const defs = svg.append('defs');
    const glow = defs.append('filter').attr('id', 'tn-glow')
      .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    glow.append('feGaussianBlur').attr('stdDeviation', 2.5).attr('result', 'blur');
    const merge = glow.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    const radius = c => Math.max(4, Math.log(c + 1) * 3.6 + 2);
    const nodeColor = d => {
      if (d.count >= 200) return palette.node;
      if (d.count >= 100) return palette.nodeAlt;
      return palette.nodeSmall;
    };

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links)
        .id(d => d.id)
        .distance(d => 60 + (1 - (d.strength || 0.3)) * 60)
        .strength(d => Math.min(0.6, (d.strength || 0.3) * 0.5)))
      .force('charge', d3.forceManyBody().strength(d => -radius(d.count) * 12).distanceMax(320))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force('collide', d3.forceCollide().radius(d => radius(d.count) + 5).strength(0.75))
      .force('x', d3.forceX(width / 2).strength(0.04))
      .force('y', d3.forceY(height / 2).strength(0.04))
      .alphaDecay(0.02)
      .velocityDecay(0.42);

    const linkSel = g.append('g').attr('stroke-linecap', 'round')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', palette.link)
      .attr('stroke-opacity', d => Math.max(0.12, (d.strength || 0.2) * 0.55))
      .attr('stroke-width', d => Math.max(0.5, Math.log(d.value + 1) * 0.9));

    const nodeSel = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'grab')
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));

    nodeSel.append('circle')
      .attr('r', d => radius(d.count))
      .attr('fill', d => nodeColor(d))
      .attr('fill-opacity', 0.82)
      .attr('stroke', d => nodeColor(d))
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', 1)
      .style('filter', d => d.count >= 120 ? 'url(#tn-glow)' : 'none');

    // Only label the top ~40% of nodes to avoid clutter
    const counts = nodes.map(n => n.count).sort(d3.ascending);
    const labelThresh = d3.quantile(counts, 0.55) || 0;

    nodeSel.filter(d => d.count >= labelThresh)
      .append('text')
      .text(d => d.name.replace(/_/g, ' '))
      .attr('dy', d => radius(d.count) + 10)
      .attr('text-anchor', 'middle')
      .attr('fill', palette.textDefault)
      .attr('font-family', "'JetBrains Mono', ui-monospace, monospace")
      .attr('font-size', d => Math.min(11, 7.5 + Math.log(d.count + 1) * 0.55) + 'px')
      .attr('pointer-events', 'none')
      .style('paint-order', 'stroke')
      .style('stroke', 'var(--bg-primary, #faf8f3)')
      .style('stroke-width', '3px')
      .style('stroke-linejoin', 'round');

    // Adjacency for hover highlight
    const adj = new Map();
    links.forEach(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      if (!adj.has(s)) adj.set(s, new Set());
      if (!adj.has(t)) adj.set(t, new Set());
      adj.get(s).add(t); adj.get(t).add(s);
    });

    // Tooltip
    container.style.position = 'relative';
    const tip = document.createElement('div');
    Object.assign(tip.style, {
      position: 'absolute', pointerEvents: 'none', opacity: '0',
      background: 'var(--bg-primary, #faf8f3)',
      border: '1px solid var(--border-default, #d4c9b3)',
      borderRadius: '6px',
      padding: '6px 10px',
      color: 'var(--text-primary, #1c1b1f)',
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: '11px',
      boxShadow: '0 4px 12px rgba(28,27,31,0.12)',
      transition: 'opacity 0.15s ease',
      zIndex: '5',
      whiteSpace: 'nowrap',
    });
    container.appendChild(tip);

    nodeSel.on('mouseover', function (event, d) {
      const nbrs = adj.get(d.id) || new Set();
      nodeSel.select('circle')
        .attr('fill-opacity', n => n.id === d.id ? 1 : nbrs.has(n.id) ? 0.85 : 0.15)
        .attr('fill', n => n.id === d.id ? palette.nodeHi : nodeColor(n));
      nodeSel.selectAll('text')
        .attr('fill-opacity', n => (n.id === d.id || nbrs.has(n.id)) ? 1 : 0.15);
      linkSel
        .attr('stroke', l => {
          const s = typeof l.source === 'object' ? l.source.id : l.source;
          const t = typeof l.target === 'object' ? l.target.id : l.target;
          return (s === d.id || t === d.id) ? palette.linkHi : palette.link;
        })
        .attr('stroke-opacity', l => {
          const s = typeof l.source === 'object' ? l.source.id : l.source;
          const t = typeof l.target === 'object' ? l.target.id : l.target;
          return (s === d.id || t === d.id) ? 0.8 : 0.04;
        });

      const rect = container.getBoundingClientRect();
      tip.textContent = `${d.name.replace(/_/g, ' ')}  ·  ${d.count} entr${d.count === 1 ? 'y' : 'ies'}`;
      tip.style.left = (event.clientX - rect.left + 12) + 'px';
      tip.style.top  = (event.clientY - rect.top - 8) + 'px';
      tip.style.opacity = '1';
    })
    .on('mousemove', function (event) {
      const rect = container.getBoundingClientRect();
      tip.style.left = (event.clientX - rect.left + 12) + 'px';
      tip.style.top  = (event.clientY - rect.top - 8) + 'px';
    })
    .on('mouseout', function () {
      nodeSel.select('circle')
        .attr('fill-opacity', 0.82)
        .attr('fill', n => nodeColor(n));
      nodeSel.selectAll('text').attr('fill-opacity', 1);
      linkSel
        .attr('stroke', palette.link)
        .attr('stroke-opacity', d => Math.max(0.12, (d.strength || 0.2) * 0.55));
      tip.style.opacity = '0';
    });

    sim.on('tick', () => {
      const pad = 20;
      nodes.forEach(n => {
        n.x = Math.max(pad, Math.min(width - pad, n.x));
        n.y = Math.max(pad, Math.min(height - pad, n.y));
      });
      linkSel
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Caption with stats
    const stats = data.stats || {};
    if (stats.total_recordings) {
      const caption = document.createElement('div');
      Object.assign(caption.style, {
        position: 'absolute', bottom: '8px', left: '10px',
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: '10.5px', color: 'var(--text-muted, #7d746a)',
        pointerEvents: 'none', letterSpacing: '0.02em',
      });
      caption.textContent = `${stats.total_tags} themes  ·  ${stats.total_cooccurrences} links  ·  from ${stats.total_recordings} notes and recordings`;
      container.appendChild(caption);
    }

    // Resize
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        const w = container.clientWidth;
        const h = container.clientHeight || 520;
        svg.attr('width', w).attr('height', h).attr('viewBox', `0 0 ${w} ${h}`);
        sim.force('center', d3.forceCenter(w / 2, h / 2).strength(0.05));
        sim.force('x', d3.forceX(w / 2).strength(0.04));
        sim.force('y', d3.forceY(h / 2).strength(0.04));
        sim.alpha(0.3).restart();
      }, 120);
    });
  }
})();
