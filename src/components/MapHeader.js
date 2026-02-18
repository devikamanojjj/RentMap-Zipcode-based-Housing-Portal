import React from 'react';

const MapHeader = ({
  user,
  onLogout,
  searchInput,
  onSearchInputChange,
  onSearchFocus,
  showSearchDropdown,
  filteredZipcodes,
  onZipcodeSelect,
  mapStyles,
  mapStyle,
  onMapStyleChange
}) => {
  return (
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
          onChange={(e) => onSearchInputChange(e.target.value)}
          onFocus={onSearchFocus}
          className="search-input"
        />
        {showSearchDropdown && filteredZipcodes.length > 0 && (
          <div className="search-dropdown">
            {filteredZipcodes.map((item, idx) => (
              <div
                key={idx}
                className="dropdown-item"
                onClick={() => onZipcodeSelect(item.zipcode)}
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
            onClick={() => style.value && onMapStyleChange(style.value)}
            type="button"
          >
            {style.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MapHeader;
