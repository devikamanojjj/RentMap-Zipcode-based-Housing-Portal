import React from 'react';
import FilterDropdown from './FilterDropdown';

const MapHeader = ({
  user,
  onLogout,
  layoutMode,
  onLayoutModeChange,
  searchInput,
  onSearchInputChange,
  onSearchFocus,
  showSearchDropdown,
  filteredZipcodes,
  onZipcodeSelect,
  data,
  roiByZipcode,
  onApplyFilters,
  onResetFilters
}) => {
  return (
    <div className="map-header">
      <h1>RENTMAP-ZIPCODE-BASED HOUSING PORTAL</h1>
      <p>YOUR ONE STOP DESTINATION FOR ALL HOUSING LAND INSIGHTS</p>

      <div className="top-right-auth">
        <span className="layout-view-btn auth-chip active" title={user}>{user}</span>
        <button type="button" className="layout-view-btn auth-chip logout-chip" onClick={onLogout} title="Logout">Logout</button>
      </div>

      <div className="layout-view-switch" role="group" aria-label="Select layout view">
        <button
          type="button"
          className={`layout-view-btn${layoutMode === 'list' ? ' active' : ''}`}
          onClick={() => onLayoutModeChange('list')}
        >
          List View
        </button>
        <button
          type="button"
          className={`layout-view-btn${layoutMode === 'split' ? ' active' : ''}`}
          onClick={() => onLayoutModeChange('split')}
        >
          Split View
        </button>
        <button
          type="button"
          className={`layout-view-btn${layoutMode === 'map' ? ' active' : ''}`}
          onClick={() => onLayoutModeChange('map')}
        >
          Map View
        </button>
      </div>

      <div className="search-filter-row">
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
        <FilterDropdown
          data={data}
          roiByZipcode={roiByZipcode}
          onApplyFilters={onApplyFilters}
          onResetFilters={onResetFilters}
        />
      </div>

    </div>
  );
};

export default MapHeader;
