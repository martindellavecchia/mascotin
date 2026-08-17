jest.mock('web-push', () => ({
  __esModule: true,
  default: { sendNotification: jest.fn(), setVapidDetails: jest.fn() },
}));

jest.mock('@/lib/db', () => ({
  db: {
    pushDelivery: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    pushSubscription: { update: jest.fn() },
    $transaction: jest.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
  },
}));

import { dispatchPushDelivery, sendPushDelivery } from '@/lib/server/push';

const webPushMock = jest.requireMock('web-push').default as {
  sendNotification: jest.Mock;
  setVapidDetails: jest.Mock;
};
const dbMock = jest.requireMock('@/lib/db').db as {
  pushDelivery: { findUnique: jest.Mock; updateMany: jest.Mock; update: jest.Mock };
  pushSubscription: { update: jest.Mock };
};

const DELIVERY = {
  id: 'delivery-1',
  status: 'PENDING',
  attempts: 0,
  payload: { title: 'Caso cerca', zone: 'Palermo', helpType: 'Tránsito', link: '/notifications' },
  subscriptionId: 'subscription-1',
  subscription: {
    id: 'subscription-1', endpoint: 'https://push.example.test/id', p256dh: 'public-key', auth: 'auth-key', disabledAt: null,
  },
};

describe('entregas Web Push', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.VAPID_PUBLIC_KEY = 'public';
    process.env.VAPID_PRIVATE_KEY = 'private';
    process.env.VAPID_SUBJECT = 'mailto:test@example.com';
    dbMock.pushDelivery.findUnique.mockResolvedValue(DELIVERY);
    dbMock.pushDelivery.updateMany.mockResolvedValue({ count: 1 });
    dbMock.pushDelivery.update.mockResolvedValue({});
    dbMock.pushSubscription.update.mockResolvedValue({});
  });

  it('marca SENT cuando el proveedor acepta la notificación', async () => {
    webPushMock.sendNotification.mockResolvedValue({ statusCode: 201 });
    await expect(sendPushDelivery(DELIVERY.id)).resolves.toEqual({ sent: true, providerStatus: 201 });
    expect(dbMock.pushDelivery.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'SENT', providerStatus: 201 }) }));
  });

  it('desactiva el endpoint cuando el proveedor responde 410', async () => {
    webPushMock.sendNotification.mockRejectedValue(Object.assign(new Error('Gone'), { statusCode: 410 }));
    await expect(sendPushDelivery(DELIVERY.id)).resolves.toEqual({ sent: false, providerStatus: 410, permanent: true });
    expect(dbMock.pushDelivery.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED', providerStatus: 410 }) }));
    expect(dbMock.pushSubscription.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ disabledAt: expect.any(Date) }) }));
  });

  it('mantiene PENDING un error transitorio antes del tercer intento', async () => {
    webPushMock.sendNotification.mockRejectedValue(Object.assign(new Error('Unavailable'), { statusCode: 503 }));
    await sendPushDelivery(DELIVERY.id);
    expect(dbMock.pushDelivery.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING', providerStatus: 503 }) }));
  });

  it('agota hasta tres intentos inmediatos ante errores transitorios', async () => {
    dbMock.pushDelivery.findUnique
      .mockResolvedValueOnce({ ...DELIVERY, attempts: 0 })
      .mockResolvedValueOnce({ ...DELIVERY, attempts: 1 })
      .mockResolvedValueOnce({ ...DELIVERY, attempts: 2 });
    webPushMock.sendNotification.mockRejectedValue(Object.assign(new Error('Unavailable'), { statusCode: 503 }));
    await dispatchPushDelivery(DELIVERY.id);
    expect(webPushMock.sendNotification).toHaveBeenCalledTimes(3);
    expect(dbMock.pushDelivery.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }));
  });
});
