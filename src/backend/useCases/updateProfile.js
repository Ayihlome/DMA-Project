const MAX_NAME_LENGTH = 100;

export function createUpdateProfileUseCase({ deviceSettingsRepository }) {
  return async function updateProfile(input) {
    if (typeof input !== "object" || input === null) {
      return { success: false, errors: ["Profile changes are required"] };
    }

    const errors = [];
    const changes = {};

    for (const field of ["ownerName", "storeName", "role"]) {
      if (input[field] === undefined) continue;
      if (typeof input[field] !== "string") {
        errors.push(`${field} must be text`);
        continue;
      }
      changes[field] = input[field].trim();
    }

    if (changes.ownerName && changes.ownerName.length > MAX_NAME_LENGTH) {
      errors.push("ownerName must be 100 characters or less");
    }
    if (changes.storeName && changes.storeName.length > MAX_NAME_LENGTH) {
      errors.push("storeName must be 100 characters or less");
    }

    if (input.memberSince !== undefined) {
      if (
        typeof input.memberSince === "string" ||
        typeof input.memberSince === "number"
      ) {
        changes.memberSince = input.memberSince;
      } else {
        errors.push("memberSince must be text or a number");
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }
    if (Object.keys(changes).length === 0) {
      return { success: false, errors: ["Nothing to update"] };
    }

    try {
      const result = await deviceSettingsRepository.updateProfile(changes);
      return { success: true, ...result };
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  };
}
