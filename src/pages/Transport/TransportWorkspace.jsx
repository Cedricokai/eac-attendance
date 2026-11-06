import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {transportPhotos} from "./transportPhotos";
import TransportPhotoCredits from "./TransportPhotoCredits";
import Sidebar from "./Sidebar";
import TransportLoadingScreen from "./TransportLoadingScreen";
import useTransportIntro from "./useTransportIntro";
import { transportApi } from "./transportApi";

export default function TransportWorkspace({ title, description, children, actions, loading = false, error, onRetry, heroImage, heroImageAlt }) {
  const intro = useTransportIntro();
  const [context, setContext] = useState(null);
  const [contextError, setContextError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setContextError("");
    transportApi("/context", { signal: controller.signal }).then(setContext).catch(err => { if (!controller.signal.aborted) setContextError(err.message); });
    return () => controller.abort();
  }, [retry]);
  if (intro) return <div className="tm-app"><Sidebar /><TransportLoadingScreen /></div>;
  return <div className="tm-app"><Sidebar /><main className="tm-content"><div className="tm-page-heading tm-bento-hero"><div className="tm-hero-copy"><span className="tm-eyebrow">EAC TRANSPORT</span><h1>{title}</h1>{description && <p>{description}</p>}{actions && <div className="tm-page-actions">{actions}</div>}</div><div className="tm-hero-tile tm-hero-photograph"><img src={heroImage||transportPhotos.mineTrucks} alt={heroImageAlt||"Mining vehicles — illustrative fleet photograph"}/><span>YOUR FLEET,<br/>CONNECTED.</span></div></div>
    {(error || contextError) && <div className="tm-error" role="alert"><span>{contextError || error}</span><button type="button" onClick={() => { if (contextError) setRetry(value => value + 1); onRetry?.(); }}> Retry</button></div>}
    {(!context && !contextError || loading && !error) && <p className="tm-panel" role="status">Loading page data…</p>}
    <div className="tm-bento-body">{context && (!loading || error) && (typeof children === "function" ? children(context) : children)}</div>
  <TransportPhotoCredits/></main></div>;
}
TransportWorkspace.propTypes = { title: PropTypes.string.isRequired, description: PropTypes.string, children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]), actions: PropTypes.node, loading: PropTypes.bool, error: PropTypes.string, onRetry: PropTypes.func, heroImage:PropTypes.string, heroImageAlt:PropTypes.string };
