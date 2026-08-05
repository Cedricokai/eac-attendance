import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  UserIcon,
  BuildingOfficeIcon,
  IdentificationIcon,
  FireIcon,
  DocumentCheckIcon,
  XMarkIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  SparklesIcon,
  CurrencyDollarIcon,
  LockClosedIcon,
  QuestionMarkCircleIcon,
  EyeIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { lunchApi } from './services/lunchApi';

// ===== IMPORT LOCAL IMAGES - FIXED CASE SENSITIVITY =====
import AmpesiImage from './assets/Ampesi.png';
import bankuImage from './assets/banku.png';
import BraisedRiceImage from './assets/BRAISED RICE.png';
import friedriceImage from './assets/friedrice.png';
import FufuImage from './assets/Fufu.png';
import JollofImage from './assets/JOLLOF.png';
import PlainRiceImage from './assets/PLAIN RICE.png';
import RedRedImage from './assets/REDRED.png';
import RiceBallsImage from './assets/RICE BALLS.png';
import waakyeImage from './assets/waakye.png';

// ===== API BASE URL =====
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:8080';
  if (hostname.startsWith('192.168.')) return import.meta.env.VITE_API_BASE_URL_LOCAL;
  return import.meta.env.VITE_API_BASE_URL_PUBLIC;
};
const API_BASE_URL = getApiBaseUrl();

// ===== CONSTANTS =====
const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const DAY_LABELS = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday'
};

// ===== MEAL IMAGE MAPPING WITH LOCAL ASSETS - FIXED REFERENCES =====
const MEAL_IMAGES = {
  // Default fallback image
  default: PlainRiceImage,

  // All meals with their corresponding images - exact matches
  "Banku": bankuImage,
  "banku": bankuImage,
  "Fried Rice": friedriceImage,
  "fried rice": friedriceImage,
  "Waakye": waakyeImage,
  "waakye": waakyeImage,
  "Red Red": RedRedImage,
  "red red": RedRedImage,
  "Fufu": FufuImage,
  "fufu": FufuImage,
  "Rice and Stew": PlainRiceImage,
  "rice and stew": PlainRiceImage,
  "Ampesi": AmpesiImage,
  "ampesi": AmpesiImage,
  "Braised Rice": BraisedRiceImage,
  "braised rice": BraisedRiceImage,
  "Rice Balls": RiceBallsImage,
  "rice balls": RiceBallsImage,
  "Jollof": JollofImage,
  "jollof": JollofImage,
  "Plain Rice": PlainRiceImage,
  "plain rice": PlainRiceImage,
};

// ===== MEAL IMAGE HELPER =====
const getMealImage = (mealName) => {
  if (!mealName) return MEAL_IMAGES.default;
  
  // Try exact match first
  if (MEAL_IMAGES[mealName]) {
    return MEAL_IMAGES[mealName];
  }
  
  // Try case-insensitive match
  const mealLower = mealName.toLowerCase();
  const found = Object.keys(MEAL_IMAGES).find(key =>
    key.toLowerCase() === mealLower || 
    mealLower.includes(key.toLowerCase()) || 
    key.toLowerCase().includes(mealLower)
  );
  
  return found ? MEAL_IMAGES[found] : MEAL_IMAGES.default;
};

