import React, { useMemo } from 'react';
import './CompareInsightsModal.css';

const CHART_COLORS = ['#4CAF50', '#1E88E5', '#F4511E', '#8E24AA', '#00ACC1', '#FBC02D'];

const formatCurrency = (value) => {
  if (!Number.isFinite(value)) return '-';
  return `$${Math.round(value).toLocaleString()}`;
};

const formatRoi = (value) => {
  if (!Number.isFinite(value)) return '-';
  return `${value.toFixed(2)}%`;
};

const parseMonthKey = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return Number.NaN;

  const direct = Date.parse(raw);
  if (!Number.isNaN(direct)) return direct;

  const normalized = raw.replace(/_/g, '-').replace(/\//g, '-');
  const fallback = Date.parse(`${normalized}-01`);
  if (!Number.isNaN(fallback)) return fallback;

  return Number.NaN;
};

const sortMonthKeys = (monthKeys) => {
  return [...monthKeys].sort((a, b) => {
    const aTime = parseMonthKey(a);
    const bTime = parseMonthKey(b);

    if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
      return String(a).localeCompare(String(b));
    }
    if (Number.isNaN(aTime)) return 1;
    if (Number.isNaN(bTime)) return -1;
    return aTime - bTime;
  });
};

const buildRentSeries = (item) => {
  const points = (item?.rent || [])
    .filter((entry) => Number.isFinite(Number(entry.avg_price)))
    .map((entry) => ({
      month: String(entry.month_year ?? '').trim(),
      value: Number(entry.avg_price)
    }))
    .filter((entry) => entry.month !== '');

  const monthlyLatest = {};
  points.forEach((entry) => {
    monthlyLatest[entry.month] = entry.value;
  });

  return Object.entries(monthlyLatest).map(([month, value]) => ({ month, value }));
};

