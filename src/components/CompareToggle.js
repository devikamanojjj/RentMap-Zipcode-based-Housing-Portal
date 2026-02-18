import React from 'react';

const CompareToggle = ({ compareMode, compareZipcodes, favZipcodes, onToggleCompareMode }) => {
  return (
    <button
      className={`compare-btn${compareMode ? ' active' : ''}`}
      type="button"
      onClick={onToggleCompareMode}
      disabled={!compareMode && favZipcodes.length === 0}
      title={compareMode ? 'Exit compare mode' : 'Compare selected favorite zipcodes'}
    >
      {compareMode ? `Comparing (${compareZipcodes.length})` : 'Compare'}
    </button>
  );
};

export default CompareToggle;
