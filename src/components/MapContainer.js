import React, { useState, useRef } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import './MapContainer.css';
import MarkerPopup from './MarkerPopup';

const MapContainer = ({ data, onLogout, user }) => {
    const [showFavDropdown, setShowFavDropdown] = useState(false);
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
          <span 
            className="user-heart"
            title="View favorited zipcodes"
            style={{ cursor: 'pointer', marginRight: '8px', fontSize: '20px', color: '#e25555' }}
            onClick={() => setShowFavDropdown((v) => !v)}
          >
            &#10084;
          </span>
          <span className="user-label">{user}</span>
          <button className="logout-btn" onClick={onLogout} title="Logout">Logout</button>
          {showFavDropdown && (
            <div className="fav-dropdown" style={{ position: 'absolute', left: '-200px', top: '0', background: '#fff', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', zIndex: 100, minWidth: '180px', padding: '8px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#e25555' }}>Favorited Zipcodes</div>
              {favZipcodes.length === 0 ? (
                <div style={{ color: '#888', fontSize: '14px' }}>No favorites yet</div>
              ) : (
                favZipcodes.map((zipcode, idx) => (
                  <div
                    key={zipcode}
                    style={{ display: 'flex', alignItems: 'center', padding: '4px 0' }}
                  >
                    <span
                      style={{ fontSize: '16px', color: '#e25555', marginRight: '6px', cursor: 'pointer' }}
                      title="Unfavorite"
                      onClick={() => {
                        // Unfavorite without closing dropdown
                        const updatedFavs = favZipcodes.filter(z => z !== zipcode);
                        localStorage.setItem(favKey, JSON.stringify(updatedFavs));
                        setFavZipcodes(updatedFavs);
                      }}
                    >❤️</span>
                    <span
                      style={{ fontWeight: 'bold', fontSize: '16px', color: '#333', cursor: 'pointer' }}
                      onClick={() => {
                        setShowFavDropdown(false);
                        handleZipcodeSelect(zipcode);
                      }}
                    >{zipcode}</span>
                  </div>
                ))
              )}
            </div>
          )}
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

            const isFavorited = favZipcodes.includes(item.zipcode);

            const handleFavoriteClick = (e) => {
              e.stopPropagation();
              let updatedFavs = [];
              if (isFavorited) {
                updatedFavs = favZipcodes.filter(z => z !== item.zipcode);
              } else {
                updatedFavs = [...favZipcodes, item.zipcode];
              }
              localStorage.setItem(favKey, JSON.stringify(updatedFavs));
              setFavZipcodes(updatedFavs); // instant UI update
            };

            return (
              <div 
                key={idx} 
                className="sidebar-zipcode-item"
                onClick={() => handleSidebarZipcodeClick(item.zipcode)}
              >
                <div className="sidebar-zipcode-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="sidebar-zipcode-number">📍 {item.zipcode}</span>
                  <span
                    className="zipcode-heart"
                    title={isFavorited ? 'Unfavorite' : 'Favorite'}
                    style={{ cursor: 'pointer', fontSize: '18px', color: isFavorited ? '#e25555' : '#bbb', marginLeft: '8px', transition: 'color 0.2s' }}
                    onClick={handleFavoriteClick}
                  >
                    {isFavorited ? '❤️' : '🤍'}
                  </span>
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
