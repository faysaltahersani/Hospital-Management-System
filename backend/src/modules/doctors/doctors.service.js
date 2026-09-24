const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../../config');
const ApiError = require('../../utils/ApiError');
const { parsePaging, buildMeta } = require('../../utils/pagination');
const { generateDoctorCode } = require('../../utils/codeGenerator');
const { currentYear } = require('../../utils/dateUtils');
const { withCodeRetry } = require('../../utils/sequence');
const { allocateForYear, allocate } = require('../../utils/codeSequence');
const { APPOINTMENT_STATUS, ROLES } = require('../../config/constants');
const { User, Department } = require('../../models');
const repository = require('./doctors.repository');

const list = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.department_id) filters.department_id = query.department_id;
  if (query.is_available !== undefined) filters.is_available = query.is_available;

  const { rows, count } = await repository.findAndCount({
    filters,
    dateRange: query,
    search: query.search,
    limit,
    offset,
  });
  return {
    items: rows.map((d) => d.toJSON()),
    meta: buildMeta({ total: count, page, limit }),
  };
};

const getById = async (id) => {
  const doctor = await repository.findById(id);
  if (!doctor) throw ApiError.notFound('Doctor not found');
  return doctor.toJSON();
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

const availableSlots = async (id, query) => {
  const doctor = await repository.findById(id);
  if (!doctor) throw ApiError.notFound('Doctor not found');

  const start = minutesFromTime(query.start_time || '09:00');
  const end = minutesFromTime(query.end_time || '17:00');
  const slotMinutes = Number(query.slot_minutes || 30);
  if (end <= start) throw ApiError.badRequest('end_time must be after start_time');

  const blockingStatuses = [
    APPOINTMENT_STATUS.SCHEDULED,
    APPOINTMENT_STATUS.CONFIRMED,
    APPOINTMENT_STATUS.IN_PROGRESS,
  ];
  const appointments = await repository.findAppointmentsForDate({
    doctorId: id,
    date: query.date,
    statuses: blockingStatuses,
  });
  const bookedTimes = new Set(
    appointments.map((appointment) => String(appointment.appointment_time).slice(0, 5))
  );

  const slots = [];
  for (let cursor = start; cursor + slotMinutes <= end; cursor += slotMinutes) {
    const time = timeFromMinutes(cursor);
    slots.push({
      time,
      is_available: Boolean(doctor.is_available) && !bookedTimes.has(time),
    });
  }

  return {
    doctor: doctor.toJSON(),
    date: query.date,
    start_time: timeFromMinutes(start),
    end_time: timeFromMinutes(end),
    slot_minutes: slotMinutes,
    booked: appointments.map((appointment) => appointment.toJSON()),
    slots,
  };
};

const create = async (input) => {
  let userId = input.user_id;

  if (userId) {
    const user = await User.findByPk(userId);
    if (!user) throw ApiError.badRequest('Linked user not found');
    if (user.role !== ROLES.DOCTOR) {
      throw ApiError.badRequest('Linked user must have role "doctor"');
    }
  } else {
    let email = input.email ? input.email.trim().toLowerCase() : null;
    if (email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        userId = existingUser.id;
      }
    }

    if (!userId) {
      // BUG-002 — every doctor auto-provisioned here used to receive the
      // hardcoded password 'Doctor@12345'. The account is now created with a
      // cryptographically random password that nobody holds, is flagged
      // `must_change_password`, and is left inactive until a login credential is
      // issued deliberately through the user-management flow. An email is
      // required so a credential can actually be delivered.
      if (!email) {
        throw ApiError.badRequest(
          'An email address is required to create a login for this doctor, ' +
            'or link an existing user via user_id.'
        );
      }
      const provisionalPassword = crypto.randomBytes(32).toString('base64url');
      const newUser = await User.create({
        full_name: input.full_name || 'Doctor',
        email,
        phone: input.phone || null,
        role: ROLES.DOCTOR,
        password_hash: await bcrypt.hash(provisionalPassword, config.security.bcryptSaltRounds),
        must_change_password: true,
        is_active: false,
      });
      userId = newUser.id;
    }
  }

  const existing = await repository.findByUserId(userId);
  if (existing) throw ApiError.conflict('Doctor profile already exists for this user');

  const department = await Department.findByPk(input.department_id);
  if (!department) throw ApiError.badRequest('Department not found');

  const year = currentYear();
  const doctor = await withCodeRetry(async () => {
    const sequence = await allocateForYear('doctor', year);
    const doctor_code = generateDoctorCode(year, sequence);
    return repository.create({
      ...input,
      user_id: userId,
      doctor_code,
    });
  });
  return (await repository.findById(doctor.id)).toJSON();
};

const update = async (id, changes) => {
  const doctor = await repository.findById(id);
  if (!doctor) throw ApiError.notFound('Doctor not found');

  if (changes.department_id) {
    const dept = await Department.findByPk(changes.department_id);
    if (!dept) throw ApiError.badRequest('Department not found');
  }

  if (doctor.user && (changes.full_name || changes.email || changes.phone || changes.gender || changes.blood_group)) {
    const userUpdates = {};
    if (changes.full_name) userUpdates.full_name = changes.full_name;
    if (changes.email) userUpdates.email = changes.email.trim().toLowerCase();
    if (changes.phone !== undefined) userUpdates.phone = changes.phone;
    if (changes.gender !== undefined) userUpdates.gender = changes.gender;
    if (changes.blood_group !== undefined) userUpdates.blood_group = changes.blood_group;

    await doctor.user.update(userUpdates);
  }

  await repository.update(doctor, changes);
  return (await repository.findById(id)).toJSON();
};

const remove = async (id) => {
  const doctor = await repository.findById(id);
  if (!doctor) throw ApiError.notFound('Doctor not found');

  // BUG-028 - refuse while the doctor still has live clinical work attached.
  const { Appointment, Admission, OpdVisit } = require('../../models');
  const { Op } = require('sequelize');
  const [appts, admissions, visits] = await Promise.all([
    Appointment.count({ where: { doctor_id: id, status: { [Op.in]: ['scheduled', 'confirmed', 'in_progress'] } } }),
    Admission.count({ where: { doctor_id: id, status: 'admitted' } }),
    OpdVisit.count({ where: { doctor_id: id, status: 'in_consultation' } }),
  ]);
  const blocking = [];
  if (appts) blocking.push(`${appts} open appointment(s)`);
  if (admissions) blocking.push(`${admissions} active admission(s)`);
  if (visits) blocking.push(`${visits} open OPD visit(s)`);
  if (blocking.length) {
    throw ApiError.conflict(
      `Cannot delete doctor ${doctor.doctor_code}: ${blocking.join(', ')} still assigned. ` +
        'Reassign or close them first, or deactivate the doctor instead.'
    );
  }

  await repository.destroy(doctor);
  return { message: 'Doctor deleted' };
};

module.exports = { list, getById, availableSlots, create, update, remove };
