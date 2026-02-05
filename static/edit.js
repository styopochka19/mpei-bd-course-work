document.addEventListener('DOMContentLoaded', function() {
    loadAllDepartmentsForEdit();
    loadSpecializationsForEdit();
    document.getElementById('searchWorker').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchWorker();
    });
    setupEditImagePreview();
    const urlParams = new URLSearchParams(window.location.search);
    const workerId = urlParams.get('workerId');
    if (workerId) {
        const storedVersion = sessionStorage.getItem(`row_version_${workerId}`);
        document.getElementById('searchWorker').value = `ID: ${workerId}`;
        loadWorkerForEdit(workerId);
        if (storedVersion) {
            setTimeout(() => {
                const form = document.getElementById('editWorkerForm');
                if (form) form.dataset.rowVersion = storedVersion;
                sessionStorage.removeItem(`row_version_${workerId}`);
            }, 100);
        }
    }
});

function setupEditImagePreview() {
    const imageUpload = document.getElementById('editImageUpload');
    if (imageUpload) {
        imageUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            const preview = document.getElementById('editPreviewImage');
            const previewContainer = document.getElementById('editImagePreview');
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.src = e.target.result;
                    previewContainer.style.display = 'block';
                }
                reader.readAsDataURL(file);
            }
        });
    }
}

async function loadAllDepartmentsForEdit() {
    try {
        const response = await fetch('/api/all-departments');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const departments = await response.json();
        const select = document.getElementById('editDepartment');
        select.innerHTML = '<option value="">Select Department</option>';
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.department_id;
            option.textContent = dept.department_name;
            select.appendChild(option);
        });
    } catch (error) {
        showEditMessage('Error loading departments', 'error');
    }
}

async function loadSpecializationsForEdit() {
    try {
        const response = await fetch('/api/specializations');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const specializations = await response.json();
        const select = document.getElementById('editSpecialization');
        select.innerHTML = '<option value="">Select Specialization</option>';
        specializations.forEach(spec => {
            const option = document.createElement('option');
            option.value = spec.specialization_id;
            option.textContent = spec.specialization_name;
            select.appendChild(option);
        });
    } catch (error) {
        showEditMessage('Error loading specializations', 'error');
    }
}

async function searchWorker() {
    const searchTerm = document.getElementById('searchWorker').value.trim();
    if (!searchTerm) {
        showEditMessage('Please enter an ID or name to search', 'error');
        return;
    }
    try {
        const response = await fetch('/api/medical-workers');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const workers = await response.json();
        let foundWorker = null;
        if (!isNaN(searchTerm)) foundWorker = workers.find(w => w.worker_id == searchTerm);
        if (!foundWorker) {
            const searchLower = searchTerm.toLowerCase();
            foundWorker = workers.find(w =>
                w.first_name.toLowerCase().includes(searchLower) ||
                w.last_name.toLowerCase().includes(searchLower) ||
                `${w.first_name} ${w.last_name}`.toLowerCase().includes(searchLower)
            );
        }
        if (foundWorker) loadWorkerForEdit(foundWorker.worker_id);
        else showEditMessage('Worker not found. Please try a different search term.', 'error');
    } catch (error) {
        showEditMessage('Error searching for worker: ' + error.message, 'error');
    }
}

