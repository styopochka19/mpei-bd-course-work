package main

import (
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	_ "github.com/denisenkom/go-mssqldb"
	"github.com/gorilla/mux"
	"github.com/tealeg/xlsx"
)

var db *sql.DB

type FacilityType struct {
	FacilityTypeID int    `json:"facility_type_id"`
	TypeName       string `json:"type_name"`
	Description    string `json:"description"`
}

type Specialization struct {
	SpecializationID   int    `json:"specialization_id"`
	SpecializationName string `json:"specialization_name"`
	Category           string `json:"category"`
}

type Department struct {
	DepartmentID     int     `json:"department_id"`
	DepartmentName   string  `json:"department_name"`
	DepartmentHead   *string `json:"department_head,omitempty"`
	Location         *string `json:"location,omitempty"`
	PhoneNumber      *string `json:"phone_number,omitempty"`
	FacilityTypeID   int     `json:"facility_type_id"`
	FacilityTypeName string  `json:"facility_type_name"`
	CreatedDate      *string `json:"created_date,omitempty"`
}

type MedicalWorker struct {
	WorkerID           int     `json:"worker_id"`
	FirstName          string  `json:"first_name"`
	LastName           string  `json:"last_name"`
	Email              string  `json:"email"`
	PhoneNumber        string  `json:"phone_number"`
	DepartmentID       int     `json:"department_id"`
	DepartmentName     string  `json:"department_name"`
	SpecializationID   int     `json:"specialization_id"`
	SpecializationName string  `json:"specialization_name"`
	HireDate           string  `json:"hire_date"`
	Salary             float64 `json:"salary"`
	LicenseNumber      string  `json:"license_number"`
	HasImage           bool    `json:"has_image"`
	RowVersion         string  `json:"row_version,omitempty"`
	Experience         string  `json:"experience,omitempty"`
}

// Add this struct with your other type definitions
type DepartmentStat struct {
	DepartmentID             int      `json:"department_id"`
	DepartmentName           string   `json:"department_name"`
	FacilityType             *string  `json:"facility_type,omitempty"`
	DepartmentHead           *string  `json:"department_head,omitempty"`
	Location                 *string  `json:"location,omitempty"`
	PhoneNumber              *string  `json:"phone_number,omitempty"`
	CreatedDate              *string  `json:"created_date,omitempty"`
	TotalWorkers             int      `json:"total_workers"`
	AvgSalary                *float64 `json:"avg_salary,omitempty"`
	MinSalary                *float64 `json:"min_salary,omitempty"`
	MaxSalary                *float64 `json:"max_salary,omitempty"`
	TotalSalaryBudget        *float64 `json:"total_salary_budget,omitempty"`
	EarliestHireDate         *string  `json:"earliest_hire_date,omitempty"`
	LatestHireDate           *string  `json:"latest_hire_date,omitempty"`
	UniqueSpecializations    int      `json:"unique_specializations"`
	AvgYearsExperience       *float64 `json:"avg_years_experience,omitempty"`
	MostCommonSpecialization *string  `json:"most_common_specialization,omitempty"`
}

func initDB() {
	var err error
	connString := "server=MSSERVER;user id=sa;password=123;database=B2;trusted_connection=yes;encrypt=disable;"
	db, err = sql.Open("sqlserver", connString)
	if err != nil {
		log.Fatal("Error creating connection pool: ", err.Error())
	}
	err = db.Ping()
	if err != nil {
		log.Printf("Warning: Could not ping database: %v", err)
		log.Println("Continuing anyway - connection might work when queries are executed")
	} else {
		fmt.Println("Connected to database successfully!")
	}
}

func hexToVarbinary(hexStr string) (interface{}, error) {
	hexStr = strings.TrimPrefix(hexStr, "0x")
	if hexStr == "" {
		return nil, nil
	}
	bytes, err := hex.DecodeString(hexStr)
	if err != nil {
		return nil, err
	}
	return bytes, nil
}

func getWorkerImage(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	workerID := vars["id"]
	var imageData []byte
	err := db.QueryRow("SELECT image_data FROM medical_workers WHERE worker_id = @p1", workerID).Scan(&imageData)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Worker not found", http.StatusNotFound)
			return
		}
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if len(imageData) == 0 {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	w.Header().Set("Content-Type", "image/jpeg")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	w.Write(imageData)
}

