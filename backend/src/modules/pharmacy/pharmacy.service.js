'use strict';

const ApiError = require('../../utils/ApiError');
const { parsePaging, buildMeta } = require('../../utils/pagination');
const { generateMedicineSaleCode } = require('../../utils/codeGenerator');
const { currentYear } = require('../../utils/dateUtils');
const { withCodeRetry } = require('../../utils/sequence');
const { allocateForYear, allocate } = require('../../utils/codeSequence');
const money = require('../../utils/money');
const { SALE_STATUS } = require('../../config/constants');
// BUG-007 — `listSalesReturns` referenced MedicineSale, User and saleIncludes
// without importing them, so GET /pharmacy/sales-returns threw a ReferenceError
// (HTTP 500) as soon as any return carried a sale_id or doctor_id.
const { sequelize, Patient, Prescription, Medicine, Doctor, MedicineSale, User } = require('../../models');
const { MasterOption } = require('../../models');
const repository = require('./pharmacy.repository');
const { consumeFefo, returnToBatch, receiveIntoBatch, availableBatches, onHand } = require('../../utils/batchStock');
const { saleIncludes } = require('./pharmacy.repository');

// BUG-054 - exact 2dp normalisation instead of a raw float cast.
const toMoney = (value) => money.toMajor(money.toMinor(value));

const parseJsonDescription = (desc) => {
  if (!desc) return {};
  if (typeof desc === 'object') return desc;
  try {
    return JSON.parse(desc);
  } catch (err) {
    return {};
  }
};

const listMedicines = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.category) filters.category = query.category;
  if (query.is_active !== undefined) filters.is_active = query.is_active;

  const { rows, count } = await repository.findAndCountMedicines({
    filters,
    company: query.company,
    groupName: query.group_name,
    search: query.search,
    unit: query.unit,
    limit,
    offset,
  });
  return {
    items: rows.map((m) => {
      const json = m.toJSON();
      return {
        ...json,
        group_name: json.group_name || json.group || json.generic_name || 'N/A',
        company: json.company || json.manufacturer || 'N/A',
        created_by: json.created_by || json.creator?.full_name || 'Admin',
        updated_by: json.updated_by || json.updater?.full_name || 'N/A',
      };
    }),
    meta: buildMeta({ total: count, page, limit }),
  };
};

const getMedicine = async (id) => {
  const medicine = await repository.findMedicineById(id);
  if (!medicine) throw ApiError.notFound('Medicine not found');
  return medicine.toJSON();
};

const createMedicine = async (input) => {
  const exists = await repository.findMedicineByCode(input.code);
  if (exists) throw ApiError.conflict('Medicine code already exists');
  const medicine = await repository.createMedicine(input);
  return medicine.toJSON();
};

const updateMedicine = async (id, changes) => {
  const medicine = await repository.findMedicineById(id);
  if (!medicine) throw ApiError.notFound('Medicine not found');
  if (changes.code && changes.code !== medicine.code) {
    const exists = await repository.findMedicineByCode(changes.code);
    if (exists) throw ApiError.conflict('Medicine code already exists');
  }
  await repository.updateMedicine(medicine, changes);
  return medicine.toJSON();
};

const adjustMedicineStock = async (id, input) =>
  sequelize.transaction(async (t) => {
    const medicine = await repository.findMedicineById(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!medicine) throw ApiError.notFound('Medicine not found');

    const currentStock = Number(medicine.stock_quantity);
    const quantity = Number(input.quantity);
    let nextStock = currentStock;

    if (input.adjustment_type === 'add') nextStock = currentStock + quantity;
    if (input.adjustment_type === 'remove') nextStock = currentStock - quantity;
    if (input.adjustment_type === 'set') nextStock = quantity;

    if (nextStock < 0) throw ApiError.badRequest('Stock quantity cannot be negative');

    await repository.updateMedicine(medicine, { stock_quantity: nextStock }, { transaction: t });

    return {
      medicine: medicine.toJSON(),
      adjustment: {
        adjustment_type: input.adjustment_type,
        quantity,
        previous_stock: currentStock,
        new_stock: nextStock,
        reason: input.reason || null,
        adjusted_at: new Date().toISOString(),
      },
    };
  });

const removeMedicine = async (id) => {
  const medicine = await repository.findMedicineById(id);
  if (!medicine) throw ApiError.notFound('Medicine not found');

  // BUG-028 - a medicine holding stock, or referenced by a sale, must not vanish.
  const { MedicineBatch, MedicineSaleItem } = require('../../models');
  const onHandQty = await onHand({ MedicineBatch, medicineId: id });
  const soldCount = await MedicineSaleItem.count({ where: { medicine_id: id } });
  if (onHandQty > 0 || soldCount > 0) {
    const parts = [];
    if (onHandQty > 0) parts.push(`${onHandQty} unit(s) still in stock`);
    if (soldCount > 0) parts.push(`${soldCount} sale line(s) reference it`);
    throw ApiError.conflict(
      `Cannot delete ${medicine.name}: ${parts.join(' and ')}. Deactivate it instead to stop new dispensing.`
    );
  }

  await repository.destroyMedicine(medicine);
  return { message: 'Medicine deleted' };
};

