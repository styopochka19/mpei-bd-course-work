// Load facility types and specializations when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded, initializing...');
    loadFacilityTypes();
    loadSpecializations();

    // Set today's date as default for hire date
    document.getElementById('hireDate').valueAsDate = new Date();

    // Set up event listener only once
    setupEventListeners();
});

// Set up all event listeners once
function setupEventListeners() {
    const facilityTypeSelect = document.getElementById('facilityType');

    // Remove any existing event listeners
    facilityTypeSelect.replaceWith(facilityTypeSelect.cloneNode(true));

    // Get the new reference
    const newFacilityTypeSelect = document.getElementById('facilityType');

    // Add event listener once
    newFacilityTypeSelect.addEventListener('change', function() {
        console.log('Facility type changed to:', this.value);
        loadDepartments();
    });

    console.log('Event listeners set up');
}

async function loadFacilityTypes() {
    try {
        console.log('Loading facility types...');
        const response = await fetch('/api/facility-types');
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
        }
        const facilityTypes = await response.json();
        console.log('Facility types loaded:', facilityTypes);

        const select = document.getElementById('facilityType');
        // Clear existing options completely
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

        console.log('Facility types dropdown populated');
    } catch (error) {
        console.error('Error loading facility types:', error);
        showMessage('Error loading facility types: ' + error.message, 'error');
    }
}

async function loadDepartments() {
    const facilityTypeId = document.getElementById('facilityType').value;
    const departmentSelect = document.getElementById('department');

    console.log('=== loadDepartments called ===');
    console.log('Facility type ID:', facilityTypeId);

    // Reset department select - clear it completely
    departmentSelect.innerHTML = '<option value="">Select Department</option>';
    departmentSelect.disabled = true;

    if (!facilityTypeId) {
        departmentSelect.disabled = false;
        return;
    }

    try {
        console.log('Fetching departments from API...');
        const response = await fetch(`/api/departments?facility_type_id=${facilityTypeId}`);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
        }

        const departments = await response.json();
        console.log('Raw API response:', departments);

        // Handle null response by converting to empty array
        const departmentsArray = departments || [];
        console.log('Processed departments array:', departmentsArray);
        console.log('Number of departments from API:', departmentsArray.length);

        // Clear the dropdown again to be safe
        departmentSelect.innerHTML = '<option value="">Select Department</option>';

        if (departmentsArray.length === 0) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "No departments available for this facility type";
            option.disabled = true;
            departmentSelect.appendChild(option);
        } else {
            // Add departments to dropdown
            departmentsArray.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.department_id;
                option.textContent = dept.department_name;
                departmentSelect.appendChild(option);
            });
        }

        departmentSelect.disabled = false;

        // Verify what's actually in the dropdown
        const optionCount = departmentSelect.options.length;
        console.log('Final number of options in dropdown:', optionCount);
        console.log('Dropdown options:');
        for (let i = 0; i < departmentSelect.options.length; i++) {
            console.log(`  [${i}] ${departmentSelect.options[i].value}: ${departmentSelect.options[i].text}`);
        }

    } catch (error) {
        console.error('Error loading departments:', error);
        showMessage('Error loading departments: ' + error.message, 'error');
        departmentSelect.disabled = false;
    }
}

async function loadSpecializations() {
    try {
        console.log('Loading specializations...');
        const response = await fetch('/api/specializations');
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
        }
        const specializations = await response.json();
        console.log('Specializations loaded:', specializations);

        const select = document.getElementById('specialization');
        // Clear completely
        select.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select Specialization';
        select.appendChild(defaultOption);

        // Handle null response for specializations too
        const specializationsArray = specializations || [];

        specializationsArray.forEach(spec => {
            const option = document.createElement('option');
            option.value = spec.specialization_id;
            option.textContent = spec.specialization_name;
            select.appendChild(option);
        });

        console.log('Specializations dropdown populated');
    } catch (error) {
        console.error('Error loading specializations:', error);
        showMessage('Error loading specializations: ' + error.message, 'error');
    }
}

// Handle form submission
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

    // Validate all fields are filled
    if (!formData.department_id || !formData.specialization_id) {
        showMessage('Please select both department and specialization', 'error');
        return;
    }

    console.log('Submitting form data:', formData);

    try {
        const response = await fetch('/api/medical-workers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            showMessage('Medical worker added successfully!', 'success');
            document.getElementById('workerForm').reset();
            document.getElementById('hireDate').valueAsDate = new Date();
            // Reset selects
            document.getElementById('facilityType').selectedIndex = 0;
            document.getElementById('department').innerHTML = '<option value="">Select Department</option>';
            document.getElementById('specialization').selectedIndex = 0;
        } else {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }
    } catch (error) {
        console.error('Error adding medical worker:', error);
        showMessage('Error adding medical worker: ' + error.message, 'error');
    }
});

function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;

    setTimeout(() => {
        messageDiv.textContent = '';
        messageDiv.className = 'message';
    }, 5000);
}