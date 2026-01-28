import React, { useState, useRef } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import './MapContainer.css';
import MarkerPopup from './MarkerPopup';

const MapContainer = ({ data }) => {
  const [popupInfo, setPopupInfo] = useState(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/streets-v12');
  const [searchInput, setSearchInput] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [viewState, setViewState] = useState({
    longitude: -149.8,
    latitude: 61.1,
    zoom: 8
  });
  const mapRef = useRef();

  const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || 'pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjbHNmMzZ1eW4wMDAwMzJwcHZmMGQxMHMwIn0.EXAMPLE_TOKEN';

  const mapStyles = [
    { value: 'mapbox://styles/mapbox/streets-v12', label: '🛣️ Streets' },
    { value: 'mapbox://styles/mapbox/satellite-v9', label: '🛰️ Satellite' },
    { value: 'mapbox://styles/mapbox/dark-v11', label: '🌙 Dark' },
    { value: 'mapbox://styles/mapbox/light-v11', label: '☀️ Light' },
    { value: 'mapbox://styles/mapbox/outdoors-v12', label: '🏕️ Outdoors' }
  ];

  const flyToLocation = (longitude, latitude, zoom = 10) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [longitude, latitude],
        zoom,
        speed: 1.2,
        curve: 1.8,
        essential: true
      });
    } else {
      setViewState({ longitude, latitude, zoom });
    }
  };

  // Filter zipcodes based on search input
  const filteredZipcodes = searchInput.trim() === '' 
    ? [] 
    : data.filter(item => 
        item.zipcode.toString().includes(searchInput)
      );

  // Handle zipcode selection from dropdown
  const handleZipcodeSelect = (zipcode) => {
    const selectedZipcode = data.find(item => item.zipcode === zipcode);
    if (selectedZipcode) {
      flyToLocation(selectedZipcode.longitude, selectedZipcode.latitude, 10);
      setPopupInfo(selectedZipcode);
      setSearchInput('');
      setShowSearchDropdown(false);
    }
  };

  const handleSidebarZipcodeClick = (zipcode) => {
    handleZipcodeSelect(zipcode);
  };

  const handleResetMap = () => {
    flyToLocation(-149.8, 61.1, 8);
    setPopupInfo(null);
    setSearchInput('');
    setShowSearchDropdown(false);
  };

  return (
    <div className="map-container">
      <div className="map-header">
        <h1>RENTMAP-ZIPCODE-BASED HOUSING PORTAL</h1>
        <p>YOUR ONE STOP DESTINATION FOR ALL HOUSING LAND INSIGHTS</p>
        
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 SEARCH ZIPCODE..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setShowSearchDropdown(true);
            }}
            onFocus={() => setShowSearchDropdown(true)}
            className="search-input"
          />
          {showSearchDropdown && filteredZipcodes.length > 0 && (
            <div className="search-dropdown">
              {filteredZipcodes.map((item, idx) => (
                <div
                  key={idx}
                  className="dropdown-item"
                  onClick={() => handleZipcodeSelect(item.zipcode)}
                >
                  <div className="dropdown-zipcode">{item.zipcode}</div>
                  <div className="dropdown-coords">
                    {item.latitude.toFixed(2)}, {item.longitude.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
          {showSearchDropdown && searchInput && filteredZipcodes.length === 0 && (
            <div className="search-dropdown no-results">
              No zipcodes found
            </div>
          )}
        </div>

        <button 
          className="reset-btn"
          onClick={handleResetMap}
          title="Reset map to original view"
        >
          RESET
        </button>

        <div className="style-selector">
          <label>Map Style:</label>
          <select value={mapStyle} onChange={(e) => setMapStyle(e.target.value)}>
            {mapStyles.map((style) => (
              <option key={style.value} value={style.value}>
                {style.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`sidebar ${showSidebar ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h3>All Zipcodes ({data.length})</h3>
          <button 
            className="toggle-btn" 
            onClick={() => setShowSidebar(!showSidebar)}
            title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
          >
            {showSidebar ? '◀' : '▶'}
          </button>
        </div>
        
        <div className="sidebar-content">
          {data.map((item, idx) => {
            const salesStats = item.sales.length > 0 
              ? item.sales.reduce((acc, s) => acc + s.price, 0) / item.sales.length 
              : 0;
            const rentStats = item.rent.length > 0 
              ? item.rent.filter(r => r.avg_price).reduce((acc, r) => acc + r.avg_price, 0) / item.rent.filter(r => r.avg_price).length
              : 0;

            return (
              <div 
                key={idx} 
                className="sidebar-zipcode-item"
                onClick={() => handleSidebarZipcodeClick(item.zipcode)}
              >
                <div className="sidebar-zipcode-header">
                  <span className="sidebar-zipcode-number">📍 {item.zipcode}</span>
                </div>
                <div className="sidebar-zipcode-details">
                  <div className="sidebar-detail-row">
                    <span className="detail-label">Location:</span>
                    <span className="detail-value">{item.latitude.toFixed(2)}, {item.longitude.toFixed(2)}</span>
                  </div>
                  <div className="sidebar-detail-row">
                    <span className="detail-label">Sales Records:</span>
                    <span className="detail-value">{item.sales.length}</span>
                  </div>
                  {salesStats > 0 && (
                    <div className="sidebar-detail-row">
                      <span className="detail-label">Avg Sale Price:</span>
                      <span className="detail-value">${salesStats.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                    </div>
                  )}
                  <div className="sidebar-detail-row">
                    <span className="detail-label">Rent Records:</span>
                    <span className="detail-value">{item.rent.length}</span>
                  </div>
                  {rentStats > 0 && (
                    <div className="sidebar-detail-row">
                      <span className="detail-label">Avg Rent:</span>
                      <span className="detail-value">${rentStats.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        {data.map((item, idx) => (
          <Marker
            key={idx}
            longitude={item.longitude}
            latitude={item.latitude}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              flyToLocation(item.longitude, item.latitude, 10);
              setPopupInfo(item);
            }}
          >
            <div className="marker">
              <div className="marker-inner">📍</div>
            </div>
          </Marker>
        ))}

        {popupInfo && (
          <Popup
            anchor="left"
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            offset={[30, 0]}
            closeOnClick={false}
            focusAfterOpen={false}
            onClose={() => setPopupInfo(null)}
            className="popup-container"
          >
            <MarkerPopup data={popupInfo} />
          </Popup>
        )}
      </Map>

      <div className="data-legend">
        <div className="legend-item">
          <span className="legend-icon">📍</span>
          <span>Click on markers to view sales & rental data</span>
        </div>
      </div>
    </div>
  );
};

export default MapContainer;