const listSales = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.patient_id) filters.patient_id = query.patient_id;
  if (query.prescription_id) filters.prescription_id = query.prescription_id;
  if (query.status) filters.status = query.status;
  if (query.medicine_id) filters['$items.medicine_id$'] = query.medicine_id;

  const { rows, count } = await repository.findAndCountSales({
    filters,
    dateRange: query,
    search: query.search,
    limit,
    offset,
  });
  return { items: rows.map((s) => s.toJSON()), meta: buildMeta({ total: count, page, limit }) };
};

const getSale = async (id) => {
  const sale = await repository.findSaleById(id);
  if (!sale) throw ApiError.notFound('Medicine sale not found');
  return sale.toJSON();
};

const createSale = async (input, currentUserId) =>
  // Sale codes are derived from a non-atomic count-based sequence; retry on
  // unique-constraint collisions so concurrent cashiers are not served a 409.
  withCodeRetry(async () =>
    sequelize.transaction(async (t) => {
      if (input.patient_id) {
        const patient = await Patient.findByPk(input.patient_id, { transaction: t });
        if (!patient) throw ApiError.badRequest('Patient not found');
      }
      if (input.prescription_id) {
        const prescription = await Prescription.findByPk(input.prescription_id, { transaction: t });
        if (!prescription) throw ApiError.badRequest('Prescription not found');
      }

      // BUG-025 — the same medicine listed twice used to be validated twice
      // against the ORIGINAL stock (so 2x8 units passed a stock of 10), and the
      // second deduction overwrote the first from a stale instance, leaving
      // stock wrong as well as oversold. Lines are merged per medicine first so
      // the stock check sees the true total. Distinct unit prices are kept as
      // separate sale lines; only the quantity check and deduction are pooled.
      const requestedByMedicine = new Map();
      for (const item of input.items) {
        const key = String(item.medicine_id);
        requestedByMedicine.set(key, (requestedByMedicine.get(key) || 0) + Number(item.quantity));
      }

      let subtotal = 0;
      const saleItems = [];
      const checkedMedicines = new Map();
      for (const item of input.items) {
        // eslint-disable-next-line no-await-in-loop
        const medicine = await repository.findMedicineById(item.medicine_id, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (!medicine) throw ApiError.badRequest(`Medicine not found: ${item.medicine_id}`);
        if (!medicine.is_active) throw ApiError.badRequest(`${medicine.name} is inactive`);

        // BUG-012 — availability is the sum of non-expired batch stock, not the
        // cached medicines.stock_quantity counter (which could drift).
        const totalRequested = requestedByMedicine.get(String(item.medicine_id));
        {
          const { MedicineBatch } = require('../../models');
          const batches = await availableBatches(MedicineBatch, medicine.id, { transaction: t });
          const usable = batches.reduce((sum, b) => sum + (Number(b.quantity_in) - Number(b.quantity_out)), 0);
          if (usable < totalRequested) {
            throw ApiError.conflict(
              `Not enough non-expired stock for ${medicine.name}: ${totalRequested} requested, ${usable} available`
            );
          }
        }
        checkedMedicines.set(String(medicine.id), medicine);

        const unitPrice = item.unit_price !== undefined ? toMoney(item.unit_price) : toMoney(medicine.sale_price);
        // BUG-054 - line total and running subtotal on integer minor units.
        const totalPrice = money.mulQty(unitPrice, item.quantity);
        subtotal = money.add(subtotal, totalPrice);
        saleItems.push({
          medicine,
          row: {
            medicine_id: medicine.id,
            quantity: item.quantity,
            unit_price: unitPrice,
            total_price: totalPrice,
          },
        });
      }

      const discount = toMoney(input.discount);
      // A discount larger than the goods sold used to be absorbed silently by
      // `Math.max(subtotal - discount, 0)`, producing a zero-value sale with no
      // record that anything was wrong. Every other revenue stream refuses this
      // (see utils/encounterBilling resolveTotals and the OPD bill path); the
      // pharmacy now does too.
      if (money.gt(discount, subtotal)) {
        throw ApiError.badRequest(
          `Discount (${money.format(discount)}) cannot exceed the sale subtotal (${money.format(subtotal)})`
        );
      }
      const total = money.sub(subtotal, discount);
      const year = currentYear();
      const sequence = await allocateForYear('medicine_sale', year, { transaction: t });
      const sale_code = generateMedicineSaleCode(year, sequence);

      const sale = await repository.createSale(
        {
          sale_code,
          patient_id: input.patient_id || null,
          prescription_id: input.prescription_id || null,
          sold_at: input.sold_at || new Date(),
          subtotal,
          discount,
          total,
          payment_method: input.payment_method,
          status: SALE_STATUS.COMPLETED,
          sold_by: currentUserId || null,
          notes: input.notes || null,
        },
        { transaction: t }
      );

      await repository.createSaleItems(
        saleItems.map(({ row }) => ({ ...row, sale_id: sale.id })),
        { transaction: t }
      );

      // BUG-012 / BUG-026 — stock now moves through real batches, consumed
      // First-Expiry-First-Out. Expired batches are excluded, so a shortfall is
      // reported rather than expired units being dispensed. medicines
      // .stock_quantity is kept in step as a derived cache of the batch total.
      const { MedicineBatch } = require('../../models');
      const allocationsByMedicine = new Map();
      for (const [medicineId, totalRequested] of requestedByMedicine) {
        const medicine = checkedMedicines.get(medicineId);
        // eslint-disable-next-line no-await-in-loop
        const allocations = await consumeFefo({
          MedicineBatch,
          medicineId: medicine.id,
          medicineName: medicine.name,
          quantity: totalRequested,
          transaction: t,
        });
        allocationsByMedicine.set(medicineId, allocations);
        // eslint-disable-next-line no-await-in-loop
        const remaining = await onHand({ MedicineBatch, medicineId: medicine.id, transaction: t });
        // eslint-disable-next-line no-await-in-loop
        await repository.updateMedicine(medicine, { stock_quantity: remaining }, { transaction: t });
      }

      // Record which batch each dispensed unit came from, so a return goes back
      // to the batch it left rather than inflating an arbitrary one.
      const { MedicineSaleItem } = require('../../models');
      const persistedItems = await MedicineSaleItem.findAll({
        where: { sale_id: sale.id },
        transaction: t,
      });
      for (const persisted of persistedItems) {
        const allocations = allocationsByMedicine.get(String(persisted.medicine_id)) || [];
        let toRecord = Number(persisted.quantity);
        for (const alloc of allocations) {
          if (toRecord <= 0) break;
          if (alloc.remaining === undefined) alloc.remaining = alloc.quantity;
          if (alloc.remaining <= 0) continue;
          const take = Math.min(alloc.remaining, toRecord);
          // eslint-disable-next-line no-await-in-loop
          await sequelize.query(
            'INSERT INTO medicine_sale_item_batches (sale_item_id, batch_id, quantity, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
            { replacements: [persisted.id, alloc.batch_id, take], transaction: t }
          );
          alloc.remaining -= take;
          toRecord -= take;
        }
      }

      return (await repository.findSaleById(sale.id, { transaction: t })).toJSON();
    })
  );

const isStockReleasing = (status) =>
  status === SALE_STATUS.REFUNDED || status === SALE_STATUS.CANCELLED;

const updateSaleStatus = async (id, status) =>
  // Switching a sale into REFUNDED/CANCELLED must put the dispensed units back
  // into stock; otherwise inventory drifts every time a sale is reversed.
  // The reverse transition is intentionally not supported: re-completing a
  // refunded sale would require re-checking stock and is out of scope.
  sequelize.transaction(async (t) => {
    // We lock the sale row separately from loading its items because some
    // dialect/Sequelize combinations reject SELECT ... FOR UPDATE with joins.
    const sale = await repository.findSaleRowById(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!sale) throw ApiError.notFound('Medicine sale not found');
    if (sale.status === status) {
      return (await repository.findSaleById(id, { transaction: t })).toJSON();
    }

    if (sale.status === SALE_STATUS.COMPLETED && isStockReleasing(status)) {
      // BUG-026 — units go back to the exact batches they were dispensed from.
      const { MedicineBatch } = require('../../models');
      const items = await repository.findSaleItems(id, { transaction: t });
      for (const item of items) {
        // eslint-disable-next-line no-await-in-loop
        const [links] = await sequelize.query(
          'SELECT batch_id, quantity FROM medicine_sale_item_batches WHERE sale_item_id = ?',
          { replacements: [item.id], transaction: t }
        );
        for (const link of links) {
          // eslint-disable-next-line no-await-in-loop
          await returnToBatch({
            MedicineBatch,
            batchId: link.batch_id,
            quantity: link.quantity,
            transaction: t,
          });
        }
        // eslint-disable-next-line no-await-in-loop
        const medicine = await Medicine.findByPk(item.medicine_id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!medicine) continue;
        // eslint-disable-next-line no-await-in-loop
        const remaining = await onHand({ MedicineBatch, medicineId: medicine.id, transaction: t });
        // eslint-disable-next-line no-await-in-loop
        await medicine.update({ stock_quantity: remaining }, { transaction: t });
      }
    } else if (isStockReleasing(sale.status) && status === SALE_STATUS.COMPLETED) {
      throw ApiError.badRequest('Cannot re-complete a refunded or cancelled sale');
    }

    await repository.updateSale(sale, { status }, { transaction: t });
    return (await repository.findSaleById(id, { transaction: t })).toJSON();
  });

const removeSale = async (id) => {
  const sale = await repository.findSaleById(id);
  if (!sale) throw ApiError.notFound('Medicine sale not found');
  if (sale.status === SALE_STATUS.COMPLETED) {
    throw ApiError.badRequest('Refund or cancel the sale before deleting it');
  }
  await repository.destroySale(sale);
};

const getSupplierMeta = async () => {
  const count = await MasterOption.count({ where: { type: 'pharmacy_supplier' }, paranoid: false });
  const next_supplier_code = String(10000 + count + 1);
  return { next_supplier_code };
};

const listSuppliers = async () => {
  const options = await MasterOption.findAll({
    where: { type: 'pharmacy_supplier' },
    order: [['id', 'DESC']],
  });
  return options.map((opt) => {
    const extra = parseJsonDescription(opt.description);
    return {
      id: opt.id,
      supplier_code: opt.code,
      name: opt.label,
      phone: extra.phone || '',
      address: extra.address || '',
      notes: extra.notes || '',
    };
  });
};

const createSupplier = async (body) => {
  let supplierCode = body.supplier_code;
  if (!supplierCode) {
    const meta = await getSupplierMeta();
    supplierCode = meta.next_supplier_code;
  }
  const option = await MasterOption.create({
    type: 'pharmacy_supplier',
    code: supplierCode,
    label: body.name,
    description: JSON.stringify({
      phone: body.phone || '',
      address: body.address || '',
      notes: body.notes || '',
    }),
    is_active: true,
  });
  const extra = parseJsonDescription(option.description);
  return {
    id: option.id,
    supplier_code: option.code,
    name: option.label,
    phone: extra.phone || '',
    address: extra.address || '',
    notes: extra.notes || '',
  };
};

const updateSupplier = async (id, body) => {
  const option = await MasterOption.findByPk(id);
  if (!option) throw ApiError.notFound('Supplier not found');
  const changes = {};
  if (body.name) changes.label = body.name;
  if (body.supplier_code) changes.code = body.supplier_code;
  const currentExtra = parseJsonDescription(option.description);
  const nextExtra = {
    phone: body.phone !== undefined ? body.phone : currentExtra.phone,
    address: body.address !== undefined ? body.address : currentExtra.address,
    notes: body.notes !== undefined ? body.notes : currentExtra.notes,
  };
  changes.description = JSON.stringify(nextExtra);
  await option.update(changes);
  return {
    id: option.id,
    supplier_code: option.code,
    name: option.label,
    phone: nextExtra.phone || '',
    address: nextExtra.address || '',
    notes: nextExtra.notes || '',
  };
};

const deleteSupplier = async (id) => {
  const option = await MasterOption.findByPk(id);
  if (!option) throw ApiError.notFound('Supplier not found');
  await option.destroy();
  return { message: 'Supplier deleted successfully' };
};

const listMasterOptions = async (type) => {
  const options = await MasterOption.findAll({
    where: { type },
    order: [['label', 'ASC']],
  });
  return options.map((opt) => ({
    id: opt.id,
    code: opt.code,
    name: opt.label,
    label: opt.label,
  }));
};

const createMasterOption = async (type, body) => {
  const label = body.name || body.label || '';
  const code = body.code || label.toLowerCase().replace(/\s+/g, '_');
  const option = await MasterOption.create({
    type,
    code,
    label,
    is_active: true,
  });
  return {
    id: option.id,
    code: option.code,
    name: option.label,
    label: option.label,
  };
};

const updateMasterOption = async (id, body) => {
  const option = await MasterOption.findByPk(id);
  if (!option) throw ApiError.notFound('Option not found');
  const label = body.name || body.label || option.label;
  const code = body.code || option.code;
  await option.update({ label, code });
  return {
    id: option.id,
    code: option.code,
    name: option.label,
    label: option.label,
  };
};

const deleteMasterOption = async (id) => {
  const option = await MasterOption.findByPk(id);
  if (!option) throw ApiError.notFound('Option not found');
  await option.destroy();
  return { message: 'Deleted successfully' };
};

// Sales Returns
const getSalesReturnMeta = async () => {
  const count = await MasterOption.count({ where: { type: 'pharmacy_sales_return' }, paranoid: false });
  const next_return_code = 'SR-' + String(100000 + count + 1);
  return { next_return_code };
};

const listSalesReturns = async () => {
  const options = await MasterOption.findAll({
    where: { type: 'pharmacy_sales_return' },
    order: [['id', 'DESC']],
  });

  const saleIds = options.map((o) => parseJsonDescription(o.description).sale_id).filter(Boolean);
  const patientIds = options.map((o) => parseJsonDescription(o.description).patient_id).filter(Boolean);
  const doctorIds = options.map((o) => parseJsonDescription(o.description).doctor_id).filter(Boolean);

  const sales = saleIds.length
    ? await MedicineSale.findAll({
        where: { id: saleIds },
        include: saleIncludes,
      })
    : [];
  const saleMap = new Map(sales.map((s) => [String(s.id), s.toJSON()]));

  const patients = patientIds.length ? await Patient.findAll({ where: { id: patientIds } }) : [];
  const patientMap = new Map(patients.map((p) => [String(p.id), p.toJSON()]));

  const doctors = doctorIds.length
    ? await Doctor.findAll({
        where: { id: doctorIds },
        include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }],
      })
    : [];
  const doctorMap = new Map(doctors.map((d) => [String(d.id), d.toJSON()]));

  const allMedicineIds = [];
  options.forEach((opt) => {
    const extra = parseJsonDescription(opt.description);
    if (Array.isArray(extra.items)) {
      extra.items.forEach((it) => {
        if (it.medicine_id) allMedicineIds.push(it.medicine_id);
      });
    }
  });
  const medicinesList = allMedicineIds.length ? await Medicine.findAll({ where: { id: allMedicineIds } }) : [];
  const medicineMap = new Map(medicinesList.map((m) => [Number(m.id), { id: m.id, code: m.code, name: m.name }]));

  return options.map((opt) => {
    const extra = parseJsonDescription(opt.description);
    const linkedSale = extra.sale_id ? saleMap.get(String(extra.sale_id)) : null;

    let patient = patientMap.get(String(extra.patient_id)) || extra.patient || linkedSale?.patient || null;
    if (!patient && (extra.patient_name || extra.patient_code)) {
      patient = { full_name: extra.patient_name || extra.patient_code, patient_code: extra.patient_code || "" };
    }
    if (!patient && patients.length > 0) {
      patient = patients[0].toJSON ? patients[0].toJSON() : patients[0];
    }

    let doctor = doctorMap.get(String(extra.doctor_id)) || extra.doctor || linkedSale?.prescription?.doctor || null;
    if (!doctor) {
      const notesToSearch = String(extra.notes || linkedSale?.notes || "");
      const match = notesToSearch.match(/Doctor:\s*([^|]+)/i);
      const docName = extra.doctor_name || match?.[1]?.trim();
      if (docName) {
        doctor = { full_name: docName };
      } else if (doctors.length > 0) {
        doctor = doctors[0].toJSON ? doctors[0].toJSON() : doctors[0];
      }
    }

    const rawItems = Array.isArray(extra.items) ? extra.items : [];
    let subtotal = 0;
    const items = rawItems.map((it) => {
      const medId = Number(it.medicine_id || 0);
      const medicine = medicineMap.get(medId) || (it.medicine ? { name: it.medicine.name || it.medicine.label } : null);
      const q = Number(it.quantity || it.qty || 0);
      const p = Number(it.return_price ?? it.purchase_price ?? it.unit_price ?? it.price ?? 0);
      const taxRate = Number(it.tax_rate || 0);
      // BUG-054 - line maths on integer minor units.
      const lineNet = money.mulQty(p, q);
      const tax_amount =
        it.tax_amount !== undefined && it.tax_amount !== null
          ? money.toMajor(money.toMinor(it.tax_amount))
          : money.percentOf(lineNet, taxRate);
      const lineTotal =
        it.total || it.amount ? money.toMajor(money.toMinor(it.total || it.amount)) : money.add(lineNet, tax_amount);
      subtotal = money.add(subtotal, lineNet);

      return {
        ...it,
        medicine_id: medId,
        medicine,
        quantity: q,
        return_price: p,
        tax_rate: taxRate,
        tax_amount,
        total_price: lineTotal,
      };
    });

    const discount_percent = Number(extra.discount_percent || 0);
    const discount_amount = extra.discount_amount
      ? money.toMajor(money.toMinor(extra.discount_amount))
      : money.percentOf(subtotal, discount_percent);
    const afterDiscount = money.subFloor(subtotal, discount_amount);
    const tax_rate = Number(extra.tax_rate || 0);
    const tax_amount = extra.tax_amount
      ? money.toMajor(money.toMinor(extra.tax_amount))
      : money.percentOf(afterDiscount, tax_rate);
    const total_amount = extra.total_amount
      ? money.toMajor(money.toMinor(extra.total_amount))
      : money.add(afterDiscount, tax_amount);

    const payment_details = Array.isArray(extra.payment_details) ? extra.payment_details : [];
    const paid_amount = money.toMajor(money.toMinor(extra.paid_amount)) || money.add(...payment_details.map((p) => p.amount));
    const due_amount = extra.due_amount
    ? money.toMajor(money.toMinor(extra.due_amount))
    : money.subFloor(total_amount, paid_amount);

    return {
      id: opt.id,
      return_code: opt.code,
      returned_at: extra.returned_at || opt.createdAt,
      patient,
      doctor,
      subtotal,
      discount_amount,
      tax_amount,
      total_amount,
      paid_amount,
      due_amount,
      payment_details,
      returner: { full_name: 'Admin' },
      notes: extra.notes || '',
      items,
    };
  });
};

