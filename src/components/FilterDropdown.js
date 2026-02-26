import React, { useMemo, useState } from 'react';
import './FilterDropdown.css';

const round2 = (value) => Math.round(value * 100) / 100;

const FilterDropdown = ({ data, roiByZipcode, onApplyFilters, onResetFilters }) => {
  const [open, setOpen] = useState(false);

  const bounds = useMemo(() => {
    const rents = [];
    const rois = Object.values(roiByZipcode).filter((value) => Number.isFinite(value));

    data.forEach((item) => {
      const rentValues = (item.rent || [])
        .map((entry) => Number(entry.avg_price))
        .filter((value) => Number.isFinite(value));

      if (rentValues.length > 0) {
        rents.push(rentValues[rentValues.length - 1]);
      }
    });

    const minRent = rents.length > 0 ? Math.min(...rents) : 0;
    const maxRent = rents.length > 0 ? Math.max(...rents) : 0;
    const minRoi = rois.length > 0 ? Math.min(...rois) : 0;
    const maxRoi = rois.length > 0 ? Math.max(...rois) : 0;

    return {
      minRent,
      maxRent,
      minRoi: round2(minRoi),
      maxRoi: round2(maxRoi)
    };
  }, [data, roiByZipcode]);

  const [localFilters, setLocalFilters] = useState({
    rentMin: null,
    roiMin: null
  });

  const setFilterValue = (key, value) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const apply = () => {
    onApplyFilters({
      rentMin: localFilters.rentMin,
      rentMax: null,
      roiMin: localFilters.roiMin,
      roiMax: null
    });
    setOpen(false);
  };

  const reset = () => {
    const cleared = { rentMin: null, roiMin: null };
    setLocalFilters(cleared);
    onResetFilters();
    setOpen(false);
  };

  return (
    <div className="filter-dropdown">
      <button type="button" className="filter-btn" onClick={() => setOpen((prev) => !prev)}>
        FILTERS
      </button>

      {open && (
        <div className="filter-popover">
          <div className="filter-row">
            <label>Rent</label>
            <input
              type="range"
              min={bounds.minRent}
              max={bounds.maxRent || bounds.minRent + 1}
              value={localFilters.rentMin ?? bounds.minRent}
              onChange={(e) => setFilterValue('rentMin', Number(e.target.value))}
            />
            <span>{Math.round(localFilters.rentMin ?? bounds.minRent)}</span>
          </div>

          <div className="filter-row">
            <label>ROI</label>
            <input
              type="range"
              step="0.01"
              min={bounds.minRoi}
              max={bounds.maxRoi || bounds.minRoi + 1}
              value={localFilters.roiMin ?? bounds.minRoi}
              onChange={(e) => setFilterValue('roiMin', Number(e.target.value))}
            />
            <span>{round2(localFilters.roiMin ?? bounds.minRoi)}</span>
          </div>

          <div className="filter-actions">
            <button type="button" onClick={apply}>Apply</button>
            <button type="button" onClick={reset}>Reset</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;
