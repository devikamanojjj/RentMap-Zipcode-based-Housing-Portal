import React from 'react';
import './ROITableModal.css';

const ROITableModal = ({ open, onClose, roiData, onZipcodeClick }) => {
  return (
    <div className={`roi-modal-overlay ${open ? 'open' : 'closed'}`} aria-hidden={!open}>
      <div className={`roi-modal-content ${open ? 'open' : 'closed'}`}>
        <button className="roi-modal-close" onClick={onClose}>×</button>
        <h2>ROI Table</h2>
        <div className="roi-table-wrapper">
          <table className="roi-table">
            <thead>
              <tr>
                <th>Zipcode</th>
                <th>ROI (%)</th>
              </tr>
            </thead>
            <tbody>
              {roiData.map((row) => (
                <tr
                  key={row.zipcode}
                  onClick={() => onZipcodeClick?.(row.zipcode)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{row.zipcode}</td>
                  <td>{row.roi_sumproduct != null ? Number(row.roi_sumproduct).toFixed(2) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ROITableModal;
