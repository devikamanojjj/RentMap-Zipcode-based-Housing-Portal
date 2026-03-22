import React from 'react';

const ZipcodeSheet = ({
  data,
  roiByZipcode = {},
  selectedZipcode,
  favZipcodes,
  showOnlyFavs,
  handleFavoriteClick,
  handleSidebarZipcodeClick,
  compareMode,
  compareZipcodes,
  onToggleCompareZipcode
}) => {
  const normalizeZipcode = (zipcode) => String(zipcode ?? '').trim();
  const normalizedSelectedZipcode = normalizeZipcode(selectedZipcode);
  const filteredData = showOnlyFavs
    ? data.filter(item => favZipcodes.includes(normalizeZipcode(item.zipcode)))
    : data;
  const showCompareColumn = compareMode && showOnlyFavs;

  return (
    <div className="zipcode-sheet-container">
      <table className="zipcode-sheet-table">
        <thead>
          <tr>
            {showCompareColumn && <th>Compare</th>}
            <th style={{ textAlign: 'center' }}>Zipcode</th>
            <th>Sales Records</th>
            <th>Avg Sale Price</th>
            <th>Rent Records</th>
            <th>Avg Rent</th>
            <th>ROI</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map(item => {
            const salesStats = item.sales.length > 0 
              ? item.sales.reduce((acc, s) => acc + s.price, 0) / item.sales.length 
              : 0;
            const rentStats = item.rent.length > 0 
              ? item.rent.filter(r => r.avg_price).reduce((acc, r) => acc + r.avg_price, 0) / item.rent.filter(r => r.avg_price).length
              : 0;
            const normalizedItemZipcode = normalizeZipcode(item.zipcode);
            const isSelected = normalizedItemZipcode === normalizedSelectedZipcode;
            return (
              <tr
                key={item.zipcode}
                className={isSelected ? 'zipcode-row-selected' : ''}
                onClick={() => handleSidebarZipcodeClick(item.zipcode)}
                style={{ cursor: 'pointer' }}
              >
                {showCompareColumn && (
                  <td
                    onClick={e => e.stopPropagation()}
                    style={{ textAlign: 'center' }}
                  >
                    <input
                      type="checkbox"
                      checked={compareZipcodes.includes(normalizedItemZipcode)}
                      disabled={!favZipcodes.includes(normalizedItemZipcode)}
                      onChange={() => onToggleCompareZipcode(normalizedItemZipcode)}
                    />
                  </td>
                )}
                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <span
                    onClick={e => { e.stopPropagation(); handleFavoriteClick(e, item, favZipcodes); }}
                    style={{ fontSize: '18px', color: favZipcodes.includes(normalizedItemZipcode) ? '#e25555' : '#bbb', cursor: 'pointer' }}
                  >
                    {favZipcodes.includes(normalizedItemZipcode) ? '❤️' : '🤍'}
                  </span>
                  <span style={{ marginLeft: '8px' }}>{item.zipcode}</span>
                </td>
                <td>{item.sales.length}</td>
                <td>{salesStats > 0 ? `$${salesStats.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` : '-'}</td>
                <td>{item.rent.length}</td>
                <td>{rentStats > 0 ? `$${rentStats.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` : '-'}</td>
                <td>{
                  (() => {
                    const roi = Number(roiByZipcode[normalizedItemZipcode]);
                    return Number.isFinite(roi) ? `${roi.toFixed(2)}%` : '-';
                  })()
                }</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ZipcodeSheet;
