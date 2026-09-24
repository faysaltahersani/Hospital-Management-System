'use strict';

const ApiError = require('../../utils/ApiError');
const { parsePaging, buildMeta } = require('../../utils/pagination');
const { generateAppointmentCode } = require('../../utils/codeGenerator');
const { currentYear } = require('../../utils/dateUtils');
const { withCodeRetry } = require('../../utils/sequence');
const { allocateForYear, allocate } = require('../../utils/codeSequence');
const { APPOINTMENT_STATUS } = require('../../config/constants');
const { Patient, Doctor } = require('../../models');
const repository = require('./appointments.repository');

const ALLOWED_TRANSITIONS = {
  [APPOINTMENT_STATUS.SCHEDULED]: [
    APPOINTMENT_STATUS.CONFIRMED,
    APPOINTMENT_STATUS.CANCELLED,
    APPOINTMENT_STATUS.NO_SHOW,
  ],
  [APPOINTMENT_STATUS.CONFIRMED]: [
    APPOINTMENT_STATUS.IN_PROGRESS,
    APPOINTMENT_STATUS.CANCELLED,
    APPOINTMENT_STATUS.NO_SHOW,
  ],
  [APPOINTMENT_STATUS.IN_PROGRESS]: [APPOINTMENT_STATUS.COMPLETED],
  [APPOINTMENT_STATUS.COMPLETED]: [],
  [APPOINTMENT_STATUS.CANCELLED]: [],
  [APPOINTMENT_STATUS.NO_SHOW]: [],
};

const list = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.patient_id) filters.patient_id = query.patient_id;
  if (query.doctor_id) filters.doctor_id = query.doctor_id;
  if (query.department_id) filters.department_id = query.department_id;
  if (query.status) filters.status = query.status;

  const { rows, count } = await repository.findAndCount({
    filters,
    dateRange: query,
    search: query.search,
    limit,
    offset,
  });
  return {
    items: rows.map((a) => a.toJSON()),
    meta: buildMeta({ total: count, page, limit }),
  };
};

const getById = async (id) => {
  const appt = await repository.findById(id);
  if (!appt) throw ApiError.notFound('Appointment not found');
  return appt.toJSON();
};

const create = async (input, currentUserId) => {
  const patient = await Patient.findByPk(input.patient_id);
  if (!patient) throw ApiError.badRequest('Patient not found');

  const doctor = await Doctor.findByPk(input.doctor_id);
  if (!doctor) throw ApiError.badRequest('Doctor not found');
  if (!doctor.is_available) throw ApiError.badRequest('Doctor is not available');

  const conflict = await repository.findConflict({
    doctor_id: input.doctor_id,
    appointment_date: input.appointment_date,
    appointment_time: input.appointment_time,
  });
  if (conflict) {
    throw ApiError.conflict('Doctor already has an appointment at this time');
  }

  const year = currentYear();
  const appt = await withCodeRetry(async () => {
    const sequence = await allocateForYear('appointment', year);
    const appointment_code = generateAppointmentCode(year, sequence);
    return repository.create({
      appointment_code,
      patient_id: input.patient_id,
      doctor_id: input.doctor_id,
      department_id: doctor.department_id,
      appointment_date: input.appointment_date,
      appointment_time: input.appointment_time,
      reason: input.reason || null,
      notes: input.notes || null,
      consultation_fee:
        input.consultation_fee !== undefined ? input.consultation_fee : doctor.consultation_fee,
      status: APPOINTMENT_STATUS.SCHEDULED,
      created_by: currentUserId || null,
    });
  });

  return (await repository.findById(appt.id)).toJSON();
};

