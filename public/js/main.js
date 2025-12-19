const margin = { top: 40, right: 30, bottom: 60, left: 80 };
const width = 450;
const height = 400;

function createChart(containerId, label, color) {
    const svg = d3.select(containerId)
        .append("svg")
        .attr("width", "100%")
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .style("overflow", "visible");

    const x = d3.scaleUtc().range([margin.left, width - margin.right]);
    const y = d3.scaleLinear().range([height - margin.bottom, margin.top]);

    const gX = svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`);
    const gY = svg.append("g").attr("transform", `translate(${margin.left},0)`);

    const path = svg.append("path").attr("fill", "none").attr("stroke", color).attr("stroke-width", 2);

    svg.append("text").attr("x", margin.left + (width-margin.left-margin.right)/2).attr("y", height-15).attr("text-anchor", "middle").text("Time (UTC)");
    svg.append("text").attr("transform", `translate(25, ${height/2}) rotate(-90)`).attr("text-anchor", "middle").style("font-weight", "bold").text(label);

    const tooltip = svg.append("g").style("display", "none");
    tooltip.append("line").attr("stroke", "#ccc").attr("stroke-dasharray", "3,3").attr("y1", margin.top).attr("y2", height - margin.bottom);
    tooltip.append("circle").attr("r", 4).attr("fill", color).attr("stroke", "white").attr("stroke-width", 2);
    const tooltipText = tooltip.append("text").attr("font-size", "10px").attr("y", -10);

    let currentData = [];

    return {
        svgNode: svg.node(),
        xScale: x,
        update: function(data, key) {
            currentData = data.map(d => ({
                date: new Date(d.epoch_ms),
                value: +d[key]
            })).sort((a, b) => a.date - b.date);

            x.domain(d3.extent(currentData, d => d.date));
            y.domain([0, d3.max(currentData, d => d.value)]).nice();

            gX.call(d3.axisBottom(x).ticks(5));
            gY.call(d3.axisLeft(y).ticks(8, ",f"));
            path.datum(currentData).attr("d", d3.line().x(d => x(d.date)).y(d => y(d.value)));
        },
        showTooltip: function(targetDate) {
            if (!currentData.length) return;

            const bisect = d3.bisector(d => d.date).left;
            const i = bisect(currentData, targetDate, 1);
            const d0 = currentData[i - 1];
            const d1 = currentData[i];
            if (!d0 || !d1) return;
            const d = targetDate - d0.date > d1.date - targetDate ? d1 : d0;

            tooltip.style("display", null);
            tooltip.attr("transform", `translate(${x(d.date)}, ${y(d.value)})`);

            const timeFormat = d3.timeFormat("%H:%M:%S");
            tooltipText.text(`${timeFormat(d.date)} | ${d.value.toLocaleString()} KB`)
                       .attr("text-anchor", x(d.date) > width / 2 ? "end" : "start")
                       .attr("dx", x(d.date) > width / 2 ? -10 : 10);
        },
        hideTooltip: () => tooltip.style("display", "none")
    };
}

const rssChart = createChart("#rss-chart", "RSS Anon (KB)", "steelblue");
const vmChart = createChart("#vm-chart", "VM Size (KB)", "orange");
const charts = [rssChart, vmChart];

async function fetchAndUpdate() {
    try {
        const response = await fetch('http://localhost:3000/memory');
        const result = await response.json();
        rssChart.update(result.data, "RssAnonKB");
        vmChart.update(result.data, "VmSizeKB");
    } catch (e) { console.error(e); }
}

d3.selectAll("#rss-chart, #vm-chart").on("mousemove", function(event) {
    const mouseX = d3.pointer(event, rssChart.svgNode)[0];
    const targetDate = rssChart.xScale.invert(mouseX);
    charts.forEach(c => c.showTooltip(targetDate));
}).on("mouseleave", () => charts.forEach(c => c.hideTooltip()));

setInterval(fetchAndUpdate, 5000);
fetchAndUpdate();