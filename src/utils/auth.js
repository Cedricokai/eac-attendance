export const isValidToken = (token) => {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Check token expiration
    const payload = JSON.parse(atob(parts[1]));
    const isExpired = payload.exp * 1000 < Date.now();
    
    return !isExpired;
  } catch (error) {
    return false;
  }
};

export const getToken = () => {
  const token = localStorage.getItem("jwtToken");
  return isValidToken(token) ? token : null;
};

export const handleSessionExpired = () => {
  localStorage.removeItem("jwtToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userRole");
  window.location.href = "/login";
};

export const setToken = (token) => {
  localStorage.setItem("jwtToken", token);
};

export const setRefreshToken = (token) => {
  localStorage.setItem("refreshToken", token);
};

export const setUserRole = (role) => {
  localStorage.setItem("userRole", role);
};

export const clearTokens = () => {
  localStorage.removeItem("jwtToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userRole");
};

export const getUserRole = () => {
  return localStorage.getItem("userRole");
};