async function loadWorkerForEdit(workerId) {
    try {
        const response = await fetch(`/api/medical-workers/${workerId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const worker = await response.json();
        document.getElementById('editWorkerId').value = worker.worker_id;
        document.getElementById('editFirstName').value = worker.first_name;
        document.getElementById('editLastName').value = worker.last_name;
        document.getElementById('editEmail').value = worker.email;
        document.getElementById('editPhoneNumber').value = worker.phone_number;
        if (worker.row_version) document.getElementById('editWorkerForm').dataset.rowVersion = worker.row_version;
        const departmentSelect = document.getElementById('editDepartment');
        for (let i = 0; i < departmentSelect.options.length; i++) {
            if (departmentSelect.options[i].value == worker.department_id) {
                departmentSelect.selectedIndex = i;
                break;
            }
        }
        const specializationSelect = document.getElementById('editSpecialization');
        for (let i = 0; i < specializationSelect.options.length; i++) {
            if (specializationSelect.options[i].value == worker.specialization_id) {
                specializationSelect.selectedIndex = i;
                break;
            }
        }
        const hireDate = new Date(worker.hire_date);
        document.getElementById('editHireDate').value = hireDate.toISOString().split('T')[0];
        document.getElementById('editSalary').value = worker.salary;
        document.getElementById('editLicenseNumber').value = worker.license_number;
        const currentImagePreview = document.getElementById('currentImagePreview');
        const deleteImageBtn = document.getElementById('deleteImageBtn');
        const timestamp = new Date().getTime();
        if (worker.has_image) {
            const imageUrl = `/api/medical-workers/${workerId}/image?t=${timestamp}`;
            currentImagePreview.innerHTML = `
        <div style="margin-bottom: 10px;">
            <strong>Current Image:</strong>
        </div>
        <div style="position: relative;">
            <img src="${imageUrl}" 
                 alt="${worker.first_name} ${worker.last_name}" 
                 style="max-width: 150px; max-height: 150px; border-radius: 5px; object-fit: cover;"
                 onerror="this.onerror=null; this.style.display='none'; this.parentElement.innerHTML='<div style=\\'width: 100px; height: 100px; background-color: #f0f0f0; border-radius: 5px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px;\\'>Image Loading...</div>';">
        </div>
    `;
            deleteImageBtn.style.display = 'inline-block';
            document.getElementById('editImageBtn').style.display = 'inline-block';
        } else {
            currentImagePreview.innerHTML =
                '<div style="width: 100px; height: 100px; background-color: #f0f0f0; border-radius: 5px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px;">No Image</div>';
            deleteImageBtn.style.display = 'none';
            document.getElementById('editImageBtn').style.display = 'none';
        }
        document.getElementById('editImagePreview').style.display = 'none';
        document.getElementById('editImageUpload').value = '';
        document.getElementById('editWorkerForm').style.display = 'block';
        document.getElementById('searchWorker').value = `${worker.first_name} ${worker.last_name} (ID: ${worker.worker_id})`;
        showEditMessage(`Loaded worker: ${worker.first_name} ${worker.last_name}`, 'success');
    } catch (error) {
        showEditMessage('Error loading worker: ' + error.message, 'error');
    }
}

document.getElementById('editWorkerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = {
        first_name: document.getElementById('editFirstName').value.trim(),
        last_name: document.getElementById('editLastName').value.trim(),
        email: document.getElementById('editEmail').value.trim(),
        phone_number: document.getElementById('editPhoneNumber').value.trim(),
        department_id: parseInt(document.getElementById('editDepartment').value),
        specialization_id: parseInt(document.getElementById('editSpecialization').value),
        hire_date: document.getElementById('editHireDate').value,
        salary: parseFloat(document.getElementById('editSalary').value),
        license_number: document.getElementById('editLicenseNumber').value.trim(),
        row_version: document.getElementById('editWorkerForm').dataset.rowVersion || ''
    };
    const workerId = document.getElementById('editWorkerId').value;
    if (!formData.department_id || !formData.specialization_id) {
        showEditMessage('Please select both department and specialization', 'error');
        return;
    }
    if (!formData.row_version) {
        showEditMessage('Error: Missing version information. Please reload the worker.', 'error');
        return;
    }
    try {
        const response = await fetch(`/api/medical-workers/${workerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        if (!response.ok) {
            if (response.status === 409) {
                const errorData = await response.json();
                if (errorData.error === 'CONCURRENCY_CONFLICT') {
                    showEditMessage('⚠️ This record was modified by another user. Please reload the record and try again.', 'error');
                    if (confirm(errorData.message + '\n\nDo you want to reload the current data?')) loadWorkerForEdit(workerId);
                } else throw new Error(errorData.message || 'Conflict occurred');
                return;
            } else {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }
        }
        const imageFile = document.getElementById('editImageUpload').files[0];
        let imageUpdated = false;
        if (imageFile) {
            const imageFormData = new FormData();
            imageFormData.append('image', imageFile);
            const imageResponse = await fetch(`/api/medical-workers/${workerId}/image`, { method: 'POST', body: imageFormData });
            if (!imageResponse.ok) throw new Error('Failed to upload image');
            imageUpdated = true;
        }
        showEditMessage('Medical worker updated successfully!', 'success');
        setTimeout(async () => {
            try {
                await loadWorkerForEdit(workerId);
                if (imageUpdated) {
                    document.getElementById('editImageUpload').value = '';
                    document.getElementById('editImagePreview').style.display = 'none';
                }
            } catch (error) {}
        }, 500);
    } catch (error) {
        showEditMessage('Error updating medical worker: ' + error.message, 'error');
    }
});

function cancelEdit() {
    document.getElementById('editWorkerForm').reset();
    document.getElementById('editWorkerForm').style.display = 'none';
    document.getElementById('editWorkerForm').removeAttribute('data-row-version');
    document.getElementById('searchWorker').value = '';
    document.getElementById('editMessage').textContent = '';
    document.getElementById('currentImagePreview').innerHTML = '';
    document.getElementById('editImagePreview').style.display = 'none';
    document.getElementById('deleteImageBtn').style.display = 'none';
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

function showEditMessage(message, type) {
    const messageDiv = document.getElementById('editMessage');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    setTimeout(() => {
        if (messageDiv.textContent === message) {
            messageDiv.textContent = '';
            messageDiv.className = 'message';
        }
    }, 5000);
}

function cancelImageUpload() {
    document.getElementById('editImageUpload').value = '';
    document.getElementById('editImagePreview').style.display = 'none';
}

async function deleteCurrentImage() {
    const workerId = document.getElementById('editWorkerId').value;
    if (!workerId) return;
    if (!confirm('Are you sure you want to delete the current image?')) return;
    try {
        const response = await fetch(`/api/medical-workers/${workerId}/image`, { method: 'DELETE' });
        if (response.ok) {
            showEditMessage('Image deleted successfully', 'success');
            setTimeout(async () => {
                try { await loadWorkerForEdit(workerId); } catch (error) {}
            }, 300);
        } else throw new Error('Failed to delete image');
    } catch (error) {
        showEditMessage('Error deleting image: ' + error.message, 'error');
    }
}

let canvas, ctx;
let isDrawing = false;
let currentTool = 'brush';
let brushColor = '#FF0000';
let brushSize = 5;
let history = [];
let historyIndex = -1;
let originalImage = null;

function openImageEditor() {
    const workerId = document.getElementById('editWorkerId').value;
    if (!workerId) {
        alert('Please load a worker first');
        return;
    }
    const imageUrl = `/api/medical-workers/${workerId}/image?t=${Date.now()}`;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
        canvas = document.getElementById('imageCanvas');
        ctx = canvas.getContext('2d');
        const maxWidth = 600;
        const maxHeight = 400;
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
        }
        if (height > maxHeight) {
            width = (maxHeight / height) * width;
            height = maxHeight;
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        originalImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
        history = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
        historyIndex = 0;
        document.getElementById('imageEditorModal').style.display = 'flex';
        setupCanvasEvents();
    };
    img.onerror = function() { alert('No image found to edit. Please upload an image first.'); };
    img.src = imageUrl;
}

function setupCanvasEvents() {
    canvas.onmousedown = startDrawing;
    canvas.onmousemove = draw;
    canvas.onmouseup = stopDrawing;
    canvas.onmouseout = stopDrawing;
    canvas.ontouchstart = function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        startDrawing({ clientX: touch.clientX, clientY: touch.clientY });
    };
    canvas.ontouchmove = function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        draw({ clientX: touch.clientX, clientY: touch.clientY });
    };
    canvas.ontouchend = stopDrawing;
}

