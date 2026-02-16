"use client";

import React, { useEffect, useState } from 'react';
import { Worker, Viewer, type DocumentLoadEvent, type PageChangeEvent } from '@react-pdf-viewer/core';

export default function PdfViewerClient(props: any) {
  const { viewerFileUrl, pdfHttpHeaders, pdfReloadKey, pageNavigationPluginInstance, scrollModePluginInstance, zoomPluginInstance, renderPage, renderError, onDocumentLoad, onPageChange } = props;
  const [localError, setLocalError] = useState<any>(null);

  useEffect(() => {
    if (localError) return;
    // no-op; this effect exists so we can catch mounting errors during development
    return () => {};
  }, [localError]);

  if (localError) {
    return (
      <div className="p-4">
        <iframe title="pdf-fallback" src={viewerFileUrl ?? undefined} style={{ width: '100%', height: '800px', border: 'none' }} />
      </div>
    );
  }

  try {
    const plugins = [pageNavigationPluginInstance, scrollModePluginInstance, zoomPluginInstance].filter(Boolean);
    return (
      <Worker workerUrl={props.workerUrl}>
        <Viewer
          key={pdfReloadKey}
          fileUrl={viewerFileUrl}
          httpHeaders={pdfHttpHeaders}
          plugins={plugins}
          defaultScale={props.defaultScale}
          renderPage={renderPage}
          renderError={renderError}
          onDocumentLoad={onDocumentLoad}
          onPageChange={onPageChange}
        />
      </Worker>
    );
  } catch (err) {
    console.error('PdfViewerClient caught render error:', err);
    setLocalError(err);
    return (
      <div className="p-4">
        <iframe title="pdf-fallback" src={viewerFileUrl ?? undefined} style={{ width: '100%', height: '800px', border: 'none' }} />
      </div>
    );
  }
}
