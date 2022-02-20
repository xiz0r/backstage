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

// the import order matters, should be the first
import { createDom } from '../../../test-utils';

import React from 'react';
import { render, waitFor } from '@testing-library/react';

import {
  techdocsStorageApiRef,
  TechDocsShadowDomProvider,
} from '@backstage/plugin-techdocs';
import { scmIntegrationsApiRef } from '@backstage/integration-react';
import { wrapInTestApp, TestApiProvider } from '@backstage/test-utils';

import { AnchorTransformer } from './Anchor';

const navigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

const byUrl = jest.fn().mockResolvedValue({ type: 'github' });
const scmIntegrationsApiMock = { byUrl };

const baseUrl = 'http://localhost:7000/docs/backstage';
const getBaseUrl = jest.fn().mockResolvedValue(baseUrl);
const techdocsStorageApiMock = { getBaseUrl };

describe('Link', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should add target blank for external links', async () => {
    const dom = createDom(
      <body>
        <a href="https://example.com/docs">Docs</a>
      </body>,
    );

    render(
      wrapInTestApp(
        <TestApiProvider
          apis={[
            [techdocsStorageApiRef, techdocsStorageApiMock],
            [scmIntegrationsApiRef, scmIntegrationsApiMock],
          ]}
        >
          <TechDocsShadowDomProvider dom={dom}>
            <AnchorTransformer />
          </TechDocsShadowDomProvider>
        </TestApiProvider>,
      ),
    );

    await waitFor(() => {
      expect(dom.querySelector('a')?.getAttribute('target')).toBe('_blank');
    });
  });

  describe('href', () => {
    it('Should replace relative path with the location origin', async () => {
      const dom = createDom(
        <body>
          <a href="/docs/backstage">Backstage</a>
        </body>,
      );

      render(
        wrapInTestApp(
          <TestApiProvider
            apis={[
              [techdocsStorageApiRef, techdocsStorageApiMock],
              [scmIntegrationsApiRef, scmIntegrationsApiMock],
            ]}
          >
            <TechDocsShadowDomProvider dom={dom}>
              <AnchorTransformer />
            </TechDocsShadowDomProvider>
          </TestApiProvider>,
        ),
      );

      await waitFor(() => {
        expect(dom.querySelector('a')?.getAttribute('href')).toBe(
          'http://localhost/docs/backstage',
        );
      });
    });

    it('Should replace relative path with the base URL', async () => {
      const dom = createDom(
        <body>
          <a href="/docs/backstage" download>
            Backstage
          </a>
        </body>,
      );

      render(
        wrapInTestApp(
          <TestApiProvider
            apis={[
              [techdocsStorageApiRef, techdocsStorageApiMock],
              [scmIntegrationsApiRef, scmIntegrationsApiMock],
            ]}
          >
            <TechDocsShadowDomProvider dom={dom}>
              <AnchorTransformer />
            </TechDocsShadowDomProvider>
          </TestApiProvider>,
        ),
      );

      await waitFor(() => {
        expect(dom.querySelector('a')?.getAttribute('href')).toBe(baseUrl);
      });
    });
  });

  describe('addEventListener', () => {
    it('Should call handler when a link has been clicked', async () => {
      const href = 'http://localhost:3000/docs/backstage#overview';
      const dom = await createDom(
        <body>
          <a href={href}>Link</a>
        </body>,
      );

      render(
        wrapInTestApp(
          <TestApiProvider
            apis={[
              [techdocsStorageApiRef, techdocsStorageApiMock],
              [scmIntegrationsApiRef, scmIntegrationsApiMock],
            ]}
          >
            <TechDocsShadowDomProvider dom={dom}>
              <AnchorTransformer />
            </TechDocsShadowDomProvider>
          </TestApiProvider>,
        ),
      );

      await waitFor(() => {
        expect(dom.querySelector('a')?.getAttribute('href')).toBe(href);
      });

      dom.querySelector('a')?.click();

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith('/docs/backstage#overview');
      });
    });

    it('Should not call handler when a link has a download attribute', async () => {
      const href = 'http://localhost:3000/file.pdf';
      const dom = await createDom(
        <body>
          <a href={href} download>
            Link
          </a>
        </body>,
      );

      render(
        wrapInTestApp(
          <TestApiProvider
            apis={[
              [techdocsStorageApiRef, techdocsStorageApiMock],
              [scmIntegrationsApiRef, scmIntegrationsApiMock],
            ]}
          >
            <TechDocsShadowDomProvider dom={dom}>
              <AnchorTransformer />
            </TechDocsShadowDomProvider>
          </TestApiProvider>,
        ),
      );

      await waitFor(() => {
        expect(dom.querySelector('a')?.getAttribute('href')).toBe(href);
      });

      dom.querySelector('a')?.click();

      await waitFor(() => {
        expect(navigate).not.toHaveBeenCalled();
      });
    });

    it('Should not call handler when a link links to another baseUrl', async () => {
      const href = 'http://example:3000/file.pdf';
      const dom = await createDom(
        <body>
          <a href={href} download>
            File
          </a>
        </body>,
      );

      render(
        wrapInTestApp(
          <TestApiProvider
            apis={[
              [techdocsStorageApiRef, techdocsStorageApiMock],
              [scmIntegrationsApiRef, scmIntegrationsApiMock],
            ]}
          >
            <TechDocsShadowDomProvider dom={dom}>
              <AnchorTransformer />
            </TechDocsShadowDomProvider>
          </TestApiProvider>,
        ),
      );

      await waitFor(() => {
        expect(dom.querySelector('a')?.getAttribute('href')).toBe(href);
      });

      dom.querySelector('a')?.click();

      await waitFor(() => {
        expect(navigate).not.toHaveBeenCalled();
      });
    });
  });
});