const createSalesReturn = async (body) => {
  const count = await MasterOption.count({ where: { type: 'pharmacy_sales_return' }, paranoid: false });
  const return_code = 'SR-' + String(100000 + count + 1);

  if (Array.isArray(body.items)) {
    for (const item of body.items) {
      if (item.medicine_id && item.quantity) {
        const med = await Medicine.findByPk(item.medicine_id);
        if (med) {
          await med.update({ stock_quantity: Number(med.stock_quantity || 0) + Number(item.quantity) });
        }
      }
    }
  }

  const option = await MasterOption.create({
    type: 'pharmacy_sales_return',
    code: return_code,
    label: return_code,
    description: JSON.stringify({
      return_code,
      ...body,
      created_at: new Date().toISOString(),
    }),
    is_active: true,
  });

  return {
    id: option.id,
    return_code: option.code,
    ...body,
  };
};

const deleteSalesReturn = async (id) => {
  const option = await MasterOption.findByPk(id);
  if (!option) throw ApiError.notFound('Sales return record not found');
  await option.destroy();
  return { message: 'Sales return record deleted' };
};

// Purchases
const getPurchaseMeta = async () => {
  const count = await MasterOption.count({ where: { type: 'pharmacy_purchase' }, paranoid: false });
  const next_purchase_code = 'PUR-' + String(100000 + count + 1);
  return { next_purchase_code };
};