// ===== IMAGE MODAL COMPONENT =====
const ImageModal = ({ isOpen, onClose, imageUrl, mealName }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="relative max-w-3xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <img
            src={imageUrl}
            alt={mealName}
            className="w-full h-auto max-h-[70vh] object-contain"
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          >
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-4 text-center">
          <h3 className="text-xl font-bold text-gray-800">{mealName}</h3>
          <p className="text-sm text-gray-500">Click outside to close</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ===== SUBCOMPONENT: Profile Card =====
const ProfileCard = ({ employee }) => {
  const initials = employee
    ? `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase()
    : 'U';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 p-4 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100"
    >
      <div className="relative flex-shrink-0">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
          {initials}
        </div>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-semibold text-gray-800 truncate">
          {employee ? `${employee.firstName} ${employee.lastName}` : 'Employee'}
        </h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
          {employee?.department && (
            <span className="flex items-center gap-1">
              <BuildingOfficeIcon className="w-3.5 h-3.5" />
              {employee.department}
            </span>
          )}
          {employee?.position && (
            <span className="flex items-center gap-1">
              <UserIcon className="w-3.5 h-3.5" />
              {employee.position}
            </span>
          )}
          {employee?.employeeId && (
            <span className="flex items-center gap-1">
              <IdentificationIcon className="w-3.5 h-3.5" />
              ID: {employee.employeeId}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ===== SUBCOMPONENT: Week Selector =====
const WeekSelector = ({ weekStart, onWeekChange }) => {
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 4);
    return end.toISOString().split('T')[0];
  }, [weekStart]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const goToPrevious = () => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() - 7);
    onWeekChange(date.toISOString().split('T')[0]);
  };

  const goToNext = () => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + 7);
    onWeekChange(date.toISOString().split('T')[0]);
  };

  const goToCurrent = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);
    onWeekChange(monday.toISOString().split('T')[0]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl shadow-sm border border-gray-100"
    >
      <div className="flex items-center gap-3">
        <CalendarIcon className="w-5 h-5 text-indigo-500" />
        <span className="text-sm font-medium text-gray-700">
          Week of <span className="text-gray-900 font-semibold">{formatDate(weekStart)}</span>
          <span className="mx-2 text-gray-400">–</span>
          <span className="text-gray-900 font-semibold">{formatDate(weekEnd)}</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={goToPrevious} className="p-2 rounded-lg hover:bg-gray-100 transition">
          <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
        </button>
        <button onClick={goToCurrent} className="px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition">
          Today
        </button>
        <button onClick={goToNext} className="p-2 rounded-lg hover:bg-gray-100 transition">
          <ChevronRightIcon className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </motion.div>
  );
};

// ===== SUBCOMPONENT: Statistics Cards =====
const StatCard = ({ title, value, icon, color, loading }) => {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          {loading ? (
            <div className="h-8 w-12 bg-gray-200 rounded animate-pulse mt-1"></div>
          ) : (
            <p className="text-2xl font-bold text-gray-800">{value}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${color} text-white shadow-lg`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
};

// ===== SUBCOMPONENT: Progress Bar =====
const ProgressBar = ({ selected, total }) => {
  const percentage = total > 0 ? Math.round((selected / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Meal Selection Progress</span>
        <span className="font-medium text-gray-800">{selected} of {total} Days Selected</span>
      </div>
      <div className="relative h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full"
        />
      </div>
      <div className="text-xs text-gray-500 text-right">{percentage}%</div>
    </div>
  );
};

// ===== SUBCOMPONENT: Meal Day Card =====
const MealDayCard = ({
  day,
  date,
  editable,
  selectedMealId,
  mealOptions,
  onSelect,
  status,
  onMealClick
}) => {
  const selectedMeal = mealOptions?.find(m => m.id === selectedMealId);
  const [imageError, setImageError] = useState(false);

  const statusConfig = {
    editable: { label: 'Editable', color: 'bg-emerald-100 text-emerald-700' },
    locked: { label: 'Locked', color: 'bg-red-100 text-red-700' },
    future: { label: 'Future', color: 'bg-blue-100 text-blue-700' },
    today: { label: 'Today', color: 'bg-amber-100 text-amber-700' },
    past: { label: 'Past', color: 'bg-gray-100 text-gray-500' }
  };

  const statusStyle = statusConfig[status] || statusConfig.editable;

  const handleImageError = () => {
    setImageError(true);
  };

  const getImageSrc = (meal) => {
    if (imageError) return MEAL_IMAGES.default;
    return meal ? getMealImage(meal.name) : MEAL_IMAGES.default;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-shadow hover:shadow-md"
    >
      <div className="flex flex-col sm:flex-row items-stretch gap-4 p-4">
        {/* Meal Image */}
        <div className="relative flex-shrink-0 w-full sm:w-40 h-32 rounded-xl overflow-hidden bg-gray-100">
          <img
            src={selectedMeal ? getImageSrc(selectedMeal) : MEAL_IMAGES.default}
            alt={selectedMeal?.name || 'No meal'}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            loading="lazy"
            onError={handleImageError}
          />
          {selectedMeal && (
            <>
              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full">
                ₵{selectedMeal.price}
              </div>
              <button
                onClick={() => onMealClick(selectedMeal.name, getImageSrc(selectedMeal))}
                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                title="View full image"
              >
                <EyeIcon className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Meal Details */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-gray-800">{DAY_LABELS[day]}</p>
              <p className="text-xs text-gray-500">{date}</p>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle.color}`}>
              {statusStyle.label}
            </span>
          </div>

          <div className="mt-3">
            {mealOptions && mealOptions.length === 2 ? (
              <div className="flex flex-wrap gap-3">
                {mealOptions.map(meal => {
                  const mealImage = getMealImage(meal.name);
                  return (
                    <button
                      key={meal.id}
                      type="button"
                      onClick={() => {
                        if (editable) {
                          onSelect(day, meal.id);
                        }
                      }}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 transition-all ${
                        selectedMealId === meal.id
                          ? 'border-indigo-500 bg-indigo-50 shadow-md'
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                      } ${!editable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                        <img
                          src={mealImage}
                          alt={meal.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = MEAL_IMAGES.default;
                          }}
                        />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className={`text-sm font-medium ${
                          selectedMealId === meal.id ? 'text-indigo-700' : 'text-gray-700'
                        }`}>
                          {meal.name}
                        </span>
                        {meal.price && (
                          <span className="text-xs text-gray-500">₵{meal.price}</span>
                        )}
                      </div>
                      {selectedMealId === meal.id && (
                        <CheckIcon className="w-4 h-4 text-indigo-600 ml-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-400">No meals configured for this day.</div>
            )}
          </div>

          {selectedMeal && (
            <div className="mt-2 text-xs text-gray-500 line-clamp-1">
              {selectedMeal.description || 'Delicious meal prepared fresh daily.'}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end sm:justify-center">
          {!editable ? (
            <LockClosedIcon className="w-5 h-5 text-gray-400" />
          ) : (
            <SparklesIcon className="w-5 h-5 text-emerald-400" />
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ===== SUBCOMPONENT: Sidebar Guidelines =====
const GuidelinesSidebar = () => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <InformationCircleIcon className="w-5 h-5 text-indigo-500" />
          Lunch Guidelines
        </h4>
        <ul className="mt-4 space-y-3 text-sm">
          <li className="flex items-start gap-2 text-gray-600">
            <ClockIcon className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <span>Meals can be edited until <strong>8:00 AM</strong> on the day.</span>
          </li>
          <li className="flex items-start gap-2 text-gray-600">
            <LockClosedIcon className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>Past days are locked and cannot be changed.</span>
          </li>
          <li className="flex items-start gap-2 text-gray-600">
            <CalendarIcon className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <span>Future days are always editable.</span>
          </li>
          <li className="flex items-start gap-2 text-gray-600">
            <QuestionMarkCircleIcon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <span>Click on any meal card to select it. Tap the eye icon to view full image.</span>
          </li>
        </ul>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button className="w-full text-center text-xs text-indigo-600 hover:text-indigo-800 font-medium">
            Contact HR
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ===== TOAST COMPONENT =====
const Toast = ({ type, message, onDismiss }) => {
  const icons = {
    success: <CheckIcon className="w-5 h-5 text-emerald-500" />,
    error: <ExclamationCircleIcon className="w-5 h-5 text-red-500" />
  };

  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl border ${
        type === 'success'
          ? 'bg-white border-emerald-100'
          : 'bg-white border-red-100'
      }`}
    >
      <div className="flex-shrink-0">{icons[type]}</div>
      <p className="text-sm font-medium text-gray-800">{message}</p>
      <button onClick={onDismiss} className="ml-4 text-gray-400 hover:text-gray-600">
        <XMarkIcon className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

// ===== MAIN COMPONENT =====
const EmployeeMealSelection = () => {
  const [employee, setEmployee] = useState(null);
  const [allMeals, setAllMeals] = useState([]);
  const [dailyMealOptions, setDailyMealOptions] = useState({});
  const [selections, setSelections] = useState({});
  const [weekStart, setWeekStart] = useState(getMondayOfCurrentWeek());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState(null);
  const [modalImage, setModalImage] = useState(null);
  const [modalMealName, setModalMealName] = useState('');

  function getMondayOfCurrentWeek() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);
    return monday.toISOString().split('T')[0];
  }

  const getDateForDay = (startDate, dayName) => {
    const index = DAYS.indexOf(dayName);
    const date = new Date(startDate);
    date.setDate(date.getDate() + index);
    return date.toISOString().split('T')[0];
  };

  const isDayEditable = (day) => {
    const date = getDateForDay(weekStart, day);
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    if (date < today) return false;
    if (date === today) {
      if (hours > 8 || (hours === 8 && minutes > 0)) return false;
      return true;
    }
    return true;
  };

  // Data fetching with employee ID from user data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('jwtToken');
        if (!token) throw new Error('No token found');

        const userRes = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!userRes.ok) {
          const text = await userRes.text();
          throw new Error(`Failed to fetch user: ${userRes.status} - ${text}`);
        }

        const userData = await userRes.json();
        console.log('🔍 User data from /auth/me:', userData);

        let employeeData = userData.employee;
        if (!employeeData) {
          console.warn('⚠️ No employee linked to this account. Creating placeholder.');
          employeeData = {
            id: userData.id || 1,
            firstName: userData.name || userData.username || 'User',
            lastName: '',
            employeeId: userData.employeeId || 'N/A',
            department: userData.department || 'N/A',
            position: userData.position || 'N/A'
          };
          setError('No employee profile linked. Using placeholder for testing.');
        }
        setEmployee(employeeData);

        const mealsRes = await lunchApi.getMeals();
        const mealsArray = Array.isArray(mealsRes) ? mealsRes : (mealsRes.data || []);
        setAllMeals(mealsArray);

        const dailyRes = await lunchApi.getDailyMeals();
        const dailyData = dailyRes || {};
        console.log('📋 Daily meal options:', dailyData);
        
        const transformedDailyOptions = {};
        DAYS.forEach(day => {
          const dayData = dailyData[day] || { meal1Id: null, meal2Id: null };
          const options = [];
          if (dayData.meal1Id) {
            const meal = mealsArray.find(m => m.id === dayData.meal1Id);
            if (meal) options.push(meal);
          }
          if (dayData.meal2Id) {
            const meal = mealsArray.find(m => m.id === dayData.meal2Id);
            if (meal) options.push(meal);
          }
          transformedDailyOptions[day] = options;
        });
        setDailyMealOptions(transformedDailyOptions);

        const employeeId = employeeData.id;
        console.log('📋 Fetching assignments for employee ID:', employeeId);
        
        const assignRes = await lunchApi.getEmployeeWeeklyAssignment(employeeId, weekStart);
        console.log('📋 Weekly assignment response:', assignRes);
        
        const days = assignRes?.days || {};
        console.log('📋 Days from response:', days);
        setSelections(days);
        
      } catch (err) {
        console.error('❌ Error fetching data:', err);
        setError(err.message || 'Failed to load data. Please refresh.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [weekStart]);

  const handleSelect = (day, mealId) => {
    if (!isDayEditable(day)) return;
    setSelections(prev => ({ ...prev, [day]: mealId }));
  };

  const handleSave = async () => {
    if (!employee) {
      setError('Employee data not loaded. Please refresh.');
      return;
    }
    
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const payload = {
        employeeId: employee.id,
        startDate: weekStart,
        days: selections,
      };
      await lunchApi.updateMyWeeklyAssignment(payload);
      setSuccess(true);
      setToast({ type: 'success', message: 'Meals saved successfully!' });
      setTimeout(() => {
        setSuccess(false);
        setToast(null);
      }, 4000);
    } catch (err) {
      console.error(err);
      let msg = 'Failed to save. Please try again.';
      if (err.message && err.message.includes('8:00 AM')) {
        msg = 'You cannot change today\'s meal after 8:00 AM.';
      }
      setError(msg);
      setToast({ type: 'error', message: msg });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleMealClick = (mealName, mealImage) => {
    setModalMealName(mealName);
    setModalImage(mealImage);
  };

  const closeModal = () => {
    setModalImage(null);
    setModalMealName('');
  };

  const selectedCount = Object.values(selections).filter(id => id !== null && id !== undefined && id !== '').length;
  const totalDays = DAYS.length;
  const lockedDays = DAYS.filter(day => !isDayEditable(day)).length;

  const dayData = useMemo(() => {
    return DAYS.map(day => {
      const date = getDateForDay(weekStart, day);
      const editable = isDayEditable(day);
      const selectedMealId = selections[day] || null;
      const options = dailyMealOptions[day] || [];
      let status = 'future';
      const today = new Date().toISOString().split('T')[0];
      if (date < today) status = 'past';
      else if (date === today) status = 'today';
      else if (editable) status = 'editable';
      else status = 'locked';
      if (!editable && date === today) status = 'locked';
      return { day, date, editable, selectedMealId, options, status };
    });
  }, [weekStart, selections, dailyMealOptions]);

  const handleWeekChange = (newStart) => {
    setWeekStart(newStart);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <AnimatePresence>
          {toast && (
            <Toast
              type={toast.type}
              message={toast.message}
              onDismiss={() => setToast(null)}
            />
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
                  <FireIcon className="w-8 h-8 text-orange-500" />
                  My Weekly Lunch Selection
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Choose one meal per day from the two available options. Click on any meal card to select it.
                </p>
              </div>
              <ProfileCard employee={employee} />
            </motion.div>

            <WeekSelector weekStart={weekStart} onWeekChange={handleWeekChange} />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Selected Meals"
                value={selectedCount}
                icon={<DocumentCheckIcon className="w-5 h-5" />}
                color="from-indigo-500 to-blue-600"
                loading={loading}
              />
              <StatCard
                title="Remaining Days"
                value={totalDays - selectedCount}
                icon={<CalendarIcon className="w-5 h-5" />}
                color="from-amber-500 to-orange-600"
                loading={loading}
              />
              <StatCard
                title="Est. Weekly Cost"
                value={`₵${0}`}
                icon={<CurrencyDollarIcon className="w-5 h-5" />}
                color="from-emerald-500 to-teal-600"
                loading={loading}
              />
              <StatCard
                title="Days Locked"
                value={lockedDays}
                icon={<LockClosedIcon className="w-5 h-5" />}
                color="from-red-500 to-rose-600"
                loading={loading}
              />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <ProgressBar selected={selectedCount} total={totalDays} />
            </div>

            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 animate-pulse">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="w-full sm:w-40 h-32 bg-gray-200 rounded-xl"></div>
                      <div className="flex-1 space-y-3">
                        <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !dailyMealOptions || Object.keys(dailyMealOptions).length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center"
              >
                <FireIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700">No meals configured</h3>
                <p className="text-gray-500 mt-2">Please contact HR to set up daily meal options.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition"
                >
                  <ArrowPathIcon className="w-4 h-4" /> Refresh
                </button>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {dayData.map(({ day, date, editable, selectedMealId, options, status }) => (
                  <MealDayCard
                    key={day}
                    day={day}
                    date={date}
                    editable={editable}
                    selectedMealId={selectedMealId}
                    mealOptions={options}
                    onSelect={handleSelect}
                    status={status}
                    onMealClick={handleMealClick}
                  />
                ))}
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="sticky bottom-0 bg-white/80 backdrop-blur-sm border-t border-gray-200 p-4 rounded-t-2xl shadow-lg md:relative md:bg-transparent md:backdrop-blur-none md:border-0 md:p-0 md:shadow-none"
            >
              <button
                onClick={handleSave}
                disabled={saving || !employee}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-5 h-5" /> Save Weekly Meals
                  </>
                )}
              </button>
              <p className="text-xs text-center text-gray-400 mt-2">
                Changes are saved to your weekly meal plan.
              </p>
            </motion.div>
          </div>

          <div className="xl:col-span-1 hidden xl:block">
            <GuidelinesSidebar />
          </div>
        </div>
      </div>

      {/* Image Modal */}
      <AnimatePresence>
        {modalImage && (
          <ImageModal
            isOpen={true}
            onClose={closeModal}
            imageUrl={modalImage}
            mealName={modalMealName}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeeMealSelection;