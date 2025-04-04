// utils/sanitizers.js

// Sanitizes string input
const sanitizeString = (str) => {
  if (!str) return "";
  return String(str)
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .slice(0, 1000); // Limit length
};

// Sanitizes number input
const sanitizeNumber = (num) => {
  const parsed = parseFloat(num);
  return isNaN(parsed) ? 0 : parsed;
};

// Sanitizes object input
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== "object") {
    return {};
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    switch (typeof value) {
      case "string":
        sanitized[key] = sanitizeString(value);
        break;
      case "number":
        sanitized[key] = sanitizeNumber(value);
        break;
      case "object":
        if (value instanceof Date) {
          sanitized[key] = new Date(value);
        } else if (Array.isArray(value)) {
          sanitized[key] = value.map((item) =>
            typeof item === "object" ? sanitizeObject(item) : item
          );
        } else {
          sanitized[key] = sanitizeObject(value);
        }
        break;
      default:
        sanitized[key] = value;
    }
  }

  return sanitized;
};

// Sanitizes metadata
const sanitizeMetadata = (metadata) => {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  return {
    fileType: sanitizeString(metadata.fileType),
    fileSize: sanitizeNumber(metadata.fileSize),
    uploadDate: metadata.uploadDate
      ? new Date(metadata.uploadDate)
      : new Date(),
    lastModified: metadata.lastModified
      ? new Date(metadata.lastModified)
      : new Date(),
    checksums: sanitizeObject(metadata.checksums),
  };
};

// Sanitizes blockchain metadata
const sanitizeBlockchainMetadata = (metadata) => {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  return {
    transactionHash: sanitizeString(metadata.transactionHash),
    blockNumber: sanitizeNumber(metadata.blockNumber),
    contractAddress: sanitizeString(metadata.contractAddress),
    tokenId: sanitizeNumber(metadata.tokenId),
    ipfsHash: sanitizeString(metadata.ipfsHash),
  };
};

// Sanitizes user input data
const sanitizeData = (data) => {
  if (!data) return {};

  return {
    description: sanitizeString(data.description),
    patientAge: sanitizeNumber(data.patientAge),
    category: sanitizeString(data.category),
    price: sanitizeNumber(data.price),
    medicalData: sanitizeObject(data.medicalData),
    metadata: sanitizeMetadata(data.metadata),
    blockchainMetadata: sanitizeBlockchainMetadata(data.blockchainMetadata),
  };
};

// Sanitizes user data for HIPAA compliance
const sanitizeUserData = (data) => {
  if (!data) return {};

  return {
    address: sanitizeString(data.address)?.toLowerCase(),
    name: sanitizeString(data.name),
    age: sanitizeNumber(data.age),
    email: sanitizeString(data.email)?.toLowerCase(),
    role: sanitizeString(data.role)?.toLowerCase(),
  };
};

// Sanitizes response data for HIPAA compliance
const sanitizeResponse = (data) => {
  if (!data) return null;

  // Remove sensitive fields like Social Security Number (SSN) and Date of Birth (DOB) from the response data
  const { ssn, dateOfBirth, fullName, ...sanitized } = data;

  return sanitizeObject(sanitized);
};

// Export all functions individually for named imports
export {
  sanitizeData,
  sanitizeString,
  sanitizeNumber,
  sanitizeObject,
  sanitizeMetadata,
  sanitizeBlockchainMetadata,
  sanitizeUserData,
  sanitizeResponse,
};

// Export all functions as a default object for backward compatibility
export default {
  sanitizeData,
  sanitizeString,
  sanitizeNumber,
  sanitizeObject,
  sanitizeMetadata,
  sanitizeBlockchainMetadata,
  sanitizeUserData,
  sanitizeResponse,
};
