import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOARD_PROFILES,
  filterHardwareComponents,
  filterMakerTerms,
  HARDWARE_COMPONENT_MAP,
  MAKER_DICTIONARY_TERMS,
} from './makerDictionary';

test('BOARD_PROFILES accurately distinguishes IdeaBoard MCU and IdeaSense Explorer PCB', () => {
  assert.match(BOARD_PROFILES.ideaboard.specs[0].value, /ESP32-WROOM-32E/);
  assert.match(BOARD_PROFILES.ideaboard.specs[1].value, /IO02/);
  assert.match(BOARD_PROFILES.ideasense.specs[0].value, /LTR-303.*0x29/);
  assert.match(BOARD_PROFILES.ideasense.specs[1].value, /LSM6DS3TR-C.*0x6A/);
  assert.match(BOARD_PROFILES.ideasense.specs[2].value, /SHT30.*0x44/);
  assert.match(BOARD_PROFILES.ideasense.specs[3].value, /HT16K33.*0x70/);
});

test('HARDWARE_COMPONENT_MAP separates active CyberLab components from expansion hardware', () => {
  const active = filterHardwareComponents(HARDWARE_COMPONENT_MAP, 'all', 'active');
  const expansion = filterHardwareComponents(HARDWARE_COMPONENT_MAP, 'all', 'expansion');
  const ideaBoardActive = filterHardwareComponents(HARDWARE_COMPONENT_MAP, 'ideaboard', 'active');

  assert.equal(active.length, 8);
  assert.equal(expansion.length, 2);
  assert.equal(ideaBoardActive.length, 3);
  assert.ok(expansion.some((c) => c.name.includes('Puente H')));
});

test('filterMakerTerms filters by category and Spanish keyword search cleanly', () => {
  const i2cMatches = filterMakerTerms(MAKER_DICTIONARY_TERMS, 'all', '0x70');
  assert.ok(i2cMatches.length >= 2);

  const cyberMatches = filterMakerTerms(MAKER_DICTIONARY_TERMS, 'cyber_ai', 'k-nn');
  assert.equal(cyberMatches.length, 1);
  assert.equal(cyberMatches[0].id, 'edge-ai-knn');
});
