import React, { useState, useCallback, useEffect } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native"
import { WebView } from "react-native-webview"
import NetInfo from "@react-native-community/netinfo"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"

export function ClassroomScreen({ route }: any) {
  const { classroomUrl, topic } = route.params
  const [loading, setLoading]   = useState(true)
  const [offline, setOffline]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const navigation               = useNavigation()
  const insets                   = useSafeAreaInsets()

  useEffect(() => {
    const unsub = NetInfo.addEventListener(s => setOffline(!s.isConnected))
    return unsub
  }, [])

  // Handlers declared at component level — Rules of Hooks require this.
  // Do NOT inline useCallback inside JSX props.
  const handleLoad = useCallback(() => {
    setLoading(false)
  }, [])

  const handleError = useCallback(() => {
    setLoading(false)
    setError(
      offline
        ? "You appear to be offline. Please check your connection."
        : "Could not load the classroom. Please try again.",
    )
  }, [offline])

  const handleRetry = useCallback(() => {
    setError(null)
    setLoading(true)
  }, [])

  if (offline && !loading) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.offlineBanner}>
          <Text style={s.offlineText}>No internet connection</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.close}>{"\u2715"}</Text>
        </TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>{topic}</Text>
      </View>

      {error ? (
        <View style={s.err}>
          <Text style={s.errText}>{error}</Text>
          <TouchableOpacity onPress={handleRetry}>
            <Text style={s.retry}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          source={{ uri: classroomUrl }}
          style={s.web}
          onLoad={handleLoad}
          onError={handleError}
          onHttpError={handleError}
          mediaCapturePermissionGrantType={Platform.OS === "ios" ? "grant" : "prompt"}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={["https://*"]}
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: "#fff" },
  header:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e5e7eb" },
  close:         { fontSize: 16, color: "#6b7280", marginRight: 12 },
  title:         { flex: 1, fontSize: 14, fontWeight: "500", color: "#111827" },
  web:           { flex: 1 },
  offlineBanner: { backgroundColor: "#fef2f2", padding: 12, alignItems: "center" },
  offlineText:   { color: "#dc2626", fontSize: 13 },
  err:           { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errText:       { fontSize: 14, color: "#dc2626", textAlign: "center", paddingHorizontal: 24 },
  retry:         { fontSize: 14, color: "#6366f1", fontWeight: "500" },
})
