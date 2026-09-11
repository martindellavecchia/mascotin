export function productEnabled(feature: 'SAVED_SEARCHES' | 'BOOKINGS' | 'MEETUPS') {
  return process.env[`PRODUCT_${feature}_ENABLED`] === 'true';
}
