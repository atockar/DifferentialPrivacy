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

/** Draws the map */
function init() {
  d3.select("#map")
    .style("width", width + margin.left + margin.right + "px")
    .style("height", height + margin.top + margin.bottom + "px");
    
  var map = L.map('map').setView([40.77, -73.84], 10);
  mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';
  mapquestLink = '<a href="http://www.mapquest.com/">MapQuest</a>';
  mapquestPic = '<img src="http://developer.mapquest.com/content/osm/mq_logo.png">';
  L.tileLayer(
    'http://otile{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.png', {
    attribution: '&copy; '+mapLink+'. Tiles courtesy of '+mapquestLink+mapquestPic,
    maxZoom: 18,
    subdomains: '1234',
    }).addTo(map);
        
  map._initPathRoot()

  var svg = d3.select("#map").select("svg");

  d3.csv("stripRaw.csv", function(data) {
    // Create an array of LatLng objects to plot on the map
    var dropoffs = [];
    data.forEach(function(d) {
      var tripEnd = {};
      tripEnd.LatLng = new L.LatLng(+d.dropoff_latitude,+d.dropoff_longitude);
      dropoffs.push(tripEnd);
    });

    // Find clusters by casting a radius around each point and counting all points in that radius
    var clusters = {};
    dropoffs.forEach(function(d, i) {
      dropoffs.forEach(function(e, j) {
        if(d.LatLng.lat < (e.LatLng.lat + 0.001) && d.LatLng.lat > (e.LatLng.lat - 0.001) &&
          d.LatLng.lng < (e.LatLng.lng + 0.001) && d.LatLng.lng > (e.LatLng.lng - 0.001)) {
            if(typeof clusters[i] != "undefined")
              clusters[i] += 1;
            else clusters[i] = 1;
        }
      })
    });
    // Consider the points separately so yellow points show up on top
    var bluePoints = [],
        yellowPoints = [];
    dropoffs.forEach(function(d, i) {
      if(clusters[i] > 10)
        yellowPoints.push(d);
      else bluePoints.push(d);
    });

    var blue = svg.append("g").selectAll("circle")
        .data(bluePoints)
        .enter()
      .append("circle")
        .style("stroke", "black")
        .style("fill", "blue")
        .attr("r", 3);

    var yellow = svg.append("g").selectAll("circle")
        .data(yellowPoints)
        .enter()
      .append("circle")
        .style("stroke", "black")
        .style("fill", "yellow")
        .attr("r", 3);

    map.on("viewreset", update);
    update();

    /** Updates the points on the map when the view is changed */
    function update() {
      var fx = function(d) { 
        return "translate("+ 
          map.latLngToLayerPoint(d.LatLng).x +","+ 
          map.latLngToLayerPoint(d.LatLng).y +")";
      };
      blue.attr("transform", fx);
      yellow.attr("transform", fx);
    }
  });
}