const RentLineChart = ({ selectedData }) => {
  const { monthLabels, chartSeries, minValue, maxValue } = useMemo(() => {
    const rawSeries = selectedData.map((item) => ({
      zipcode: String(item.zipcode),
      points: buildRentSeries(item)
    }));

    const allMonths = new Set();
    const allValues = [];

    rawSeries.forEach((series) => {
      series.points.forEach((point) => {
        allMonths.add(point.month);
        allValues.push(point.value);
      });
    });

    const monthLabels = sortMonthKeys(Array.from(allMonths));

    const chartSeries = rawSeries.map((series) => {
      const valueByMonth = {};
      series.points.forEach((point) => {
        valueByMonth[point.month] = point.value;
      });
      return {
        zipcode: series.zipcode,
        values: monthLabels.map((month) => valueByMonth[month] ?? null)
      };
    });

    if (allValues.length === 0) {
      return { monthLabels, chartSeries, minValue: 0, maxValue: 1 };
    }

    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const paddedMin = minValue === maxValue ? minValue - 1 : minValue * 0.95;
    const paddedMax = minValue === maxValue ? maxValue + 1 : maxValue * 1.05;

    return {
      monthLabels,
      chartSeries,
      minValue: paddedMin,
      maxValue: paddedMax
    };
  }, [selectedData]);

  if (monthLabels.length === 0) {
    return <div className="compare-empty-chart">No rent trend data available for selected zipcode(s).</div>;
  }

  const width = 760;
  const height = 260;
  const padLeft = 55;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 40;
  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;

  const xStep = monthLabels.length > 1 ? innerWidth / (monthLabels.length - 1) : 0;
  const yScale = (value) => {
    const ratio = (value - minValue) / (maxValue - minValue || 1);
    return padTop + innerHeight - ratio * innerHeight;
  };

  const xPos = (index) => padLeft + xStep * index;

  const linePath = (values) => {
    const pts = values
      .map((value, index) => (value == null ? null : `${xPos(index)},${yScale(value)}`))
      .filter(Boolean);

    if (pts.length < 2) return null;
    return `M ${pts.join(' L ')}`;
  };

  const yTicks = 4;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, index) => {
    const ratio = index / yTicks;
    return minValue + (maxValue - minValue) * ratio;
  }).reverse();

  return (
    <div className="compare-chart-card">
      <h4>Rent Pattern</h4>
      <div className="compare-chart-scroll">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Rent trend comparison">
          {tickValues.map((tickValue) => {
            const y = yScale(tickValue);
            return (
              <g key={`tick-${tickValue}`}>
                <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#e8e8e8" strokeWidth="1" />
                <text x={padLeft - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#666">
                  {Math.round(tickValue).toLocaleString()}
                </text>
              </g>
            );
          })}

          <line x1={padLeft} y1={padTop} x2={padLeft} y2={height - padBottom} stroke="#777" strokeWidth="1" />
          <line x1={padLeft} y1={height - padBottom} x2={width - padRight} y2={height - padBottom} stroke="#777" strokeWidth="1" />

          {chartSeries.map((series, seriesIndex) => {
            const color = CHART_COLORS[seriesIndex % CHART_COLORS.length];
            const d = linePath(series.values);

            return (
              <g key={series.zipcode}>
                {d && <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />}
                {series.values.map((value, index) => (
                  value == null ? null : (
                    <circle
                      key={`${series.zipcode}-${monthLabels[index]}`}
                      cx={xPos(index)}
                      cy={yScale(value)}
                      r="3"
                      fill={color}
                    />
                  )
                ))}
              </g>
            );
          })}

          {monthLabels.map((label, index) => {
            if (index % Math.ceil(monthLabels.length / 8) !== 0 && index !== monthLabels.length - 1) {
              return null;
            }
            return (
              <text
                key={`label-${label}`}
                x={xPos(index)}
                y={height - padBottom + 16}
                textAnchor="middle"
                fontSize="10"
                fill="#666"
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>
      <div className="compare-legend">
        {chartSeries.map((series, index) => (
          <span key={series.zipcode} className="compare-legend-item">
            <span
              className="compare-legend-dot"
              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
            />
            {series.zipcode}
          </span>
        ))}
      </div>
    </div>
  );
};

const ROIBarChart = ({ selectedZipcodes, roiByZipcode }) => {
  const bars = selectedZipcodes.map((zipcode) => {
    const normalizedZipcode = String(zipcode ?? '').trim();
    return {
      zipcode: normalizedZipcode,
      roi: Number(roiByZipcode[normalizedZipcode])
    };
  });

  const validBars = bars.filter((bar) => Number.isFinite(bar.roi));
  if (validBars.length === 0) {
    return <div className="compare-empty-chart">No ROI values available for selected zipcode(s).</div>;
  }

  const maxRoi = Math.max(...validBars.map((bar) => bar.roi), 0.01);

  return (
    <div className="compare-chart-card">
      <h4>ROI Comparison</h4>
      <div className="compare-bar-chart">
        {validBars.map((bar, index) => (
          <div key={bar.zipcode} className="compare-bar-row">
            <div className="compare-bar-label">{bar.zipcode}</div>
            <div className="compare-bar-track">
              <div
                className="compare-bar-fill"
                style={{
                  width: `${(bar.roi / maxRoi) * 100}%`,
                  backgroundColor: CHART_COLORS[index % CHART_COLORS.length]
                }}
              />
            </div>
            <div className="compare-bar-value">{formatRoi(bar.roi)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CompareSummaryTable = ({ selectedData, roiByZipcode }) => {
  return (
    <div className="compare-summary-wrap">
      <h4>Selected Zipcodes Summary</h4>
      <table className="compare-summary-table">
        <thead>
          <tr>
            <th>Zipcode</th>
            <th>Rent Records</th>
            <th>Latest Rent</th>
            <th>Average Rent</th>
            <th>ROI</th>
          </tr>
        </thead>
        <tbody>
          {selectedData.map((item) => {
            const rents = item.rent
              .map((entry) => Number(entry.avg_price))
              .filter((value) => Number.isFinite(value));

            const latestRent = rents.length > 0 ? rents[rents.length - 1] : null;
            const avgRent = rents.length > 0
              ? rents.reduce((sum, value) => sum + value, 0) / rents.length
              : null;
            const roi = Number(roiByZipcode[String(item.zipcode)]);

            return (
              <tr key={item.zipcode}>
                <td>{item.zipcode}</td>
                <td>{rents.length}</td>
                <td>{formatCurrency(latestRent)}</td>
                <td>{formatCurrency(avgRent)}</td>
                <td>{formatRoi(roi)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const CompareInsightsModal = ({
  open,
  onClose,
  selectedZipcodes,
  selectedData,
  roiByZipcode
}) => {
  if (!open || selectedZipcodes.length === 0) return null;

  const singleSelected = selectedZipcodes.length === 1;

  return (
    <div className="compare-modal-overlay" role="dialog" aria-modal="true" aria-label="Compare insights">
      <div className="compare-modal-content">
        <button className="compare-modal-close" type="button" onClick={onClose}>×</button>
        <h2>{singleSelected ? `Zipcode ${selectedZipcodes[0]} Details` : 'Zipcode Comparison Insights'}</h2>
        <p className="compare-subtitle">
          {singleSelected
            ? 'Rent trend, ROI, and summary for the selected zipcode.'
            : 'Rent trend comparison, ROI comparison, and summary metrics.'}
        </p>

        <CompareSummaryTable selectedData={selectedData} roiByZipcode={roiByZipcode} />
        <RentLineChart selectedData={selectedData} />
        <ROIBarChart selectedZipcodes={selectedZipcodes} roiByZipcode={roiByZipcode} />
      </div>
    </div>
  );
};

export default CompareInsightsModal;
