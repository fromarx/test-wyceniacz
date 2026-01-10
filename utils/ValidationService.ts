// utils/ValidationService.ts
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export class ValidationService {
  static validateService(data: any): ValidationResult {
    const errors: Record<string, string> = {};

    if (!data.name || data.name.trim().length < 3) {
      errors.name = "Nazwa usługi musi mieć co najmniej 3 znaki.";
    }

    const price = parseFloat(data.netPrice);
    if (isNaN(price) || price <= 0) {
      errors.netPrice = "Cena musi być liczbą większą od zera.";
    }

    if (!['8', '23', '0'].includes(data.vatRate.toString())) {
      errors.vatRate = "Nieprawidłowa stawka VAT.";
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  static validateClient(data: any): ValidationResult {
    const errors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!data.firstName || !data.lastName) {
      errors.clientName = "Imię i nazwisko są wymagane.";
    }

    if (data.email && !emailRegex.test(data.email)) {
      errors.email = "Niepoprawny format adresu e-mail.";
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}