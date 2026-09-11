const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const PASSWORD_POLICY_HINT =
  "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, and a number.";

export const validatePasswordStrength = (password: string): string | null => {
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!PASSWORD_PATTERN.test(password)) {
    return PASSWORD_POLICY_HINT;
  }
  return null;
};