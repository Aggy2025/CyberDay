import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFirewallAccuracy,
  computeMfaDefenseScore,
  computeSecurityGrade,
  computeSignalQualityPct,
  FIREWALL_LESSONS,
  MFA_NODE_LESSONS,
  OPTICAL_TOKEN_LESSONS,
} from './cyberGamesEducation';

test('computeFirewallAccuracy and computeSecurityGrade reflect defense precision', () => {
  assert.equal(
    computeFirewallAccuracy({
      blockedThreats: 9,
      missedThreats: 1,
      allowedSafe: 8,
      falsePositives: 0,
    }),
    94,
  );
  assert.equal(computeSecurityGrade(94, 150), 'S');
  assert.equal(computeSecurityGrade(78, 80), 'A');
  assert.equal(computeSecurityGrade(60, 40), 'B');
  assert.equal(computeSecurityGrade(40, 20), 'C');
});

test('educational lesson dictionaries cover all firewall packets, optical tokens, and MFA nodes', () => {
  for (const k of ['DDoS', 'Phish', 'Malware', 'Brute', 'Scan', 'TLS', 'SSH', 'HTTPS'] as const) {
    assert.ok(FIREWALL_LESSONS[k].summary.length > 10);
    assert.ok(FIREWALL_LESSONS[k].defenseTip.length > 10);
  }
  for (const tok of ['TLS', 'AES', 'KEY', 'SSH', 'OTP']) {
    assert.ok(OPTICAL_TOKEN_LESSONS[tok].riskNote.length > 10);
  }
  assert.equal(MFA_NODE_LESSONS.length, 3);
  assert.equal(computeSignalQualityPct(8, 2), 80);
  assert.equal(computeMfaDefenseScore(3), 32);
});
