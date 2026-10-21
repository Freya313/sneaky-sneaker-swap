import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ciupHouses } from '../data/ciupHouses.js';

const CAMPUS_CENTER = [48.8193, 2.3375];

export default function CampusMap() {
  const mapEl = useRef(null);

  useEffect(() => {
    const map = L.map(mapEl.current, {
      center: CAMPUS_CENTER,
      zoom: 16,
      minZoom: 15,
      maxZoom: 19,
      scrollWheelZoom: false,
    });

    // Aerial photos, with street and place names on top.
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, attribution: 'Imagery © Esri, Maxar, Earthstar Geographics' }
    ).addTo(map);
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 }
    ).addTo(map);

    ciupHouses.forEach((h) => {
      L.circleMarker([h.lat, h.lng], {
        radius: 7,
        weight: 2,
        color: '#141414',
        fillColor: '#47d7ac',
        fillOpacity: 1,
      })
        .bindTooltip(h.name, { direction: 'top', offset: [0, -6] })
        .addTo(map);
    });

    map.attributionControl.addAttribution('Houses © OpenStreetMap contributors');

    return () => map.remove();
  }, []);

  return (
    <section id="campus" className="campus">
      <div className="campus-head">
        <h2 className="campus-title">One campus, {ciupHouses.length} houses</h2>
        <p className="campus-sub">
          The Cité internationale universitaire de Paris from above. Hover or tap a green dot
          to see which house it is.
        </p>
      </div>
      <div ref={mapEl} className="campus-map" aria-label="Aerial map of the CIUP campus with its houses" />
    </section>
  );
}
