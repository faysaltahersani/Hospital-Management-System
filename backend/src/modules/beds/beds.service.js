'use strict';

const ApiError = require('../../utils/ApiError');
const { parsePaging, buildMeta } = require('../../utils/pagination');
const { BED_STATUS } = require('../../config/constants');
const repository = require('./beds.repository');
const ipdRepository = require('../ipd/ipd.repository');

/* ---------- Wards ---------- */

const listWards = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.type) filters.type = query.type;
  if (query.is_active !== undefined) filters.is_active = query.is_active;

  let { rows, count } = await repository.findAndCountWards({
    filters,
    search: query.search,
    limit,
    offset,
  });

  // BUG-019 — removed seed-on-GET: five default wards now seeded by migration 008 (a filtered empty result no longer injects them)

  // A ward's building and floor are stored columns now (migration 019), so they
  // are reported as they are. This used to stamp every ward with whatever building
  // MasterOption.findOne returned first, which made the Bed Entry ward dropdown
  // empty for every other building. A ward that has not been assigned yet reports
  // null — the frontend keeps those selectable rather than hiding them.
  const floorsList = await MasterOption.findAll({ where: { type: 'floor', is_active: true } });
  const floorById = new Map(floorsList.map((f) => [String(f.id), f]));

  // The legacy `floor` varchar sometimes still names a floor ('1st Floor') rather
  // than holding its id. Resolve by label so those wards filter correctly too,
  // without writing a guess back to the database.
  const floorByLabel = new Map(
    floorsList.map((f) => [String(f.label || '').trim().toLowerCase(), f])
  );
  const buildingOfFloor = (floor) => {
    if (!floor) return null;
    try {
      const parsed = JSON.parse(floor.description || '{}');
      return parsed.building_id ?? null;
    } catch (err) {
      return null;
    }
  };

  const items = rows.map((w) => {
    const json = w.toJSON();
    let floorId = json.floor_id ?? null;
    let buildingId = json.building_id ?? null;

    if (!floorId && json.floor) {
      const match =
        floorById.get(String(json.floor).trim()) ||
        floorByLabel.get(String(json.floor).trim().toLowerCase());
      if (match) floorId = match.id;
    }
    if (!buildingId && floorId) buildingId = buildingOfFloor(floorById.get(String(floorId)));

    return {
      ...json,
      floor_id: floorId,
      building_id: buildingId,
      floor_record: buildingId ? { building_id: buildingId } : null,
    };
  });

  return { items, meta: buildMeta({ total: count, page, limit }) };
};

const getWard = async (id) => {
  const ward = await repository.findWardById(id);
  if (!ward) throw ApiError.notFound('Ward not found');
  return ward.toJSON();
};

/**
 * Works out which building and floor a ward belongs to, from whatever the caller
 * supplied. A floor knows its own building, so passing floor_id is enough; if both
 * are given they must agree, because silently trusting a mismatched pair is how a
 * ward ends up filed under the wrong building.
 */
const resolveWardPlacement = async (input) => {
  const floorId = input.floor_id ? Number(input.floor_id) : null;
  const givenBuildingId = input.building_id ? Number(input.building_id) : null;

  if (!floorId) return { building_id: givenBuildingId || null, floor_id: null };

  const floor = await MasterOption.findOne({ where: { id: floorId, type: 'floor' } });
  if (!floor) throw ApiError.badRequest(`Floor ${floorId} not found`);

  let floorBuildingId = null;
  try {
    floorBuildingId = JSON.parse(floor.description || '{}').building_id ?? null;
  } catch (err) {
    floorBuildingId = null;
  }

  if (givenBuildingId && floorBuildingId && Number(floorBuildingId) !== givenBuildingId) {
    throw ApiError.badRequest(
      `Floor "${floor.label}" belongs to building ${floorBuildingId}, not building ${givenBuildingId}`
    );
  }

  return { building_id: givenBuildingId || floorBuildingId || null, floor_id: floorId };
};

