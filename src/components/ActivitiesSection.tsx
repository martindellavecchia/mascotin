import { Label } from '@/components/ui/label';

interface ActivitiesSectionProps {
  form: any;
}

export function ActivitiesSection({ form }: ActivitiesSectionProps) {
  return (
    <div>
      <Label>Actividades</Label>
      <div className="grid grid-cols-4 gap-2 mt-2">
        {['walk', 'play', 'fetch', 'swim', 'socialize', 'groom', 'training'].map((activity) => (
          <label key={activity} className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              value={activity}
              checked={form.watch('activities')?.includes(activity)}
              onChange={(e) => {
                const current = form.watch('activities') || [];
                if (e.target.checked) {
                  form.setValue('activities', [...current, activity]);
                } else {
                  form.setValue('activities', current.filter((a: string) => a !== activity));
                }
              }}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm capitalize">{activity}</span>
          </label>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2">Selecciona al menos una actividad</p>
    </div>
  );
}