import { useEffect, useRef } from "react";
import background from "./assets/transport-loading.png";
import "./transport.css";

export default function TransportLoadingScreen() {
  const screen = useRef(null);
  useEffect(() => {
    const navigation = screen.current?.closest(".tm-app")?.querySelectorAll(".tm-sidebar, .tm-topbar");
    navigation?.forEach(element => { element.inert = true; });
    return () => navigation?.forEach(element => { element.inert = false; });
  }, []);
  return (
    <div
      ref={screen}
      className="tm-loading-screen"
      style={{ backgroundImage: `url(${background})` }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="tm-loading-brand">
        <span>E</span>
        <div>
          EAC Transport<small>ELECTRICAL SOLUTIONS LIMITED</small>
        </div>
      </div>
      <div className="tm-loading-content">
        <span className="tm-loading-eyebrow">YOUR FLEET, CONNECTED</span>
        <h1>Ready for the road ahead.</h1>
        <p><span className="tm-loading-spinner" aria-hidden="true" />Opening your transport workspace…</p>
        <div className="tm-loading-progress" aria-hidden="true">
          <span />
        </div>
        <small>VEHICLES · PEOPLE · OPERATIONS</small>
      </div>
      <span className="tm-loading-footer">EAC TRANSPORT MANAGEMENT</span>
    </div>
  );
}