const update = async (id, changes) => {
  const appt = await repository.findById(id);
  if (!appt) throw ApiError.notFound('Appointment not found');

  if (
    [APPOINTMENT_STATUS.COMPLETED, APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.NO_SHOW].includes(
      appt.status
    )
  ) {
    throw ApiError.badRequest(`Cannot edit appointment in "${appt.status}" status`);
  }

  if (changes.appointment_date || changes.appointment_time) {
    const conflict = await repository.findConflict({
      doctor_id: appt.doctor_id,
      appointment_date: changes.appointment_date || appt.appointment_date,
      appointment_time: changes.appointment_time || appt.appointment_time,
      excludeId: appt.id,
    });
    if (conflict) {
      throw ApiError.conflict('Doctor already has an appointment at this time');
    }
  }

  await repository.update(appt, changes);
  return (await repository.findById(id)).toJSON();
};

const updateStatus = async (id, status) => {
  const appt = await repository.findById(id);
  if (!appt) throw ApiError.notFound('Appointment not found');

  const allowed = ALLOWED_TRANSITIONS[appt.status] || [];
  if (!allowed.includes(status)) {
    throw ApiError.badRequest(
      `Cannot transition from "${appt.status}" to "${status}"`
    );
  }

  await repository.update(appt, { status });
  return (await repository.findById(id)).toJSON();
};

const remove = async (id) => {
  const appt = await repository.findById(id);
  if (!appt) throw ApiError.notFound('Appointment not found');
  await repository.destroy(appt);
  return { message: 'Appointment deleted' };
};

const getWeekdayName = (dateStr) => {
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const d = new Date(dateStr + 'T00:00:00');
  return days[d.getDay()];
};

const getSlotConfigMeta = async () => {
  const { Doctor, MasterOption } = require('../../models');
  const doctors = await Doctor.findAll({ include: ['user'] });
  const shifts = await MasterOption.findAll({ where: { type: 'appointment_shift', is_active: true } });
  const chargeCategories = await MasterOption.findAll({ where: { type: 'appointment_charge', is_active: true } });
  return {
    doctors: doctors.map((d) => d.toJSON()),
    shifts: shifts.map((s) => s.toJSON()),
    charge_categories: chargeCategories.map((c) => c.toJSON()),
    weekdays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
  };
};

const getSlotConfig = async (query) => {
  const { doctor_id, shift_id } = query;
  if (!doctor_id || !shift_id) return {};
  const { Setting } = require('../../models');
  const key = `doctor_${doctor_id}_shift_${shift_id}`;
  const setting = await Setting.findOne({ where: { group_name: 'slot_config', key } });
  if (!setting || !setting.value) return {};
  try {
    const data = JSON.parse(setting.value);
    return { id: setting.id, ...data };
  } catch (_e) {
    return {};
  }
};

const generateSlots = async (input) => {
  const weekdays = {};
  let start = '09:00';
  let end = '13:00';

  if (input?.shift_id) {
    const { MasterOption } = require('../../models');
    const shiftOpt = await MasterOption.findByPk(input.shift_id);
    if (shiftOpt) {
      try {
        const desc = JSON.parse(shiftOpt.description || '{}');
        if (desc.time_from) start = desc.time_from;
        if (desc.time_to) end = desc.time_to;
      } catch (_e) {
        const labelLower = String(shiftOpt.label || '').toLowerCase();
        if (labelLower.includes('evening') || labelLower.includes('2nd')) {
          start = '16:00';
          end = '20:00';
        } else if (labelLower.includes('night')) {
          start = '20:00';
          end = '23:30';
        }
      }
    }
  }

  (input?.weekdays || []).forEach(day => {
    weekdays[day] = [
      { from: start, to: end }
    ];
  });
  return { weekdays };
};

const minutesFromTime = (time) => {
  const [hours, minutes] = String(time).split(':').map(Number);
  return hours * 60 + minutes;
};

