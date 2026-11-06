import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { isTransportPath, transportVisit } from "./transportVisit";
import useTransportIntro from "./useTransportIntro";
import TransportLoadingScreen from "./TransportLoadingScreen";

export function TransportVisitObserver() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    if (isTransportPath(pathname)) transportVisit.enter();
    else transportVisit.leave();
  }, [pathname]);
  return null;
}

export function TransportRoutePending() {
  const intro = useTransportIntro();
  return intro ? <TransportLoadingScreen /> : <div className="tm-app"><p className="tm-panel" role="status">Opening Transport page…</p></div>;
}