func uploadWorkerImage(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	vars := mux.Vars(r)
	workerID := vars["id"]
	err := r.ParseMultipartForm(5 << 20)
	if err != nil {
		http.Error(w, "File too large", http.StatusBadRequest)
		return
	}
	file, _, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "Error retrieving file", http.StatusBadRequest)
		return
	}
	defer file.Close()
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "Error reading file", http.StatusInternalServerError)
		return
	}
	query := `UPDATE medical_workers SET image_data = @p1 WHERE worker_id = @p2`
	_, err = db.Exec(query, fileBytes, workerID)
	if err != nil {
		log.Printf("Error updating image: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Image uploaded successfully"})
}

func deleteWorkerImage(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != "DELETE" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	vars := mux.Vars(r)
	workerID := vars["id"]
	query := `UPDATE medical_workers SET image_data = NULL WHERE worker_id = @p1`
	_, err := db.Exec(query, workerID)
	if err != nil {
		log.Printf("Error deleting image: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Image deleted successfully"})
}

func getMedicalWorkers(w http.ResponseWriter, r *http.Request) {
	departmentID := r.URL.Query().Get("department_id")
	specializationID := r.URL.Query().Get("specialization_id")
	query := `
		SELECT 
			worker_id, first_name, last_name, email, phone_number,
			department_id, department_name, 
			specialization_id, specialization_name,
			hire_date, salary, license_number,
			CASE WHEN image_data IS NULL THEN 0 ELSE 1 END as has_image,
			row_version,
			dbo.fn_GetWorkerExperience(hire_date) as experience
		FROM vw_MedicalWorkers_Detailed
		WHERE 1=1
	`
	if departmentID != "" {
		query += " AND department_id = " + departmentID
	}
	if specializationID != "" {
		query += " AND specialization_id = " + specializationID
	}
	query += " ORDER BY last_name, first_name"
	rows, err := db.Query(query)
	if err != nil {
		log.Printf("Error querying medical workers: %v", err)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]MedicalWorker{})
		return
	}
	defer rows.Close()
	var workers []MedicalWorker
	for rows.Next() {
		var mw MedicalWorker
		var rowVersionHex string
		err := rows.Scan(
			&mw.WorkerID, &mw.FirstName, &mw.LastName, &mw.Email, &mw.PhoneNumber,
			&mw.DepartmentID, &mw.DepartmentName,
			&mw.SpecializationID, &mw.SpecializationName,
			&mw.HireDate, &mw.Salary, &mw.LicenseNumber,
			&mw.HasImage,
			&rowVersionHex,
			&mw.Experience,
		)
		if err != nil {
			log.Printf("Error scanning worker: %v", err)
			continue
		}
		mw.RowVersion = rowVersionHex
		workers = append(workers, mw)
	}
	if workers == nil {
		workers = []MedicalWorker{}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(workers)
}

func getMedicalWorkerByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	workerID := vars["id"]
	query := `
		SELECT 
			worker_id, first_name, last_name, email, phone_number,
			department_id, department_name, 
			specialization_id, specialization_name,
			hire_date, salary, license_number,
			CASE WHEN image_data IS NULL THEN 0 ELSE 1 END as has_image,
			row_version,
			dbo.fn_GetWorkerExperience(hire_date) as experience
		FROM vw_MedicalWorkers_Detailed
		WHERE worker_id = @p1
	`
	var mw MedicalWorker
	var rowVersionHex string
	err := db.QueryRow(query, workerID).Scan(
		&mw.WorkerID, &mw.FirstName, &mw.LastName, &mw.Email, &mw.PhoneNumber,
		&mw.DepartmentID, &mw.DepartmentName,
		&mw.SpecializationID, &mw.SpecializationName,
		&mw.HireDate, &mw.Salary, &mw.LicenseNumber,
		&mw.HasImage,
		&rowVersionHex,
		&mw.Experience,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Worker not found", http.StatusNotFound)
			return
		}
		log.Printf("Error getting worker: %v", err)
		http.Error(w, "Failed to get worker", http.StatusInternalServerError)
		return
	}
	mw.RowVersion = rowVersionHex
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(mw)
}

