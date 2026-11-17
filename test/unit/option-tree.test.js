import test from 'node:test';
import assert from 'node:assert/strict';
import { OptionTree } from '../../src/option-tree.js';
import fs from 'node:fs';
import path from 'node:path';

const kb = JSON.parse(fs.readFileSync(path.resolve('data/knowledge-base.json'), 'utf-8'));

test('OptionTree - retrieves root menu and navigates options', () => {
  const tree = new OptionTree(kb);

  // 1. Root Menu (unbooked default returns single option: Book a stay)
  const unbookedMenu = tree.getMenu('root', { guestStatus: 'unbooked' });
  assert.equal(unbookedMenu.id, 'root');
  assert.equal(unbookedMenu.options.length, 1);
  assert.equal(unbookedMenu.options[0].id, 'opt_booking');
  assert.equal(unbookedMenu.options[0].label, 'Book a stay');

  // Confirmed guest menu returns all options
  const confirmedMenu = tree.getMenu('root', { guestStatus: 'confirmed' });
  assert.ok(confirmedMenu.options.length >= 7);

  // 2. Sub-menu navigation for booking
  const subMenu = tree.resolveOption('opt_booking');
  assert.equal(subMenu.type, 'menu');
  assert.equal(subMenu.data.id, 'menu_book_stay');
  assert.ok(subMenu.data.options.length >= 3);

  // 3. Navigate into guests selection
  const guestMenu = tree.resolveOption(subMenu.data.options[0].id);
  assert.ok(guestMenu.type === 'menu' || guestMenu.type === 'resolution');

  // 4. End-to-end checkout resolution
  const checkoutRes = tree.resolveOption('sub_guests_small') || tree.resolveOption('res_book_checkout');
  assert.ok(checkoutRes);

  // 5. Leaf resolution card (Parking) for confirmed
  const parkingCard = tree.resolveOption('opt_parking');
  assert.equal(parkingCard.type, 'resolution');
  assert.ok(parkingCard.data.text.includes('₱350'));
  assert.ok(parkingCard.data.text.includes('Covered Tower Parking Slot'));

  // 6. Endorsement Carrd Link resolution
  const endCard = tree.resolveOption('opt_endorsement');
  assert.equal(endCard.type, 'resolution');
  assert.ok(endCard.data.text.includes('serineasttagaytayendorsement.carrd.co'));

  // 7. Back navigation
  const back = tree.resolveOption('back_root');
  assert.equal(back.type, 'menu');
  assert.equal(back.data.id, 'root');

  // 8. Hospitality Booking Workflow & Zero-Emoji verification
  assert.equal(
    tree.getWorkflowStep('dates')?.prompt,
    "Hello! I'm here to help book your stay. When are you looking to stay with us?"
  );
  assert.equal(
    tree.getWorkflowStep('ask_dates')?.prompt,
    "Alright! Which dates?"
  );
  assert.equal(
    tree.getWorkflowStep('guests')?.prompt,
    "How many guests?"
  );

  // Verify zero emojis in knowledge base
  const rawKb = fs.readFileSync(path.resolve('data/knowledge-base.json'), 'utf-8');
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]/u;
  assert.ok(!emojiRegex.test(rawKb), 'Knowledge base must not contain any unicode emojis');
});

