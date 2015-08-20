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

/** Sets up the display and inputs the raw data */
function driverIncome() {
  d3.selectAll("#svgGraph").remove();
  d3.select("#chordPriv").remove();
  hideMap();
  showText();

  // Specify say 10 points with different incomes
  indIncome = [49745,90679,63721,105733,72334,62102,31103,92902,25731,93392];
  avgIncome = [[0,64834],[1,64834]];

  // Initialize zero graph

  var x = d3.scale.linear()
      .domain([0, 1])
      .range([0, width]);

  var y = d3.scale.linear()
      .domain([0, 150000])
      .range([height, 0]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .ticks(0)
      .orient("bottom");

  var yAxis = d3.svg.axis()
      .scale(y)
      .ticks(5)
      .orient("left")
      .tickFormat(function(d) {return d/1000;});

  svg = d3.select("#holder").append("svg")
      .attr("id", "svgGraph")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  svg.append("g")
      .attr("class", "axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Income ($'000)");

  // Draw bar graph
  var fills = [colors[2],colors[3]];
  var initiate = [];
  for (i=0; i<(indIncome.length*2); i++)  initiate.push(0);

  svg.selectAll("rect")
      .data(initiate)
      .enter()
    .append("rect")
      .attr("x", function(d, i) {
        if(i==0) {return 0;}
        else {return i * (width / (indIncome.length*2)-2.5) + Math.round((i-1)/2)*5;}})
      .attr("width", width / (indIncome.length*2)-2.5)
      .attr("class", "bar")
      .attr("fill", function(d,i) {return fills[i % 2];})
      .attr("y", function(d) {return y(d);})
      .attr("height", function(d) {return height - y(d);});
      
  svg.append("g").attr("id","incomeText").selectAll("text")
      .data(initiate)
      .enter()
    .append("text")
      .text(function(d) {if(d>0) return formatValue(d/1000);})
      .attr("x", function(d, i) {return i * (width / (indIncome.length*2)) + (width / (indIncome.length*2) - 5) / 2;})
      .attr("y", function(d) {return y(d) + 10;})
      .attr("font-family", "sans-serif")
      .attr("font-size", "9px")
      .attr("fill", "black")
      .attr("text-anchor", "middle");

  // Add horizontal lines for average
  var line = d3.svg.line()
          .x(function(d) { return x(d[0]);})
          .y(function(d) { return y(d[1]);});

  svg.append("path")
      .datum(avgIncome)
      .attr("id","avgIncome")
      .attr("class", "line")
      .attr("fill", "none")
      .attr("stroke", colors[0])
      .attr("stroke-width", 6)
      .attr("d", line);

  svg.append("path")
      .datum(avgIncome)
      .attr("id","avgPrivIncome")
      .attr("fill", "none")
      .attr("stroke", colors[1])
      .attr("stroke-width", 1.5)
      .attr("d", line);

  // Text showing averages

  svg.append("g").attr("id", "avgText").selectAll("text")
      .data([avgIncome[0][1],avgIncome[0][1]])
      .enter()
    .append("text")
      .text(function(d,i) {return ["Raw ","Priv "][i] + formatValue2(d/1000);})
      .attr("x", function(d,i) {return -50 + i;})
      .attr("y", function(d,i) {return y(d) - 5 + 16*(1-i);})
      .attr("font-family", "sans-serif")
      .attr("font-size", "11px")
      .attr("fill", function(d,i) {return [colors[0],colors[1]][i];})
      .attr("font-weight", "bold");

  // Add a legend

  //// Ignore - not plotted - needed for legend /////////////////////////////////////////////
  svg.append("circle").attr("fill", colors[0]).attr("data-legend","Actual (All Drivers)");
  svg.append("circle").attr("fill", colors[2]).attr("data-legend","Actual (Individual)");
  svg.append("circle").attr("fill", colors[3]).attr("data-legend","Privatized");
  ///////////////////////////////////////////////////////////////////////////////////////////
  
  var legend = svg.append("g")
    .attr("class","legend")
    .attr("transform","translate(500,30)")
    .style("font-size","12px")
    .call(d3.legend)

  refreshNoise();
}

/** Rather than refreshing the whole graph, transitions changes in income when refreshed */
function refreshIncome() {

  //Refresh data
  var sensAvg = 15.5535;

  var eps = document.getElementById("budgetSlider").value;

  // Privatize individuals using histogram

  // Create histogram buckets (for each individual)
  var minBucket = 0,
      maxBucket = 150000,
      gap = 10000,
      buckets = {};
  for(var i=0; i<indIncome.length; i++) {
    buckets[i] = {};
    for(var j=minBucket; j<maxBucket; j+=gap) {
      buckets[i][j] = 0;
    }
  }

  // Assign actual data to correct bucket
  for(var i=0; i<indIncome.length; i++) {
    for(var j=minBucket; j<maxBucket; j+=gap) {
      if(indIncome[i] >= j && indIncome[i] < (j+gap))
        buckets[i][j]++;
    }
  }

  // Privatize each bucket
  var privBuckets = {};
  for(var i=0; i<indIncome.length; i++) {
    privBuckets[i] = {};
    for(var j=minBucket; j<maxBucket; j+=gap) {
      privBuckets[i][j] = buckets[i][j] + laplaceRV(1,eps);
    }
  }

  // Take maximum, for simplicity
  var indIncomePriv = [];
  for(var i=0; i<indIncome.length; i++) {
    var max = 0, maxB = 0;
    for(var j=minBucket; j<maxBucket; j+=gap) {
      if(privBuckets[i][j] > max) {
        max = privBuckets[i][j];
        maxB = j;
      }
    }
    indIncomePriv.push(maxB+gap/2);
  }

  // Combine for graphing
  var income = [];
  for(var i=0; i<indIncome.length; i++) {
    income.push(indIncome[i]);
    income.push(indIncomePriv[i]);
  }

  // Bar graph

  var x = d3.scale.linear()
      .domain([0, 1])
      .range([0, width]);

  var y = d3.scale.linear()
      .domain([0, 150000])
      .range([height, 0]);

  svg.selectAll("rect")
      .data(income)
    .transition()
    .duration(1000)
      .attr("y", function(d) {return y(d);})
      .attr("height", function(d) {return height - y(d);});
  
  svg.select("#incomeText").selectAll("text")
      .data(income)
    .transition()
    .duration(1000)
      .text(function(d) {if(d>0) return formatValue(d/1000);})
      .attr("y", function(d) {return y(d) + 10;});

  // Average lines
  line = d3.svg.line()
        .x(function(d) { return x(d[0]);})
        .y(function(d) { return y(d[1]);});

  svg.select("#avgIncome")
    .transition()
    .duration(1000)
      .attr("d", line);

  var avgIncPriv_value = avgIncome[0][1] + laplaceRV(sensAvg,eps),
      avgIncPriv = [[0,avgIncPriv_value],[1,avgIncPriv_value]];

  svg.select("#avgPrivIncome")
      .datum(avgIncPriv)
    .transition()
    .duration(1000)
      .attr("d", line);

  svg.select("#avgText").selectAll("text")
      .data([avgIncome[0][1],avgIncPriv_value])
    .transition()
    .duration(1000)
      .text(function(d,i) {return ["Raw ","Priv "][i] + formatValue2(d/1000);})
      .attr("y", function(d,i) {
        if(avgIncome[0][1] > avgIncPriv_value)
          return y(d) - 5 + 16*i;
        else return y(d) - 5 + 16*(1-i);
      });
}

/** Displays the text corresponding to the driver income tab */
function incomeText() {
  document.getElementById("hoursText").style.display = 'none';
  document.getElementById("incomeText").style.display = 'block';
  document.getElementById("pickupsText").style.display = 'none';
  document.getElementById("chordText").style.display = 'none';
}