import { put, list, get } from '@vercel/blob';
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Normalize the named store token for storage and the API readiness check.
process.env.BLOB_READ_WRITE_TOKEN =
  process.env.YPDC_AU_AACK_READ_WRITE_TOKEN ||
  process.env.YPDC_AU_AACK_BLOB_READ_WRITE_TOKEN ||
  process.env.BLOB_READ_WRITE_TOKEN ||
  '';

export const localMode = () =>
  !process.env.VERCEL && Boolean(process.env.LOCAL_DATA_DIR);

const prefix = 'ypdc/applications/';
const credentials = () => ({
  token: process.env.BLOB_READ_WRITE_TOKEN,
});

export async function saveRecord(key, record) {
  if (localMode()) {
    await mkdir(process.env.LOCAL_DATA_DIR, { recursive: true });

    try {
      await writeFile(
        join(process.env.LOCAL_DATA_DIR, `${key}.json`),
        JSON.stringify(record),
        { flag: 'wx' }
      );
      return true;
    } catch (error) {
      if (error.code === 'EEXIST') return false;
      throw error;
    }
  }

  const pathname = `${prefix}${key}.json`;

  try {
    await put(pathname, JSON.stringify(record), {
      ...credentials(),
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: 'application/json',
    });
    return true;
  } catch (error) {
    const existing = await get(pathname, {
      ...credentials(),
      access: 'private',
      useCache: false,
    });

    if (existing?.statusCode === 200) {
      await existing.stream?.cancel();
      return false;
    }

    throw error;
  }
}

async function listPaths() {
  const blobs = [];
  let cursor;

  do {
    const result = await list({
      ...credentials(),
      prefix,
      cursor,
      limit: 1000,
    });

    blobs.push(...result.blobs);
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);

  return blobs;
}

export async function listRecords() {
  if (localMode()) {
    await mkdir(process.env.LOCAL_DATA_DIR, { recursive: true });

    const names = (await readdir(process.env.LOCAL_DATA_DIR))
      .filter(name => name.endsWith('.json'));

    return Promise.all(
      names.map(async name =>
        JSON.parse(
          await readFile(join(process.env.LOCAL_DATA_DIR, name), 'utf8')
        )
      )
    );
  }

  const blobs = await listPaths();
  const records = [];

  for (let i = 0; i < blobs.length; i += 20) {
    const batch = await Promise.all(
      blobs.slice(i, i + 20).map(async blob => {
        const result = await get(blob.pathname, {
          ...credentials(),
          access: 'private',
          useCache: false,
        });

        if (!result || result.statusCode !== 200) {
          throw new Error('Unable to read application');
        }

        return JSON.parse(await new Response(result.stream).text());
      })
    );

    records.push(...batch);
  }

  return records;
}

export async function countRecords() {
  return localMode()
    ? (await listRecords()).length
    : (await listPaths()).length;
}
