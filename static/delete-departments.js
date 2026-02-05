document.addEventListener('DOMContentLoaded', function() {
    loadFacilityTypesForFilter();
    loadDepartments();
});

// Load facility types into filter dropdown
async function loadFacilityTypesForFilter() {
    try {
        const response = await fetch('/api/facility-types');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const facilityTypes = await response.json();
        const select = document.getElementById('filterFacilityType');
        select.innerHTML = '<option value="">All Facility Types</option>';
        facilityTypes.forEach(ft => {
            const option = document.createElement('option');
            option.value = ft.facility_type_id;
            option.textContent = ft.type_name;
            select.appendChild(option);
        });
    } catch (error) {
        showMessage('Error loading facility types: ' + error.message, 'error');
    }
}

// Load departments based on selected filter
async function loadDepartments() {
    const facilityTypeId = document.getElementById('filterFacilityType').value;
    try {
        let departments = [];
        if (facilityTypeId) {
            const response = await fetch(`/api/departments?facility_type_id=${facilityTypeId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            departments = await response.json();
        } else {
            const response = await fetch('/api/all-departments');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            departments = await response.json();
            const enhancedDepartments = await Promise.all(
                departments.map(async dept => {
                    try {
                        const deptResponse = await fetch(`/api/department-details/${dept.department_id}`);
                        if (deptResponse.ok) {
                            const deptDetails = await deptResponse.json();
                            return { ...dept, facility_type_id: deptDetails.facility_type_id || 0 };
                        }
                    } catch (e) {
                        console.error(`Error fetching details for department ${dept.department_id}:`, e);
                    }
                    return { ...dept, facility_type_id: 0 };
                })
            );
            departments = enhancedDepartments;
        }
        displayDepartments(departments || []);
    } catch (error) {
        const tbody = document.getElementById('departmentsTableBody');
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red;">Error loading departments: ${error.message}</td></tr>`;
    }
}

// Display departments in table
function displayDepartments(departments) {
    const tbody = document.getElementById('departmentsTableBody');
    tbody.innerHTML = '';
    const departmentsArray = Array.isArray(departments) ? departments : [];
    if (departmentsArray.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="8" style="text-align: center;">No departments found matching your criteria</td>`;
        tbody.appendChild(row);
        return;
    }
    departmentsArray.forEach(dept => {
        const row = document.createElement('tr');
        const displayValue = (value) => value || 'N/A';
        const createdDate = dept.created_date ? new Date(dept.created_date).toLocaleDateString() : 'N/A';
        row.innerHTML = `
            <td>${dept.department_id}</td>
            <td>${displayValue(dept.department_name)}</td>
            <td>${displayValue(dept.department_head)}</td>
            <td>${displayValue(dept.location)}</td>
            <td>${displayValue(dept.phone_number)}</td>
            <td>${dept.facility_type_id || 0}</td>
            <td>${createdDate}</td>
            <td>
                <button class="btn-danger" onclick="deleteDepartment(${dept.department_id}, '${dept.department_name || ''}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Delete department with confirmation
async function deleteDepartment(departmentId, departmentName) {
    if (!confirm(`⚠️ WARNING: This will delete the department "${departmentName}" and ALL medical workers in this department due to cascade deletion.\n\nAre you sure you want to delete this department?`)) {
        return;
    }
    try {
        showMessage('Deleting department...', 'success');
        const response = await fetch(`/api/departments/${departmentId}`, { method: 'DELETE' });
        if (response.ok) {
            showMessage(`Department "${departmentName}" deleted successfully!`, 'success');
            setTimeout(() => { loadDepartments(); }, 1000);
        } else {
            if (response.status === 409) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Cannot delete department due to constraints');
            } else {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }
        }
    } catch (error) {
        showMessage('Error deleting department: ' + error.message, 'error');
    }
}

// Download Excel report
async function downloadReport() {
    try {
        alert('Generating report... This may take a moment.');
        const response = await fetch('/api/download-report', { method: 'GET' });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const contentDisposition = response.headers.get('content-disposition');
        let filename = 'medical_workers_report.xlsx';
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="(.+)"/);
            if (match && match[1]) filename = match[1];
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert('Report downloaded successfully!');
    } catch (error) {
        alert('Error downloading report: ' + error.message);
    }
}

// Display message to user
function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    setTimeout(() => {
        if (messageDiv.textContent === message) {
            messageDiv.textContent = '';
            messageDiv.className = 'message';
        }
    }, 5000);
}

document.getElementById('filterFacilityType').addEventListener('change', loadDepartments);