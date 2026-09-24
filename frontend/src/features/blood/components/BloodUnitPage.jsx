import { BloodMasterEntryPage } from "./BloodMasterEntryPage";

export function BloodUnitPage() {
  return (
    <BloodMasterEntryPage
      createLabel="ENTRY"
      createSuccessNoun="Blood unit"
      endpoint="/blood-bank/units"
      entryTitle="BLOOD UNIT ENTRY"
      listTitle="BLOOD UNIT LIST"
      maxNameLength={100}
      narrow
    />
  );
}
