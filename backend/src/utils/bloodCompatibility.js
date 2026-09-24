'use strict';

// BUG-013 — transfusion compatibility rules.
//
// The blood issue endpoint previously performed no comparison between the
// bag's group and the recipient's group. The shipped database contains an A+
// unit issued to an AB- patient, which is Rh-incompatible and clinically
// dangerous. These rules are enforced server-side in blood-bank.service.
//
// Direction of compatibility differs by component:
//   * Red-cell products (whole_blood, rbc) - donor antigens must not be
//     attacked by recipient antibodies. O- is the universal donor.
//   * Plasma products (plasma, cryo) - the direction reverses, because plasma
//     carries antibodies rather than antigens. AB is the universal plasma donor.
//   * Platelets - ABO-identical only. Platelet products carry both residual
//     plasma and antigens, and this system records no volume-reduction or
//     titre data on which a safe substitution could be based, so the
//     conservative rule is the only defensible one.

const RED_CELL_RULES = Object.freeze({
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
});

const PLASMA_RULES = Object.freeze({
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A-', 'A+', 'AB-', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B-', 'B+', 'AB-', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB-', 'AB+'],
});

const RED_CELL_COMPONENTS = new Set(['whole_blood', 'rbc']);
const PLASMA_COMPONENTS = new Set(['plasma', 'cryo']);
const PLATELET_COMPONENTS = new Set(['platelets']);

const VALID_GROUPS = new Set(Object.keys(RED_CELL_RULES));

const isKnownGroup = (group) => VALID_GROUPS.has(String(group || '').toUpperCase().trim());

const normalize = (group) => String(group || '').toUpperCase().trim();

/**
 * @returns {{compatible: boolean, reason: string|null, rule: string}}
 * `compatible: false` with a reason is returned for unknown/missing groups —
 * the caller must fail closed rather than proceeding.
 */
const checkCompatibility = ({ bagGroup, recipientGroup, component = 'whole_blood' }) => {
  const bag = normalize(bagGroup);
  const recipient = normalize(recipientGroup);
  const comp = String(component || 'whole_blood').toLowerCase().trim();

  if (!isKnownGroup(bag)) {
    return { compatible: false, reason: `Blood bag group is missing or unknown ("${bagGroup}")`, rule: 'unknown-bag-group' };
  }
  if (!isKnownGroup(recipient)) {
    return {
      compatible: false,
      reason: `Recipient blood group is missing or unknown ("${recipientGroup}"). Record a confirmed group before issuing.`,
      rule: 'unknown-recipient-group',
    };
  }

  if (PLATELET_COMPONENTS.has(comp)) {
    return bag === recipient
      ? { compatible: true, reason: null, rule: 'platelet-identical' }
      : {
          compatible: false,
          reason: `Platelets must be ABO/Rh identical: ${bag} cannot be issued to ${recipient}`,
          rule: 'platelet-identical',
        };
  }

  const rules = PLASMA_COMPONENTS.has(comp) ? PLASMA_RULES : RED_CELL_RULES;
  const ruleName = PLASMA_COMPONENTS.has(comp) ? 'plasma' : 'red-cell';

  if (!RED_CELL_COMPONENTS.has(comp) && !PLASMA_COMPONENTS.has(comp)) {
    return { compatible: false, reason: `Unrecognised component "${component}"`, rule: 'unknown-component' };
  }

  const allowed = rules[recipient] || [];
  return allowed.includes(bag)
    ? { compatible: true, reason: null, rule: ruleName }
    : {
        compatible: false,
        reason: `${bag} ${comp} is not compatible with recipient group ${recipient}`,
        rule: ruleName,
      };
};

const compatibleDonorGroups = (recipientGroup, component = 'whole_blood') => {
  const recipient = normalize(recipientGroup);
  if (!isKnownGroup(recipient)) return [];
  const comp = String(component).toLowerCase();
  if (PLATELET_COMPONENTS.has(comp)) return [recipient];
  return (PLASMA_COMPONENTS.has(comp) ? PLASMA_RULES : RED_CELL_RULES)[recipient] || [];
};

module.exports = { checkCompatibility, compatibleDonorGroups, isKnownGroup, VALID_GROUPS };
