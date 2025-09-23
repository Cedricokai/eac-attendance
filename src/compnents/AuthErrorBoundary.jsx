// components/AuthErrorBoundary.jsx
import { Component } from 'react';
import { useNavigate } from 'react-router-dom';

class AuthErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    if (error.message.includes('auth') || error.message.includes('token')) {
      return { hasError: true };
    }
    return null;
  }

  componentDidCatch(error, errorInfo) {
    if (error.message.includes('auth') || error.message.includes('token')) {
      localStorage.removeItem('jwtToken');
      localStorage.removeItem('userRole');
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-800">Session Expired</h2>
            <p className="text-gray-600">Please login again to continue</p>
            <button
              onClick={() => window.location.href = '/'}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              Login Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AuthErrorBoundary;