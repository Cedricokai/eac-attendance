import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate(); // useNavigate is used in React Router v6

  useEffect(() => {
    // Set a timeout to redirect to the attendance page after 5 seconds
    const redirectTimer = setTimeout(() => {
      navigate("/attendance"); // Use navigate instead of history.push
    }, 5000); // 5000 milliseconds = 5 seconds

    // Cleanup the timer if the component unmounts
    return () => clearTimeout(redirectTimer);
  }, [navigate]); // Add navigate to the dependency array

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold text-blue-600 mb-4">
        Welcome to EAC Electrical Solution
      </h1>
      <p className="text-gray-600 mb-8">You will be redirected to the attendance page shortly...</p>
      <Link
        to="/attendance"
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-300"
      >
        Go to Attendance
      </Link>
    </div>
  );
}

export default Home;