const formatPurchaseOption = async (opt, supplierMap) => {
  const extra = parseJsonDescription(opt.description);
  const supplierId = extra.supplier_id || extra.supplier?.id;
  const supplier = (supplierId && supplierMap.get(String(supplierId))) || extra.supplier || null;

  const rawItems = Array.isArray(extra.items) ? extra.items : [];
  const medicineIds = rawItems.map((it) => it.medicine_id).filter(Boolean);
  const medicinesList = medicineIds.length ? await Medicine.findAll({ where: { id: medicineIds } }) : [];
  const medicineMap = new Map(medicinesList.map((m) => [Number(m.id), { id: m.id, code: m.code, name: m.name }]));

  let subtotal = Number(extra.subtotal || 0);
  let computedSubtotal = 0;

  const items = rawItems.map((it) => {
    const medId = Number(it.medicine_id || 0);
    const medicine = medicineMap.get(medId) || (it.medicine ? { name: it.medicine.name || it.medicine.label } : null);
    const q = Number(it.quantity || it.qty || 0);
    const p = Number(it.purchase_price ?? it.unit_price ?? it.price ?? it.sale_price ?? it.return_price ?? 0);
    const taxRate = Number(it.tax_rate || 0);
    // BUG-054 - line maths on integer minor units.
    const lineNet = money.mulQty(p, q);
    const tax_amount =
      it.tax_amount !== undefined && it.tax_amount !== null
        ? money.toMajor(money.toMinor(it.tax_amount))
        : money.percentOf(lineNet, taxRate);
    const lineTotal =
      it.total || it.amount ? money.toMajor(money.toMinor(it.total || it.amount)) : money.add(lineNet, tax_amount);
    computedSubtotal = money.add(computedSubtotal, lineNet);

    return {
      ...it,
      medicine_id: medId,
      medicine,
      quantity: q,
      purchase_price: p,
      sale_price: Number(it.sale_price || 0),
      tax_rate: taxRate,
      tax_amount,
      total_price: lineTotal,
    };
  });

  if (!subtotal) subtotal = computedSubtotal;

  const discount_percent = Number(extra.discount_percent || 0);
  const discount_amount = extra.discount_amount
    ? money.toMajor(money.toMinor(extra.discount_amount))
    : money.percentOf(subtotal, discount_percent);
  const afterDiscount = money.subFloor(subtotal, discount_amount);
  const tax_rate = Number(extra.tax_rate || 0);
  const tax_amount = extra.tax_amount
    ? money.toMajor(money.toMinor(extra.tax_amount))
    : money.percentOf(afterDiscount, tax_rate);
  const total_amount = extra.total_amount
    ? money.toMajor(money.toMinor(extra.total_amount))
    : money.add(afterDiscount, tax_amount);

  const payment_details = Array.isArray(extra.payment_details) ? extra.payment_details : [];
  const paid_amount = money.toMajor(money.toMinor(extra.paid_amount)) || money.add(...payment_details.map((p) => p.amount));
  const due_amount = extra.due_amount
    ? money.toMajor(money.toMinor(extra.due_amount))
    : money.subFloor(total_amount, paid_amount);

  return {
    id: opt.id,
    purchase_code: opt.code,
    purchased_at: extra.purchased_at || opt.createdAt,
    supplier_id: supplierId || null,
    supplier,
    subtotal,
    discount_amount,
    tax_amount,
    total_amount,
    paid_amount,
    due_amount,
    payment_details,
    purchaser: { full_name: 'Admin' },
    notes: extra.notes || '',
    items,
  };
};

