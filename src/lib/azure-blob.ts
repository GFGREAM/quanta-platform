import {
  BlobServiceClient,
  ContainerClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob';

// ─── Singleton ───────────────────────────────────────────────────

const globalForBlob = globalThis as unknown as { blobService?: BlobServiceClient };

function getServiceClient(): BlobServiceClient {
  if (globalForBlob.blobService) return globalForBlob.blobService;
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connStr) throw new Error('AZURE_STORAGE_CONNECTION_STRING is not set');
  const client = BlobServiceClient.fromConnectionString(connStr);
  if (process.env.NODE_ENV !== 'production') {
    globalForBlob.blobService = client;
  }
  return client;
}

const CONTAINER = process.env.AZURE_STORAGE_CONTAINER_AUDITS ?? 'hotel-audits';

export function getContainerClient(): ContainerClient {
  return getServiceClient().getContainerClient(CONTAINER);
}

// ─── Upload ──────────────────────────────────────────────────────

export async function uploadBuffer(
  buffer: Buffer,
  blobName: string,
  contentType: string,
): Promise<string> {
  const container = getContainerClient();
  const blockBlob = container.getBlockBlobClient(blobName);
  await blockBlob.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
  return blockBlob.url;
}

// ─── SAS URL ─────────────────────────────────────────────────────

export function generateSasUrl(blobName: string, expiresInMinutes = 60): string {
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING!;
  // Extract account name and key from connection string
  const accountName = connStr.match(/AccountName=([^;]+)/)?.[1];
  const accountKey = connStr.match(/AccountKey=([^;]+)/)?.[1];
  if (!accountName || !accountKey) {
    throw new Error('Cannot parse account credentials from connection string');
  }
  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  const expiresOn = new Date(Date.now() + expiresInMinutes * 60_000);
  const sas = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER,
      blobName,
      permissions: BlobSASPermissions.parse('r'),
      expiresOn,
    },
    credential,
  ).toString();
  const container = getContainerClient();
  return `${container.getBlockBlobClient(blobName).url}?${sas}`;
}

// ─── Delete ──────────────────────────────────────────────────────

export async function deleteBlob(blobName: string): Promise<void> {
  const container = getContainerClient();
  const blockBlob = container.getBlockBlobClient(blobName);
  await blockBlob.deleteIfExists();
}
