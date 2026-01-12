// Valider un email
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Valider un mot de passe
// Minimum 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre
export function isValidPassword(password) {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  
  return { valid: true };
}

// Valider les données d'inscription
export function validateRegistration(data) {
  const errors = [];
  
  // Email
  if (!data.email) {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }
  
  // Password
  if (!data.password) {
    errors.push('Password is required');
  } else {
    const passwordCheck = isValidPassword(data.password);
    if (!passwordCheck.valid) {
      errors.push(passwordCheck.message);
    }
  }
  
  // First name
  if (!data.firstName || data.firstName.trim().length === 0) {
    errors.push('First name is required');
  }
  
  // Last name
  if (!data.lastName || data.lastName.trim().length === 0) {
    errors.push('Last name is required');
  }
  
  // Locale (optionnel, mais si fourni doit être valide)
  if (data.locale && !['fr', 'nl', 'en'].includes(data.locale)) {
    errors.push('Locale must be fr, nl, or en');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Valider les données de login
export function validateLogin(data) {
  const errors = [];
  
  if (!data.email) {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }
  
  if (!data.password) {
    errors.push('Password is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}