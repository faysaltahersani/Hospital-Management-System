import { useRef, useState } from "react";
import Swal from "sweetalert2";

import { apiRequest } from "../../../lib/api";

const cardsConfig = [
  {
    key: "patients",
    title: "Upload Patient",
    entity: "patients",
    sampleCsv:
      "patient_code,full_name,phone,email,gender,blood_group,address,emergency_contact_name,emergency_contact_phone\n" +
      "PAT-1001,Rahim Uddin,01711223344,rahim@gmail.com,male,A+,House 12 Dhaka,Karim Uddin,01700000000\n" +
      "PAT-1002,Fatema Begum,01811998877,fatema@gmail.com,female,B+,Chittagong,Jahangir Alam,01800000000",
    sampleFileName: "sample_patients.csv",
  },
  {
    key: "pathology_tests",
    title: "Upload Pathology Test",
    entity: "pathology_tests",
    sampleCsv:
      "code,name,short_name,category,test_type,method,sample_type,normal_range,unit,price,base_charge,final_charge\n" +
      "PATH-101,Complete Blood Count (CBC),CBC,Hematology,Routine,Automated Cell Counter,Blood,4.5 - 11.0,10^3/uL,500,500,500\n" +
      "PATH-102,Liver Function Test (LFT),LFT,Biochemistry,Panel,Spectrophotometry,Blood,Normal,U/L,1200,1200,1200",
    sampleFileName: "sample_pathology_tests.csv",
  },
  {
    key: "radiology_tests",
    title: "Upload Radiology Test",
    entity: "radiology_tests",
    sampleCsv:
      "code,name,short_name,category,test_type,method,price,tax_rate,description\n" +
      "RAD-101,Chest X-Ray P/A View,CXR,X-Ray,Digital,Film,800,0,Chest digital imaging\n" +
      "RAD-102,Whole Abdomen Ultrasonography,USG,Ultrasound,2D,Gel Probe,1500,0,Abdominal scan",
    sampleFileName: "sample_radiology_tests.csv",
  },
  {
    key: "employees",
    title: "Upload Employees",
    entity: "employees",
    sampleCsv:
      "employee_code,full_name,designation,gender,phone,email,address,joining_date,basic_salary,bank_account\n" +
      "EMP-101,Salma Begum,Senior Nurse,female,01811223344,salma@hospital.com,Mirpur Dhaka,2024-01-01,25000,1234567890\n" +
      "EMP-102,Dr. Kamrul Hasan,Senior Consultant,male,01711223344,kamrul@hospital.com,Dhanmondi Dhaka,2024-01-15,85000,0987654321",
    sampleFileName: "sample_employees.csv",
  },
  {
    key: "medicines",
    title: "Upload Medicine",
    entity: "medicines",
    sampleCsv:
      "code,name,generic_name,company,category,unit,purchase_price,sale_price,stock_quantity,description\n" +
      "MED-101,Napa 500mg,Paracetamol,Beximco,Tablet,Box,15.00,20.00,500,Analgesic & Antipyretic\n" +
      "MED-102,Seclo 20mg,Omeprazole,Square,Capsule,Box,45.00,60.00,300,Gastric Relief",
    sampleFileName: "sample_medicines.csv",
  },
];

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.replace(/^["']|["']$/g, "").trim());
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.replace(/^["']|["']$/g, "").trim());
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });
    records.push(record);
  }

  return records;
}

function UploadCard({ config }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleDownloadSample = () => {
    const blob = new Blob([config.sampleCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = config.sampleFileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Swal.fire({
        icon: "warning",
        title: "No File Selected",
        text: `Please choose a CSV or JSON file to upload for ${config.title}.`,
        confirmButtonColor: "#2d7fe0",
      });
      return;
    }

    setIsUploading(true);

    try {
      const text = await selectedFile.text();
      let records = [];

      if (selectedFile.name.endsWith(".json")) {
        const parsed = JSON.parse(text);
        records = Array.isArray(parsed) ? parsed : parsed.data || parsed.records || [];
      } else {
        records = parseCsv(text);
      }

      if (!records.length) {
        throw new Error("The selected file is empty or formatted incorrectly.");
      }

      const response = await apiRequest("/settings/import-data", {
        method: "POST",
        body: JSON.stringify({
          entity: config.entity,
          records,
        }),
      });

      const resData = response.data || {};
      const count = resData.created_count ?? records.length;

      await Swal.fire({
        icon: "success",
        title: "Import Successful!",
        text: `Successfully imported ${count} record(s) into ${config.title.replace(/^Upload /, "")}.`,
        confirmButtonColor: "#0f8788",
      });

      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Import Failed",
        text: err.message || "Failed to process import file.",
        confirmButtonColor: "#d33",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="rounded-[4px] border border-[#d8e3e7] bg-white p-5 shadow-[0_4px_14px_rgba(22,36,45,0.06)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[16px] font-medium text-[#1f2c33]">{config.title}</h3>
        <button
          className="text-[11px] font-medium text-[#2d7fe0] hover:underline"
          onClick={handleDownloadSample}
          type="button"
        >
          📥 Sample CSV
        </button>
      </div>

      <input
        accept=".csv,.json"
        className="hidden"
        onChange={handleFileChange}
        ref={fileInputRef}
        type="file"
      />

      <div className="mb-4 flex h-[42px] items-center rounded-[4px] border border-[#c7d0d7] bg-[#f8fafb] px-2 text-[13px] text-[#1f2c33]">
        <button
          className="mr-2 rounded-[3px] border border-[#b5c2cb] bg-[#eef3f6] px-3 py-1 text-[12px] font-medium text-[#2a3840] transition hover:bg-[#e0e8ed]"
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          Choose File
        </button>
        <span className="truncate text-[13px] text-[#566470]">
          {selectedFile ? selectedFile.name : "No file chosen"}
        </span>
      </div>

      <button
        className="h-[34px] w-full rounded-[4px] bg-[#2d7fe0] text-[12px] font-semibold tracking-wide text-white transition hover:bg-[#206bc5] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isUploading}
        onClick={handleUpload}
        type="button"
      >
        {isUploading ? "UPLOADING & IMPORTING..." : "UPLOAD FILE"}
      </button>
    </div>
  );
}

export function ImportDataPage() {
  return (
    <section className="mx-auto max-w-[1280px]">
      <div className="grid grid-cols-3 gap-5 max-xl:grid-cols-2 max-md:grid-cols-1">
        {cardsConfig.map((config) => (
          <UploadCard config={config} key={config.key} />
        ))}
      </div>
    </section>
  );
}
