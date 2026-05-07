const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { Teacher, Subject, Room, TeacherSubject } = require('../models');
const { parseUploadedFile, normalizeTeachers, normalizeSubjects, normalizeRooms } = require('../services/uploadParserService');
const { generateTemplate } = require('../services/exportService');

const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    let rawSheets = {};

    if (ext === '.json') {
      const content = fs.readFileSync(filePath, 'utf8');
      rawSheets = { data: JSON.parse(content) };
    } else if (ext === '.csv') {
      const content = fs.readFileSync(filePath, 'utf8');
      rawSheets = { Sheet1: content };
    } else {
      // Excel
      const wb = XLSX.readFile(filePath);
      for (const sheetName of wb.SheetNames) {
        rawSheets[sheetName] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
      }
    }

    // Get existing data for context
    const existingData = {
      teachers: (await Teacher.findAll({ where: { institution_id: req.user.institution_id }, limit: 20 })).map(t => t.name),
      subjects: (await Subject.findAll({ where: { institution_id: req.user.institution_id }, limit: 20 })).map(s => s.name),
      rooms: (await Room.findAll({ where: { institution_id: req.user.institution_id }, limit: 20 })).map(r => r.name),
    };

    const parsed = await parseUploadedFile(rawSheets, existingData);

    // Clean up file
    fs.unlinkSync(filePath);

    res.json({
      message: 'File parsed successfully',
      parsed,
      fileName: req.file.originalname,
      sheetNames: Object.keys(rawSheets),
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(err);
  }
};

const confirmUpload = async (req, res, next) => {
  try {
    const { teachers = [], subjects = [], rooms = [] } = req.body;
    const institutionId = req.user.institution_id;
    let created = { teachers: 0, subjects: 0, rooms: 0 };

    // Save teachers
    const normalizedTeachers = normalizeTeachers(teachers, institutionId);
    for (const t of normalizedTeachers) {
      const { _subjects, ...teacherData } = t;
      const [teacher, wasCreated] = await Teacher.findOrCreate({
        where: { institution_id: institutionId, name: teacherData.name },
        defaults: teacherData,
      });
      if (wasCreated) created.teachers++;

      // Assign subjects
      if (_subjects && _subjects.length > 0) {
        for (const subjectName of _subjects) {
          const subject = await Subject.findOne({ where: { institution_id: institutionId, name: subjectName } });
          if (subject) await TeacherSubject.findOrCreate({ where: { teacher_id: teacher.id, subject_id: subject.id } });
        }
      }
    }

    // Save subjects
    const normalizedSubjects = normalizeSubjects(subjects, institutionId);
    for (const s of normalizedSubjects) {
      const [, wasCreated] = await Subject.findOrCreate({
        where: { institution_id: institutionId, name: s.name },
        defaults: s,
      });
      if (wasCreated) created.subjects++;
    }

    // Save rooms
    const normalizedRooms = normalizeRooms(rooms, institutionId);
    for (const r of normalizedRooms) {
      const [, wasCreated] = await Room.findOrCreate({
        where: { institution_id: institutionId, name: r.name },
        defaults: r,
      });
      if (wasCreated) created.rooms++;
    }

    res.json({ message: 'Data saved successfully', created });
  } catch (err) { next(err); }
};

const downloadTemplate = async (req, res, next) => {
  try {
    const buffer = generateTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="ps4-timetable-template.xlsx"');
    res.send(buffer);
  } catch (err) { next(err); }
};

module.exports = { uploadFile, confirmUpload, downloadTemplate };