const listPurchases = async () => {
  const options = await MasterOption.findAll({
    where: { type: 'pharmacy_purchase' },
    order: [['id', 'DESC']],
  });

  const suppliers = await MasterOption.findAll({ where: { type: 'pharmacy_supplier' } });
  const supplierMap = new Map();
  suppliers.forEach((s) => {
    const extra = parseJsonDescription(s.description);
    supplierMap.set(String(s.id), { id: s.id, name: s.label, ...extra });
    supplierMap.set(String(s.code), { id: s.id, name: s.label, ...extra });
  });

  const items = await Promise.all(options.map((opt) => formatPurchaseOption(opt, supplierMap)));
  return { items, meta: { total: items.length, page: 1, limit: 100 } };
};

const getPurchase = async (id) => {
  const option = await MasterOption.findByPk(id);
  if (!option || option.type !== 'pharmacy_purchase') throw ApiError.notFound('Purchase record not found');
  const suppliers = await MasterOption.findAll({ where: { type: 'pharmacy_supplier' } });
  const supplierMap = new Map();
  suppliers.forEach((s) => {
    const extra = parseJsonDescription(s.description);
    supplierMap.set(String(s.id), { id: s.id, name: s.label, ...extra });
    supplierMap.set(String(s.code), { id: s.id, name: s.label, ...extra });
  });
  return formatPurchaseOption(option, supplierMap);
};

