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

/** Initializes maps and raw data */
function pickups() {
  d3.selectAll("#svgGraph").remove();
  d3.select("#chordPriv").remove();
  showMap();
  showText();
  
  // Initialize maps
  if(initialized == false) {

    d3.select("#allMap")
      .style("width", (width + margin.left + margin.right)/2 + "px")
      .style("height", height + margin.top + margin.bottom + "px");
      
    var layer = new L.StamenTileLayer("toner-lite");
    allMap = new L.map('allMap', {
      center: new L.LatLng(40.74, -73.98),
      zoom: 12
    });
    allMap.addLayer(layer);
    allMap._initPathRoot();
    allMap.invalidateSize();

    d3.select("#indMap")
      .style("width", (width + margin.left + margin.right)/2 + "px")
      .style("height", height + margin.top + margin.bottom + "px");
      
    var layer2 = new L.StamenTileLayer("toner-lite");
    indMap = new L.map('indMap', {
      center: new L.LatLng(40.74, -73.98),
      zoom: 12
    });
    indMap.addLayer(layer2);
    indMap._initPathRoot();
    indMap.invalidateSize();
  }
  initialized = true;

  // Pick up SVG from map objects
  svg = d3.select("#allMap").select("svg");
  svg2 = d3.select("#indMap").select("svg");

  // Raw Data
  mapData();

  refreshNoise();
}

