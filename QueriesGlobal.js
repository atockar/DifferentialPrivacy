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

/* Global variables and functions */

// Define SVG size
var margin = {top: 30, right: 20, bottom: 30, left: 50},
    width = 700 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

// Used across functions
var svg, svg2,
    avgHours, indHours,
    indIncome, avgIncome,
    allMap, indMap, all100, ind100, initialized = false,
    rawMx, neighborhoods, neighborhoods_abbr;

// Formats
var formatValue = d3.format(",.0f"),
    formatValue2 = d3.format(",.1f");

// Colors
var colors = ["#b4cee5","#cc0000","rgba(255,187,136,0.6)","rgba(255,136,136,0.6)","#ffbb88"];

/** Initializes the program */
function init() {
  window.onload = function() {hours();}
}

/** Refreshes noise for displayed graphic */
function refreshNoise() {
  printBudget();
  if(document.getElementById('hours').checked == true)  refreshHours();
  else if(document.getElementById('driverIncome').checked == true)  refreshIncome();
  else if(document.getElementById('pickups').checked == true) refreshPickups();
  else if(document.getElementById('chord').checked == true) refreshChord();
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
/** Hides the map SVG */
function hideMap() {
  document.getElementById("allMap").style.display = 'none';
  document.getElementById("indMap").style.display = 'none';
}
/** Shows the text for the displayed graphic */
function showText() {
  if(document.getElementById('hours').checked == true)  hoursText();
  else if(document.getElementById('driverIncome').checked == true)  incomeText();
  else if(document.getElementById('pickups').checked == true) pickupsText();
  else if(document.getElementById('chord').checked == true) chordText();
}