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
 * @param {array[object]} coordinates - the coordinates from the actual query result
 * @param {int} sideLength - the number of squares on each side of the grid
 */
function init(coordinates, sideLength) {
  printBudget();
  d3.select("#map")
    .style("width", width + margin.left + margin.right + "px")
    .style("height", height + margin.top + margin.bottom + "px");
  
  var layer = new L.StamenTileLayer("toner");
  map = new L.map('map', {
    center: new L.LatLng(40.745, -73.99),
    zoom: 12
  });
  map.addLayer(layer);
        
  map._initPathRoot();

  drawSquares(coordinates, sideLength);
  histogram(coordinates);
}
/**
 * Privatizes the query and draws the 'histogram' over the map
 * @param {array[object]} coordinates - the coordinates from the actual query result
 * @param {int} sideLength - the number of squares on each side of the grid
 */
function drawSquares(coordinates, sideLength) {

  // Define map dimensions
  var latitude = {min: 40.6, max: 40.9},
      longitude = {min: -74.1, max: -73.7};
  latitude.range = latitude.max - latitude.min
  longitude.range = longitude.max - longitude.min;
  var wholeMap = {};
  wholeMap.topLeft = new L.LatLng(latitude.max, longitude.min);
  wholeMap.bottomRight = new L.LatLng(latitude.min, longitude.max);

  // Create grid
  var grid = createGrid(sideLength, latitude, longitude, coordinates);

  // Classify coordinates into correct grid square
  grid = classifyCoords(grid, coordinates);

  // Privatize all grid squares
  var eps = document.getElementById("budgetSlider").value,
      maxPriv = 0;
  grid.forEach(function(d) {
      d.priv = Math.max(0, d.count + laplaceRV(1,eps)); // count query has sensitivity of 1
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
      .attr("fill-opacity", function(d) {return (d.priv/maxPriv);})
      .attr("stroke", function(d) {return ["none","blue"][d.actual]})
      .attr("stroke-width", 2);

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
      var square_ij = {latitude: {}, longitude: {}, count: 0, actual: 0};
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
          if (e.correct == 1)
            d.actual = 1;
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
/**
 * Refreshes the map (reruns the init function)
 * @param {array[object]} coordinates - the coordinates from the actual query result
 * @param {int} sideLength - the number of squares on each side of the grid
 */
function refresh(coordinates, sideLength) {
  printBudget();
  d3.selectAll("#squares").remove();
  drawSquares(coordinates, sideLength);
  histogram(coordinates);
}
/** Refreshes the textbox containing the privacy budget (epsilon) */
function printBudget() {
  var x = document.getElementById("budgetTBox");
  var y = document.getElementById("budgetSlider");
  x.value = y.value;
}
/**
 * Histogram to deal with fare and tip amounts
 * @param {array[object]} input - the input object with the tip and fare amounts
 */
function histogram(input) {
  document.getElementById("fares").innerHTML = "";

  // Do separately for each input, as we are just taking the maximum for simplicity
  input.forEach(function(d) {
  
    // Create buckets
    // Buckets are for fare amount and tip combined - otherwise we could get tips greater than whole fare amounts!
    var buckets = {},
        fareGap = 5, tipGap = 2,
        maxFareAmount = 60, maxTipAmount = 20;
    for(i=0; (i*fareGap)<=maxFareAmount; i++) {
      for(j=0; (j*tipGap)<=maxTipAmount; j++)
        buckets[i*fareGap+","+j*tipGap] = 0;
    }

    // Put actual amounts in correct bucket
    for(i=0; (i*fareGap)<=maxFareAmount; i++) {
      if(d.fare < (i+1)*fareGap && d.fare >= i*fareGap) {
        for(j=0; (j*tipGap)<=maxTipAmount; j++) {
          if(d.tip < (j+1)*tipGap && d.tip >= j*tipGap)
            buckets[i*fareGap+","+j*tipGap]++;
        }
      }
    }

    // Privatize buckets
    var privBuckets = {},
        eps = document.getElementById("budgetSlider").value;
    for(i=0; (i*fareGap)<=maxFareAmount; i++) {
      for(j=0; (j*tipGap)<=maxTipAmount; j++) {
        if(i*fareGap >= j*tipGap)
          privBuckets[i*fareGap+","+j*tipGap] = Math.max(0,buckets[i*fareGap+","+j*tipGap] + laplaceRV(1,eps));
      }
    }

    // Take maximum and print
    var maxB = 0, fare = 0, tip = 0;
    for(i=0; (i*fareGap)<=maxFareAmount; i++) {
      for(j=0; (j*tipGap)<=maxTipAmount; j++) {
        if(privBuckets[i*fareGap+","+j*tipGap]>maxB) {
          maxB = privBuckets[i*fareGap+","+j*tipGap];
          fare = i*fareGap;
          tip = j*tipGap;
        }
      }
    }
    var dollar = d3.format("$,.0f");
    if(fare == 60) var upperFare = "+";
    else var upperFare = " - " + dollar(fare+5);
    if(tip == 20) var upperTip = "+";
    else var upperTip = " - " + dollar(tip+2);
    var print = "Total Fare: " + dollar(fare) + upperFare + "<br>Tip Amount: " +
      dollar(tip) + upperTip;
    document.getElementById("fares").innerHTML += "<br>" + print + "<br>";

  });
}