const createWard = async (input) => {
  const code = input.code || `WRD_${Date.now().toString().slice(-6)}`;
  const exists = await repository.findWardByCode(code);
  if (exists) throw ApiError.conflict('Ward code already exists');
  const validTypes = ['general', 'private', 'semi_private', 'icu', 'hdu', 'maternity', 'pediatric', 'isolation'];
  const type = validTypes.includes(input.type) ? input.type : 'general';
  const floor = input.floor_id ? String(input.floor_id) : (input.floor || null);
  // Store the relationship instead of leaving it to be guessed on read.
  const { building_id, floor_id } = await resolveWardPlacement(input);
  const ward = await repository.createWard({ ...input, code, type, floor, building_id, floor_id });
  return ward.toJSON();
};

const updateWard = async (id, changes) => {
  const ward = await repository.findWardById(id);
  if (!ward) throw ApiError.notFound('Ward not found');
  const floor = changes.floor_id ? String(changes.floor_id) : changes.floor;
  const updateData = { ...changes };
  if (floor !== undefined) updateData.floor = floor;
  if (changes.floor_id !== undefined || changes.building_id !== undefined) {
    const placement = await resolveWardPlacement(changes);
    updateData.building_id = placement.building_id;
    updateData.floor_id = placement.floor_id;
  }
  await repository.updateWard(ward, updateData);
  return ward.toJSON();
};


const removeWard = async (id) => {
  const ward = await repository.findWardById(id);
  if (!ward) throw ApiError.notFound('Ward not found');

  // BUG-028 - a ward with beds or active admissions must not be soft-deleted
  // out from under them.
  const { Bed, Admission } = require('../../models');
  const bedCount = await Bed.count({ where: { ward_id: id } });
  const admissionCount = await Admission.count({ where: { ward_id: id, status: 'admitted' } });
  if (bedCount > 0 || admissionCount > 0) {
    const parts = [];
    if (bedCount) parts.push(`${bedCount} bed(s)`);
    if (admissionCount) parts.push(`${admissionCount} active admission(s)`);
    throw ApiError.conflict(`Cannot delete ward ${ward.name}: ${parts.join(' and ')} still belong to it`);
  }

  await repository.destroyWard(ward);
  return { message: 'Ward deleted' };
};

/* ---------- Beds ---------- */

const listBeds = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.ward_id) filters.ward_id = query.ward_id;
  if (query.status) filters.status = query.status;

  let { rows, count } = await repository.findAndCountBeds({
    filters,
    search: query.search,
    limit,
    offset,
  });

  // BUG-019 — removed seed-on-GET: four phantom beds no longer created when a filtered query returns nothing

  return { items: rows.map((b) => b.toJSON()), meta: buildMeta({ total: count, page, limit }) };
};

const getBed = async (id) => {
  const bed = await repository.findBedById(id);
  if (!bed) throw ApiError.notFound('Bed not found');
  return bed.toJSON();
};

const createBed = async (input) => {
  const ward = await repository.findWardById(input.ward_id);
  if (!ward) throw ApiError.badRequest('Ward not found');
  const bed = await repository.createBed({
    ward_id: input.ward_id,
    bed_number: input.bed_number,
    room_number: input.room_number || null,
    daily_rate: input.daily_rate || 0,
    status: input.status || BED_STATUS.AVAILABLE,
    notes: input.notes || null,
  });
  return (await repository.findBedById(bed.id)).toJSON();
};

const updateBed = async (id, changes) => {
  const bed = await repository.findBedById(id);
  if (!bed) throw ApiError.notFound('Bed not found');
  if (changes.ward_id) {
    const ward = await repository.findWardById(changes.ward_id);
    if (!ward) throw ApiError.badRequest('Ward not found');
  }

  // BUG-027 - bed status used to be freely editable, so a nurse could mark an
  // occupied bed 'available' and a second patient could then be admitted to it.
  // Status must not contradict the admissions that actually hold the bed.
  if (changes.status !== undefined && changes.status !== bed.status) {
    const occupant = await ipdRepository.findActiveByBed(bed.id);
    if (occupant && changes.status !== BED_STATUS.OCCUPIED) {
      throw ApiError.conflict(
        `Bed ${bed.bed_number} is occupied by admission ${occupant.admission_code}; ` +
          'discharge or transfer the patient before changing its status'
      );
    }
    if (!occupant && changes.status === BED_STATUS.OCCUPIED) {
      throw ApiError.badRequest(
        `Bed ${bed.bed_number} cannot be marked occupied without an active admission; ` +
          'admit a patient to it instead'
      );
    }
  }

  await repository.updateBed(bed, changes);
  return (await repository.findBedById(id)).toJSON();
};

