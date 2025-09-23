import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { FiUser, FiMail, FiLock, FiPhone } from 'react-icons/fi';

function SignupPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        userName: '',
        password: '',
        confirmPassword: '',
        mobile: ''
    });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        try {
            const { name, email, password, confirmPassword, mobile, userName } = formData;
            
            if (!name || !email || !password || !confirmPassword || !mobile) {
                setError('Please fill in all fields.');
                return;
            }

            if (password !== confirmPassword) {
                throw new Error("Passwords do not match");
            }

            const response = await axios.post('http://localhost:8080/auth/signup', {
                name,
                email,
                password,
                userName,
                role: 'ROLE_CUSTOMER',
                mobile
            });

            console.log(response.data);
            navigate('/');  // Redirect to login page after signup
        } catch (error) {
            console.error('Signup failed:', error.response ? error.response.data : error.message);
            setError(error.response?.data?.message || error.message);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-6xl w-full bg-white rounded-xl shadow-lg overflow-hidden flex flex-col md:flex-row">
                {/* Left Side - Illustration */}
                <div className="md:w-1/2 bg-gradient-to-br from-blue-600 to-blue-900 p-8 flex items-center justify-center">
                    <div className="text-white text-center">
                        <h2 className="text-3xl font-bold mb-4">Join our Team</h2>
                        <p className="mb-8">Create an account to access</p>
                        <img 
                            src="https://illustrations.popsy.co/amber/digital-nomad.svg" 
                            alt="Sign up illustration" 
                            className="w-full max-w-md mx-auto"
                        />
                    </div>
                </div>
                
                {/* Right Side - Form */}
                <div className="md:w-1/2 p-8 md:p-12">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-800">Create Account</h1>
                        <p className="text-gray-600 mt-2">Fill in your details to get started</p>
                    </div>
                    
                    {error && (
                        <div className="mb-6 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                            {error}
                        </div>
                    )}
                    
                    <form onSubmit={handleSignup}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FiUser className="text-gray-400" />
                                </div>
                                <input
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    placeholder="Full Name"
                                    name="name"
                                    value={formData.name}
                                    type="text"
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FiUser className="text-gray-400" />
                                </div>
                                <input
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    placeholder="Username"
                                    name="userName"
                                    value={formData.userName}
                                    type="text"
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                        
                        <div className="mb-4 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FiMail className="text-gray-400" />
                            </div>
                            <input
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                placeholder="Email Address"
                                name="email"
                                value={formData.email}
                                type="email"
                                onChange={handleChange}
                                required
                            />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FiLock className="text-gray-400" />
                                </div>
                                <input
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    placeholder="Password"
                                    name="password"
                                    value={formData.password}
                                    type="password"
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FiLock className="text-gray-400" />
                                </div>
                                <input
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    placeholder="Confirm Password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    type="password"
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                        
                        <div className="mb-6 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FiPhone className="text-gray-400" />
                            </div>
                            <input
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                placeholder="Mobile Number"
                                name="mobile"
                                value={formData.mobile}
                                type="tel"
                                onChange={handleChange}
                                required
                            />
                        </div>
                        
                        <button
                            type="submit"
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition duration-200"
                        >
                            Create Account
                        </button>
                        
                        <div className="text-center mt-6">
                            <p className="text-gray-600">
                                Already have an account?{' '}
                              <Link to="/" className="text-blue-600 hover:underline font-medium">
    Sign in
</Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default SignupPage;