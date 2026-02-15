// PlayNoVA — map.js (ES5 safe) — CLUSTERING BY LOCATION (shared clusters, category toggles)

(function () {
  window.addEventListener('load', function () {
    if (!window.L) {
      console.error("Leaflet (L) is not available. Check leaflet.js script loading.");
      return;
    }

    // Requires:
    //  - leaflet.markercluster
    //  - leaflet.featuregroup.subgroup
    // If missing, you’ll see errors like L.markerClusterGroup is not a function.

    var isMobile = window.matchMedia && window.matchMedia("(max-width: 768px)").matches;

    var mapEl = document.getElementById('map');
    if (!mapEl) {
      console.error("Missing #map div.");
      return;
    }

    // 1) Map
    var map = L.map('map', { zoomControl: false }).setView([38.95, -77.35], 10);

    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    // 2) Basemaps
    var cartoLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    });

    var cartoVoyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    });

    var baseMaps = {
      "Light": cartoLight,
      "Voyager": cartoVoyager
    };

    cartoLight.addTo(map);

    // 3) Shared cluster group (ALL categories cluster together by LOCATION)
    var cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 15, // tweak: 15–17 typical
      maxClusterRadius: 22        // tweak: smaller=tighter clusters
    });
    map.addLayer(cluster);

    // 4) Helpers
    // NOTE: neutral gray styling controlled by CSS (poi-halo, legend-dot, glyph color)
    function makeMarkerIcon(categoryClass, faHtml) {
      return L.divIcon({
        className: 'leaflet-div-icon poi-icon ' + categoryClass,
        html:
          '<div class="poi-marker">' +
            '<span class="poi-halo"></span>' +
            '<span class="poi-fa">' + faHtml + '</span>' +
          '</div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        popupAnchor: [0, -9]
      });
    }

    function sportHas(feature, val) {
      var p = (feature && feature.properties) ? feature.properties : {};
      var s = p.sport || "";
      var txt = String(s);

      var parts = txt.split(/[;,]+/);
      for (var i = 0; i < parts.length; i++) {
        if (String(parts[i]).trim() === val) return true;
      }
      return txt.indexOf(val) !== -1;
    }

    // 5) Categories
    var categories = [
      { name: "Animal Scooters",    key: "scooter",     color: "#927fb3", fa: '<i class="fa-solid fa-dragon"></i>',          filter: function (f) { return f.properties && f.properties.attraction === "animal_scooter"; } },
      { name: "Amusement Centers",  key: "arcade",      color: "#d57345", fa: '<i class="fa-solid fa-face-smile"></i>',     filter: function (f) { return f.properties && f.properties.leisure === "amusement_arcade"; } },
      { name: "Animal Parks",       key: "zoo",         color: "#663300", fa: '<i class="fa-solid fa-paw"></i>',            filter: function (f) { return f.properties && f.properties.tourism === "zoo"; } },
      { name: "Bowling",            key: "bowling",     color: "#4d4d4d", fa: '<i class="fa-solid fa-bowling-ball"></i>',   filter: function (f) { return ((f.properties && f.properties.leisure === "bowling_alley") || sportHas(f, "10pin")); } },
      { name: "Carousels",          key: "carousel",    color: "#c77cc4", fa: '<i class="fa-solid fa-horse-head"></i>',     filter: function (f) { return f.properties && f.properties.attraction === "carousel"; } },
      { name: "Climbing Parks",     key: "climbing",    color: "#e68a00", fa: '<i class="fa-solid fa-person-walking"></i>', filter: function (f) { return sportHas(f, "climbing_adventure"); } },
      { name: "Escape Rooms",       key: "escape",      color: "#e9e44b", fa: '<i class="fa-solid fa-puzzle-piece"></i>',   filter: function (f) { return f.properties && f.properties.leisure === "escape_game"; } },
      { name: "Gaming Lounge",      key: "gaming",      color: "#4d4d4d", fa: '<i class="fa-solid fa-gamepad"></i>',        filter: function (f) { return f.properties && f.properties.leisure === "gaming_lounge"; } },
      { name: "Go Karts",           key: "karting",     color: "#4d4d4d", fa: '<i class="fa-solid fa-flag-checkered"></i>', filter: function (f) { return sportHas(f, "karting"); } },
      { name: "Indoor Playgrounds", key: "indoor-play", color: "#006699", fa: '<i class="fa-solid fa-child-reaching"></i>', filter: function (f) { return f.properties && f.properties.leisure === "indoor_play"; } },
      { name: "Indoor Sky Diving",  key: "skydive",     color: "#6F8FAF", fa: '<i class="fa-solid fa-wind"></i>',           filter: function (f) { return sportHas(f, "indoor_skydiving"); } },
      { name: "Laser Tag",          key: "laser",       color: "#6acc99", fa: '<i class="fa-solid fa-bullseye"></i>',       filter: function (f) { return sportHas(f, "laser_tag"); } },
      { name: "Mini Golf",          key: "mini-golf",   color: "#537f69", fa: '<i class="fa-solid fa-golf-ball-tee"></i>',  filter: function (f) { return f.properties && f.properties.leisure === "miniature_golf"; } },
      { name: "Miniature Trains",   key: "train",       color: "#cc2900", fa: '<i class="fa-solid fa-train"></i>',          filter: function (f) { return f.properties && f.properties.attraction === "train"; } },
      { name: "Skating Rinks",      key: "skating",     color: "#0da9b8", fa: '<i class="fa-solid fa-person-skating"></i>', filter: function (f) { return ((f.properties && f.properties.leisure === "ice_rink") || sportHas(f, "ice_skating") || sportHas(f, "roller_skating")); } },
      { name: "Slides", key: "slide", color: "#927fb3", fa: '<i class="fa-solid fa-hill-rockslide"></i>',                   filter: function (f) { return f.properties && f.properties.attraction === "slide"; } },
      { name: "Trampoline Parks",   key: "trampoline",  color: "#a8a563", fa: '<i class="fa-solid fa-person-falling"></i>', filter: function (f) { return f.properties && f.properties.leisure === "trampoline_park"; } },
      { name: "Water Parks",        key: "water-park",  color: "#3a3a80", fa: '<i class="fa-solid fa-water"></i>',          filter: function (f) { return f.properties && f.properties.leisure === "water_park"; } }
    ];

    for (var c = 0; c < categories.length; c++) {
      categories[c].markerIcon = makeMarkerIcon(categories[c].key, categories[c].fa);
    }

    // 6) Legend (unchanged)
    var legend = L.control({ position: isMobile ? "topleft" : "topleft" });

    legend.onAdd = function () {
      var div = L.DomUtil.create("div", "legend");

      var itemsHtml = "";
      for (var i = 0; i < categories.length; i++) {
        var cat = categories[i];
        itemsHtml +=
          '<div class="legend-item">' +
            '<span class="legend-swatch poi-icon ' + cat.key + '">' +
              '<span class="legend-dot"></span>' +
              '<span class="legend-glyph">' + cat.fa + '</span>' +
            '</span>' +
            '<span>' + cat.name + '</span>' +
          '</div>';
      }

      div.innerHTML =
        '<div class="legend-header">' +
          '<div class="legend-title">Legend</div>' +
          '<button class="legend-toggle" type="button">' + (isMobile ? "Show" : "Hide") + '</button>' +
        '</div>' +
        '<div class="legend-body ' + (isMobile ? "is-collapsed" : "") + '">' +
          itemsHtml +
        '</div>';

      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);

      var btn = div.querySelector(".legend-toggle");
      var body = div.querySelector(".legend-body");

      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        body.classList.toggle("is-collapsed");
        btn.textContent = body.classList.contains("is-collapsed") ? "Show" : "Hide";
      });

      return div;
    };

    legend.addTo(map);

    // 7) Layers control — always visible
    var overlays = {};
    var overlayList = [];
    var layersControl = L.control.layers(baseMaps, overlays, { collapsed: isMobile }).addTo(map);

    function refreshLayersControlUI() {
      if (layersControl && layersControl._update) {
        try { layersControl._update(); } catch (e) {}
      }
    }

    function addAllNoneButtonsInsideLayersControl() {
      var container = layersControl.getContainer();
      if (!container) return;
      if (container.querySelector(".layers-bulk")) return;

      var overlaysList = container.querySelector(".leaflet-control-layers-overlays");
      if (!overlaysList) return;

      var bulk = L.DomUtil.create("div", "layers-bulk");
      bulk.innerHTML =
        '<button type="button" class="layers-bulk-btn layers-bulk-all">All</button>' +
        '<button type="button" class="layers-bulk-btn layers-bulk-none">None</button>';

      overlaysList.parentNode.insertBefore(bulk, overlaysList);

      L.DomEvent.disableClickPropagation(bulk);
      L.DomEvent.disableScrollPropagation(bulk);

      var allBtn = bulk.querySelector(".layers-bulk-all");
      var noneBtn = bulk.querySelector(".layers-bulk-none");

      allBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        for (var i = 0; i < overlayList.length; i++) {
          if (!map.hasLayer(overlayList[i])) map.addLayer(overlayList[i]);
        }
        refreshLayersControlUI();
      });

      noneBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        for (var i = 0; i < overlayList.length; i++) {
          if (map.hasLayer(overlayList[i])) map.removeLayer(overlayList[i]);
        }
        refreshLayersControlUI();
      });
    }

    addAllNoneButtonsInsideLayersControl();

    // 8) Load GeoJSON + build clustered overlays (SUBGROUPS)
    var geojsonUrl = 'data/novafunmap.geojson';

    fetch(geojsonUrl)
      .then(function (r) {
        if (!r.ok) throw new Error("GeoJSON fetch failed: HTTP " + r.status + " for " + geojsonUrl);
        return r.json();
      })
      .then(function (data) {
        for (var k = 0; k < categories.length; k++) {
          (function (cat) {

            // Each category is a subgroup INSIDE the shared cluster
            var subgroup = L.featureGroup.subGroup(cluster);

            var gjLayer = L.geoJSON(data, {
              filter: cat.filter,
              pointToLayer: function (feature, latlng) {
                return L.marker(latlng, { icon: cat.markerIcon });
              },
              onEachFeature: function (feature, lyr) {
                var p = (feature && feature.properties) ? feature.properties : {};
                var name = p.name || "Unnamed";
                var city = p["addr:city"] || "";
                var state = p["addr:state"] || "";
                var website = p.website || "";

                var locationLine = "";
                if (city || state) {
                  locationLine = city + (city && state ? ", " : "") + state + "<br>";
                }

                var websiteLine = "";
                if (website) {
                  websiteLine = '<a href="' + website + '" target="_blank" rel="noopener noreferrer">Website</a>';
                }

                lyr.bindPopup("<strong>" + name + "</strong><br>" + locationLine + websiteLine);

                if (!isMobile) {
                  var tooltipHtml = "<strong>" + name + "</strong>";
                  if (city || state) {
                    tooltipHtml += "<br>" + city + (city && state ? ", " : "") + state;
                  }
                  lyr.bindTooltip(tooltipHtml, {
                    sticky: true,
                    direction: "top",
                    opacity: 0.95
                  });
                } else {
                  lyr.on("popupopen", function () {
                    if (lyr.closeTooltip) lyr.closeTooltip();
                  });
                }
              }
            });

            // Put this category’s markers into the subgroup
            subgroup.addLayer(gjLayer);

            // IMPORTANT: the overlay you toggle is the subgroup (so it participates in shared clustering)
            overlays[cat.name] = subgroup;
            layersControl.addOverlay(subgroup, cat.name);
            overlayList.push(subgroup);

          })(categories[k]);
        }

        addAllNoneButtonsInsideLayersControl();
        refreshLayersControlUI();

        // Optional: start with ALL categories enabled.
        // Uncomment to start ON.
        /*
        for (var i = 0; i < overlayList.length; i++) {
          map.addLayer(overlayList[i]);
        }
        */
        refreshLayersControlUI();

        if (isMobile) {
          setTimeout(function () { map.invalidateSize(); }, 200);
        }
      })
      .catch(function (err) {
        console.error(err);
        try {
          console.error("Tried GeoJSON URL:", new URL(geojsonUrl, window.location.href).href);
        } catch (e) {}
      });
  });
})();
