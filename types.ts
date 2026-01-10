
export enum QuoteStatus {
  DRAFT = 'robocza',
  SENT = 'wysłana',
  ACCEPTED = 'zaakceptowana',
  REJECTED = 'odrzucona'
}

export enum SubscriptionStatus {
  CHECKING = 'checking',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  NONE = 'none'
}

export type UnitOfMeasure = 'm2' | 'm3' | 'mb' | 'szt' | 'opak' | 'kg' | 'l' | 'worek';
export type MaterialMode = 'detailed' | 'estimated';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  nip?: string;
  phone?: string;
  address: string;
  city: string;
  postalCode: string;
  logo?: string;
  notificationsEnabled?: boolean;
  pdfThemeColor?: string; // Nowe pole motywu PDF
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price?: number;
  isBought: boolean;
}

export interface ShoppingList {
  id: string;
  name: string;
  quoteId?: string;
  createdAt: string;
  items: ShoppingItem[];
}

export interface ClientReminder {
  id: string;
  date: string;
  time: string; // HH:mm
  topic: string;
  completed: boolean;
  notified?: boolean; 
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  companyName?: string;
  nip?: string;
  street: string;
  houseNo: string;
  apartmentNo?: string;
  postalCode: string;
  city: string;
  notes?: string; 
  reminders?: ClientReminder[];
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface MaterialItem {
  id: string;
  name: string;
  price: number;
  unit: UnitOfMeasure;
  quantity: number;
  consumption?: number;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  netPrice: number;
  vatRate: number;
  unit: UnitOfMeasure;
  categoryId?: string;
  materialMode: MaterialMode;
  estimatedMaterialPrice?: number;
  defaultMaterials?: MaterialItem[];
}

export interface QuoteItem {
  id: string;
  serviceId: string;
  name: string;
  quantity: number;
  netPrice: number;
  vatRate: number;
  unit: UnitOfMeasure;
  materialMode: MaterialMode;
  estimatedMaterialPrice?: number;
  materials: MaterialItem[];
}

export interface Quote {
  id: string;
  number: string;
  date: string;
  clientId?: string;
  estimatedCompletionDate?: string;
  clientFirstName: string;
  clientLastName: string;
  clientPhone: string;
  clientEmail: string;
  clientCompany: string;
  clientNip?: string;
  serviceStreet: string;
  serviceHouseNo: string;
  serviceApartmentNo: string;
  servicePostalCode: string;
  serviceCity: string;
  items: QuoteItem[];
  status: QuoteStatus;
  totalNet: number;
  totalVat: number;
  totalGross: number;
}

export interface AppState {
  user: User | null;
  services: Service[];
  categories: Category[];
  clients: Client[];
  quotes: Quote[];
  shoppingLists: ShoppingList[];
  darkMode: boolean;
  subscriptionStatus: SubscriptionStatus;
  hasMoreQuotes: boolean,
  currentQuotesPage: number
}
