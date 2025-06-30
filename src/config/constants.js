export const CATEGORIES = [
  'Projects',
  'Site Services', 
  'Ahafo North'
];

export const WORK_TYPES = [
  'Regular',
  'Contract',
  'Temporary'
];

export const JOB_POSITIONS = [
  'Quantity Surveyor',
  'Engineer',
  'Technician',
  'Supervisor',
  'Manager'
];

export const INITIAL_EMPLOYEE = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  jobPosition: '',
  category: '',
  workType: '',
  minimumRate: ''
};

export const TABLE_COLUMNS = [
  { id: 'id', label: 'Employee ID' },
  { id: 'firstName', label: 'First Name' },
  { id: 'lastName', label: 'Last Name' },
  { id: 'email', label: 'Tag Number' },
  { id: 'jobPosition', label: 'Job Position' },
  { id: 'category', label: 'Category' },
  { id: 'workType', label: 'Work Type' },
  { id: 'minimumRate', label: 'Rate' }
];
