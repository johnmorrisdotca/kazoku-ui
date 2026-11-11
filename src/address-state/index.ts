// Choices kept in the address: read, write and watch URL parameters with `replaceState`. No element and no DOM at import, so it imports on a server.
export { applyParams, createAddressState, createAddressWriter, readParam, readParams, type AddressChange, type AddressHost, type AddressState, type AddressStateOptions, type AddressValue, type AddressWriter, type AddressWriterOptions } from "./address.ts";
// The family's readings switch (ふりがな): one address key and one device key for every package.
export { keepReadings, parseReadings, READINGS_KEY, READINGS_ON, READINGS_STORAGE_KEY, readingsParams, readingsStorage, readReadings, type RememberedReadings } from "./readings.ts";
