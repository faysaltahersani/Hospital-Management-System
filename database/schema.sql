
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `admission_code` (`admission_code`),
  KEY `admissions_patient_id` (`patient_id`),
  KEY `admissions_doctor_id` (`doctor_id`),
  KEY `admissions_bed_id` (`bed_id`),
  KEY `admissions_status` (`status`),
  KEY `admissions_admitted_at` (`admitted_at`),
  KEY `ward_id` (`ward_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_admissions_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_admissions_hospital` (`hospital_id`),
  KEY `fk_admissions_branch` (`branch_id`),
  KEY `idx_admissions_department` (`department_id`),
  CONSTRAINT `admissions_ibfk_73` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `admissions_ibfk_74` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `admissions_ibfk_75` FOREIGN KEY (`ward_id`) REFERENCES `wards` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `admissions_ibfk_76` FOREIGN KEY (`bed_id`) REFERENCES `beds` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `admissions_ibfk_77` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_admissions_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_admissions_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_admissions_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_admissions_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `trip_code` (`trip_code`),
  KEY `ambulance_trips_ambulance_id` (`ambulance_id`),
  KEY `ambulance_trips_patient_id` (`patient_id`),
  KEY `ambulance_trips_status` (`status`),
  KEY `ambulance_trips_dispatched_at` (`dispatched_at`),
  KEY `idx_ambulance_trips_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_ambulance_trips_hospital` (`hospital_id`),
  KEY `fk_ambulance_trips_branch` (`branch_id`),
  CONSTRAINT `ambulance_trips_ibfk_37` FOREIGN KEY (`ambulance_id`) REFERENCES `ambulances` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ambulance_trips_ibfk_38` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_ambulance_trips_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_ambulance_trips_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_ambulance_trips_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=90 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vehicle_number` (`vehicle_number`),
  KEY `ambulances_status` (`status`),
  KEY `idx_ambulances_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_ambulances_hospital` (`hospital_id`),
  KEY `fk_ambulances_branch` (`branch_id`),
  CONSTRAINT `fk_ambulances_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_ambulances_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_ambulances_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `appointment_code` (`appointment_code`),
  UNIQUE KEY `uk_appointments_active_slot` (`active_slot_key`),
  KEY `appointments_patient_id` (`patient_id`),
  KEY `appointments_doctor_id` (`doctor_id`),
  KEY `appointments_appointment_date` (`appointment_date`),
  KEY `appointments_status` (`status`),
  KEY `department_id` (`department_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_appointments_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_appointments_hospital` (`hospital_id`),
  KEY `fk_appointments_branch` (`branch_id`),
  CONSTRAINT `appointments_ibfk_73` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `appointments_ibfk_74` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `appointments_ibfk_75` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `appointments_ibfk_76` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_appointments_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_appointments_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_appointments_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=261 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `approval_actions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `approval_actions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `approval_request_id` bigint(20) unsigned NOT NULL,
  `workflow_step_id` bigint(20) unsigned DEFAULT NULL,
  `step_order` smallint(5) unsigned DEFAULT NULL,
  `action` enum('submit','approve','reject','comment','cancel') NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `comments` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_approval_action_request` (`approval_request_id`,`created_at`),
  KEY `idx_approval_action_step` (`workflow_step_id`,`action`),
  KEY `idx_approval_action_user` (`user_id`),
  CONSTRAINT `fk_approval_action_request` FOREIGN KEY (`approval_request_id`) REFERENCES `approval_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_approval_action_step` FOREIGN KEY (`workflow_step_id`) REFERENCES `workflow_steps` (`id`),
  CONSTRAINT `fk_approval_action_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `approval_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `approval_requests` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `workflow_definition_id` bigint(20) unsigned NOT NULL,
  `organization_id` bigint(20) unsigned NOT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `request_code` varchar(70) NOT NULL,
  `entity_type` varchar(80) NOT NULL,
  `entity_id` varchar(80) DEFAULT NULL,
  `title` varchar(220) NOT NULL,
  `description` text DEFAULT NULL,
  `amount` decimal(14,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'BDT',
  `status` enum('draft','submitted','in_review','approved','rejected','cancelled') NOT NULL DEFAULT 'draft',
  `current_step_order` smallint(5) unsigned DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `requested_by` bigint(20) unsigned NOT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_approval_request_code` (`request_code`),
  KEY `idx_approval_org_status` (`organization_id`,`status`),
  KEY `idx_approval_branch_status` (`branch_id`,`status`),
  KEY `idx_approval_definition` (`workflow_definition_id`),
  KEY `idx_approval_entity` (`entity_type`,`entity_id`),
  KEY `idx_approval_requester` (`requested_by`),
  KEY `fk_approval_hospital` (`hospital_id`),
  CONSTRAINT `fk_approval_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_approval_definition` FOREIGN KEY (`workflow_definition_id`) REFERENCES `workflow_definitions` (`id`),
  CONSTRAINT `fk_approval_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_approval_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_approval_requester` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_employee_id_attendance_date` (`employee_id`,`attendance_date`),
  KEY `attendance_attendance_date` (`attendance_date`),
  KEY `attendance_status` (`status`),
  KEY `idx_attendance_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_attendance_hospital` (`hospital_id`),
  KEY `fk_attendance_branch` (`branch_id`),
  CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_attendance_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_attendance_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_attendance_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=2959 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `beds_ward_id_bed_number` (`ward_id`,`bed_number`),
  KEY `beds_status` (`status`),
  KEY `idx_beds_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_beds_hospital` (`hospital_id`),
  KEY `fk_beds_branch` (`branch_id`),
  CONSTRAINT `beds_ibfk_1` FOREIGN KEY (`ward_id`) REFERENCES `wards` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_beds_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_beds_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_beds_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bag_code` (`bag_code`),
  KEY `blood_bags_donor_id` (`donor_id`),
  KEY `blood_bags_blood_group` (`blood_group`),
  KEY `blood_bags_status` (`status`),
  KEY `blood_bags_expires_at` (`expires_at`),
  KEY `idx_blood_bags_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_blood_bags_hospital` (`hospital_id`),
  KEY `fk_blood_bags_branch` (`branch_id`),
  CONSTRAINT `blood_bags_ibfk_1` FOREIGN KEY (`donor_id`) REFERENCES `blood_donors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_blood_bags_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_blood_bags_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_blood_bags_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `donor_code` (`donor_code`),
  KEY `blood_donors_full_name` (`full_name`),
  KEY `blood_donors_blood_group` (`blood_group`),
  KEY `blood_donors_phone` (`phone`),
  KEY `idx_blood_donors_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_blood_donors_hospital` (`hospital_id`),
  KEY `fk_blood_donors_branch` (`branch_id`),
  CONSTRAINT `fk_blood_donors_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_blood_donors_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_blood_donors_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `issue_code` (`issue_code`),
  KEY `blood_issues_bag_id` (`bag_id`),
  KEY `blood_issues_patient_id` (`patient_id`),
  KEY `blood_issues_issued_at` (`issued_at`),
  KEY `idx_blood_issues_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_blood_issues_hospital` (`hospital_id`),
  KEY `fk_blood_issues_branch` (`branch_id`),
  CONSTRAINT `blood_issues_ibfk_37` FOREIGN KEY (`bag_id`) REFERENCES `blood_bags` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `blood_issues_ibfk_38` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_blood_issues_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_blood_issues_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_blood_issues_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `branches` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `hospital_id` bigint(20) unsigned NOT NULL,
  `code` varchar(40) NOT NULL,
  `name` varchar(180) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `is_main` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_branches_hospital_code` (`hospital_id`,`code`),
  KEY `idx_branches_hospital_name` (`hospital_id`,`name`),
  KEY `idx_branches_active` (`is_active`),
  KEY `fk_branches_created_by` (`created_by`),
  KEY `fk_branches_updated_by` (`updated_by`),
  CONSTRAINT `fk_branches_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_branches_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_branches_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `clinical_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `clinical_notes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `patient_id` bigint(20) unsigned NOT NULL,
  `encounter_type` varchar(30) DEFAULT NULL,
  `encounter_id` bigint(20) unsigned DEFAULT NULL,
  `note_type` enum('doctor','nursing','progress','assessment','procedure','follow_up','discharge') NOT NULL DEFAULT 'progress',
  `title` varchar(220) NOT NULL,
  `content` longtext NOT NULL,
  `status` enum('draft','final','amended') NOT NULL DEFAULT 'draft',
  `author_id` bigint(20) unsigned NOT NULL,
  `finalized_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_clinical_notes_patient_time` (`patient_id`,`created_at`),
  KEY `idx_clinical_notes_encounter` (`encounter_type`,`encounter_id`),
  KEY `idx_clinical_notes_author` (`author_id`),
  KEY `idx_clinical_notes_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_clinical_notes_hospital` (`hospital_id`),
  KEY `fk_clinical_notes_branch` (`branch_id`),
  CONSTRAINT `fk_clinical_notes_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_clinical_notes_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_clinical_notes_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_clinical_notes_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_clinical_notes_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `contra_entries_code` (`contra_code`),
  KEY `contra_entries_date` (`transaction_date`),
  KEY `contra_entries_from` (`from_account_id`),
  KEY `contra_entries_to` (`to_account_id`),
  KEY `idx_contra_entries_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_contra_entries_hospital` (`hospital_id`),
  KEY `fk_contra_entries_branch` (`branch_id`),
  CONSTRAINT `fk_contra_entries_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_contra_entries_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_contra_entries_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=72 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_departments_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_departments_hospital` (`hospital_id`),
  KEY `fk_departments_branch` (`branch_id`),
  CONSTRAINT `fk_departments_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_departments_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_departments_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
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
  KEY `idx_diagnostic_studies_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_diagnostic_studies_hospital` (`hospital_id`),
  KEY `fk_diagnostic_studies_branch` (`branch_id`),
  KEY `idx_diagnostic_studies_department` (`department_id`),
  CONSTRAINT `fk_diagnostic_studies_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_diagnostic_studies_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_diagnostic_studies_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_diagnostic_studies_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `doctor_code` (`doctor_code`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `license_number` (`license_number`),
  KEY `doctors_department_id` (`department_id`),
  KEY `idx_doctors_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_doctors_hospital` (`hospital_id`),
  KEY `fk_doctors_branch` (`branch_id`),
  CONSTRAINT `doctors_ibfk_37` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `doctors_ibfk_38` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_doctors_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_doctors_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_doctors_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_code` (`employee_code`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `employees_department_id` (`department_id`),
  KEY `employees_full_name` (`full_name`),
  KEY `idx_employees_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_employees_hospital` (`hospital_id`),
  KEY `fk_employees_branch` (`branch_id`),
  CONSTRAINT `employees_ibfk_37` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `employees_ibfk_38` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employees_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_employees_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_employees_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_expense_categories_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_expense_categories_hospital` (`hospital_id`),
  KEY `fk_expense_categories_branch` (`branch_id`),
  CONSTRAINT `fk_expense_categories_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_expense_categories_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_expense_categories_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `expenses_category_id` (`category_id`),
  KEY `expenses_expense_date` (`expense_date`),
  KEY `idx_expenses_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_expenses_hospital` (`hospital_id`),
  KEY `fk_expenses_branch` (`branch_id`),
  CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `expense_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_expenses_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_expenses_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_expenses_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `hospitals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hospitals` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) unsigned NOT NULL,
  `code` varchar(40) NOT NULL,
  `name` varchar(180) NOT NULL,
  `hospital_type` varchar(60) DEFAULT NULL,
  `license_number` varchar(100) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hospitals_org_code` (`organization_id`,`code`),
  KEY `idx_hospitals_org_name` (`organization_id`,`name`),
  KEY `idx_hospitals_active` (`is_active`),
  KEY `fk_hospitals_created_by` (`created_by`),
  KEY `fk_hospitals_updated_by` (`updated_by`),
  CONSTRAINT `fk_hospitals_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_hospitals_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_hospitals_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `income_entries_code` (`income_code`),
  KEY `income_entries_date` (`income_date`),
  KEY `income_entries_head` (`income_head_id`),
  KEY `income_entries_account` (`account_id`),
  KEY `idx_income_entries_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_income_entries_hospital` (`hospital_id`),
  KEY `fk_income_entries_branch` (`branch_id`),
  CONSTRAINT `fk_income_entries_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_income_entries_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_income_entries_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1985 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `invoice_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `invoice_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `invoice_id` bigint(20) unsigned NOT NULL,
  `item_type` enum('consultation','medicine','lab_test','radiology','bed','procedure','ambulance','other') NOT NULL DEFAULT 'other',
  `reference_id` bigint(20) unsigned DEFAULT NULL,
  `service_id` bigint(20) unsigned DEFAULT NULL,
  `service_price_id` bigint(20) unsigned DEFAULT NULL,
  `pricing_snapshot` longtext DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT 1.00,
  `unit_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `invoice_items_invoice_id` (`invoice_id`),
  KEY `invoice_items_item_type` (`item_type`),
  KEY `idx_invoice_items_service` (`service_id`),
  KEY `idx_invoice_items_service_price` (`service_price_id`),
  CONSTRAINT `fk_invoice_items_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_invoice_items_service_price` FOREIGN KEY (`service_price_id`) REFERENCES `service_prices` (`id`) ON DELETE SET NULL,
  CONSTRAINT `invoice_items_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1230 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
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
  KEY `idx_invoices_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_invoices_hospital` (`hospital_id`),
  KEY `fk_invoices_branch` (`branch_id`),
  KEY `idx_invoices_department` (`department_id`),
  CONSTRAINT `fk_invoices_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_invoices_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_invoices_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_invoices_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `invoices_admission_fk` FOREIGN KEY (`admission_id`) REFERENCES `admissions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `invoices_ambulance_trip_fk` FOREIGN KEY (`ambulance_trip_id`) REFERENCES `ambulance_trips` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `invoices_blood_issue_fk` FOREIGN KEY (`blood_issue_id`) REFERENCES `blood_issues` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `invoices_ibfk_37` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `invoices_ibfk_38` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `invoices_lab_order_fk` FOREIGN KEY (`lab_order_id`) REFERENCES `lab_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `invoices_opd_visit_fk` FOREIGN KEY (`opd_visit_id`) REFERENCES `opd_visits` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `invoices_radiology_order_fk` FOREIGN KEY (`radiology_order_id`) REFERENCES `radiology_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1578 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=301 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_code` (`order_code`),
  KEY `lab_orders_patient_id` (`patient_id`),
  KEY `lab_orders_doctor_id` (`doctor_id`),
  KEY `lab_orders_status` (`status`),
  KEY `idx_lab_orders_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_lab_orders_hospital` (`hospital_id`),
  KEY `fk_lab_orders_branch` (`branch_id`),
  KEY `idx_lab_orders_department` (`department_id`),
  CONSTRAINT `fk_lab_orders_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_lab_orders_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_lab_orders_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_lab_orders_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `lab_orders_ibfk_37` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `lab_orders_ibfk_38` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=187 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `lab_tests_category` (`category`),
  KEY `idx_lab_tests_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_lab_tests_hospital` (`hospital_id`),
  KEY `fk_lab_tests_branch` (`branch_id`),
  CONSTRAINT `fk_lab_tests_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_lab_tests_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_lab_tests_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=351 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `medicine_batches_medicine_batch` (`medicine_id`,`batch_no`),
  KEY `medicine_batches_expiry` (`expiry_date`),
  KEY `idx_medicine_batches_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_medicine_batches_hospital` (`hospital_id`),
  KEY `fk_medicine_batches_branch` (`branch_id`),
  CONSTRAINT `fk_medicine_batches_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_medicine_batches_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_medicine_batches_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `medicine_batches_medicine_fk` FOREIGN KEY (`medicine_id`) REFERENCES `medicines` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=397 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=201 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=153 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sale_code` (`sale_code`),
  KEY `medicine_sales_patient_id` (`patient_id`),
  KEY `medicine_sales_sold_at` (`sold_at`),
  KEY `prescription_id` (`prescription_id`),
  KEY `sold_by` (`sold_by`),
  KEY `idx_medicine_sales_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_medicine_sales_hospital` (`hospital_id`),
  KEY `fk_medicine_sales_branch` (`branch_id`),
  CONSTRAINT `fk_medicine_sales_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_medicine_sales_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_medicine_sales_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `medicine_sales_ibfk_55` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `medicine_sales_ibfk_56` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `medicine_sales_ibfk_57` FOREIGN KEY (`sold_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=144 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `medicines_name` (`name`),
  KEY `medicines_category` (`category`),
  KEY `idx_medicines_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_medicines_hospital` (`hospital_id`),
  KEY `fk_medicines_branch` (`branch_id`),
  CONSTRAINT `fk_medicines_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_medicines_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_medicines_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=231 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `visit_code` (`visit_code`),
  KEY `opd_visits_patient_id` (`patient_id`),
  KEY `opd_visits_doctor_id` (`doctor_id`),
  KEY `opd_visits_visit_date` (`visit_date`),
  KEY `opd_visits_status` (`status`),
  KEY `department_id` (`department_id`),
  KEY `appointment_id` (`appointment_id`),
  KEY `idx_opd_visits_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_opd_visits_hospital` (`hospital_id`),
  KEY `fk_opd_visits_branch` (`branch_id`),
  CONSTRAINT `fk_opd_visits_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_opd_visits_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_opd_visits_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `opd_visits_ibfk_73` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `opd_visits_ibfk_74` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `opd_visits_ibfk_75` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `opd_visits_ibfk_76` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1188 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `organizations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `organizations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(40) NOT NULL,
  `name` varchar(180) NOT NULL,
  `legal_name` varchar(220) DEFAULT NULL,
  `registration_number` varchar(100) DEFAULT NULL,
  `timezone` varchar(60) NOT NULL DEFAULT 'Asia/Dhaka',
  `currency_code` varchar(3) NOT NULL DEFAULT 'BDT',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_organizations_code` (`code`),
  KEY `idx_organizations_name` (`name`),
  KEY `idx_organizations_active` (`is_active`),
  KEY `fk_organizations_created_by` (`created_by`),
  KEY `fk_organizations_updated_by` (`updated_by`),
  CONSTRAINT `fk_organizations_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_organizations_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
DROP TABLE IF EXISTS `patient_allergies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `patient_allergies` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `patient_id` bigint(20) unsigned NOT NULL,
  `allergen` varchar(180) NOT NULL,
  `reaction` varchar(255) DEFAULT NULL,
  `severity` enum('mild','moderate','severe','life_threatening','unknown') NOT NULL DEFAULT 'unknown',
  `status` enum('active','inactive','resolved') NOT NULL DEFAULT 'active',
  `onset_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `recorded_by` bigint(20) unsigned DEFAULT NULL,
  `verified_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_patient_allergies_patient_status` (`patient_id`,`status`),
  KEY `idx_patient_allergies_allergen` (`allergen`),
  KEY `fk_patient_allergies_recorded_by` (`recorded_by`),
  KEY `fk_patient_allergies_verified_by` (`verified_by`),
  KEY `idx_patient_allergies_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_patient_allergies_hospital` (`hospital_id`),
  KEY `fk_patient_allergies_branch` (`branch_id`),
  CONSTRAINT `fk_patient_allergies_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_patient_allergies_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_patient_allergies_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_patient_allergies_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`),
  CONSTRAINT `fk_patient_allergies_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_patient_allergies_verified_by` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `patient_histories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `patient_histories` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `patient_id` bigint(20) unsigned NOT NULL,
  `category` enum('medical','surgical','family','immunization','previous_treatment') NOT NULL,
  `title` varchar(220) NOT NULL,
  `details` text DEFAULT NULL,
  `occurred_on` date DEFAULT NULL,
  `recorded_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_patient_histories_patient_category` (`patient_id`,`category`),
  KEY `idx_patient_histories_date` (`occurred_on`),
  KEY `fk_patient_histories_recorded_by` (`recorded_by`),
  KEY `idx_patient_histories_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_patient_histories_hospital` (`hospital_id`),
  KEY `fk_patient_histories_branch` (`branch_id`),
  CONSTRAINT `fk_patient_histories_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_patient_histories_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_patient_histories_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_patient_histories_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`),
  CONSTRAINT `fk_patient_histories_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `patient_problems`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `patient_problems` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `patient_id` bigint(20) unsigned NOT NULL,
  `code` varchar(30) DEFAULT NULL,
  `title` varchar(220) NOT NULL,
  `problem_type` enum('diagnosis','chronic_disease','symptom','risk') NOT NULL DEFAULT 'diagnosis',
  `status` enum('active','resolved','inactive') NOT NULL DEFAULT 'active',
  `onset_date` date DEFAULT NULL,
  `resolved_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `recorded_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_patient_problems_patient_status` (`patient_id`,`status`),
  KEY `idx_patient_problems_code` (`code`),
  KEY `fk_patient_problems_recorded_by` (`recorded_by`),
  KEY `idx_patient_problems_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_patient_problems_hospital` (`hospital_id`),
  KEY `fk_patient_problems_branch` (`branch_id`),
  CONSTRAINT `fk_patient_problems_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_patient_problems_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_patient_problems_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_patient_problems_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`),
  CONSTRAINT `fk_patient_problems_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `patient_code` (`patient_code`),
  KEY `patients_full_name` (`full_name`),
  KEY `patients_phone` (`phone`),
  KEY `patients_created_by_foreign_idx` (`created_by`),
  KEY `user_id` (`user_id`),
  KEY `idx_patients_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_patients_hospital` (`hospital_id`),
  KEY `fk_patients_branch` (`branch_id`),
  CONSTRAINT `fk_patients_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_patients_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_patients_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `patients_created_by_foreign_idx` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `patients_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=141 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_code` (`payment_code`),
  KEY `payments_invoice_id` (`invoice_id`),
  KEY `payments_paid_at` (`paid_at`),
  KEY `received_by` (`received_by`),
  KEY `idx_payments_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_payments_hospital` (`hospital_id`),
  KEY `fk_payments_branch` (`branch_id`),
  CONSTRAINT `fk_payments_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_payments_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_payments_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `payments_ibfk_37` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `payments_ibfk_38` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1882 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payroll_code` (`payroll_code`),
  UNIQUE KEY `payrolls_employee_id_period_year_period_month` (`employee_id`,`period_year`,`period_month`),
  KEY `payrolls_status` (`status`),
  KEY `idx_payrolls_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_payrolls_hospital` (`hospital_id`),
  KEY `fk_payrolls_branch` (`branch_id`),
  CONSTRAINT `fk_payrolls_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_payrolls_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_payrolls_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `payrolls_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `prescription_code` (`prescription_code`),
  KEY `prescriptions_patient_id` (`patient_id`),
  KEY `prescriptions_doctor_id` (`doctor_id`),
  KEY `prescriptions_status` (`status`),
  KEY `appointment_id` (`appointment_id`),
  KEY `idx_prescriptions_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_prescriptions_hospital` (`hospital_id`),
  KEY `fk_prescriptions_branch` (`branch_id`),
  CONSTRAINT `fk_prescriptions_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_prescriptions_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_prescriptions_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `prescriptions_ibfk_55` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `prescriptions_ibfk_56` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `prescriptions_ibfk_57` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `pricing_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pricing_rules` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) unsigned NOT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `service_id` bigint(20) unsigned DEFAULT NULL,
  `service_category_id` bigint(20) unsigned DEFAULT NULL,
  `code` varchar(80) NOT NULL,
  `name` varchar(180) NOT NULL,
  `rule_type` enum('percentage_discount','flat_discount','surcharge','tax_override') NOT NULL,
  `value` decimal(14,4) NOT NULL,
  `payer_type` enum('self','corporate','insurance','government','all') NOT NULL DEFAULT 'all',
  `payer_reference` varchar(120) DEFAULT NULL,
  `conditions_json` longtext DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 100,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `status` enum('draft','pending','approved','rejected','retired') NOT NULL DEFAULT 'draft',
  `approval_request_id` bigint(20) unsigned DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rejection_reason` varchar(500) DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pricing_rules_org_code` (`organization_id`,`code`),
  KEY `idx_pricing_rules_resolution` (`service_id`,`service_category_id`,`status`,`effective_from`,`effective_to`),
  KEY `idx_pricing_rules_scope` (`organization_id`,`hospital_id`,`branch_id`,`payer_type`),
  KEY `fk_pricing_rules_hospital` (`hospital_id`),
  KEY `fk_pricing_rules_branch` (`branch_id`),
  KEY `fk_pricing_rules_category` (`service_category_id`),
  KEY `fk_pricing_rules_approval` (`approval_request_id`),
  KEY `fk_pricing_rules_approved_by` (`approved_by`),
  KEY `fk_pricing_rules_created_by` (`created_by`),
  KEY `fk_pricing_rules_updated_by` (`updated_by`),
  CONSTRAINT `fk_pricing_rules_approval` FOREIGN KEY (`approval_request_id`) REFERENCES `approval_requests` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pricing_rules_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pricing_rules_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pricing_rules_category` FOREIGN KEY (`service_category_id`) REFERENCES `service_categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pricing_rules_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pricing_rules_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pricing_rules_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_pricing_rules_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pricing_rules_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ck_pricing_rules_dates` CHECK (`effective_to` is null or `effective_to` >= `effective_from`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_code` (`order_code`),
  KEY `radiology_orders_patient_id` (`patient_id`),
  KEY `radiology_orders_test_id` (`test_id`),
  KEY `radiology_orders_status` (`status`),
  KEY `doctor_id` (`doctor_id`),
  KEY `idx_radiology_orders_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_radiology_orders_hospital` (`hospital_id`),
  KEY `fk_radiology_orders_branch` (`branch_id`),
  KEY `idx_radiology_orders_department` (`department_id`),
  CONSTRAINT `fk_radiology_orders_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_radiology_orders_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_radiology_orders_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_radiology_orders_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `radiology_orders_ibfk_55` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `radiology_orders_ibfk_56` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `radiology_orders_ibfk_57` FOREIGN KEY (`test_id`) REFERENCES `radiology_tests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=86 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `radiology_tests_category` (`category`),
  KEY `idx_radiology_tests_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_radiology_tests_hospital` (`hospital_id`),
  KEY `fk_radiology_tests_branch` (`branch_id`),
  CONSTRAINT `fk_radiology_tests_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_radiology_tests_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_radiology_tests_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `referral_code` (`referral_code`),
  KEY `referrals_patient_id` (`patient_id`),
  KEY `referrals_from_doctor_id` (`from_doctor_id`),
  KEY `referrals_to_doctor_id` (`to_doctor_id`),
  KEY `referrals_status` (`status`),
  KEY `idx_referrals_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_referrals_hospital` (`hospital_id`),
  KEY `fk_referrals_branch` (`branch_id`),
  CONSTRAINT `fk_referrals_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_referrals_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_referrals_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `referrals_ibfk_55` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `referrals_ibfk_56` FOREIGN KEY (`from_doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `referrals_ibfk_57` FOREIGN KEY (`to_doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=1556 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `schema_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `schema_migrations` (
  `name` varchar(191) NOT NULL,
  `applied_at` datetime NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `service_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `service_categories` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) unsigned NOT NULL,
  `service_type_id` bigint(20) unsigned NOT NULL,
  `code` varchar(60) NOT NULL,
  `name` varchar(180) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_service_categories_org_code` (`organization_id`,`code`),
  KEY `idx_service_categories_type` (`service_type_id`,`is_active`),
  KEY `fk_service_categories_created_by` (`created_by`),
  KEY `fk_service_categories_updated_by` (`updated_by`),
  CONSTRAINT `fk_service_categories_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_service_categories_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_service_categories_type` FOREIGN KEY (`service_type_id`) REFERENCES `service_types` (`id`),
  CONSTRAINT `fk_service_categories_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `service_prices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `service_prices` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `service_id` bigint(20) unsigned NOT NULL,
  `organization_id` bigint(20) unsigned NOT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `payer_type` enum('self','corporate','insurance','government','all') NOT NULL DEFAULT 'self',
  `payer_reference` varchar(120) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'BDT',
  `amount` decimal(14,2) NOT NULL,
  `tax_rate` decimal(7,4) NOT NULL DEFAULT 0.0000,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `version_no` int(10) unsigned NOT NULL DEFAULT 1,
  `status` enum('draft','pending','approved','rejected','retired') NOT NULL DEFAULT 'draft',
  `approval_request_id` bigint(20) unsigned DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rejection_reason` varchar(500) DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `hospital_scope_key` bigint(20) unsigned GENERATED ALWAYS AS (coalesce(`hospital_id`,0)) STORED,
  `branch_scope_key` bigint(20) unsigned GENERATED ALWAYS AS (coalesce(`branch_id`,0)) STORED,
  `payer_reference_key` varchar(120) GENERATED ALWAYS AS (coalesce(`payer_reference`,'')) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_service_prices_version` (`service_id`,`organization_id`,`hospital_scope_key`,`branch_scope_key`,`payer_type`,`payer_reference_key`,`version_no`),
  KEY `idx_service_prices_resolution` (`service_id`,`status`,`effective_from`,`effective_to`),
  KEY `idx_service_prices_scope` (`organization_id`,`hospital_id`,`branch_id`,`payer_type`),
  KEY `fk_service_prices_hospital` (`hospital_id`),
  KEY `fk_service_prices_branch` (`branch_id`),
  KEY `fk_service_prices_approval` (`approval_request_id`),
  KEY `fk_service_prices_approved_by` (`approved_by`),
  KEY `fk_service_prices_created_by` (`created_by`),
  KEY `fk_service_prices_updated_by` (`updated_by`),
  CONSTRAINT `fk_service_prices_approval` FOREIGN KEY (`approval_request_id`) REFERENCES `approval_requests` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_service_prices_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_service_prices_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_service_prices_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_service_prices_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_service_prices_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_service_prices_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`),
  CONSTRAINT `fk_service_prices_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ck_service_prices_nonnegative` CHECK (`amount` >= 0),
  CONSTRAINT `ck_service_prices_dates` CHECK (`effective_to` is null or `effective_to` >= `effective_from`)
) ENGINE=InnoDB AUTO_INCREMENT=235 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `service_source_links`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `service_source_links` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) unsigned NOT NULL,
  `service_id` bigint(20) unsigned NOT NULL,
  `source_type` enum('doctor','lab_test','radiology_test','bed','ambulance','medicine','blood_bag','legacy_charge') NOT NULL,
  `source_id` bigint(20) unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_service_source_link` (`organization_id`,`source_type`,`source_id`),
  KEY `idx_service_source_service` (`service_id`),
  CONSTRAINT `fk_service_source_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_service_source_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=204 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `service_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `service_types` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) unsigned NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(160) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_service_types_org_code` (`organization_id`,`code`),
  KEY `idx_service_types_org_active` (`organization_id`,`is_active`),
  KEY `fk_service_types_created_by` (`created_by`),
  KEY `fk_service_types_updated_by` (`updated_by`),
  CONSTRAINT `fk_service_types_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_service_types_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_service_types_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `services` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) unsigned NOT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `service_type_id` bigint(20) unsigned NOT NULL,
  `service_category_id` bigint(20) unsigned DEFAULT NULL,
  `code` varchar(80) NOT NULL,
  `name` varchar(220) NOT NULL,
  `description` text DEFAULT NULL,
  `billing_unit` varchar(40) NOT NULL DEFAULT 'unit',
  `requires_approval` tinyint(1) NOT NULL DEFAULT 0,
  `is_taxable` tinyint(1) NOT NULL DEFAULT 0,
  `default_duration_minutes` int(10) unsigned DEFAULT NULL,
  `status` enum('draft','active','inactive','retired') NOT NULL DEFAULT 'active',
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_services_org_code` (`organization_id`,`code`),
  KEY `idx_services_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `idx_services_type_category` (`service_type_id`,`service_category_id`),
  KEY `idx_services_name_status` (`name`,`status`),
  KEY `fk_services_hospital` (`hospital_id`),
  KEY `fk_services_branch` (`branch_id`),
  KEY `fk_services_category` (`service_category_id`),
  KEY `fk_services_created_by` (`created_by`),
  KEY `fk_services_updated_by` (`updated_by`),
  CONSTRAINT `fk_services_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_services_category` FOREIGN KEY (`service_category_id`) REFERENCES `service_categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_services_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_services_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_services_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_services_type` FOREIGN KEY (`service_type_id`) REFERENCES `service_types` (`id`),
  CONSTRAINT `fk_services_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=209 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `role` enum('super_admin','admin','hospital_admin','branch_admin','ceo','management','doctor','nurse','receptionist','cashier','accountant','finance_manager','pharmacist','lab_tech','pathologist','radiologist','ot_staff','anesthetist','icu_staff','blood_bank_staff','procurement_officer','store_manager','hr_manager','housekeeping','dietician','ambulance_staff','insurance_officer','patient') NOT NULL DEFAULT 'receptionist',
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `must_change_password` tinyint(1) NOT NULL DEFAULT 0,
  `password_changed_at` datetime DEFAULT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `users_role` (`role`),
  KEY `idx_users_organization` (`organization_id`),
  KEY `idx_users_hospital` (`hospital_id`),
  KEY `idx_users_branch` (`branch_id`),
  KEY `idx_users_department` (`department_id`),
  CONSTRAINT `fk_users_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_users_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_users_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_users_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=669 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `vital_signs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vital_signs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `patient_id` bigint(20) unsigned NOT NULL,
  `encounter_type` varchar(30) DEFAULT NULL,
  `encounter_id` bigint(20) unsigned DEFAULT NULL,
  `captured_at` datetime NOT NULL DEFAULT current_timestamp(),
  `temperature_c` decimal(4,1) DEFAULT NULL,
  `pulse_bpm` smallint(5) unsigned DEFAULT NULL,
  `respiratory_rate` smallint(5) unsigned DEFAULT NULL,
  `systolic_bp` smallint(5) unsigned DEFAULT NULL,
  `diastolic_bp` smallint(5) unsigned DEFAULT NULL,
  `spo2_percent` decimal(5,2) DEFAULT NULL,
  `height_cm` decimal(6,2) DEFAULT NULL,
  `weight_kg` decimal(7,2) DEFAULT NULL,
  `bmi` decimal(5,2) DEFAULT NULL,
  `pain_score` tinyint(3) unsigned DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `recorded_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_vitals_patient_time` (`patient_id`,`captured_at`),
  KEY `idx_vitals_encounter` (`encounter_type`,`encounter_id`),
  KEY `fk_vitals_recorded_by` (`recorded_by`),
  KEY `idx_vital_signs_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_vital_signs_hospital` (`hospital_id`),
  KEY `fk_vital_signs_branch` (`branch_id`),
  CONSTRAINT `fk_vital_signs_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_vital_signs_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_vital_signs_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_vitals_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`),
  CONSTRAINT `fk_vitals_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `code` (`code`),
  KEY `wards_type` (`type`),
  KEY `idx_wards_building` (`building_id`),
  KEY `idx_wards_floor` (`floor_id`),
  KEY `idx_wards_scope` (`organization_id`,`hospital_id`,`branch_id`),
  KEY `fk_wards_hospital` (`hospital_id`),
  KEY `fk_wards_branch` (`branch_id`),
  CONSTRAINT `fk_wards_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_wards_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_wards_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `workflow_definitions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `workflow_definitions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) unsigned NOT NULL,
  `hospital_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `code` varchar(60) NOT NULL,
  `name` varchar(180) NOT NULL,
  `workflow_type` varchar(60) NOT NULL,
  `entity_type` varchar(80) NOT NULL,
  `description` text DEFAULT NULL,
  `min_amount` decimal(14,2) DEFAULT NULL,
  `max_amount` decimal(14,2) DEFAULT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'BDT',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_workflow_definition_org_code` (`organization_id`,`code`),
  KEY `idx_workflow_type_active` (`workflow_type`,`is_active`),
  KEY `idx_workflow_hospital` (`hospital_id`),
  KEY `idx_workflow_branch` (`branch_id`),
  KEY `fk_workflow_created_by` (`created_by`),
  KEY `fk_workflow_updated_by` (`updated_by`),
  CONSTRAINT `fk_workflow_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_workflow_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_workflow_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`),
  CONSTRAINT `fk_workflow_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_workflow_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ck_workflow_amount_range` CHECK (`min_amount` is null or `max_amount` is null or `min_amount` <= `max_amount`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `workflow_steps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `workflow_steps` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `workflow_definition_id` bigint(20) unsigned NOT NULL,
  `step_order` smallint(5) unsigned NOT NULL,
  `name` varchar(160) NOT NULL,
  `approver_role` varchar(60) DEFAULT NULL,
  `approver_user_id` bigint(20) unsigned DEFAULT NULL,
  `min_approvals` smallint(5) unsigned NOT NULL DEFAULT 1,
  `can_reject` tinyint(1) NOT NULL DEFAULT 1,
  `due_hours` int(10) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_workflow_step_order` (`workflow_definition_id`,`step_order`),
  KEY `idx_workflow_step_role` (`approver_role`),
  KEY `idx_workflow_step_user` (`approver_user_id`),
  CONSTRAINT `fk_workflow_step_definition` FOREIGN KEY (`workflow_definition_id`) REFERENCES `workflow_definitions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_workflow_step_user` FOREIGN KEY (`approver_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `ck_workflow_step_approver` CHECK (`approver_role` is not null or `approver_user_id` is not null)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
