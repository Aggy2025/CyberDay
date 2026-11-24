import test from 'node:test';
import assert from 'node:assert/strict';
import { CYBER_FIRMWARE_CODE_PY } from './firmwareTemplate';

test('CYBER_FIRMWARE_CODE_PY guards IdeaSense initialization against missing 0x70 I2C devices', () => {
  assert.match(CYBER_FIRMWARE_CODE_PY, /try:\s*\n\s*from ideasense import IdeaSense\s*\n\s*idea = IdeaSense\(\)/);
  assert.match(CYBER_FIRMWARE_CODE_PY, /i2c\.scan\(\)/);
  assert.match(CYBER_FIRMWARE_CODE_PY, /0x70/);
  assert.match(CYBER_FIRMWARE_CODE_PY, /UARTService\(\)/);
  assert.match(CYBER_FIRMWARE_CODE_PY, /"sim": sim_mask/);
});
