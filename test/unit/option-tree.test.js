import test from 'node:test';
import assert from 'node:assert/strict';
import { OptionTree } from '../../src/option-tree.js';
import fs from 'node:fs';
import path from 'node:path';

const kb = JSON.parse(fs.readFileSync(path.resolve('data/knowledge-base.json'), 'utf-8'));

test('OptionTree - retrieves root menu and navigates options', () => {
  const tree = new OptionTree(kb);

  // 1. Root Menu
  const rootMenu = tree.getMenu('root');
  assert.equal(rootMenu.id, 'root');
  assert.ok(rootMenu.options.length >= 5);
  assert.equal(rootMenu.options[0].id, 'opt_booking');

  // 2. Sub-menu navigation
  const subMenu = tree.resolveOption('opt_booking');
  assert.equal(subMenu.type, 'menu');
  assert.equal(subMenu.data.id, 'menu_booking');
  assert.ok(subMenu.data.options.length >= 3);

  // 3. Leaf resolution card (Parking)
  const parkingCard = tree.resolveOption('opt_parking');
  assert.equal(parkingCard.type, 'resolution');
  assert.ok(parkingCard.data.text.includes('₱350'));
  assert.ok(parkingCard.data.text.includes('Covered Tower Parking Slot'));

  // 4. Endorsement Carrd Link resolution
  const endCard = tree.resolveOption('opt_endorsement');
  assert.equal(endCard.type, 'resolution');
  assert.ok(endCard.data.text.includes('serineasttagaytayendorsement.carrd.co'));

  // 5. Back navigation
  const back = tree.resolveOption('back_root');
  assert.equal(back.type, 'menu');
  assert.equal(back.data.id, 'root');
});
