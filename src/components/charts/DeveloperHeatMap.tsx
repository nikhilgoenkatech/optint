import React from 'react';
import { PatternRow } from '../../types/views';

interface DeveloperHeatMapProps {
  patterns: PatternRow[];
}

const CELL_SIZE = 28;
const LEFT_LABEL_WIDTH = 140;
const TOP_LABEL_HEIGHT = 80;
const TITLE_HEIGHT = 24;
const CELL_GAP = 2;

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

function severityColor(severity: PatternRow['severity']): string {
  switch (severity) {
    case 'High':
      return 'var(--dt-colors-background-container-critical-default)';
    case 'Medium':
      return 'var(--dt-colors-background-container-warning-default)';
    case 'Low':
    default:
      return 'var(--dt-colors-background-container-success-default)';
  }
}

export const DeveloperHeatMap: React.FC<DeveloperHeatMapProps> = ({ patterns }) => {
  if (patterns.length === 0) {
    return (
      <svg width="100%" viewBox="0 0 400 100" xmlns="http://www.w3.org/2000/svg">
        <text
          x="200"
          y="50"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="13"
          fill="var(--dt-colors-text-neutral-default)"
        >
          No patterns to display
        </text>
      </svg>
    );
  }

  // Collect unique services preserving first-seen order
  const servicesSet = new Set<string>();
  patterns.forEach((p) => p.affectedServices.forEach((s) => servicesSet.add(s)));
  const services = Array.from(servicesSet);

  const numCols = patterns.length;
  const numRows = services.length;

  const gridWidth = numCols * (CELL_SIZE + CELL_GAP) - CELL_GAP;
  const gridHeight = numRows * (CELL_SIZE + CELL_GAP) - CELL_GAP;

  const svgWidth = LEFT_LABEL_WIDTH + gridWidth + 16;
  const svgHeight = TITLE_HEIGHT + TOP_LABEL_HEIGHT + gridHeight + 8;

  const gridOriginX = LEFT_LABEL_WIDTH;
  const gridOriginY = TITLE_HEIGHT + TOP_LABEL_HEIGHT;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Developer Heat Map"
    >
      {/* Title */}
      <text
        x="0"
        y="16"
        fontSize="14"
        fontWeight="bold"
        fill="var(--dt-colors-text-neutral-default)"
      >
        Developer Heat Map
      </text>

      {/* Column labels (pattern names, rotated -45°) */}
      {patterns.map((pattern, colIdx) => {
        const cx = gridOriginX + colIdx * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
        const cy = gridOriginY - 4;
        return (
          <text
            key={`col-label-${pattern.id}`}
            x={cx}
            y={cy}
            fontSize="10"
            fill="var(--dt-colors-text-neutral-subdued)"
            transform={`rotate(-45, ${cx}, ${cy})`}
            textAnchor="start"
          >
            {truncate(pattern.name, 16)}
          </text>
        );
      })}

      {/* Row labels (service names) */}
      {services.map((service, rowIdx) => {
        const cy = gridOriginY + rowIdx * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
        return (
          <text
            key={`row-label-${service}`}
            x={LEFT_LABEL_WIDTH - 8}
            y={cy}
            fontSize="11"
            fill="var(--dt-colors-text-neutral-default)"
            textAnchor="end"
            dominantBaseline="middle"
          >
            {service}
          </text>
        );
      })}

      {/* Grid cells */}
      {services.map((service, rowIdx) =>
        patterns.map((pattern, colIdx) => {
          const filled = pattern.affectedServices.includes(service);
          const x = gridOriginX + colIdx * (CELL_SIZE + CELL_GAP);
          const y = gridOriginY + rowIdx * (CELL_SIZE + CELL_GAP);
          return (
            <rect
              key={`cell-${rowIdx}-${colIdx}`}
              x={x}
              y={y}
              width={CELL_SIZE}
              height={CELL_SIZE}
              fill={
                filled
                  ? severityColor(pattern.severity)
                  : 'var(--dt-colors-background-container-neutral-subdued)'
              }
              stroke="var(--dt-colors-border-neutral-subdued)"
              strokeWidth="1"
            />
          );
        })
      )}
    </svg>
  );
};

export default DeveloperHeatMap;
