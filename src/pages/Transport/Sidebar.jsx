import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Link from "./TransportLink";

import ThemeToggle from "../../components/ThemeToggle";
import { apiFetch } from "../../utils/api";
import { getToken } from "../../utils/auth";
import { transportApi } from "./transportApi";
import "./transport.css";
import "./transport-bento.css";
import { canSeeTransportPage } from "./transportNavigation";

const menuItems = [
  {
    name: "Dashboard",
    path: "/adminDashboard",
    group: "WORKSPACE",
  },
  { name: "Vehicles", path: "/vehicles" },
  { name: "Drivers", path: "/drivers" },
  { name: "My driver workspace", path: "/transport/driver", transport: true, driver: true },
  { name: "Fuel management", path: "/fuel", group: "OPERATIONS" },
  { name: "Maintenance", path: "/maintenance" },
  { name: "Component plans", path: "/transport/components", transport: true },
  { name: "Work orders", path: "/transport/work-orders", transport: true },
  { name: "Routine inspections", path: "/transport/inspections", transport: true },
  { name: "Fault reports", path: "/transport/faults", transport: true },
  { name: "Parts procurement", path: "/transport/procurement", transport: true },
  { name: "Documents & expiry", path: "/transport/documents", transport: true },
  {
    name: "Reports & analytics",
    path: "/transportReports",
    group: "INSIGHTS",
  },
  { name: "Team directory", path: "/usersmanagement" },
  { name: "Notifications", path: "/transport/notifications", transport: true },
  { name: "Transport settings", path: "/transport/settings", grant: "TRANSPORT_SETTINGS", transport: true },
];

