document.addEventListener('DOMContentLoaded', function() {
    loadFacilityTypes();
    loadSpecializations();
    document.getElementById('hireDate').valueAsDate = new Date();
    setupEventListeners();
    setupImagePreview();
});

function setupImagePreview() {
    const imageUpload = document.getElementById('imageUpload');
    if (imageUpload) {
        imageUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            const preview = document.getElementById('previewImage');
            const previewContainer = document.getElementById('imagePreview');
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.src = e.target.result;
                    previewContainer.style.display = 'block';
                }
                reader.readAsDataURL(file);
            } else {
                previewContainer.style.display = 'none';
            }
        });
    }
}

function setupEventListeners() {
    const facilityTypeSelect = document.getElementById('facilityType');
    facilityTypeSelect.replaceWith(facilityTypeSelect.cloneNode(true));
    const newFacilityTypeSelect = document.getElementById('facilityType');
    newFacilityTypeSelect.addEventListener('change', function() {
        loadDepartments();
    });
}

async function loadFacilityTypes() {
    try {
        const response = await fetch('/api/facility-types');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const facilityTypes = await response.json();
        const select = document.getElementById('facilityType');
        select.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select Facility Type';
        select.appendChild(defaultOption);
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

async function loadDepartments() {
    const facilityTypeId = document.getElementById('facilityType').value;
    const departmentSelect = document.getElementById('department');
    departmentSelect.innerHTML = '<option value="">Select Department</option>';
    departmentSelect.disabled = true;
    if (!facilityTypeId) {
        departmentSelect.disabled = false;
        return;
    }
    try {
        const response = await fetch(`/api/departments?facility_type_id=${facilityTypeId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const departments = await response.json();
        const departmentsArray = departments || [];
        departmentSelect.innerHTML = '<option value="">Select Department</option>';
        if (departmentsArray.length === 0) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "No departments available for this facility type";
            option.disabled = true;
            departmentSelect.appendChild(option);
        } else {
            departmentsArray.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.department_id;
                option.textContent = dept.department_name;
                departmentSelect.appendChild(option);
            });
        }
        departmentSelect.disabled = false;
    } catch (error) {
        showMessage('Error loading departments: ' + error.message, 'error');
        departmentSelect.disabled = false;
    }
}

async function loadSpecializations() {
    try {
        const response = await fetch('/api/specializations');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const specializations = await response.json();
        const select = document.getElementById('specialization');
        select.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select Specialization';
        select.appendChild(defaultOption);
        const specializationsArray = specializations || [];
        specializationsArray.forEach(spec => {
            const option = document.createElement('option');
            option.value = spec.specialization_id;
            option.textContent = spec.specialization_name;
            select.appendChild(option);
        });
    } catch (error) {
        showMessage('Error loading specializations: ' + error.message, 'error');
    }
}

document.getElementById('workerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = {
        first_name: document.getElementById('firstName').value.trim(),
        last_name: document.getElementById('lastName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone_number: document.getElementById('phoneNumber').value.trim(),
        department_id: parseInt(document.getElementById('department').value),
        specialization_id: parseInt(document.getElementById('specialization').value),
        hire_date: document.getElementById('hireDate').value,
        salary: parseFloat(document.getElementById('salary').value),
        license_number: document.getElementById('licenseNumber').value.trim()
    };
    if (!formData.department_id || !formData.specialization_id) {
        showMessage('Please select both department and specialization', 'error');
        return;
    }
    try {
        const workerResponse = await fetch('/api/medical-workers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        if (!workerResponse.ok) throw new Error(`Server error: ${workerResponse.status}`);
        const workerResult = await workerResponse.json();
        const workerId = workerResult.worker_id;
        const imageFile = document.getElementById('imageUpload').files[0];
        if (imageFile) {
            try {
                const imageFormData = new FormData();
                imageFormData.append('image', imageFile);
                const imageResponse = await fetch(`/api/medical-workers/${workerId}/image`, {
                    method: 'POST',
                    body: imageFormData
                });
                if (!imageResponse.ok) throw new Error('Failed to upload image');
            } catch (error) {}
        }
        showMessage('Medical worker added successfully!', 'success');
        document.getElementById('workerForm').reset();
        document.getElementById('hireDate').valueAsDate = new Date();
        document.getElementById('imagePreview').style.display = 'none';
        document.getElementById('facilityType').selectedIndex = 0;
        document.getElementById('department').innerHTML = '<option value="">Select Department</option>';
        document.getElementById('specialization').selectedIndex = 0;
    } catch (error) {
        showMessage('Error adding medical worker: ' + error.message, 'error');
    }
});

async function downloadReport() {
    try {
        showMessage('Generating report...', 'success');
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
        showMessage('Report downloaded successfully!', 'success');
    } catch (error) {
        showMessage('Error downloading report: ' + error.message, 'error');
    }
}

function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    setTimeout(() => {
        messageDiv.textContent = '';
        messageDiv.className = 'message';
    }, 5000);
}