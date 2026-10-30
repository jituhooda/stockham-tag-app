import { useEffect, useState } from 'react';
import { request } from '../lib/apexHttp';

/**
 * Object URL for a protected file. <img src> can't send the Authorization
 * header, so fetch the bytes ourselves.
 */
export function useAuthedObjectUrl(path, enabled = true) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    if (!path || !enabled) return undefined;
    const ctrl = new AbortController();
    let objectUrl = '';
    request(path, { raw: true, signal: ctrl.signal })
      .then((res) => res.blob())
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {});
    return () => {
      ctrl.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, enabled]);
  return src;
}
