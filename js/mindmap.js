/**
 * Mind Map visualization
 * Force-directed graph of core conceptual themes from the idiolect network.
 * Uses D3.js v7, One Dark palette.
 */

(function () {
  const container = document.getElementById('mindmap');
  if (!container) return;

  // Idiolect network data (embedded to avoid CORS/fetch issues on static site)
  const graphData = {
    nodes: [
      { id: 0, name: "action\nperception", count: 580, is_core: true },
      { id: 1, name: "perception\nfield", count: 194, is_core: true },
      { id: 2, name: "internal\nexternal", count: 156, is_core: true },
      { id: 3, name: "external\nworld", count: 122, is_core: true },
      { id: 4, name: "living\nthings", count: 111, is_core: true },
      { id: 5, name: "building\nblocks", count: 84, is_core: true },
      { id: 6, name: "space\ntime", count: 69, is_core: true },
      { id: 7, name: "hypothesis\nclass", count: 68, is_core: true },
      { id: 8, name: "boundary\nconditions", count: 50, is_core: false },
      { id: 9, name: "multiple\nscales", count: 48, is_core: false },
      { id: 10, name: "self\nnon-self", count: 3, is_core: false },
      { id: 11, name: "coarse\ngraining", count: 2, is_core: false }
    ],
    links: [
      { source: 0, target: 5, value: 71, strength: 0.845 },
      { source: 0, target: 9, value: 43, strength: 0.896 },
      { source: 0, target: 4, value: 95, strength: 0.856 },
      { source: 0, target: 2, value: 132, strength: 0.846 },
      { source: 2, target: 4, value: 34, strength: 0.306 },
      { source: 2, target: 1, value: 62, strength: 0.397 },
      { source: 0, target: 1, value: 164, strength: 0.845 },
      { source: 0, target: 7, value: 59, strength: 0.868 },
      { source: 0, target: 6, value: 55, strength: 0.797 },
      { source: 7, target: 9, value: 8, strength: 0.167 },
      { source: 7, target: 6, value: 6, strength: 0.088 },
      { source: 7, target: 4, value: 14, strength: 0.206 },
      { source: 9, target: 6, value: 4, strength: 0.083 },
      { source: 4, target: 9, value: 8, strength: 0.167 },
      { source: 4, target: 6, value: 18, strength: 0.261 },
      { source: 0, target: 8, value: 44, strength: 0.880 },
      { source: 8, target: 7, value: 10, strength: 0.200 },
      { source: 0, target: 3, value: 100, strength: 0.820 },
      { source: 9, target: 1, value: 13, strength: 0.271 },
      { source: 8, target: 2, value: 14, strength: 0.280 },
      { source: 8, target: 1, value: 13, strength: 0.260 },
      { source: 4, target: 1, value: 46, strength: 0.414 },
      { source: 11, target: 6, value: 1, strength: 0.500 },
      { source: 0, target: 11, value: 2, strength: 1.000 },
      { source: 1, target: 6, value: 27, strength: 0.391 },
      { source: 3, target: 4, value: 36, strength: 0.324 },
      { source: 7, target: 1, value: 15, strength: 0.221 },
      { source: 3, target: 7, value: 20, strength: 0.294 },
      { source: 5, target: 2, value: 18, strength: 0.214 },
      { source: 2, target: 6, value: 18, strength: 0.261 },
      { source: 5, target: 3, value: 19, strength: 0.226 },
      { source: 5, target: 9, value: 10, strength: 0.208 },
      { source: 2, target: 9, value: 13, strength: 0.271 },
      { source: 5, target: 4, value: 8, strength: 0.095 },
      { source: 3, target: 1, value: 43, strength: 0.352 },
      { source: 5, target: 1, value: 25, strength: 0.298 },
      { source: 5, target: 7, value: 13, strength: 0.191 },
      { source: 3, target: 6, value: 9, strength: 0.130 },
      { source: 3, target: 2, value: 11, strength: 0.090 },
      { source: 5, target: 6, value: 7, strength: 0.101 },
    ]
  };

  // Color mapping for nodes
  const coreColors = [
    '#61afef', // action perception - blue
    '#c678dd', // perception field - purple
    '#e5c07b', // internal external - yellow
    '#56b6c2', // external world - cyan
    '#98c379', // living things - green
    '#e06c75', // building blocks - red
    '#61afef', // space time - blue
    '#c678dd', // hypothesis class - purple
  ];

  function getNodeColor(d) {
    if (d.is_core && d.id < coreColors.length) return coreColors[d.id];
    return '#5a6178';
  }

  function getNodeRadius(d) {
    return Math.max(6, Math.sqrt(d.count) * 1.5);
  }

  // Setup SVG
  const width = container.clientWidth;
  const height = container.clientHeight || 400;

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`);

  // Glow filter
  const defs = svg.append('defs');
  const filter = defs.append('filter').attr('id', 'glow');
  filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
  const feMerge = filter.append('feMerge');
  feMerge.append('feMergeNode').attr('in', 'coloredBlur');
  feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

  // Force simulation
  const simulation = d3.forceSimulation(graphData.nodes)
    .force('link', d3.forceLink(graphData.links)
      .id(d => d.id)
      .distance(d => 80 / (d.strength + 0.1))
      .strength(d => d.strength * 0.3)
    )
    .force('charge', d3.forceManyBody().strength(-200))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(d => getNodeRadius(d) + 15));

  // Links
  const link = svg.append('g')
    .selectAll('line')
    .data(graphData.links)
    .join('line')
    .attr('stroke', 'rgba(97, 175, 239, 0.15)')
    .attr('stroke-width', d => Math.max(0.5, d.value / 40));

  // Nodes
  const node = svg.append('g')
    .selectAll('g')
    .data(graphData.nodes)
    .join('g')
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended)
    );

  node.append('circle')
    .attr('r', d => getNodeRadius(d))
    .attr('fill', d => getNodeColor(d))
    .attr('fill-opacity', d => d.is_core ? 0.8 : 0.4)
    .attr('stroke', d => getNodeColor(d))
    .attr('stroke-width', 1)
    .attr('stroke-opacity', 0.5)
    .style('filter', d => d.is_core ? 'url(#glow)' : 'none')
    .style('cursor', 'grab');

  // Labels
  node.each(function(d) {
    const lines = d.name.split('\n');
    const g = d3.select(this);
    lines.forEach((line, i) => {
      g.append('text')
        .text(line)
        .attr('dy', `${(i - (lines.length - 1) / 2) * 1.1 + 0.35}em`)
        .attr('text-anchor', 'middle')
        .attr('fill', d.is_core ? '#e0e6ed' : '#8892b0')
        .attr('font-size', d.is_core ? '9px' : '8px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .attr('pointer-events', 'none')
        .attr('y', getNodeRadius(d) + 12);
    });
  });

  // Tick
  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    node.attr('transform', d => {
      d.x = Math.max(30, Math.min(width - 30, d.x));
      d.y = Math.max(30, Math.min(height - 30, d.y));
      return `translate(${d.x},${d.y})`;
    });
  });

  // Drag functions
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  // Gentle float animation — periodically reheat slightly
  let floatInterval = setInterval(() => {
    simulation.alpha(0.05).restart();
  }, 8000);

  // Resize handler
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight || 400;
    svg.attr('width', w).attr('height', h).attr('viewBox', `0 0 ${w} ${h}`);
    simulation.force('center', d3.forceCenter(w / 2, h / 2));
    simulation.alpha(0.3).restart();
  }

  window.addEventListener('resize', resize);
})();
