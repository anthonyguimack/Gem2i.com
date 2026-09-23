/**
 * Catálogo COMPARTIDO de iconos para los editores de campos del CMS
 * (Membership Enrollment y Mentoring System).
 *
 * Se extrajo de EnrollmentFieldsManager para que ambos módulos usen la MISMA
 * lista y el MISMO resolutor — la estandarización que pidió Anthony: un formulario
 * del mismo tipo no debe tener dos catálogos de iconos que se desincronizan.
 */
import {
  User, Mail, Lock, Phone, MapPin, Calendar, Briefcase, Book, Pen, Hash,
  DollarSign, Gift, Shield, Globe, Home, Heart, Star, Flag, FileText, Award,
  CreditCard, TrendingUp, BarChart, Clipboard, Target, Info, CheckCircle, AlertCircle,
} from 'lucide-react';

export const ICON_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'user', label: 'User' },
  { value: 'mail', label: 'Mail' },
  { value: 'lock', label: 'Lock' },
  { value: 'phone', label: 'Phone' },
  { value: 'map-pin', label: 'Map Pin' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'briefcase', label: 'Briefcase' },
  { value: 'book', label: 'Book' },
  { value: 'pen', label: 'Pen' },
  { value: 'hash', label: 'Hash' },
  { value: 'dollar-sign', label: 'Dollar Sign' },
  { value: 'gift', label: 'Gift' },
  { value: 'shield', label: 'Shield' },
  { value: 'globe', label: 'Globe' },
  { value: 'home', label: 'Home' },
  { value: 'heart', label: 'Heart' },
  { value: 'star', label: 'Star' },
  { value: 'flag', label: 'Flag' },
  { value: 'file-text', label: 'File Text' },
  { value: 'award', label: 'Award' },
  { value: 'credit-card', label: 'Credit Card' },
  { value: 'trending-up', label: 'Trending Up' },
  { value: 'bar-chart', label: 'Bar Chart' },
  { value: 'clipboard', label: 'Clipboard' },
  { value: 'target', label: 'Target' },
  { value: 'info', label: 'Info' },
  { value: 'check-circle', label: 'Check Circle' },
  { value: 'alert-circle', label: 'Alert Circle' },
];

const ICON_MAP = {
  user: User, mail: Mail, lock: Lock, phone: Phone, 'map-pin': MapPin,
  calendar: Calendar, briefcase: Briefcase, book: Book, pen: Pen, hash: Hash,
  'dollar-sign': DollarSign, gift: Gift, shield: Shield, globe: Globe, home: Home,
  heart: Heart, star: Star, flag: Flag, 'file-text': FileText, award: Award,
  'credit-card': CreditCard, 'trending-up': TrendingUp, 'bar-chart': BarChart,
  clipboard: Clipboard, target: Target, info: Info, 'check-circle': CheckCircle,
  'alert-circle': AlertCircle,
};

/** Componente lucide para un nombre de icono, o null si no hay/no existe. */
export function resolveFieldIcon(name) {
  return ICON_MAP[name] || null;
}
