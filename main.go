package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	_ "github.com/denisenkom/go-mssqldb"
	"github.com/gorilla/mux"
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
	DepartmentID     int    `json:"department_id"`
	DepartmentName   string `json:"department_name"`
	FacilityTypeID   int    `json:"facility_type_id"`
	FacilityTypeName string `json:"facility_type_name"`
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
}

func initDB() {
	var err error
	// Try different connection string formats
	connString := "server=localhost;port=1433;user id=sa;password=YourStrong@Password123;database=master;"

	// Alternative connection strings to try:
	// connString := "server=localhost;user id=sa;password=your_password;database=master"
	// connString := "Server=localhost;User ID=sa;Password=your_password;Database=master;Port=1433"

	db, err = sql.Open("sqlserver", connString)
	if err != nil {
		log.Fatal("Error creating connection pool: ", err.Error())
	}

	// Test connection
	err = db.Ping()
	if err != nil {
		log.Printf("Warning: Could not ping database: %v", err)
		log.Println("Continuing anyway - connection might work when queries are executed")
	} else {
		fmt.Println("Connected to database successfully!")
	}
}

func getFacilityTypes(w http.ResponseWriter, r *http.Request) {
	log.Println("Getting facility types...")

	// Simple query without joins first
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
	log.Printf("Returned %d facility types", len(facilityTypes))
}

func getDepartmentsByFacilityType(w http.ResponseWriter, r *http.Request) {
	facilityTypeID := r.URL.Query().Get("facility_type_id")
	log.Printf("Getting departments for facility type: %s", facilityTypeID)

	if facilityTypeID == "" {
		// Return empty array
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]Department{})
		return
	}

	// Use DISTINCT to avoid duplicates
	query := "SELECT DISTINCT department_id, department_name, facility_type_id FROM departments WHERE facility_type_id = @p1 ORDER BY department_name"
	rows, err := db.Query(query, facilityTypeID)
	if err != nil {
		log.Printf("Error querying departments: %v", err)
		// Return empty array instead of error
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

	// Always return an array, even if empty
	if departments == nil {
		departments = []Department{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(departments)
	log.Printf("Returned %d departments for facility type %s", len(departments), facilityTypeID)
}

func getSpecializations(w http.ResponseWriter, r *http.Request) {
	log.Println("Getting specializations...")

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

	log.Printf("Adding medical worker: %+v", worker)

	query := `INSERT INTO medical_workers 
		(first_name, last_name, email, phone_number, department_id, specialization_id, hire_date, salary, license_number) 
		VALUES (@p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9)`

	_, err = db.Exec(query,
		worker.FirstName, worker.LastName, worker.Email, worker.PhoneNumber,
		worker.DepartmentID, worker.SpecializationID, worker.HireDate, worker.Salary, worker.LicenseNumber)

	if err != nil {
		log.Printf("Error inserting worker: %v", err)
		http.Error(w, "Failed to insert worker", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Medical worker added successfully"})
}

func getMedicalWorkers(w http.ResponseWriter, r *http.Request) {
	departmentID := r.URL.Query().Get("department_id")
	specializationID := r.URL.Query().Get("specialization_id")

	log.Printf("Getting medical workers - dept: %s, spec: %s", departmentID, specializationID)

	// Start with basic query
	query := `
		SELECT 
			mw.worker_id, mw.first_name, mw.last_name, mw.email, mw.phone_number,
			mw.department_id, d.department_name, 
			mw.specialization_id, s.specialization_name,
			mw.hire_date, mw.salary, mw.license_number
		FROM medical_workers mw
		LEFT JOIN departments d ON mw.department_id = d.department_id
		LEFT JOIN specializations s ON mw.specialization_id = s.specialization_id
		WHERE 1=1
	`

	// Build query based on filters
	if departmentID != "" {
		query += " AND mw.department_id = " + departmentID
	}
	if specializationID != "" {
		query += " AND mw.specialization_id = " + specializationID
	}

	query += " ORDER BY mw.last_name, mw.first_name"

	log.Printf("Executing query: %s", query)

	rows, err := db.Query(query)
	if err != nil {
		log.Printf("Error querying medical workers: %v", err)
		// Return empty array instead of error
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]MedicalWorker{})
		return
	}
	defer rows.Close()

	var workers []MedicalWorker
	for rows.Next() {
		var mw MedicalWorker
		err := rows.Scan(
			&mw.WorkerID, &mw.FirstName, &mw.LastName, &mw.Email, &mw.PhoneNumber,
			&mw.DepartmentID, &mw.DepartmentName,
			&mw.SpecializationID, &mw.SpecializationName,
			&mw.HireDate, &mw.Salary, &mw.LicenseNumber,
		)
		if err != nil {
			log.Printf("Error scanning worker: %v", err)
			continue
		}
		workers = append(workers, mw)
	}

	// Always return an array, even if empty
	if workers == nil {
		workers = []MedicalWorker{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(workers)
	log.Printf("Returned %d medical workers", len(workers))
}

func deleteMedicalWorker(w http.ResponseWriter, r *http.Request) {
	if r.Method != "DELETE" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	workerID := vars["id"]

	log.Printf("Deleting medical worker: %s", workerID)

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
	log.Println("Getting all departments...")

	rows, err := db.Query("SELECT department_id, department_name FROM departments")
	if err != nil {
		log.Printf("Error querying all departments: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var departments []Department
	for rows.Next() {
		var d Department
		err := rows.Scan(&d.DepartmentID, &d.DepartmentName)
		if err != nil {
			log.Printf("Error scanning department: %v", err)
			continue
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

func main() {
	initDB()
	defer db.Close()

	router := mux.NewRouter()

	// API routes
	router.HandleFunc("/api/facility-types", apiHandler(getFacilityTypes)).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/departments", apiHandler(getDepartmentsByFacilityType)).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/all-departments", apiHandler(getAllDepartments)).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/specializations", apiHandler(getSpecializations)).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/medical-workers", apiHandler(getMedicalWorkers)).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/medical-workers", apiHandler(addMedicalWorker)).Methods("POST", "OPTIONS")
	router.HandleFunc("/api/medical-workers/{id}", apiHandler(deleteMedicalWorker)).Methods("DELETE", "OPTIONS")

	// Serve static files
	router.PathPrefix("/").Handler(http.FileServer(http.Dir("./static/")))

	fmt.Println("Server starting on :8080")
	fmt.Println("Add workers page: http://localhost:8080")
	fmt.Println("View workers page: http://localhost:8080/view.html")

	log.Fatal(http.ListenAndServe(":8080", router))
}
