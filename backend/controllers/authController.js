const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Institution } = require('../models');
const { v4: uuidv4 } = require('uuid');

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

const register = async (req, res, next) => {
  try {
    const { name, email, password, institutionName, institutionCode } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    // Create or get institution
    let institution;
    if (institutionName) {
      institution = await Institution.create({
        name: institutionName,
        code: institutionCode || institutionName.substring(0, 10).toUpperCase().replace(/\s/g, ''),
      });
    } else {
      institution = await Institution.findOne();
      if (!institution) {
        institution = await Institution.create({ name: 'Default Institution', code: 'DEFAULT' });
      }
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password_hash: hash, institution_id: institution.id, role: 'admin' });

    const token = signToken(user);
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, institution_id: user.institution_id }, institution });
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const user = await User.findOne({ where: { email }, include: [{ model: Institution, as: 'institution' }] });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, institution_id: user.institution_id }, institution: user.institution });
  } catch (err) { next(err); }
};

const me = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, { include: [{ model: Institution, as: 'institution' }] });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, institution_id: user.institution_id }, institution: user.institution });
  } catch (err) { next(err); }
};

module.exports = { register, login, me };
