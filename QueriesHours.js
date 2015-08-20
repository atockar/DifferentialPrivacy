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

/** Sets up graph to show driver speed per hour */
function hours() {
  d3.selectAll("#svgGraph").remove();
  d3.select("#chordPriv").remove();
  hideMap();
  showText();

  // Raw Data

  // Hours for individual driver - md5(license) = "39C68074F40525E67E6328A533836A90"
  indHours = [
    [0, 16.736],  [1, 15.811],  [2, 17.998],  [3, 19.874],
    [4, 19.625],  [5, 18.85],   [6, 16.67],   [7, 13.694],
    [8, 11.67],   [9, 10.597],  [10, 11.509], [11, 11.357],
    [12, 11.172], [13, 11.092], [14, 11.295], [15, 11.452],
    [16, 11.827], [17, 12.19],  [18, 12.276], [19, 12.9],
    [20, 13.628], [21, 15.371], [22, 16.029], [23, 15.701],
    [24, 16.736]
  ];

  avgHours = [
    [0, 15.71],   [1, 16.374],  [2, 16.883],  [3, 17.55],
    [4, 19.683],  [5, 21.74],   [6, 18.075],  [7, 14.19],
    [8, 11.587],  [9, 11.211],  [10, 11.459], [11, 11.242],
    [12, 11.03],  [13, 11.223], [14, 11.068], [15, 11.076],
    [16, 11.741], [17, 11.429], [18, 11.338], [19, 12.119],
    [20, 13.416], [21, 14.218], [22, 14.613], [23, 15.148],
    [24, 15.71]
  ];

  // Draw raw graph

  // Axes

  var x = d3.scale.linear()
      .domain([0, 24])
      .range([0, width]);

  var y = d3.scale.linear()
      .domain([7.5, 25])
      .range([height/2, 0]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom")
      .tickFormat(function(d) {return d + ":00";});

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");

  // Create top SVG
  svg = d3.select("#holder").append("svg")
      .attr("id", "svgGraph")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height/2 + margin.top)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // Create horizontal line between the two
  var hline = d3.select("#holder").append("div")
                .attr("id", "svgGraph")
                .attr("class", "hline hours");

  // Create bottom SVG
  svg2 = d3.select("#holder").append("svg")
      .attr("id", "svgGraph")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height/2 + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + ",0)");

  // Initiate lines for transition
  var initiate = [];
  for (i=0; i<24; i++)  initiate.push([i,8]);

  svg.append("path")
      .datum(initiate)
      .attr("id", "rawLine")
      .attr("fill", "none")
      .attr("stroke", colors[0])
      .attr("stroke-width", 10)
      .attr("data-legend","Actual (All Drivers)");

  svg.append("path")
      .datum(initiate)
      .attr("id", "privLine")
      .attr("fill", "none")
      .attr("stroke", colors[1])
      .attr("stroke-width", 2)
      .attr("data-legend","Privatized");

  svg2.append("path")
      .datum(initiate)
      .attr("id", "rawLine")
      .attr("fill", "none")
      .attr("stroke", colors[2])
      .attr("stroke-width", 10)
      .attr("data-legend","Actual (Individual)");

  svg2.append("path")
      .datum(initiate)
      .attr("id", "privLine")
      .attr("fill", "none")
      .attr("stroke", colors[1])
      .attr("stroke-width", 2)
      .attr("data-legend","Privatized");

  // Axis labels
  svg2.append("g")
      .attr("class", "axis")
      .attr("transform", "translate(0," + height/2 + ")")
      .call(xAxis)
    .append("text")
      .attr("x", width)
      .attr("y", -6)
      .style("text-anchor", "end")
      .text("Hour of day");

  svg.append("g")
      .attr("class", "axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Speed (mph)");

  svg2.append("g")
      .attr("class", "axis")
      .call(yAxis);

  // Legends
  svg.append("g")
    .attr("class","legend")
    .attr("transform","translate(500,30)")
    .style("font-size","12px")
    .call(d3.legend);

  svg2.append("g")
    .attr("class","legend")
    .attr("transform","translate(500,30)")
    .style("font-size","12px")
    .call(d3.legend);

  refreshNoise();
}

/** Shows effect of privatization by adding privatized bars for each hour */
function refreshHours() {

  // Axis scales
  var x = d3.scale.linear()
            .domain([0, 24])
            .range([0, width]);

  var y = d3.scale.linear()
            .domain([7.5, 25])
            .range([height/2, 0]);

  var line = d3.svg.line()
      .interpolate("basis")
      .x(function(d) { return x(d[0]); })
      .y(function(d) { return y(d[1]); });

  // Privatize
  var eps = document.getElementById("budgetSlider").value;

  graphAllAvg(eps,line);
  graphIndividual(eps,line);

}

/**
 * Draws the plot of all drivers' average speed
 * @param {float} eps - the privacy parameter selected by the user
 * @param {function} line - d3 line function scaled to axes
 */
function graphAllAvg(eps,line) {

  var sensAvg = 0.000003844,
      avgHoursPriv = [];

  for(i=0; i<avgHours.length; i++) {
    var point = [i,avgHours[i][1]];
    point[1] += laplaceRV(sensAvg,eps);
    avgHoursPriv.push(point);
  }

  // Draw lines

  svg.select("#rawLine")
      .datum(avgHours)
    .transition()
    .duration(1000)
      .attr("d", line);

  svg.select("#privLine")
      .datum(avgHoursPriv)
    .transition()
    .duration(1000)
      .attr("d", line);
}

/**
 * Draws the plot of one driver's average speed (hack_license "39C68074F40525E67E6328A533836A90")
 * @param {float} eps - the privacy parameter selected by the user
 * @param {function} line - d3 line function scaled to axes
 */
function graphIndividual(eps,line) {

  // Create histogram buckets
  var minBucket = 7.5,
      maxBucket = 24.5,
      buckets = {};
  for(var i=0; i<24; i++) {
    buckets[i] = {};
    for(var j=minBucket; j<=maxBucket; j++) {
      buckets[i][j] = 0;
    }
  }

  // Assign actual data to correct bucket
  for(var i=0; i<24; i++) {
    for(var j=minBucket; j<=maxBucket; j++) {
      if(indHours[i][1] >= j && indHours[i][1] < (j+1))
        buckets[i][j]++;
    }
  }

  // Privatize each bucket
  var privBuckets = {};
  for(var i=0; i<24; i++) {
    privBuckets[i] = {};
    for(var j=minBucket; j<=maxBucket; j++) {
      privBuckets[i][j] = buckets[i][j] + laplaceRV(1,eps);
    }
  }

  // Take maximum, for simplicity
  var indHoursPriv = [];
  for(var i=0; i<24; i++) {
    var max = 0, maxB = 0;
    for(var j=minBucket; j<=maxBucket; j++) {
      if(privBuckets[i][j] > max) {
        max = privBuckets[i][j];
        maxB = j;
      }
    }
    indHoursPriv.push([i,maxB+0.5]);
  }
  indHoursPriv.push([24, indHoursPriv[0][1]]);

  // Draw lines
  svg2.select("#rawLine")
      .datum(indHours)
    .transition()
    .duration(1000)
      .attr("d", line);

  svg2.selectAll("#privLine")
      .datum(indHoursPriv)
    .transition()
    .duration(1000)
      .attr("d", line);
}
/** Displays the text corresponding to the driver speed tab */
function hoursText() {
  document.getElementById("hoursText").style.display = 'block';
  document.getElementById("incomeText").style.display = 'none';
  document.getElementById("pickupsText").style.display = 'none';
  document.getElementById("chordText").style.display = 'none';
}