function startDrawing(e) {
    isDrawing = true;
    draw(e);
    saveHistory();
}

function draw(e) {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.globalCompositeOperation = currentTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    if (currentTool === 'brush') ctx.strokeStyle = brushColor;
    else if (currentTool === 'eraser') ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

function stopDrawing() {
    isDrawing = false;
    ctx.beginPath();
}

function saveHistory() {
    history = history.slice(0, historyIndex + 2);
    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    historyIndex++;
}

function undoEdit() {
    if (historyIndex > 0) {
        historyIndex--;
        ctx.putImageData(history[historyIndex], 0, 0);
    }
}

function redoEdit() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        ctx.putImageData(history[historyIndex], 0, 0);
    }
}

function resetImage() {
    if (originalImage && confirm('Reset to original image? All edits will be lost.')) {
        ctx.putImageData(originalImage, 0, 0);
        history = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
        historyIndex = 0;
    }
}

function setTool(tool) {
    currentTool = tool;
    document.getElementById('toolBrush').classList.toggle('active', tool === 'brush');
    document.getElementById('toolEraser').classList.toggle('active', tool === 'eraser');
    if (!document.querySelector('#toolBrush.active')) {
        document.getElementById('toolBrush').classList.remove('active');
        document.getElementById('toolEraser').classList.remove('active');
    }
    const activeBtn = document.getElementById(`tool${tool.charAt(0).toUpperCase() + tool.slice(1)}`);
    activeBtn.classList.add('active');
}

function setBrushColor(color) {
    brushColor = color;
    document.getElementById('customColor').value = color;
}

function closeImageEditor() {
    if (confirm('Close editor without saving?')) {
        document.getElementById('imageEditorModal').style.display = 'none';
    }
}

async function saveEditedImage() {
    try {
        const workerId = document.getElementById('editWorkerId').value;
        canvas.toBlob(async function(blob) {
            const formData = new FormData();
            formData.append('image', blob, `worker_${workerId}_edited.png`);
            const response = await fetch(`/api/medical-workers/${workerId}/image`, { method: 'POST', body: formData });
            if (response.ok) {
                showEditMessage('Image saved successfully!', 'success');
                document.getElementById('imageEditorModal').style.display = 'none';
                setTimeout(async () => { await loadWorkerForEdit(workerId); }, 500);
            } else throw new Error('Failed to save image');
        }, 'image/png');
    } catch (error) {
        showEditMessage('Error saving image: ' + error.message, 'error');
    }
}

document.getElementById('brushSize').addEventListener('input', function(e) {
    brushSize = parseInt(e.target.value);
    document.getElementById('brushSizeValue').textContent = brushSize;
});