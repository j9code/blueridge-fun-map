// @name Leafletfunmap_query

[out:json][timeout:180];

// --- Blue Ridge Region counties (Virginia) ---
(
  rel(1633325);  // Clarke County
  rel(2534201);  // Rappahannock County
  rel(1633332);  // Warren County
  rel(2534173);  // Culpeper County
  rel(2534189);  // Madison County
);

// Convert relations to one region
map_to_area ->.region;

// Fun stuff
(
  // leisure-based categories
  nwr["leisure"~"^(miniature_golf|amusement_arcade|trampoline_park|escape_game|bowling_alley|indoor_play|water_park|gaming_lounge)$"](area.region);

  // attraction-based categories
  nwr["attraction"~"^(train|carousel|animal_scooter|slide)$"](area.region);

  // tourism-based categories
  nwr["tourism"="zoo"](area.region);

  // sport-based categories 
  nwr["sport"~"^(climbing_adventure|laser_tag|karting|indoor_skydiving|10pin|roller_skating|ice_skating)"](area.region);
);

// For good GeoJSON output (points for polygons too)
out center tags;