const removeBed = async (id) => {
  const bed = await repository.findBedById(id);
  if (!bed) throw ApiError.notFound('Bed not found');
  // BUG-027/BUG-028 - the old check trusted bed.status alone, so a bed whose
  // status had drifted could be deleted from under a patient. The authoritative
  // test is whether an admission still holds it.
  const occupant = await ipdRepository.findActiveByBed(bed.id);
  if (occupant) {
    throw ApiError.conflict(
      `Cannot delete bed ${bed.bed_number}: admission ${occupant.admission_code} is still active`
    );
  }
  if (bed.status === BED_STATUS.OCCUPIED) {
    throw ApiError.badRequest('Cannot delete an occupied bed');
  }
  await repository.destroyBed(bed);
  return { message: 'Bed deleted' };
};

const { MasterOption } = require('../../models');

const getBedSummary = async () => {
  const rows = await repository.countBedsByStatus();
  const total = rows.reduce((sum, r) => sum + Number(r.count), 0);
  return {
    total,
    by_status: rows.reduce((acc, r) => ({ ...acc, [r.status]: Number(r.count) }), {}),
  };
};

/* ---------- Master Options: Buildings, Floors, Rooms, Types ---------- */

const listBuildings = async () => {
  let options = await MasterOption.findAll({ where: { type: 'building', is_active: true }, order: [['sort_order', 'ASC'], ['id', 'ASC']] });
  // BUG-019 — removed seed-on-GET: default building now seeded by migration 008
  const items = options.map((o) => ({ id: o.id, name: o.label }));
  if (items.length === 0) {
    return [{ id: 1, name: 'Main Hospital Building' }];
  }
  return items;
};

const createBuilding = async (data) => {
  const option = await MasterOption.create({
    type: 'building',
    code: `BLD_${Date.now()}`,
    label: String(data.name),
    is_active: true,
  });
  return { id: option.id, name: option.label };
};

const updateBuilding = async (id, data) => {
  const option = await MasterOption.findByPk(id);
  if (!option) throw ApiError.notFound('Building not found');
  await option.update({ label: String(data.name) });
  return { id: option.id, name: option.label };
};

const removeBuilding = async (id) => {
  const option = await MasterOption.findByPk(id);
  if (!option) throw ApiError.notFound('Building not found');
  await option.destroy();
  return { message: 'Building deleted' };
};

const listFloors = async () => {
  let options = await MasterOption.findAll({ where: { type: 'floor', is_active: true }, order: [['sort_order', 'ASC'], ['id', 'ASC']] });

  // BUG-019 — removed seed-on-GET: default floors now seeded by migration 008

  const firstBuilding = (await MasterOption.findOne({ where: { type: 'building', is_active: true } })) || { id: 1 };
  const bId = firstBuilding.id;

  const items = options.map((o) => {
    let parsed = {};
    try { parsed = JSON.parse(o.description || '{}'); } catch (e) {}
    return { id: o.id, floor_no: o.label, building_id: parsed.building_id || bId };
  });

  if (items.length === 0) {
    return [
      { id: 1, floor_no: '1st Floor', building_id: bId },
      { id: 2, floor_no: '2nd Floor', building_id: bId },
      { id: 3, floor_no: '3rd Floor', building_id: bId },
      { id: 4, floor_no: '4th Floor', building_id: bId },
      { id: 5, floor_no: '5th Floor', building_id: bId },
    ];
  }

  return items;
};

const createFloor = async (data) => {
  const option = await MasterOption.create({
    type: 'floor',
    code: `FLR_${Date.now()}`,
    label: String(data.floor_no),
    description: JSON.stringify({ building_id: data.building_id }),
    is_active: true,
  });
  return { id: option.id, floor_no: option.label, building_id: data.building_id };
};

const updateFloor = async (id, data) => {
  const option = await MasterOption.findByPk(id);
  if (!option) throw ApiError.notFound('Floor not found');
  await option.update({
    label: String(data.floor_no),
    description: JSON.stringify({ building_id: data.building_id }),
  });
  return { id: option.id, floor_no: option.label, building_id: data.building_id };
};

const removeFloor = async (id) => {
  const option = await MasterOption.findByPk(id);
  if (!option) throw ApiError.notFound('Floor not found');
  await option.destroy();
  return { message: 'Floor deleted' };
};

