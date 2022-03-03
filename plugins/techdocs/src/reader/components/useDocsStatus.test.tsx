/*
 * Copyright 2021 The Backstage Authors
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

import { EntityDocs } from './useEntityDocs';
import { DocsSync } from './useDocsSync';
import { useDocsStatus } from './useDocsStatus';

describe('useDocsStatus', () => {
  it.each`
    entityDocsLoading | entityDocsValue | docsSyncStatus   | expected
    ${true}           | ${''}           | ${''}            | ${'CHECKING'}
    ${false}          | ${undefined}    | ${'CHECKING'}    | ${'CHECKING'}
    ${false}          | ${undefined}    | ${'BUILDING'}    | ${'INITIAL_BUILD'}
    ${false}          | ${undefined}    | ${'BUILD_READY'} | ${'CONTENT_NOT_FOUND'}
    ${false}          | ${undefined}    | ${'RELOADING'}   | ${'CHECKING'}
    ${false}          | ${undefined}    | ${'UP_TO_DATE'}  | ${'CONTENT_NOT_FOUND'}
    ${false}          | ${undefined}    | ${'ERROR'}       | ${'CONTENT_NOT_FOUND'}
    ${false}          | ${'asdf'}       | ${'CHECKING'}    | ${'CONTENT_FRESH'}
    ${false}          | ${'asdf'}       | ${'BUILDING'}    | ${'CONTENT_STALE_REFRESHING'}
    ${false}          | ${'asdf'}       | ${'BUILD_READY'} | ${'CONTENT_STALE_READY'}
    ${false}          | ${'asdf'}       | ${'RELOADING'}   | ${'CHECKING'}
    ${false}          | ${'asdf'}       | ${'UP_TO_DATE'}  | ${'CONTENT_FRESH'}
    ${false}          | ${'asdf'}       | ${'ERROR'}       | ${'CONTENT_STALE_ERROR'}
  `(
    'should, when entityDocs.loading=$entityDocsLoading and entityDocs.value="$entityDocsValue" and docsSync.status=$docsSyncStatus, resolve to $expected',
    ({ entityDocsLoading, entityDocsValue, docsSyncStatus, expected }) => {
      const entityDocs = {
        value: entityDocsValue,
        loading: entityDocsLoading,
      } as EntityDocs;
      const docsSync = {
        status: docsSyncStatus,
      } as DocsSync;
      expect(useDocsStatus(entityDocs, docsSync)).toEqual(expected);
    },
  );
});
