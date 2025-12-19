// Configuration
const width = 928;
const height = 500;
const margin = { top: 40, right: 30, bottom: 60, left: 80 };

const svg = d3.select("#chart-area")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto; font-family: sans-serif; overflow: visible;");

// Scales
const x = d3.scaleUtc().range([margin.left, width - margin.right]);
const y = d3.scaleLinear().range([height - margin.bottom, margin.top]);

// Axis Groups
const gX = svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`);
const gY = svg.append("g").attr("transform", `translate(${margin.left},0)`);

// --- LABELS ---
// X-Axis Label
svg.append("text")
    .attr("text-anchor", "middle")
    .attr("x", margin.left + (width - margin.left - margin.right) / 2)
    .attr("y", height - 15)
    .attr("fill", "currentColor")
    .style("font-size", "14px")
    .text("Time (UTC)");

// Y-Axis Label
svg.append("text")
    .attr("text-anchor", "middle")
    .attr("transform", `translate(30, ${margin.top + (height - margin.top - margin.bottom) / 2}) rotate(-90)`)
    .attr("fill", "currentColor")
    .style("font-size", "14px")
    .text("Memory Usage (KB)");

// Path element (no clip-path needed if not sliding)
const path = svg.append("path")
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2);

const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.value));

async function update() {
    try {
        const response = await fetch('http://localhost:3000/memory');
        const result = await response.json();

        const data = result.data.map(d => ({
            date: new Date(d.epoch_ms),
            value: +d.RssAnonKB
        })).sort((a, b) => a.date - b.date);

        // Update domains
        x.domain(d3.extent(data, d => d.date));
        y.domain([0, d3.max(data, d => d.value)]).nice();

        // Update Axes (Instant or quick snap)
        gX.call(d3.axisBottom(x));
        gY.call(d3.axisLeft(y).ticks(8, ",f"));

        // Update Path - remove .transition() for an instant jump
        path.datum(data)
            .attr("d", line);

    } catch (error) {
        console.error("Update error:", error);
    }
}

// Initial fetch
update();

// Update at once every 5 seconds (not continuous)
setInterval(update, 5000);