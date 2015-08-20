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
// Define global variables
var margin = {top: 20, right: 30, bottom: 30, left: 40},
    width = 700 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

var rawValues, svg, kde, line;  // these variables are used across functions

/** Initializes the graphic */
function init() {
  window.onload = function() { printBudget(); refreshRaw();}
}

/** Refreshes the raw distribution */
function refreshRaw() {
  // Clear previous graph
  d3.select("svg")
    .remove();

  var dist = document.getElementById('distribution')
      .options[document.getElementById('distribution').selectedIndex]
      .value;

  // CSV files are treated differently - raw data does not change
  if(dist.substr(dist.length-4,dist.length)==".csv")
    refreshCSV(dist);
  else
    refreshStats(dist);
}
/**
 * Reads named CSV file and draws a kernel density plot from its values
 * @param {string} filename - The name of the CSV file to be read
 */
function refreshCSV(filename) {
  d3.text(filename, function(error, raw) {
    rawValues = d3.csv.parseRows(raw).map(function(row) {
      return row.map(function(value) {
        return value;});
    }).map(function(d) {return +d[0];});

    prepareRawGraph(rawValues);
  });
}
/**
 * Generates a sample from a specified statistical distribution and draws a kernel density plot of the sample
 * @param {string} dist - the type of statistical distribution to sample
 */
function refreshStats(dist) {
  // Generate 2000 raw values
  rawValues = [];
  var rv;
  for(i=0; i < 2000; i++) {
    if(dist == "u01")
      rv = Math.random();
    else if(dist == "n01")
      rv = normalRV();
    else if(dist == "n50100")
      rv = normalRV(50,100);
    else if(dist == "g22")
      rv = exponentialRV(2);
    rawValues.push(rv);
  }
  
  prepareRawGraph(rawValues);
}

/**
 * Prepares kernel density plot of the raw values input
 * @param {array[float]} rawValues - an array of floats to be graphed
 */
function prepareRawGraph(rawValues) {
  
  var xDom = {min: d3.min(rawValues), max: d3.max(rawValues)},
      yDom = {min: 0};

  var x = d3.scale.linear()
    .domain([xDom.min, xDom.max])
    .range([0, width]);

  var stdev = sdev(rawValues),
      ticks = Math.min(100, distinct(rawValues));

  // Kernel bandwidth (rule of thumb)
  var bw = 1.06 * stdev * (Math.pow(rawValues.length,-.2));
  
  // Create kernel function
  kde = kernelDensityEstimator(epanechnikovKernel(), bw, x.ticks(ticks));

  yDom.max = maxKDE(kde(rawValues));

  var y = d3.scale.linear()
      .domain([yDom.min, yDom.max])
      .range([height, 0]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");

  line = d3.svg.line()
      .x(function(d) { return x(d[0]); })
      .y(function(d) { return y(d[1]); })
      .interpolate("basis");

  svg = d3.select("#holder").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis);

  addNoise();
}
/**
 * Returns a function that will specify a kernel density plot for a sample array of raw values
 * This function will take as input the sample array and output an array that fully specifies the kernel density plot
 * @param {function} kernel - the kernel density function to use
 * @param {float} scale - the scale, or bandwidth of the kernel plot
 * @param {array[float]} x - the domain of the graph
 * @returns {function()} the function that specifices the kernel density plot
 */
function kernelDensityEstimator(kernel, scale, x) {
  return function(sample) {
    return x.map(function(x) {
      return [x, d3.mean(sample, function(v) { return kernel((x-v)/scale)/scale;})];
    });
  };
}

/** Returns a function that creates an Epanechnikov kernel */
function epanechnikovKernel() {
  return function(u) {
    return Math.abs(u) <= 1 ? .75 * (1 - u * u) : 0;
  };
}
/** Returns a function that creates a Gaussian kernel */
function gaussianKernel() {
  return function(u) {
    return (1 / Math.sqrt(2 * Math.PI))*Math.exp(-0.5 * u * u)
  }
}
/**
 * Calculates the standard deviation of a given array
 * @param {array[float]} arr - the array for which the standard deviation is to be calculated
 * @returns {float} the standard deviation
 */
