// Load departments and specializations for filters
document.addEventListener('DOMContentLoaded', function() {
    console.log('View page loaded, initializing...');
    loadAllDepartments();
    loadSpecializations();
    loadWorkers();
});

async function loadAllDepartments() {
    try {
        console.log('Loading all departments...');
        const response = await fetch('/api/all-departments');
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
        }
        const departments = await response.json();
        console.log('All departments loaded:', departments);

        const select = document.getElementById('filterDepartment');
        select.innerHTML = '<option value="">All Departments</option>';

        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.department_id;
            option.textContent = dept.department_name;
            select.appendChild(option);
        });

        console.log('Department filter populated');
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

async function loadSpecializations() {
    try {
        console.log('Loading specializations for filter...');
        const response = await fetch('/api/specializations');
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
        }
        const specializations = await response.json();
        console.log('Specializations for filter loaded:', specializations);

        const select = document.getElementById('filterSpecialization');
        select.innerHTML = '<option value="">All Specializations</option>';

        specializations.forEach(spec => {
            const option = document.createElement('option');
            option.value = spec.specialization_id;
            option.textContent = spec.specialization_name;
            select.appendChild(option);
        });

        console.log('Specialization filter populated');
    } catch (error) {
        console.error('Error loading specializations:', error);
    }
}

async function loadWorkers() {
    const departmentId = document.getElementById('filterDepartment').value;
    const specializationId = document.getElementById('filterSpecialization').value;

    console.log('Loading workers with filters - Department:', departmentId, 'Specialization:', specializationId);

    let url = '/api/medical-workers';
    const params = new URLSearchParams();

    if (departmentId) params.append('department_id', departmentId);
    if (specializationId) params.append('specialization_id', specializationId);

    if (params.toString()) {
        url += '?' + params.toString();
    }

    console.log('Fetching URL:', url);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
        }

        const workers = await response.json();
        console.log('Workers loaded:', workers);

        // Handle case where response might be null or undefined
        displayWorkers(workers || []);

    } catch (error) {
        console.error('Error loading workers:', error);
        const tbody = document.getElementById('workersTableBody');
        tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: red;">Error loading workers: ${error.message}</td></tr>`;
    }
}

function displayWorkers(workers) {
    const tbody = document.getElementById('workersTableBody');
    tbody.innerHTML = '';

    // Ensure workers is always an array
    const workersArray = Array.isArray(workers) ? workers : [];

    if (workersArray.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="11" style="text-align: center;">No medical workers found matching your criteria</td>`;
        tbody.appendChild(row);
        return;
    }

    workersArray.forEach(worker => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${worker.worker_id}</td>
            <td>${worker.first_name}</td>
            <td>${worker.last_name}</td>
            <td>${worker.email}</td>
            <td>${worker.phone_number}</td>
            <td>${worker.department_name || 'N/A'}</td>
            <td>${worker.specialization_name || 'N/A'}</td>
            <td>${new Date(worker.hire_date).toLocaleDateString()}</td>
            <td>$${worker.salary?.toLocaleString() || '0'}</td>
            <td>${worker.license_number}</td>
            <td>
                <button class="btn-danger" onclick="deleteWorker(${worker.worker_id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function deleteWorker(workerId) {
    if (!confirm('Are you sure you want to delete this medical worker?')) {
        return;
    }

    try {
        const response = await fetch(`/api/medical-workers/${workerId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            console.log('Worker deleted successfully, reloading list...');
            loadWorkers();
        } else {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }
    } catch (error) {
        console.error('Error deleting medical worker:', error);
        alert('Error deleting medical worker: ' + error.message);
    }
}

// Add event listeners for filter changes
document.getElementById('filterDepartment').addEventListener('change', loadWorkers);
document.getElementById('filterSpecialization').addEventListener('change', loadWorkers);