import { BloodMasterEntryPage } from "./BloodMasterEntryPage";

export function BloodGroupPage() {
  return (
    <BloodMasterEntryPage
      createLabel="ENTRY"
      createSuccessNoun="Blood group"
      endpoint="/blood-bank/groups"
      entryTitle="BLOOD GROUP ENTRY"
      listTitle="BLOOD GROUP LIST"
      maxNameLength={20}
      narrow
    />
  );
}
