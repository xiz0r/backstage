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

import { EntityDocs } from './useEntityDocs';
import { DocsSync, Status } from './useDocsSync';

/**
 * A state representation that is used to configure the UI of <Reader />
 */
type ContentStateTypes =
  /** There is nothing to display but a loading indicator */
  | 'CHECKING'
  /** There is no content yet -> present a full screen loading page */
  | 'INITIAL_BUILD'
  /** There is content, but the backend is about to update it */
  | 'CONTENT_STALE_REFRESHING'
  /** There is content, but after a reload, the content will be different */
  | 'CONTENT_STALE_READY'
  /** There is content, the backend tried to update it, but failed */
  | 'CONTENT_STALE_ERROR'
  /** There is nothing to see but a "not found" page. Is also shown on page load errors */
  | 'CONTENT_NOT_FOUND'
  /** There is only the latest and greatest content */
  | 'CONTENT_FRESH';

/**
 * Calculate the state that should be reported to the display component.
 */
export const useDocsStatus = (
  content: EntityDocs,
  sync: DocsSync,
): ContentStateTypes => {
  // we have nothing to display yet
  if (content.loading) {
    return 'CHECKING';
  }

  // the build is ready, but it triggered a content reload and the content variable is not trusted
  if (sync.status === Status.RELOADING) {
    return 'CHECKING';
  }

  // there is no content, but the sync process is still evaluating
  if (!content.value && sync.status === Status.CHECKING) {
    return 'CHECKING';
  }

  // there is no content yet so we assume that we are building it for the first time
  if (!content.value && sync.status === Status.BUILDING) {
    return 'INITIAL_BUILD';
  }

  // if there is still no content after building, it might just not exist
  if (!content.value) {
    return 'CONTENT_NOT_FOUND';
  }

  // we are still building, but we already show stale content
  if (sync.status === Status.BUILDING) {
    return 'CONTENT_STALE_REFRESHING';
  }

  // the build is ready, but the content is still stale
  if (sync.status === Status.BUILD_READY) {
    return 'CONTENT_STALE_READY';
  }

  // the build failed, but the content is still stale
  if (sync.status === Status.ERROR) {
    return 'CONTENT_STALE_ERROR';
  }

  // seems like the content is up-to-date (or we don't know yet and the sync process is still evaluating in the background)
  return 'CONTENT_FRESH';
};