func getFacilityTypes(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT facility_type_id, type_name FROM facility_types")
	if err != nil {
		log.Printf("Error querying facility_types: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	var facilityTypes []FacilityType
	for rows.Next() {
		var ft FacilityType
		err := rows.Scan(&ft.FacilityTypeID, &ft.TypeName)
		if err != nil {
			log.Printf("Error scanning facility type: %v", err)
			continue
		}
		facilityTypes = append(facilityTypes, ft)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(facilityTypes)
}

func getDepartmentsByFacilityType(w http.ResponseWriter, r *http.Request) {
	facilityTypeID := r.URL.Query().Get("facility_type_id")
	if facilityTypeID == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]Department{})
		return
	}
	query := "SELECT DISTINCT department_id, department_name, facility_type_id FROM departments WHERE facility_type_id = @p1 ORDER BY department_name"
	rows, err := db.Query(query, facilityTypeID)
	if err != nil {
		log.Printf("Error querying departments: %v", err)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]Department{})
		return
	}
	defer rows.Close()
	var departments []Department
	for rows.Next() {
		var d Department
		err := rows.Scan(&d.DepartmentID, &d.DepartmentName, &d.FacilityTypeID)
		if err != nil {
			log.Printf("Error scanning department: %v", err)
			continue
		}
		departments = append(departments, d)
	}
	if departments == nil {
		departments = []Department{}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(departments)
}