/** Adds noise to the raw coordinates and displays now privatized map */
function refreshPickups() {

  // Define map dimensions
  var latitude = {min: 40.6, max: 40.9},
      longitude = {min: -74.1, max: -73.7};
  latitude.range = latitude.max - latitude.min
  longitude.range = longitude.max - longitude.min;
  var corners = {};
  corners.topLeft = new L.LatLng(latitude.max, longitude.min);
  corners.bottomRight = new L.LatLng(latitude.min, longitude.max);

  // Create grid
  var allGrid = createGrid(40, latitude, longitude),
      indGrid = createGrid(40, latitude, longitude);

  // Classify coordinates into correct grid square
  var allGrid = classifyCoords(allGrid, all100),
      indGrid = classifyCoords(indGrid, ind100);

  // Privatize all grid squares
  var sensitivityCnt = 3002,  // maximum pickups for any one driver in any location
      eps = document.getElementById("budgetSlider").value,
      allMax = 0, indMax = 0;

  allGrid.forEach(function(d) {
    d.priv = Math.max(0, d.count + laplaceRV(sensitivityCnt,eps));
    if(d.priv > allMax) allMax = d.priv;
  });
  indGrid.forEach(function(d) {
    d.priv = Math.max(0, d.count + laplaceRV(sensitivityCnt,eps));
    if(d.priv > indMax) indMax = d.priv;
  });

 // Draw squares

  // Translate corners of grid squares into LatLng objects
  allGrid.forEach(function(d) {
      d.topLeft = new L.LatLng(d.latitude.max, d.longitude.min);
      d.bottomRight = new L.LatLng(d.latitude.min, d.longitude.max);
  });
  indGrid.forEach(function(d) {
      d.topLeft = new L.LatLng(d.latitude.max, d.longitude.min);
      d.bottomRight = new L.LatLng(d.latitude.min, d.longitude.max);
  });

  d3.selectAll("#allSquares").remove();
  var allGridRect = svg.selectAll("rect")
      .data(allGrid)
      .enter()
    .append("rect")
      .attr("id", "allSquares")
      .attr("width", function(d) {
        var blockLngRange = d.bottomRight.lng - d.topLeft.lng;
            mapLngRange = allMap.latLngToLayerPoint(corners.bottomRight).x - allMap.latLngToLayerPoint(corners.topLeft).x;
        return (blockLngRange / longitude.range) * mapLngRange;
      })
      .attr("height", function(d) {
        var blockLatRange = d.topLeft.lat - d.bottomRight.lat,
            mapLatRange = allMap.latLngToLayerPoint(corners.bottomRight).y - allMap.latLngToLayerPoint(corners.topLeft).y;
        return (blockLatRange / latitude.range) * mapLatRange;
      })
      .attr("transform", function(d) {
        return "translate(" +
          allMap.latLngToLayerPoint(d.topLeft).x + "," +
          allMap.latLngToLayerPoint(d.topLeft).y + ")";})
      .attr("fill", colors[0])
      .attr("fill-opacity", function(d) {return d.priv/allMax;})
      .attr("stroke", "none");

  d3.selectAll("#indSquares").remove();
  var indGridRect = svg2.selectAll("rect")
      .data(indGrid)
      .enter()
    .append("rect")
      .attr("id", "indSquares")
      .attr("width", function(d) {
        var blockLngRange = d.bottomRight.lng - d.topLeft.lng;
            mapLngRange = indMap.latLngToLayerPoint(corners.bottomRight).x - indMap.latLngToLayerPoint(corners.topLeft).x;
        return (blockLngRange / longitude.range) * mapLngRange;
      })
      .attr("height", function(d) {
        var blockLatRange = d.topLeft.lat - d.bottomRight.lat,
            mapLatRange = indMap.latLngToLayerPoint(corners.bottomRight).y - indMap.latLngToLayerPoint(corners.topLeft).y;
        return (blockLatRange / latitude.range) * mapLatRange;
      })
      .attr("transform", function(d) {
        return "translate(" +
          indMap.latLngToLayerPoint(d.topLeft).x + "," +
          indMap.latLngToLayerPoint(d.topLeft).y + ")";})
      .attr("fill", colors[4])
      .attr("fill-opacity", function(d) {return d.priv/indMax;})
      .attr("stroke", "none");

  allMap.on("viewreset", allUpdate); allUpdate();
  indMap.on("viewreset", indUpdate); indUpdate();

  drawActual(); // So that circles are above grid tiles

  /** Updates the points on the (total) map when the view is changed */
  function allUpdate() {
    allGridRect.attr("transform", function(d) { 
      return "translate("+ 
        allMap.latLngToLayerPoint(d.topLeft).x +","+ 
        allMap.latLngToLayerPoint(d.topLeft).y +")";
    });
    allGridRect.attr("width", function(d) {
        var blockLngRange = d.bottomRight.lng - d.topLeft.lng;
            mapLngRange = allMap.latLngToLayerPoint(corners.bottomRight).x - allMap.latLngToLayerPoint(corners.topLeft).x;
        return (blockLngRange / longitude.range) * mapLngRange;
    });
    allGridRect.attr("height", function(d) {
        var blockLatRange = d.topLeft.lat - d.bottomRight.lat,
            mapLatRange = allMap.latLngToLayerPoint(corners.bottomRight).y - allMap.latLngToLayerPoint(corners.topLeft).y;
        return (blockLatRange / latitude.range) * mapLatRange;
    });
  }
  /** Updates the points on the (individual) map when the view is changed */
  function indUpdate() {
    indGridRect.attr("transform", function(d) { 
      return "translate("+ 
        indMap.latLngToLayerPoint(d.topLeft).x +","+ 
        indMap.latLngToLayerPoint(d.topLeft).y +")";
    });
    indGridRect.attr("width", function(d) {
        var blockLngRange = d.bottomRight.lng - d.topLeft.lng;
            mapLngRange = indMap.latLngToLayerPoint(corners.bottomRight).x - indMap.latLngToLayerPoint(corners.topLeft).x;
        return (blockLngRange / longitude.range) * mapLngRange;
    });
    indGridRect.attr("height", function(d) {
        var blockLatRange = d.topLeft.lat - d.bottomRight.lat,
            mapLatRange = indMap.latLngToLayerPoint(corners.bottomRight).y - indMap.latLngToLayerPoint(corners.topLeft).y;
        return (blockLatRange / latitude.range) * mapLatRange;
    });
  }
}
/** Draws raw points (only top 20) */
function drawActual() {
  d3.selectAll("#allActual").remove();
  d3.selectAll("#indActual").remove();

  // Draw points
  var allCircles = svg.append("g").selectAll("circle")
      .data(all100)
      .enter()
    .append("circle")
      .attr("id", "allActual")
      .attr("r", function(d) {return 10*(d.count/all100[0].count)})
      .attr("stroke", "black")
      .attr("fill", colors[0])
      .attr("fill-opacity", 0.8)
      .on("mouseover", displayActual)
      .on("mouseout", function(d) {d3.select("#tooltip").style("visibility", "hidden");});

  var indCircles = svg2.append("g").selectAll("circle")
      .data(ind100)
      .enter()
    .append("circle")
      .attr("id", "indActual")
      .attr("r", function(d) {return 10*Math.sqrt(d.count/ind100[0].count)})
      .attr("stroke", "black")
      .attr("fill", colors[4])
      .attr("fill-opacity", 0.8)
      .on("mouseover", displayActual)
      .on("mouseout", function(d) {d3.select("#tooltip").style("visibility", "hidden");});
  // 
  allMap.on("viewreset", allUpdate); allUpdate();
  indMap.on("viewreset", indUpdate); indUpdate();

  /** Updates the points on the (total) map when the view is changed */
  function allUpdate() {
    allCircles.attr("transform", function(d) { 
      return "translate(" + 
        allMap.latLngToLayerPoint(d.LatLng).x +","+ 
        allMap.latLngToLayerPoint(d.LatLng).y +")";
    });
  }
  /** Updates the points on the (individual) map when the view is changed */
    function indUpdate() {
    indCircles.attr("transform", function(d) { 
      return "translate(" + 
        indMap.latLngToLayerPoint(d.LatLng).x +","+ 
        indMap.latLngToLayerPoint(d.LatLng).y +")";
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
  grid.forEach(function(d) {
    coordinates.forEach(function(e) {
    if (d.latitude.min < e.LatLng.lat &&
        d.latitude.max >= e.LatLng.lat &&
        d.longitude.min < e.LatLng.lng &&
        d.longitude.max >= e.LatLng.lng) {
          d.count += e.count;
        }
    });
  });
  return grid;
}
/** Shows the map SVG element (hidden for other tabs) */
function showMap() {
  document.getElementById("allMap").style.display = 'inline-block';
  document.getElementById("indMap").style.display = 'inline-block';
}
/**
 * Displays tooltip to show count on mouseover
 * @param {Object} d - the coordinate object
 */
function displayActual(d) {
  d3.select("#tooltip")
    .style("visibility", "visible")
    .html("Number of pickups: " + formatValue(d.count))
    .style("top", function () { return (d3.event.pageY - 35)+"px"})
    .style("left", function () { return (d3.event.pageX - 120)+"px";});
}
/** Displays the text corresponding to the pickup locations tab */
function pickupsText() {
  document.getElementById("hoursText").style.display = 'none';
  document.getElementById("incomeText").style.display = 'none';
  document.getElementById("pickupsText").style.display = 'block';
  document.getElementById("chordText").style.display = 'none';
}