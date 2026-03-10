import { describe, expect, it, vi } from 'vitest';

import { createTargetingService } from '../../src/services/targeting.service.js';

describe('targeting.service', () => {
  function buildDeps() {
    return {
      client: {
        getList: vi.fn().mockResolvedValue({ data: [] }),
        getObject: vi.fn().mockResolvedValue({
          data: {
            users_lower_bound: 1000,
            users_upper_bound: 5000,
            estimate_ready: true,
          },
        }),
        post: vi.fn(),
        postFormData: vi.fn(),
        delete: vi.fn(),
      },
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    };
  }

  it('finds interests using search adinterest endpoint', async () => {
    const deps = buildDeps();
    const service = createTargetingService(deps);

    await service.findInterests('nike', { limit: 10 });

    expect(deps.client.getList).toHaveBeenCalledWith('search', {
      type: 'adinterest',
      q: 'nike',
      limit: 10,
    });
  });

  it('suggests interests and sends interest_list as array', async () => {
    const deps = buildDeps();
    const service = createTargetingService(deps);

    await service.suggestInterests(['Basketball', 'Soccer'], { limit: 15 });

    expect(deps.client.getList).toHaveBeenCalledWith('search', {
      type: 'adinterestsuggestion',
      interest_list: ['Basketball', 'Soccer'],
      limit: 15,
    });
  });

  it('finds locations and passes location_types when provided', async () => {
    const deps = buildDeps();
    const service = createTargetingService(deps);

    await service.findLocations('California', { locationTypes: ['region', 'city'], limit: 20 });

    expect(deps.client.getList).toHaveBeenCalledWith('search', {
      type: 'adgeolocation',
      q: 'California',
      location_types: ['region', 'city'],
      limit: 20,
    });
  });

  it('lists behaviors with fixed behaviors class', async () => {
    const deps = buildDeps();
    const service = createTargetingService(deps);

    await service.listBehaviors({ limit: 60 });

    expect(deps.client.getList).toHaveBeenCalledWith('search', {
      type: 'adTargetingCategory',
      class: 'behaviors',
      limit: 60,
    });
  });

  it('lists demographics with custom class', async () => {
    const deps = buildDeps();
    const service = createTargetingService(deps);

    await service.listDemographics({ demographicClass: 'life_events', limit: 70 });

    expect(deps.client.getList).toHaveBeenCalledWith('search', {
      type: 'adTargetingCategory',
      class: 'life_events',
      limit: 70,
    });
  });

  it('estimates reach from account reachestimate endpoint and unwraps data', async () => {
    const deps = buildDeps();
    const service = createTargetingService(deps);
    const targeting = { geo_locations: { countries: ['US'] } };

    const result = await service.estimateReach('123', targeting);

    expect(deps.client.getObject).toHaveBeenCalledWith('act_123/reachestimate', {
      targeting_spec: targeting,
    });
    expect(result).toEqual({
      users_lower_bound: 1000,
      users_upper_bound: 5000,
      estimate_ready: true,
    });
  });
});