export default function Sidebar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("eac-transport-sidebar") === "collapsed",
  );
  const [pages, setPages] = useState(null);
  const [transportContext, setTransportContext] = useState(null);
  const [navigationError, setNavigationError] = useState("");
  const [navigationRetry, setNavigationRetry] = useState(0);
  const [notifications, setNotifications] = useState(null);
  const notificationMenu = useRef(null);
  const closeButton = useRef(null);
  const menuButton = useRef(null);
  const drawer = useRef(null);
  const current = menuItems.find(
    (item) => item.path.toLowerCase() === location.pathname.toLowerCase(),
  );
  const title = current?.name || "Transport";
  let user = {};
  try {
    user = JSON.parse(localStorage.getItem("userData") || "{}");
  } catch {
    /* Use account fallback. */
  }
  const name = user.name || user.username || "Your account";
  const roleValue =
    user.roles?.[0] ||
    user.role?.name ||
    user.role ||
    localStorage.getItem("userRole") ||
    "Employee";
  const role =
    typeof roleValue === "string"
      ? roleValue.replace(/^ROLE_/i, "").replaceAll("_", " ")
      : "Employee";

  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => transportApi("/notification-history?size=5&unreadOnly=true", { signal: controller.signal }).then(setNotifications).catch(() => {});
    refresh();
    const timer = window.setInterval(refresh, 60000);
    if (notificationMenu.current) notificationMenu.current.open = false;
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [location.pathname]);
  const readNotification = id => {
    transportApi(`/notifications/${id}/read`, { method: "POST" }).then(() => setNotifications(previous => previous ? { ...previous, unreadCount: Math.max(0, previous.unreadCount - 1), items: previous.items.filter(item => item.id !== id) } : previous)).catch(() => {});
  };

  useEffect(() => {
    const controller = new AbortController();
    const token = getToken();
    setNavigationError("");
    if (token) transportApi("/context", { signal: controller.signal }).then(setTransportContext).catch(error => { if (!controller.signal.aborted) setNavigationError(error.message); });
    if (token)
      apiFetch("/api/pages/my-pages", {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((result) => setPages(Array.isArray(result) ? result : []))
        .catch((error) => {
          if (error.name !== "AbortError") setPages([]);
        });
    return () => controller.abort();
  }, [navigationRetry]);

  useEffect(() => {
    localStorage.setItem(
      "eac-transport-sidebar",
      collapsed ? "collapsed" : "expanded",
    );
  }, [collapsed]);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
      if (event.key === "Tab") {
        const controls = [
          ...drawer.current.querySelectorAll("a[href], button:not([disabled])"),
        ].filter((el) => el.getClientRects().length);
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const allowed = (item) => {
    if (transportContext) return canSeeTransportPage(item, transportContext);
    return !item.transport && (item.path.toLowerCase() === location.pathname.toLowerCase() || pages?.some(page => page.path?.toLowerCase() === item.path.toLowerCase()));
  };
  return (
    <>
      {open && (
        <button
          className="tm-drawer-shade"
          aria-label="Close transport navigation"
          onClick={() => {
            setOpen(false);
            menuButton.current?.focus();
          }}
        />
      )}
      <aside
        ref={drawer}
        className={`tm-sidebar ${open ? "is-open" : ""} ${collapsed ? "is-collapsed" : ""}`}
        aria-label="Transport sidebar"
      >
        <Link className="tm-brand" to="/centralizedDashboard">
          <span className="tm-brand-mark">E</span>
          <span className="tm-brand-name">
            EAC Transport<small>YOUR FLEET, CONNECTED</small>
          </span>
        </Link>
        <button
          ref={closeButton}
          className="tm-close-drawer"
          aria-label="Close navigation"
          onClick={() => {
            setOpen(false);
            menuButton.current?.focus();
          }}
        >
          <span aria-hidden="true">×</span>
        </button>
        <div className="tm-workspace-label">TRANSPORT WORKSPACE</div>
        <nav aria-label="Transport navigation">
          {navigationError && <div className="tm-nav-error" role="alert"><p>Transport permissions could not be loaded. {navigationError}</p><button onClick={() => setNavigationRetry(value => value + 1)}>Retry navigation</button></div>}
          {menuItems.filter(allowed).map((item) => {
            const active =
              item.path.toLowerCase() === location.pathname.toLowerCase();
            return (
              <div key={item.path}>
                {item.group && (
                  <span className="tm-nav-group">{item.group}</span>
                )}
                <Link
                  to={item.path}
                  title={collapsed ? item.name : undefined}
                  aria-label={item.name}
                  aria-current={active ? "page" : undefined}
                  className={`tm-nav-link ${active ? "is-active" : ""}`}
                  onClick={() => setOpen(false)}
                >
                  <b className="tm-nav-short" aria-hidden="true">{item.name.split(/\s+/).slice(0,2).map(word=>word[0]).join("")}</b>
                  <span>{item.name}</span>
                  {active && <i aria-hidden="true" />}
                </Link>
              </div>
            );
          })}
        </nav>
        <div className="tm-sidebar-bottom">
          <Link className="tm-back-link" to="/centralizedDashboard">
            <span aria-hidden="true">←</span>
            <span>Back to EAC</span>
          </Link>
          <button
            className="tm-collapse"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <span aria-hidden="true">›</span> : <span aria-hidden="true">‹</span>}
            <span>Collapse sidebar</span>
          </button>
          <div className="tm-account">
            <span className="tm-account-avatar">
              {name.charAt(0).toUpperCase()}
            </span>
            <div>
              <strong>{name}</strong>
              <small>{role}</small>
            </div>
          </div>
        </div>
      </aside>
      <header className="tm-topbar">
        <div className="tm-topbar-left">
          <button
            ref={menuButton}
            className="tm-open-drawer"
            aria-label="Open transport navigation"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <span>Menu</span>
          </button>
          <span className="tm-topbar-module">
             Transport
          </span>
          <span className="tm-breadcrumb-divider" aria-hidden="true">/</span>
          <span className="tm-current-page">{title}</span>
        </div>
        <div className="tm-topbar-right">
          <span className="tm-workspace-tag">EAC workspace</span>
          {transportContext && <details className="tm-notification-menu" ref={notificationMenu}><summary aria-label={`Transport notifications, ${notifications?.unreadCount ?? 0} unread`}><span>Alerts</span>{notifications?.unreadCount > 0 && <span className="tm-notification-count">{notifications.unreadCount > 99 ? "99+" : notifications.unreadCount}</span>}</summary><div className="tm-notification-dropdown"><strong>Transport notifications</strong>{notifications?.items.length ? <ul>{notifications.items.map(item => <li key={item.id}><Link to={item.targetPath?.startsWith("/") && !item.targetPath.startsWith("//") ? item.targetPath : "/transport/notifications"} onClick={() => readNotification(item.id)}><b>{item.title}</b><span>{item.body}</span></Link></li>)}</ul> : <p>No unread notifications.</p>}<Link to="/transport/notifications">View notification history</Link></div></details>}
          <ThemeToggle />
          <span className="tm-topbar-avatar" title={name}>
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
      </header>
    </>
  );
}
