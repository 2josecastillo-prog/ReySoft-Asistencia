import { labelFor } from '../utils/labels';

export function StatusBadge({ value }: { value: string }) {
  const tone =
    value === 'active' || value === 'arrived'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : value === 'pending' || value === 'late'
        ? 'bg-amber-50 text-amber-700 ring-amber-200'
        : value === 'excused'
          ? 'bg-blue-50 text-blue-700 ring-blue-200'
        : value === 'absent' || value === 'suspended' || value === 'cancelled'
          ? 'bg-red-50 text-red-700 ring-red-200'
          : 'bg-slate-50 text-slate-700 ring-slate-200';
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ring-1 ${tone}`}>{labelFor(value)}</span>;
}
