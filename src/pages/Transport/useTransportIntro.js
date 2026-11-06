import { useEffect, useState } from "react";
import { transportVisit } from "./transportVisit";

export default function useTransportIntro() {
  const [visible, setVisible] = useState(() => transportVisit.enter() > 0);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), transportVisit.enter());
    return () => window.clearTimeout(timer);
  }, []);
  return visible;
}
