USE master;

CREATE TABLE facility_types (
                                facility_type_id INT PRIMARY KEY IDENTITY(1, 1),
                                type_name VARCHAR(50) NOT NULL UNIQUE,
                                description VARCHAR(200),
                                typical_bed_capacity INT,
                                accreditation_required BIT DEFAULT 1
);

CREATE TABLE specializations (
                                 specialization_id INT PRIMARY KEY IDENTITY(1, 1),
                                 specialization_name VARCHAR(100) NOT NULL UNIQUE,
                                 description TEXT,
                                 category VARCHAR(50),
                                 required_years_training INT,
                                 certification_required BIT DEFAULT 1
);

CREATE TABLE departments (
                             department_id INT PRIMARY KEY IDENTITY(1, 1),
                             department_name VARCHAR(100) NOT NULL UNIQUE,
                             department_head VARCHAR(100),
                             location VARCHAR(100),
                             phone_number VARCHAR(20),
                             facility_type_id INT NOT NULL,
                             created_date DATETIME2 DEFAULT GETDATE(),

                             FOREIGN KEY (facility_type_id) REFERENCES facility_types(facility_type_id)
);

CREATE TABLE medical_workers (
                                 worker_id INT PRIMARY KEY IDENTITY(1, 1),
                                 first_name VARCHAR(50) NOT NULL,
                                 last_name VARCHAR(50) NOT NULL,
                                 email VARCHAR(100) UNIQUE,
                                 phone_number VARCHAR(20),
                                 department_id INT NOT NULL,
                                 specialization_id INT NOT NULL,
                                 hire_date DATE NOT NULL,
                                 salary DECIMAL(10,2),
                                 license_number VARCHAR(50) UNIQUE,
                                 created_date DATETIME2 DEFAULT GETDATE(),

                                 FOREIGN KEY (department_id) REFERENCES departments(department_id),
                                 FOREIGN KEY (specialization_id) REFERENCES specializations(specialization_id)
);

-- Insert data into facility_types
INSERT INTO facility_types (type_name, description, typical_bed_capacity, accreditation_required)
VALUES
    ('Hospital', 'General medical and surgical facility', 300, 1),
    ('Clinic', 'Outpatient care facility', 50, 1),
    ('Specialty Center', 'Focused medical specialty facility', 100, 1),
    ('Urgent Care', 'Emergency and immediate care facility', 25, 1),
    ('Research Institute', 'Medical research and clinical trials', 10, 0);

-- Insert data into specializations
INSERT INTO specializations (specialization_name, description, category, required_years_training, certification_required)
VALUES
    ('Cardiology', 'Heart and cardiovascular system specialist', 'Internal Medicine', 6, 1),
    ('Neurology', 'Nervous system disorders specialist', 'Internal Medicine', 5, 1),
    ('Pediatrics', 'Medical care for infants, children, and adolescents', 'Primary Care', 3, 1),
    ('Orthopedics', 'Musculoskeletal system specialist', 'Surgery', 5, 1),
    ('Dermatology', 'Skin, hair, and nail conditions specialist', 'Internal Medicine', 4, 1),
    ('Emergency Medicine', 'Acute medical conditions and trauma', 'Emergency Care', 3, 1),
    ('Oncology', 'Cancer diagnosis and treatment', 'Internal Medicine', 5, 1),
    ('Psychiatry', 'Mental health and behavioral disorders', 'Mental Health', 4, 1);

-- Insert data into departments
INSERT INTO departments (department_name, department_head, location, phone_number, facility_type_id)
VALUES
    ('Cardiology Department', 'Dr. Sarah Johnson', 'Main Building, 2nd Floor', '(555) 123-4567', 1),
    ('Neurology Department', 'Dr. Michael Chen', 'Main Building, 3rd Floor', '(555) 123-4568', 1),
    ('Pediatrics Department', 'Dr. Emily Rodriguez', 'West Wing, 1st Floor', '(555) 123-4569', 1),
    ('Orthopedics Department', 'Dr. James Wilson', 'East Wing, 2nd Floor', '(555) 123-4570', 1),
    ('Emergency Department', 'Dr. Lisa Thompson', 'Emergency Building', '(555) 123-4571', 1),
    ('Dermatology Clinic', 'Dr. Robert Brown', 'Clinic Building A', '(555) 123-4572', 2),
    ('Oncology Research', 'Dr. Patricia Lee', 'Research Center', '(555) 123-4573', 5);

-- Insert data into medical_workers
INSERT INTO medical_workers (first_name, last_name, email, phone_number, department_id, specialization_id, hire_date, salary, license_number)
VALUES
    ('Sarah', 'Johnson', 's.johnson@medicalcenter.org', '(555) 111-0001', 1, 1, '2018-03-15', 185000.00, 'CARD123456'),
    ('Michael', 'Chen', 'm.chen@medicalcenter.org', '(555) 111-0002', 2, 2, '2019-06-20', 175000.00, 'NEUR789012'),
    ('Emily', 'Rodriguez', 'e.rodriguez@medicalcenter.org', '(555) 111-0003', 3, 3, '2020-01-10', 165000.00, 'PED345678'),
    ('James', 'Wilson', 'j.wilson@medicalcenter.org', '(555) 111-0004', 4, 4, '2017-11-05', 190000.00, 'ORT901234'),
    ('Lisa', 'Thompson', 'l.thompson@medicalcenter.org', '(555) 111-0005', 5, 6, '2019-08-12', 170000.00, 'EME567890'),
    ('Robert', 'Brown', 'r.brown@medicalcenter.org', '(555) 111-0006', 6, 5, '2021-02-28', 160000.00, 'DER123789'),
    ('Patricia', 'Lee', 'p.lee@medicalcenter.org', '(555) 111-0007', 7, 7, '2016-04-22', 195000.00, 'ONC456123'),
    ('David', 'Martinez', 'd.martinez@medicalcenter.org', '(555) 111-0008', 1, 1, '2022-03-01', 145000.00, 'CARD789456'),
    ('Jennifer', 'Davis', 'j.davis@medicalcenter.org', '(555) 111-0009', 2, 2, '2023-01-15', 155000.00, 'NEUR234567'),
    ('Kevin', 'Anderson', 'k.anderson@medicalcenter.org', '(555) 111-0010', 3, 3, '2022-07-10', 85000.00, 'PED890123'),
    ('Amanda', 'Garcia', 'a.garcia@medicalcenter.org', '(555) 111-0011', 4, 4, '2020-09-18', 168000.00, 'ORT456789'),
    ('Brian', 'Taylor', 'b.taylor@medicalcenter.org', '(555) 111-0012', 5, 6, '2023-03-01', 162000.00, 'EME012345'),
    ('Nicole', 'White', 'n.white@medicalcenter.org', '(555) 111-0013', 6, 5, '2021-11-30', 135000.00, 'DER678901'),
    ('Christopher', 'Harris', 'c.harris@medicalcenter.org', '(555) 111-0014', 7, 7, '2019-05-14', 182000.00, 'ONC234567');
