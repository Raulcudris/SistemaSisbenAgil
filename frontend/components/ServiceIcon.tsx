import {
  CalendarDays,
  CreditCard,
  Droplet,
  FileText,
  FlaskConical,
  Pill,
  Smile,
  Stethoscope,
  Ticket,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';

const ICONOS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  flask: FlaskConical,
  pill: Pill,
  card: CreditCard,
  file: FileText,
  user: UserRound,
  tooth: Smile,
  droplet: Droplet,
  calendar: CalendarDays,
  users: Users,
};

export function ServiceIcon({
  name,
  className,
}: {
  name?: string | null;
  className?: string;
}) {
  const Icono = (name && ICONOS[name]) || Ticket;
  return <Icono className={className} strokeWidth={1.8} aria-hidden />;
}
