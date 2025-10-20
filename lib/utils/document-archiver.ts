/**
 * Document Archive Helper
 *
 * Utilities for generating download manifests for client-side zip creation
 * Organizes documents by person name and document type for easy navigation
 */

export interface DocumentForArchive {
  _id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  status: string;
  personName: string;
  documentTypeName: string;
  individualProcessId: string;
}

export interface ArchiveFolder {
  name: string;
  files: ArchiveFile[];
}

export interface ArchiveFile {
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface ArchiveManifest {
  folders: ArchiveFolder[];
  totalFiles: number;
  totalSize: number;
  generatedAt: Date;
}

/**
 * Generate folder structure for documents
 * Groups by person name, then by document type
 */
export function generateArchiveManifest(
  documents: DocumentForArchive[]
): ArchiveManifest {
  const folderMap = new Map<string, Map<string, ArchiveFile[]>>();
  let totalSize = 0;

  // Group documents by person and document type
  for (const doc of documents) {
    const personName = sanitizeFileName(doc.personName);
    const documentTypeName = sanitizeFileName(doc.documentTypeName);

    // Get or create person folder
    if (!folderMap.has(personName)) {
      folderMap.set(personName, new Map());
    }

    const personFolder = folderMap.get(personName)!;

    // Get or create document type folder
    if (!personFolder.has(documentTypeName)) {
      personFolder.set(documentTypeName, []);
    }

    const typeFiles = personFolder.get(documentTypeName)!;

    // Add file with sanitized name
    const fileName = sanitizeFileName(doc.fileName);
    typeFiles.push({
      name: fileName,
      url: doc.fileUrl,
      size: doc.fileSize,
      mimeType: doc.mimeType,
    });

    totalSize += doc.fileSize;
  }

  // Convert to flat folder structure
  const folders: ArchiveFolder[] = [];

  for (const [personName, documentTypes] of folderMap.entries()) {
    for (const [documentTypeName, files] of documentTypes.entries()) {
      folders.push({
        name: `${personName}/${documentTypeName}`,
        files: files,
      });
    }
  }

  // Sort folders alphabetically
  folders.sort((a, b) => a.name.localeCompare(b.name));

  return {
    folders,
    totalFiles: documents.length,
    totalSize,
    generatedAt: new Date(),
  };
}

/**
 * Sanitize file/folder names for safe usage in zip archives
 * Removes or replaces characters that might cause issues
 */
export function sanitizeFileName(name: string): string {
  return (
    name
      // Replace slashes with dashes
      .replace(/[/\\]/g, "-")
      // Replace colons with dashes
      .replace(/:/g, "-")
      // Remove or replace other problematic characters
      .replace(/[<>:"|?*]/g, "")
      // Remove leading/trailing whitespace
      .trim()
      // Replace multiple spaces with single space
      .replace(/\s+/g, " ")
      // Limit length to 255 characters (typical filesystem limit)
      .substring(0, 255)
  );
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Estimate zip size (rough approximation)
 * Compressed size is typically 50-70% of original for documents
 */
export function estimateZipSize(totalSize: number): number {
  // Conservative estimate: assume 70% compression ratio
  return Math.ceil(totalSize * 0.7);
}

/**
 * Generate a safe zip filename with timestamp
 */
export function generateZipFileName(prefix: string = "documents"): string {
  const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const sanitizedPrefix = sanitizeFileName(prefix);
  return `${sanitizedPrefix}-${timestamp}.zip`;
}

/**
 * Validate that all documents are accessible (have valid URLs)
 */
export function validateDocumentsForArchive(
  documents: DocumentForArchive[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (documents.length === 0) {
    errors.push("No documents provided for archiving");
  }

  for (const doc of documents) {
    if (!doc.fileUrl || doc.fileUrl.trim() === "") {
      errors.push(
        `Document "${doc.fileName}" (${doc.personName}) has no file URL`
      );
    }

    if (!doc.fileName || doc.fileName.trim() === "") {
      errors.push(
        `Document for ${doc.personName} has no file name`
      );
    }

    if (doc.fileSize <= 0) {
      errors.push(
        `Document "${doc.fileName}" has invalid file size: ${doc.fileSize}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Group documents by person for summary display
 */
export function groupDocumentsByPerson(
  documents: DocumentForArchive[]
): Map<string, DocumentForArchive[]> {
  const grouped = new Map<string, DocumentForArchive[]>();

  for (const doc of documents) {
    const personName = doc.personName;

    if (!grouped.has(personName)) {
      grouped.set(personName, []);
    }

    grouped.get(personName)!.push(doc);
  }

  return grouped;
}

/**
 * Get statistics about the archive
 */
export interface ArchiveStats {
  totalDocuments: number;
  totalSize: number;
  estimatedZipSize: number;
  totalPeople: number;
  totalDocumentTypes: number;
  documentsByStatus: Record<string, number>;
}

export function getArchiveStats(
  documents: DocumentForArchive[]
): ArchiveStats {
  const peopleSet = new Set<string>();
  const documentTypesSet = new Set<string>();
  const documentsByStatus: Record<string, number> = {};
  let totalSize = 0;

  for (const doc of documents) {
    peopleSet.add(doc.personName);
    documentTypesSet.add(doc.documentTypeName);
    totalSize += doc.fileSize;

    // Count by status
    const status = doc.status;
    documentsByStatus[status] = (documentsByStatus[status] || 0) + 1;
  }

  return {
    totalDocuments: documents.length,
    totalSize,
    estimatedZipSize: estimateZipSize(totalSize),
    totalPeople: peopleSet.size,
    totalDocumentTypes: documentTypesSet.size,
    documentsByStatus,
  };
}