const createPurchase = async (body) =>
  // BUG-026 — stock used to be incremented outside any transaction and BEFORE
  // the purchase record was written, so a failure left stock changed with no
  // document. Receipt now happens inside one transaction and creates real
  // batches (BUG-012) rather than only bumping a counter.
  sequelize.transaction(async (t) => {
  const { MedicineBatch } = require('../../models');
  const purchase_code = 'PUR-' + String(100000 + (await allocate('pharmacy_purchase', { transaction: t })));

  if (Array.isArray(body.items)) {
    for (const item of body.items) {
      if (!item.medicine_id || !item.quantity) continue;
      const med = await Medicine.findByPk(item.medicine_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!med) throw ApiError.badRequest(`Medicine not found: ${item.medicine_id}`);
      await receiveIntoBatch({
        MedicineBatch,
        medicineId: med.id,
        batchNo: item.batch_no || purchase_code,
        expiryDate: item.expiry_date || null,
        quantity: item.quantity,
        purchasePrice: item.purchase_price,
        salePrice: item.sale_price,
        source: `purchase:${purchase_code}`,
        transaction: t,
      });
      const remaining = await onHand({ MedicineBatch, medicineId: med.id, transaction: t });
      await med.update({ stock_quantity: remaining }, { transaction: t });
    }
  }

  const option = await MasterOption.create({
    type: 'pharmacy_purchase',
    code: purchase_code,
    label: purchase_code,
    description: JSON.stringify({
      purchase_code,
      ...body,
      created_at: new Date().toISOString(),
    }),
    is_active: true,
  }, { transaction: t });

  return {
    id: option.id,
    purchase_code: option.code,
    ...body,
  };
  });

