import React, { useState, useEffect } from 'react';

const WorkflowSettings = () => {
  // ----------------------- Self-contained helpers -----------------------
  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    const port = window.location.port;

    console.log("🖥️ Current hostname:", hostname);
    console.log("🔌 Current port:", port);

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      console.log("🏠 Using LOCALHOST API URL");
      return "http://localhost:8080";
    }

    if (hostname.startsWith("192.168.")) {
      console.log("🏠 Using LAN API URL");
      return import.meta.env.VITE_API_BASE_URL_LOCAL;
    }

    if (hostname === "100.114.178.13") {
      console.log("🌐 Using PUBLIC API URL");
      return import.meta.env.VITE_API_BASE_URL_PUBLIC;
    }

    console.log("🌍 Using PUBLIC API URL (fallback)");
    return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  };

  const API_BASE_URL = getApiBaseUrl();

  const getToken = () => {
    return localStorage.getItem('jwtToken');
  };

  // ----------------------- State -----------------------
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    active: true,
    conditionJson: '',
    steps: []
  });
  const [conditions, setConditions] = useState([]);

  // ----------------------- Load workflows -----------------------
  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        alert('No authentication token found. Please log in again.');
        setLoading(false);
        return;
      }
      const response = await fetch(`${API_BASE_URL}/api/settings/workflows`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        if (response.status === 401) {
          alert('Session expired. Please log in again.');
          setLoading(false);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setWorkflows(data);
    } catch (err) {
      console.error(err);
      alert('Failed to load workflows: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------- Save workflow -----------------------
  const handleSave = async () => {
    const token = getToken();
    if (!token) {
      alert('No authentication token found. Please log in again.');
      return;
    }

    const method = editingWorkflow ? 'PUT' : 'POST';
    const url = editingWorkflow
      ? `${API_BASE_URL}/api/settings/workflows/${editingWorkflow.id}`
      : `${API_BASE_URL}/api/settings/workflows`;

    const payload = {
      ...formData,
      steps: formData.steps.map((step, idx) => ({
        ...step,
        stepOrder: idx,
        finalStep: step.finalStep || false,
        requiresApproval: step.requiresApproval !== false,
        rejectStatus: step.rejectStatus || null
      }))
    };

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Save failed');
      }
      alert(`Workflow ${editingWorkflow ? 'updated' : 'created'} successfully`);
      loadWorkflows();
      setShowForm(false);
      setEditingWorkflow(null);
      resetForm();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // ----------------------- Delete workflow -----------------------
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this workflow?')) return;
    const token = getToken();
    if (!token) {
      alert('No authentication token found.');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings/workflows/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Delete failed');
      alert('Workflow deleted');
      loadWorkflows();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // ----------------------- Form helpers -----------------------
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      active: true,
      conditionJson: '',
      steps: []
    });
    setConditions([]);
  };

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          stepOrder: prev.steps.length,
          stepName: '',
          requiredRole: '',
          targetStatus: '',
          rejectStatus: '',
          requiresApproval: true,
          finalStep: false
        }
      ]
    }));
  };

  const updateStep = (idx, field, value) => {
    const newSteps = [...formData.steps];
    newSteps[idx] = { ...newSteps[idx], [field]: value };
    setFormData({ ...formData, steps: newSteps });
  };

  const removeStep = (idx) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== idx)
    }));
  };

  const moveStep = (idx, direction) => {
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === formData.steps.length - 1)) return;
    const newSteps = [...formData.steps];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newSteps[idx], newSteps[swapIdx]] = [newSteps[swapIdx], newSteps[idx]];
    setFormData({ ...formData, steps: newSteps });
  };

  // ----------------------- Condition builder -----------------------
  useEffect(() => {
    if (formData.conditionJson && formData.conditionJson.trim()) {
      try {
        setConditions(JSON.parse(formData.conditionJson));
      } catch (e) {
        setConditions([]);
      }
    } else {
      setConditions([]);
    }
  }, [formData.conditionJson]);

  const updateConditions = (newConditions) => {
    setConditions(newConditions);
    setFormData({
      ...formData,
      conditionJson: newConditions.length ? JSON.stringify(newConditions) : ''
    });
  };

  const addCondition = () => {
    updateConditions([
      ...conditions,
      { field: 'ppeRequest', operator: 'eq', value: false }
    ]);
  };

  const updateCondition = (idx, field, value) => {
    const newConds = [...conditions];
    newConds[idx][field] = value;
    updateConditions(newConds);
  };

  const removeCondition = (idx) => {
    updateConditions(conditions.filter((_, i) => i !== idx));
  };

  // ----------------------- Render -----------------------
  if (loading) {
    return <div className="text-center py-8">Loading workflows...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Inventory Request Workflows</h3>
        <button
          onClick={() => {
            setEditingWorkflow(null);
            resetForm();
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + Add Workflow
        </button>
      </div>

      {showForm && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <h4 className="text-md font-semibold mb-4">{editingWorkflow ? 'Edit' : 'New'} Workflow</h4>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Workflow Name *"
              className="w-full border rounded p-2"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <textarea
              placeholder="Description"
              className="w-full border rounded p-2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              />
              <span>Active (workflow will be used for matching requests)</span>
            </label>

            {/* Condition builder */}
            <div className="border rounded p-4 bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <h5 className="font-medium">Conditions (all must match)</h5>
                <button type="button" onClick={addCondition} className="text-blue-600 text-sm">
                  + Add Condition
                </button>
              </div>
              {conditions.length === 0 && (
                <p className="text-gray-500 text-sm">No conditions – this workflow matches all requests.</p>
              )}
              {conditions.map((cond, idx) => (
                <div key={idx} className="flex gap-2 items-center mb-2">
                  <select
                    value={cond.field}
                    onChange={(e) => updateCondition(idx, 'field', e.target.value)}
                    className="border rounded p-1"
                  >
                    <option value="ppeRequest">PPE Request</option>
                    <option value="hasManualProducts">Has Manual Products</option>
                    <option value="department">Department</option>
                    <option value="projectName">Project Name</option>
                    <option value="totalQuantity">Total Quantity</option>
                  </select>
                  <select
                    value={cond.operator}
                    onChange={(e) => updateCondition(idx, 'operator', e.target.value)}
                    className="border rounded p-1"
                  >
                    <option value="eq">equals</option>
                    <option value="ne">not equals</option>
                    <option value="gt">greater than</option>
                    <option value="lt">less than</option>
                    <option value="contains">contains</option>
                  </select>
                  <input
                    type={cond.field === 'totalQuantity' ? 'number' : 'text'}
                    value={cond.value}
                    onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                    className="border rounded p-1 flex-1"
                    placeholder="Value"
                  />
                  <button onClick={() => removeCondition(idx)} className="text-red-600">✖</button>
                </div>
              ))}
            </div>

            {/* Steps */}
            <div className="border-t pt-4">
              <h5 className="font-medium mb-2">Workflow Steps (order matters)</h5>
              {formData.steps.length === 0 && (
                <p className="text-gray-500 text-sm mb-2">No steps defined. Click "Add Step" to create approval chain.</p>
              )}
              {formData.steps.map((step, idx) => (
                <div key={idx} className="border p-4 mb-4 rounded bg-gray-50 relative">
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button onClick={() => moveStep(idx, 'up')} className="text-gray-600">▲</button>
                    <button onClick={() => moveStep(idx, 'down')} className="text-gray-600">▼</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <input
                      placeholder="Step Name (e.g., Planner Approval)"
                      value={step.stepName}
                      onChange={(e) => updateStep(idx, 'stepName', e.target.value)}
                      className="border p-2 rounded"
                    />
                    <input
                      placeholder="Required Role (e.g., PLANNER, MANAGER, HR)"
                      value={step.requiredRole}
                      onChange={(e) => updateStep(idx, 'requiredRole', e.target.value)}
                      className="border p-2 rounded"
                    />
                    <input
                      placeholder="Target Status (e.g., PLANNER_APPROVED)"
                      value={step.targetStatus}
                      onChange={(e) => updateStep(idx, 'targetStatus', e.target.value)}
                      className="border p-2 rounded"
                    />
                    <input
                      placeholder="Reject Status (optional)"
                      value={step.rejectStatus || ''}
                      onChange={(e) => updateStep(idx, 'rejectStatus', e.target.value)}
                      className="border p-2 rounded"
                    />
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={step.requiresApproval}
                        onChange={(e) => updateStep(idx, 'requiresApproval', e.target.checked)}
                      />
                      Requires Approval
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={step.finalStep}
                        onChange={(e) => updateStep(idx, 'finalStep', e.target.checked)}
                      />
                      Final Step (workflow ends here)
                    </label>
                  </div>
                  <button onClick={() => removeStep(idx)} className="mt-2 text-red-600 text-sm">
                    Remove Step
                  </button>
                </div>
              ))}
              <button onClick={addStep} className="text-blue-600 text-sm border border-blue-300 px-3 py-1 rounded">
                + Add Step
              </button>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded">Save Workflow</button>
            </div>
          </div>
        </div>
      )}

      {/* Workflows table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conditions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Steps</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {workflows.map((wf) => (
              <tr key={wf.id}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{wf.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{wf.description || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">
                  {wf.conditionJson ? '✅ Custom' : 'Default (all requests)'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{wf.steps?.length || 0} steps</td>
                <td className="px-6 py-4 text-sm">
                  {wf.active ? 
                    <span className="text-green-600">● Active</span> : 
                    <span className="text-gray-400">● Inactive</span>
                  }
                </td>
                <td className="px-6 py-4 text-right text-sm">
                  <button
                    onClick={() => {
                      setEditingWorkflow(wf);
                      setFormData({
                        name: wf.name,
                        description: wf.description || '',
                        active: wf.active,
                        conditionJson: wf.conditionJson || '',
                        steps: (wf.steps || []).sort((a,b) => a.stepOrder - b.stepOrder)
                      });
                      if (wf.conditionJson) {
                        try {
                          setConditions(JSON.parse(wf.conditionJson));
                        } catch(e) { setConditions([]); }
                      } else {
                        setConditions([]);
                      }
                      setShowForm(true);
                    }}
                    className="text-blue-600 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(wf.id)}
                    className="text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {workflows.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                  No workflows defined. Click "Add Workflow" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WorkflowSettings;