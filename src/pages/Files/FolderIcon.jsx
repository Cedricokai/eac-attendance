/* eslint-disable react/prop-types */
import { useId } from "react";

export default function FolderIcon({ size = 24, hasContents = false }) {
  const id = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 80"
      className="fm-file-icon fm-yellow-folder"
      role="img"
      aria-label={hasContents ? "Folder containing files" : "Empty folder"}
    >
      <defs>
        <linearGradient id={`${id}-back`} x2="0.2" y2="1">
          <stop stopColor="#f9b516" />
          <stop offset="1" stopColor="#d88700" />
        </linearGradient>
        <linearGradient id={`${id}-front`} x2="0.7" y2="1">
          <stop stopColor="#ffd540" />
          <stop offset="1" stopColor="#f5ab05" />
        </linearGradient>
      </defs>
      <ellipse cx="47" cy="75" rx="41" ry="3" fill="#a56700" opacity=".15" />
      <path
        d="M7 67V12Q7 5 14 5H33Q37 5 40 11L43 14H80Q87 14 87 21V67Q87 74 80 74H14Q7 74 7 67Z"
        fill={`url(#${id}-back)`}
        stroke="#da9409"
        strokeWidth="1.2"
      />
      {hasContents && (
        <g>
          <path
            d="M14 64V23Q14 19 19 19H78Q82 19 82 23V65Z"
            fill="#fffdf4"
            stroke="#d6cec0"
            strokeWidth="1.2"
          />
          <path d="M19 27H76M19 32H70" stroke="#e9e2d4" strokeWidth="1.4" />
        </g>
      )}
      <path
        d="M7 68L12 34Q13 28 19 28H48L54 23H88Q94 23 92 30L85 68Q84 74 77 74H14Q7 74 7 68Z"
        fill={`url(#${id}-front)`}
        stroke="#edb021"
        strokeWidth="1.2"
      />
      <path
        d="M17 30H49L55 25H87"
        fill="none"
        stroke="#ffe88d"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