const updatePurchase = async (id, changes) => {
  const option = await MasterOption.findByPk(id);
  if (!option || option.type !== 'pharmacy_purchase') throw ApiError.notFound('Purchase record not found');
  const extra = parseJsonDescription(option.description);
  const updatedExtra = { ...extra, ...changes };
  await option.update({ description: JSON.stringify(updatedExtra) });
  return getPurchase(id);
};

const addPurchasePayment = async (id, payment) => {
  const option = await MasterOption.findByPk(id);
  if (!option || option.type !== 'pharmacy_purchase') throw ApiError.notFound('Purchase record not found');
  const extra = parseJsonDescription(option.description);
  const currentPayments = Array.isArray(extra.payment_details) ? extra.payment_details : [];
  currentPayments.push(payment);
  extra.payment_details = currentPayments;
  await option.update({ description: JSON.stringify(extra) });
  return getPurchase(id);
};

const deletePurchase = async (id) => {
  const option = await MasterOption.findByPk(id);
  if (!option) throw ApiError.notFound('Purchase record not found');
  await option.destroy();
  return { message: 'Purchase record deleted' };
};

// Purchase Returns
const getPurchaseReturnMeta = async () => {
  const count = await MasterOption.count({ where: { type: 'pharmacy_purchase_return' }, paranoid: false });
  const next_return_code = 'PR-' + String(100000 + count + 1);
  return { next_return_code };
};

const listPurchaseReturns = async () => {
  const options = await MasterOption.findAll({
    where: { type: 'pharmacy_purchase_return' },
    order: [['id', 'DESC']],
  });

  const suppliers = await MasterOption.findAll({ where: { type: 'pharmacy_supplier' } });
  const supplierMap = new Map();
  suppliers.forEach((s) => {
    const extra = parseJsonDescription(s.description);
    supplierMap.set(String(s.id), { id: s.id, name: s.label, ...extra });
    supplierMap.set(String(s.code), { id: s.id, name: s.label, ...extra });
  });

  return options.map((opt) => {
    const extra = parseJsonDescription(opt.description);
    const supplier = supplierMap.get(String(extra.supplier_id)) || null;

    const rawItems = Array.isArray(extra.items) ? extra.items : [];
    let subtotal = 0;
    for (const it of rawItems) {
      const q = Number(it.quantity || 0);
      const p = Number(it.return_price || 0);
      subtotal += q * p;
    }
    const discount_percent = Number(extra.discount_percent || 0);
    const discount_amount = (subtotal * discount_percent) / 100;
    const afterDiscount = Math.max(subtotal - discount_amount, 0);
    const tax_rate = Number(extra.tax_rate || 0);
    const tax_amount = (afterDiscount * tax_rate) / 100;
    const total_amount = Math.max(afterDiscount + tax_amount, 0);

    const payment_details = Array.isArray(extra.payment_details) ? extra.payment_details : [];
    const paid_amount = money.add(...payment_details.map((pay) => pay.amount));
    const due_amount = Math.max(total_amount - paid_amount, 0);

    return {
      id: opt.id,
      return_code: opt.code,
      returned_at: extra.returned_at || opt.createdAt,
      supplier,
      subtotal,
      discount_amount,
      tax_amount,
      total_amount,
      paid_amount,
      due_amount,
      payment_details,
      returner: { full_name: 'Admin' },
      notes: extra.notes || '',
      items: rawItems,
    };
  });
};

const createPurchaseReturn = async (body) => {
  const count = await MasterOption.count({ where: { type: 'pharmacy_purchase_return' }, paranoid: false });
  const return_code = 'PR-' + String(100000 + count + 1);

  if (Array.isArray(body.items)) {
    for (const item of body.items) {
      if (item.medicine_id && item.quantity) {
        const med = await Medicine.findByPk(item.medicine_id);
        if (med) {
          const currentStock = Number(med.stock_quantity || 0);
          const nextStock = Math.max(currentStock - Number(item.quantity), 0);
          await med.update({ stock_quantity: nextStock });
        }
      }
    }
  }

  const option = await MasterOption.create({
    type: 'pharmacy_purchase_return',
    code: return_code,
    label: return_code,
    description: JSON.stringify({
      return_code,
      ...body,
      created_at: new Date().toISOString(),
    }),
    is_active: true,
  });

  return {
    id: option.id,
    return_code: option.code,
    ...body,
  };
};

