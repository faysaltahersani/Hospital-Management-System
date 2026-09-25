'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  sequelize,
  User,
  Patient,
  PatientAllergy,
  PatientProblem,
  PatientHistory,
  VitalSign,
  ClinicalNote,
} = require('../src/models');
const { hashPassword } = require('../src/utils/password');
const service = require('../src/modules/emr/emr.service');

const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
let user;
let patient;
let finalNote;

test.before(async () => {
  await sequelize.authenticate();
  user = await User.create({
    email: `qa.emr.${suffix}@hms.test`,
    password_hash: await hashPassword('QaEmr#2026'),
    full_name: 'QA EMR Clinician',
    role: 'doctor',
    is_active: true,
  });
  patient = await Patient.create({
    patient_code: `QA-EMR-${suffix}`.slice(0, 30),
    full_name: 'QA EMR Patient',
    gender: 'male',
    blood_group: 'O+',
    created_by: user.id,
  });
});

test.after(async () => {
  for (const Model of [ClinicalNote, VitalSign, PatientHistory, PatientProblem, PatientAllergy]) {
    await Model.destroy({ where: { patient_id: patient.id }, force: true });
  }
  await Patient.destroy({ where: { id: patient.id }, force: true });
  await User.destroy({ where: { id: user.id }, force: true });
  await sequelize.close();
});

test('central EMR stores allergies, problems, history, vitals and notes under one patient', async () => {
  await service.create(patient.id, 'allergies', { allergen: 'Penicillin', severity: 'severe', reaction: 'Rash' }, user.id);
  await service.create(patient.id, 'problems', { title: 'Hypertension', problem_type: 'chronic_disease' }, user.id);
  await service.create(patient.id, 'histories', { category: 'surgical', title: 'Appendectomy', occurred_on: '2020-01-15' }, user.id);
  const vital = await service.create(patient.id, 'vitals', { height_cm: 180, weight_kg: 81, pulse_bpm: 72 }, user.id);
  finalNote = await service.create(patient.id, 'notes', { note_type: 'doctor', title: 'Assessment', content: 'Stable', status: 'draft' }, user.id);

  assert.equal(Number(vital.bmi), 25);
  const summary = await service.summary(patient.id);
  assert.equal(summary.patient.id, patient.id);
  assert.equal(summary.allergies[0].allergen, 'Penicillin');
  assert.equal(summary.problems[0].title, 'Hypertension');
  assert.equal(summary.histories[0].title, 'Appendectomy');
  assert.equal(summary.vitals[0].pulse_bpm, 72);
  assert.equal(summary.notes[0].author.id, user.id);
});

test('final clinical notes are immutable and cannot be deleted', async () => {
  finalNote = await service.update('notes', finalNote.id, { status: 'final' }, user.id);
  assert.equal(finalNote.status, 'final');
  assert.ok(finalNote.finalized_at);

  await assert.rejects(
    () => service.update('notes', finalNote.id, { content: 'Changed after finalization' }, user.id),
    (error) => error.statusCode === 409 && /immutable/i.test(error.message)
  );
  await assert.rejects(
    () => service.remove('notes', finalNote.id),
    (error) => error.statusCode === 409 && /cannot be deleted/i.test(error.message)
  );
});

test('a vital entry must contain a real measurement', async () => {
  await assert.rejects(
    () => service.create(patient.id, 'vitals', { notes: 'No measurement supplied' }, user.id),
    (error) => error.statusCode === 400 && /vital measurement/i.test(error.message)
  );
});

