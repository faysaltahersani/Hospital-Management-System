'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { audit } = require('../../middlewares/audit.middleware');
const config = require('../../config');
const { ROLES } = require('../../config/constants');
const controller = require('./settings.controller');
const schemas = require('./settings.validation');

const router = Router();

router.get('/public', controller.listPublicSettings);

router.use(authenticate);
router.use(authorize(ROLES.ADMIN));

router.get('/company-profile', controller.getCompanyProfile);
router.put('/company-profile', controller.updateCompanyProfile);
router.get('/backup/meta', controller.getBackupMeta);
router.get('/backup/download', controller.downloadBackup);
// BUG-015 — the restore endpoint now accepts the .sql artefact the export
// produces (text/plain), as well as a JSON envelope.
router.post(
  '/backup/restore',
  require('express').text({ type: ['text/plain', 'application/sql'], limit: config.jsonBodyLimit }),
  controller.restoreBackup
);
router.post('/import-data', controller.importData);

router.get('/master-options', validate(schemas.listOptions), controller.listOptions);
router.get('/master-options/:id', validate(schemas.getOption), controller.getOption);
router.post('/master-options', validate(schemas.createOption), audit('create', 'master_option'), controller.createOption);
router.patch('/master-options/:id', validate(schemas.updateOption), audit('update', 'master_option'), controller.updateOption);
router.delete('/master-options/:id', validate(schemas.removeOption), audit('delete', 'master_option'), controller.removeOption);

router.get('/', validate(schemas.listSettings), controller.listSettings);
router.get('/:id', validate(schemas.getSetting), controller.getSetting);
router.post('/', validate(schemas.createSetting), audit('create', 'setting'), controller.createSetting);
router.patch('/:id', validate(schemas.updateSetting), audit('update', 'setting'), controller.updateSetting);
router.delete('/:id', validate(schemas.removeSetting), audit('delete', 'setting'), controller.removeSetting);

module.exports = router;
