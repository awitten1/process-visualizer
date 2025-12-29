import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const bisectDate = d3.bisector(d => new Date(d.epoch_ms)).left;

function LineChart({ data, yAccessor, label, color, hoveredPoint, onHover, unit = '' }) {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const margin = { top: 40, right: 20, bottom: 40, left: 60 };
    const width = 450 - margin.left - margin.right;
    const height = 250 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
      .domain(d3.extent(data, d => new Date(d.epoch_ms)))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, yAccessor) * 1.1])
      .range([height, 0]);

    const line = d3.line()
      .x(d => x(new Date(d.epoch_ms)))
      .y(d => y(yAccessor(d)));

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(6).tickSize(-height).tickFormat(''));

    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(''));

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat('%H:%M:%S')));

    // Y Axis
    g.append('g')
      .call(d3.axisLeft(y));

    // Data Line
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .attr('d', line);

    // Title
    g.append('text')
      .attr('x', width / 2)
      .attr('y', -20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .text(label);

    // Hover Elements
    const focus = g.append('g')
      .style('display', 'none');

    focus.append('line')
      .attr('class', 'hover-line')
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#aaa')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    focus.append('circle')
      .attr('r', 5)
      .attr('fill', color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    const tooltip = focus.append('g')
      .attr('class', 'tooltip-group');

    tooltip.append('rect')
      .attr('width', 110)
      .attr('height', 40)
      .attr('fill', 'rgba(255,255,255,0.95)')
      .attr('stroke', '#ccc')
      .attr('rx', 4);

    tooltip.append('text')
      .attr('class', 'tooltip-val')
      .attr('x', 55)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .attr('fill', '#333');

    tooltip.append('text')
      .attr('class', 'tooltip-time')
      .attr('x', 55)
      .attr('y', 33)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#666');

    // Overlay to capture mouse events
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('transform', `translate(${margin.left},${margin.top})`)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mouseover', () => focus.style('display', null))
      .on('mouseout', () => {
        focus.style('display', 'none');
        onHover(null);
      })
      .on('mousemove', function (event) {
        const x0 = x.invert(d3.pointer(event)[0]);
        const i = bisectDate(data, x0, 1);
        const d0 = data[i - 1];
        const d1 = data[i];
        if (!d1) return;
        const d = x0 - new Date(d0.epoch_ms) > new Date(d1.epoch_ms) - x0 ? d1 : d0;
        onHover(d);
      });

    // Synchronize external hover
    if (hoveredPoint) {
      const d = hoveredPoint;
      focus.style('display', null);
      const posX = x(new Date(d.epoch_ms));
      const posY = y(yAccessor(d));

      focus.select('.hover-line')
        .attr('x1', posX)
        .attr('x2', posX);

      focus.select('circle')
        .attr('cx', posX)
        .attr('cy', posY);

      const tooltipX = posX > width - 120 ? posX - 120 : posX + 10;
      tooltip
        .attr('transform', `translate(${tooltipX},${posY - 50})`);

      tooltip.select('.tooltip-val')
        .text(`${yAccessor(d).toLocaleString()} ${unit}`);

      tooltip.select('.tooltip-time')
        .text(d3.timeFormat('%H:%M:%S')(new Date(d.epoch_ms)));
    } else {
      focus.style('display', 'none');
    }

  }, [data, yAccessor, label, color, hoveredPoint, onHover, unit]);

  return <svg ref={svgRef} width="450" height="250"></svg>;
}

function Graph({ data }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  return (
    <div className="graphs-container">
      <LineChart
        data={data}
        yAccessor={d => d.rss_anon_kb}
        label="RSS Anon"
        unit="KB"
        color="#007bff"
        hoveredPoint={hoveredPoint}
        onHover={setHoveredPoint}
      />
      <LineChart
        data={data}
        yAccessor={d => d.vm_size_kb}
        label="VM Size"
        unit="KB"
        color="#dc3545"
        hoveredPoint={hoveredPoint}
        onHover={setHoveredPoint}
      />
      <LineChart
        data={data}
        yAccessor={d => d.utime_pct}
        label="User CPU (%)"
        unit="%"
        color="#28a745"
        hoveredPoint={hoveredPoint}
        onHover={setHoveredPoint}
      />
      <LineChart
        data={data}
        yAccessor={d => d.stime_pct}
        label="System CPU (%)"
        unit="%"
        color="#ffc107"
        hoveredPoint={hoveredPoint}
        onHover={setHoveredPoint}
      />
      <LineChart
        data={data}
        yAccessor={d => d.minflt}
        label="Minor Faults"
        unit="faults"
        color="#17a2b8"
        hoveredPoint={hoveredPoint}
        onHover={setHoveredPoint}
      />
      <LineChart
        data={data}
        yAccessor={d => d.majflt}
        label="Major Faults"
        unit="faults"
        color="#6f42c1"
        hoveredPoint={hoveredPoint}
        onHover={setHoveredPoint}
      />
      <LineChart
        data={data}
        yAccessor={d => d.num_threads}
        label="Num Threads"
        unit="threads"
        color="#e83e8c"
        hoveredPoint={hoveredPoint}
        onHover={setHoveredPoint}
      />
      <LineChart
        data={data}
        yAccessor={d => d.rchar}
        label="Characters Read"
        unit="char"
        color="#fd7e14"
        hoveredPoint={hoveredPoint}
        onHover={setHoveredPoint}
      />
      <LineChart
        data={data}
        yAccessor={d => d.wchar}
        label="Characters Written"
        unit="char"
        color="#20c997"
        hoveredPoint={hoveredPoint}
        onHover={setHoveredPoint}
      />
    </div>
  );
}

export default Graph;