func getSpecializations(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT specialization_id, specialization_name, category FROM specializations")
	if err != nil {
		log.Printf("Error querying specializations: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	var specializations []Specialization
	for rows.Next() {
		var s Specialization
		err := rows.Scan(&s.SpecializationID, &s.SpecializationName, &s.Category)
		if err != nil {
			log.Printf("Error scanning specialization: %v", err)
			continue
		}
		specializations = append(specializations, s)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(specializations)
}

func addMedicalWorker(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var worker struct {
		FirstName        string  `json:"first_name"`
		LastName         string  `json:"last_name"`
		Email            string  `json:"email"`
		PhoneNumber      string  `json:"phone_number"`
		DepartmentID     int     `json:"department_id"`
		SpecializationID int     `json:"specialization_id"`
		HireDate         string  `json:"hire_date"`
		Salary           float64 `json:"salary"`
		LicenseNumber    string  `json:"license_number"`
	}
	err := json.NewDecoder(r.Body).Decode(&worker)
	if err != nil {
		log.Printf("Error decoding request: %v", err)
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	query := `INSERT INTO medical_workers 
		(first_name, last_name, email, phone_number, department_id, specialization_id, hire_date, salary, license_number) 
		VALUES (@p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9);
		SELECT SCOPE_IDENTITY();`
	var newWorkerID int64
	err = db.QueryRow(query,
		worker.FirstName, worker.LastName, worker.Email, worker.PhoneNumber,
		worker.DepartmentID, worker.SpecializationID, worker.HireDate, worker.Salary, worker.LicenseNumber).Scan(&newWorkerID)
	if err != nil {
		log.Printf("Error inserting worker: %v", err)
		http.Error(w, "Failed to insert worker", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":   "Medical worker added successfully",
		"worker_id": newWorkerID,
	})
}

func updateMedicalWorker(w http.ResponseWriter, r *http.Request) {
	if r.Method != "PUT" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	vars := mux.Vars(r)
	workerID := vars["id"]
	var updateData struct {
		FirstName        string  `json:"first_name"`
		LastName         string  `json:"last_name"`
		Email            string  `json:"email"`
		PhoneNumber      string  `json:"phone_number"`
		DepartmentID     int     `json:"department_id"`
		SpecializationID int     `json:"specialization_id"`
		HireDate         string  `json:"hire_date"`
		Salary           float64 `json:"salary"`
		LicenseNumber    string  `json:"license_number"`
		RowVersion       string  `json:"row_version"`
	}
	err := json.NewDecoder(r.Body).Decode(&updateData)
	if err != nil {
		log.Printf("Error decoding update request: %v", err)
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	rowVersionBytes, err := hexToVarbinary(updateData.RowVersion)
	if err != nil {
		log.Printf("Error converting row_version: %v", err)
		http.Error(w, "Invalid row_version format", http.StatusBadRequest)
		return
	}
	query := `UPDATE medical_workers 
		SET first_name = @p1, 
			last_name = @p2, 
			email = @p3, 
			phone_number = @p4, 
			department_id = @p5, 
			specialization_id = @p6, 
			hire_date = @p7, 
			salary = @p8, 
			license_number = @p9
		WHERE worker_id = @p10 
		AND row_version = @p11`
	result, err := db.Exec(query,
		updateData.FirstName, updateData.LastName, updateData.Email, updateData.PhoneNumber,
		updateData.DepartmentID, updateData.SpecializationID, updateData.HireDate,
		updateData.Salary, updateData.LicenseNumber, workerID, rowVersionBytes)
	if err != nil {
		log.Printf("Error updating worker: %v", err)
		http.Error(w, "Failed to update worker", http.StatusInternalServerError)
		return
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Error getting rows affected: %v", err)
		http.Error(w, "Failed to update worker", http.StatusInternalServerError)
		return
	}
	if rowsAffected == 0 {
		var exists bool
		err = db.QueryRow("SELECT 1 FROM medical_workers WHERE worker_id = @p1", workerID).Scan(&exists)
		if err == sql.ErrNoRows || !exists {
			http.Error(w, "Worker not found", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{
			"error":   "CONCURRENCY_CONFLICT",
			"message": "This record has been modified by another user since you loaded it. Please reload and try again.",
		})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Medical worker updated successfully"})
}

func deleteMedicalWorker(w http.ResponseWriter, r *http.Request) {
	if r.Method != "DELETE" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	vars := mux.Vars(r)
	workerID := vars["id"]
	_, err := db.Exec("DELETE FROM medical_workers WHERE worker_id = @p1", workerID)
	if err != nil {
		log.Printf("Error deleting worker: %v", err)
		http.Error(w, "Failed to delete worker", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Medical worker deleted successfully"})
}

func getAllDepartments(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT department_id, department_name, department_head, location, phone_number, facility_type_id, created_date FROM departments ORDER BY department_name")
	if err != nil {
		log.Printf("Error querying all departments: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	var departments []Department
	for rows.Next() {
		var d Department
		var departmentHead, location, phoneNumber, createdDate sql.NullString
		err := rows.Scan(&d.DepartmentID, &d.DepartmentName, &departmentHead, &location, &phoneNumber, &d.FacilityTypeID, &createdDate)
		if err != nil {
			log.Printf("Error scanning department: %v", err)
			continue
		}
		if departmentHead.Valid {
			d.DepartmentHead = &departmentHead.String
		}
		if location.Valid {
			d.Location = &location.String
		}
		if phoneNumber.Valid {
			d.PhoneNumber = &phoneNumber.String
		}
		if createdDate.Valid {
			d.CreatedDate = &createdDate.String
		}
		departments = append(departments, d)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(departments)
}

func enableCORS(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
	(*w).Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	(*w).Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

func apiHandler(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		enableCORS(&w)
		if r.Method == "OPTIONS" {
			return
		}
		next(w, r)
	}
}

func downloadExcelReport(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != "OPTIONS" && r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	file := xlsx.NewFile()
	tables := []struct {
		name  string
		query string
	}{
		{
			name:  "Facility Types",
			query: "SELECT facility_type_id, type_name, description, typical_bed_capacity, accreditation_required FROM facility_types ORDER BY facility_type_id",
		},
		{
			name:  "Departments",
			query: "SELECT department_id, department_name, department_head, location, phone_number, facility_type_id, created_date FROM departments ORDER BY department_id",
		},
		{
			name:  "Specializations",
			query: "SELECT specialization_id, specialization_name, description, category, required_years_training, certification_required FROM specializations ORDER BY specialization_id",
		},
		{
			name:  "Medical Workers",
			query: "SELECT worker_id, first_name, last_name, email, phone_number, department_id, specialization_id, hire_date, salary, license_number, image_data, created_date, row_version FROM medical_workers ORDER BY worker_id",
		},
		{
			name:  "Medical Workers View",
			query: "SELECT worker_id, first_name, last_name, email, phone_number, department_id, department_name, specialization_id, specialization_name, hire_date, salary, license_number, image_data, row_version FROM vw_MedicalWorkers_Detailed ORDER BY worker_id",
		},
		{
			name:  "Department Statistics",
			query: "EXEC dbo.sp_GetDepartmentStatistics",
		},
	}
	for _, table := range tables {
		rows, err := db.Query(table.query)
		if err != nil {
			log.Printf("Error querying %s: %v", table.name, err)
			continue
		}
		sheet, err := file.AddSheet(table.name)
		if err != nil {
			log.Printf("Error creating sheet for %s: %v", table.name, err)
			rows.Close()
			continue
		}
		cols, err := rows.Columns()
		if err != nil {
			log.Printf("Error getting columns for %s: %v", table.name, err)
			rows.Close()
			continue
		}
		headerRow := sheet.AddRow()
		for _, col := range cols {
			cell := headerRow.AddCell()
			cell.Value = col
			cell.GetStyle().Font.Bold = true
			cell.GetStyle().Fill.PatternType = "solid"
			cell.GetStyle().Fill.FgColor = "FFE0E0E0"
		}
		colTypes, err := rows.ColumnTypes()
		if err != nil {
			log.Printf("Error getting column types for %s: %v", table.name, err)
			rows.Close()
			continue
		}
		rowCount := 0
		for rows.Next() {
			values := make([]interface{}, len(cols))
			valuePtrs := make([]interface{}, len(cols))
			for i := range values {
				valuePtrs[i] = &values[i]
			}
			err := rows.Scan(valuePtrs...)
			if err != nil {
				log.Printf("Error scanning row for %s: %v", table.name, err)
				continue
			}
			row := sheet.AddRow()
			for i, val := range values {
				cell := row.AddCell()
				colName := cols[i]
				colType := colTypes[i].DatabaseTypeName()
				if val == nil {
					cell.Value = ""
					continue
				}
				switch v := val.(type) {
				case []byte:
					if strings.Contains(colType, "BINARY") || strings.Contains(colType, "ROWVERSION") {
						if len(v) > 0 {
							if colName == "row_version" {
								cell.Value = hex.EncodeToString(v)
							} else if colName == "image_data" {
								cell.Value = fmt.Sprintf("[Binary Data: %d bytes]", len(v))
							} else {
								cell.Value = hex.EncodeToString(v)
							}
						} else {
							cell.Value = ""
						}
					} else {
						cell.Value = string(v)
					}
				case int64:
					cell.SetInt64(v)
				case float64:
					if strings.Contains(colName, "salary") {
						cell.SetFloatWithFormat(v, "$#,##0.00")
					} else {
						cell.SetFloat(v)
					}
				case bool:
					cell.SetBool(v)
				case string:
					cell.SetString(v)
				case time.Time:
					cell.SetDateTime(v)
				default:
					cell.SetString(fmt.Sprintf("%v", v))
				}
			}
			rowCount++
		}
		rows.Close()
		for i := 0; i < len(cols); i++ {
			sheet.Col(i).Width = 15
		}
		if table.name == "Medical Workers" || table.name == "Medical Workers View" {
			sheet.Col(0).Width = 8
			sheet.Col(1).Width = 12
			sheet.Col(2).Width = 12
			sheet.Col(3).Width = 25
			sheet.Col(4).Width = 15
			sheet.Col(9).Width = 12
			sheet.Col(10).Width = 15
		}
		if table.name == "Department Statistics" {
			sheet.Col(0).Width = 8
			sheet.Col(1).Width = 20
			sheet.Col(2).Width = 15
			sheet.Col(3).Width = 15
			sheet.Col(4).Width = 20
			sheet.Col(5).Width = 15
			sheet.Col(6).Width = 12
			sheet.Col(7).Width = 8
			sheet.Col(8).Width = 12
			sheet.Col(9).Width = 12
			sheet.Col(10).Width = 12
			sheet.Col(11).Width = 15
			sheet.Col(12).Width = 15
			sheet.Col(13).Width = 15
			sheet.Col(14).Width = 8
			sheet.Col(15).Width = 15
			sheet.Col(16).Width = 25
		}
	}
	timestamp := time.Now().Format("20060102_150405")
	filename := fmt.Sprintf("medical_database_full_report_%s.xlsx", timestamp)
	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	w.Header().Set("Content-Transfer-Encoding", "binary")
	w.Header().Set("Cache-Control", "no-cache")
	err := file.Write(w)
	if err != nil {
		log.Printf("Error writing Excel file: %v", err)
		http.Error(w, "Failed to generate report", http.StatusInternalServerError)
		return
	}
}

func deleteDepartment(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != "DELETE" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	vars := mux.Vars(r)
	departmentID := vars["id"]
	var departmentName string
	err := db.QueryRow("SELECT department_name FROM departments WHERE department_id = @p1", departmentID).Scan(&departmentName)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Department not found", http.StatusNotFound)
			return
		}
		log.Printf("Error checking department: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	query := `DELETE FROM departments WHERE department_id = @p1`
	result, err := db.Exec(query, departmentID)
	if err != nil {
		if strings.Contains(err.Error(), "FOREIGN KEY constraint") {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusConflict)
			json.NewEncoder(w).Encode(map[string]string{
				"error":   "CONSTRAINT_ERROR",
				"message": "Cannot delete department because it has related medical workers. Delete the workers first.",
			})
			return
		}
		log.Printf("Error deleting department: %v", err)
		http.Error(w, "Failed to delete department", http.StatusInternalServerError)
		return
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Error getting rows affected: %v", err)
		http.Error(w, "Failed to delete department", http.StatusInternalServerError)
		return
	}
	if rowsAffected == 0 {
		http.Error(w, "Department not found", http.StatusNotFound)
		return
	}
	var workersDeleted int
	db.QueryRow("SELECT COUNT(*) FROM medical_workers WHERE department_id = @p1", departmentID).Scan(&workersDeleted)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":         fmt.Sprintf("Department '%s' deleted successfully", departmentName),
		"workers_deleted": workersDeleted,
		"department_id":   departmentID,
	})
}

func getDepartmentDetails(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != "GET" && r.Method != "OPTIONS" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	vars := mux.Vars(r)
	departmentID := vars["id"]
	query := `SELECT department_id, department_name, department_head, location, phone_number, facility_type_id, created_date FROM departments WHERE department_id = @p1`
	var dept Department
	err := db.QueryRow(query, departmentID).Scan(
		&dept.DepartmentID, &dept.DepartmentName, &dept.DepartmentHead, &dept.Location,
		&dept.PhoneNumber, &dept.FacilityTypeID, &dept.CreatedDate,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Department not found", http.StatusNotFound)
			return
		}
		log.Printf("Error getting department details: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(dept)
}

func main() {
	initDB()
	defer db.Close()
	router := mux.NewRouter()
	router.HandleFunc("/api/facility-types", apiHandler(getFacilityTypes)).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/departments", apiHandler(getDepartmentsByFacilityType)).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/all-departments", apiHandler(getAllDepartments)).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/specializations", apiHandler(getSpecializations)).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/medical-workers", apiHandler(getMedicalWorkers)).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/medical-workers", apiHandler(addMedicalWorker)).Methods("POST", "OPTIONS")
	router.HandleFunc("/api/medical-workers/{id}", apiHandler(deleteMedicalWorker)).Methods("DELETE", "OPTIONS")
	router.HandleFunc("/api/medical-workers/{id}", apiHandler(getMedicalWorkerByID)).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/medical-workers/{id}", apiHandler(updateMedicalWorker)).Methods("PUT", "OPTIONS")
	router.HandleFunc("/api/departments/{id}", apiHandler(deleteDepartment)).Methods("DELETE", "OPTIONS")
	router.HandleFunc("/api/department-details/{id}", apiHandler(getDepartmentDetails)).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/medical-workers/{id}/image", apiHandler(getWorkerImage)).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/medical-workers/{id}/image", apiHandler(uploadWorkerImage)).Methods("POST", "OPTIONS")
	router.HandleFunc("/api/medical-workers/{id}/image", apiHandler(deleteWorkerImage)).Methods("DELETE", "OPTIONS")
	router.HandleFunc("/api/download-report", apiHandler(downloadExcelReport)).Methods("GET", "OPTIONS")
	router.PathPrefix("/").Handler(http.FileServer(http.Dir("./static/")))
	fmt.Println("Server starting on :8080")
	fmt.Println("Add workers page: http://localhost:8080")
	fmt.Println("View workers page: http://localhost:8080/view.html")
	log.Fatal(http.ListenAndServe(":8080", router))
}
