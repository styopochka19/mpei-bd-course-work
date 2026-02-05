document.addEventListener('DOMContentLoaded', function() {
    loadAllDepartments();
    loadSpecializations();
    loadWorkers();
});

async function loadAllDepartments() {
    try {
        const response = await fetch('/api/all-departments');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const departments = await response.json();
        const select = document.getElementById('filterDepartment');
        select.innerHTML = '<option value="">All Departments</option>';
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.department_id;
            option.textContent = dept.department_name;
            select.appendChild(option);
        });
    } catch (error) {}
}

async function loadSpecializations() {
    try {
        const response = await fetch('/api/specializations');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const specializations = await response.json();
        const select = document.getElementById('filterSpecialization');
        select.innerHTML = '<option value="">All Specializations</option>';
        specializations.forEach(spec => {
            const option = document.createElement('option');
            option.value = spec.specialization_id;
            option.textContent = spec.specialization_name;
            select.appendChild(option);
        });
    } catch (error) {}
}

async function loadWorkers() {
    const departmentId = document.getElementById('filterDepartment').value;
    const specializationId = document.getElementById('filterSpecialization').value;
    let url = '/api/medical-workers';
    const params = new URLSearchParams();
    if (departmentId) params.append('department_id', departmentId);
    if (specializationId) params.append('specialization_id', specializationId);
    if (params.toString()) url += '?' + params.toString();
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const workers = await response.json();
        displayWorkers(workers || []);
    } catch (error) {
        const tbody = document.getElementById('workersTableBody');
        tbody.innerHTML = `<tr><td colspan="13" style="text-align: center; color: red;">Error loading workers: ${error.message}</td></tr>`;
    }
}

function getWorkerImageUrl(workerId, hasImage) {
    if (!hasImage) return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50"><rect width="50" height="50" fill="%23f0f0f0"/><text x="25" y="25" font-family="Arial" font-size="12" fill="%23999" text-anchor="middle" dy=".3em">No Image</text></svg>';
    return `/api/medical-workers/${workerId}/image?t=${Date.now()}`;
}

function displayWorkers(workers) {
    const tbody = document.getElementById('workersTableBody');
    tbody.innerHTML = '';
    const workersArray = Array.isArray(workers) ? workers : [];
    if (workersArray.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="13" style="text-align: center;">No medical workers found matching your criteria</td>`;
        tbody.appendChild(row);
        return;
    }
    workersArray.forEach(worker => {
        const row = document.createElement('tr');
        const imageId = `worker-image-${worker.worker_id}`;
        const imageUrl = getWorkerImageUrl(worker.worker_id, worker.has_image);
        let imageHtml = '';
        if (worker.has_image) {
            imageHtml = `<img id="${imageId}" 
                           src="${imageUrl}" 
                           alt="${worker.first_name} ${worker.last_name}" 
                           style="width: 50px; height: 50px; border-radius: 5px; object-fit: cover;"
                           onload="this.style.display='block'"
                           onerror="this.onerror=null; this.style.display='none'; document.getElementById('${imageId}').outerHTML='<div style=\\'width: 50px; height: 50px; background-color: #f0f0f0; border-radius: 5px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px;\\'>Error</div>'">`;
        } else {
            imageHtml = `<div style="width: 50px; height: 50px; background-color: #f0f0f0; border-radius: 5px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px;">No Image</div>`;
        }
        row.innerHTML = `
            <td>${worker.worker_id}</td>
            <td style="text-align: center;">${imageHtml}</td>
            <td>${worker.first_name}</td>
            <td>${worker.last_name}</td>
            <td>${worker.email}</td>
            <td>${worker.phone_number}</td>
            <td>${worker.department_name || 'N/A'}</td>
            <td>${worker.specialization_name || 'N/A'}</td>
            <td>${new Date(worker.hire_date).toLocaleDateString()}</td>
            <td>${worker.experience || 'N/A'}</td>
            <td>$${worker.salary?.toLocaleString() || '0'}</td>
            <td>${worker.license_number}</td>
            <td>
                <button class="btn-primary" onclick="editWorker(${worker.worker_id}, '${worker.row_version || ''}')" style="margin-right: 5px; background: linear-gradient(135deg, #10b981, #059669);">Edit</button>
                <button class="btn-danger" onclick="deleteWorker(${worker.worker_id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function editWorker(workerId, rowVersion) {
    if (rowVersion) sessionStorage.setItem(`row_version_${workerId}`, rowVersion);
    sessionStorage.setItem(`editing_worker_${workerId}`, 'true');
    window.location.href = `edit.html?workerId=${workerId}`;
}

async function deleteWorker(workerId) {
    if (!confirm('Are you sure you want to delete this medical worker?')) return;
    try {
        const response = await fetch(`/api/medical-workers/${workerId}`, { method: 'DELETE' });
        if (response.ok) loadWorkers();
        else {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }
    } catch (error) {
        alert('Error deleting medical worker: ' + error.message);
    }
}

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

document.getElementById('filterDepartment').addEventListener('change', loadWorkers);
document.getElementById('filterSpecialization').addEventListener('change', loadWorkers);