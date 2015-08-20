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

/**
 * Draws the trip given the coordinates
 * @param {Object} coords - the start and end coordinates of the trip
 */
function init(coords) {
  d3.select("#map")
    .style("width", width + margin.left + margin.right + "px")
    .style("height", height + margin.top + margin.bottom + "px");
    
  var map = L.map('map').setView([40.743, -73.995], 13);
  mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';
  mapquestLink = '<a href="http://www.mapquest.com/">MapQuest</a>';
  mapquestPic = '<img src="http://developer.mapquest.com/content/osm/mq_logo.png">';
  L.tileLayer(
    'http://otile{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.png', {
    attribution: '&copy; '+mapLink+'. Tiles courtesy of '+mapquestLink+mapquestPic,
    maxZoom: 18,
    subdomains: '1234',
    }).addTo(map);
        
  map._initPathRoot();

  var svg = d3.select("#map").select("svg");

  for(var i=0; i<coords.length;i++) {
    var point = coords[i];
    point.LatLng = new L.LatLng(point.coordinate.split(",")[1],point.coordinate.split(",")[0]);
  }

  var fill = ["red","green","blue"];

  var textBG = svg.selectAll("rect")
      .data(coords)
      .enter()
    .append("rect")
      .attr({
        x: -12,
        y: -6,
        width: 25,
        height: 13,
        rx: 5,
        ry: 5,
        stroke: "black",
        "stroke-width": "0.8px"
      })
      .attr("fill", function(d) {return fill[d.trip%3];});

  var featureText = svg.selectAll("text")
      .data(coords)
      .enter()
    .append("text")
      .text(function(d) {return d.type})
      .attr("x", 0)
      .attr("y", 4)
      .attr("font-size","10px")
      .attr("fill", "white")
      .attr("text-anchor", "middle")
      .on("mouseover", displayAddress)
      .on("mouseout", function(d) {d3.select("#tooltip").style("visibility", "hidden")});

  CustomRouteLayer = MQ.Routing.RouteLayer.extend({
    createStopMarker: function(location, stopNumber) { 
      return L.marker(location.latLng, { icon: L.icon({
          iconUrl: "http://www.mapquestapi.com/staticmap/geticon?uri=poi-red_1.png",
          iconSize: 0})})
        .addTo(map);
  }});

  for(var i=0; i<coords.length/2; i++) {
    var points = [], col = fill[coords[i*2].trip%3];
    points.push(coords[i*2].LatLng);
    points.push(coords[i*2+1].LatLng);

    var dir = MQ.routing.directions();
    dir.route({
      locations: [{latLng: points[0]},{latLng: points[1]}]
    });

    map.addLayer(new CustomRouteLayer({
      directions: dir,
      fitBounds: true,
      draggable: false,
      ribbonOptions: {
        draggable: false,
        ribbonDisplay: {color: col}
      }
    }));
  }

  map.on("viewreset", update);
  update();

  /** Updates the points on the map when the view is changed */
  function update() {
    var fx = function(d) { 
      return "translate("+ 
        map.latLngToLayerPoint(d.LatLng).x +","+ 
        map.latLngToLayerPoint(d.LatLng).y +")";
    };
    textBG.attr("transform", fx);
    featureText.attr("transform", fx);
  }
  /**
   * Displays the address of the point on mouseover
   * @param {Object} d - the coordinate object
   */
  function displayAddress(d) {
    d3.select("#tooltip")
      .style("visibility", "visible")
      .html(d.address)
      .style("top", function () { return (d3.event.pageY - 35)+"px"})
      .style("left", function () { return (d3.event.pageX - 100)+"px";})
  }
}