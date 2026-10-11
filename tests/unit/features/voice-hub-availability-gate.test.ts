// @vitest-environment node
import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { unavailableLegacyModule } from '@/bootstrap/legacyModuleGate.js';

// Exercise the real gate over HTTP in an isolated Express app. This does not
// assert production authentication, database persistence, or deployment state.
describe('Voice Hub existing availability gate over isolated HTTP', () => {
  it('rejects reading, saving and publishing on the canonical module prefix', async () => {
    const app = express();
    app.use('/api/voice-hub', unavailableLegacyModule('voice-hub'));
    const results = await Promise.all([
      request(app).get('/api/voice-hub/workflow'),
      request(app).post('/api/voice-hub/workflow').send({ nodes: [], edges: [] }),
      request(app).post('/api/voice-hub/workflow/publish'),
    ]);
    for (const result of results) {
      expect(result.status).toBe(503);
      expect(result.body).toMatchObject({
        success: false,
        code: 'MODULE_NOT_READY',
        module: 'voice-hub',
      });
      expect(result.body.error).toMatch(/organização/);
    }
  });
});
