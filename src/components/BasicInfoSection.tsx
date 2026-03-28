import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BasicInfoSectionProps {
  control: any;
}

export function BasicInfoSection({ control }: BasicInfoSectionProps) {
  return (
    <>
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre de la Mascota</FormLabel>
            <FormControl>
              <Input placeholder="Fido, Michi..." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="petType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="dog">🐕 Perro</SelectItem>
                  <SelectItem value="cat">🐱 Gato</SelectItem>
                  <SelectItem value="bird">🐦 Pájaro</SelectItem>
                  <SelectItem value="other">🐾 Otro</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="breed"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Raza (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Golden Retriever, Siames..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="age"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Edad (años)</FormLabel>
              <FormControl>
                <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="size"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tamaño</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Tamaño" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="small">Pequeño</SelectItem>
                  <SelectItem value="medium">Mediano</SelectItem>
                  <SelectItem value="large">Grande</SelectItem>
                  <SelectItem value="xlarge">Extra Grande</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
}