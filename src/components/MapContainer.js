import React, { useState, useRef } from 'react';
import ZipcodeSheet from './ZipcodeSheet';
import Map, { Marker, Popup } from 'react-map-gl';
import './MapContainer.css';
import MarkerPopup from './MarkerPopup';

const MapContainer = ({ data, onLogout, user }) => {
    const [showFavDropdown, setShowFavDropdown] = useState(false);
    const [showOnlyFavs, setShowOnlyFavs] = useState(false);
  const [popupInfo, setPopupInfo] = useState(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/streets-v12');
  const [searchInput, setSearchInput] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [viewState, setViewState] = useState({
    longitude: -149.8,
    latitude: 61.1,
    zoom: 8
  });
  const mapRef = useRef();

  // Favorited zipcodes state for instant UI update
  const favKey = `favZipcodes_${user}`;
  const getInitialFavs = () => {
    try {
      return JSON.parse(localStorage.getItem(favKey)) || [];
    } catch (e) { return []; }
  };
  const [favZipcodes, setFavZipcodes] = useState(getInitialFavs());

  // Listen for localStorage changes (if user favorites elsewhere)
  React.useEffect(() => {
    const handler = () => {
      setFavZipcodes(getInitialFavs());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [user]);


  // Use the provided Mapbox token directly for reliability
  // Use the official Mapbox demo token for troubleshooting
  const MAPBOX_TOKEN = "REDACTED";

  const mapStyles = [
    { value: 'mapbox://styles/mapbox/streets-v12', label: 'STREET' },
    { value: 'mapbox://styles/mapbox/satellite-v9', label: 'SATELLITE' },
    { value: 'mapbox://styles/mapbox/light-v11', label: 'LIGHT' }
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

        <div className="top-right-auth">
          <span className="user-label">{user}</span>
          <button className="logout-btn" onClick={onLogout} title="Logout">Logout</button>
        </div>

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



        <div className="style-toggle-group">
          {mapStyles.map((style) => (
            <button
              key={style.value}
              className={`style-toggle-btn${mapStyle === style.value ? ' active' : ''}`}
              onClick={() => style.value && setMapStyle(style.value)}
              type="button"
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar as Sheet View */}
      <div className={`sidebar ${showSidebar ? 'open' : 'closed'}`} style={{ width: showSidebar ? 700 : 0, minWidth: showSidebar ? 700 : 0, maxWidth: 900, transition: 'width 0.3s, min-width 0.3s', overflow: 'hidden' }}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h3 style={{ margin: 0 }}>All Zipcodes ({data.length})</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                cursor: 'pointer',
                fontSize: '28px',
                color: showOnlyFavs ? '#e25555' : '#bbb',
                marginRight: 8,
                userSelect: 'none',
                transition: 'color 0.2s',
                display: 'flex',
                alignItems: 'center',
                fontWeight: 600
              }}
              onClick={() => setShowOnlyFavs(v => !v)}
              title={showOnlyFavs ? 'Show all zipcodes' : 'Show only favorites'}
            >
              {showOnlyFavs ? '❤️' : '🤍'}
            </span>
          </div>
        </div>
        <div className="sidebar-content" style={{ overflowX: 'auto', padding: 0 }}>
          <ZipcodeSheet
            data={data}
            favZipcodes={favZipcodes}
            showOnlyFavs={showOnlyFavs}
            handleFavoriteClick={(e, item, favZipcodes) => {
              e.stopPropagation();
              let updatedFavs = [];
              const isFavorited = favZipcodes.includes(item.zipcode);
              if (isFavorited) {
                updatedFavs = favZipcodes.filter(z => z !== item.zipcode);
              } else {
                updatedFavs = [...favZipcodes, item.zipcode];
              }
              localStorage.setItem(favKey, JSON.stringify(updatedFavs));
              setFavZipcodes(updatedFavs);
            }}
            handleSidebarZipcodeClick={handleSidebarZipcodeClick}
          />
        </div>
      </div>

      {/* Always-visible sidebar toggle arrow */}
      <button
        className="sidebar-toggle-arrow"
        onClick={() => setShowSidebar(!showSidebar)}
        title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
        style={{
          position: 'fixed',
          top: '180px',
          left: showSidebar ? 700 : 0,
          zIndex: 2000,
          width: '38px',
          height: '54px',
          background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
          color: 'white',
          border: 'none',
          borderRadius: showSidebar ? '0 8px 8px 0' : '0 8px 8px 0',
          boxShadow: '2px 0 8px rgba(0,0,0,0.13)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
          cursor: 'pointer',
          transition: 'left 0.3s',
        }}
      >
        {showSidebar ? '◀' : '▶'}
      </button>
      
      {console.log('Current mapStyle:', mapStyle)}
      <Map
        key={mapStyle}
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
            <MarkerPopup data={popupInfo} user={user} />
          </Popup>
        )}
      </Map>

      <div className="data-legend">
        <div className="legend-item">
          <span className="legend-icon">📍</span>
          <span>Click on markers to view sales & rental data</span>
        </div>
      </div>

      {/* Map Controller - bottom right */}
      <div className="map-controller">
        <button className="controller-btn" title="Zoom In" onClick={() => setViewState(v => ({ ...v, zoom: Math.min(v.zoom + 1, 20) }))}>+</button>
        <button className="controller-btn" title="Zoom Out" onClick={() => setViewState(v => ({ ...v, zoom: Math.max(v.zoom - 1, 1) }))}>-</button>
        <button className="controller-btn" title="Reset" onClick={() => flyToLocation(-149.8, 61.1, 8)}>&#8634;</button>
      </div>
    </div>
  );
};

export default MapContainer;
