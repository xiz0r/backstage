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

import React from 'react';
import parseGitUrl from 'git-url-parse';
import { Portal } from '@material-ui/core';
import FeedbackOutlinedIcon from '@material-ui/icons/FeedbackOutlined';
import { useTechDocsShadowDom } from '@backstage/plugin-techdocs';
import { useApi } from '@backstage/core-plugin-api';
import { replaceGitHubUrlType } from '@backstage/integration';
import { scmIntegrationsApiRef } from '@backstage/integration-react';
import { EDIT_LINK_SELECTOR } from './Anchor';

export const FeedbackLink = () => {
  const dom = useTechDocsShadowDom();
  const scmIntegrationsApi = useApi(scmIntegrationsApiRef);

  if (!dom) return null;

  // attempting to use selectors that are more likely to be static as MkDocs updates over time
  const editLink = dom.querySelector<HTMLAnchorElement>(EDIT_LINK_SELECTOR);

  // don't show if edit link not available in raw page
  if (!editLink?.href) return null;

  const sourceURL = new URL(editLink.href);
  const integration = scmIntegrationsApi.byUrl(sourceURL);

  // don't show if can't identify edit link hostname as a gitlab/github hosting
  if (integration?.type !== 'github' && integration?.type !== 'gitlab') {
    return null;
  }

  let feedbackLink = dom.querySelector('#git-feedback-link');

  if (!feedbackLink) {
    feedbackLink = document.createElement('div');
    feedbackLink?.setAttribute('id', 'git-feedback-link');
  }

  // topmost h1 only contains title for whole page
  const title = (dom.querySelector('article>h1') as HTMLElement).childNodes[0]
    .textContent;
  const issueTitle = encodeURIComponent(`Documentation Feedback: ${title}`);
  const issueDesc = encodeURIComponent(
    `Page source:\n${editLink.href}\n\nFeedback:`,
  );

  // Convert GitHub edit url to blob type so it can be parsed by git-url-parse correctly
  const gitUrl =
    integration?.type === 'github'
      ? replaceGitHubUrlType(sourceURL.href, 'blob')
      : sourceURL.href;

  const gitInfo = parseGitUrl(gitUrl);
  const repoPath = `/${gitInfo.organization}/${gitInfo.name}`;

  const params =
    integration?.type === 'github'
      ? `title=${issueTitle}&body=${issueDesc}`
      : `issue[title]=${issueTitle}&issue[description]=${issueDesc}`;
  const href = `${sourceURL.origin}${repoPath}/issues/new?${params}`;

  editLink?.insertAdjacentElement('beforebegin', feedbackLink);

  return (
    <Portal container={feedbackLink}>
      <a
        className="md-content__button md-icon"
        title="Leave feedback for this page"
        href={href}
        style={{ paddingLeft: '5px' }}
      >
        <FeedbackOutlinedIcon />
      </a>
    </Portal>
  );
};
