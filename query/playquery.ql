// @name Leafletfunmap_query

[out:json][timeout:180];

// Northern VA area set
(
  area["boundary"="administrative"]["admin_level"="6"]["name"="Fairfax County"];
  area["boundary"="administrative"]["admin_level"="6"]["name"="Loudoun County"];
  area["boundary"="administrative"]["admin_level"="6"]["name"="Prince William County"];
  area["boundary"="administrative"]["admin_level"="6"]["name"="Arlington County"];
  area["boundary"="administrative"]["admin_level"="6"]["name"="Fauquier County"];
  area["boundary"="administrative"]["admin_level"="6"]["name"="Manassas"];
  area["boundary"="administrative"]["admin_level"="6"]["name"="Manassas Park"];
  area["boundary"="administrative"]["admin_level"="6"]["name"="Falls Church"];
  area["boundary"="administrative"]["admin_level"="6"]["name"="Fairfax"];
  area["boundary"="administrative"]["admin_level"="6"]["name"="Alexandria"];
)->.nova;

// Fun stuff
(
  // leisure-based categories
  nwr["leisure"~"^(miniature_golf|amusement_arcade|trampoline_park|escape_game|bowling_alley|indoor_play|water_park|gaming_lounge)$"](area.nova);

  // attraction-based categories
  nwr["attraction"~"^(train|carousel|animal_scooter|slide)$"](area.nova);

  // tourism-based categories
  nwr["tourism"="zoo"](area.nova);

  // sport-based categories 
  nwr["sport"~"(climbing_adventure|laser_tag|karting|indoor_skydiving|10pin|roller_skating|ice_skating)"](area.nova);
);

// For good GeoJSON output (points for polygons too)
out center tags;
