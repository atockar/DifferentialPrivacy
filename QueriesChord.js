/*
 - Copyright 2014 Neustar, Inc.
 -
 - Licensed under the Apache License, Version 2.0 (the "License");
 - you may not use this file except in compliance with the License.
 - You may obtain a copy of the License at
 -
 -     http://www.apache.org/licenses/LICENSE-2.0
 -
 - Unless required by applicable law or agreed to in writing, software
 - distributed under the License is distributed on an "AS IS" BASIS,
 - WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 - See the License for the specific language governing permissions and
 - limitations under the License.
 */

/** Draws unprivatized (i.e. raw) chord diagram */
function chord() {
  d3.selectAll("#svgGraph").remove();
  hideMap();
  showText();

  rawMx = [
    [3246, 838, 158, 500, 615, 1120],
    [1074, 578,  38,  91, 401,  763],
    [151,   39,  13,  27,  30,   64],
    [474,   81,  17, 196,  85,   94],
    [564,  216,  23,  92, 218,  544],
    [1422, 736,  61, 123, 585, 1407]
  ];

  neighborhoods = ["East Village", "Greenwich Village", "Little Italy",
                      "Lower East Side", "SoHo", "West Village"];
  neighborhoods_abbr = ["EV", "GV", "LI", "LES", "SH", "WV"];

  var chord = d3.layout.chord()
      .padding(.05)
      .sortSubgroups(d3.descending)
      .matrix(rawMx);

  var innerRadius = Math.min(width/2, height*1.1) * .4,
      outerRadius = innerRadius * 1.1;

  var fill = d3.scale.ordinal()
      .domain(d3.range(6))
      .range(["#fc8d59", "#fee090", "#ffffbf", "#e0f3f8", "#91bfdb", "#4575b4"]);

  var total = 0;
  for (var i=0; i<chord.groups().length; i++) {
    total += chord.groups()[i].value;
  };

  // SVG
  svg = d3.select("#holder").append("svg")
      .attr("width", width/2)
      .attr("height", height*1.1)
      .attr("display", "inline-block")
      .attr("id", "svgGraph")
      .attr("class","pad")
    .append("g")
      .attr("transform", "translate(" + width / 4 + "," + height*1.1 / 2 + ")");

  // Groups
  svg.append("g").selectAll("path")
      .data(chord.groups)
    .enter().append("path")
      .style("fill", function(d) { return fill(d.index); })
      .style("stroke", function(d) { return fill(d.index); })
      .attr("d", d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius))
      .on("mouseover", function(d,i) {return mouseoverGroup(d,i,total,svg);})
      .on("mouseout", function(d,i) {return mouseout(d,i,svg);});

  // Path
  svg.append("g")
      .attr("class", "chord")
    .selectAll("path")
      .data(chord.chords)
    .enter().append("path")
      .attr("d", d3.svg.chord().radius(innerRadius))
      .style("fill", function(d) { return fill(d.target.index); })
      .style("opacity", 1)
      .on("mouseover", function(d,i) {return mouseoverChord(d,i,total,svg);})
      .on("mouseout", function(d) {d3.select("#tooltip").style("visibility", "hidden")});

  // Text labels
  svg.append("g").selectAll("g")
      .data(chord.groups)
    .enter().append("text")
      .each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
      .attr("dy", ".35em")
      .attr("font-weight", "bold")
      .attr("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
      .attr("transform", function(d) {
        return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
            + "translate(" + (outerRadius + 10) + ")"
            + (d.angle > Math.PI ? "rotate(180)" : "");
      })
      .text(function(d) { return neighborhoods_abbr[d.index]; });

  // Heading
  svg.selectAll("div").append("div")
      .data(["Actual"])
      .enter()
    .append("text")
      .attr("class", "chordheading")
      .attr("transform", "translate(0,"+(-height/2 + 10)+")")
    .text(function(d) {return d;})

  refreshNoise();
}

