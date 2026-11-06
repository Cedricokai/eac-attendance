/* eslint-disable react/prop-types */
import { Component } from "react";
export default class EditorBoundary extends Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    if (this.state.error)
      return (
        <div className="fm-error" role="alert">
          This editor could not render the file safely. Use Download above to
          preserve the original, or download your unsaved copy if available.
          Close and reopen the file to retry.
        </div>
      );
    return this.props.children;
  }
}
