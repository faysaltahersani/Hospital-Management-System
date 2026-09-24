-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: 127.0.0.1    Database: hospital_management
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admission_payments`
--

DROP TABLE IF EXISTS `admission_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admission_payments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `admission_id` bigint(20) unsigned NOT NULL,
  `account_name` varchar(100) NOT NULL DEFAULT 'Cash',
  `amount` decimal(12,2) NOT NULL,
  `paid_at` datetime NOT NULL,
  `received_by` bigint(20) unsigned DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `admission_payments_admission_id` (`admission_id`),
  KEY `admission_payments_paid_at` (`paid_at`),
  KEY `admission_payments_user_fk` (`received_by`),
  CONSTRAINT `admission_payments_admission_fk` FOREIGN KEY (`admission_id`) REFERENCES `admissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `admission_payments_user_fk` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `admissions`
--

DROP TABLE IF EXISTS `admissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admissions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `admission_code` varchar(30) NOT NULL,
  `patient_id` bigint(20) unsigned NOT NULL,
  `doctor_id` bigint(20) unsigned DEFAULT NULL,
  `ward_id` bigint(20) unsigned NOT NULL,
  `bed_id` bigint(20) unsigned NOT NULL,
  `admitted_at` datetime NOT NULL,
  `discharged_at` datetime DEFAULT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `diagnosis` text DEFAULT NULL,
  `status` enum('admitted','discharged','transferred') NOT NULL DEFAULT 'admitted',
  `total_charges` decimal(12,2) NOT NULL DEFAULT 0.00,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `notes_migration_backup` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `admission_code` (`admission_code`),
  KEY `admissions_patient_id` (`patient_id`),
  KEY `admissions_doctor_id` (`doctor_id`),
  KEY `admissions_bed_id` (`bed_id`),
  KEY `admissions_status` (`status`),
  KEY `admissions_admitted_at` (`admitted_at`),
  KEY `ward_id` (`ward_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `admissions_ibfk_73` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `admissions_ibfk_74` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `admissions_ibfk_75` FOREIGN KEY (`ward_id`) REFERENCES `wards` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `admissions_ibfk_76` FOREIGN KEY (`bed_id`) REFERENCES `beds` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `admissions_ibfk_77` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ambulance_trips`
--

DROP TABLE IF EXISTS `ambulance_trips`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ambulance_trips` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `trip_code` varchar(30) NOT NULL,
  `ambulance_id` bigint(20) unsigned NOT NULL,
  `patient_id` bigint(20) unsigned DEFAULT NULL,
  `requester_name` varchar(150) DEFAULT NULL,
  `requester_phone` varchar(30) DEFAULT NULL,
  `pickup_address` varchar(255) NOT NULL,
  `dropoff_address` varchar(255) NOT NULL,
  `distance_km` decimal(10,2) NOT NULL DEFAULT 0.00,
  `fare` decimal(12,2) NOT NULL DEFAULT 0.00,
  `dispatched_at` datetime NOT NULL,
  `completed_at` datetime DEFAULT NULL,
  `status` enum('dispatched','in_progress','completed','cancelled') NOT NULL DEFAULT 'dispatched',
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `trip_code` (`trip_code`),
  KEY `ambulance_trips_ambulance_id` (`ambulance_id`),
  KEY `ambulance_trips_patient_id` (`patient_id`),
  KEY `ambulance_trips_status` (`status`),
  KEY `ambulance_trips_dispatched_at` (`dispatched_at`),
  CONSTRAINT `ambulance_trips_ibfk_37` FOREIGN KEY (`ambulance_id`) REFERENCES `ambulances` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ambulance_trips_ibfk_38` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=82 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ambulances`
--

DROP TABLE IF EXISTS `ambulances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ambulances` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `vehicle_number` varchar(50) NOT NULL,
  `model` varchar(150) DEFAULT NULL,
  `driver_name` varchar(150) DEFAULT NULL,
  `driver_phone` varchar(30) DEFAULT NULL,
  `driver_license` varchar(100) DEFAULT NULL,
  `capacity` int(11) NOT NULL DEFAULT 1,
  `base_fare` decimal(10,2) NOT NULL DEFAULT 0.00,
  `per_km_rate` decimal(10,2) NOT NULL DEFAULT 0.00,
  `status` enum('available','on_trip','maintenance','out_of_service') NOT NULL DEFAULT 'available',
  `notes` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vehicle_number` (`vehicle_number`),
  KEY `ambulances_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `appointments`
--

DROP TABLE IF EXISTS `appointments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `appointments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `appointment_code` varchar(30) NOT NULL,
  `patient_id` bigint(20) unsigned NOT NULL,
  `doctor_id` bigint(20) unsigned NOT NULL,
  `department_id` bigint(20) unsigned NOT NULL,
  `appointment_date` date NOT NULL,
  `appointment_time` time NOT NULL,
  `status` enum('scheduled','confirmed','in_progress','completed','cancelled','no_show') NOT NULL DEFAULT 'scheduled',
  `reason` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `consultation_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `active_slot_key` varchar(64) GENERATED ALWAYS AS (case when `deleted_at` is null and `status` in ('scheduled','confirmed','in_progress') then concat(`doctor_id`,'|',`appointment_date`,'|',`appointment_time`) else NULL end) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `appointment_code` (`appointment_code`),
  UNIQUE KEY `uk_appointments_active_slot` (`active_slot_key`),
  KEY `appointments_patient_id` (`patient_id`),
  KEY `appointments_doctor_id` (`doctor_id`),
  KEY `appointments_appointment_date` (`appointment_date`),
  KEY `appointments_status` (`status`),
  KEY `department_id` (`department_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `appointments_ibfk_73` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `appointments_ibfk_74` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `appointments_ibfk_75` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `appointments_ibfk_76` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=260 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `attendance`
--

DROP TABLE IF EXISTS `attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `attendance` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned NOT NULL,
  `attendance_date` date NOT NULL,
  `check_in` datetime DEFAULT NULL,
  `check_out` datetime DEFAULT NULL,
  `status` enum('present','absent','leave','half_day','holiday') NOT NULL DEFAULT 'present',
  `hours_worked` decimal(5,2) NOT NULL DEFAULT 0.00,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_employee_id_attendance_date` (`employee_id`,`attendance_date`),
  KEY `attendance_attendance_date` (`attendance_date`),
  KEY `attendance_status` (`status`),
  CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `entity_type` varchar(80) NOT NULL,
  `entity_id` varchar(64) DEFAULT NULL,
  `changes` longtext DEFAULT NULL,
  `ip_address` varchar(64) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `audit_logs_user_id` (`user_id`),
  KEY `audit_logs_entity_type_entity_id` (`entity_type`,`entity_id`),
  KEY `audit_logs_action` (`action`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2442 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `beds`
--

DROP TABLE IF EXISTS `beds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `beds` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `ward_id` bigint(20) unsigned NOT NULL,
  `bed_number` varchar(30) NOT NULL,
  `room_number` varchar(30) DEFAULT NULL,
  `daily_rate` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` enum('available','occupied','reserved','maintenance') NOT NULL DEFAULT 'available',
  `notes` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `status_before_reconciliation` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `beds_ward_id_bed_number` (`ward_id`,`bed_number`),
  KEY `beds_status` (`status`),
  CONSTRAINT `beds_ibfk_1` FOREIGN KEY (`ward_id`) REFERENCES `wards` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `blood_bags`
--

DROP TABLE IF EXISTS `blood_bags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `blood_bags` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `bag_code` varchar(30) NOT NULL,
  `donor_id` bigint(20) unsigned DEFAULT NULL,
  `blood_group` enum('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown') NOT NULL,
  `component` enum('whole_blood','rbc','plasma','platelets','cryo') NOT NULL DEFAULT 'whole_blood',
  `volume_ml` int(11) NOT NULL DEFAULT 450,
  `collected_at` datetime NOT NULL,
  `expires_at` datetime NOT NULL,
  `status` enum('available','reserved','issued','expired','discarded') NOT NULL DEFAULT 'available',
  `price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `screening_status` enum('not_recorded','pending','passed','failed') NOT NULL DEFAULT 'pending',
  `screened_at` datetime DEFAULT NULL,
  `screened_by` bigint(20) unsigned DEFAULT NULL,
  `screening_notes` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bag_code` (`bag_code`),
  KEY `blood_bags_donor_id` (`donor_id`),
  KEY `blood_bags_blood_group` (`blood_group`),
  KEY `blood_bags_status` (`status`),
  KEY `blood_bags_expires_at` (`expires_at`),
  CONSTRAINT `blood_bags_ibfk_1` FOREIGN KEY (`donor_id`) REFERENCES `blood_donors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `blood_donors`
--

DROP TABLE IF EXISTS `blood_donors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `blood_donors` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `donor_code` varchar(30) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `gender` enum('male','female','other') NOT NULL,
  `blood_group` enum('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown') NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `last_donation_at` datetime DEFAULT NULL,
  `total_donations` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `guardian_contact_no` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `donor_code` (`donor_code`),
  KEY `blood_donors_full_name` (`full_name`),
  KEY `blood_donors_blood_group` (`blood_group`),
  KEY `blood_donors_phone` (`phone`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `blood_issues`
--

DROP TABLE IF EXISTS `blood_issues`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `blood_issues` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `issue_code` varchar(30) NOT NULL,
  `bag_id` bigint(20) unsigned NOT NULL,
  `patient_id` bigint(20) unsigned DEFAULT NULL,
  `issued_to` varchar(150) DEFAULT NULL,
  `issued_at` datetime NOT NULL,
  `price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `issued_by` bigint(20) unsigned DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `issue_code` (`issue_code`),
  KEY `blood_issues_bag_id` (`bag_id`),
  KEY `blood_issues_patient_id` (`patient_id`),
  KEY `blood_issues_issued_at` (`issued_at`),
  CONSTRAINT `blood_issues_ibfk_37` FOREIGN KEY (`bag_id`) REFERENCES `blood_bags` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `blood_issues_ibfk_38` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `code_sequences`
--

DROP TABLE IF EXISTS `code_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `code_sequences` (
  `name` varchar(64) NOT NULL,
  `next_value` bigint(20) unsigned NOT NULL DEFAULT 1,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contra_entries`
--

DROP TABLE IF EXISTS `contra_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contra_entries` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `contra_code` varchar(30) NOT NULL,
  `from_account_id` bigint(20) unsigned DEFAULT NULL,
  `to_account_id` bigint(20) unsigned DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `transaction_date` date NOT NULL,
  `note` varchar(500) DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `legacy_option_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `contra_entries_code` (`contra_code`),
  KEY `contra_entries_date` (`transaction_date`),
  KEY `contra_entries_from` (`from_account_id`),
  KEY `contra_entries_to` (`to_account_id`)
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `departments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `code` varchar(30) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `diagnostic_attachments`
--

DROP TABLE IF EXISTS `diagnostic_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `diagnostic_attachments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `study_id` bigint(20) unsigned DEFAULT NULL,
  `series_id` bigint(20) unsigned DEFAULT NULL,
  `report_version_id` bigint(20) unsigned DEFAULT NULL,
  `patient_id` bigint(20) unsigned NOT NULL,
  `kind` enum('image','dicom','pdf','video','audio','waveform','document','original_report','generated_report') NOT NULL DEFAULT 'document',
  `file_name` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `mime_type` varchar(180) NOT NULL,
  `file_size` bigint(20) unsigned NOT NULL,
  `storage_key` varchar(500) NOT NULL,
  `checksum_sha256` char(64) DEFAULT NULL,
  `caption` varchar(500) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `dicom_study_uid` varchar(128) DEFAULT NULL,
  `dicom_series_uid` varchar(128) DEFAULT NULL,
  `dicom_instance_uid` varchar(128) DEFAULT NULL,
  `dicom_modality` varchar(16) DEFAULT NULL,
  `uploaded_by` bigint(20) unsigned DEFAULT NULL,
  `uploaded_at` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `version` int(11) NOT NULL DEFAULT 1,
  `is_original` tinyint(1) NOT NULL DEFAULT 1,
  `is_current` tinyint(1) NOT NULL DEFAULT 1,
  `superseded_by_id` bigint(20) unsigned DEFAULT NULL,
  `superseded_at` datetime DEFAULT NULL,
  `metadata` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_da_study` (`study_id`,`sort_order`),
  KEY `ix_da_patient` (`patient_id`),
  KEY `ix_da_kind` (`kind`),
  KEY `ix_da_dicom_study` (`dicom_study_uid`),
  KEY `fk_da_uploaded_by` (`uploaded_by`),
  KEY `ix_da_series` (`series_id`),
  KEY `ix_da_current` (`study_id`,`is_current`),
  KEY `ix_da_report_version` (`report_version_id`),
  KEY `fk_da_superseded_by` (`superseded_by_id`),
  CONSTRAINT `fk_da_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`),
  CONSTRAINT `fk_da_report_version` FOREIGN KEY (`report_version_id`) REFERENCES `diagnostic_report_versions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_da_series` FOREIGN KEY (`series_id`) REFERENCES `diagnostic_imaging_series` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_da_study` FOREIGN KEY (`study_id`) REFERENCES `diagnostic_studies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_da_superseded_by` FOREIGN KEY (`superseded_by_id`) REFERENCES `diagnostic_attachments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_da_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `diagnostic_findings`
--

DROP TABLE IF EXISTS `diagnostic_findings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `diagnostic_findings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `study_id` bigint(20) unsigned NOT NULL,
  `section` varchar(180) DEFAULT NULL,
  `body` text DEFAULT NULL,
  `is_abnormal` tinyint(1) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `recorded_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_df_study` (`study_id`,`sort_order`),
  KEY `fk_df_recorded_by` (`recorded_by`),
  CONSTRAINT `fk_df_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_df_study` FOREIGN KEY (`study_id`) REFERENCES `diagnostic_studies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `diagnostic_imaging_series`
--

DROP TABLE IF EXISTS `diagnostic_imaging_series`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `diagnostic_imaging_series` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `study_id` bigint(20) unsigned NOT NULL,
  `series_number` int(11) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `modality` varchar(16) DEFAULT NULL,
  `body_part` varchar(120) DEFAULT NULL,
  `series_uid` varchar(128) DEFAULT NULL,
  `instance_count` int(11) NOT NULL DEFAULT 0,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dis_series_uid` (`series_uid`),
  KEY `ix_dis_study` (`study_id`),
  KEY `fk_dis_creator` (`created_by`),
  CONSTRAINT `fk_dis_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_dis_study` FOREIGN KEY (`study_id`) REFERENCES `diagnostic_studies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `diagnostic_measurements`
--

DROP TABLE IF EXISTS `diagnostic_measurements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `diagnostic_measurements` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `study_id` bigint(20) unsigned NOT NULL,
  `site` varchar(180) DEFAULT NULL,
  `label` varchar(200) NOT NULL,
  `value_numeric` decimal(18,6) DEFAULT NULL,
  `value_text` varchar(255) DEFAULT NULL,
  `unit` varchar(60) DEFAULT NULL,
  `normal_range` varchar(180) DEFAULT NULL,
  `laterality` enum('left','right','bilateral','not_applicable') DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `recorded_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_dm_study` (`study_id`,`sort_order`),
  KEY `fk_dm_recorded_by` (`recorded_by`),
  CONSTRAINT `fk_dm_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_dm_study` FOREIGN KEY (`study_id`) REFERENCES `diagnostic_studies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `diagnostic_organisms`
--

DROP TABLE IF EXISTS `diagnostic_organisms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `diagnostic_organisms` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `study_id` bigint(20) unsigned NOT NULL,
  `organism_name` varchar(200) NOT NULL,
  `culture_medium` varchar(180) DEFAULT NULL,
  `colony_count` varchar(120) DEFAULT NULL,
  `growth` varchar(120) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_do_study` (`study_id`,`sort_order`),
  CONSTRAINT `fk_do_study` FOREIGN KEY (`study_id`) REFERENCES `diagnostic_studies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `diagnostic_report_versions`
--

DROP TABLE IF EXISTS `diagnostic_report_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `diagnostic_report_versions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `report_id` bigint(20) unsigned NOT NULL,
  `study_id` bigint(20) unsigned NOT NULL,
  `patient_id` bigint(20) unsigned NOT NULL,
  `version_no` int(11) NOT NULL,
  `version_status` enum('final','amended','cancelled') NOT NULL DEFAULT 'final',
  `snapshot` longtext NOT NULL,
  `pdf_attachment_id` bigint(20) unsigned DEFAULT NULL,
  `amends_version_id` bigint(20) unsigned DEFAULT NULL,
  `amendment_reason` varchar(1000) DEFAULT NULL,
  `changed_fields` text DEFAULT NULL,
  `superseded_at` datetime DEFAULT NULL,
  `superseded_by_id` bigint(20) unsigned DEFAULT NULL,
  `verified_by` bigint(20) unsigned DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `issued_by` bigint(20) unsigned DEFAULT NULL,
  `issued_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_drv_report_version` (`report_id`,`version_no`),
  KEY `ix_drv_study` (`study_id`),
  KEY `ix_drv_patient` (`patient_id`),
  KEY `ix_drv_status` (`version_status`),
  KEY `ix_drv_issued` (`issued_at`),
  KEY `fk_drv_amends` (`amends_version_id`),
  KEY `fk_drv_superseded_by` (`superseded_by_id`),
  KEY `fk_drv_pdf` (`pdf_attachment_id`),
  KEY `fk_drv_verifier` (`verified_by`),
  KEY `fk_drv_issuer` (`issued_by`),
  CONSTRAINT `fk_drv_amends` FOREIGN KEY (`amends_version_id`) REFERENCES `diagnostic_report_versions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_drv_issuer` FOREIGN KEY (`issued_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_drv_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`),
  CONSTRAINT `fk_drv_pdf` FOREIGN KEY (`pdf_attachment_id`) REFERENCES `diagnostic_attachments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_drv_report` FOREIGN KEY (`report_id`) REFERENCES `diagnostic_reports` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_drv_study` FOREIGN KEY (`study_id`) REFERENCES `diagnostic_studies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_drv_superseded_by` FOREIGN KEY (`superseded_by_id`) REFERENCES `diagnostic_report_versions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_drv_verifier` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `diagnostic_reports`
--

DROP TABLE IF EXISTS `diagnostic_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `diagnostic_reports` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `study_id` bigint(20) unsigned NOT NULL,
  `report_number` varchar(40) NOT NULL,
  `template_key` varchar(60) NOT NULL,
  `status` enum('ordered','sample_collected','processing','result_entered','under_review','verified','final','cancelled') NOT NULL DEFAULT 'result_entered',
  `pdf_attachment_id` bigint(20) unsigned DEFAULT NULL,
  `generated_by` bigint(20) unsigned DEFAULT NULL,
  `generated_at` datetime DEFAULT NULL,
  `verified_by` bigint(20) unsigned DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `print_count` int(11) NOT NULL DEFAULT 0,
  `last_printed_by` bigint(20) unsigned DEFAULT NULL,
  `last_printed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `current_version_id` bigint(20) unsigned DEFAULT NULL,
  `version_count` int(11) NOT NULL DEFAULT 0,
  `is_amended` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dr_report_number` (`report_number`),
  UNIQUE KEY `uk_dr_study` (`study_id`),
  KEY `fk_dr_pdf` (`pdf_attachment_id`),
  KEY `fk_dr_generated_by` (`generated_by`),
  KEY `fk_dr_verified_by` (`verified_by`),
  KEY `fk_dr_printed_by` (`last_printed_by`),
  KEY `fk_dr_current_version` (`current_version_id`),
  CONSTRAINT `fk_dr_current_version` FOREIGN KEY (`current_version_id`) REFERENCES `diagnostic_report_versions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_dr_generated_by` FOREIGN KEY (`generated_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_dr_pdf` FOREIGN KEY (`pdf_attachment_id`) REFERENCES `diagnostic_attachments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_dr_printed_by` FOREIGN KEY (`last_printed_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_dr_study` FOREIGN KEY (`study_id`) REFERENCES `diagnostic_studies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dr_verified_by` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `diagnostic_result_parameters`
--

DROP TABLE IF EXISTS `diagnostic_result_parameters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `diagnostic_result_parameters` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `study_id` bigint(20) unsigned NOT NULL,
  `group_label` varchar(180) DEFAULT NULL,
  `parameter_name` varchar(200) NOT NULL,
  `result_value` varchar(255) DEFAULT NULL,
  `result_numeric` decimal(18,6) DEFAULT NULL,
  `unit` varchar(60) DEFAULT NULL,
  `ref_range_low` decimal(18,6) DEFAULT NULL,
  `ref_range_high` decimal(18,6) DEFAULT NULL,
  `ref_range_text` varchar(255) DEFAULT NULL,
  `flag` enum('normal','low','high','critical_low','critical_high','abnormal','inconclusive') DEFAULT NULL,
  `method` varchar(180) DEFAULT NULL,
  `comments` text DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `recorded_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_drp_study` (`study_id`,`sort_order`),
  KEY `fk_drp_recorded_by` (`recorded_by`),
  CONSTRAINT `fk_drp_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_drp_study` FOREIGN KEY (`study_id`) REFERENCES `diagnostic_studies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `diagnostic_sensitivities`
--

DROP TABLE IF EXISTS `diagnostic_sensitivities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `diagnostic_sensitivities` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `organism_id` bigint(20) unsigned NOT NULL,
  `antibiotic` varchar(180) NOT NULL,
  `interpretation` enum('sensitive','intermediate','resistant','not_tested') DEFAULT NULL,
  `mic` varchar(60) DEFAULT NULL,
  `zone_diameter_mm` decimal(8,2) DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_dsen_organism` (`organism_id`,`sort_order`),
  CONSTRAINT `fk_dsen_organism` FOREIGN KEY (`organism_id`) REFERENCES `diagnostic_organisms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `diagnostic_studies`
--

DROP TABLE IF EXISTS `diagnostic_studies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `diagnostic_studies` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `study_code` varchar(40) NOT NULL,
  `patient_id` bigint(20) unsigned NOT NULL,
  `category` enum('laboratory','radiology','cardiology','histopathology','microbiology','cytology','ophthalmology','ent','dental','pulmonary','specialized') NOT NULL,
  `modality` varchar(60) NOT NULL,
  `test_name` varchar(255) NOT NULL,
  `source_type` enum('lab_order_item','radiology_order','standalone') NOT NULL DEFAULT 'standalone',
  `source_id` bigint(20) unsigned DEFAULT NULL,
  `invoice_id` bigint(20) unsigned DEFAULT NULL,
  `referring_doctor_id` bigint(20) unsigned DEFAULT NULL,
  `performing_doctor_id` bigint(20) unsigned DEFAULT NULL,
  `performing_user_id` bigint(20) unsigned DEFAULT NULL,
  `status` enum('ordered','sample_collected','processing','result_entered','under_review','verified','final','cancelled') NOT NULL DEFAULT 'ordered',
  `study_datetime` datetime DEFAULT NULL,
  `clinical_history` text DEFAULT NULL,
  `procedure_note` text DEFAULT NULL,
  `body_part` varchar(120) DEFAULT NULL,
  `laterality` enum('left','right','bilateral','not_applicable') DEFAULT NULL,
  `views` varchar(255) DEFAULT NULL,
  `contrast_used` tinyint(1) DEFAULT NULL,
  `contrast_agent` varchar(180) DEFAULT NULL,
  `series_or_sequences` text DEFAULT NULL,
  `specimen` varchar(255) DEFAULT NULL,
  `sample_type` varchar(120) DEFAULT NULL,
  `collection_method` varchar(180) DEFAULT NULL,
  `sample_collected_at` datetime DEFAULT NULL,
  `adequacy` varchar(180) DEFAULT NULL,
  `result_at` datetime DEFAULT NULL,
  `interpretation` text DEFAULT NULL,
  `impression` text DEFAULT NULL,
  `conclusion` text DEFAULT NULL,
  `recommendation` text DEFAULT NULL,
  `verified_by` bigint(20) unsigned DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `finalized_by` bigint(20) unsigned DEFAULT NULL,
  `finalized_at` datetime DEFAULT NULL,
  `cancelled_reason` varchar(500) DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_diagnostic_studies_code` (`study_code`),
  KEY `ix_ds_patient` (`patient_id`,`study_datetime`),
  KEY `ix_ds_category` (`category`,`modality`),
  KEY `ix_ds_status` (`status`),
  KEY `ix_ds_source` (`source_type`,`source_id`),
  KEY `ix_ds_invoice` (`invoice_id`),
  KEY `fk_ds_referring` (`referring_doctor_id`),
  KEY `fk_ds_performing` (`performing_doctor_id`),
  KEY `fk_ds_perf_user` (`performing_user_id`),
  KEY `fk_ds_verified_by` (`verified_by`),
  KEY `fk_ds_finalized_by` (`finalized_by`),
  KEY `fk_ds_created_by` (`created_by`),
  KEY `ix_ds_patient_status_date` (`patient_id`,`status`,`study_datetime`),
  CONSTRAINT `fk_ds_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_ds_finalized_by` FOREIGN KEY (`finalized_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_ds_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`),
  CONSTRAINT `fk_ds_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`),
  CONSTRAINT `fk_ds_perf_user` FOREIGN KEY (`performing_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_ds_performing` FOREIGN KEY (`performing_doctor_id`) REFERENCES `doctors` (`id`),
  CONSTRAINT `fk_ds_referring` FOREIGN KEY (`referring_doctor_id`) REFERENCES `doctors` (`id`),
  CONSTRAINT `fk_ds_verified_by` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `doctors`
--

DROP TABLE IF EXISTS `doctors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `doctors` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `doctor_code` varchar(30) NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `department_id` bigint(20) unsigned NOT NULL,
  `specialization` varchar(150) DEFAULT NULL,
  `qualifications` varchar(255) DEFAULT NULL,
  `license_number` varchar(100) DEFAULT NULL,
  `years_of_experience` int(11) NOT NULL DEFAULT 0,
  `consultation_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `is_available` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `blood_group` varchar(10) DEFAULT NULL,
  `appointment_shifts` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`appointment_shifts`)),
  `appointment_charge_categories` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`appointment_charge_categories`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `doctor_code` (`doctor_code`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `license_number` (`license_number`),
  KEY `doctors_department_id` (`department_id`),
  CONSTRAINT `doctors_ibfk_37` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `doctors_ibfk_38` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `employees` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_code` varchar(30) NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  `full_name` varchar(150) NOT NULL,
  `designation` varchar(150) DEFAULT NULL,
  `gender` enum('male','female','other') DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `joining_date` date NOT NULL,
  `leaving_date` date DEFAULT NULL,
  `basic_salary` decimal(12,2) NOT NULL DEFAULT 0.00,
  `bank_account` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_code` (`employee_code`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `employees_department_id` (`department_id`),
  KEY `employees_full_name` (`full_name`),
  CONSTRAINT `employees_ibfk_37` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `employees_ibfk_38` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `expense_categories`
--

DROP TABLE IF EXISTS `expense_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `expense_categories` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `expenses`
--

DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `expenses` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `category_id` bigint(20) unsigned DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `expense_date` date NOT NULL,
  `payment_method` enum('cash','card','bank_transfer','mobile_banking','insurance','cheque') NOT NULL DEFAULT 'cash',
  `reference` varchar(150) DEFAULT NULL,
  `paid_by` bigint(20) unsigned DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `expenses_category_id` (`category_id`),
  KEY `expenses_expense_date` (`expense_date`),
  CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `expense_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `income_entries`
--

DROP TABLE IF EXISTS `income_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `income_entries` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `income_code` varchar(30) NOT NULL,
  `income_head_id` bigint(20) unsigned DEFAULT NULL,
  `account_id` bigint(20) unsigned DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `income_date` date NOT NULL,
  `note` varchar(500) DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `legacy_option_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `income_entries_code` (`income_code`),
  KEY `income_entries_date` (`income_date`),
  KEY `income_entries_head` (`income_head_id`),
  KEY `income_entries_account` (`account_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1504 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `invoice_items`
--

DROP TABLE IF EXISTS `invoice_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `invoice_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `invoice_id` bigint(20) unsigned NOT NULL,
  `item_type` enum('consultation','medicine','lab_test','radiology','bed','procedure','ambulance','other') NOT NULL DEFAULT 'other',
  `reference_id` bigint(20) unsigned DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT 1.00,
  `unit_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `invoice_items_invoice_id` (`invoice_id`),
  KEY `invoice_items_item_type` (`item_type`),
  CONSTRAINT `invoice_items_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1103 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `invoices` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `invoice_code` varchar(30) NOT NULL,
  `patient_id` bigint(20) unsigned NOT NULL,
  `appointment_id` bigint(20) unsigned DEFAULT NULL,
  `issued_at` datetime NOT NULL,
  `due_at` datetime DEFAULT NULL,
  `subtotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `tax` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `paid_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` enum('draft','sent','partially_paid','paid','void','overdue') NOT NULL DEFAULT 'draft',
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `opd_visit_id` bigint(20) unsigned DEFAULT NULL,
  `admission_id` bigint(20) unsigned DEFAULT NULL,
  `lab_order_id` bigint(20) unsigned DEFAULT NULL,
  `radiology_order_id` bigint(20) unsigned DEFAULT NULL,
  `blood_issue_id` bigint(20) unsigned DEFAULT NULL,
  `ambulance_trip_id` bigint(20) unsigned DEFAULT NULL,
  `paid_amount_before_reconciliation` decimal(12,2) DEFAULT NULL,
  `status_before_reconciliation` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_code` (`invoice_code`),
  KEY `invoices_patient_id` (`patient_id`),
  KEY `invoices_status` (`status`),
  KEY `invoices_issued_at` (`issued_at`),
  KEY `appointment_id` (`appointment_id`),
  KEY `invoices_opd_visit_id` (`opd_visit_id`),
  KEY `invoices_admission_id` (`admission_id`),
  KEY `invoices_lab_order_id` (`lab_order_id`),
  KEY `invoices_radiology_order_id` (`radiology_order_id`),
  KEY `invoices_blood_issue_id` (`blood_issue_id`),
  KEY `invoices_ambulance_trip_id` (`ambulance_trip_id`),
  CONSTRAINT `invoices_admission_fk` FOREIGN KEY (`admission_id`) REFERENCES `admissions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `invoices_ambulance_trip_fk` FOREIGN KEY (`ambulance_trip_id`) REFERENCES `ambulance_trips` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `invoices_blood_issue_fk` FOREIGN KEY (`blood_issue_id`) REFERENCES `blood_issues` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `invoices_ibfk_37` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `invoices_ibfk_38` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `invoices_lab_order_fk` FOREIGN KEY (`lab_order_id`) REFERENCES `lab_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `invoices_opd_visit_fk` FOREIGN KEY (`opd_visit_id`) REFERENCES `opd_visits` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `invoices_radiology_order_fk` FOREIGN KEY (`radiology_order_id`) REFERENCES `radiology_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1459 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lab_order_items`
--

DROP TABLE IF EXISTS `lab_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lab_order_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint(20) unsigned NOT NULL,
  `test_id` bigint(20) unsigned NOT NULL,
  `price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `result_value` varchar(255) DEFAULT NULL,
  `result_notes` text DEFAULT NULL,
  `result_at` datetime DEFAULT NULL,
  `status` enum('ordered','sample_collected','in_progress','completed','cancelled') NOT NULL DEFAULT 'ordered',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `verified_by` bigint(20) unsigned DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lab_order_items_order_id` (`order_id`),
  KEY `lab_order_items_test_id` (`test_id`),
  CONSTRAINT `lab_order_items_ibfk_37` FOREIGN KEY (`order_id`) REFERENCES `lab_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `lab_order_items_ibfk_38` FOREIGN KEY (`test_id`) REFERENCES `lab_tests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=253 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lab_orders`
--

DROP TABLE IF EXISTS `lab_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lab_orders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_code` varchar(30) NOT NULL,
  `patient_id` bigint(20) unsigned NOT NULL,
  `doctor_id` bigint(20) unsigned DEFAULT NULL,
  `ordered_at` datetime NOT NULL,
  `status` enum('ordered','sample_collected','in_progress','completed','cancelled') NOT NULL DEFAULT 'ordered',
  `total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_code` (`order_code`),
  KEY `lab_orders_patient_id` (`patient_id`),
  KEY `lab_orders_doctor_id` (`doctor_id`),
  KEY `lab_orders_status` (`status`),
  CONSTRAINT `lab_orders_ibfk_37` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `lab_orders_ibfk_38` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=155 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lab_tests`
--

DROP TABLE IF EXISTS `lab_tests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lab_tests` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `name` varchar(200) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `sample_type` varchar(100) DEFAULT NULL,
  `normal_range` varchar(255) DEFAULT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `report_delivery_day` varchar(50) DEFAULT NULL,
  `test_type` varchar(100) DEFAULT NULL,
  `short_name` varchar(100) DEFAULT NULL,
  `final_charge` decimal(12,2) DEFAULT NULL,
  `tax_rate` decimal(5,2) DEFAULT 0.00,
  `method` varchar(100) DEFAULT NULL,
  `base_charge` decimal(12,2) DEFAULT NULL,
  `method_backup` varchar(255) DEFAULT NULL,
  `normal_range_backup` varchar(255) DEFAULT NULL,
  `sample_type_backup` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `lab_tests_category` (`category`)
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `master_options`
--

DROP TABLE IF EXISTS `master_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `master_options` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `type` varchar(80) NOT NULL,
  `code` varchar(100) NOT NULL,
  `label` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `master_options_type_code` (`type`,`code`),
  KEY `master_options_type` (`type`)
) ENGINE=InnoDB AUTO_INCREMENT=307 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `medicine_batches`
--

DROP TABLE IF EXISTS `medicine_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `medicine_batches` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `medicine_id` bigint(20) unsigned NOT NULL,
  `batch_no` varchar(60) NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `quantity_in` int(11) NOT NULL DEFAULT 0,
  `quantity_out` int(11) NOT NULL DEFAULT 0,
  `purchase_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `sale_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `source` varchar(60) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `medicine_batches_medicine_batch` (`medicine_id`,`batch_no`),
  KEY `medicine_batches_expiry` (`expiry_date`),
  CONSTRAINT `medicine_batches_medicine_fk` FOREIGN KEY (`medicine_id`) REFERENCES `medicines` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=317 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `medicine_sale_item_batches`
--

DROP TABLE IF EXISTS `medicine_sale_item_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `medicine_sale_item_batches` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sale_item_id` bigint(20) unsigned NOT NULL,
  `batch_id` bigint(20) unsigned NOT NULL,
  `quantity` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `msib_sale_item` (`sale_item_id`),
  KEY `msib_batch` (`batch_id`),
  CONSTRAINT `msib_batch_fk` FOREIGN KEY (`batch_id`) REFERENCES `medicine_batches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `msib_sale_item_fk` FOREIGN KEY (`sale_item_id`) REFERENCES `medicine_sale_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=169 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `medicine_sale_items`
--

DROP TABLE IF EXISTS `medicine_sale_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `medicine_sale_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sale_id` bigint(20) unsigned NOT NULL,
  `medicine_id` bigint(20) unsigned NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `unit_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `medicine_sale_items_sale_id` (`sale_id`),
  KEY `medicine_sale_items_medicine_id` (`medicine_id`),
  CONSTRAINT `medicine_sale_items_ibfk_37` FOREIGN KEY (`sale_id`) REFERENCES `medicine_sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `medicine_sale_items_ibfk_38` FOREIGN KEY (`medicine_id`) REFERENCES `medicines` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=137 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `medicine_sales`
--

DROP TABLE IF EXISTS `medicine_sales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `medicine_sales` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sale_code` varchar(30) NOT NULL,
  `patient_id` bigint(20) unsigned DEFAULT NULL,
  `prescription_id` bigint(20) unsigned DEFAULT NULL,
  `sold_at` datetime NOT NULL,
  `subtotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payment_method` enum('cash','card','bank_transfer','mobile_banking','insurance','cheque') NOT NULL DEFAULT 'cash',
  `status` enum('completed','refunded','cancelled') NOT NULL DEFAULT 'completed',
  `sold_by` bigint(20) unsigned DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sale_code` (`sale_code`),
  KEY `medicine_sales_patient_id` (`patient_id`),
  KEY `medicine_sales_sold_at` (`sold_at`),
  KEY `prescription_id` (`prescription_id`),
  KEY `sold_by` (`sold_by`),
  CONSTRAINT `medicine_sales_ibfk_55` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `medicine_sales_ibfk_56` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `medicine_sales_ibfk_57` FOREIGN KEY (`sold_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=128 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `medicines`
--

DROP TABLE IF EXISTS `medicines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `medicines` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `name` varchar(200) NOT NULL,
  `generic_name` varchar(200) DEFAULT NULL,
  `manufacturer` varchar(200) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `unit` varchar(50) NOT NULL DEFAULT 'piece',
  `purchase_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `sale_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `stock_quantity` int(11) NOT NULL DEFAULT 0,
  `reorder_level` int(11) NOT NULL DEFAULT 10,
  `expiry_date` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `group_name` varchar(100) DEFAULT NULL,
  `company` varchar(200) DEFAULT NULL,
  `wholesale_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `opening_purchase_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `rack_number` varchar(50) DEFAULT NULL,
  `tax` varchar(50) DEFAULT NULL,
  `tax_type` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `medicines_name` (`name`),
  KEY `medicines_category` (`category`)
) ENGINE=InnoDB AUTO_INCREMENT=183 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `opd_visits`
--

DROP TABLE IF EXISTS `opd_visits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `opd_visits` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `visit_code` varchar(30) NOT NULL,
  `patient_id` bigint(20) unsigned NOT NULL,
  `doctor_id` bigint(20) unsigned NOT NULL,
  `department_id` bigint(20) unsigned NOT NULL,
  `appointment_id` bigint(20) unsigned DEFAULT NULL,
  `visit_date` datetime NOT NULL,
  `chief_complaint` varchar(255) DEFAULT NULL,
  `vitals` text DEFAULT NULL,
  `diagnosis` text DEFAULT NULL,
  `advice` text DEFAULT NULL,
  `consultation_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `follow_up_date` date DEFAULT NULL,
  `status` enum('in_consultation','completed','cancelled') NOT NULL DEFAULT 'in_consultation',
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `advice_migration_backup` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `visit_code` (`visit_code`),
  KEY `opd_visits_patient_id` (`patient_id`),
  KEY `opd_visits_doctor_id` (`doctor_id`),
  KEY `opd_visits_visit_date` (`visit_date`),
  KEY `opd_visits_status` (`status`),
  KEY `department_id` (`department_id`),
  KEY `appointment_id` (`appointment_id`),
  CONSTRAINT `opd_visits_ibfk_73` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `opd_visits_ibfk_74` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `opd_visits_ibfk_75` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `opd_visits_ibfk_76` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1179 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pathology_parameters`
--

DROP TABLE IF EXISTS `pathology_parameters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pathology_parameters` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `ref_range_from` varchar(100) DEFAULT NULL,
  `ref_range_to` varchar(100) DEFAULT NULL,
  `unit_option_id` bigint(20) unsigned DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `unit_option_id` (`unit_option_id`),
  CONSTRAINT `pathology_parameters_ibfk_1` FOREIGN KEY (`unit_option_id`) REFERENCES `master_options` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `patients`
--

DROP TABLE IF EXISTS `patients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `patients` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `patient_code` varchar(30) NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `full_name` varchar(150) NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female','other') NOT NULL,
  `blood_group` enum('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown') NOT NULL DEFAULT 'unknown',
  `marital_status` varchar(30) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `emergency_contact_name` varchar(150) DEFAULT NULL,
  `emergency_contact_phone` varchar(30) DEFAULT NULL,
  `id_type` varchar(40) DEFAULT NULL,
  `id_number` varchar(100) DEFAULT NULL,
  `registered_at` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `age` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `patient_code` (`patient_code`),
  KEY `patients_full_name` (`full_name`),
  KEY `patients_phone` (`phone`),
  KEY `patients_created_by_foreign_idx` (`created_by`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `patients_created_by_foreign_idx` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `patients_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=107 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `payment_code` varchar(30) NOT NULL,
  `invoice_id` bigint(20) unsigned NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `method` enum('cash','card','bank_transfer','mobile_banking','insurance','cheque') NOT NULL,
  `reference` varchar(150) DEFAULT NULL,
  `paid_at` datetime NOT NULL,
  `received_by` bigint(20) unsigned DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_code` (`payment_code`),
  KEY `payments_invoice_id` (`invoice_id`),
  KEY `payments_paid_at` (`paid_at`),
  KEY `received_by` (`received_by`),
  CONSTRAINT `payments_ibfk_37` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `payments_ibfk_38` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1798 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payrolls`
--

DROP TABLE IF EXISTS `payrolls`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payrolls` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `payroll_code` varchar(30) NOT NULL,
  `employee_id` bigint(20) unsigned NOT NULL,
  `period_year` int(11) NOT NULL,
  `period_month` int(11) NOT NULL,
  `basic_salary` decimal(12,2) NOT NULL DEFAULT 0.00,
  `allowances` decimal(12,2) NOT NULL DEFAULT 0.00,
  `deductions` decimal(12,2) NOT NULL DEFAULT 0.00,
  `tax` decimal(12,2) NOT NULL DEFAULT 0.00,
  `net_pay` decimal(12,2) NOT NULL DEFAULT 0.00,
  `working_days` int(11) NOT NULL DEFAULT 0,
  `present_days` int(11) NOT NULL DEFAULT 0,
  `status` enum('pending','approved','paid','cancelled') NOT NULL DEFAULT 'pending',
  `paid_at` datetime DEFAULT NULL,
  `paid_by` bigint(20) unsigned DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payroll_code` (`payroll_code`),
  UNIQUE KEY `payrolls_employee_id_period_year_period_month` (`employee_id`,`period_year`,`period_month`),
  KEY `payrolls_status` (`status`),
  CONSTRAINT `payrolls_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prescription_items`
--

DROP TABLE IF EXISTS `prescription_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `prescription_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `prescription_id` bigint(20) unsigned NOT NULL,
  `medicine_id` bigint(20) unsigned DEFAULT NULL,
  `medicine_name` varchar(200) NOT NULL,
  `dosage` varchar(100) DEFAULT NULL,
  `frequency` varchar(100) DEFAULT NULL,
  `duration` varchar(100) DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `instructions` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `prescription_items_prescription_id` (`prescription_id`),
  KEY `prescription_items_medicine_id` (`medicine_id`),
  CONSTRAINT `prescription_items_ibfk_37` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `prescription_items_ibfk_38` FOREIGN KEY (`medicine_id`) REFERENCES `medicines` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prescriptions`
--

DROP TABLE IF EXISTS `prescriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `prescriptions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `prescription_code` varchar(30) NOT NULL,
  `patient_id` bigint(20) unsigned NOT NULL,
  `doctor_id` bigint(20) unsigned NOT NULL,
  `appointment_id` bigint(20) unsigned DEFAULT NULL,
  `prescribed_at` datetime NOT NULL,
  `diagnosis` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('draft','finalized','dispensed') NOT NULL DEFAULT 'draft',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `prescription_code` (`prescription_code`),
  KEY `prescriptions_patient_id` (`patient_id`),
  KEY `prescriptions_doctor_id` (`doctor_id`),
  KEY `prescriptions_status` (`status`),
  KEY `appointment_id` (`appointment_id`),
  CONSTRAINT `prescriptions_ibfk_55` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `prescriptions_ibfk_56` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `prescriptions_ibfk_57` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `radiology_orders`
--

DROP TABLE IF EXISTS `radiology_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `radiology_orders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_code` varchar(30) NOT NULL,
  `patient_id` bigint(20) unsigned NOT NULL,
  `doctor_id` bigint(20) unsigned DEFAULT NULL,
  `test_id` bigint(20) unsigned NOT NULL,
  `ordered_at` datetime NOT NULL,
  `status` enum('ordered','in_progress','completed','cancelled') NOT NULL DEFAULT 'ordered',
  `price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `result_notes` text DEFAULT NULL,
  `result_image_url` varchar(500) DEFAULT NULL,
  `result_at` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `findings` text DEFAULT NULL,
  `impression` text DEFAULT NULL,
  `verified_by` bigint(20) unsigned DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_code` (`order_code`),
  KEY `radiology_orders_patient_id` (`patient_id`),
  KEY `radiology_orders_test_id` (`test_id`),
  KEY `radiology_orders_status` (`status`),
  KEY `doctor_id` (`doctor_id`),
  CONSTRAINT `radiology_orders_ibfk_55` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `radiology_orders_ibfk_56` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `radiology_orders_ibfk_57` FOREIGN KEY (`test_id`) REFERENCES `radiology_tests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=78 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `radiology_parameters`
--

DROP TABLE IF EXISTS `radiology_parameters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `radiology_parameters` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `ref_range_from` varchar(100) DEFAULT NULL,
  `ref_range_to` varchar(100) DEFAULT NULL,
  `unit_option_id` bigint(20) unsigned DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `unit_option_id` (`unit_option_id`),
  CONSTRAINT `radiology_parameters_ibfk_1` FOREIGN KEY (`unit_option_id`) REFERENCES `master_options` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `radiology_tests`
--

DROP TABLE IF EXISTS `radiology_tests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `radiology_tests` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `name` varchar(200) NOT NULL,
  `category` varchar(100) NOT NULL DEFAULT 'other',
  `price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `short_name` varchar(100) DEFAULT NULL,
  `test_type` varchar(100) DEFAULT NULL,
  `method` varchar(100) DEFAULT NULL,
  `report_delivery_day` varchar(50) DEFAULT NULL,
  `base_charge` decimal(12,2) DEFAULT 0.00,
  `final_charge` decimal(12,2) DEFAULT 0.00,
  `tax_rate` decimal(5,2) DEFAULT 0.00,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `radiology_tests_category` (`category`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `referrals`
--

DROP TABLE IF EXISTS `referrals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `referrals` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `referral_code` varchar(30) NOT NULL,
  `patient_id` bigint(20) unsigned NOT NULL,
  `from_doctor_id` bigint(20) unsigned DEFAULT NULL,
  `to_doctor_id` bigint(20) unsigned DEFAULT NULL,
  `external_doctor_name` varchar(150) DEFAULT NULL,
  `external_facility` varchar(200) DEFAULT NULL,
  `external_phone` varchar(30) DEFAULT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `referred_at` datetime NOT NULL,
  `status` enum('pending','accepted','completed','cancelled') NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `referral_code` (`referral_code`),
  KEY `referrals_patient_id` (`patient_id`),
  KEY `referrals_from_doctor_id` (`from_doctor_id`),
  KEY `referrals_to_doctor_id` (`to_doctor_id`),
  KEY `referrals_status` (`status`),
  CONSTRAINT `referrals_ibfk_55` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `referrals_ibfk_56` FOREIGN KEY (`from_doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `referrals_ibfk_57` FOREIGN KEY (`to_doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `refresh_tokens`
--

DROP TABLE IF EXISTS `refresh_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `refresh_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `refresh_tokens_user_id` (`user_id`),
  CONSTRAINT `refresh_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1351 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `schema_migrations`
--

DROP TABLE IF EXISTS `schema_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `schema_migrations` (
  `name` varchar(191) NOT NULL,
  `applied_at` datetime NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `settings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `group_name` varchar(80) NOT NULL DEFAULT 'general',
  `key` varchar(100) NOT NULL,
  `value` text DEFAULT NULL,
  `data_type` enum('string','number','boolean','json') NOT NULL DEFAULT 'string',
  `description` varchar(255) DEFAULT NULL,
  `is_public` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `settings_group_name_key` (`group_name`,`key`),
  KEY `settings_is_public` (`is_public`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `role` enum('admin','doctor','nurse','receptionist','accountant','pharmacist','lab_tech','patient') NOT NULL DEFAULT 'receptionist',
  `phone` varchar(30) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `must_change_password` tinyint(1) NOT NULL DEFAULT 0,
  `password_changed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `users_role` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=574 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wards`
--

DROP TABLE IF EXISTS `wards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wards` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `code` varchar(30) NOT NULL,
  `type` enum('general','private','semi_private','icu','hdu','maternity','pediatric','isolation') NOT NULL DEFAULT 'general',
  `floor` varchar(30) DEFAULT NULL,
  `building_id` bigint(20) unsigned DEFAULT NULL,
  `floor_id` bigint(20) unsigned DEFAULT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `code` (`code`),
  KEY `wards_type` (`type`),
  KEY `idx_wards_building` (`building_id`),
  KEY `idx_wards_floor` (`floor_id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping events for database 'hospital_management'
--

--
-- Dumping routines for database 'hospital_management'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-24 12:59:48
