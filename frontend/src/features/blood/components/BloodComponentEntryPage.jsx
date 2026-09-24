import { BloodMasterEntryPage } from "./BloodMasterEntryPage";

export function BloodComponentEntryPage() {
  return (
    <BloodMasterEntryPage
      createLabel="CREATE"
      createSuccessNoun="Blood component"
      endpoint="/blood-bank/components"
      entryTitle="COMPONENT ENTRY"
      listTitle="COMPONENT LIST"
    />
  );
}
