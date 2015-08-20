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

// Define size of map
var margin = {top: 20, right: 20, bottom: 30, left: 50},
  width = 600 - margin.left - margin.right,
  height = 400 - margin.top - margin.bottom;
var map;

/**
 * Initializes and draws the map
 * @param {int} sideLength - the number of squares on each side of the grid
 */
function init(sideLength) {
  printBudget();
  d3.select("#map")
    .style("width", width + margin.left + margin.right + "px")
    .style("height", height + margin.top + margin.bottom + "px");
    
  var layer = new L.StamenTileLayer("toner");
  map = new L.map('map', {
    center: new L.LatLng(40.76, -73.9),
    zoom: 11
  });
  map.addLayer(layer);

  map._initPathRoot();

  drawSquares(sideLength);
}
/**
 * Privatizes the query and draws the 'histogram' over the map
 * @param {int} sideLength - the number of squares on each side of the grid
 */
function drawSquares(sideLength) {

  // Define map dimensions
  var latitude = {min: 40.6, max: 40.9},
      longitude = {min: -74.1, max: -73.7};
  latitude.range = latitude.max - latitude.min
  longitude.range = longitude.max - longitude.min;
  var wholeMap = {};
  wholeMap.topLeft = new L.LatLng(latitude.max, longitude.min);
  wholeMap.bottomRight = new L.LatLng(latitude.min, longitude.max);

  // Actual query result
  var Hcoordinates = [];
  d3.csv("stripRaw.csv", function(data) {
    data.forEach(function(d) {
      var coord = {};
      coord.latitude = parseFloat(d.dropoff_latitude);
      coord.longitude = parseFloat(d.dropoff_longitude)
      Hcoordinates.push(coord);
    });

    // Create grid
    var grid = createGrid(sideLength, latitude, longitude, Hcoordinates);

    // Classify coordinates into correct grid square
    grid = classifyCoords(grid, Hcoordinates);

    // Privatize all grid squares
    var eps = document.getElementById("budgetSlider").value,
        maxPriv = 0;
    grid.forEach(function(d) {
        d.priv = Math.max(0, d.count + laplaceRV(20,eps)); // count query likely has sensitivity of around 20 (1 individual)
        if(d.priv > maxPriv) maxPriv = d.priv;
    });

    // Draw squares

    var svg = d3.select("#map").select("svg");

    // Translate corners of grid squares into LatLng objects
    grid.forEach(function(d) {
        d.topLeft = new L.LatLng(d.latitude.max, d.longitude.min);
        d.bottomRight = new L.LatLng(d.latitude.min, d.longitude.max);
    });

    var gridRectangles = svg.selectAll("rect")
        .data(grid)
        .enter()
      .append("rect")
        .attr("id", "squares")
        .attr("width", function(d) {
          var blockLngRange = d.bottomRight.lng - d.topLeft.lng;
              mapLngRange = map.latLngToLayerPoint(wholeMap.bottomRight).x - map.latLngToLayerPoint(wholeMap.topLeft).x;
          return (blockLngRange / longitude.range) * mapLngRange;
        })
        .attr("height", function(d) {
          var blockLatRange = d.topLeft.lat - d.bottomRight.lat,
              mapLatRange = map.latLngToLayerPoint(wholeMap.bottomRight).y - map.latLngToLayerPoint(wholeMap.topLeft).y;
          return (blockLatRange / latitude.range) * mapLatRange;
        })
        .attr("transform", function(d) {
          return "translate(" +
            map.latLngToLayerPoint(d.topLeft).x + "," +
            map.latLngToLayerPoint(d.topLeft).y + ")";})
        .attr("fill", fill)
        .attr("fill-opacity", function(d) {return 0.9*Math.sqrt(d.priv/maxPriv);});

    map.on("viewreset", update);
    update();

    function update() {
      gridRectangles.attr("transform", function(d) { 
        return "translate("+ 
          map.latLngToLayerPoint(d.topLeft).x +","+ 
          map.latLngToLayerPoint(d.topLeft).y +")";
      });
      gridRectangles.attr("width", function(d) {
          var blockLngRange = d.bottomRight.lng - d.topLeft.lng;
              mapLngRange = map.latLngToLayerPoint(wholeMap.bottomRight).x - map.latLngToLayerPoint(wholeMap.topLeft).x;
          return (blockLngRange / longitude.range) * mapLngRange;
      });
      gridRectangles.attr("height", function(d) {
          var blockLatRange = d.topLeft.lat - d.bottomRight.lat,
              mapLatRange = map.latLngToLayerPoint(wholeMap.bottomRight).y - map.latLngToLayerPoint(wholeMap.topLeft).y;
          return (blockLatRange / latitude.range) * mapLatRange;
      });
    }
  });
}
/**
 * Creates a grid based on the map coordinates and number of grid squares
 * @param {int} sideLength - the number of squares on each side of the grid
 * @param {Object} lat - the latitude dimensions of the whole map
 * @param {Object} lng - the longitude dimensions of the whole map
 * @returns {array[Object]} the grid
 */
function createGrid(sideLength, lat, lng) {
  var grid = [];

  for (var i = 0; i<sideLength; i++) {
    var latMin = lat.min + (i/sideLength)*lat.range,
        latMax = lat.min + ((i+1)/sideLength)*lat.range;
    for (var j = 0; j<sideLength; j++) {
      var square_ij = {latitude: {}, longitude: {}, count: 0};
      square_ij.latitude.min = latMin;
      square_ij.latitude.max = latMax;
      square_ij.longitude.min = lng.min + (j/sideLength)*lng.range;
      square_ij.longitude.max = lng.min + ((j+1)/sideLength)*lng.range;
      grid.push(square_ij);
    }
  };
  return grid;
}
/**
 * Increments each grid square when a coordinate is found in it
 * @param {array[object]} grid - the grid
 * @param {array[object]} coordinates - the coordinates
 * @returns {array[object]} the grid, now with a count
 */
function classifyCoords(grid, coordinates) {
  grid.forEach(function(d, i) {
    coordinates.forEach(function(e) {
    if (d.latitude.min < e.latitude &&
        d.latitude.max >= e.latitude &&
        d.longitude.min < e.longitude &&
        d.longitude.max >= e.longitude) {
          d.count++;
        }
    });
  });
  return grid;
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
/** Refreshes the map (reruns the init function) */
function refresh(sideLength) {
  printBudget();
  d3.selectAll("#squares").remove();
  drawSquares(sideLength);
}
/** Refreshes the textbox containing the privacy budget (epsilon) */
function printBudget() {
  var x = document.getElementById("budgetTBox");
  var y = document.getElementById("budgetSlider");
  x.value = y.value;
}