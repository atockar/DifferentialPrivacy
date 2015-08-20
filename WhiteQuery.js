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

// Global variables for the histogram
var margin = {top: 20, right: 20, bottom: 30, left: 50},
    width = 595 - margin.left - margin.right,
    height = 150 - margin.top - margin.bottom;
var svg, data = [],
    TRANSTIME = 25, // Time taken to transition
    stop = false;   // Allow simulator to run
var lastHisto = []; // Retains last histogram so visualization can grow
for(var i=0; i<12; i++) {
  var obj = {"y": height};
  lastHisto.push(obj);
}
// Formats
var comma0dp = d3.format(",.0f"),
    comma1dp = d3.format(",.1f"),
    comma2dp = d3.format(",.2f");

/** Generates the table */
function init() {
  window.onload = function() {printBudget();}

  var tbl = "<table>";
  tbl+= "<tr><th id = 0,0></th><th colspan=2 id = 0,1></th><th id = 0,2></th></tr>";

  var rowCount = 4,
      fieldCount = 4;
  for (var ri = 1; ri < rowCount ; ri++) {
      tbl += "<tr>";
      for (var ci = 0; ci < fieldCount; ci++) {
          tbl += "<td id = " + ri + "," + ci + " style = \"border-top:0px; background:transparent\"></td>";
      }
      tbl += "</tr>";
  }
  tbl += "</table>";
  document.getElementById("pqtbl").innerHTML = tbl;

  // Populate cells
  document.getElementById("0,1").innerHTML = "<font color=\"#5e7185\">Total Income</font>";
  document.getElementById("0,2").innerHTML = "<font color=\"#5e7185\">Mr. White's Income</font>";
  document.getElementById("1,1").innerHTML = "<b>Before the Move</b>";
  document.getElementById("1,2").innerHTML = "<b>After the Move</b>";
  document.getElementById("2,0").innerHTML = "<b>Raw</b>";
  document.getElementById("2,1").innerHTML = "$50,000,000";
  document.getElementById("2,2").innerHTML = "$49,000,000";
  document.getElementById("2,3").innerHTML = "$1,000,000";
  document.getElementById("3,0").innerHTML = "<b>Privatized</b>";

  drawHistogram();
  refreshNoise();
}
/** Creates a new histogram as the distribution has changed */
function refreshHistogram() {
  d3.select("#SVGhisto")
    .remove();

  data = [];

  drawHistogram();
  refreshNoise();
}