const listRooms = async () => {
  const options = await MasterOption.findAll({ where: { type: 'room', is_active: true }, order: [['sort_order', 'ASC'], ['id', 'ASC']] });
  return options.map((o) => {
    let parsed = {};
    try { parsed = JSON.parse(o.description || '{}'); } catch (e) {}
    return {
      id: o.id,
      room_number: o.label,
      ward_id: parsed.ward_id || null,
      room_type: parsed.room_type || '',
      capacity: parsed.capacity || 0,
    };
  });
};

const createRoom = async (data) => {
  const option = await MasterOption.create({
    type: 'room',
    code: `RM_${Date.now()}`,
    label: String(data.room_number),
    description: JSON.stringify({
      ward_id: data.ward_id,
      room_type: data.room_type,
      capacity: data.capacity,
    }),
    is_active: true,
  });
  return {
    id: option.id,
    room_number: option.label,
    ward_id: data.ward_id,
    room_type: data.room_type,
    capacity: data.capacity,
  };
};

const updateRoom = async (id, data) => {
  const option = await MasterOption.findByPk(id);
  if (!option) throw ApiError.notFound('Room not found');
  await option.update({
    label: String(data.room_number),
    description: JSON.stringify({
      ward_id: data.ward_id,
      room_type: data.room_type,
      capacity: data.capacity,
    }),
  });
  return {
    id: option.id,
    room_number: option.label,
    ward_id: data.ward_id,
    room_type: data.room_type,
    capacity: data.capacity,
  };
};

const removeRoom = async (id) => {
  const option = await MasterOption.findByPk(id);
  if (!option) throw ApiError.notFound('Room not found');
  await option.destroy();
  return { message: 'Room deleted' };
};

const listBedTypes = async () => {
  let options = await MasterOption.findAll({ where: { type: 'bed_type', is_active: true }, order: [['sort_order', 'ASC'], ['id', 'ASC']] });

  // BUG-019 — removed seed-on-GET: default bed types now seeded by migration 008

  const items = options.map((o) => {
    let parsed = {};
    try { parsed = JSON.parse(o.description || '{}'); } catch (e) {}
    return {
      id: o.id,
      name: o.label,
      daily_rate: parsed.daily_rate || 0,
    };
  });

  if (items.length === 0) {
    return [
      { id: 1, name: 'General Bed', daily_rate: 500 },
      { id: 2, name: 'VIP Bed', daily_rate: 2500 },
      { id: 3, name: 'ICU Bed', daily_rate: 5000 },
      { id: 4, name: 'CCU Bed', daily_rate: 5000 },
      { id: 5, name: 'Cabin Bed', daily_rate: 3500 },
    ];
  }

  return items;
};

const createBedType = async (data) => {
  const option = await MasterOption.create({
    type: 'bed_type',
    code: `BTYPE_${Date.now()}`,
    label: String(data.name),
    description: JSON.stringify({ daily_rate: data.daily_rate }),
    is_active: true,
  });
  return {
    id: option.id,
    name: option.label,
    daily_rate: data.daily_rate,
  };
};

const updateBedType = async (id, data) => {
  const option = await MasterOption.findByPk(id);
  if (!option) throw ApiError.notFound('Bed type not found');
  await option.update({
    label: String(data.name),
    description: JSON.stringify({ daily_rate: data.daily_rate }),
  });
  return {
    id: option.id,
    name: option.label,
    daily_rate: data.daily_rate,
  };
};

const removeBedType = async (id) => {
  const option = await MasterOption.findByPk(id);
  if (!option) throw ApiError.notFound('Bed type not found');
  await option.destroy();
  return { message: 'Bed type deleted' };
};

module.exports = {
  listWards,
  getWard,
  createWard,
  updateWard,
  removeWard,
  listBeds,
  getBed,
  createBed,
  updateBed,
  removeBed,
  getBedSummary,
  listBuildings,
  createBuilding,
  updateBuilding,
  removeBuilding,
  listFloors,
  createFloor,
  updateFloor,
  removeFloor,
  listRooms,
  createRoom,
  updateRoom,
  removeRoom,
  listBedTypes,
  createBedType,
  updateBedType,
  removeBedType,
};