const timeFromMinutes = (total) => {
  const hours = String(Math.floor(total / 60)).padStart(2, '0');
  const minutes = String(total % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const getAvailableSlots = async (query) => {
  const doctorId = query.doctor_id;
  const shiftId = query.shift_id;
  const date = query.date;

  if (!doctorId || !date) {
    return { slots: [] };
  }

  const doctor = await Doctor.findByPk(doctorId);
  if (!doctor) {
    throw ApiError.notFound('Doctor not found');
  }

  const { Setting, MasterOption } = require('../../models');

  let timeRanges = [];
  let slotMinutes = 15;

  if (doctorId && shiftId) {
    const key = `doctor_${doctorId}_shift_${shiftId}`;
    const setting = await Setting.findOne({ where: { group_name: 'slot_config', key } });
    if (setting && setting.value) {
      try {
        const config = JSON.parse(setting.value);
        if (config.duration_minutes) {
          slotMinutes = Number(config.duration_minutes) || 15;
        }
        const weekday = getWeekdayName(date);
        if (config.weekdays && Array.isArray(config.weekdays[weekday]) && config.weekdays[weekday].length > 0) {
          timeRanges = config.weekdays[weekday];
        }
      } catch (_e) {
        // parse error fallback
      }
    }
  }

  if (timeRanges.length === 0) {
    let startTime = '09:00';
    let endTime = '17:00';

    if (shiftId) {
      const shiftOpt = await MasterOption.findByPk(shiftId);
      if (shiftOpt) {
        try {
          const desc = JSON.parse(shiftOpt.description || '{}');
          if (desc.time_from && desc.time_to) {
            startTime = desc.time_from;
            endTime = desc.time_to;
          }
        } catch (_e) {
          const labelLower = String(shiftOpt.label || '').toLowerCase();
          if (labelLower.includes('1st') || labelLower.includes('morning')) {
            startTime = '09:00';
            endTime = '13:00';
          } else if (labelLower.includes('2nd') || labelLower.includes('evening')) {
            startTime = '16:00';
            endTime = '20:00';
          } else if (labelLower.includes('night')) {
            startTime = '20:00';
            endTime = '23:30';
          }
        }
      }
    }

    timeRanges = [{ from: startTime, to: endTime }];
  }

  const blockingStatuses = [
    APPOINTMENT_STATUS.SCHEDULED,
    APPOINTMENT_STATUS.CONFIRMED,
    APPOINTMENT_STATUS.IN_PROGRESS,
  ];

  const appointments = await repository.findAppointmentsForDate({
    doctorId,
    date,
    statuses: blockingStatuses,
  });

  const bookedTimes = new Set(
    appointments.map((appointment) => String(appointment.appointment_time).slice(0, 5))
  );

  const slots = [];
  const seenTimes = new Set();

  for (const range of timeRanges) {
    if (!range || !range.from || !range.to) continue;
    let start = minutesFromTime(range.from);
    let end = minutesFromTime(range.to);
    if (end <= start) {
      end = start + 240;
    }

    for (let cursor = start; cursor < end; cursor += slotMinutes) {
      const time24 = timeFromMinutes(cursor);
      if (seenTimes.has(time24)) continue;
      seenTimes.add(time24);

      const [hoursStr, minsStr] = time24.split(':');
      let hours = parseInt(hoursStr, 10);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours % 12 || 12;
      const label = `${String(hours12).padStart(2, '0')}:${minsStr} ${ampm}`;

      slots.push({
        time: time24,
        label,
        is_available: !bookedTimes.has(time24),
      });
    }
  }

  return { slots };
};

const saveSlotConfig = async (input) => {
  const { doctor_id, shift_id } = input;
  if (!doctor_id || !shift_id) throw ApiError.badRequest('Doctor and shift are required');
  const { Setting } = require('../../models');
  const key = `doctor_${doctor_id}_shift_${shift_id}`;

  let setting = await Setting.findOne({ where: { group_name: 'slot_config', key } });
  const jsonVal = JSON.stringify(input);

  if (setting) {
    await setting.update({ value: jsonVal });
  } else {
    setting = await Setting.create({
      group_name: 'slot_config',
      key,
      value: jsonVal,
      data_type: 'json',
      description: `Slot config for doctor ${doctor_id} shift ${shift_id}`,
    });
  }

  return { id: setting.id, ...input };
};

module.exports = {
  list,
  getById,
  create,
  update,
  updateStatus,
  remove,
  getAvailableSlots,
  getSlotConfigMeta,
  getSlotConfig,
  generateSlots,
  saveSlotConfig,
};