const deletePurchaseReturn = async (id) => {
  const option = await MasterOption.findByPk(id);
  if (!option) throw ApiError.notFound('Purchase return record not found');
  await option.destroy();
  return { message: 'Purchase return record deleted' };
};

const listCategories = async () => listMasterOptions('medicine_category');
const listCompanies = async () => listMasterOptions('medicine_company');
const listGroups = async () => listMasterOptions('medicine_group');
const listUnits = async () => listMasterOptions('medicine_unit');
const listBatchStock = async (query = {}) => {
  // BUG-012 — this used to fabricate a batch for every medicine without a
  // purchase record (`current_stock: 50`, `expiry_date: '2027-12-31'`) and
  // default any missing expiry to the same date. It now reports only real
  // batches, and an unrecorded expiry is reported as null.
  const { MedicineBatch, Medicine } = require('../../models');
  const { Op } = require('sequelize');

  const where = {};
  if (query.medicine_id && String(query.medicine_id) !== '[object Object]') {
    where.medicine_id = query.medicine_id;
  }
  if (query.expiry_date) where.expiry_date = query.expiry_date;

  const batches = await MedicineBatch.findAll({
    where,
    include: [{ model: Medicine, as: 'medicine', attributes: ['id', 'code', 'name', 'unit'] }],
    order: [['medicine_id', 'ASC'], ['expiry_date', 'ASC'], ['batch_no', 'ASC']],
  });

  const today = new Date().toISOString().slice(0, 10);
  let rows = batches.map((b) => {
    const available = Number(b.quantity_in) - Number(b.quantity_out);
    const expired = Boolean(b.expiry_date) && String(b.expiry_date) < today;
    return {
      id: b.id,
      medicine_id: b.medicine_id,
      medicine_code: b.medicine?.code || null,
      medicine_name: b.medicine?.name || null,
      unit: b.medicine?.unit || null,
      batch_no: b.batch_no,
      expiry_date: b.expiry_date || null,
      expiry_recorded: Boolean(b.expiry_date),
      quantity_in: Number(b.quantity_in),
      quantity_out: Number(b.quantity_out),
      current_stock: available,
      purchase_price: Number(b.purchase_price),
      sale_price: Number(b.sale_price),
      is_expired: expired,
      dispensable: available > 0 && !expired,
      source: b.source,
    };
  });

  if (query.search) {
    const term = String(query.search).toLowerCase();
    rows = rows.filter(
      (r) =>
        String(r.medicine_name || '').toLowerCase().includes(term) ||
        String(r.batch_no).toLowerCase().includes(term)
    );
  }
  if (query.only_dispensable === 'true') rows = rows.filter((r) => r.dispensable);

  return rows;
};
const getStockReport = async (query = {}) => {
  const where = {};
  if (query.search) {
    const { Op } = require('sequelize');
    where[Op.or] = [
      { name: { [Op.like]: `%${query.search}%` } },
      { code: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const medicines = await Medicine.findAll({
    where,
    attributes: ['id', 'code', 'name', 'unit', 'stock_quantity'],
    order: [['name', 'ASC']],
  });

  const LOW_STOCK_THRESHOLD = 10;

  return medicines.map((m, index) => {
    const qty = Number(m.stock_quantity || 0);
    let status = 'Available';
    if (qty === 0) status = 'Out of Stock';
    else if (qty <= LOW_STOCK_THRESHOLD) status = 'Low Stock';

    return {
      sl: index + 1,
      id: m.id,
      code: m.code,
      name: m.name,
      unit: m.unit || '',
      stock_quantity: qty,
      status,
    };
  });
};

// BUG-021 — GET /pharmacy/medicines/meta did not exist. It matched the
// /medicines/:id route, failed id validation, then fell through to the catch-all
// which returned a large hardcoded object of empty arrays, so every dropdown on
// the Medicine Entry page was empty. Real master data is returned now.
const getMedicineMeta = async () => {
  const [categories, companies, groups, units, count] = await Promise.all([
    listMasterOptions('medicine_category'),
    listMasterOptions('medicine_company'),
    listMasterOptions('medicine_group'),
    listMasterOptions('medicine_unit'),
    Medicine.count({ paranoid: false }),
  ]);
  return {
    categories,
    companies,
    groups,
    units,
    next_medicine_code: `MED-${String(count + 1).padStart(5, '0')}`,
  };
};

module.exports = {
  getMedicineMeta,
  listMedicines,
  getMedicine,
  createMedicine,
  updateMedicine,
  adjustMedicineStock,
  removeMedicine,
  listSales,
  getSale,
  createSale,
  updateSaleStatus,
  removeSale,
  getSupplierMeta,
  listSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  listCategories,
  createMasterOption,
  updateMasterOption,
  deleteMasterOption,
  listCompanies,
  listGroups,
  listUnits,
  getSalesReturnMeta,
  listSalesReturns,
  createSalesReturn,
  deleteSalesReturn,
  getPurchaseMeta,
  listPurchases,
  getPurchase,
  createPurchase,
  updatePurchase,
  addPurchasePayment,
  deletePurchase,
  getPurchaseReturnMeta,
  listPurchaseReturns,
  createPurchaseReturn,
  deletePurchaseReturn,
  listBatchStock,
  getStockReport,
};
