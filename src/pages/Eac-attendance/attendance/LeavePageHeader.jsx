import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { CalendarDays, ArrowRight, ShieldCheck } from 'lucide-react';
import { getApiBaseUrl } from '../../../utils/api';
import './leavePages.css';

export default function LeavePageHeader({ role, title, description, count, loading = false }) {
  const [personName, setPersonName] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem('jwtToken');
    if (!token) return;
    const options = { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal };
    const fullName = person => [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim();
    async function loadName() {
      try {
        const response = await fetch(`${getApiBaseUrl()}/auth/me`, options);
        if (!response.ok) return;
        const user = await response.json();
        if (controller.signal.aborted) return;
        setPersonName(fullName(user) || user.fullName || user.name || user.username || '');
        if (user.email) {
          const employeeResponse = await fetch(`${getApiBaseUrl()}/api/employee/email/${encodeURIComponent(user.email)}`, options);
          if (employeeResponse.ok) {
            const employee = await employeeResponse.json();
            const name = fullName(employee);
            if (!controller.signal.aborted && name) setPersonName(name);
          }
        }
      } catch {
        // Keep the account name or neutral heading if the profile is unavailable.
      }
    }
    loadName();
    return () => controller.abort();
  }, []);
  const pageTitle = personName
    ? `${personName} — ${role === 'Individual' ? 'My leave requests' : 'Leave approvals'}`
    : title.replace(/^(Supervisor|Planner|HR)\s+/i, '').replace(/^leave/, 'Leave');
  const stages = ['Supervisor', 'Planner', 'HR'];
  return (
    <header className="leave-page-header">
      <div className="leave-header-top">
        <div className="leave-header-icon"><CalendarDays size={25} /></div>
        <span className="leave-eyebrow">People & attendance / Leave</span>
        <span className="leave-role"><ShieldCheck size={14} />{role}</span>
      </div>
      <div className="leave-header-main">
        <div><h1>{pageTitle}</h1><p>{description}</p></div>
        {count !== undefined && <div className="leave-header-count"><strong>{loading ? '—' : count}</strong><span>{role === 'Individual' ? 'Your requests' : 'Awaiting review'}</span></div>}
      </div>
      <div className="leave-workflow" aria-label="Leave approval stages">
        <span className="leave-workflow-label">Approval journey</span>
        {stages.map((stage, index) => <div key={stage} className="leave-workflow-step">
          {index > 0 && <ArrowRight size={14} aria-hidden="true" />}
          <span className={stage === role ? 'is-current' : ''}>{index + 1}. {stage}{stage === role ? ' review' : ''}</span>
        </div>)}
      </div>
    </header>
  );
}

LeavePageHeader.propTypes = {
  role: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  count: PropTypes.number,
  loading: PropTypes.bool,
};
