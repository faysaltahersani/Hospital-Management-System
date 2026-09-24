import { ambulanceSections } from "../../ambulance/data/ambulanceData";
import { appointmentSections } from "../../appointment/data/appointmentData";
import { bedSections } from "../../bed/data/bedData";
import { bloodSections } from "../../blood/data/bloodData";
import { doctorSections } from "../../doctor/data/doctorData";
import { financeSections } from "../../finance/data/financeData";
import { hrPayrollSections } from "../../hr-payroll/data/hrPayrollData";
import { ipdSections } from "../../ipd/data/ipdData";
import { medicineSections } from "../../medicine/data/medicineData";
import { opdSections } from "../../opd/data/opdData";
import { pathologySections } from "../../pathology/data/pathologyData";
import { patientSections } from "../../patient/data/patientData";
import { pharmacySections } from "../../pharmacy/data/pharmacyData";
import { radiologySections } from "../../radiology/data/radiologyData";
import { referralSections } from "../../referral/data/referralData";
import { reportsItems } from "../../reports/data/reportsData";
import { settingsSections } from "../../settings/data/settingsData";

function chunkItems(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

const reportMenuSections = chunkItems(reportsItems, 6).map((items, index) => ({
  title: index === 0 ? "Reports" : "",
  items,
}));

export const secondaryNavMenus = {
  "/ambulance": ambulanceSections,
  "/appointment": appointmentSections,
  "/bed": bedSections,
  "/blood": bloodSections,
  "/doctor": doctorSections,
  "/finance": financeSections,
  "/hr-payroll": hrPayrollSections,
  "/ipd": ipdSections,
  "/medicine": medicineSections,
  "/opd": opdSections,
  "/pathology": pathologySections,
  "/patient": patientSections,
  "/pharmacy": pharmacySections,
  "/radiology": radiologySections,
  "/referral": referralSections,
  "/reports": reportMenuSections,
  "/settings": settingsSections,
};