/** Adds noise to raw data and graphs it */
function refreshChord() {
  d3.select("#chordPriv").remove();

  var privMx = [],
      sensitivity = 18,
      eps = document.getElementById("budgetSlider").value;

  for(var i=0; i<6; i++) {
    privMx[i] = new Array(6);
    for(var j=0; j<6; j++) {
      privMx[i][j] = Math.max(0,Math.round(rawMx[i][j] + laplaceRV(sensitivity, eps)));
    }
  };

  var chord = d3.layout.chord()
      .padding(.05)
      .sortSubgroups(d3.descending)
      .matrix(privMx);

  var innerRadius = Math.min(width/2, height*1.1) * .4,
      outerRadius = innerRadius * 1.1;

  var fill = d3.scale.ordinal()
      .domain(d3.range(6))
      .range(["#fc8d59", "#fee090", "#ffffbf", "#e0f3f8", "#91bfdb", "#4575b4"]);

  var total = 0;
  for (var i=0; i<chord.groups().length; i++) {
    total += chord.groups()[i].value;
  };

  // SVG
  svg2 = d3.select("#holder").append("svg")
      .attr("width", width/2)
      .attr("height", height*1.1)
      .attr("display", "inline-block")
      .attr("id","chordPriv")
      .attr("class","pad")
    .append("g")
      .attr("transform", "translate(" + width / 4 + "," + height*1.1 / 2 + ")");

  // Groups
  svg2.append("g").selectAll("path")
      .data(chord.groups)
    .enter().append("path")
      .style("fill", function(d) { return fill(d.index); })
      .style("stroke", function(d) { return fill(d.index); })
      .attr("d", d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius))
      .on("mouseover", function(d,i) {return mouseoverGroup(d,i,total,svg2);})
      .on("mouseout", function(d,i) {return mouseout(d,i,svg2);});

  // Path
  svg2.append("g")
      .attr("class", "chord")
    .selectAll("path")
      .data(chord.chords)
    .enter().append("path")
      .attr("d", d3.svg.chord().radius(innerRadius))
      .style("fill", function(d) { return fill(d.target.index); })
      .style("opacity", 1)
      .on("mouseover", function(d,i) {return mouseoverChord(d,i,total,svg2);})
      .on("mouseout", function(d) {d3.select("#tooltip").style("visibility", "hidden")});

  // Text labels
  svg2.append("g").selectAll("g")
      .data(chord.groups)
    .enter().append("text")
      .each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
      .attr("dy", ".35em")
      .attr("font-weight", "bold")
      .attr("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
      .attr("transform", function(d) {
        return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
            + "translate(" + (outerRadius + 10) + ")"
            + (d.angle > Math.PI ? "rotate(180)" : "");
      })
      .text(function(d) { return neighborhoods_abbr[d.index]; });

  // Heading
  svg2.selectAll("div").append("div")
      .data(["Privatized"])
      .enter()
    .append("text")
      .attr("class", "chordheading")
      .attr("transform", "translate(0,"+(-height/2 + 10)+")")
    .text(function(d) {return d;})
}
/** Contents for tooltip on mouseover chord border */
function groupTip (d, i, total) {
  var p = d3.format(".1%"), q = d3.format(",f");
  return neighborhoods[i] + ":<br>"
          + p(d.value/total) + " of total";
}
/** Contents for tooltip on mouseover chord path */
function chordTip (d, i, total) {
  var p = d3.format(".1%");
  return neighborhoods[d.source.index]
    + " â†’ " + neighborhoods[d.target.index]
    + ": " + p(d.source.value/total)
    + "<br>" + neighborhoods[d.target.index]
    + " â†’ " + neighborhoods[d.source.index]
    + ": " + p(d.target.value/total);
}
/** Displays tooltip on mouseover chord border, also fades unassociated chord paths */
function mouseoverGroup(d, i, total, svg) {
  d3.select("#tooltip")
    .style("visibility", "visible")
    .html(groupTip(d,i,total))
    .style("top", function () { return (d3.event.pageY - 50)+"px"})
    .style("left", function () { return (d3.event.pageX - 50)+"px";})

  // Fade
  svg.selectAll(".chord path")
    .filter(function(d) { return d.source.index != i && d.target.index != i; })
    .transition()
    .style("opacity", .1);
}
/** Displays tooltip on mouseover chord path */
function mouseoverChord(d, i, total, svg) {
  d3.select("#tooltip")
    .style("visibility", "visible")
    .html(chordTip(d,i,total))
    .style("top", function () { return (d3.event.pageY - 50)+"px"})
    .style("left", function () { return (d3.event.pageX - 50)+"px";})
}
/** Hides tooltips and unfades on mouseout */
function mouseout(d, i, svg) {
  d3.select("#tooltip").style("visibility", "hidden");
  svg.selectAll(".chord path")
    .filter(function(d) { return d.source.index != i && d.target.index != i; })
    .transition()
    .style("opacity", 1);;
}
/** Displays the text corresponding to the trip popularity tab */
function chordText() {
  document.getElementById("hoursText").style.display = 'none';
  document.getElementById("incomeText").style.display = 'none';
  document.getElementById("pickupsText").style.display = 'none';
  document.getElementById("chordText").style.display = 'block';
}