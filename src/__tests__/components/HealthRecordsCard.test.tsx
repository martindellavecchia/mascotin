import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HealthRecordsCard, { sortHealthRecords, type HealthRecord } from '@/components/pets/HealthRecordsCard';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const records: HealthRecord[] = [
  { id: 'done', type: 'VACCINE', name: 'Séxtuple', dueDate: '2020-01-01T00:00:00.000Z', completedAt: '2020-01-02T00:00:00.000Z' },
  { id: 'later', type: 'CHECKUP', name: 'Control anual', dueDate: '2099-06-01T00:00:00.000Z', completedAt: null },
  { id: 'overdue', type: 'MEDICATION', name: 'Pipeta', dueDate: '2020-03-01T00:00:00.000Z', completedAt: null },
];

describe('HealthRecordsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ordena pendientes por fecha y deja los completados al final', () => {
    expect(sortHealthRecords(records).map((record) => record.id)).toEqual(['overdue', 'later', 'done']);
  });

  it('marca los registros vencidos', () => {
    render(<HealthRecordsCard petId="pet-1" records={sortHealthRecords(records)} onChange={jest.fn()} />);
    expect(screen.getAllByText('Vencido')).toHaveLength(1);
  });

  it('crea un registro nuevo', async () => {
    const onChange = jest.fn();
    const created = { id: 'new', type: 'VACCINE', name: 'Antirrábica', dueDate: null, completedAt: null };
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, healthRecord: created }) });

    render(<HealthRecordsCard petId="pet-1" records={[]} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /agregar/i }));
    await userEvent.type(screen.getByLabelText('Nombre'), 'Antirrábica');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith([created]));
    expect(global.fetch).toHaveBeenCalledWith('/api/pet/health', expect.objectContaining({ method: 'POST' }));
  });
});
