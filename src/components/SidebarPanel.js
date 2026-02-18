import React from 'react';
import ZipcodeSheet from './ZipcodeSheet';
import CompareToggle from './CompareToggle';

const SidebarPanel = ({
  data,
  showSidebar,
  compareMode,
  compareZipcodes,
  favZipcodes,
  showOnlyFavs,
  onToggleCompareMode,
  onToggleShowOnlyFavs,
  onFavoriteClick,
  onSidebarZipcodeClick,
  onToggleCompareZipcode
}) => {
  return (
    <div
      className={`sidebar ${showSidebar ? 'open' : 'closed'}`}
    >
      <div className="sidebar-header sidebar-header-layout">
        <h3 className="sidebar-title">All Zipcodes ({data.length})</h3>
        <div className="sidebar-actions">
          <CompareToggle
            compareMode={compareMode}
            compareZipcodes={compareZipcodes}
            favZipcodes={favZipcodes}
            onToggleCompareMode={onToggleCompareMode}
          />
          <span
            className={`favorites-toggle${showOnlyFavs ? ' active' : ''}`}
            onClick={onToggleShowOnlyFavs}
            title={showOnlyFavs ? 'Show all zipcodes' : 'Show only favorites'}
          >
            {showOnlyFavs ? '❤️' : '🤍'}
          </span>
        </div>
      </div>
      <div className="sidebar-content sidebar-content-sheet">
        <ZipcodeSheet
          data={data}
          favZipcodes={favZipcodes}
          showOnlyFavs={showOnlyFavs}
          handleFavoriteClick={onFavoriteClick}
          handleSidebarZipcodeClick={onSidebarZipcodeClick}
          compareMode={compareMode}
          compareZipcodes={compareZipcodes}
          onToggleCompareZipcode={onToggleCompareZipcode}
        />
      </div>
    </div>
  );
};

export default SidebarPanel;
