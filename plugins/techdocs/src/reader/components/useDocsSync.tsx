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

import { useReducer, Reducer } from 'react';
import useAsync from 'react-use/lib/useAsync';

import { useApi } from '@backstage/core-plugin-api';
import { EntityName } from '@backstage/catalog-model';

import { techdocsStorageApiRef } from '../../api';
import { EntityDocs } from './useEntityDocs';

export enum Status {
  CHECKING = 'CHECKING',
  RELOADING = 'RELOADING',
  BUILDING = 'BUILDING',
  BUILD_READY = 'BUILD_READY',
  UP_TO_DATE = 'UP_TO_DATE',
  ERROR = 'ERROR',
}

export type State = {
  status: Status;
  log: string[];
  error?: Error;
};

export enum Types {
  CHECKING = 'CHECKING',
  RELOADING = 'RELOADING',
  BUILDING = 'BUILDING',
  BUILD_READY = 'BUILD_READY',
  ERROR = 'ERROR',
}

enum Result {
  CACHED = 'cached',
  UPDATED = 'updated',
}

type Action =
  | {
      type: Types.CHECKING;
    }
  | {
      type: Types.RELOADING;
    }
  | {
      type: Types.BUILDING;
      line?: string;
    }
  | {
      type: Types.BUILD_READY;
      result: string;
    }
  | {
      type: Types.ERROR;
      error: Error;
    };

const isResult = (result: string): result is Result => {
  const values = Object.values<string>(Result);
  return values.includes(result);
};

export const reducer: Reducer<State, Action> = (state, action) => {
  switch (action.type) {
    case Types.CHECKING:
      return {
        ...state,
        status: Status.CHECKING,
        error: undefined,
      };
    case Types.BUILDING:
      return {
        ...state,
        status: Status.BUILDING,
        log: action.line ? state.log.concat(action.line) : state.log,
      };
    case Types.RELOADING:
      return {
        ...state,
        status: Status.RELOADING,
      };
    case Types.BUILD_READY:
      if (!isResult(action.result)) {
        throw new Error('Unexpected return state');
      }
      return {
        ...state,
        status:
          action.result === Result.CACHED
            ? Status.UP_TO_DATE
            : Status.BUILD_READY,
      };
    case Types.ERROR:
      return {
        ...state,
        status: Status.ERROR,
        error: action.error,
      };
    default:
      return state;
  }
};

export const useDocsSync = (entityName: EntityName, entityDocs: EntityDocs) => {
  const techdocsStorageApi = useApi(techdocsStorageApiRef);
  const [sync, dispatch] = useReducer(reducer, {
    status: Status.CHECKING,
    log: [],
  });

  if (!entityDocs.loading && sync.status === Status.BUILD_READY) {
    entityDocs.retry();
    dispatch({ type: Types.RELOADING });
  }

  if (!entityDocs.loading && sync.status === Status.RELOADING) {
    dispatch({ type: Types.BUILD_READY, result: Result.CACHED });
  }

  useAsync(async () => {
    dispatch({ type: Types.CHECKING });

    const buildingTimeout = setTimeout(() => {
      dispatch({ type: Types.BUILDING });
    }, 1000);

    try {
      const result = await techdocsStorageApi.syncEntityDocs(
        entityName,
        (line: string) => {
          dispatch({ type: Types.BUILDING, line });
        },
      );
      dispatch({ type: Types.BUILD_READY, result });
    } catch (error) {
      dispatch({ type: Types.ERROR, error });
    } finally {
      clearTimeout(buildingTimeout);
    }
  }, [entityName, dispatch, techdocsStorageApi]);

  return sync;
};

export type DocsSync = ReturnType<typeof useDocsSync>;
