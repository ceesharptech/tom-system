/**
 * Optional: generates bcrypt password hashes for seed users (e.g. for non-SQL tools).
 * Phase 1 migration uses pgcrypto in SQL instead (crypt + gen_salt).
 * Run from repo root: node scripts/hash-seed-passwords.js (requires: npm install bcrypt in backend).
 */
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'test-data', 'seed-users.json');
const users = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const cost = 10;

async function main() {
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, cost);
    console.log(`${u.officer_id}: ${hash}`);
  }
}

main().catch(console.error);
