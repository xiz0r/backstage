/*
 * Copyright 2022 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { FC } from 'react';
import { renderHook } from '@testing-library/react-hooks';

import { NotFoundError } from '@backstage/errors';
import { TestApiProvider } from '@backstage/test-utils';

import { techdocsStorageApiRef } from '../../api';
import { reducer, Status, State, Types, useDocsSync } from './useDocsSync';

const syncEntityDocs = jest.fn();

const wrapper: FC = ({ children }) => (
  <TestApiProvider apis={[[techdocsStorageApiRef, { syncEntityDocs }]]}>
    {children}
  </TestApiProvider>
);

describe('reducer', () => {
  const initialState: State = {
    status: Status.CHECKING,
    log: [],
  };

  it('should return a copy of the state', () => {
    const newState = reducer(initialState, { type: Types.BUILDING });

    expect(newState).toEqual({
      status: Status.BUILDING,
      log: [],
    });

    expect(initialState).toEqual({
      status: Status.CHECKING,
      log: [],
    });
  });

  describe('"CHECKING" action', () => {
    it('should update state', () => {
      expect(
        reducer(initialState, {
          type: Types.CHECKING,
        }),
      ).toEqual({
        ...initialState,
        status: Status.CHECKING,
      });
    });

    it('should clear error', () => {
      expect(
        reducer(initialState, {
          type: Types.CHECKING,
        }),
      ).toEqual({
        ...initialState,
        status: Status.CHECKING,
        error: undefined,
      });
    });
  });

  describe('"RELOADING" action', () => {
    it('should update state', () => {
      expect(
        reducer(initialState, {
          type: Types.RELOADING,
        }),
      ).toEqual({
        ...initialState,
        status: Status.RELOADING,
      });
    });
  });

  describe('"BUILDING" action', () => {
    it('should update state', () => {
      expect(
        reducer(initialState, {
          type: Types.BUILDING,
        }),
      ).toEqual({
        ...initialState,
        status: Status.BUILDING,
      });
    });

    it('should clear build log', () => {
      expect(
        reducer(initialState, {
          type: Types.BUILDING,
        }),
      ).toEqual({
        ...initialState,
        status: Status.BUILDING,
        log: [],
      });
    });

    it('should concat log lines', () => {
      expect(
        reducer(initialState, {
          type: Types.BUILDING,
          line: 'Another Line',
        }),
      ).toEqual({
        ...initialState,
        status: Status.BUILDING,
        log: ['Another Line'],
      });
    });
  });

  describe('"BUILD_READY" action', () => {
    it('should throw error', () => {
      expect(() =>
        reducer(initialState, {
          type: Types.BUILD_READY,
          result: '',
        }),
      ).toThrow('Unexpected return state');
    });

    it('should set cached state', () => {
      expect(
        reducer(initialState, {
          type: Types.BUILD_READY,
          result: 'cached',
        }),
      ).toEqual({
        ...initialState,
        status: Status.UP_TO_DATE,
        log: [],
      });
    });

    it('should set updated state', () => {
      expect(
        reducer(initialState, {
          type: Types.BUILD_READY,
          result: 'updated',
        }),
      ).toEqual({
        ...initialState,
        status: Status.BUILD_READY,
        log: [],
      });
    });
  });

  describe('"ERROR" action', () => {
    it('should set error state', () => {
      expect(
        reducer(initialState, {
          type: Types.ERROR,
          error: new Error('Error'),
        }),
      ).toEqual({
        ...initialState,
        status: Status.ERROR,
        error: new Error('Error'),
      });
    });
  });
});

describe('hook', () => {
  const entityName = {
    kind: 'Component',
    namespace: 'default',
    name: 'backstage',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle up-to-date content', async () => {
    syncEntityDocs.mockResolvedValue('cached');

    const entityDocs = {
      loading: false,
      value: '<html />',
      retry: jest.fn(),
    };

    const { result, waitForValueToChange } = renderHook(
      () => useDocsSync(entityName, entityDocs),
      { wrapper },
    );

    expect(result.current).toEqual({
      status: Status.CHECKING,
      log: [],
    });

    await waitForValueToChange(() => result.current.status);

    expect(result.current).toEqual({
      status: Status.UP_TO_DATE,
      log: [],
    });

    expect(syncEntityDocs).toBeCalledWith(entityName, expect.any(Function));
  });

  it('should reload initially missing content', async () => {
    syncEntityDocs.mockImplementation(async (_, logHandler) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      logHandler?.call(this, 'Line 1');
      logHandler?.call(this, 'Line 2');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return 'updated';
    });

    const entityDocs = {
      loading: false,
      error: new NotFoundError('Page Not Found'),
      retry: jest.fn(),
    };

    const { result, waitForValueToChange } = renderHook(
      () => useDocsSync(entityName, entityDocs),
      { wrapper },
    );

    expect(result.current).toEqual({
      status: Status.CHECKING,
      log: [],
    });

    await waitForValueToChange(() => result.current.status, { timeout: 7000 });

    expect(result.current).toEqual({
      status: Status.BUILDING,
      log: ['Line 1', 'Line 2'],
      error: undefined,
    });

    await waitForValueToChange(() => result.current.status, { timeout: 1200 });

    expect(result.current).toEqual({
      status: Status.UP_TO_DATE,
      log: ['Line 1', 'Line 2'],
      error: undefined,
    });
  });
});
