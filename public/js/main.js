/*
*    main.js
*    Mastering Data Visualization with D3.js
*    2.8 - Activity: Your first visualization!
*/

const total_height = 400;
const total_width = 400;

(async function() {
  const svg = d3.select("#chart-area").append("svg")
    .attr("width", total_height)
    .attr("height", total_width);

  const d = (await (await fetch('http://localhost:3000/memory')).json())
    .data
    .forEach(d => console.log(d.epoch_ms))
  console.log(d)
  const data = await d3.json("data/buildings.json")

  const scale = d3.scaleLinear()
    .domain([0,828])
    .range([0,400])


  data.forEach(d => {
    d.height = Number(d.height)
  })

  for (let d in data) {
    if (d.height > 400) {
      throw new Error("buildings taller than 400 are not allowed");
    }
  }

  const rects = svg.selectAll("rect")
    .data(data)

  rects.enter().append("rect")
    .attr("y", (d,i) => total_height - scale(d.height))
    .attr("x", (d, i) => (i * 60))
    .attr("width", 40)
    .attr("height", d => d.height)
    .attr("fill", "grey")
})()
