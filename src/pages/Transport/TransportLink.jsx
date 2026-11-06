import PropTypes from "prop-types";
import { Link, useNavigate } from "react-router-dom";

/** Keep transport workspace navigation in its current tab. */
export default function TransportLink({ to, onClick, replace, state, relative, preventScrollReset, ...props }) {
  const navigate = useNavigate();
  return <Link {...props} to={to} relative={relative} target="_self" onClick={event => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0) return;
    event.preventDefault();
    navigate(to, { replace, state, relative, preventScrollReset });
  }}/>;
}
TransportLink.propTypes = {
  to: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  onClick: PropTypes.func,
  replace: PropTypes.bool,
  state: PropTypes.any,
  relative: PropTypes.oneOf(["route", "path"]),
  preventScrollReset: PropTypes.bool,
};
