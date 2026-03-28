import * as SecureStore from "expo-secure-store"

const ACCESS_KEY  = "dm_access_token"
const REFRESH_KEY = "dm_refresh_token"

export const tokenStore = {
  saveAccess:  (t: string) => SecureStore.setItemAsync(ACCESS_KEY,  t),
  saveRefresh: (t: string) => SecureStore.setItemAsync(REFRESH_KEY, t),
  getAccess:   ()          => SecureStore.getItemAsync(ACCESS_KEY),
  getRefresh:  ()          => SecureStore.getItemAsync(REFRESH_KEY),
  clearAll: async () => {
    await SecureStore.deleteItemAsync(ACCESS_KEY)
    await SecureStore.deleteItemAsync(REFRESH_KEY)
  },
}
