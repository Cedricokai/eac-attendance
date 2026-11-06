/* eslint-disable react/prop-types */
import "./file-loading.css";

export default function FileLoadingScreen({ conversation = false }) {
  return (
    <div
      className="fm-loading-screen"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="fm-loading-brand">
        <span>E</span> EAC <b>{conversation ? "Conversations" : "Files"}</b>
      </div>
      <div className="fm-loading-center">
        <div className="fm-loading-ring" aria-hidden="true">
          <svg viewBox="0 0 120 120">
            <circle className="fm-loading-track" cx="60" cy="60" r="50" />
            <circle className="fm-loading-white" cx="60" cy="60" r="50" />
            <circle className="fm-loading-orange" cx="60" cy="60" r="50" />
          </svg>
        </div>
        <p className="fm-loading-label">{conversation ? "YOUR TEAM, CONNECTED" : "YOUR FILE WORKSPACE"}</p>
        <h1>{conversation ? "Every conversation, connected." : "Everything in its place."}</h1>
        <p className="fm-loading-message">{conversation ? "Opening your conversations…" : "Opening your files and folders…"}</p>
        <span className="fm-loading-caption">{conversation ? "EAC COMMUNICATION" : "EAC FILE MANAGEMENT"}</span>
      </div>
    </div>
  );
}