function sdev(arr) {
    mean = d3.mean(arr);
    sum = 0.0;
    for(i=0; i < arr.length; i++) {
        sum += (arr[i] - mean) * (arr[i] - mean);
    }
    denom = arr.length - 1;
    if (arr.length <= 1) {denom = arr.length;}
    return Math.sqrt(sum / denom);
}
/**
 * Finds the number of distinct objects in a given array
 * @param {array[object]} arr - the array for which the number of distinct objects is to be found
 * @returns {int} the number of distinct objects
 */
function distinct(arr) {
  var counts = {};
  for (i = 0; i < arr.length; i++) {
    counts[arr[i]] = 1 + (counts[arr[i]] || 0);
  }
  return Object.keys(counts).length;
}
/**
 * Finds the maximum point on the kernel density plot
 * @param {array[float]} kdeArr - the kernel density array
 * @returns {float} the maximum point
 */
function maxKDE(kdeArr) {
  var max = 0;
  for(i=0; i < kdeArr.length; i++) {
    if(kdeArr[i][1] > max) {
      max = kdeArr[i][1];
    }
  }
  return max;
}
/**
 * Generates a normally distributed random variable
 * @param {float} mean - the mean of the random variable's distribution
 * @param {float} variance - the variance of the random variable's distribution
 * @returns {float} the normally distributed random variable
 */
function normalRV(mean, variance) {
  if (mean == undefined) mean = 0.0;
  if (variance == undefined) variance = 1.0;
  var V1, V2, S;
  do {
    u1 = 2 * Math.random() - 1;
    u2 = 2 * Math.random() - 1;
    S = u1 * u1 + u2 * u2;
  } while (S >= 1 || S == 0);
  var c = Math.sqrt(-2 * Math.log(S) / S) * u1;
  c = mean + Math.sqrt(variance) * c;
  return c;
}
/**
 * Generates an exponentially distributed random variable
 * @param {float} lambda - the lambda of the distribution
 * @returns {float} the exponentially distributed random variable
 */
function exponentialRV(lambda) {
  var r = Math.random();
  return -Math.log(r) / lambda;
}
/**
 * Generates a Laplace random variable
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
/** Calculates the sensitivity of the query then draws the noisy kernel density plot */
function addNoise() {

  // Histogram approach

  // Put raw values into buckets
  var NUMBUCKETS = 100,
      minVal = d3.min(rawValues);
      range = d3.max(rawValues) - minVal,
      step = range / NUMBUCKETS;
      buckets = [],
      rBuckets = [];

  for(var i=0; i<NUMBUCKETS; i++) {
    buckets.push(minVal + (step * i) + step/2); // centering the buckets for graph
    rBuckets.push(0);
  }
  for(var i=0; i<rawValues.length; i++) {
    var j = Math.floor(NUMBUCKETS*(rawValues[i]-minVal)/range);
    if(j==NUMBUCKETS) j--;
    rBuckets[j]++;
  }

  // Add noise to count in each bucket (sensitivity is 1)

  // Read in privacy budget
  var eps = document.getElementById("budgetSlider").value;

  var nBuckets = new Array(NUMBUCKETS);
  for(var i=0; i<NUMBUCKETS; i++) {
    nBuckets[i] = Math.max(0,rBuckets[i] + laplaceRV(1,eps));
  }

  // Translate into density plot
  var nDensity = [];
  for(var i=0; i<NUMBUCKETS; i++) {
    for(var j=0; j<nBuckets[i]; j++) {
      nDensity.push(buckets[i]);
    }
  }

  // Redraw graph showing noisy distribution
  d3.select("#raw_line")
    .remove();

  d3.select("#noisy_line")
    .remove();

  d3.select("#legend")
    .remove();

  svg.append("path")
    .datum(kde(rawValues))
    .attr("id", "raw_line")
    .attr("class", "grey line")
    .attr("d", line)
    .attr("data-legend","Raw data");

  svg.append("path")
    .datum(kde(nDensity))
    .attr("id", "noisy_line")
    .attr("class", "noise line")
    .attr("d", line)
    .attr("data-legend","Privatized");;

  var legend = svg.append("g")
    .attr("id","legend")
    .attr("class","legend")
    .attr("transform","translate(550,30)")
    .style("font-size","12px")
    .call(d3.legend);
}
/** Refreshes the textbox containing the privacy budget (epsilon) */
function printBudget() {
  var x = document.getElementById("budgetTBox");
  var y = document.getElementById("budgetSlider");
  x.value = y.value;
}
/** Runs the addNoise function to refresh the noisy distribution */
function refreshNoise() {
  printBudget();
  addNoise();
}