/** Refreshes the privatized queries, calculates the difference and prints this in the table */
function refreshNoise() {
  printBudget();
  var eps = document.getElementById("budgetSlider").value,
      sensitivity = 1000000,
      query1 = Math.round(50000000 + laplaceRV(sensitivity,eps/2)),
      query2 = Math.round(49000000 + laplaceRV(sensitivity,eps/2)),
      privIncome = query1 - query2;

  document.getElementById("3,1").innerHTML = formatMoney(query1, 0);
  document.getElementById("3,2").innerHTML = formatMoney(query2, 0);
  document.getElementById("3,3").innerHTML = formatMoney(Math.max(0,privIncome),0);

  updateHistogram(privIncome);
}
/** Initializes the histogram (draws axes) */
function drawHistogram() {

  var x = d3.scale.linear()
      .domain([0, 1])
      .range([0, width]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .ticks(0)
      .orient("bottom");

  svg = d3.select("#histogram").append("svg")
      .attr("id", "SVGhisto")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

  svg.append("g")
      .attr("id", "xaxis")
      .attr("class", "axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);
}
/**
 * Updates the histogram on refresh (i.e. adds an extra bar)
 * @param {float} value - the value of the bar to add
 */
function updateHistogram(val) {

  // Exclude outlying points
  var eps = document.getElementById("budgetSlider").value,
      lap99 = -(1000000/(eps/2))*Math.log(0.02), // 99th percentile of Laplace
      minLap = 1000000-lap99,
      maxLap = 1000000+lap99;

  if(val > minLap && val < maxLap)
    data.push(val); // append income value to list
  else {
    if(data.length == 0)  // to avoid null histogram being printed
      refreshNoise();
    return;
  }

  var x = d3.scale.linear()
      .domain([d3.min(data), d3.max(data)])
      .range([0, width]);

  // Create histogram
  var histo = d3.layout.histogram()
                .bins(thresholds)
                (data);

  // Update scale domains
  x = d3.scale.linear()
      .domain([d3.min(histo, function(d) {return d.x;}),
        d3.max(histo, function(d) {return d.x + d.dx;})])
      .range([0, width]);

  var y = d3.scale.linear()
      .domain([0, d3.max(histo, function(d) {return d.y;})])
      .range([height, 0]);

  var nticks = histo.length * (histo.length > 1);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom")
      .ticks(nticks)
      .tickFormat(formatAxis);

  // Update x axis
  svg.select("#xaxis")
    .transition()
      .duration(TRANSTIME)
      .call(xAxis);

  // Draw histogram
  svg.selectAll("rect").remove();

  var bar = svg.selectAll("rect")
      .data(histo)
      .enter()
    .append("g")
      .attr("class", "bar");

  // Draw bars
  bar.append("rect")
      .attr("x", function(d) {return x(d.x);})
      .attr("y", function(d, i) {
        if(typeof lastHisto[i]  != "undefined")
          return y(lastHisto[i].y);
        else return height;
      })
      .attr("width", width/(histo.length+1))
      .attr("height", function(d, i) {
        if(typeof lastHisto[i] != "undefined")
          return height - y(lastHisto[i].y);
        else return 0;
      })
    .transition()
      .duration(TRANSTIME)
      .attr("y", function(d) {return y(d.y);})
      .attr("height", function(d) {return height-y(d.y);});


  // Draw text
  d3.selectAll("#barText").remove();

  bar.append("text")
      .attr("id", "barText")
      .attr("dy", ".75em")
      .attr("y", function(d, i) {
        if(typeof lastHisto[i]  != "undefined")
          return y(lastHisto[i].y) + 6;
        else return height-10;
      })
      .attr("x", function(d) {return x(d.x)+(width/histo.length)/2-2;})
      .attr("fill", function(d) {
        if(y(d.y)<(height-20)) return "white";
        else return "none";
      })
      .text(function(d) { return comma0dp(d.y); })
    .transition()
      .duration(TRANSTIME)
      .attr("y", function(d) {return y(d.y)+6;});

  lastHisto = histo;
}
/** Executes the correct function and changes button text when play/stop button is pressed */
function change() {
  var button = document.getElementById("sim");
  if (button.innerHTML=="Play Simulation") {
    button.innerHTML = "Stop Simulation";
    simulate(TRANSTIME*2);
  }
  else {
    button.innerHTML = "Play Simulation";
    stopSim();
  }
}
/**
 * Executes the refreshNoise function in an infinite loop with a delay between iterations, essentially to build a large histogram
 * @param {int} milliseconds - the delay in milliseconds
 */
function simulate(milliseconds) {
  stop = false;
  setTimeout(function () {
      refreshNoise();
      if(stop == false)
        simulate(milliseconds);
  }, milliseconds);
}
/** Stops the simulation */
function stopSim() {
  stop = true;
}
/**
 * Generates Laplace random variables
 * @param {float} sensitivity - the sensitivity of the variable used in the query
 * @param {float} eps - the privacy parameter
 * @returns {float} a Laplace random variable
 */
function laplaceRV(sensitivity, eps) {
  var u = 0.5 - Math.random(),
  b = sensitivity / eps;
  if(u<0) {return b * Math.log(1+2*u);}
  else {return -b * Math.log(1-2*u);}
}

/** Refreshes the textbox containing the privacy budget (epsilon) */
function printBudget() {
  var x = document.getElementById("budgetTBox");
  var y = document.getElementById("budgetSlider");
  x.value = y.value;
}
/**
 * Create bins based on epsilon (scale of Laplace distribution)
 * @returns {array[float]} the array of bins needed to input to the histogram layout
 */
function thresholds() {
  var numBins = 12,
      eps = document.getElementById("budgetSlider").value,
      lap99 = -(1000000/(eps/2))*Math.log(0.02), // 99th percentile of Laplace
      minLap = 1000000-lap99,
      maxLap = 1000000+lap99,
      binRange = (maxLap-minLap)/numBins,
      thresholds = [];
  for(var i=0; i<=numBins; i++) {
    var bin = minLap + i*binRange - binRange/2;
    thresholds.push(bin);
  }
  thresholds.push(maxLap + binRange/2);

  return thresholds;
}
/**
 * Formats a number as currency
 * @param {float} number - the number to be converted
 * @param {int} places - the number of decimal places in the output
 * @param {string} symbol - the currency symbol (default is '$')
 * @param {string} thousand - the symbol for thousand separators (default is ',')
 * @param {string} decimal - the symbol for the decimal point (default is '.')
 * @returns {string} the number formatted as currency
 */
function formatMoney(number, places, symbol, thousand, decimal) {
  number = number || 0;
  places = !isNaN(places = Math.abs(places)) ? places : 2;
  symbol = symbol !== undefined ? symbol : "$";
  thousand = thousand || ",";
  decimal = decimal || ".";
  var negative = number < 0 ? "-" : "",
      i = parseInt(number = Math.abs(+number || 0).toFixed(places), 10) + "",
      j = (j = i.length) > 3 ? j % 3 : 0;
  return symbol + negative + (j ? i.substr(0, j) + thousand : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thousand) + (places ? decimal + Math.abs(number - i).toFixed(places).slice(2) : "");
}
/**
 * Formats the x axis in a desirable format - no trailing zeros, etc.
 * @param {float} d - the data point to be formatted
 */
function formatAxis(d) {
  var dmil = d/1000000;
  if(Math.abs(d) > 99999999)
    return comma0dp(dmil)+"m";
  else if(Math.abs(d) > 9999999) {
    var str = comma1dp(dmil);
    if(str.substring(str.length-1,str.length)=="0")
      return comma0dp(dmil)+"m";
    else return comma1dp(dmil)+"m";
  }
  else if(Math.abs(d) > 999999) {
    var str = comma2dp(dmil);
    if(str.substring(str.length-1,str.length)=="0") {
      if(str.substring(str.length-2,str.length-1)=="0")
        return comma0dp(dmil)+"m";
      else return comma1dp(dmil)+"m";
    }
    else return comma2dp(dmil)+"m";
  }
  else if(Math.abs(d) > 99999)
    return comma0dp(d/1000)+"k";
  else return comma0dp(d);
}