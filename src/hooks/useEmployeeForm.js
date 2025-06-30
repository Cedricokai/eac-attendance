import { useState } from 'react';

const initialEmployeeState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  jobPosition: '',
  category: '',
  workType: '',
  minimumRate: ''
};

export default function useEmployeeForm(initialState = initialEmployeeState) {
  const [employee, setEmployee] = useState(initialState);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!employee.firstName) newErrors.firstName = 'First name is required';
    if (!employee.lastName) newErrors.lastName = 'Last name is required';
    if (!employee.email) newErrors.email = 'Tag number is required';
    if (!employee.jobPosition) newErrors.jobPosition = 'Job position is required';
    if (!employee.workType) newErrors.workType = 'Work type is required';
    if (!employee.minimumRate) newErrors.minimumRate = 'Rate is required';
    if (!employee.category) newErrors.category = 'Category is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEmployee(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name, value) => {
    setEmployee(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setEmployee(initialEmployeeState);
    setErrors({});
  };

  const setFormData = (data) => {
    setEmployee(data);
  };

  return {
    employee,
    errors,
    handleChange,
    handleSelectChange,
    validate,
    resetForm,
    setFormData,
    setEmployee
  };
}
