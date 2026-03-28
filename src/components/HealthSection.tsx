import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

interface HealthSectionProps {
  control: any;
}

export function HealthSection({ control }: HealthSectionProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField
        control={control}
        name="vaccinated"
        render={({ field }) => (
          <FormItem className="flex items-center space-x-2">
            <FormControl>
              <input
                type="checkbox"
                checked={field.value}
                onChange={field.onChange}
                className="w-4 h-4 rounded border-gray-300"
              />
            </FormControl>
            <FormLabel className="!mt-0">Vacunado</FormLabel>
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="neutered"
        render={({ field }) => (
          <FormItem className="flex items-center space-x-2">
            <FormControl>
              <input
                type="checkbox"
                checked={field.value}
                onChange={field.onChange}
                className="w-4 h-4 rounded border-gray-300"
              />
            </FormControl>
            <FormLabel className="!mt-0">Castrado</FormLabel>
          </FormItem>
        )}
      />
    </div>
  );
}